// Telegram Web App initialization
let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Set theme colors
tg.setHeaderColor('#0a0e27');
tg.setBackgroundColor('#0a0e27');

let file1Data = null;
let file2Data = null;
let resultBlob = null;

// File inputs
const file1Input = document.getElementById('file1');
const file2Input = document.getElementById('file2');
const file1Name = document.getElementById('file1-name');
const file2Name = document.getElementById('file2-name');
const processBtn = document.getElementById('process-btn');
const downloadBtn = document.getElementById('download-btn');
const methodSelect = document.getElementById('method');
const intensitySlider = document.getElementById('intensity');
const intensityValue = document.getElementById('intensity-value');
const glitchSizeSlider = document.getElementById('glitch-size');
const glitchSizeValue = document.getElementById('size-value');
const resultDiv = document.getElementById('result');
const loadingDiv = document.getElementById('loading');

// Update intensity display
intensitySlider.addEventListener('input', (e) => {
    intensityValue.textContent = e.target.value;
});

// Update glitch size display
glitchSizeSlider.addEventListener('input', (e) => {
    const sizes = ['Small', 'Medium', 'Large'];
    glitchSizeValue.textContent = sizes[e.target.value - 1];
});

// File 1 handler
file1Input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        file1Name.textContent = file.name;
        file1Data = await file.arrayBuffer();
        checkFilesReady();
        tg.HapticFeedback.impactOccurred('light');
    }
});

// File 2 handler
file2Input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        file2Name.textContent = file.name;
        file2Data = await file.arrayBuffer();
        checkFilesReady();
        tg.HapticFeedback.impactOccurred('light');
    }
});

function checkFilesReady() {
    if (file1Data && file2Data) {
        processBtn.disabled = false;
    }
}

// Process button handler
processBtn.addEventListener('click', async () => {
    tg.HapticFeedback.impactOccurred('medium');
    loadingDiv.classList.remove('hidden');
    resultDiv.classList.add('hidden');
    
    setTimeout(async () => {
        try {
            const method = methodSelect.value;
            const intensity = parseInt(intensitySlider.value);
            const glitchSize = parseInt(glitchSizeSlider.value);
            
            resultBlob = await datamoshWav(file1Data, file2Data, method, intensity, glitchSize);
            
            loadingDiv.classList.add('hidden');
            resultDiv.classList.remove('hidden');
            tg.HapticFeedback.notificationOccurred('success');
        } catch (error) {
            console.error('Error processing:', error);
            tg.showAlert('Error processing files: ' + error.message);
            loadingDiv.classList.add('hidden');
            tg.HapticFeedback.notificationOccurred('error');
        }
    }, 500);
});

// Download button handler
downloadBtn.addEventListener('click', async () => {
    if (resultBlob) {
        tg.HapticFeedback.impactOccurred('heavy');
        
        // Create download link
        const url = URL.createObjectURL(resultBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `datamoshed_${Date.now()}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        tg.showAlert('✓ File downloaded! Check your downloads folder.');
    }
});

// Datamosh functions
async function datamoshWav(buffer1, buffer2, method, intensity, glitchSize) {
    const data1 = new Uint8Array(buffer1);
    const data2 = new Uint8Array(buffer2);
    
    // Parse WAV headers
    const header1 = data1.slice(0, 44);
    const audio1 = data1.slice(44);
    const audio2 = data2.slice(44);
    
    let result;
    
    switch (method) {
        case 'smart-datamosh':
            result = smartDatamosh(audio1, audio2, intensity, glitchSize);
            break;
        case 'hex-swap':
            result = hexSwap(audio1, audio2, intensity);
            break;
        case 'chunk-mix':
            result = chunkMix(audio1, audio2, intensity, glitchSize);
            break;
        default:
            result = smartDatamosh(audio1, audio2, intensity, glitchSize);
    }
    
    // Combine header with processed audio
    const finalData = new Uint8Array(header1.length + result.length);
    finalData.set(header1, 0);
    finalData.set(result, header1.length);
    
    return new Blob([finalData], { type: 'audio/wav' });
}

// Smart Datamosh - музыкально смешивает файлы с мягкими переходами
function smartDatamosh(audio1, audio2, intensity, glitchSize) {
    // Работаем с 16-битными сэмплами (2 байта на сэмпл)
    const samples1 = new Int16Array(audio1.buffer, audio1.byteOffset, audio1.length / 2);
    const samples2 = new Int16Array(audio2.buffer, audio2.byteOffset, audio2.length / 2);
    const resultSamples = new Int16Array(samples1.length);
    resultSamples.set(samples1);
    
    // Размеры глитчей в сэмплах (44100 Hz = 44100 сэмплов в секунду)
    const glitchSizes = {
        1: [4000, 15000],      // Small: ~0.09-0.34 сек
        2: [15000, 50000],     // Medium: ~0.34-1.13 сек
        3: [50000, 120000]     // Large: ~1.13-2.72 сек
    };
    
    const [minSize, maxSize] = glitchSizes[glitchSize];
    const numGlitches = Math.floor((intensity / 100) * 50) + 10; // От 10 до 60 глитчей
    
    for (let i = 0; i < numGlitches; i++) {
        // Случайная позиция
        const startPos = Math.floor(Math.random() * (samples1.length - maxSize));
        const glitchLength = Math.floor(Math.random() * (maxSize - minSize)) + minSize;
        const endPos = Math.min(startPos + glitchLength, samples1.length);
        
        // Случайная позиция из второго файла
        const sourcePos = Math.floor(Math.random() * Math.max(1, samples2.length - glitchLength));
        
        // Размер fade (10% от длины глитча, минимум 100 сэмплов)
        const fadeLength = Math.max(100, Math.floor(glitchLength * 0.1));
        
        if (sourcePos >= 0 && sourcePos < samples2.length) {
            for (let j = 0; j < glitchLength && startPos + j < endPos; j++) {
                const srcIdx = Math.min(sourcePos + j, samples2.length - 1);
                
                // Плавный fade in/out (косинусная кривая для более плавного звучания)
                let mixAmount = 1.0;
                if (j < fadeLength) {
                    // Fade in (косинусная кривая)
                    mixAmount = (1 - Math.cos((j / fadeLength) * Math.PI)) / 2;
                } else if (j > glitchLength - fadeLength) {
                    // Fade out (косинусная кривая)
                    mixAmount = (1 + Math.cos(((j - (glitchLength - fadeLength)) / fadeLength) * Math.PI)) / 2;
                }
                
                // Выбираем тип глитча
                const glitchType = Math.random();
                let newValue;
                
                if (glitchType < 0.7) {
                    // Прямая замена
                    newValue = samples2[srcIdx];
                } else if (glitchType < 0.95) {
                    // Смешивание двух файлов
                    newValue = Math.floor((samples1[startPos + j] + samples2[srcIdx]) / 2);
                } else {
                    // Легкий битовый глитч (инвертируем только младшие биты)
                    newValue = samples2[srcIdx] ^ 0x00FF;
                }
                
                // Применяем fade и ограничиваем громкость
                const mixed = Math.floor(
                    samples1[startPos + j] * (1 - mixAmount) + newValue * mixAmount
                );
                
                // Ограничиваем значение чтобы не было клиппинга
                resultSamples[startPos + j] = Math.max(-32768, Math.min(32767, mixed));
            }
        }
    }
    
    // Конвертируем обратно в Uint8Array
    return new Uint8Array(resultSamples.buffer);
}

// Находит точки с большими изменениями амплитуды (биты, удары)
function findInterestingPoints(audio, count) {
    const points = [];
    const stepSize = Math.max(1000, Math.floor(audio.length / (count * 2)));
    
    for (let i = 0; i < audio.length - stepSize; i += stepSize) {
        // Вычисляем изменение амплитуды
        let diff = 0;
        const sampleSize = Math.min(500, stepSize);
        for (let j = 0; j < sampleSize; j++) {
            if (i + j + 1 < audio.length) {
                diff += Math.abs(audio[i + j] - audio[i + j + 1]);
            }
        }
        
        points.push({ pos: i, energy: diff });
    }
    
    // Сортируем по энергии и берем самые интересные
    points.sort((a, b) => b.energy - a.energy);
    return points.slice(0, Math.min(count, points.length)).map(p => p.pos);
}

function hexSwap(audio1, audio2, intensity) {
    const result = new Uint8Array(audio1.length);
    const swapRate = intensity / 100;
    
    for (let i = 0; i < audio1.length; i++) {
        if (i < audio2.length && Math.random() < swapRate) {
            result[i] = audio2[i];
        } else {
            result[i] = audio1[i];
        }
    }
    
    return result;
}

function chunkMix(audio1, audio2, intensity, glitchSize) {
    const result = new Uint8Array(audio1.length);
    
    // Размер кусков зависит от glitchSize
    const baseSizes = {
        1: 500,
        2: 2000,
        3: 5000
    };
    const baseChunkSize = baseSizes[glitchSize];
    const chunkSize = Math.max(100, Math.floor(baseChunkSize / (intensity / 50)));
    
    let useFile1 = true;
    
    for (let i = 0; i < audio1.length; i += chunkSize) {
        const end = Math.min(i + chunkSize, audio1.length);
        const source = useFile1 ? audio1 : audio2;
        
        for (let j = i; j < end; j++) {
            if (j < source.length) {
                result[j] = source[j];
            } else {
                result[j] = audio1[j];
            }
        }
        
        if (Math.random() < intensity / 100) {
            useFile1 = !useFile1;
        }
    }
    
    return result;
}

// Show main button in Telegram
tg.MainButton.setText('CLOSE APP');
tg.MainButton.show();
tg.MainButton.onClick(() => {
    tg.close();
});

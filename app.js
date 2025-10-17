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
    const result = new Uint8Array(audio1.length);
    result.set(audio1);
    
    // Размеры глитчей - более музыкальные
    const glitchSizes = {
        1: [8000, 30000],      // Small: ~0.2-0.7 сек
        2: [30000, 100000],    // Medium: ~0.7-2.3 сек
        3: [100000, 250000]    // Large: ~2.3-5.7 сек
    };
    
    const [minSize, maxSize] = glitchSizes[glitchSize];
    
    // Количество глитчей
    const numGlitches = Math.floor((intensity / 100) * 60) + 15; // От 15 до 75 глитчей
    
    // Находим "интересные" места в аудио
    const interestingPoints = findInterestingPoints(audio1, numGlitches * 2);
    
    for (let i = 0; i < numGlitches; i++) {
        // Выбираем случайную интересную точку
        let startPos;
        if (Math.random() < 0.8 && interestingPoints.length > 0) {
            const pointIndex = Math.floor(Math.random() * interestingPoints.length);
            startPos = interestingPoints[pointIndex];
        } else {
            startPos = Math.floor(Math.random() * audio1.length);
        }
        
        // Случайный размер глитча
        const glitchLength = Math.floor(Math.random() * (maxSize - minSize)) + minSize;
        const endPos = Math.min(startPos + glitchLength, audio1.length);
        
        // Случайная позиция из второго файла
        const sourcePos = Math.floor(Math.random() * Math.max(1, audio2.length - glitchLength));
        
        // Размер fade для плавных переходов
        const fadeLength = Math.min(500, Math.floor(glitchLength * 0.1));
        
        // Копируем кусок из второго файла с плавными переходами
        if (sourcePos >= 0 && sourcePos < audio2.length) {
            for (let j = 0; j < glitchLength && startPos + j < endPos; j++) {
                const srcIdx = Math.min(sourcePos + j, audio2.length - 1);
                
                // Плавный fade in/out
                let mixAmount = 1.0;
                if (j < fadeLength) {
                    // Fade in
                    mixAmount = j / fadeLength;
                } else if (j > glitchLength - fadeLength) {
                    // Fade out
                    mixAmount = (glitchLength - j) / fadeLength;
                }
                
                // Выбираем тип глитча (более мягкие варианты)
                const glitchType = Math.random();
                let newValue;
                
                if (glitchType < 0.6) {
                    // Прямая замена с fade
                    newValue = audio2[srcIdx];
                } else if (glitchType < 0.9) {
                    // Смешивание двух файлов
                    newValue = Math.floor((audio1[startPos + j] + audio2[srcIdx]) / 2);
                } else {
                    // Легкий XOR только на некоторых битах
                    newValue = audio2[srcIdx] ^ 0x0F; // Мягкий XOR
                }
                
                // Применяем fade
                result[startPos + j] = Math.floor(
                    audio1[startPos + j] * (1 - mixAmount) + newValue * mixAmount
                );
            }
        }
    }
    
    return result;
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

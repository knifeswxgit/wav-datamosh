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

// Smart Datamosh - агрессивно смешивает файлы с музыкальными глитчами
function smartDatamosh(audio1, audio2, intensity, glitchSize) {
    const result = new Uint8Array(audio1.length);
    result.set(audio1);
    
    // Размеры глитчей в зависимости от настройки (намного больше!)
    const glitchSizes = {
        1: [5000, 20000],      // Small: короткие куски
        2: [20000, 80000],     // Medium: средние куски
        3: [80000, 200000]     // Large: длинные куски
    };
    
    const [minSize, maxSize] = glitchSizes[glitchSize];
    
    // Намного больше глитчей в зависимости от интенсивности
    const numGlitches = Math.floor((intensity / 100) * 100) + 20; // От 20 до 120 глитчей
    
    // Находим "интересные" места в аудио
    const interestingPoints = findInterestingPoints(audio1, numGlitches * 2);
    
    for (let i = 0; i < numGlitches; i++) {
        // Выбираем случайную интересную точку или просто случайную
        let startPos;
        if (Math.random() < 0.7 && interestingPoints.length > 0) {
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
        
        // Копируем кусок из второго файла
        if (sourcePos >= 0 && sourcePos < audio2.length) {
            for (let j = 0; j < glitchLength && startPos + j < endPos; j++) {
                const srcIdx = Math.min(sourcePos + j, audio2.length - 1);
                
                // Разные типы hex-манипуляций для разнообразия
                const glitchType = Math.random();
                if (glitchType < 0.5) {
                    // Прямая замена
                    result[startPos + j] = audio2[srcIdx];
                } else if (glitchType < 0.7) {
                    // XOR для глитча
                    result[startPos + j] = audio2[srcIdx] ^ 0xFF;
                } else if (glitchType < 0.85) {
                    // Смешивание двух файлов
                    result[startPos + j] = (audio1[startPos + j] + audio2[srcIdx]) >> 1;
                } else {
                    // Битовый сдвиг
                    result[startPos + j] = (audio2[srcIdx] << 1) | (audio2[srcIdx] >> 7);
                }
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

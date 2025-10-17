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
            const intensity = parseInt(intensitySlider.value);
            const glitchSize = parseInt(glitchSizeSlider.value);
            
            resultBlob = await datamoshWav(file1Data, file2Data, intensity, glitchSize);
            
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

// Определяем битность WAV файла из заголовка
function getWavBitDepth(data) {
    // Байты 34-35 содержат BitsPerSample
    const bitDepth = data[34] | (data[35] << 8);
    return bitDepth;
}

// Datamosh functions
async function datamoshWav(buffer1, buffer2, intensity, glitchSize) {
    const data1 = new Uint8Array(buffer1);
    const data2 = new Uint8Array(buffer2);
    
    // Определяем битность
    const bitDepth1 = getWavBitDepth(data1);
    const bitDepth2 = getWavBitDepth(data2);
    
    console.log(`File 1: ${bitDepth1}-bit, File 2: ${bitDepth2}-bit`);
    
    // Parse WAV headers
    const header1 = data1.slice(0, 44);
    const audio1 = data1.slice(44);
    const audio2 = data2.slice(44);
    
    // Настоящий датамош!
    const result = realDatamosh(audio1, audio2, intensity, glitchSize, bitDepth1);
    
    // Combine header with processed audio
    const finalData = new Uint8Array(header1.length + result.length);
    finalData.set(header1, 0);
    finalData.set(result, header1.length);
    
    return new Blob([finalData], { type: 'audio/wav' });
}

// Smart Datamosh - музыкально смешивает файлы с мягкими переходами
function smartDatamosh(audio1, audio2, intensity, glitchSize, bitDepth = 16) {
    let samples1, samples2, resultSamples;
    let bytesPerSample, minValue, maxValue;
    
    // Определяем тип данных в зависимости от битности
    if (bitDepth === 16) {
        bytesPerSample = 2;
        samples1 = new Int16Array(audio1.buffer, audio1.byteOffset, audio1.length / 2);
        samples2 = new Int16Array(audio2.buffer, audio2.byteOffset, audio2.length / 2);
        resultSamples = new Int16Array(samples1.length);
        minValue = -32768;
        maxValue = 32767;
    } else if (bitDepth === 24) {
        // 24-бит обрабатываем как 32-бит для удобства
        bytesPerSample = 3;
        // Для 24-бит используем Int32Array и читаем по 3 байта
        const numSamples1 = Math.floor(audio1.length / 3);
        const numSamples2 = Math.floor(audio2.length / 3);
        samples1 = new Int32Array(numSamples1);
        samples2 = new Int32Array(numSamples2);
        resultSamples = new Int32Array(numSamples1);
        
        // Читаем 24-битные сэмплы
        for (let i = 0; i < numSamples1; i++) {
            const offset = i * 3;
            samples1[i] = (audio1[offset] | (audio1[offset + 1] << 8) | (audio1[offset + 2] << 16)) << 8 >> 8;
        }
        for (let i = 0; i < numSamples2; i++) {
            const offset = i * 3;
            samples2[i] = (audio2[offset] | (audio2[offset + 1] << 8) | (audio2[offset + 2] << 16)) << 8 >> 8;
        }
        
        minValue = -8388608;
        maxValue = 8388607;
    } else {
        // Fallback на 16-бит
        console.warn(`Unsupported bit depth: ${bitDepth}, using 16-bit`);
        return smartDatamosh(audio1, audio2, intensity, glitchSize, 16);
    }
    
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
        const startPos = Math.floor(Math.random() * Math.max(1, samples1.length - maxSize));
        const glitchLength = Math.floor(Math.random() * (maxSize - minSize)) + minSize;
        const endPos = Math.min(startPos + glitchLength, samples1.length);
        
        // Случайная позиция из второго файла
        const sourcePos = Math.floor(Math.random() * Math.max(1, samples2.length - glitchLength));
        
        // Размер fade (30% от длины глитча, минимум 500 сэмплов для заметного эффекта)
        const fadeLength = Math.max(500, Math.floor(glitchLength * 0.3));
        
        if (sourcePos >= 0 && sourcePos < samples2.length) {
            for (let j = 0; j < glitchLength && startPos + j < endPos; j++) {
                const srcIdx = Math.min(sourcePos + j, samples2.length - 1);
                
                // Плавный fade in/out (косинусная кривая)
                let fadeMultiplier = 1.0;
                if (j < fadeLength) {
                    // Fade in - плавное нарастание
                    fadeMultiplier = (1 - Math.cos((j / fadeLength) * Math.PI)) / 2;
                } else if (j > glitchLength - fadeLength) {
                    // Fade out - плавное затухание
                    fadeMultiplier = (1 + Math.cos(((j - (glitchLength - fadeLength)) / fadeLength) * Math.PI)) / 2;
                }
                
                // mixAmount теперь зависит от fade
                let mixAmount = fadeMultiplier;
                
                // Выбираем тип глитча
                const glitchType = Math.random();
                let glitchValue;
                
                // ВАЖНО: Снижаем громкость глитчей на 60%
                const volumeReduction = 0.4;
                
                if (glitchType < 0.7) {
                    glitchValue = Math.floor(samples2[srcIdx] * volumeReduction);
                } else if (glitchType < 0.95) {
                    glitchValue = Math.floor((samples1[startPos + j] * 0.5 + samples2[srcIdx] * volumeReduction * 0.5));
                } else {
                    glitchValue = Math.floor((samples2[srcIdx] ^ 0x00FF) * volumeReduction);
                }
                
                // Применяем fade - плавное смешивание оригинала и глитча
                const originalValue = samples1[startPos + j];
                const mixed = Math.floor(
                    originalValue * (1 - mixAmount) + glitchValue * mixAmount
                );
                
                // Дополнительное ограничение громкости (soft clipping)
                let finalValue = mixed;
                const threshold = maxValue * 0.75;
                if (Math.abs(mixed) > threshold) {
                    // Мягкое ограничение для громких пиков
                    const sign = mixed > 0 ? 1 : -1;
                    finalValue = Math.floor(sign * (threshold + (Math.abs(mixed) - threshold) * 0.3));
                }
                
                resultSamples[startPos + j] = Math.max(minValue, Math.min(maxValue, finalValue));
            }
        }
    }
    
    // Конвертируем обратно в Uint8Array
    if (bitDepth === 24) {
        // Конвертируем 24-бит обратно
        const result = new Uint8Array(resultSamples.length * 3);
        for (let i = 0; i < resultSamples.length; i++) {
            const sample = resultSamples[i];
            result[i * 3] = sample & 0xFF;
            result[i * 3 + 1] = (sample >> 8) & 0xFF;
            result[i * 3 + 2] = (sample >> 16) & 0xFF;
        }
        return result;
    } else {
        return new Uint8Array(resultSamples.buffer);
    }
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



// НАСТОЯЩИЙ ДАТАМОШ - музыкальное смешивание файлов
function realDatamosh(audio1, audio2, intensity, glitchSize, bitDepth = 16) {
    // Работаем с 16-битными сэмплами
    const samples1 = new Int16Array(audio1.buffer, audio1.byteOffset, audio1.length / 2);
    const samples2 = new Int16Array(audio2.buffer, audio2.byteOffset, audio2.length / 2);
    const result = new Int16Array(samples1.length);
    result.set(samples1);
    
    // Размеры блоков для датамоша
    const blockSizes = {
        1: [5000, 15000],      // Small: ~0.11-0.34 сек
        2: [15000, 40000],     // Medium: ~0.34-0.91 сек
        3: [40000, 90000]      // Large: ~0.91-2.04 сек
    };
    
    const [minBlock, maxBlock] = blockSizes[glitchSize];
    const numBlocks = Math.floor((intensity / 100) * 30) + 5; // 5-35 блоков
    
    for (let b = 0; b < numBlocks; b++) {
        const blockLength = Math.floor(Math.random() * (maxBlock - minBlock)) + minBlock;
        const startPos = Math.floor(Math.random() * Math.max(1, samples1.length - blockLength));
        const sourcePos = Math.floor(Math.random() * Math.max(1, samples2.length - blockLength));
        
        // Длинный fade для плавности (20% блока)
        const fadeLength = Math.floor(blockLength * 0.2);
        
        // Выбираем один режим для всего блока
        const mode = Math.random();
        
        for (let i = 0; i < blockLength && startPos + i < result.length; i++) {
            const srcIdx = Math.min(sourcePos + i, samples2.length - 1);
            
            // Вычисляем fade (косинусная кривая)
            let fadeFactor = 1.0;
            if (i < fadeLength) {
                // Fade in
                fadeFactor = (1 - Math.cos((i / fadeLength) * Math.PI)) / 2;
            } else if (i > blockLength - fadeLength) {
                // Fade out
                fadeFactor = (1 + Math.cos(((i - (blockLength - fadeLength)) / fadeLength) * Math.PI)) / 2;
            }
            
            let newSample;
            
            if (mode < 0.5) {
                // Режим 1: Прямая замена с fade и снижением громкости
                newSample = Math.floor(samples2[srcIdx] * 0.5); // Тише на 50%
            } else if (mode < 0.8) {
                // Режим 2: Плавное смешивание
                newSample = Math.floor(
                    (samples1[startPos + i] * 0.5 + samples2[srcIdx] * 0.5)
                );
            } else {
                // Режим 3: Эхо эффект
                const echoDelay = 500;
                const echoPos = Math.max(0, startPos + i - echoDelay);
                newSample = Math.floor(
                    (samples2[srcIdx] * 0.6 + samples1[echoPos] * 0.4)
                );
            }
            
            // Применяем fade
            result[startPos + i] = Math.floor(
                samples1[startPos + i] * (1 - fadeFactor) + newSample * fadeFactor
            );
            
            // Ограничиваем для предотвращения клиппинга
            result[startPos + i] = Math.max(-32768, Math.min(32767, result[startPos + i]));
        }
    }
    
    return new Uint8Array(result.buffer);
}

// Show main button in Telegram
tg.MainButton.setText('CLOSE APP');
tg.MainButton.show();
tg.MainButton.onClick(() => {
    tg.close();
});

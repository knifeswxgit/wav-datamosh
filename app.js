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
const resultDiv = document.getElementById('result');
const loadingDiv = document.getElementById('loading');

// Update intensity display
intensitySlider.addEventListener('input', (e) => {
    intensityValue.textContent = e.target.value;
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
            
            resultBlob = await datamoshWav(file1Data, file2Data, method, intensity);
            
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

// Download button handler - send to Telegram
downloadBtn.addEventListener('click', async () => {
    if (resultBlob) {
        tg.HapticFeedback.impactOccurred('medium');
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = function() {
            const base64data = reader.result.split(',')[1];
            
            // Send file data back to bot
            tg.sendData(JSON.stringify({
                action: 'send_file',
                filename: `datamoshed_${Date.now()}.wav`,
                data: base64data
            }));
            
            tg.showAlert('✓ File sent to chat!');
            tg.HapticFeedback.notificationOccurred('success');
        };
        reader.readAsDataURL(resultBlob);
    }
});

// Datamosh functions
async function datamoshWav(buffer1, buffer2, method, intensity) {
    const data1 = new Uint8Array(buffer1);
    const data2 = new Uint8Array(buffer2);
    
    // Parse WAV headers
    const header1 = data1.slice(0, 44);
    const audio1 = data1.slice(44);
    const audio2 = data2.slice(44);
    
    let result;
    
    switch (method) {
        case 'hex-swap':
            result = hexSwap(audio1, audio2, intensity);
            break;
        case 'byte-replace':
            result = byteReplace(audio1, audio2, intensity);
            break;
        case 'chunk-mix':
            result = chunkMix(audio1, audio2, intensity);
            break;
        case 'header-corrupt':
            result = headerCorrupt(header1, audio1, intensity);
            return new Blob([result], { type: 'audio/wav' });
        default:
            result = hexSwap(audio1, audio2, intensity);
    }
    
    // Combine header with processed audio
    const finalData = new Uint8Array(header1.length + result.length);
    finalData.set(header1, 0);
    finalData.set(result, header1.length);
    
    return new Blob([finalData], { type: 'audio/wav' });
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

function byteReplace(audio1, audio2, intensity) {
    const result = new Uint8Array(audio1.length);
    const replaceAmount = Math.floor((audio1.length * intensity) / 100);
    
    result.set(audio1);
    
    for (let i = 0; i < replaceAmount; i++) {
        const pos = Math.floor(Math.random() * audio1.length);
        const sourcePos = Math.floor(Math.random() * audio2.length);
        if (sourcePos < audio2.length) {
            result[pos] = audio2[sourcePos];
        }
    }
    
    return result;
}

function chunkMix(audio1, audio2, intensity) {
    const result = new Uint8Array(audio1.length);
    const chunkSize = Math.max(100, Math.floor(audio1.length / (intensity * 2)));
    
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

function headerCorrupt(header, audio, intensity) {
    const result = new Uint8Array(header.length + audio.length);
    const corruptedHeader = new Uint8Array(header);
    
    // Corrupt some header bytes (skip first 12 bytes - RIFF header)
    const corruptCount = Math.floor((header.length - 12) * intensity / 200);
    
    for (let i = 0; i < corruptCount; i++) {
        const pos = 12 + Math.floor(Math.random() * (header.length - 12));
        corruptedHeader[pos] = Math.floor(Math.random() * 256);
    }
    
    result.set(corruptedHeader, 0);
    result.set(audio, header.length);
    
    return result;
}

// Show main button in Telegram
tg.MainButton.setText('CLOSE APP');
tg.MainButton.show();
tg.MainButton.onClick(() => {
    tg.close();
});

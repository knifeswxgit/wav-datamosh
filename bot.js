const TelegramBot = require('node-telegram-bot-api');

const token = '7769506208:AAHaCWvSO2SXcrQhTgvN2iFUPgXD_VLV8-E';
const bot = new TelegramBot(token, { polling: true });

// GitHub Pages URL
const webAppUrl = 'https://knifeswxgit.github.io/wav-datamosh/';

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId, 
        '🎵 *WAV DATAMOSH*\n\n' +
        'Welcome to the ultimate audio glitch tool!\n\n' +
        '✨ Upload 2 WAV files and create unique datamosh effects\n' +
        '🎨 Multiple glitch methods available\n' +
        '⚡ Process directly in Telegram\n\n' +
        'Click the button below to start!',
        {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [
                    [{
                        text: '🚀 Open WAV Datamosh',
                        web_app: { url: webAppUrl }
                    }]
                ],
                resize_keyboard: true
            }
        }
    );
});

// Handle web app data
bot.on('web_app_data', async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const data = JSON.parse(msg.web_app_data.data);
        
        if (data.action === 'send_file') {
            // Convert base64 to buffer
            const buffer = Buffer.from(data.data, 'base64');
            
            // Send file to user
            await bot.sendDocument(chatId, buffer, {
                caption: '🎵 Your datamoshed WAV file is ready!',
                filename: data.filename
            });
            
            bot.sendMessage(chatId, '✨ Enjoy your glitched audio!');
        }
    } catch (error) {
        console.error('Error processing web app data:', error);
        bot.sendMessage(chatId, '❌ Error processing file. Please try again.');
    }
});

bot.on('message', (msg) => {
    if (msg.text && msg.text !== '/start' && !msg.web_app_data) {
        bot.sendMessage(msg.chat.id, 
            'Use the button below to open the app! 👇',
            {
                reply_markup: {
                    keyboard: [
                        [{
                            text: '🚀 Open WAV Datamosh',
                            web_app: { url: webAppUrl }
                        }]
                    ],
                    resize_keyboard: true
                }
            }
        );
    }
});

console.log('Bot is running...');

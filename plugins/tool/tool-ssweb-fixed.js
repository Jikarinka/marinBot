import axios from 'axios';

export default {
    command: ['ssweb', 'sspc', 'sshp'],
    category: 'tool',
    isRegistered: true,
    limit: 1,
    description: 'Mengambil screenshot dari sebuah website menggunakan Microlink API.',
    async execute(sock, m, msgData) {
        let url = msgData.args[0];

        if (!url) {
            return sock.sendMessage(msgData.remoteJid, {
                text: `Uwaaa! Mana link website yang mau di-screenshot kak? (｡T ω T｡)\n\nContoh: \`.${msgData.commandName} https://google.com\``
            }, { quoted: m });
        }

        if (!/^https?:\/\//.test(url)) url = 'https://' + url;

        await sock.sendMessage(msgData.remoteJid, {
            react: { text: '🕓', key: m.key }
        });

        try {
            let mode = 'desktop';
            let microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true`;

            if (msgData.commandName === 'sshp') {
                mode = 'handphone';
                // Menggunakan viewport mobile untuk Microlink
                microlinkUrl += `&viewport_width=414&viewport_height=896`;
            }

            // Ambil data dari Microlink untuk memastikan URL gambar valid
            const response = await axios.get(microlinkUrl);
            const imageUrl = response.data.data.screenshot.url;

            if (!imageUrl) {
                throw new Error('Microlink tidak mengembalikan URL screenshot..');
            }

            const caption = `Horeee! Ini hasil screenshot website buat kakak~ (˶˃ ᵕ ˂˶)\n\n*URL:* ${url}\n*Mode:* ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;

            await sock.sendMessage(msgData.remoteJid, {
                image: { url: imageUrl },
                caption: caption
            }, { quoted: m });

            await sock.sendMessage(msgData.remoteJid, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('SSWeb Error:', error);
            await sock.sendMessage(msgData.remoteJid, {
                react: { text: '❌', key: m.key }
            });
            await sock.sendMessage(msgData.remoteJid, {
                text: `Uwaaa gawat! Marin gagal ambil screenshot websitenya kak.. (╥﹏╥)\n\n*Error:* ${error.message || 'Internal Server Error'}`
            }, { quoted: m });
        }
    }
};

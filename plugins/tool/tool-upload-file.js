import { marinCDN } from '../../libs/uploader.js';

export default {
    command: ['upload', 'cdn', 'tourl'],
    category: 'tool',
    isRegistered: true,
    limit: 1,
    description: 'Mengunggah berkas ke Marin CDN untuk mendapatkan tautan (URL).',
    async execute(sock, m, msgData) {
        const buffer = await msgData.downloadMedia();

        if (!buffer) {
            return sock.sendMessage(msgData.remoteJid, {
                text: `Kakak manis~ (˶˃ ᵕ ˂˶) Kirim atau balas berkas apa saja (gambar/video/audio/dokumen/stiker) dengan perintah *.upload* biar Marin buatkan link-nya yaa! (๑>ᴗ<๑)`
            }, { quoted: m });
        }

        await sock.sendMessage(msgData.remoteJid, { react: { text: '⏳', key: m.key } });

        try {
            const result = await marinCDN(buffer);
            await sock.sendMessage(msgData.remoteJid, { react: { text: '✅', key: m.key } });

            const responseText = `Horeee~! Berkas kakak sudah berhasil diunggah~! (˶˃ ᵕ ˂˶)\n\n` +
                `*Link:* ${result.url}\n` +
                `*Nama:* ${result.filename || 'berkas-marin'}\n` +
                `*Ukuran:* ${result.size || 'Misterius'} bytes (๑>ᴗ<๑)`;

            await sock.sendMessage(msgData.remoteJid, { text: responseText }, { quoted: m });

        } catch (error) {
            console.error('Upload Tool Error:', error);
            await sock.sendMessage(msgData.remoteJid, { react: { text: '❌', key: m.key } });
            await sock.sendMessage(msgData.remoteJid, {
                text: `Aduuh gawat! Marin gagal mengunggah berkasnya kak: ${error.message}.. (╥﹏╥)`
            }, { quoted: m });
        }
    }
};

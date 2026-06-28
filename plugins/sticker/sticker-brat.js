import { generateBrat } from '../../libs/imagegen/local-imagegen.js';
import config from '../../config.js';
import { writeExif, imageToWebp } from '../../libs/sticker/sticker.js';

export default {
    command: ['brat'],
    category: 'sticker',
    isRegistered: true,
    description: 'Membuat stiker teks bergaya Brat (putih dengan teks hitam), digenerate lokal.',
    async execute(sock, m, msgData, user) {
        let text = msgData.args.join(' ');
        if (!text) {
            return sock.sendMessage(msgData.remoteJid, { text: `Kakak mau buat stiker brat? Kasih teksnya dulu dong~ .${msgData.commandName} <teks> yaa! (˶˃ ᵕ ˂˶)` }, { quoted: m });
        }

        await sock.sendMessage(msgData.remoteJid, { react: { text: '⏳', key: m.key } });

        try {
            const pngBuffer = await generateBrat(text);
            const stickerBuffer = await imageToWebp(pngBuffer);

            const exifData = {
                packName: config.BOT_NAME,
                packPublish: user.name
            };
            const finalSticker = await writeExif(stickerBuffer, exifData);

            await sock.sendMessage(msgData.remoteJid, { sticker: finalSticker }, { quoted: m });
            await sock.sendMessage(msgData.remoteJid, { react: { text: '✅', key: m.key } });

        } catch (error) {
            console.error('Brat Sticker Error:', error);
            await sock.sendMessage(msgData.remoteJid, { react: { text: '❌', key: m.key } });
            await sock.sendMessage(msgData.remoteJid, { text: `Uwaaa gomenasai kak, stiker brat-nya gagal dibuat: ${error.message}.. (╥﹏╥)` }, { quoted: m });
        }
    }
};

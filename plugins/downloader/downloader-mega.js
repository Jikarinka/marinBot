import { File as MegaFile } from 'megajs';
import mime from 'mime-types';
import { sizeFormatter } from 'human-readable';

const formatSize = sizeFormatter({
    std: 'JEDEC',
    decimalPlaces: 2,
    keepTrailingZeros: false,
    render: (literal, symbol) => `${literal} ${symbol}B`,
});

export default {
    command: ['mega', 'megadl'],
    category: 'downloader',
    isRegistered: true,
    limit: true,
    description: 'Mengunduh file dari Mega.nz.',
    async execute(sock, m, msgData) {
        if (msgData.args.length === 0) {
            return sock.sendMessage(msgData.remoteJid, { text: `Link Mega-nya mana Kakak~? Ketik .${msgData.commandName} <url> yaa! (๑>ᴗ<๑)` }, { quoted: m });
        }

        const url = msgData.args[0];
        await msgData.react('⏳');

        try {
            const file = MegaFile.fromURL(url);
            await file.loadAttributes();

            const readableSize = formatSize(file.size);

            let caption = `--- *MEGA DOWNLOADER* ---\n\n`;
            caption += `📄 *Nama:* ${file.name}\n`;
            caption += `📦 *Ukuran:* ${readableSize}\n\n`;
            caption += `Sabar ya kak, Marin sedang mendownload filenya buat Kakak~! (˶˃ ᵕ ˂˶)`;

            await sock.sendMessage(msgData.remoteJid, { text: caption }, { quoted: m });

            const buffer = await file.downloadBuffer();
            const mimetype = mime.lookup(file.name) || 'application/octet-stream';

            await sock.sendMessage(msgData.remoteJid, {
                document: buffer,
                mimetype: mimetype,
                fileName: file.name,
                caption: `Ini dia filenya, Kakak~! ✨ (๑>ᴗ<๑)`
            }, { quoted: m });

            await msgData.react('✅');

        } catch (error) {
            console.error('Mega Downloader Error:', error);
            await msgData.react('❌');
            await sock.sendMessage(msgData.remoteJid, { text: `Gawat kak! Marin gagal download: ${error.message}.. (⊙_⊙)` }, { quoted: m });
        }
    }
};

import axios from 'axios';
import mime from 'mime-types';
import * as cheerio from 'cheerio';

/**
 * Scrape Krakenfiles untuk dapat direct download link.
 * Direct link diambil dari atribut data-file pada tombol download,
 * digabung dengan hostname dari halaman tersebut.
 */
async function scrapeKrakenfiles(url) {
    const { data: html } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 20000
    });

    const $ = cheerio.load(html);
    const filename = $('div.title').first().text().trim() || $('h1').first().text().trim();
    const filesize = $('div.size').first().text().trim() || '-';
    const downloadPath = $('#dl-link').attr('href') || $('a.button.is-success').attr('href');

    if (!downloadPath) throw new Error('Marin nggak nemu link download-nya kak, mungkin file-nya udah dihapus~');

    const downloadUrl = downloadPath.startsWith('http') ? downloadPath : `https:${downloadPath}`;

    return {
        metadata: {
            filename: filename || 'file',
            file_size: filesize,
            download: downloadUrl
        },
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    };
}

export default {
    command: ['kraken', 'kfiles', 'krakenfiles', 'krakenfile'],
    category: 'downloader',
    isRegistered: true,
    limit: true,
    description: 'Mengunduh file dari Krakenfiles.',
    async execute(sock, m, msgData) {
        if (msgData.args.length === 0) {
            return sock.sendMessage(msgData.remoteJid, { text: `Link Krakenfiles-nya mana Kakak~? Ketik .${msgData.commandName} <url> yaa! (๑>ᴗ<๑)` }, { quoted: m });
        }

        const url = msgData.args[0];
        await msgData.react('⏳');

        try {
            const data = await scrapeKrakenfiles(url);

            if (!data || !data.metadata || !data.metadata.download) {
                throw new Error('Maafin Marin kak, datanya nggak ketemu atau link-nya rusak.. (╥﹏╥)');
            }

            const metadata = data.metadata;
            const headers = data.headers;
            const downloadUrl = metadata.download.replace('https:https://', 'https://');

            let caption = `--- *KRAKENFILES DOWNLOADER* ---\n\n`;
            caption += `📄 *Nama:* ${metadata.filename}\n`;
            caption += `📦 *Ukuran:* ${metadata.file_size}\n\n`;
            caption += `Sabar ya kak, Marin sedang mendownload filenya buat Kakak~! (˶˃ ᵕ ˂˶)`;

            await sock.sendMessage(msgData.remoteJid, { text: caption }, { quoted: m });

            const fileRes = await axios.get(downloadUrl, {
                headers,
                responseType: 'arraybuffer',
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const buffer = Buffer.from(fileRes.data);
            const mimetype = mime.lookup(metadata.filename) || 'application/octet-stream';

            await sock.sendMessage(msgData.remoteJid, {
                document: buffer,
                mimetype: mimetype,
                fileName: metadata.filename,
                caption: `Ini dia filenya, Kakak~! ✨ (๑>ᴗ<๑)`
            }, { quoted: m });

            await msgData.react('✅');

        } catch (error) {
            console.error('Krakenfiles Downloader Error:', error);
            await msgData.react('❌');
            await sock.sendMessage(msgData.remoteJid, { text: `Gawat kak! Marin gagal download: ${error.message}.. (⊙_⊙)` }, { quoted: m });
        }
    }
};

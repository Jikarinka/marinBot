import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Scrape Pinterest pin langsung dari halaman (OpenGraph meta tags).
 * Tidak butuh API key, hanya bergantung pada struktur HTML Pinterest.
 */
async function scrapePinterest(url) {
    const { data: html } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 20000
    });

    const $ = cheerio.load(html);

    const title = $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[property="og:description"]').attr('content') || '';
    const videoUrl = $('meta[property="og:video"]').attr('content')
        || $('meta[property="og:video:secure_url"]').attr('content')
        || null;
    let imageUrl = $('meta[property="og:image"]').attr('content') || null;

    // Pinterest sering kasih thumbnail kecil di og:image, coba upscale ke originals
    if (imageUrl) {
        imageUrl = imageUrl.replace(/\/\d+x(?:\d+)?\//, '/originals/');
    }

    return {
        title,
        description,
        isImage: !videoUrl,
        image: imageUrl ? { url: imageUrl } : null,
        video: videoUrl ? { url: videoUrl } : null
    };
}

export default {
    command: ['pinterest', 'pin'],
    category: 'downloader',
    isRegistered: true,
    limit: 1,
    description: 'Mengunduh media (gambar/video) dari Pinterest.',
    async execute(sock, m, msgData) {
        if (msgData.args.length === 0) {
            return sock.sendMessage(msgData.remoteJid, { text: `Link Pinterest-nya mana Kakak~? Ketik .${msgData.commandName} <url> yaa! (๑>ᴗ<๑)` }, { quoted: m });
        }

        const url = msgData.args[0];
        await msgData.react('🕓');

        try {
            const data = await scrapePinterest(url);

            if (!data || (!data.image && !data.video)) {
                throw new Error('Maafin Marin kak, datanya nggak ketemu atau medianya nggak ada.. (╥﹏╥)');
            }

            const { title, description, isImage, image, video } = data;
            const caption = `--- *PINTEREST DOWNLOADER* ---\n\n` +
                `📌 *Judul:* ${title || 'Tidak ada judul'}\n` +
                `📝 *Desc:* ${description || 'Tidak ada deskripsi'}\n\n` +
                `Ini medianya buat Kakak~! (˶˃ ᵕ ˂˶)`;

            let imageBuffer = null;
            if (image && image.url) {
                try {
                    const res = await axios.get(image.url, { responseType: 'arraybuffer' });
                    imageBuffer = Buffer.from(res.data);
                } catch (e) {
                    console.error('Failed to fetch Pinterest image:', e.message);
                }
            }

            if (isImage) {
                if (imageBuffer) {
                    await sock.sendMessage(msgData.remoteJid, {
                        image: imageBuffer,
                        caption: caption,
                        mentions: [msgData.senderJid]
                    }, { quoted: m });
                } else {
                    throw new Error('Yahhh... Marin gagal mendownload gambarnya kak (╥﹏╥)');
                }
            } else {
                if (imageBuffer) {
                    await sock.sendMessage(msgData.remoteJid, {
                        image: imageBuffer,
                        caption: `${caption}\n\n*Note:* Marin kirim preview gambarnya dulu ya kak~ ✨`,
                        mentions: [msgData.senderJid]
                    }, { quoted: m });
                }

                if (video && video.url) {
                    try {
                        const videoRes = await axios.get(video.url, { responseType: 'arraybuffer' });
                        const videoBuffer = Buffer.from(videoRes.data);

                        await sock.sendMessage(msgData.remoteJid, {
                            video: videoBuffer,
                            mimetype: "video/mp4",
                            fileName: `pinterest_video.mp4`,
                            caption: `Ini videonya buat Kakak~! (๑>ᴗ<๑)`,
                            mentions: [msgData.senderJid],
                        }, { quoted: m });
                    } catch (error) {
                        console.error('Pinterest Video Error:', error);
                        await sock.sendMessage(msgData.remoteJid, { text: `G-gagal kirim videonya kak: ${error.message} (╥﹏╥)` }, { quoted: m });
                    }
                }
            }

            await msgData.react('✅');

        } catch (error) {
            console.error('Pinterest Downloader Error:', error);
            await msgData.react('❌');
            const errMsg = error.response?.data?.message || error.message;
            await sock.sendMessage(msgData.remoteJid, { text: `Gawat kak! Marin gagal: ${errMsg}.. (⊙_⊙)` }, { quoted: m });
        }
    }
};

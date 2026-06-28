import axios from 'axios';
import mime from 'mime-types';

/**
 * Ambil data post dari Danbooru API resmi (publik, tanpa API key untuk request dasar).
 * https://danbooru.donmai.us/wiki_pages/help:api
 */
async function fetchDanbooru(url) {
    const match = url.match(/posts\/(\d+)/);
    if (!match) throw new Error('Link Danbooru-nya nggak valid kak, harus link postingan (ada /posts/ID)~');

    const postId = match[1];
    const { data: post } = await axios.get(`https://danbooru.donmai.us/posts/${postId}.json`, {
        timeout: 20000
    });

    if (!post || !post.file_url) {
        throw new Error('Post-nya nggak punya media yang bisa didownload kak~ (mungkin restricted)');
    }

    return {
        url: post.file_url || post.large_file_url,
        ID: post.id,
        Uploader: post.uploader_id ? `User#${post.uploader_id}` : 'Unknown',
        Date: post.created_at ? new Date(post.created_at).toLocaleDateString('id-ID') : '-',
        Size: post.file_size ? `${(post.file_size / 1024 / 1024).toFixed(2)} MB` : '-',
        Rating: post.rating === 's' ? 'Safe' : post.rating === 'q' ? 'Questionable' : post.rating === 'e' ? 'Explicit' : post.rating || '-',
        Score: post.score ?? '-',
        Favorites: post.fav_count ?? '-',
        Source: post.source || '-'
    };
}

export default {
    command: ['danbooru', 'danbooru-dl'],
    category: 'downloader',
    isRegistered: true,
    limit: true,
    description: 'Mengunduh gambar atau video dari Danbooru.',
    async execute(sock, m, msgData) {
        if (msgData.args.length === 0) {
            return sock.sendMessage(msgData.remoteJid, { text: `Link Danbooru-nya mana Kakak~? Ketik .${msgData.commandName} <url> yaa! (๑>ᴗ<๑)` }, { quoted: m });
        }

        const url = msgData.args[0];
        await msgData.react('⏳');

        try {
            const data = await fetchDanbooru(url);

            if (!data || !data.url) {
                throw new Error('Maafin Marin kak, datanya nggak ketemu atau link-nya rusak.. (╥﹏╥)');
            }

            const mimetype = mime.lookup(data.url) || 'application/octet-stream';
            const isVideo = mimetype.startsWith('video/');
            const isGif = mimetype === 'image/gif';

            let caption = `--- *DANBOORU DOWNLOADER* ---\n\n`;
            caption += `🆔 *ID:* ${data.ID}\n`;
            caption += `👤 *Uploader:* ${data.Uploader}\n`;
            caption += `📅 *Date:* ${data.Date}\n`;
            caption += `📦 *Size:* ${data.Size}\n`;
            caption += `🔞 *Rating:* ${data.Rating}\n`;
            caption += `⭐ *Score:* ${data.Score}\n`;
            caption += `💖 *Favorites:* ${data.Favorites}\n`;
            caption += `🔗 *Source:* ${data.Source}\n\n`;
            caption += `Ini dia medianya buat Kakak~! (˶˃ ᵕ ˂˶)`;

            if (isVideo || isGif) {
                await sock.sendMessage(msgData.remoteJid, {
                    video: { url: data.url },
                    caption: caption,
                    mimetype: isGif ? 'video/mp4' : mimetype,
                    gifPlayback: isGif
                }, { quoted: m });
            } else {
                await sock.sendMessage(msgData.remoteJid, {
                    image: { url: data.url },
                    caption: caption,
                    mimetype: mimetype
                }, { quoted: m });
            }

            await msgData.react('✅');

        } catch (error) {
            console.error('Danbooru Downloader Error:', error);
            await msgData.react('❌');
            const errMsg = error.response?.data?.message || error.message;
            await sock.sendMessage(msgData.remoteJid, { text: `Gawat kak! Marin gagal download: ${errMsg}.. (⊙_⊙)` }, { quoted: m });
        }
    }
};

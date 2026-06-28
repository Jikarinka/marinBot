// Facebook Downloader — Multi-API Fallback (tanpa API key)
// API 1: socialdownloader.space (primary)
// API 2: bk9.fun (fallback)

import axios from 'axios';

const APIS = [
    {
        name: 'socialdownloader',
        fetch: async (url) => {
            const { data } = await axios.post(
                'https://socialdownloader.space/api/download',
                { url },
                {
                    timeout: 20000,
                    headers: {
                        'authority': 'www.socialdownloader.space',
                        'accept': '*/*',
                        'content-type': 'application/json',
                        'origin': 'https://www.socialdownloader.space',
                        'referer': 'https://www.socialdownloader.space/',
                        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
                    }
                }
            )
            if (!data.success) throw new Error('socialdownloader: ' + (data.error || 'failed'))
            const items = []
            if (data.downloadUrl) items.push({ type: 'video', url: data.downloadUrl })
            const images = (data.metadata?.images || []).map(i => ({
                type: 'image',
                url: typeof i === 'string' ? i : i?.url
            })).filter(i => i.url)
            items.push(...images)
            if (!items.length) throw new Error('socialdownloader: no media')
            return { caption: data.metadata?.title || '', items }
        }
    },
    {
        name: 'bk9',
        fetch: async (url) => {
            const { data } = await axios.get(
                `https://bk9.fun/download/facebook?url=${encodeURIComponent(url)}`,
                { timeout: 20000 }
            )
            if (!data.status) throw new Error('bk9: ' + (data.message || 'failed'))
            const result = data.BK9 || data.result || data
            const items = []
            const hd = result.hd || result.video_hd
            const sd = result.sd || result.video_sd || result.video
            if (hd) items.push({ type: 'video', url: hd })
            else if (sd) items.push({ type: 'video', url: sd })
            if (!items.length) throw new Error('bk9: no media')
            return { caption: result.title || '', items }
        }
    }
]

async function downloadFacebook(url) {
    const errors = []
    for (const api of APIS) {
        try {
            console.log(`[FB-DL] Trying ${api.name}...`)
            const result = await api.fetch(url)
            console.log(`[FB-DL] ✅ ${api.name} OK`)
            return result
        } catch (e) {
            console.warn(`[FB-DL] ❌ ${api.name} failed: ${e.message}`)
            errors.push(`${api.name}: ${e.message}`)
        }
    }
    throw new Error(`Semua API gagal:\n${errors.join('\n')}`)
}

export default {
    command: ['facebook', 'fb', 'fbdl', 'fbdownload'],
    category: 'downloader',
    isRegistered: true,
    limit: true,
    description: 'Mengunduh video atau gambar dari Facebook.',
    async execute(sock, m, msgData) {
        if (msgData.args.length === 0) {
            return sock.sendMessage(msgData.remoteJid, { text: `Kakak lupa ya? Cara pakainya: .${msgData.commandName} <url> yaa~ (˶˃ ᵕ ˂˶)` }, { quoted: m });
        }

        const url = msgData.args[0];
        await sock.sendMessage(msgData.remoteJid, { react: { text: '⏳', key: m.key } });

        try {
            const { caption: title, items } = await downloadFacebook(url);

            if (!items.length) {
                throw new Error('Maafin aku kak, nggak ada media yang bisa aku download nih~ (｡T ω T｡)');
            }

            let first = true;
            for (const item of items) {
                const caption = first ? (title || `Ini dia videonya buat kakak @${msgData.senderJid.split('@')[0]} tercinta~ (๑>ᴗ<๑)`) : '';

                try {
                    const res = await axios.get(item.url, {
                        responseType: 'arraybuffer',
                        timeout: 30000,
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36' }
                    });
                    const buffer = Buffer.from(res.data);

                    if (item.type === 'video') {
                        await sock.sendMessage(msgData.remoteJid, {
                            video: buffer, mimetype: 'video/mp4', fileName: 'video.mp4',
                            caption, mentions: [msgData.senderJid],
                        }, { quoted: m });
                    } else if (item.type === 'image') {
                        await sock.sendMessage(msgData.remoteJid, {
                            image: buffer, caption, mentions: [msgData.senderJid],
                        }, { quoted: m });
                    }
                } catch (e) {
                    console.error('Error sending media item:', e);
                }
                first = false;
            }

            await sock.sendMessage(msgData.remoteJid, { react: { text: '✅', key: m.key } });

        } catch (error) {
            console.error('Facebook Downloader Error:', error);
            await sock.sendMessage(msgData.remoteJid, { react: { text: '❌', key: m.key } });
            await sock.sendMessage(msgData.remoteJid, { text: `Gawat kak! Ada error nih: ${error.message}.. Tolong cek lagi yaa~ (⊙_⊙)` }, { quoted: m });
        }
    }
};

// Twitter/X Downloader — Multi-API Fallback (tanpa API key)
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
                type: 'image', url: typeof i === 'string' ? i : i?.url
            })).filter(i => i.url)
            items.push(...images)
            if (!items.length) throw new Error('socialdownloader: no media')
            return {
                items,
                text: data.metadata?.title || '',
                authorName: data.metadata?.author || 'Unknown',
                authorUsername: ''
            }
        }
    },
    {
        name: 'bk9',
        fetch: async (url) => {
            const { data } = await axios.get(
                `https://bk9.fun/download/twitter?url=${encodeURIComponent(url)}`,
                { timeout: 20000 }
            )
            if (!data.status) throw new Error('bk9: ' + (data.message || 'failed'))
            const result = data.BK9 || data.result || data
            const items = []
            if (Array.isArray(result.url)) {
                for (const u of result.url) items.push({ type: 'video', url: typeof u === 'string' ? u : u?.url })
            } else if (result.url) {
                items.push({ type: 'video', url: result.url })
            }
            if (!items.length) throw new Error('bk9: no media')
            return {
                items,
                text: result.title || result.desc || '',
                authorName: result.author?.name || result.username || 'Unknown',
                authorUsername: result.author?.username || ''
            }
        }
    }
]

async function downloadTwitter(url) {
    const errors = []
    for (const api of APIS) {
        try {
            console.log(`[TW-DL] Trying ${api.name}...`)
            const result = await api.fetch(url)
            console.log(`[TW-DL] ✅ ${api.name} OK`)
            return result
        } catch (e) {
            console.warn(`[TW-DL] ❌ ${api.name} failed: ${e.message}`)
            errors.push(`${api.name}: ${e.message}`)
        }
    }
    throw new Error(`Semua API gagal:\n${errors.join('\n')}`)
}

export default {
    command: ['twitter', 'x', 'xdl', 'twitterdl'],
    category: 'downloader',
    isRegistered: true,
    limit: true,
    description: 'Mengunduh media dari Twitter / X.',
    async execute(sock, m, msgData) {
        if (msgData.args.length === 0) {
            return sock.sendMessage(msgData.remoteJid, {
                text: `Kakak, tolong masukin link Twitter/X-nya dulu yaa~ (˶˃ ᵕ ˂˶)`
            }, { quoted: m });
        }

        await sock.sendMessage(msgData.remoteJid, { react: { text: '⏳', key: m.key } });

        try {
            const url = msgData.args[0];
            const { items, text, authorName, authorUsername } = await downloadTwitter(url);

            if (!items.length) {
                throw new Error('Gagal mendownload media dari Twitter/X kak.. (╥﹏╥)');
            }

            const sender = msgData.senderJid.split('@')[0];
            const usernameTag = authorUsername ? `@${authorUsername}` : 'unknown';

            const captionInfo = `*Twitter/X Downloader* ✨\n\n` +
                `*Uploader:* ${authorName} (${usernameTag})\n` +
                `*Tweet:* ${text || '-'}`;

            const isImageOnly = items.every(i => i.type === 'image');

            if (isImageOnly) {
                for (let i = 0; i < items.length; i++) {
                    const caption = i === 0 ? `Ini foto Twitter buat kakak @${sender}~ (๑>ᴗ<๑)\n\n${captionInfo}` : '';
                    await sock.sendMessage(msgData.remoteJid, {
                        image: { url: items[i].url },
                        caption,
                        mentions: i === 0 ? [msgData.senderJid] : [],
                    }, { quoted: m });
                }
            } else {
                const video = items.find(i => i.type === 'video') || items[0];
                await sock.sendMessage(msgData.remoteJid, {
                    video: { url: video.url },
                    caption: `Ini videonya buat kakak tercinta @${sender}~ (˶˃ ᵕ ˂˶)\n\n${captionInfo}`,
                    mimetype: 'video/mp4',
                    mentions: [msgData.senderJid],
                }, { quoted: m });
            }

            await sock.sendMessage(msgData.remoteJid, { react: { text: '✅', key: m.key } });

        } catch (error) {
            console.error('Twitter Downloader Error:', error);
            await sock.sendMessage(msgData.remoteJid, { react: { text: '❌', key: m.key } });
            await sock.sendMessage(msgData.remoteJid, {
                text: `Uwaaa gawat! Ada error pas download Twitter/X: ${error.message}.. (｡T ω T｡)`
            }, { quoted: m });
        }
    }
};

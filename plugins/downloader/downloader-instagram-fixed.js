// Instagram Downloader — Multi-API Fallback (tanpa API key)
// API 1: socialdownloader.space (primary)
// API 2: bk9.fun (fallback)

import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { exec } from 'child_process';

// ── API Definitions ───────────────────────────────────────────────
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
            
            const videos = data.downloadUrl
                ? [{
                    type: 'video',
                    url: data.downloadUrl.startsWith('/')
                        ? `https://socialdownloader.space${data.downloadUrl}`
                        : data.downloadUrl
                }]
                : []

            const images = (data.metadata?.images || [])
                .map(i => {
                    let imageUrl =
                        typeof i === 'string'
                            ? i
                            : i?.url
                    if (imageUrl?.startsWith('/')) {
                        imageUrl =
                            `https://socialdownloader.space${imageUrl}`
                    }
                    return {
                        type: 'image',
                        url: imageUrl
                    }
                })
                .filter(i => i.url)

            if (!videos.length && !images.length) throw new Error('socialdownloader: no media')
            return { title: '', videos, images, audios: [] }
        }
    },
    {
        name: 'bk9',
        fetch: async (url) => {
            const { data } = await axios.get(
                `https://bk9.fun/download/instagram?url=${encodeURIComponent(url)}`,
                { timeout: 20000 }
            )
            if (!data.status) throw new Error('bk9: ' + (data.message || 'failed'))
            const result = data.BK9 || data.result || data
            const videos = result.video ? [{ type: 'video', url: result.video }] : []
            const images = Array.isArray(result.images)
                ? result.images.map(i => ({ type: 'image', url: typeof i === 'string' ? i : i?.url })).filter(i => i.url)
                : []
            if (!videos.length && !images.length) throw new Error('bk9: no media')
            return { title: '', videos, images, audios: [] }
        }
    }
]

// ── Try all APIs in order ─────────────────────────────────────────
async function downloadInstagram(url) {
    const errors = []
    for (const api of APIS) {
        try {
            console.log(`[IG-DL] Trying ${api.name}...`)
            const result = await api.fetch(url)
            console.log(`[IG-DL] ✅ ${api.name} OK`)
            return result
        } catch (e) {
            console.warn(`[IG-DL] ❌ ${api.name} failed: ${e.message}`)
            errors.push(`${api.name}: ${e.message}`)
        }
    }
    throw new Error(`Semua API gagal:\n${errors.join('\n')}`)
}

// ── ffmpeg merge video+audio ──────────────────────────────────────
async function mergeVideoAudio(videoUrl, audioUrl) {
    const rand = Math.random().toString(36).substring(7)
    const tmpVid = path.join(os.tmpdir(), `vid_${Date.now()}_${rand}.mp4`)
    const tmpAud = path.join(os.tmpdir(), `aud_${Date.now()}_${rand}.m4a`)
    const tmpOut = path.join(os.tmpdir(), `out_${Date.now()}_${rand}.mp4`)
    const headers = { 'User-Agent': 'Mozilla/5.0' }

    try {
        const [vidRes, audRes] = await Promise.all([
            axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 30000, headers }),
            axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 30000, headers })
        ])
        fs.writeFileSync(tmpVid, Buffer.from(vidRes.data))
        fs.writeFileSync(tmpAud, Buffer.from(audRes.data))
        await new Promise((resolve, reject) => {
            exec(`ffmpeg -i "${tmpVid}" -i "${tmpAud}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${tmpOut}"`,
                (err) => err ? reject(err) : resolve())
        })
        return fs.readFileSync(tmpOut)
    } finally {
        for (const f of [tmpVid, tmpAud, tmpOut]) {
            try { if (fs.existsSync(f)) fs.unlinkSync(f) } catch (_) {}
        }
    }
}

// ── Download buffer from URL ──────────────────────────────────────
async function downloadBuffer(url) {
    if (!url) throw new Error('URL kosong')
    if (url.startsWith('/')) {
        url = `https://socialdownloader.space${url}`
    }
    if (url.startsWith('//')) {
        url = `https:${url}`
    }
    console.log('[IG-DL] Downloading:', url)
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxRedirects: 10,
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    })
    return Buffer.from(res.data)
}

export default {
    command: ['instagram', 'ig', 'igdl'],
    category: 'downloader',
    isRegistered: true,
    limit: true,
    description: 'Mengunduh video, gambar, atau audio dari Instagram.',

    async execute(sock, m, msgData) {
        const { args, remoteJid, senderJid, messageContent } = msgData

        if (!args[0]) {
            return sock.sendMessage(remoteJid, {
                text: `Kakak lupa masukin link Instagram-nya yaa?\nPakainya gini: .${msgData.commandName} <url>~\n\nFlag opsional:\n--audio → kirim audio saja`
            }, { quoted: m })
        }

        const url = args[0]
        const withAudio = messageContent.includes('--audio')

        await sock.sendMessage(remoteJid, { react: { text: '⏳', key: m.key } })

        try {
            const result = await downloadInstagram(url)
            console.log('[IG-DL] Result:', JSON.stringify({
                title: result.title,
                videos: result.videos?.length || 0,
                images: result.images?.length || 0,
                audios: result.audios?.length || 0,
                videoUrls: result.videos?.map(v => v.url),
                imageUrls: result.images?.map(i => i.url)
            }, null, 2))
            const { title, videos, images, audios } = result

            let allMedia = [...videos, ...images]
            if (withAudio && audios.length) allMedia = [...allMedia, ...audios]

            if (!allMedia.length) throw new Error('Tidak ada media ditemukan.')

            let first = true
            for (const item of allMedia) {
                const caption = (first && item.type !== 'audio')
                    ? (title || `Download dari Instagram~ (๑>ᴗ<๑)`)
                    : ''

                try {
                    if (item.type === 'video') {
                        // Cek apakah ada audio pair yang perlu di-merge
                        const vidIdx = videos.indexOf(item)
                        const needMerge = vidIdx !== -1 && audios[vidIdx] && item.isAudio === false

                        let buffer
                        if (needMerge) {
                            buffer = await mergeVideoAudio(item.url, audios[vidIdx].url)
                        } else {
                            buffer = await downloadBuffer(item.url)
                        }

                        await sock.sendMessage(remoteJid, {
                            video: buffer,
                            mimetype: 'video/mp4',
                            fileName: 'video.mp4',
                            caption,
                            mentions: [senderJid]
                        }, { quoted: m })

                    } else if (item.type === 'image') {
                        const buffer = await downloadBuffer(item.url)
                        await sock.sendMessage(remoteJid, {
                            image: buffer,
                            caption,
                            mentions: [senderJid]
                        }, { quoted: m })

                    } else if (item.type === 'audio') {
                        const buffer = await downloadBuffer(item.url)
                        await sock.sendMessage(remoteJid, {
                            audio: buffer,
                            mimetype: item.mimetype || 'audio/mpeg',
                            fileName: 'audio.mp3'
                        }, { quoted: m })
                    }
                } catch (e) {
                    console.error('[IG-DL] Error sending item:', e.message)
                }

                if (item.type !== 'audio') first = false
            }

            await sock.sendMessage(remoteJid, { react: { text: '✅', key: m.key } })

        } catch (error) {
            console.error('[IG-DL] Final error:', error.message)
            await sock.sendMessage(remoteJid, { react: { text: '❌', key: m.key } })
            await sock.sendMessage(remoteJid, {
                text: `Gomenasai kak! Semua server download lagi error nih~\n${error.message}`
            }, { quoted: m })
        }
    }
}

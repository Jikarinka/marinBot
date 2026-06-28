/**
 * MCP Downloader Tools — Marin Bot
 * TikTok, Instagram, YouTube, Facebook, Twitter
 * Tool HANYA return string hasil — agent/plugin yang kirim ke WA
 * (Tidak ada double send)
 *
 * Semua sumber data sudah tidak pakai API_MARIN (mati) — diganti
 * library/API publik yang reliable: tikwm.com,
 * socialdownloader.space + bk9.fun (multi-fallback).
 *
 * CATATAN: @distube/ytdl-core SUDAH TIDAK DIPAKAI untuk YouTube —
 * repo-nya sudah di-archive (read-only) sejak Agustus 2025 dan YouTube
 * sekarang wajib po_token yang library itu tidak pernah dapat dukungan,
 * jadi hampir selalu gagal "Sign in to confirm you're not a bot".
 * YouTube sekarang lewat socialdownloader.space (sama seperti IG/FB/Twitter).
 */

import { registerTool } from '../../mcp/registry.js'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Mengubah relative URL (/api/video...) atau protocol-relative (//...) jadi Absolute URL
function formatUrl(link) {
    if (!link) return null
    if (link.startsWith('//')) return `https:${link}`
    if (link.startsWith('/')) return `https://socialdownloader.space${link}`
    return link
}

function isYoutubeUrl(url) {
    return /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i.test(url || '')
}

// ── Multi-API fallback untuk IG/FB/Twitter ────────────────────────
async function fetchSocialMulti(url) {
    try {
        const { data } = await axios.post('https://socialdownloader.space/api/download', { url }, {
            timeout: 20000,
            headers: {
                'content-type': 'application/json',
                'origin': 'https://www.socialdownloader.space',
                'referer': 'https://www.socialdownloader.space/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
            }
        })
        if (data.success) {
            const result = {
                videoUrl: formatUrl(data.downloadUrl),
                audioUrl: formatUrl(data.audioUrl),
                images: (data.metadata?.images || []).map(i => formatUrl(typeof i === 'string' ? i : i?.url)).filter(Boolean),
                title: data.metadata?.title || '',
                author: data.metadata?.author || ''
            }
            console.log('[Social-DL] socialdownloader OK:', JSON.stringify({ videoUrl: result.videoUrl, audioUrl: result.audioUrl, images: result.images.length }))
            return result
        }
    } catch (e) {
        console.warn('[Social-DL] socialdownloader failed:', e.message)
    }

    // Fallback ke bk9.fun (IG/FB/Twitter saja — bk9 tidak support YouTube)
    const hostname = new URL(url).hostname
    let endpoint = hostname.includes('instagram') ? 'instagram'
        : hostname.includes('twitter') || hostname.includes('x.com') ? 'twitter'
        : hostname.includes('facebook') || hostname.includes('fb.watch') ? 'facebook'
        : null
    if (!endpoint) throw new Error('Platform tidak didukung di fallback bk9')

    const { data } = await axios.get(`https://bk9.fun/download/${endpoint}?url=${encodeURIComponent(url)}`, {
        headers: { 'user-agent': 'Mozilla/5.0' }, timeout: 20000
    })
    if (!data.status) throw new Error('Semua sumber gagal mengambil data')
    const r = data.BK9 || data.result || data
    const fallbackResult = {
        videoUrl: formatUrl(r.video || r.hd || r.sd || r.url || null),
        audioUrl: null,
        images: Array.isArray(r.images) ? r.images.map(i => formatUrl(typeof i === 'string' ? i : i?.url)).filter(Boolean) : [],
        title: r.title || r.desc || '',
        author: ''
    }
    console.log('[Social-DL] bk9 fallback OK:', JSON.stringify({ videoUrl: fallbackResult.videoUrl, images: fallbackResult.images.length }))
    return fallbackResult
}

// ── Download buffer dari URL (dengan resolve relative/protocol-relative) ──
async function downloadBuffer(url) {
    if (!url) throw new Error('URL kosong')
    if (url.startsWith('/')) url = `https://socialdownloader.space${url}`
    if (url.startsWith('//')) url = `https:${url}`
    console.log('[Social-DL] Downloading:', url)
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxRedirects: 10,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    return Buffer.from(res.data)
}

// ── TikTok ───────────────────────────────────────────────────────
registerTool({
    name: 'download_tiktok',
    description: 'Download video atau foto TikTok tanpa watermark. Gunakan saat ada URL tiktok.com atau vt.tiktok.com',
    parameters: {
        url: { type: 'string', description: 'URL video TikTok', required: true }
    },
    execute: async ({ url, _sock, _m, _jid }) => {
        // tikwm.com — API publik gratis, no key, reliable untuk TikTok
        const { data: response } = await axios.get('https://www.tikwm.com/api/', { params: { url, hd: 1 } })
        if (response.code !== 0 || !response.data) throw new Error(response.msg || 'Gagal fetch TikTok')

        const vid = response.data
        const title = vid.title || 'TikTok Video'
        const author = vid.author?.nickname || ''
        const caption = `✅ *${title}*${author ? `\n👤 ${author}` : ''}\n_via Marin Bot_`

        if (_sock && _jid) {
            if (vid.images?.length > 0) {
                for (let i = 0; i < Math.min(vid.images.length, 5); i++) {
                    await _sock.sendMessage(_jid, { image: { url: vid.images[i] }, caption: i === 0 ? caption : '' }, { quoted: _m })
                }
                return `${vid.images.length} foto TikTok dikirim`
            }
            const videoUrl = vid.hdplay || vid.play
            await _sock.sendMessage(_jid, { video: { url: videoUrl }, caption, mimetype: 'video/mp4' }, { quoted: _m })
            return `Video TikTok berhasil dikirim: "${title}"`
        }
        return `Link TikTok: ${vid.hdplay || vid.play}`
    }
})

// ── Instagram ─────────────────────────────────────────────────────
registerTool({
    name: 'download_instagram',
    description: 'Download video atau foto Instagram Reels/Post. Gunakan saat ada URL instagram.com',
    parameters: {
        url: { type: 'string', description: 'URL Instagram', required: true }
    },
    execute: async ({ url, _sock, _m, _jid }) => {
        const result = await fetchSocialMulti(url)

        if (_sock && _jid) {
            if (result.images.length > 0) {
                for (let i = 0; i < Math.min(result.images.length, 5); i++) {
                    const caption = i === 0 ? `✅ Instagram Photo (${i + 1}/${result.images.length})\n_via Marin Bot_` : ''
                    await _sock.sendMessage(_jid, { image: { url: result.images[i] }, caption }, { quoted: _m })
                }
                return `${result.images.length} foto Instagram dikirim`
            }
            if (result.videoUrl) {
                const caption = `✅ Instagram Video\n_via Marin Bot_`
                await _sock.sendMessage(_jid, { video: { url: result.videoUrl }, caption, mimetype: 'video/mp4' }, { quoted: _m })
                return `Video Instagram dikirim`
            }
            throw new Error('Tidak ada media ditemukan')
        }
        return `Instagram media: ${result.videoUrl || result.images[0] || 'tidak ada URL'}`
    }
})

// ── YouTube Video ─────────────────────────────────────────────────
registerTool({
    name: 'download_youtube',
    description: 'Download video YouTube/Shorts (MP4). Gunakan saat ada URL youtube.com/youtu.be dan user mau video.',
    parameters: {
        url: { type: 'string', description: 'URL YouTube', required: true }
    },
    execute: async ({ url, _sock, _m, _jid }) => {
        if (!isYoutubeUrl(url)) throw new Error('Link YouTube tidak valid')

        const result = await fetchSocialMulti(url)
        if (!result.videoUrl) throw new Error('Video tidak ditemukan (mungkin private/age-restricted/live)')
        const title = result.title || 'YouTube Video'

        if (!_sock || !_jid) return `YouTube video: ${result.videoUrl} (gunakan command .ytmp4 untuk download)`

        const caption = `✅ *${title}*\n_via Marin Bot_`
        await _sock.sendMessage(_jid, { video: { url: result.videoUrl }, caption, mimetype: 'video/mp4' }, { quoted: _m })
        return `YouTube video dikirim: "${title}"`
    }
})

// ── YouTube Audio / Lagu ──────────────────────────────────────────
registerTool({
    name: 'play_youtube',
    description: 'Cari dan kirim audio/lagu dari YouTube. Gunakan saat user minta putar lagu, carikan lagu, atau download MP3.',
    parameters: {
        query: { type: 'string', description: 'Judul lagu atau URL YouTube', required: true }
    },
    execute: async ({ query, _sock, _m, _jid }) => {
        let url = query
        if (!isYoutubeUrl(query)) {
            const ytSearch = (await import('yt-search')).default
            const searchRes = await ytSearch(query)
            const first = searchRes.videos?.[0]
            if (!first) throw new Error('Lagu tidak ditemukan di YouTube')
            url = first.url
        }

        const result = await fetchSocialMulti(url)
        const audioSource = result.audioUrl || result.videoUrl
        if (!audioSource) throw new Error('Audio tidak ditemukan (mungkin private/age-restricted/live)')
        const title = result.title || query

        if (!_sock || !_jid) return `Audio: ${audioSource}`

        const buffer = await downloadBuffer(audioSource)
        await _sock.sendMessage(_jid, { audio: buffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: _m })
        await _sock.sendMessage(_jid, { text: `🎵 *${title}*` }, { quoted: _m })
        return `Lagu "${title}" dikirim`
    }
})

// ── Facebook ──────────────────────────────────────────────────────
registerTool({
    name: 'download_facebook',
    description: 'Download video Facebook. Gunakan saat ada URL facebook.com atau fb.watch',
    parameters: {
        url: { type: 'string', description: 'URL Facebook', required: true }
    },
    execute: async ({ url, _sock, _m, _jid }) => {
        const result = await fetchSocialMulti(url)
        if (!result.videoUrl) throw new Error('Tidak ada video ditemukan')

        const title = result.title || 'Facebook Video'
        const caption = `✅ *${title}*\n_via Marin Bot_`

        if (_sock && _jid) {
            await _sock.sendMessage(_jid, { video: { url: result.videoUrl }, caption, mimetype: 'video/mp4' }, { quoted: _m })
            return `Facebook video dikirim: "${title}"`
        }
        return `Facebook video: ${result.videoUrl}`
    }
})

// ── Twitter/X ─────────────────────────────────────────────────────
registerTool({
    name: 'download_twitter',
    description: 'Download video Twitter/X. Gunakan saat ada URL twitter.com atau x.com',
    parameters: {
        url: { type: 'string', description: 'URL Twitter/X', required: true }
    },
    execute: async ({ url, _sock, _m, _jid }) => {
        const result = await fetchSocialMulti(url)
        if (!result.videoUrl) throw new Error('Tidak ada video ditemukan')

        const title = result.title || 'Twitter Video'
        const caption = `✅ *${title}*\n_via Marin Bot_`

        if (_sock && _jid) {
            await _sock.sendMessage(_jid, { video: { url: result.videoUrl }, caption, mimetype: 'video/mp4' }, { quoted: _m })
            return `Twitter video dikirim`
        }
        return `Twitter video: ${result.videoUrl}`
    }
})

// ── Plugin handler command langsung ──────────────────────────────
export default {
    command: ['tt', 'tiktok', 'ig', 'instagram', 'yt', 'ytmp4', 'ytmp3', 'play', 'fb', 'fbdl', 'twdl'],
    category: 'downloader',
    description: 'Download media dari berbagai platform\ntt/ig/yt/play/fb/twdl <url>',
    isRegistered: true,
    limit: true,

    async execute(sock, m, msgData) {
        const { commandName, args, remoteJid } = msgData
        const input = args.join(' ').trim()
        if (!input) return msgData.reply(`Kakak lupa kasih link~ Contoh: .${commandName} <url>`)

        await msgData.react('⏳')
        try {
            const { callTool } = await import('../../mcp/registry.js')
            const map = {
                tt: 'download_tiktok', tiktok: 'download_tiktok',
                ig: 'download_instagram', instagram: 'download_instagram',
                yt: 'download_youtube', ytmp4: 'download_youtube',
                ytmp3: 'play_youtube', play: 'play_youtube',
                fb: 'download_facebook', fbdl: 'download_facebook',
                twdl: 'download_twitter'
            }
            const toolName = map[commandName]
            if (!toolName) return msgData.reply('Command tidak dikenal~')

            await callTool(toolName, {
                url: input, query: input,
                _sock: sock, _m: m, _jid: remoteJid,
                _senderId: msgData.senderJid
            })
            await msgData.react('✅')
        } catch (err) {
            await msgData.react('❌')
            await msgData.reply(`❌ Gagal: ${err.message}`)
        }
    }
}

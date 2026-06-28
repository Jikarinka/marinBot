/**
 * Marin m-helper — Shorthand gaya KannaBot untuk plugin developer
 *
 * Cara pakai di plugin:
 *   async execute(sock, m, msgData) {
 *       // m sudah diperkaya — langsung pakai shorthand:
 *       await m.reply('Halo!')
 *       await m.reply(buffer)          // otomatis deteksi tipe media
 *       console.log(m.chat)            // remoteJid
 *       console.log(m.sender)          // senderJid
 *       console.log(m.text)            // isi pesan
 *       console.log(m.isGroup)         // boolean
 *       const q = m.quoted             // pesan yang di-reply (atau null)
 *       console.log(q?.text)           // teks quoted
 *       await m.react('🔥')
 *       await m.delete()               // hapus pesan ini
 *
 *       // conn = sock dengan shorthand tambahan:
 *       const conn = m.conn
 *       await conn.reply(m.chat, 'teks', m)
 *       await conn.sendFile(m.chat, buffer, 'file.jpg', 'caption', m)
 *       await conn.sendImage(m.chat, url, 'caption', m)
 *       await conn.sendVideo(m.chat, url, 'caption', m)
 *       await conn.sendAudio(m.chat, url, m)
 *       await conn.sendSticker(m.chat, buffer, m)
 *       await conn.react(m, '✅')
 *   }
 *
 * Dipanggil sekali di handler.js sebelum plugin dieksekusi:
 *   enrichMessage(sock, m, msgData)
 */

import { downloadContentFromMessage } from 'baileys'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileTypeFromBuffer } from 'file-type'

// ── Helper internal ─────────────────────────────────────────────────────────

/** Unwrap pesan ke satu level (sama seperti messageUnwrapper.js tapi inline) */
function unwrap(msg) {
    if (!msg) return {}
    const IGNORE = ['senderKeyDistributionMessage', 'messageContextInfo', 'deviceSentMessage']
    for (const key of Object.keys(msg)) {
        if (!IGNORE.includes(key)) return msg
    }
    return msg
}

function getMtype(msg) {
    if (!msg) return ''
    const IGNORE = ['senderKeyDistributionMessage', 'messageContextInfo']
    const keys = Object.keys(msg).filter(k => !IGNORE.includes(k))
    return keys[0] || ''
}

const MEDIA_TYPES = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage']

/** Download Buffer dari message Baileys (contentKey style) */
async function downloadMedia(msg, mtype) {
    const contentType = mtype
        .replace('Message', '')
        .replace('sticker', 'image')
    const stream = await downloadContentFromMessage(msg, contentType)
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    return Buffer.concat(chunks)
}

/** Baca Buffer dari URL, path file, atau Buffer langsung */
async function resolveBuffer(input) {
    if (Buffer.isBuffer(input)) return { buffer: input, mime: null }
    if (typeof input === 'string') {
        if (/^https?:\/\//.test(input)) {
            const res = await axios.get(input, { responseType: 'arraybuffer', timeout: 15000 })
            return { buffer: Buffer.from(res.data), mime: res.headers['content-type'] }
        }
        if (fs.existsSync(input)) {
            return { buffer: fs.readFileSync(input), mime: null }
        }
        if (/^data:.*?;base64,/.test(input)) {
            return { buffer: Buffer.from(input.split(',')[1], 'base64'), mime: input.split(';')[0].replace('data:', '') }
        }
    }
    return null
}

// ── Fungsi utama — panggil sekali per pesan ─────────────────────────────────

/**
 * Enriches m (Baileys raw message) dan sock dengan shorthand gaya KannaBot.
 * Return { m, conn } — keduanya sudah diperkaya.
 */
export function enrichMessage(sock, rawM, msgData) {
    if (!rawM || !sock) return { m: rawM, conn: sock }

    // ── CONN: sock + shorthand method ──────────────────────────────────────
    const conn = sock

    /**
     * conn.reply(jid, teks, quotedMsg, options)
     * Kirim teks, reply ke quotedMsg kalau ada
     */
    conn.reply = async function (jid, text, quoted, options = {}) {
        if (Buffer.isBuffer(text)) return conn.sendFile(jid, text, '', '', quoted, false, options)
        return sock.sendMessage(jid, { text: String(text), ...options }, { quoted: quoted || undefined })
    }

    /**
     * conn.sendFile(jid, buffer/url/path, filename, caption, quoted, ptt, options)
     * Kirim file apapun — otomatis deteksi tipe dari buffer
     */
    conn.sendFile = async function (jid, PATH, filename = '', caption = '', quoted, ptt = false, options = {}) {
        const resolved = await resolveBuffer(PATH)
        if (!resolved) throw new Error('sendFile: tidak bisa resolve input ke buffer')
        let { buffer, mime } = resolved

        if (!mime) {
            const ft = await fileTypeFromBuffer(buffer).catch(() => null)
            mime = ft?.mime || 'application/octet-stream'
        }

        let msgContent
        if (/image/.test(mime)) {
            msgContent = { image: buffer, caption, ...options }
        } else if (/video/.test(mime)) {
            msgContent = { video: buffer, caption, ...options }
        } else if (/audio/.test(mime)) {
            msgContent = { audio: buffer, mimetype: mime, ptt: !!ptt, ...options }
        } else if (/webp/.test(mime)) {
            msgContent = { sticker: buffer, ...options }
        } else {
            msgContent = { document: buffer, mimetype: mime, fileName: filename || 'file', caption, ...options }
        }

        return sock.sendMessage(jid, msgContent, { quoted: quoted || undefined })
    }

    /** conn.sendImage(jid, url/buffer, caption, quoted, options) */
    conn.sendImage = async function (jid, img, caption = '', quoted, options = {}) {
        const resolved = await resolveBuffer(img)
        const src = resolved?.buffer || (typeof img === 'string' ? { url: img } : img)
        return sock.sendMessage(jid, { image: src, caption, ...options }, { quoted: quoted || undefined })
    }

    /** conn.sendVideo(jid, url/buffer, caption, quoted, options) */
    conn.sendVideo = async function (jid, vid, caption = '', quoted, options = {}) {
        const resolved = await resolveBuffer(vid)
        const src = resolved?.buffer || (typeof vid === 'string' ? { url: vid } : vid)
        return sock.sendMessage(jid, { video: src, caption, ...options }, { quoted: quoted || undefined })
    }

    /** conn.sendAudio(jid, url/buffer, quoted, ptt, options) */
    conn.sendAudio = async function (jid, aud, quoted, ptt = false, options = {}) {
        const resolved = await resolveBuffer(aud)
        const src = resolved?.buffer || (typeof aud === 'string' ? { url: aud } : aud)
        return sock.sendMessage(jid, { audio: src, ptt: !!ptt, mimetype: 'audio/mpeg', ...options }, { quoted: quoted || undefined })
    }

    /** conn.sendSticker(jid, buffer/url, quoted, options) */
    conn.sendSticker = async function (jid, sticker, quoted, options = {}) {
        const resolved = await resolveBuffer(sticker)
        const src = resolved?.buffer || (typeof sticker === 'string' ? { url: sticker } : sticker)
        return sock.sendMessage(jid, { sticker: src, ...options }, { quoted: quoted || undefined })
    }

    /** conn.react(m, emoji) */
    conn.react = async function (m, emoji) {
        return sock.sendMessage(m.key?.remoteJid || msgData?.remoteJid, {
            react: { text: emoji, key: m.key }
        })
    }

    /** conn.getName(jid) — nama dari pushName atau nomor */
    conn.getName = function (jid) {
        if (!jid) return 'User'
        const num = jid.split('@')[0].split(':')[0]
        return num
    }

    /** conn.parseMention(text) — extract @mention dari teks */
    conn.parseMention = function (text) {
        return [...(text?.matchAll(/@([0-9]{5,16})/g) || [])].map(v => v[1] + '@s.whatsapp.net')
    }

    // ── M: object pesan + shorthand ──────────────────────────────────────────
    const m = rawM

    // Attach conn ke m supaya bisa m.conn.reply() dll
    m.conn = conn

    // ── m.chat — remoteJid bersih ──
    Object.defineProperty(m, 'chat', {
        get() { return msgData?.remoteJid || m.key?.remoteJid || '' },
        enumerable: true, configurable: true
    })

    // ── m.sender — senderJid bersih ──
    Object.defineProperty(m, 'sender', {
        get() { return msgData?.senderJid || '' },
        enumerable: true, configurable: true
    })

    // ── m.isGroup ──
    Object.defineProperty(m, 'isGroup', {
        get() { return msgData?.isGroup || false },
        enumerable: true, configurable: true
    })

    // ── m.fromMe ──
    Object.defineProperty(m, 'fromMe', {
        get() { return m.key?.fromMe || false },
        enumerable: true, configurable: true
    })

    // ── m.text — isi pesan teks ──
    Object.defineProperty(m, 'text', {
        get() { return msgData?.text || msgData?.messageContent || '' },
        enumerable: true, configurable: true
    })

    // ── m.name — pushName ──
    Object.defineProperty(m, 'name', {
        get() { return msgData?.pushName || 'User' },
        enumerable: true, configurable: true
    })

    // ── m.mtype — tipe pesan ──
    Object.defineProperty(m, 'mtype', {
        get() { return msgData?.messageType || '' },
        enumerable: true, configurable: true
    })

    // ── m.msg — unwrapped message content ──
    Object.defineProperty(m, 'msg', {
        get() {
            if (!m.message) return null
            const mtype = msgData?.messageType || getMtype(m.message)
            return m.message[mtype] || null
        },
        enumerable: true, configurable: true
    })

    // ── m.mentionedJid ──
    Object.defineProperty(m, 'mentionedJid', {
        get() { return msgData?.mentions || [] },
        enumerable: true, configurable: true
    })

    // ── m.quoted — pesan yang di-reply, dengan shorthand m.quoted.reply() dll ──
    Object.defineProperty(m, 'quoted', {
        get() {
            if (!msgData?.isQuoted || !msgData?.quotedMsg) return null

            const ctx = msgData?.contextInfo || {}
            const quotedMsg = msgData.quotedMsg
            const quotedType = msgData.quotedType || getMtype(quotedMsg)
            const quotedContent = quotedMsg[quotedType]
            const text = typeof quotedContent === 'string'
                ? quotedContent
                : quotedContent?.text || quotedContent?.caption || ''

            const isQuotedMedia = MEDIA_TYPES.includes(quotedType)

            return {
                // Data
                mtype: quotedType,
                text,
                caption: quotedContent?.caption || '',
                mentionedJid: ctx.mentionedJid || [],
                id: ctx.stanzaId || '',
                chat: ctx.remoteJid || msgData.remoteJid,
                sender: ctx.participant || ctx.remoteJid || '',
                fromMe: false,
                isMedia: isQuotedMedia,
                mediaType: isQuotedMedia ? quotedType : null,
                message: { [quotedType]: quotedContent },

                // Buat fake key untuk reply ke pesan quoted
                key: {
                    remoteJid: ctx.remoteJid || msgData.remoteJid,
                    id: ctx.stanzaId || '',
                    fromMe: false,
                    participant: ctx.participant || undefined
                },

                // m.quoted.reply(teks) → reply ke pesan quoted
                reply: async (text, chatId, options) => {
                    const jid = chatId || msgData.remoteJid
                    return conn.reply(jid, text, rawM, options)
                },

                // m.quoted.download() → download media dari quoted message
                download: async (saveToFile = false) => {
                    if (!isQuotedMedia) throw new Error('Quoted bukan media')
                    const mediaContent = quotedMsg[quotedType]
                    const buf = await downloadMedia(mediaContent, quotedType)
                    if (saveToFile) {
                        const ft = await fileTypeFromBuffer(buf).catch(() => null)
                        const ext = ft?.ext || 'bin'
                        const fp = path.join(process.cwd(), 'tmp', `quoted_${Date.now()}.${ext}`)
                        fs.mkdirSync(path.dirname(fp), { recursive: true })
                        fs.writeFileSync(fp, buf)
                        return { buffer: buf, filename: fp }
                    }
                    return buf
                },

                // m.quoted.delete() → hapus pesan quoted
                delete: async () => {
                    return sock.sendMessage(ctx.remoteJid || msgData.remoteJid, {
                        delete: {
                            remoteJid: ctx.remoteJid || msgData.remoteJid,
                            id: ctx.stanzaId || '',
                            fromMe: false,
                            participant: ctx.participant || undefined
                        }
                    })
                }
            }
        },
        enumerable: true, configurable: true
    })

    // ── m.isMedia ──
    Object.defineProperty(m, 'isMedia', {
        get() { return msgData?.isMedia || false },
        enumerable: true, configurable: true
    })

    // ── m.mediaType ──
    Object.defineProperty(m, 'mediaType', {
        get() {
            if (!msgData?.isMedia) return null
            return msgData.messageType || null
        },
        enumerable: true, configurable: true
    })

    // ── m.reply(teks/buffer) — kirim pesan, quote ke m ──
    m.reply = async function (text, chatId, options) {
        const jid = chatId || msgData?.remoteJid || m.key?.remoteJid
        if (Buffer.isBuffer(text)) return conn.sendFile(jid, text, '', '', rawM, false, options)
        return conn.reply(jid, String(text), rawM, options)
    }

    // ── m.react(emoji) ──
    m.react = async function (emoji) {
        return sock.sendMessage(msgData?.remoteJid || m.key?.remoteJid, {
            react: { text: emoji, key: m.key }
        })
    }

    // ── m.download() — download media dari pesan ini ──
    m.download = async function (saveToFile = false) {
        if (!msgData?.isMedia) throw new Error('Pesan ini bukan media')
        const mtype = msgData.messageType
        const mediaContent = m.message[mtype]
        const buf = await downloadMedia(mediaContent, mtype)
        if (saveToFile) {
            const ft = await fileTypeFromBuffer(buf).catch(() => null)
            const ext = ft?.ext || 'bin'
            const fp = path.join(process.cwd(), 'tmp', `media_${Date.now()}.${ext}`)
            fs.mkdirSync(path.dirname(fp), { recursive: true })
            fs.writeFileSync(fp, buf)
            return { buffer: buf, filename: fp }
        }
        return buf
    }

    // ── m.delete() — hapus pesan ini ──
    m.delete = async function () {
        return sock.sendMessage(msgData?.remoteJid || m.key?.remoteJid, { delete: m.key })
    }

    // ── m.forward(jid) — forward pesan ini ──
    m.forward = async function (jid, options = {}) {
        return sock.sendMessage(jid, { forward: rawM, ...options })
    }

    return { m, conn }
}

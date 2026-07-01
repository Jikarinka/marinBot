/**
 * Marin Bot — Message Style Helper
 * Builder kecil supaya semua plugin yang pakai List/Button/nativeFlow
 * punya gaya yang konsisten, tanpa nulis ulang boilerplate tiap file.
 *
 * Catatan penting (dari dokumentasi @itsliaaa/baileys):
 *  - List Message (`sections`) HANYA jalan di private chat (@s.whatsapp.net)
 *  - Button / nativeFlow jalan di grup & private
 *  - Maks 3 button "flat" kalau pakai `buttons`; kalau butuh lebih, pakai
 *    nativeFlow dengan tipe `sections` (list) di dalamnya
 */

import config from '../config.js'

const BOT_TAG = () => `${config.BOT_NAME || 'Marin'} • Powered by Gemini AI 🌸`

/**
 * Kirim List Message kalau private chat, atau fallback ke text biasa kalau grup.
 * @param {object} sock
 * @param {object} msgData - hasil extractMessageData (punya isGroup, remoteJid, senderJid)
 * @param {object} m - raw message (untuk quoted)
 * @param {object} opts
 * @param {string} opts.text - body/caption pesan
 * @param {string} opts.title - judul list
 * @param {string} opts.buttonText - label tombol pembuka list
 * @param {string} [opts.footer]
 * @param {Array}  opts.sections - [{ title, rows: [{ title, description, rowId }] }]
 * @param {string} opts.groupFallbackText - teks polos kalau di grup (kalau tidak diisi, pakai opts.text)
 */
export async function sendSmartList(sock, msgData, m, opts) {
    const {
        text,
        title,
        buttonText = '📋 Lihat Pilihan',
        footer = BOT_TAG(),
        sections,
        groupFallbackText,
        mentions
    } = opts

    if (!msgData.isGroup) {
        return sock.sendMessage(msgData.remoteJid, {
            text,
            footer,
            title,
            buttonText,
            sections,
            mentions
        }, { quoted: m })
    }

    // Fallback grup: render sections jadi teks list biasa
    const fallback = groupFallbackText || renderSectionsAsText(text, sections)
    return sock.sendMessage(msgData.remoteJid, {
        text: fallback,
        mentions
    }, { quoted: m })
}

/**
 * Kirim Button Message (maks 3 tombol) — jalan di grup & private.
 * @param {Array} buttons - [{ text, id }] maksimal 3
 */
export async function sendSmartButton(sock, msgData, m, opts) {
    const { text, footer = BOT_TAG(), buttons, mentions } = opts
    return sock.sendMessage(msgData.remoteJid, {
        text,
        footer,
        buttons: buttons.slice(0, 3),
        mentions
    }, { quoted: m })
}

/**
 * Kirim nativeFlow (button modern: reply/url/call/copy/list campur).
 * Jalan di grup & private. Cocok untuk aksi setelah hasil (download lagi, share, dll).
 * @param {Array} flow - [{ text, id?, url?, call?, copy?, icon?, useWebview? }]
 */
export async function sendSmartFlow(sock, msgData, m, opts) {
    const { text, footer = BOT_TAG(), nativeFlow, mentions, image, video, caption } = opts
    const payload = {
        footer,
        nativeFlow,
        mentions
    }
    if (image) { payload.image = image; payload.caption = caption || text }
    else if (video) { payload.video = video; payload.caption = caption || text }
    else { payload.text = text }

    return sock.sendMessage(msgData.remoteJid, payload, { quoted: m })
}

/** Render sections list jadi teks biasa (dipakai sebagai fallback grup) */
export function renderSectionsAsText(headerText, sections) {
    const lines = [headerText, '']
    for (const sec of sections) {
        lines.push(`╭─「 *${sec.title}* 」`)
        for (const row of sec.rows) {
            lines.push(`│ ❯ *${row.title}*`)
            if (row.description) lines.push(`│   ${row.description}`)
        }
        lines.push(`╰────────────────`)
        lines.push('')
    }
    return lines.join('\n').trim()
}

export default { sendSmartList, sendSmartButton, sendSmartFlow, renderSectionsAsText }

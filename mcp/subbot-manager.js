/**
 * Marin Sub-Bot Manager
 *
 * Mengelola sesi WhatsApp tambahan ("sub-bot") yang dijalankan atas nomor
 * milik user (bukan nomor bot utama). Sub-bot ini TIDAK mendapat akses
 * owner/koordinator — dia berjalan sebagai bot publik biasa.
 *
 * Dua jalur pembuatan sub-bot:
 * 1. User premium  → `.jadibot` di chat pribadi dengan bot utama
 * 2. Owner         → `.jadibot 628xxxxxxxxxx` (assign nomor manapun)
 *
 * Sub-bot:
 * - Auth tersimpan terpisah di sessions-subbot/<nomor>/
 * - isOwner & isCoordinator SELALU false, berapapun nomornya
 * - Tools sensitif (file, shell, env, restart) diblokir total di handler
 * - Tetap bisa dipakai sebagai bot WhatsApp biasa oleh pemilik nomor itu
 */

import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from 'baileys'
import pino from 'pino'
import fs from 'fs'
import path from 'path'
import qrcode from 'qrcode-terminal'
import { extractMessageData } from '../libs/adapter/messageAdapter.js'
import { registerSession, unregisterSession } from './session-manager.js'
// NOTE: botHandler SENGAJA tidak di-import statis di sini.
// middlewares/handler.js punya top-level `await loadPlugins()` yang dinamis
// meng-import seluruh file di plugins/ — termasuk main-jadibot.js, yang
// meng-import file INI. Kalau botHandler di-import statis di atas, terjadi
// circular import deadlock: handler.js menunggu loadPlugins() selesai,
// loadPlugins() menunggu main-jadibot.js selesai di-import, main-jadibot.js
// menunggu subbot-manager.js (file ini) selesai di-import, dan file ini
// menunggu handler.js (yang masih "in evaluation") selesai — macet permanen,
// tanpa error apapun. Makanya proses Node berhenti total tepat setelah env
// ke-load, sebelum log apapun dari bot muncul.
// Solusi: import handler.js secara dinamis, hanya saat pesan masuk
// (lihat pemakaian di bawah) — saat itu modul handler.js sudah pasti
// selesai di-evaluasi sepenuhnya, jadi tidak ada lagi deadlock.

const SUBBOT_ROOT = path.join(process.cwd(), 'sessions-subbot')
if (!fs.existsSync(SUBBOT_ROOT)) fs.mkdirSync(SUBBOT_ROOT, { recursive: true })

// Map nomor → sock, supaya tidak dobel-connect nomor yang sama
const activeSubBots = new Map()

function normalizeNumber(num) {
    return String(num).replace(/[^0-9]/g, '')
}

export function isSubBotActive(number) {
    const n = normalizeNumber(number)
    return activeSubBots.has(n)
}

export function listSubBots() {
    return [...activeSubBots.entries()].map(([number, info]) => ({
        number,
        connected: !!info.sock?.user,
        startedAt: info.startedAt
    }))
}

export async function stopSubBot(number) {
    const n = normalizeNumber(number)
    const info = activeSubBots.get(n)
    if (!info) return false
    try { await info.sock.logout() } catch (_) {}
    try { info.sock.end?.() } catch (_) {}
    activeSubBots.delete(n)
    unregisterSession(`subbot-${n}`)
    return true
}

/**
 * Mulai sesi sub-bot baru untuk satu nomor.
 *
 * @param {string} number Nomor WhatsApp tujuan (628xxxxxxxxxx)
 * @param {object} opts
 * @param {'qr'|'pairing'} opts.method Metode autentikasi
 * @param {(qr:string)=>void} [opts.onQR] Callback saat QR string siap (untuk dikirim sebagai gambar)
 * @param {(code:string)=>void} [opts.onPairingCode] Callback saat pairing code siap
 * @param {()=>void} [opts.onConnected] Callback saat berhasil connect
 * @param {(reason:string)=>void} [opts.onFailed] Callback saat gagal total
 */
export async function startSubBot(number, opts = {}) {
    const n = normalizeNumber(number)
    if (!n || n.length < 8) throw new Error('Nomor tidak valid')
    if (isSubBotActive(n)) throw new Error('Nomor ini sudah jadi sub-bot aktif')

    const method = opts.method === 'pairing' ? 'pairing' : 'qr'
    const sessionDir = path.join(SUBBOT_ROOT, n)
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }))

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        version,
        browser: method === 'pairing' ? ['Ubuntu', 'Chrome', '120.0.0.0'] : ['macOS', 'Safari', '20.0.00'],
        printQRInTerminal: false,
        markOnlineOnConnect: true,
        keepAliveIntervalMs: 30000,
        connectTimeoutMs: 60000,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
    })

    const sessionId = `subbot-${n}`
    activeSubBots.set(n, { sock, startedAt: new Date().toISOString() })
    registerSession(sessionId, sock)

    // ── Pairing code: diminta begitu socket siap, sebelum QR event ──
    if (method === 'pairing' && !sock.authState.creds.registered) {
        try {
            await new Promise(r => setTimeout(r, 1500)) // beri waktu socket settle
            const code = await sock.requestPairingCode(n)
            opts.onPairingCode?.(code)
        } catch (err) {
            opts.onFailed?.(err.message)
            activeSubBots.delete(n)
            unregisterSession(sessionId)
            return null
        }
    }

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr && method === 'qr') {
            console.log(`[SubBot:${n}] QR siap`)
            qrcode.generate(qr, { small: true })
            opts.onQR?.(qr)
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
            console.log(`[SubBot:${n}] Koneksi terputus. Alasan: ${reason}`)
            activeSubBots.delete(n)
            unregisterSession(sessionId)

            if (reason === DisconnectReason.loggedOut) {
                console.log(`[SubBot:${n}] Logout permanen, menghapus sesi.`)
                if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true })
                opts.onFailed?.('logged_out')
            } else if (reason !== DisconnectReason.connectionClosed) {
                opts.onFailed?.('disconnected')
            }
        } else if (connection === 'open') {
            console.log(`✅ [SubBot:${n}] Terhubung sebagai sub-bot!`)
            activeSubBots.set(n, { sock, startedAt: new Date().toISOString() })
            opts.onConnected?.()
        }
    })

    // ── Pesan masuk diproses oleh handler yang SAMA, tapi ditandai sub-bot ──
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify' && type !== 'append') return

        for (const m of messages) {
            if (!m.message) continue

            const msgData = extractMessageData(m, sock)
            msgData.sessionId = sessionId
            msgData._isSubBot = true // ← penanda krusial, dibaca di auth.js & validator.js

            const protocolTypes = ['messageContextInfo', 'senderKeyDistributionMessage', 'protocolMessage', 'peerDataOperationRequestMessage']
            if (protocolTypes.includes(msgData.messageType)) continue
            if (m.key.fromMe && !msgData.commandName) continue

            const { default: botHandler } = await import('../middlewares/handler.js')
            botHandler(sock, m, msgData).catch(err => console.error(`[SubBot:${n}] Handler Error:`, err))
        }
    })

    return sock
}

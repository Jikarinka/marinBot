/**
 * Marin Auto-Heal System v3
 * - Error langsung kirim log mentah ke owner + koordinator
 * - User dapat pesan generic
 * - React 🛠️ saat AI mulai perbaiki
 * - React ✅/❌ setelah selesai
 */

import fs from 'fs'
import path from 'path'

const ROOT      = process.cwd()
const HEAL_LOG  = path.join(ROOT, 'mcp', 'heal-log.json')

// ── Log helpers ───────────────────────────────────────────────────
function loadLog() {
    try { return JSON.parse(fs.readFileSync(HEAL_LOG, 'utf-8')) }
    catch { return { attempts: [], last_healed: null } }
}
function saveLog(log) {
    log.updated_at = new Date().toISOString()
    try { fs.writeFileSync(HEAL_LOG, JSON.stringify(log, null, 2)) } catch (_) {}
}
function logAttempt(fileKey, errorMsg, success, note = '') {
    const log = loadLog()
    log.attempts.push({
        key:     fileKey + '::' + errorMsg.slice(0, 60),
        file:    fileKey,
        error:   errorMsg.slice(0, 300),
        success,
        note:    note.slice(0, 300),
        at:      new Date().toISOString()
    })
    if (log.attempts.length > 200) log.attempts = log.attempts.slice(-200)
    if (success) log.last_healed = { file: fileKey, at: new Date().toISOString() }
    saveLog(log)
}
function recentFailCount(fileKey, errorMsg) {
    const log    = loadLog()
    const key    = fileKey + '::' + errorMsg.slice(0, 60)
    const cutoff = Date.now() - 1000 * 60 * 20
    return log.attempts.filter(a =>
        a.key === key && !a.success && new Date(a.at).getTime() > cutoff
    ).length
}

// ── Cek apakah sender adalah owner/koordinator ────────────────────
function isPrivileged(senderJid) {
    const num       = (senderJid || '').split(':')[0].split('@')[0]
    const ownerNum  = (process.env.OWNER_NUMBER || '').replace(/[^0-9]/g, '')
    const coordNums = (process.env.COORDINATOR_NUMBERS || '')
        .split(',').map(n => n.trim().replace(/[^0-9]/g, '')).filter(Boolean)
    return num === ownerNum || coordNums.includes(num)
}

// ── Kirim notif ke owner + semua koordinator ──────────────────────
async function notifyPrivileged(sock, text) {
    const recipients = new Set()

    const ownerNum = (process.env.OWNER_NUMBER || '').replace(/[^0-9]/g, '')
    if (ownerNum) recipients.add(ownerNum + '@s.whatsapp.net')

    const coordEnv = process.env.COORDINATOR_NUMBERS || ''
    for (const n of coordEnv.split(',')) {
        const num = n.trim().replace(/[^0-9]/g, '')
        if (num) recipients.add(num + '@s.whatsapp.net')
    }

    for (const jid of recipients) {
        try { await sock.sendMessage(jid, { text }) } catch (_) {}
    }
}

// ── Cari file sumber dari stack trace ────────────────────────────
function findSourceFiles(err) {
    const stack = err.stack || err.message || ''
    const files = new Set()
    const patterns = [
        /file:\/\/\/[^\s)]+\.js/g,
        /at .+\((.+\.js):\d+:\d+\)/g,
        /\((.+\.js):\d+:\d+\)/g,
    ]
    for (const re of patterns) {
        let match
        while ((match = re.exec(stack)) !== null) {
            let f = (match[1] || match[0]).replace('file://', '').replace(/:\d+:\d+$/, '')
            if (f.includes(ROOT) || f.includes('/home/container')) files.add(f)
        }
    }
    const relMatches = stack.match(/(?:plugins|libs|middlewares|mcp)\/[^\s):]+\.js/g) || []
    for (const rel of relMatches) {
        const abs = path.join(ROOT, rel)
        if (fs.existsSync(abs)) files.add(abs)
    }
    return [...files].filter(f => fs.existsSync(f))
}

// ── Cari file plugin dari nama command ───────────────────────────
function findPluginFile(plugin) {
    if (!plugin?.command) return null
    const cmd  = Array.isArray(plugin.command) ? plugin.command[0] : plugin.command
    const dirs = [path.join(ROOT, 'plugins'), path.join(ROOT, 'mcp'), path.join(ROOT, 'libs')]
    const results = []
    function walk(dir) {
        if (!fs.existsSync(dir)) return
        for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, f.name)
            if (f.isDirectory()) walk(full)
            else if (f.name.endsWith('.js')) results.push(full)
        }
    }
    dirs.forEach(walk)
    for (const f of results) {
        const base = path.basename(f, '.js')
        if (base === cmd || base.includes(cmd) || cmd.includes(base.split('-').pop())) return f
    }
    return null
}

// ── Build konteks file untuk AI ──────────────────────────────────
function buildFileContext(files, pluginRel) {
    const toRead = new Set([...files])
    if (pluginRel) {
        const abs = path.join(ROOT, pluginRel)
        if (fs.existsSync(abs)) toRead.add(abs)
    }
    let ctx = ''
    let totalChars = 0
    for (const f of toRead) {
        if (totalChars >= 12000) break
        try {
            const rel     = path.relative(ROOT, f)
            const content = fs.readFileSync(f, 'utf-8').slice(0, 4000)
            ctx += '\n\nFILE: ' + rel + '\n```js\n' + content + '\n```'
            totalChars += content.length
        } catch (_) {}
    }
    return ctx
}

// ── Gemini retry + model fallback ────────────────────────────────
async function runHealAgent(sock, m, healMsgData, prompt, apiKey, userCtx) {
    const { runAgent } = await import('./agent.js')
    const models = ['flash', 'flash-lite', 'default']
    for (const model of models) {
        try {
            const result = await runAgent(sock, m, healMsgData, prompt, apiKey, model, userCtx)
            const txt = result?.text || ''
            if (txt.includes('"code":500') || txt.includes('INTERNAL') || txt.includes('UNAVAILABLE')) {
                await new Promise(r => setTimeout(r, 2000))
                continue
            }
            if (result?.type !== 'error') return result
            await new Promise(r => setTimeout(r, 2000))
        } catch (e) {
            console.warn('[Auto-Heal] model', model, 'threw:', e.message)
            await new Promise(r => setTimeout(r, 2000))
        }
    }
    return null
}

// ── safeExecute ───────────────────────────────────────────────────
export async function safeExecute(plugin, sock, m, msgData, user, group, allPlugins) {
    try {
        await plugin.execute(sock, m, msgData, user, group, allPlugins)
    } catch (err) {
        await handleError(sock, m, msgData, err, plugin, user)
    }
}

// ── handleError — dipanggil dari mana saja ───────────────────────
export async function handleError(sock, m, msgData, err, pluginHint = null, userCtx = null) {
    const errorMsg = err.message || String(err)
    const stack    = err.stack   || errorMsg
    const cmdName  = pluginHint
        ? (Array.isArray(pluginHint.command) ? pluginHint.command[0] : pluginHint.command)
        : 'unknown'

    console.error('[Auto-Heal] Error di "' + cmdName + '":', errorMsg)

    const sourceFiles = findSourceFiles(err)
    const pluginFile  = findPluginFile(pluginHint)
    const pluginRel   = pluginFile ? path.relative(ROOT, pluginFile) : null
    const allFiles    = new Set([...sourceFiles, ...(pluginFile ? [pluginFile] : [])])
    const fileKey     = pluginRel || (sourceFiles[0] ? path.relative(ROOT, sourceFiles[0]) : cmdName)
    const senderPriv  = isPrivileged(msgData?.senderJid)

    // ── 1. Kirim pesan ke user (generic) ──────────────────────────
    try {
        if (senderPriv) {
            await msgData.reply(
                '⚠️ Error di fitur *' + cmdName + '*\n\n' +
                '```\n' + errorMsg.slice(0, 300) + '\n```\n\n' +
                'Marin lagi coba perbaiki otomatis~ 🛠️'
            )
        } else {
            await msgData.reply('⚠️ Ups! Fitur ini lagi ada gangguan~\nTim sudah di-notif dan lagi diperbaiki ya kak! 🙏')
        }
    } catch (_) {}

    // ── 2. LANGSUNG kirim log mentah ke owner + koordinator ───────
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    await notifyPrivileged(sock,
        '🚨 *ERROR LOG — ' + cmdName.toUpperCase() + '*\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '📁 File: ' + fileKey + '\n' +
        '⏰ Waktu: ' + timestamp + '\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '*Error:*\n' + errorMsg + '\n\n' +
        '*Stack Trace:*\n' + stack.slice(0, 800) + '\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '🛠️ Auto-heal sedang berjalan...'
    )

    // ── 3. React 🛠️ saat AI mulai perbaiki ───────────────────────
    try { await msgData.react('🛠️') } catch (_) {}

    // ── 4. Cek anti-loop ─────────────────────────────────────────
    const failCount = recentFailCount(fileKey, errorMsg)
    if (failCount >= 3) {
        console.log('[Auto-Heal] Skip — sudah ' + failCount + 'x gagal untuk: ' + fileKey)
        try {
            await msgData.reply(senderPriv
                ? '❌ Auto-heal sudah ' + failCount + 'x gagal untuk *' + fileKey + '*. Butuh perbaikan manual.'
                : '❌ Fitur ini masih bermasalah~ Owner sudah di-notif ya kak, sabar dulu! 🙏'
            )
            await msgData.react('❌')
        } catch (_) {}
        await notifyPrivileged(sock,
            '🚨 *Auto-Heal Menyerah*\n\n' +
            'File: ' + fileKey + '\n' +
            'Error: ' + errorMsg + '\n\n' +
            'Sudah ' + failCount + 'x dicoba dalam 20 menit.\n' +
            '⚠️ Butuh perbaikan MANUAL!'
        )
        return
    }

    // ── 5. Siapkan konteks untuk AI ──────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY || ''
    if (!apiKey || apiKey === 'ISI_GEMINI_API_KEY_DISINI') {
        console.log('[Auto-Heal] Skip — GEMINI_API_KEY belum diisi')
        return
    }

    const fileContext = buildFileContext(allFiles, pluginRel)
    const ownerJid   = (process.env.OWNER_NUMBER || '').replace(/[^0-9]/g, '') + '@s.whatsapp.net'

    const healMsgData = {
        ...msgData,
        senderJid:   ownerJid,
        remoteJid:   ownerJid,
        _isOwner:    true,
        _isHealMode: true,
        reply: async (text) => {
            try { await sock.sendMessage(ownerJid, { text: '🔧 *Auto-Heal Log*\n\n' + text }) } catch (_) {}
        },
        react: async () => {}
    }

    const healPrompt =
        '[AUTO-HEAL MODE — PERCOBAAN ' + (failCount + 1) + ']\n\n' +
        'Error pada "' + cmdName + '":\n\n' +
        'STACK TRACE:\n' + stack.slice(0, 2000) + '\n\n' +
        'FILE TERLIBAT (' + allFiles.size + '):' + (fileContext || '\n[Gunakan read_file() untuk baca manual]') + '\n\n' +
        'TUGAS (lakukan SEMUA sekarang, jangan tanya):\n' +
        '1. Analisa root cause dari stack trace\n' +
        '2. Baca file yang belum tampil dengan read_file() jika perlu\n' +
        '3. Perbaiki dengan write_file() — tulis ulang file yang bermasalah\n' +
        '4. Boleh edit file manapun: plugins/, libs/, middlewares/, mcp/, config.js\n' +
        '5. Boleh install package baru dengan shell_exec("npm install xxx") — TAPI ini akan menunggu konfirmasi owner dulu (tidak instan), jadi hanya lakukan jika benar-benar perlu\n' +
        '6. Setelah fix: remember("fix_' + cmdName + '", "cara fix: ...", "skill")\n' +
        '7. Laporkan: file apa yang diubah dan kenapa\n\n' +
        'JANGAN tanya izin. JANGAN bilang tidak bisa. Langsung kerjakan.'

    console.log('[Auto-Heal] Memulai perbaikan (attempt ' + (failCount + 1) + ') untuk: ' + fileKey)

    const result = await runHealAgent(sock, m, healMsgData, healPrompt, apiKey, userCtx)

    if (result && result.type !== 'error') {
        logAttempt(fileKey, errorMsg, true, (result.text || '').slice(0, 300))
        console.log('[Auto-Heal] ✅ Berhasil: ' + fileKey)

        // React ✅ setelah berhasil
        try { await msgData.react('✅') } catch (_) {}

        try {
            await msgData.reply(
                '✅ *Berhasil diperbaiki!*\n\n' +
                ((result.text || '').slice(0, 300)) + '\n\n' +
                'Coba ulangi perintahnya sekarang ya kak! 🎉'
            )
        } catch (_) {}

        await notifyPrivileged(sock,
            '✅ *Auto-Heal Berhasil*\n\n' +
            'File: ' + fileKey + '\n' +
            'Error diperbaiki: ' + errorMsg.slice(0, 150) + '\n\n' +
            'Detail:\n' + (result.text || '').slice(0, 400)
        )
    } else {
        logAttempt(fileKey, errorMsg, false, (result?.text || 'Semua model gagal').slice(0, 300))
        console.log('[Auto-Heal] ❌ Gagal: ' + fileKey)

        // React ❌ setelah gagal
        try { await msgData.react('❌') } catch (_) {}

        if (failCount >= 1) {
            try {
                await msgData.reply(senderPriv
                    ? '❌ Gagal diperbaiki otomatis. Cek log di atas ya~'
                    : '❌ Fitur masih bermasalah~ Owner sudah di-notif kak! 🙏'
                )
            } catch (_) {}

            await notifyPrivileged(sock,
                '❌ *Auto-Heal Gagal (' + (failCount + 1) + 'x)*\n\n' +
                'File: ' + fileKey + '\n' +
                'Error: ' + errorMsg + '\n\n' +
                'Stack:\n' + stack.slice(0, 600) + '\n\n' +
                '⚠️ Perlu perbaikan manual!'
            )
        }
    }
}

export { loadLog as loadHealLog }

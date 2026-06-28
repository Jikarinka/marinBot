/**
 * Marin Reminder System
 * - Pengingat sekali-jalan (bukan recurring) dengan delay relatif ("20 menit lagi")
 * - Persisten ke file — kalau bot restart, pengingat yang belum lewat tetap dijadwalkan ulang
 */

import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const REMINDER_FILE = path.join(ROOT, 'mcp', 'reminders.json')

const activeTimers = new Map() // id -> timeoutHandle

function loadReminders() {
    try { return JSON.parse(fs.readFileSync(REMINDER_FILE, 'utf-8')) }
    catch { return [] }
}

function saveReminders(list) {
    try {
        fs.mkdirSync(path.dirname(REMINDER_FILE), { recursive: true })
        fs.writeFileSync(REMINDER_FILE, JSON.stringify(list, null, 2))
    } catch (_) {}
}

function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/**
 * Parse ekspresi waktu relatif berbahasa Indonesia/umum jadi milidetik.
 * Mendukung kombinasi: "20 menit", "1 jam 30 menit", "2 hari", "1j 30m", dll.
 * Return null kalau tidak bisa di-parse.
 */
export function parseRelativeTime(text) {
    if (!text) return null
    const t = text.toLowerCase().trim()

    let totalMs = 0
    let matched = false

    const patterns = [
        { re: /(\d+)\s*(?:hari|days?|d)\b/g, ms: 24 * 60 * 60 * 1000 },
        { re: /(\d+)\s*(?:jam|hours?|h|j)\b/g, ms: 60 * 60 * 1000 },
        { re: /(\d+)\s*(?:menit|minutes?|min|m)\b/g, ms: 60 * 1000 },
        { re: /(\d+)\s*(?:detik|seconds?|sec|s)\b/g, ms: 1000 },
    ]

    for (const { re, ms } of patterns) {
        let match
        re.lastIndex = 0
        while ((match = re.exec(t)) !== null) {
            totalMs += parseInt(match[1], 10) * ms
            matched = true
        }
    }

    if (!matched || totalMs <= 0) return null
    return totalMs
}

/**
 * Buat pengingat baru. delayMs: berapa lama dari sekarang.
 * onFire: callback yang dipanggil persis saat waktunya (kirim pesan WA, dll).
 */
export function createReminder({ jid, message, delayMs, sock }) {
    const id = genId()
    const fireAt = Date.now() + delayMs

    const reminder = { id, jid, message, fireAt, createdAt: Date.now() }
    const list = loadReminders()
    list.push(reminder)
    saveReminders(list)

    scheduleTimer(reminder, sock)
    return reminder
}

function scheduleTimer(reminder, sock) {
    const delay = reminder.fireAt - Date.now()
    if (delay <= 0) {
        fireReminder(reminder, sock)
        return
    }

    // setTimeout max ~24.8 hari (2^31-1 ms) — untuk pengingat sangat lama, ini cukup untuk skala chat biasa
    const safeDelay = Math.min(delay, 2147483647)
    const handle = setTimeout(() => fireReminder(reminder, sock), safeDelay)
    activeTimers.set(reminder.id, handle)
}

async function fireReminder(reminder, sock) {
    activeTimers.delete(reminder.id)

    // Hapus dari list persisten begitu waktunya tiba (sukses atau gagal kirim, tetap dihapus
    // supaya tidak nyangkut di list dan dicoba kirim ulang berkali-kali tiap restart)
    removeReminder(reminder.id)

    try {
        if (sock) {
            await sock.sendMessage(reminder.jid, {
                text: `⏰ *Pengingat!*\n\n${reminder.message}`
            })
        }
    } catch (e) {
        console.error('[Reminder] Gagal kirim pengingat:', e.message)
    }
}

export function removeReminder(id) {
    const list = loadReminders().filter(r => r.id !== id)
    saveReminders(list)

    const handle = activeTimers.get(id)
    if (handle) {
        clearTimeout(handle)
        activeTimers.delete(id)
    }
}

export function listReminders(jid = null) {
    const list = loadReminders()
    return jid ? list.filter(r => r.jid === jid) : list
}

/**
 * Dipanggil sekali saat bot startup — jadwalkan ulang semua pengingat yang
 * tersimpan dan belum lewat waktunya (termasuk yang sudah lewat saat bot mati,
 * langsung di-fire begitu bot nyala lagi).
 */
export function rescheduleAllReminders(sock) {
    const list = loadReminders()
    if (!list.length) return
    console.log(`[Reminder] 🔄 Menjadwalkan ulang ${list.length} pengingat tersimpan...`)
    for (const reminder of list) {
        scheduleTimer(reminder, sock)
    }
}

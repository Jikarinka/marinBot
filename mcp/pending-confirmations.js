/**
 * Marin Pending Confirmation System
 * Untuk aksi berisiko (npm install, dll) yang butuh approval owner sebelum benar-benar jalan.
 * Disimpan in-memory (cukup untuk siklus hidup proses bot) + dicatat ke audit log.
 */

import { logAction } from './audit-log.js'

const pending = new Map() // id -> { command, cwd, requestedBy, createdAt, resolve, reject, timeoutHandle }

const CONFIRM_TIMEOUT_MS = 10 * 60 * 1000 // 10 menit — auto-expire kalau tidak direspon

function genId() {
    return Math.random().toString(36).slice(2, 8)
}

/**
 * Daftarkan aksi yang butuh konfirmasi. Return sebuah Promise yang resolve/reject
 * setelah owner approve/deny (atau timeout).
 */
export function requestConfirmation({ command, cwd, requestedBy }) {
    const id = genId()
    return new Promise((resolve, reject) => {
        const timeoutHandle = setTimeout(() => {
            const entry = pending.get(id)
            if (entry) {
                pending.delete(id)
                logAction({ tool: 'npm_install_confirmation', args: { command }, senderId: requestedBy, success: false, error: 'Timeout — tidak direspon owner dalam 10 menit' })
                reject(new Error(`⏱️ Permintaan instalasi "${command}" expired (10 menit tanpa respon owner).`))
            }
        }, CONFIRM_TIMEOUT_MS)

        pending.set(id, { command, cwd, requestedBy, createdAt: Date.now(), resolve, reject, timeoutHandle })
    }).then(result => ({ id, ...result }))
        .catch(err => { throw Object.assign(err, { confirmationId: id }) })
}

export function getPendingById(id) {
    return pending.get(id) || null
}

export function listPending() {
    return [...pending.entries()].map(([id, p]) => ({
        id, command: p.command, cwd: p.cwd, requestedBy: p.requestedBy, createdAt: p.createdAt
    }))
}

export function approve(id, approvedBy) {
    const entry = pending.get(id)
    if (!entry) return { ok: false, message: `❌ Tidak ada permintaan dengan ID *${id}* (mungkin sudah expired/diproses).` }

    clearTimeout(entry.timeoutHandle)
    pending.delete(id)
    logAction({ tool: 'npm_install_confirmation', args: { command: entry.command }, senderId: approvedBy, success: true, resultPreview: 'approved' })
    entry.resolve({ approved: true, command: entry.command, cwd: entry.cwd })
    return { ok: true, command: entry.command }
}

export function deny(id, deniedBy) {
    const entry = pending.get(id)
    if (!entry) return { ok: false, message: `❌ Tidak ada permintaan dengan ID *${id}* (mungkin sudah expired/diproses).` }

    clearTimeout(entry.timeoutHandle)
    pending.delete(id)
    logAction({ tool: 'npm_install_confirmation', args: { command: entry.command }, senderId: deniedBy, success: false, error: 'Ditolak owner' })
    entry.reject(new Error(`🚫 Instalasi "${entry.command}" ditolak owner.`))
    return { ok: true, command: entry.command }
}

/**
 * Marin Audit Log & Backup System
 * - Setiap aksi tool AI dicatat ke file log (JSONL, append-only)
 * - File yang akan ditimpa/dihapus di-backup dulu sebelum berubah
 */

import fs from 'fs'
import path from 'path'

const ROOT        = process.cwd()
const LOG_DIR      = path.join(ROOT, 'mcp', 'logs')
const LOG_FILE     = path.join(LOG_DIR, 'audit.jsonl')
const BACKUP_DIR   = path.join(ROOT, 'mcp', 'backups')
const MAX_LOG_SIZE = 10 * 1024 * 1024 // 10MB — rotate setelah ini

function ensureDirs() {
    try { fs.mkdirSync(LOG_DIR, { recursive: true }) } catch (_) {}
    try { fs.mkdirSync(BACKUP_DIR, { recursive: true }) } catch (_) {}
}

function rotateIfNeeded() {
    try {
        if (!fs.existsSync(LOG_FILE)) return
        const size = fs.statSync(LOG_FILE).size
        if (size < MAX_LOG_SIZE) return
        const stamp = new Date().toISOString().replace(/[:.]/g, '-')
        fs.renameSync(LOG_FILE, path.join(LOG_DIR, `audit-${stamp}.jsonl`))
    } catch (_) {}
}

/**
 * Catat satu aksi tool ke audit log.
 * Tidak pernah throw — kegagalan logging tidak boleh menghentikan eksekusi tool.
 */
export function logAction({ tool, args = {}, senderId, isOwner, isSubBot, success, durationMs, resultPreview, error }) {
    try {
        ensureDirs()
        rotateIfNeeded()

        // Jangan log isi penuh untuk tool berisiko — cukup ringkasan, agar log tidak
        // sendiri jadi tempat penyimpanan rahasia (.env, dsb) yang tidak terjaga.
        const safeArgs = { ...args }
        delete safeArgs._sock
        delete safeArgs._m
        delete safeArgs._msgData
        for (const k of Object.keys(safeArgs)) {
            if (typeof safeArgs[k] === 'string' && safeArgs[k].length > 500) {
                safeArgs[k] = safeArgs[k].slice(0, 500) + '...(terpotong)'
            }
        }

        const entry = {
            at: new Date().toISOString(),
            tool,
            sender: (senderId || '').split('@')[0].split(':')[0],
            isOwner: !!isOwner,
            isSubBot: !!isSubBot,
            args: safeArgs,
            success: !!success,
            durationMs,
            resultPreview: (resultPreview || '').slice(0, 300),
            error: error ? String(error).slice(0, 500) : undefined
        }

        fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8')
    } catch (_) {
        // Logging tidak boleh pernah crash tool execution
    }
}

/**
 * Backup file sebelum ditimpa atau dihapus.
 * Disimpan di mcp/backups/<relative-path>/<timestamp>.bak dengan struktur folder mengikuti aslinya.
 * Return path backup, atau null jika file sumber tidak ada / gagal backup.
 */
export function backupFile(absPath) {
    try {
        if (!fs.existsSync(absPath) || fs.statSync(absPath).isDirectory()) return null

        ensureDirs()
        const rel = path.relative(ROOT, absPath)
        const safeRel = rel.replace(/\.\./g, '__').split(path.sep).join('__')
        const stamp = new Date().toISOString().replace(/[:.]/g, '-')
        const dest = path.join(BACKUP_DIR, `${safeRel}.${stamp}.bak`)

        fs.copyFileSync(absPath, dest)
        return path.relative(ROOT, dest)
    } catch (_) {
        return null
    }
}

/**
 * Ambil N entri log terakhir, opsional filter by tool name.
 */
export function getRecentLogs(limit = 20, toolFilter = null) {
    try {
        if (!fs.existsSync(LOG_FILE)) return []
        const lines = fs.readFileSync(LOG_FILE, 'utf-8').trim().split('\n').filter(Boolean)
        let entries = lines.map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
        if (toolFilter) entries = entries.filter(e => e.tool === toolFilter)
        return entries.slice(-limit)
    } catch (_) {
        return []
    }
}

/**
 * Daftar backup yang tersedia, terbaru dulu.
 */
export function listBackups(limit = 30) {
    try {
        ensureDirs()
        const files = fs.readdirSync(BACKUP_DIR)
            .map(f => {
                const full = path.join(BACKUP_DIR, f)
                const s = fs.statSync(full)
                return { name: f, size: s.size, mtime: s.mtimeMs }
            })
            .sort((a, b) => b.mtime - a.mtime)
        return files.slice(0, limit)
    } catch (_) {
        return []
    }
}

/**
 * Restore file dari backup ke path aslinya.
 * backupName: nama file di mcp/backups/ (dari listBackups)
 * targetPath: path tujuan relatif terhadap ROOT (opsional — default: dicoba derive dari nama backup)
 */
export function restoreBackup(backupName, targetPath = null) {
    const src = path.join(BACKUP_DIR, backupName)
    if (!fs.existsSync(src)) throw new Error(`Backup tidak ditemukan: ${backupName}`)

    let dest
    if (targetPath) {
        dest = path.resolve(ROOT, targetPath)
    } else {
        // Derive dari nama: <rel-path-with-__>.<timestamp>.bak
        const withoutBak = backupName.replace(/\.[^.]+\.bak$/, '')
        dest = path.resolve(ROOT, withoutBak.split('__').join(path.sep))
    }

    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
    return path.relative(ROOT, dest)
}

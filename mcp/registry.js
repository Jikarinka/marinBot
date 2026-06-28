/**
 * MCP Registry — Marin Bot
 * Tool terdaftar di sini, dipanggil Gemini secara autonomous
 */

import path from 'path'
import { logAction, backupFile } from './audit-log.js'

const ROOT = process.cwd()
const _tools = new Map()
const _executors = new Map()

// Tool yang mengubah/menghapus file → backup otomatis sebelum eksekusi.
// Map: tool name → fungsi yang mengembalikan array path absolut yang akan terdampak.
const BACKUP_BEFORE = {
    write_file:  (args) => args.file_path ? [path.resolve(ROOT, args.file_path)] : [],
    delete_file: (args) => args.file_path ? [path.resolve(ROOT, args.file_path)] : [],
    move_file:   (args) => args.from ? [path.resolve(ROOT, args.from)] : [],
}

export function registerTool({ name, description, parameters = {}, execute, ownerOnly = false }) {
    if (!name || !description || !execute) throw new Error(`[MCP] Tool invalid: ${name}`)
    _tools.set(name, { name, description, parameters, ownerOnly })
    _executors.set(name, execute)
}

export async function callTool(name, params = {}, context = {}) {
    const exec = _executors.get(name)
    if (!exec) throw new Error(`[MCP] Tool "${name}" tidak terdaftar`)

    const meta = _tools.get(name)
    const senderId = params._senderId || context._senderId || ''
    const isOwner  = params._isOwner  || context._isOwner  || false
    const isSubBot = params._isSubBot || context._isSubBot || params._msgData?._isSubBot || context._msgData?._isSubBot || false

    if (meta?.ownerOnly) {
        const ownerNum  = process.env.OWNER_NUMBER?.replace(/[^0-9]/g, '') || ''
        const senderNum = senderId.split('@')[0].replace(/[^0-9]/g, '')
        if (isSubBot || (ownerNum && senderNum !== ownerNum)) {
            const err = `⛔ Tool *${name}* hanya untuk Owner.`
            logAction({ tool: name, args: params, senderId, isOwner, isSubBot, success: false, error: err })
            throw new Error(err)
        }
    }

    // ── Backup otomatis sebelum tool destruktif jalan ──────────────
    let backups = []
    const backupTargets = BACKUP_BEFORE[name]
    if (backupTargets) {
        try {
            for (const absPath of backupTargets(params)) {
                const b = backupFile(absPath)
                if (b) backups.push(b)
            }
        } catch (_) {}
    }

    // Merge params dengan context agar tool bisa akses _sock, _m, _jid, _msgData
    const fullParams = { ...params, ...context }

    const startedAt = Date.now()
    try {
        const result = await exec(fullParams, context)
        const resultPreview = result == null ? '' : typeof result === 'string' ? result : JSON.stringify(result)
        logAction({
            tool: name, args: params, senderId, isOwner, isSubBot,
            success: true, durationMs: Date.now() - startedAt,
            resultPreview: backups.length ? `[backup: ${backups.join(', ')}]\n${resultPreview}` : resultPreview
        })
        return result
    } catch (err) {
        logAction({
            tool: name, args: params, senderId, isOwner, isSubBot,
            success: false, durationMs: Date.now() - startedAt, error: err.message || String(err)
        })
        throw err
    }
}

export function getToolsForGemini() {
    return [..._tools.values()].map(t => {
        const props = {}
        const required = []
        for (const [k, v] of Object.entries(t.parameters)) {
            props[k] = { type: (v.type || 'string').toUpperCase(), description: v.description || '' }
            if (v.required) required.push(k)
        }
        return { name: t.name, description: t.description, parameters: { type: 'OBJECT', properties: props, required } }
    })
}

export function listTools() { return [..._tools.keys()] }
export function countTools() { return _tools.size }

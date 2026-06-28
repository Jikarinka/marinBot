/**
 * MCP System Tools — Marin Bot
 * AKSES PENUH: semua file, shell command, restart, env, dll
 * Owner only untuk keamanan
 */

import { registerTool } from '../../mcp/registry.js'
import '../../mcp/memory-manager.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Root server — tidak ada batasan path
const SERVER_ROOT = process.cwd()

function fmt(b) {
    if (b < 1024) return `${b}B`
    if (b < 1048576) return `${(b/1024).toFixed(1)}KB`
    return `${(b/1048576).toFixed(1)}MB`
}

// Kirim pesan ke WA tanpa double send
// Hanya kirim jika _directSend = true (dipanggil langsung dari tool)
// Jika dipanggil dari MCP loop, return string saja → agent yang kirim
async function sendDirect(sock, jid, m, text) {
    if (sock && jid && text) {
        await sock.sendMessage(jid, { text }, { quoted: m })
    }
}

// ── LIST FILES — akses penuh semua folder ─────────────────────────
registerTool({
    name: 'list_files',
    description: 'Tampilkan daftar file & folder di server. Bisa akses folder mana saja termasuk root bot, config, .env, dll. Owner only.',
    parameters: {
        folder: { type: 'string', description: 'Path folder yang ingin dilihat. Contoh: "." untuk root, "plugins", "mcp", "/home/container". Default: "."', required: false }
    },
    ownerOnly: true,
    execute: async ({ folder = '.', _sock, _m, _jid }) => {
        const target = path.resolve(SERVER_ROOT, folder)

        if (!fs.existsSync(target)) return `❌ Folder tidak ditemukan: ${folder}`
        if (!fs.statSync(target).isDirectory()) return `❌ ${folder} bukan folder`

        const items = fs.readdirSync(target)
            .filter(i => !['node_modules', '.git'].includes(i))
            .map(i => {
                try {
                    const s = fs.statSync(path.join(target, i))
                    return `${s.isDirectory() ? '📁' : '📄'} ${i}${s.isFile() ? ` (${fmt(s.size)})` : ''}`
                } catch { return `❓ ${i}` }
            })

        const rel = path.relative(SERVER_ROOT, target) || '.'
        const result = `📂 *${rel}*\n\n${items.join('\n') || '_(kosong)_'}`
        return result
    }
})

// ── READ FILE — baca semua file tanpa terkecuali ──────────────────
registerTool({
    name: 'read_file',
    description: 'Baca isi file di server. Bisa baca file apapun: .env, config.js, index.js, package.json, plugin dll. Owner only.',
    parameters: {
        file_path: { type: 'string', description: 'Path file yang dibaca. Contoh: ".env", "config.js", "mcp/agent.js", "plugins/ai/ai-chat.js"', required: true }
    },
    ownerOnly: true,
    execute: async ({ file_path, _sock, _m, _jid }) => {
        const target = path.resolve(SERVER_ROOT, file_path)

        if (!fs.existsSync(target)) return `❌ File tidak ditemukan: ${file_path}`
        if (fs.statSync(target).isDirectory()) return `❌ ${file_path} adalah folder, gunakan list_files`

        const size = fs.statSync(target).size
        if (size > 200 * 1024) return `❌ File terlalu besar (${fmt(size)}) — maksimal 200KB`

        const content = fs.readFileSync(target, 'utf-8')
        const rel = path.relative(SERVER_ROOT, target)
        const truncated = content.length > 4000
        const preview = content.substring(0, 4000) + (truncated ? '\n\n...(terpotong, gunakan shell_exec untuk baca lengkap)' : '')

        return `📄 *${rel}* (${fmt(size)})\n\n\`\`\`\n${preview}\n\`\`\``
    }
})

// ── WRITE FILE — tulis/buat file apapun ──────────────────────────
registerTool({
    name: 'write_file',
    description: 'Buat atau timpa file di server dengan konten baru. Bisa buat plugin baru, edit config, edit .env, dll. Owner only.',
    parameters: {
        file_path: { type: 'string', description: 'Path file yang akan ditulis/dibuat', required: true },
        content: { type: 'string', description: 'Konten yang akan ditulis ke file', required: true }
    },
    ownerOnly: true,
    execute: async ({ file_path, content, _sock, _m, _jid }) => {
        const target = path.resolve(SERVER_ROOT, file_path)
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.writeFileSync(target, content, 'utf-8')
        const rel = path.relative(SERVER_ROOT, target)
        return `✅ File *${rel}* berhasil ditulis (${fmt(Buffer.byteLength(content))})`
    }
})

// ── DELETE FILE — hapus file apapun ──────────────────────────────
registerTool({
    name: 'delete_file',
    description: 'Hapus file dari server. Owner only.',
    parameters: {
        file_path: { type: 'string', description: 'Path file yang akan dihapus', required: true }
    },
    ownerOnly: true,
    execute: async ({ file_path }) => {
        const target = path.resolve(SERVER_ROOT, file_path)
        if (!fs.existsSync(target)) return `❌ File tidak ditemukan: ${file_path}`
        if (fs.statSync(target).isDirectory()) return `❌ ${file_path} adalah folder, gunakan shell_exec dengan rm -rf`
        fs.unlinkSync(target)
        const rel = path.relative(SERVER_ROOT, target)
        return `🗑️ File *${rel}* berhasil dihapus`
    }
})

// ── MOVE/RENAME FILE ──────────────────────────────────────────────
registerTool({
    name: 'move_file',
    description: 'Pindahkan atau rename file/folder di server. Owner only.',
    parameters: {
        from: { type: 'string', description: 'Path sumber (file/folder yang dipindah)', required: true },
        to: { type: 'string', description: 'Path tujuan', required: true }
    },
    ownerOnly: true,
    execute: async ({ from, to }) => {
        const src = path.resolve(SERVER_ROOT, from)
        const dst = path.resolve(SERVER_ROOT, to)
        if (!fs.existsSync(src)) return `❌ Tidak ditemukan: ${from}`
        fs.mkdirSync(path.dirname(dst), { recursive: true })
        fs.renameSync(src, dst)
        return `✅ Berhasil: ${path.relative(SERVER_ROOT, src)} → ${path.relative(SERVER_ROOT, dst)}`
    }
})

// ── SEARCH FILES ──────────────────────────────────────────────────
registerTool({
    name: 'search_files',
    description: 'Cari file berdasarkan nama atau ekstensi di server. Owner only.',
    parameters: {
        query: { type: 'string', description: 'Nama atau bagian nama file yang dicari. Contoh: ".env", "tiktok", "config"', required: true },
        folder: { type: 'string', description: 'Folder pencarian. Default: "."', required: false }
    },
    ownerOnly: true,
    execute: async ({ query, folder = '.' }) => {
        const target = path.resolve(SERVER_ROOT, folder)
        const results = []

        function walk(dir, depth = 0) {
            if (depth > 6) return
            try {
                for (const item of fs.readdirSync(dir)) {
                    if (['node_modules', '.git'].includes(item)) continue
                    const full = path.join(dir, item)
                    const rel = path.relative(SERVER_ROOT, full)
                    if (item.toLowerCase().includes(query.toLowerCase())) {
                        const s = fs.statSync(full)
                        results.push(`${s.isDirectory() ? '📁' : '📄'} ${rel}${s.isFile() ? ` (${fmt(s.size)})` : ''}`)
                    }
                    try { if (fs.statSync(full).isDirectory()) walk(full, depth + 1) } catch {}
                }
            } catch {}
        }

        walk(target)
        if (!results.length) return `❌ Tidak ada file cocok dengan "${query}"`
        return `🔍 *"${query}" — ${results.length} hasil:*\n\n${results.slice(0, 40).join('\n')}${results.length > 40 ? `\n...+${results.length - 40} lainnya` : ''}`
    }
})

// ── SHELL EXEC — jalankan command apapun di server ────────────────
registerTool({
    name: 'shell_exec',
    description: 'Jalankan shell command apapun di server. Bisa restart process, edit file dengan sed, cat file panjang, ls, dll. KHUSUS untuk "npm install"/"npm i" — akan menunggu konfirmasi owner dulu sebelum benar-benar jalan (tidak instan). Owner only.',
    parameters: {
        command: { type: 'string', description: 'Shell command yang akan dijalankan. Contoh: "ls -la", "cat .env", "npm install axios", "node -e \\"console.log(1+1)\\""', required: true },
        cwd: { type: 'string', description: 'Working directory. Default: root bot', required: false }
    },
    ownerOnly: true,
    execute: async ({ command, cwd, ...ctx }) => {
        const workDir = cwd ? path.resolve(SERVER_ROOT, cwd) : SERVER_ROOT

        // ── npm install butuh approval owner dulu — tidak boleh instan ──
        const isNpmInstall = /\bnpm\s+(install|i|add)\b/.test(command)
        if (isNpmInstall) {
            const requestedBy = ctx._senderId || ctx._msgData?.senderJid || ''
            const sock = ctx._sock
            const ownerJid = (process.env.OWNER_NUMBER || '').replace(/[^0-9]/g, '') + '@s.whatsapp.net'

            try {
                const { requestConfirmation, listPending } = await import('../../mcp/pending-confirmations.js')
                const confirmPromise = requestConfirmation({ command, cwd: workDir, requestedBy })

                const justQueued = listPending().slice(-1)[0]
                const id = justQueued?.id

                if (sock && id) {
                    try {
                        await sock.sendMessage(ownerJid, {
                            text: `🤔 *Marin mau install package baru:*\n\n` +
                                  `\`\`\`${command}\`\`\`\n\n` +
                                  `Izinkan? Balas:\n` +
                                  `✅ *.approve ${id}*\n` +
                                  `🚫 *.deny ${id}*\n\n` +
                                  `_(otomatis expired dalam 10 menit kalau tidak direspon)_`
                        })
                    } catch (_) {}
                }

                await confirmPromise

            } catch (e) {
                return `🚫 ${e.message}`
            }
        }

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: workDir,
                timeout: 30000, // 30 detik timeout
                env: { ...process.env }
            })
            const out = (stdout || '').trim()
            const err = (stderr || '').trim()
            let result = ''
            if (out) result += `📤 Output:\n${out.substring(0, 3000)}`
            if (err) result += `${out ? '\n\n' : ''}⚠️ Stderr:\n${err.substring(0, 1000)}`
            return result || '✅ Command berhasil (tidak ada output)'
        } catch (e) {
            return `❌ Error: ${e.message.substring(0, 500)}`
        }
    }
})

// ── SYSTEM INFO ───────────────────────────────────────────────────
registerTool({
    name: 'system_info',
    description: 'Cek info server: CPU, RAM, disk, uptime, OS, Node version. Owner only.',
    parameters: {},
    ownerOnly: true,
    execute: async () => {
        const up = process.uptime()
        const mem = process.memoryUsage()
        return [
            `⚙️ *Marin Bot — System Info*\n`,
            `🖥️ OS: ${os.type()} ${os.release()} (${os.arch()})`,
            `💻 CPU: ${os.cpus()[0]?.model || 'Unknown'} × ${os.cpus().length} core`,
            `🧠 RAM Total: ${(os.totalmem()/1073741824).toFixed(2)} GB`,
            `🧠 RAM Free: ${(os.freemem()/1073741824).toFixed(2)} GB`,
            `📊 RAM Bot: ${(mem.rss/1048576).toFixed(1)} MB (RSS)`,
            `⏱️ Uptime Bot: ${Math.floor(up/3600)}j ${Math.floor((up%3600)/60)}m ${Math.floor(up%60)}d`,
            `📁 Node.js: ${process.version}`,
            `📂 CWD: ${SERVER_ROOT}`,
        ].join('\n')
    }
})

// ── RESTART BOT ───────────────────────────────────────────────────
registerTool({
    name: 'restart_bot',
    description: 'Restart bot Marin. Berguna setelah install package baru atau edit file penting. Owner only.',
    parameters: {},
    ownerOnly: true,
    execute: async ({ _sock, _m, _jid }) => {
        if (_sock && _jid) {
            await _sock.sendMessage(_jid, { text: '🔄 Marin restart sebentar ya~' }, { quoted: _m })
        }
        setTimeout(() => process.exit(0), 2000)
        return 'Bot sedang restart...'
    }
})

// ── READ ENV ──────────────────────────────────────────────────────
registerTool({
    name: 'read_env',
    description: 'Baca semua environment variable bot dari file .env. Owner only.',
    parameters: {},
    ownerOnly: true,
    execute: async () => {
        const envFile = path.join(SERVER_ROOT, '.env')
        if (!fs.existsSync(envFile)) return `❌ File .env tidak ditemukan`
        const content = fs.readFileSync(envFile, 'utf-8')
        return `📋 *File .env:*\n\n\`\`\`\n${content}\n\`\`\``
    }
})

// ── UPDATE ENV ────────────────────────────────────────────────────
registerTool({
    name: 'update_env',
    description: 'Update atau tambah nilai di file .env. Contoh: set GEMINI_API_KEY=AIzaSy... Owner only.',
    parameters: {
        key: { type: 'string', description: 'Nama variable. Contoh: GEMINI_API_KEY', required: true },
        value: { type: 'string', description: 'Nilai baru', required: true }
    },
    ownerOnly: true,
    execute: async ({ key, value }) => {
        const envFile = path.join(SERVER_ROOT, '.env')
        let content = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf-8') : ''
        const regex = new RegExp(`^${key}=.*$`, 'm')
        if (regex.test(content)) {
            content = content.replace(regex, `${key}="${value}"`)
        } else {
            content += `\n${key}="${value}"`
        }
        fs.writeFileSync(envFile, content.trim() + '\n')
        process.env[key] = value // update runtime juga
        return `✅ .env updated: ${key}="${value}"`
    }
})

// ── INSTALL PACKAGE ───────────────────────────────────────────────
registerTool({
    name: 'install_package',
    description: 'Install npm package baru di bot. Owner only.',
    parameters: {
        package_name: { type: 'string', description: 'Nama package npm yang mau diinstall. Contoh: "axios", "moment", "@google/genai"', required: true }
    },
    ownerOnly: true,
    execute: async ({ package_name, _sock, _m, _jid }) => {
        if (_sock && _jid) {
            await _sock.sendMessage(_jid, { text: `📦 Menginstall ${package_name}... tunggu sebentar` }, { quoted: _m })
        }
        try {
            const { stdout, stderr } = await execAsync(
                `npm install ${package_name} --no-audit --no-fund`,
                { cwd: SERVER_ROOT, timeout: 120000 }
            )
            return `✅ Package *${package_name}* berhasil diinstall!\n\n${stdout.slice(-500)}`
        } catch (e) {
            return `❌ Gagal install ${package_name}: ${e.message.slice(0, 300)}`
        }
    }
})

// ── CREATE FOLDER ─────────────────────────────────────────────────
registerTool({
    name: 'create_folder',
    description: 'Buat folder baru di server. Owner only.',
    parameters: {
        folder_path: { type: 'string', description: 'Path folder yang akan dibuat', required: true }
    },
    ownerOnly: true,
    execute: async ({ folder_path }) => {
        const target = path.resolve(SERVER_ROOT, folder_path)
        fs.mkdirSync(target, { recursive: true })
        return `✅ Folder *${path.relative(SERVER_ROOT, target)}* berhasil dibuat`
    }
})


// ── RUN PLUGIN — AI bisa trigger command plugin lain ─────────────
registerTool({
    name: 'run_plugin',
    description: 'Panggil/jalankan command plugin bot lain secara langsung. Gunakan saat user minta sesuatu yang sudah ada commandnya. Contoh: buat stiker → run_plugin(command="sticker"), ping → run_plugin(command="ping"), menu → run_plugin(command="menu"), info grup → run_plugin(command="groupinfo"). Marin bisa menjalankan plugin apapun yang ada di bot.',
    parameters: {
        command: { type: 'string', description: 'Nama command plugin yang akan dijalankan (tanpa prefix). Contoh: "sticker", "ping", "menu", "tiktok", "ytmp3", "register"', required: true },
        args: { type: 'string', description: 'Argumen tambahan untuk command (opsional). Contoh: untuk ytmp3 → URL YouTube', required: false }
    },
    execute: async ({ command, args = '', _sock, _m, _jid, _msgData, _senderId }) => {
        // Import plugins dari hot-reload
        const { plugins } = await import('../../libs/hot-reload.js')

        // Cari plugin yang punya command ini
        const plugin = plugins.find(p =>
            Array.isArray(p.command) && p.command.includes(command.toLowerCase())
        )

        if (!plugin) {
            const allCommands = plugins
                .filter(p => p.command)
                .flatMap(p => p.command)
                .slice(0, 50)
                .join(', ')
            return `❌ Command "${command}" tidak ditemukan.\n\nCommand tersedia: ${allCommands}`
        }

        if (!_sock || !_msgData) {
            return `❌ Tidak bisa menjalankan plugin tanpa koneksi WA`
        }

        // Build msgData untuk plugin yang dipanggil
        const fakeArgs = args ? args.trim().split(/\s+/) : []
        const fakeMsgData = {
            ..._msgData,
            commandName: command.toLowerCase(),
            args: fakeArgs,
            text: args || '',
            // Pertahankan semua context asli
            remoteJid: _jid || _msgData.remoteJid,
            senderJid: _senderId || _msgData.senderJid,
        }

        // Import user & group dari database untuk validasi
        const { User, Group, Setting } = await import('../../databases/connector.js')
        const senderNum = (fakeMsgData.senderJid || '').split('@')[0]
        const ownerNum = (process.env.OWNER_NUMBER || '').replace(/[^0-9]/g, '')

        const [userRecord] = await User.findOrCreate({
            where: { jid: fakeMsgData.senderJid },
            defaults: { name: fakeMsgData.pushName || 'User', limit: 10 }
        })

        const userCtx = {
            ...userRecord,
            isOwner: senderNum === ownerNum,
            is_premium: userRecord.is_premium || false,
            is_registered: userRecord.is_registered || false,
            limit: userRecord.limit ?? 10,
            save: async () => await userRecord.save()
        }

        const groupCtx = fakeMsgData.isGroup ? await Group.findOne({
            where: { jid: fakeMsgData.remoteJid }
        }) : null

        // Jalankan plugin
        await plugin.execute(_sock, _m, fakeMsgData, userCtx, groupCtx, plugins)
        return `Plugin "${command}" berhasil dijalankan${args ? ` dengan args: "${args}"` : ''}`
    }
})

// ── LIST PLUGINS — tampilkan semua plugin yang tersedia ───────────
registerTool({
    name: 'list_plugins',
    description: 'Tampilkan semua plugin dan command yang tersedia di bot. Gunakan untuk tahu plugin apa saja yang bisa dipanggil via run_plugin.',
    parameters: {
        category: { type: 'string', description: 'Filter berdasarkan kategori (opsional). Contoh: "downloader", "ai", "group", "sticker"', required: false }
    },
    execute: async ({ category }) => {
        const { plugins } = await import('../../libs/hot-reload.js')

        const filtered = category
            ? plugins.filter(p => p.category?.toLowerCase() === category.toLowerCase())
            : plugins

        const list = filtered
            .filter(p => p.command && p.command.length > 0)
            .map(p => {
                const cmds = Array.isArray(p.command) ? p.command.join(', ') : p.command
                const cat = p.category ? ` [${p.category}]` : ''
                const desc = p.description ? ` — ${p.description.split('\n')[0]}` : ''
                return `• \`${cmds}\`${cat}${desc}`
            })
            .join('\n')

        const title = category ? `Plugin kategori "${category}"` : 'Semua Plugin'
        return `🔌 *${title} (${filtered.length})*\n\n${list || '_(tidak ada)_'}`
    }
})

// ── Plugin command .sys ───────────────────────────────────────────
export default {
    command: ['sys', 'system'],
    category: 'owner',
    description: 'System & filesystem tools (Owner Only)\nAkses penuh ke semua file server',
    isOwner: true,

    async execute(sock, m, msgData) {
        return msgData.reply(
            `⚙️ *Marin System — Akses Penuh (Owner Only)*\n\n` +
            `Tanya Marin via *.ai*:\n\n` +
            `📁 *File & Folder:*\n` +
            `• _.ai lihat isi folder ._\n` +
            `• _.ai baca file .env_\n` +
            `• _.ai baca file config.js_\n` +
            `• _.ai buat file plugins/test.js isi: console.log('test')_\n` +
            `• _.ai hapus file plugins/test.js_\n` +
            `• _.ai cari file yang namanya tiktok_\n\n` +
            `⚡ *Shell & System:*\n` +
            `• _.ai jalankan ls -la_\n` +
            `• _.ai install package axios_\n` +
            `• _.ai info server_\n` +
            `• _.ai restart bot_\n` +
            `• _.ai baca env_\n` +
            `• _.ai update GEMINI_API_KEY=AIzaSy..._\n\n` +
            `_Tidak ada yang tidak bisa diakses oleh Marin~_`
        )
    }
}

// ── ANALYZE IMAGE (explicit tool) ─────────────────────────────────
registerTool({
    name: 'analyze_image',
    description: 'Minta Marin fokus menganalisa gambar yang sedang dikirim/di-reply dengan detail tertentu. Gunakan jika user minta hal spesifik dari gambar (misal: "ada berapa orang di foto ini", "ini barang apa", "baca teks di gambar ini").',
    parameters: {
        focus: { type: 'string', description: 'Apa yang ingin difokuskan dari analisa gambar. Contoh: "hitung jumlah orang", "baca teks/tulisan", "identifikasi objek", "deskripsikan suasana"', required: true }
    },
    execute: async ({ focus }) => {
        // Tool ini hanya sebagai signal — gambar sudah otomatis terkirim ke Gemini via inlineData
        // di agent.js, jadi cukup return instruksi fokus analisanya
        return `Fokus analisa: ${focus}. Gambar sudah tersedia dalam konteks — silakan analisa langsung dan jawab user.`
    }
})

// ── TRANSCRIBE AUDIO (explicit tool) ──────────────────────────────
registerTool({
    name: 'transcribe_audio',
    description: 'Minta Marin fokus mentranskrip atau memahami voice note/audio yang dikirim/di-reply dengan kebutuhan tertentu. Gunakan jika user minta hal spesifik dari audio (misal: "apa isi voice note ini", "terjemahkan audio ini ke teks").',
    parameters: {
        purpose: { type: 'string', description: 'Tujuan transkrip. Contoh: "transkrip lengkap", "ringkas isinya", "terjemahkan ke bahasa indonesia"', required: true }
    },
    execute: async ({ purpose }) => {
        return `Tujuan: ${purpose}. Audio sudah tersedia dalam konteks — silakan dengarkan dan jawab user.`
    }
})

// ── Tool: read_plugin_guide ───────────────────────────────────────
// AI memanggil ini sebelum buat/edit plugin
registerTool({
    name: 'read_plugin_guide',
    description: 'Baca panduan lengkap cara membuat plugin Marin yang benar. WAJIB dipanggil sebelum membuat atau mengedit file plugin JS manapun. Berisi format ESM, cara export, cara import, contoh kode lengkap, dan aturan yang tidak boleh dilanggar.',
    parameters: {},
    execute: async () => {
        const guidePath = path.join(process.cwd(), 'PLUGIN_GUIDE.md')
        if (!fs.existsSync(guidePath)) return '❌ PLUGIN_GUIDE.md tidak ditemukan'
        return fs.readFileSync(guidePath, 'utf-8')
    }
})

// ── FORWARD MESSAGE / SEND MEDIA ─────────────────────────────────
// Tool untuk kirim ulang gambar, video, audio, atau dokumen
// yang sedang di-reply atau di-quote oleh user
registerTool({
    name: 'forward_message',
    description: 'Kirim ulang / forward media (gambar, video, audio, dokumen, stiker) yang sedang di-reply/di-quote oleh user, atau kirim media dari URL. Gunakan saat user minta "kirim ulang", "forward", "share gambar ini", "kirim ke sini", dll.',
    parameters: {
        type:    { type: 'string', description: 'Jenis media: "quoted" (kirim ulang quoted message), "url" (dari URL)', required: true },
        url:     { type: 'string', description: 'URL media jika type=url', required: false },
        caption: { type: 'string', description: 'Caption/keterangan yang disertakan', required: false },
    },
    execute: async ({ type, url, caption = '' }, context) => {
        const { _sock, _m, _jid, _msgData } = context || {}
        if (!_sock || !_jid) return '❌ Tidak ada koneksi sock'

        try {
            // ── Kirim ulang quoted message ────────────────────────
            if (type === 'quoted') {
                if (!_msgData?.isQuoted) return '❌ Tidak ada pesan yang di-reply/quote'

                const quotedMsg  = _msgData.quotedMsg
                const quotedType = _msgData.quotedType

                if (!quotedMsg || !quotedType) return '❌ Quoted message tidak valid'

                // Import baileys untuk download
                const baileys = await import('baileys')
                const dl      = baileys.downloadContentFromMessage

                if (quotedType === 'imageMessage') {
                    const stream = await dl(quotedMsg.imageMessage, 'image')
                    let buf = Buffer.from([])
                    for await (const chunk of stream) buf = Buffer.concat([buf, chunk])
                    await _sock.sendMessage(_jid, { image: buf, caption }, { quoted: _m })
                    return '✅ Gambar berhasil dikirim ulang!'

                } else if (quotedType === 'videoMessage') {
                    const stream = await dl(quotedMsg.videoMessage, 'video')
                    let buf = Buffer.from([])
                    for await (const chunk of stream) buf = Buffer.concat([buf, chunk])
                    await _sock.sendMessage(_jid, { video: buf, caption, mimetype: 'video/mp4' }, { quoted: _m })
                    return '✅ Video berhasil dikirim ulang!'

                } else if (quotedType === 'audioMessage') {
                    const stream = await dl(quotedMsg.audioMessage, 'audio')
                    let buf = Buffer.from([])
                    for await (const chunk of stream) buf = Buffer.concat([buf, chunk])
                    await _sock.sendMessage(_jid, {
                        audio: buf,
                        mimetype: quotedMsg.audioMessage?.mimetype || 'audio/mpeg',
                        ptt: quotedMsg.audioMessage?.ptt || false
                    }, { quoted: _m })
                    return '✅ Audio berhasil dikirim ulang!'

                } else if (quotedType === 'stickerMessage') {
                    const stream = await dl(quotedMsg.stickerMessage, 'sticker')
                    let buf = Buffer.from([])
                    for await (const chunk of stream) buf = Buffer.concat([buf, chunk])
                    await _sock.sendMessage(_jid, { sticker: buf }, { quoted: _m })
                    return '✅ Stiker berhasil dikirim ulang!'

                } else if (quotedType === 'documentMessage') {
                    const stream = await dl(quotedMsg.documentMessage, 'document')
                    let buf = Buffer.from([])
                    for await (const chunk of stream) buf = Buffer.concat([buf, chunk])
                    await _sock.sendMessage(_jid, {
                        document: buf,
                        mimetype: quotedMsg.documentMessage?.mimetype || 'application/octet-stream',
                        fileName: quotedMsg.documentMessage?.fileName || 'file'
                    }, { quoted: _m })
                    return '✅ Dokumen berhasil dikirim ulang!'

                } else {
                    return '❌ Tipe media tidak didukung: ' + quotedType
                }
            }

            // ── Kirim dari URL ────────────────────────────────────
            if (type === 'url') {
                if (!url) return '❌ URL tidak boleh kosong'
                const axios = (await import('axios')).default
                const ext   = url.split('?')[0].split('.').pop().toLowerCase()

                if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
                    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 })
                    await _sock.sendMessage(_jid, { image: Buffer.from(res.data), caption }, { quoted: _m })
                    return '✅ Gambar dari URL berhasil dikirim!'

                } else if (['mp4', 'mov', 'avi'].includes(ext)) {
                    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 })
                    await _sock.sendMessage(_jid, { video: Buffer.from(res.data), caption, mimetype: 'video/mp4' }, { quoted: _m })
                    return '✅ Video dari URL berhasil dikirim!'

                } else if (['mp3', 'ogg', 'm4a', 'aac'].includes(ext)) {
                    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 })
                    await _sock.sendMessage(_jid, { audio: Buffer.from(res.data), mimetype: 'audio/mpeg' }, { quoted: _m })
                    return '✅ Audio dari URL berhasil dikirim!'

                } else {
                    // Coba kirim sebagai gambar dulu (URL tanpa ekstensi jelas)
                    await _sock.sendMessage(_jid, { image: { url }, caption }, { quoted: _m })
                    return '✅ Media dari URL dikirim!'
                }
            }

            return '❌ Type tidak valid. Gunakan "quoted" atau "url"'

        } catch (err) {
            console.error('[forward_message] Error:', err.message)
            return '❌ Gagal kirim media: ' + err.message
        }
    }
})

// ═══════════════════════════════════════════════════════════════
// PERLUASAN TOOLS — process, git, audit log & backup management
// ═══════════════════════════════════════════════════════════════

// ── PROCESS INFO — lihat proses Node yang sedang berjalan ────────
registerTool({
    name: 'process_info',
    description: 'Lihat proses Node.js yang sedang berjalan di server (PID, memory, command). Untuk debug proses yang menggantung/numpuk. Owner only.',
    parameters: {},
    ownerOnly: true,
    execute: async () => {
        try {
            const { stdout } = await execAsync(`ps aux | grep -i node | grep -v grep`)
            return `📋 *Proses Node.js aktif:*\n\n\`\`\`\n${stdout.trim().slice(0, 2500) || '(tidak ada)'}\n\`\`\``
        } catch (e) {
            return `❌ Gagal cek proses: ${e.message.slice(0, 300)}`
        }
    }
})

// ── KILL PROCESS — hentikan proses berdasarkan PID ────────────────
registerTool({
    name: 'kill_process',
    description: 'Hentikan proses berdasarkan PID. HATI-HATI — gunakan process_info dulu untuk pastikan PID yang benar. Tidak bisa kill PID 1 atau proses sistem inti. Owner only.',
    parameters: {
        pid: { type: 'number', description: 'Process ID yang akan dihentikan', required: true }
    },
    ownerOnly: true,
    execute: async ({ pid }) => {
        const n = Number(pid)
        if (!n || n <= 1) return `❌ PID tidak valid: ${pid}`
        if (n === process.pid) return `❌ Tidak bisa kill proses bot sendiri (PID ${n}) — gunakan restart_bot.`
        try {
            process.kill(n, 'SIGTERM')
            return `✅ Sinyal SIGTERM dikirim ke PID ${n}`
        } catch (e) {
            return `❌ Gagal kill PID ${n}: ${e.message}`
        }
    }
})

// ── GIT STATUS ──────────────────────────────────────────────────
registerTool({
    name: 'git_status',
    description: 'Cek status git repo bot: branch, perubahan yang belum di-commit, commit terakhir. Owner only.',
    parameters: {},
    ownerOnly: true,
    execute: async () => {
        try {
            const { stdout: branch } = await execAsync('git branch --show-current', { cwd: SERVER_ROOT })
            const { stdout: status } = await execAsync('git status --short', { cwd: SERVER_ROOT })
            const { stdout: log } = await execAsync('git log -5 --oneline', { cwd: SERVER_ROOT })
            return `📊 *Git Status*\n\n🌿 Branch: ${branch.trim()}\n\n📝 Perubahan:\n\`\`\`\n${status.trim() || '(bersih, tidak ada perubahan)'}\n\`\`\`\n\n📜 5 commit terakhir:\n\`\`\`\n${log.trim()}\n\`\`\``
        } catch (e) {
            return `❌ Gagal cek git status: ${e.message.slice(0, 300)}`
        }
    }
})

// ── GIT PULL ────────────────────────────────────────────────────
registerTool({
    name: 'git_pull',
    description: 'Tarik perubahan terbaru dari remote git repo (git pull). Owner only.',
    parameters: {},
    ownerOnly: true,
    execute: async () => {
        try {
            const { stdout, stderr } = await execAsync('git pull', { cwd: SERVER_ROOT, timeout: 60000 })
            return `✅ *Git Pull selesai*\n\n\`\`\`\n${(stdout + stderr).slice(0, 2000)}\n\`\`\``
        } catch (e) {
            return `❌ Gagal git pull: ${e.message.slice(0, 500)}`
        }
    }
})

// ── AUDIT LOG — lihat riwayat aksi AI/owner ───────────────────────
registerTool({
    name: 'view_audit_log',
    description: 'Lihat riwayat aksi yang sudah dilakukan AI/owner di server (tool apa, kapan, berhasil/gagal). Berguna untuk audit atau debug "tadi aku ngapain aja". Owner only.',
    parameters: {
        limit: { type: 'number', description: 'Jumlah entri terakhir yang ditampilkan. Default 15', required: false },
        tool_filter: { type: 'string', description: 'Filter berdasarkan nama tool tertentu (opsional). Contoh: "write_file", "shell_exec"', required: false }
    },
    ownerOnly: true,
    execute: async ({ limit = 15, tool_filter }) => {
        const { getRecentLogs } = await import('../../mcp/audit-log.js')
        const entries = getRecentLogs(Number(limit) || 15, tool_filter || null)
        if (!entries.length) return '📋 Belum ada riwayat aksi tercatat.'

        const lines = entries.map(e => {
            const time = new Date(e.at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
            const status = e.success ? '✅' : '❌'
            const argsStr = JSON.stringify(e.args).slice(0, 100)
            return `${status} [${time}] *${e.tool}* oleh ${e.sender}\n   args: ${argsStr}${e.error ? `\n   error: ${e.error.slice(0, 100)}` : ''}`
        })

        return `📋 *Audit Log — ${entries.length} entri terakhir:*\n\n${lines.join('\n\n')}`
    }
})

// ── LIST BACKUPS — lihat daftar backup file yang tersedia ────────
registerTool({
    name: 'list_backups',
    description: 'Lihat daftar backup file yang otomatis tersimpan sebelum write_file/delete_file/move_file menimpa file. Owner only.',
    parameters: {
        limit: { type: 'number', description: 'Jumlah backup terakhir yang ditampilkan. Default 20', required: false }
    },
    ownerOnly: true,
    execute: async ({ limit = 20 }) => {
        const { listBackups } = await import('../../mcp/audit-log.js')
        const backups = listBackups(Number(limit) || 20)
        if (!backups.length) return '📋 Belum ada backup tersimpan.'

        const lines = backups.map(b => {
            const time = new Date(b.mtime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
            return `📄 ${b.name} (${fmt(b.size)}, ${time})`
        })
        return `🗄️ *Backup tersedia — ${backups.length}:*\n\n${lines.join('\n')}\n\n_Gunakan restore_backup(backup_name) untuk pulihkan._`
    }
})

// ── RESTORE BACKUP — pulihkan file dari backup ────────────────────
registerTool({
    name: 'restore_backup',
    description: 'Pulihkan file dari backup otomatis ke lokasi aslinya (atau lokasi custom). Gunakan list_backups dulu untuk lihat nama backup yang tersedia. Owner only.',
    parameters: {
        backup_name: { type: 'string', description: 'Nama file backup, dari hasil list_backups', required: true },
        target_path: { type: 'string', description: 'Path tujuan custom (opsional) — default: lokasi asli file', required: false }
    },
    ownerOnly: true,
    execute: async ({ backup_name, target_path }) => {
        try {
            const { restoreBackup } = await import('../../mcp/audit-log.js')
            const restoredTo = restoreBackup(backup_name, target_path || null)
            return `✅ Backup *${backup_name}* berhasil dipulihkan ke *${restoredTo}*`
        } catch (e) {
            return `❌ Gagal restore: ${e.message}`
        }
    }
})

// ── REMINDER — buat pengingat sekali-jalan ────────────────────────
registerTool({
    name: 'create_reminder',
    description: 'Buat pengingat untuk user, dikirim otomatis setelah waktu tertentu berlalu. Gunakan saat user minta diingatkan sesuatu, misal "ingatkan aku 20 menit lagi mandi" atau "reminder 1 jam lagi meeting".',
    parameters: {
        message: { type: 'string', description: 'Isi pesan pengingat, contoh: "mandi", "minum obat", "meeting"', required: true },
        delay_minutes: { type: 'number', description: 'Berapa menit dari sekarang pengingat akan dikirim. Contoh: 20 untuk "20 menit lagi"', required: true }
    },
    execute: async ({ message, delay_minutes }, ctx) => {
        try {
            const { createReminder } = await import('../../libs/reminder.js')
            const sock = ctx?._sock
            const jid  = ctx?._msgData?.remoteJid || ctx?._jid

            if (!sock || !jid) return '❌ Gagal buat reminder: konteks chat tidak lengkap'

            const delayMs = Number(delay_minutes) * 60 * 1000
            if (!delayMs || delayMs <= 0) return '❌ Durasi waktu tidak valid'
            if (delayMs > 30 * 24 * 60 * 60 * 1000) return '❌ Maksimal pengingat 30 hari ke depan'

            const reminder = createReminder({ jid, message, delayMs, sock })
            return `✅ Reminder dibuat: "${message}" dalam ${delay_minutes} menit (ID: ${reminder.id})`
        } catch (e) {
            return `❌ Gagal buat reminder: ${e.message}`
        }
    }
})

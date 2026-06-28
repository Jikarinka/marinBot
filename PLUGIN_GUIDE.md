# Marin Plugin Guide — Wajib Dibaca Sebelum Buat Plugin

## ⚠️ PENTING: Marin pakai ES Modules (ESM)
- WAJIB pakai `import` / `export` — DILARANG pakai `require()` atau `module.exports`
- Semua file `.js` di project ini adalah ESM (`"type": "module"` di package.json)

---

## Format Plugin Standar

```js
// plugins/[kategori]/[nama-plugin].js

import fs from 'fs'               // ✅ ESM import
import path from 'path'           // ✅ ESM import
import axios from 'axios'         // ✅ ESM import
import config from '../../config.js'  // ✅ selalu pakai .js extension

export default {                  // ✅ WAJIB export default, bukan module.exports
    command: ['namacommand', 'alias'],  // array of string
    category: 'owner',            // owner | main | downloader | ai | general | group
    description: 'Deskripsi singkat plugin ini.',

    // Flags opsional:
    isOwner: false,       // true = hanya owner
    isRegistered: true,   // true = harus sudah .daftar
    isPremium: false,     // true = hanya premium
    isGroup: false,       // true = hanya di grup
    isPrivate: false,     // true = hanya di DM
    isAdmin: false,       // true = harus admin grup
    isBotAdmin: false,    // true = bot harus admin grup
    limit: 0,             // jumlah limit yang dikonsumsi (0 = gratis)

    async execute(sock, m, msgData, user, group, plugins) {
        // ── Destructure yang sering dipakai ──────────────────────
        const { remoteJid, senderJid, args, commandName, isGroup } = msgData

        // ── Reply ke user ────────────────────────────────────────
        await msgData.reply('Teks balasan~')

        // ── Reply dengan mention ─────────────────────────────────
        await sock.sendMessage(remoteJid, {
            text: `Halo @${senderJid.split('@')[0]}~`,
            mentions: [senderJid]
        }, { quoted: m })

        // ── React emoji ──────────────────────────────────────────
        await msgData.react('✅')

        // ── Kirim gambar dari URL ────────────────────────────────
        await sock.sendMessage(remoteJid, {
            image: { url: 'https://example.com/image.jpg' },
            caption: 'Caption gambar~'
        }, { quoted: m })

        // ── Kirim gambar dari buffer ─────────────────────────────
        const buffer = await axios.get(url, { responseType: 'arraybuffer' })
        await sock.sendMessage(remoteJid, {
            image: Buffer.from(buffer.data),
            caption: 'Caption~'
        }, { quoted: m })

        // ── Kirim video ──────────────────────────────────────────
        await sock.sendMessage(remoteJid, {
            video: { url: 'https://example.com/video.mp4' },
            caption: 'Caption~',
            mimetype: 'video/mp4'
        }, { quoted: m })

        // ── Kirim audio ──────────────────────────────────────────
        await sock.sendMessage(remoteJid, {
            audio: { url: 'https://example.com/audio.mp3' },
            mimetype: 'audio/mpeg',
            ptt: false  // true = voice note
        }, { quoted: m })

        // ── Kirim dokumen/file ───────────────────────────────────
        await sock.sendMessage(remoteJid, {
            document: fs.readFileSync('/path/to/file.zip'),
            mimetype: 'application/zip',
            fileName: 'backup.zip'
        }, { quoted: m })

        // ── Akses database ───────────────────────────────────────
        const { db } = msgData
        const targetJid = msgData.parseTargetJid()
        const [targetUser] = await db.User.findOrCreate({
            where: { jid: targetJid },
            defaults: { is_registered: false }
        })
        await targetUser.update({ is_premium: true })

        // ── Akses config ─────────────────────────────────────────
        const { config } = msgData
        console.log(config.BOT_NAME)

        // ── Download media yang dikirim user ─────────────────────
        const buffer2 = await msgData.downloadMedia()

        // ── Error handling ───────────────────────────────────────
        try {
            // kode yang mungkin error
        } catch (error) {
            console.error('[NamaPlugin] Error:', error)
            await msgData.reply(`❌ Gagal: ${error.message}`)
        }
    }
}
```

---

## passiveListener (tanpa prefix, DM always-on)

```js
export default {
    command: ['ai'],
    category: 'ai',

    async execute(sock, m, msgData, user, group, plugins) {
        // handler command .ai
    },

    // Hook dipanggil untuk SEMUA pesan tanpa command
    async passiveListener(sock, m, msgData, user, group) {
        if (msgData.commandName) return false  // ada command, skip

        // Logic kamu di sini
        // return true  → pesan sudah dihandle, stop
        // return false → lanjut ke plugin berikutnya
        return false
    }
}
```

---

## Lokasi Plugin per Kategori

```
plugins/
├── owner/      → isOwner: true  (restart, eval, backup, dll)
├── main/       → menu, ping, info
├── ai/         → ai-chat, ai-system
├── downloader/ → instagram, tiktok, youtube, twitter
├── group/      → kick, promote, welcome, dll
└── general/    → sticker, translate, cuaca, dll
```

---

## Import yang Tersedia (sudah ada di node_modules)

```js
import fs from 'fs'
import path from 'path'
import os from 'os'
import { exec, execSync } from 'child_process'
import axios from 'axios'
import moment from 'moment-timezone'
import config from '../../config.js'      // sesuaikan path
```

---

## Yang DILARANG

```js
// ❌ SALAH — CommonJS
const fs = require('fs')
module.exports = { ... }

// ❌ SALAH — import tanpa .js extension untuk file lokal
import config from '../../config'

// ❌ SALAH — pakai __dirname (tidak ada di ESM)
const dir = __dirname

// ✅ BENAR — ganti __dirname dengan ini:
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
```

---

## Cara Hot-Reload Bekerja

- Marin memakai `watchPlugins()` yang otomatis deteksi perubahan file
- Setelah `write_file()` ke folder `plugins/` → plugin langsung aktif dalam ~1 detik
- **Tidak perlu restart bot sama sekali**
- Untuk test: langsung ketik `.namacommand` di WhatsApp

---

## Contoh Plugin Lengkap (Backup)

```js
// plugins/owner/backup.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import archiver from 'archiver'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const ROOT       = path.join(__dirname, '../../')

const EXCLUDE = ['node_modules', '.npm', 'tmp', 'sessions', '.git']

export default {
    command: ['backup'],
    category: 'owner',
    isOwner: true,
    description: 'Backup seluruh file bot ke zip (kecuali node_modules, dll)',

    async execute(sock, m, msgData) {
        const { remoteJid } = msgData
        await msgData.reply('📦 Membuat backup...')

        const outPath = path.join(os.tmpdir(), `backup-${Date.now()}.zip`)
        const output  = fs.createWriteStream(outPath)
        const archive = archiver('zip', { zlib: { level: 6 } })

        await new Promise((resolve, reject) => {
            output.on('close', resolve)
            archive.on('error', reject)
            archive.pipe(output)
            archive.glob('**/*', {
                cwd: ROOT,
                ignore: EXCLUDE.map(e => `${e}/**`)
            })
            archive.finalize()
        })

        const buffer = fs.readFileSync(outPath)
        fs.unlinkSync(outPath)

        await sock.sendMessage(remoteJid, {
            document: buffer,
            mimetype: 'application/zip',
            fileName: `marin-backup-${Date.now()}.zip`
        }, { quoted: m })

        await msgData.react('✅')
    }
}
```

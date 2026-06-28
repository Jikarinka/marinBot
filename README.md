<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,20,24&height=200&section=header&text=🏵️%20MARIN%20BOT&fontSize=70&fontAlignY=40&animation=fadeIn&fontColor=ffffff&desc=WhatsApp%20AI%20Assistant%20dengan%20Otak%20Sendiri&descAlignY=65&descSize=22" width="100%"/>

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Gemini](https://img.shields.io/badge/Google_Gemini-AI_Engine-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com)
[![Baileys](https://img.shields.io/badge/Baileys-WhatsApp_API-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![Plugins](https://img.shields.io/badge/Plugins-100%2B-ff69b4?style=for-the-badge&logo=puzzle-piece&logoColor=white)](#-daftar-plugin)

<br/>

> ### *"Bukan sekadar bot balas chat.*
> ### *Marin bisa mikir, belajar, benerin dirinya sendiri, dan bahkan bikin fitur baru dari nol."*

<br/>

</div>

---

## 🌟 Kenapa Marin Berbeda?

<div align="center">

| 🤖 Bot Biasa | 🏵️ Marin |
|:---:|:---:|
| Hanya jalankan command yang ditulis manual | Punya **30+ MCP Tools** yang dipanggil Gemini secara otonom |
| Error = bot crash atau diam saja | Error = **Marin deteksi, analisa, dan fix sendiri** |
| Fitur baru harus tulis kode manual | Marin bisa **buat plugin baru dari nol** kalau diminta |
| Harus ingat prefix dan command | **Chat natural** — bicara biasa, Marin mengerti |
| Plugin dari bot lain? Tulis ulang semua | Marin bisa **terjemahkan plugin** dari bot lain otomatis |

</div>

---

## 💡 Natural Chat — Bicara Biasa, Marin Mengerti Segalanya

> **Tidak ada yang namanya "harus pakai command".** Di DM, langsung ngobrol. Di grup, mention atau reply Marin. Selesai.

Semua fitur Marin bisa diakses lewat **chat alami** — tidak wajib pakai prefix seperti `.menu`, `.download`, dsb. Marin memahami maksudmu dan langsung eksekusi.

### 📱 Contoh Percakapan Natural

```
💬 Kamu   → "munculkan menu dong"
🏵️ Marin  → [kirim menu lengkap interaktif]

💬 Kamu   → "download lagu ini" [kirim link YouTube]
🏵️ Marin  → [download dan kirim MP3]

💬 Kamu   → "bikinin stiker dari foto ini" [kirim foto]
🏵️ Marin  → [konvert ke stiker WhatsApp]

💬 Kamu   → "ingatkan aku sholat maghrib jam 6 sore nanti"
🏵️ Marin  → ✅ Siap! Nanti jam 18.00 Marin bakal ingetin kamu~

💬 Kamu   → "bangunin aku besok jam 5 pagi ya"
🏵️ Marin  → ✅ Alarm diset! Besok jam 05.00 Marin ketuk-ketuk pintu virtualmu~

💬 Kamu   → "marin, besok aku ada meeting penting, ingatkan 30 menit sebelumnya"
🏵️ Marin  → Kapan meetingnya kak? Kasih tau jamnya~

💬 Kamu   → "siapa artis di foto ini?" [kirim foto]
🏵️ Marin  → [analisa gambar dan jawab]

💬 Kamu   → "terjemahkan voice note ini" [kirim voice note]
🏵️ Marin  → [transkripsi audio ke teks]

💬 Kamu   → "cek tagihan listrik nomor 1234567890"
🏵️ Marin  → [cek dan tampilkan info tagihan PLN]

💬 Kamu   → "aku mau main RPG"
🏵️ Marin  → [jelaskan sistem RPG, kasih command awal, tawari mulai petualangan]

💬 Kamu   → "hapus plugin backup yang error tadi"
🏵️ Marin  → [gunakan tool delete_file, konfirmasi ke kamu]

💬 Kamu   → "gimana cuaca hari ini?" 
🏵️ Marin  → [web search real-time, jawab dengan info terkini]

💬 Kamu   → "buatin plugin absensi buat grup kantor"
🏵️ Marin  → [baca PLUGIN_GUIDE, tulis kode plugin baru, hot-reload, selesai]
```

### ⚡ Command Tetap Bisa Dipakai
Kalau kamu lebih suka cara cepat pakai prefix, tentu tetap jalan normal:
```
.menu       .ai tanya sesuatu      .dl [url]      .sticker
.profile    .daily                 .dungeon        .ingat 20 menit lagi mandi
```

---

## ✨ Fitur Unggulan

### 🧠 Self-Healing — Marin Benerin Dirinya Sendiri

```
Plugin Error
    ↓
[auto-heal] Marin deteksi error + baca stack trace
    ↓
[Gemini] Analisa root cause
    ↓
[write_file] Tulis ulang kode yang bermasalah
    ↓
[hot-reload] Aktif otomatis — TANPA restart bot
    ↓
✅ Berhasil → "Sudah diperbaiki! Coba lagi ya~"
❌ Gagal 3x → Laporan lengkap ke Owner
```

- **User biasa** → dapat pesan ramah, tidak panik lihat error
- **Owner/Koordinator** → dapat log mentah + stack trace lengkap

---

### 🌱 Self-Evolving — Marin Belajar dan Berkembang Sendiri

Marin punya **memori jangka panjang** (`marin-brain.json`) yang persisten lintas restart. Setiap kali dia belajar — cara fix bug tertentu, preferensi user, pola error yang pernah terjadi — semuanya disimpan ke "otaknya" lewat tool `remember`.

**Yang lebih luar biasa:** kalau ada fitur yang diminta tapi belum ada, Marin akan:
1. Baca `PLUGIN_GUIDE.md` sendiri (panduan internalnya)
2. Tulis plugin baru dari nol dengan format ESM yang benar
3. Test plugin sebelum bilang "selesai"
4. Catat di memori agar tidak perlu buat ulang

---

### 🔄 Plugin Translator — Translate Plugin dari Bot Lain

Marin bisa membaca kode plugin dari bot lain (KannaBot, MikiBot, Xreply, dll) dan **mengubahnya otomatis** ke format Marin.

**Cara pakainya** — cukup kirim ke Marin:
```
buatkan plugins menggunakan template
[paste kode plugin asli di sini]
```

**Contoh nyata — Translate plugin backup KannaBot:**

<details>
<summary>Lihat kode asli KannaBot (klik untuk expand)</summary>

```js
import fs from 'fs'
import archiver from 'archiver'
import path from 'path'

let handler = async (m, { conn, usedPrefix: _p, args }) => {
    let nomor = '6281249241152@s.whatsapp.net'
    let nameFile = 'kanna-backup.zip'
    let output = fs.createWriteStream(nameFile)
    let archive = archiver('zip', { zlib: { level: 9 } })

    conn.reply(m.chat, `Sedang Membuat ${nameFile}`, null)

    archive.on('finish', () => {
        conn.reply(m.chat, 'Arsip selesai!', null)
        conn.sendFile(nomor, fs.readFileSync(`./${nameFile}`), nameFile, 'Arsip otomatis', fdoc)
        conn.reply(m.chat, 'Arsip telah terkirim ke nomor Owner', null)
        fs.unlinkSync(`./${nameFile}`)
    })

    archive.pipe(output)
    // ... processSource ...
    archive.finalize()
}
handler.command = /^(kbackup)$/i
handler.rowner = true
export default handler
```
</details>

<details>
<summary>Hasil terjemahan ke format Marin (klik untuk expand)</summary>

```js
// plugins/owner/owner-kbackup.js
import fs from 'fs'
import archiver from 'archiver'
import path from 'path'

export default {
    command: ['kbackup'],
    category: 'owner',
    description: 'Buat backup seluruh file bot dan kirim ke Owner.',
    isOwner: true,

    async execute(sock, m, msgData) {
        const conn = sock  // conn = sock, sudah diperkaya
        const ownerJid = msgData.config.OWNER_NUMBER + '@s.whatsapp.net'
        const nameFile = 'marin-backup.zip'
        const excludeDirs = ['node_modules', 'tmp', '.git', '.local', '.config', '.npm', '.cache']

        await m.reply(`⏳ Sedang membuat *${nameFile}*... tunggu sebentar ya~`)
        await m.react('⏳')

        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(nameFile)
            const archive = archiver('zip', { zlib: { level: 9 } })

            archive.on('error', reject)
            archive.pipe(output)

            output.on('close', async () => {
                try {
                    const sizeMB = (archive.pointer() / (1024 * 1024)).toFixed(2)
                    await m.reply(`✅ Backup selesai! Ukuran: *${sizeMB} MB*`)

                    // Kirim dokumen ke Owner — cara Marin
                    await conn.sendFile(ownerJid, fs.readFileSync(nameFile), nameFile,
                        `🗓️ Backup MarinBot — ${new Date().toLocaleDateString('id-ID')}`, m)

                    await m.reply('📦 Backup berhasil dikirim ke Owner!')
                    await m.react('✅')
                    fs.unlinkSync(nameFile)
                    resolve()
                } catch (err) { reject(err) }
            })

            const processSource = (source) => {
                for (const file of fs.readdirSync(source)) {
                    const filePath = path.join(source, file)
                    if (fs.statSync(filePath).isDirectory()) {
                        if (!excludeDirs.includes(file)) processSource(filePath)
                    } else {
                        archive.file(filePath, { name: filePath.replace('./', '') })
                    }
                }
            }
            processSource('./')
            archive.finalize()
        })
    }
}
```
</details>

**Tabel konversi otomatis:**

| Aspek | Bot Lama | Marin |
|:---|:---|:---|
| Struktur export | `handler = async` + `export default handler` | `export default { execute() }` |
| Reply teks | `conn.reply(m.chat, teks, null)` | `await m.reply(teks)` atau `await conn.reply(m.chat, teks, m)` |
| Kirim file/dokumen | `conn.sendFile(jid, buf, nama, caption, fdoc)` | `await conn.sendFile(jid, buf, nama, caption, m)` |
| Kirim gambar | `conn.sendMessage(jid, buf, MessageType.image)` | `await conn.sendImage(m.chat, buf, caption, m)` |
| React emoji | — | `await m.react('✅')` |
| Quoted message | `m.quoted` | `m.quoted` ✅ (sama persis) |
| Akses config | Hardcode nomor | `msgData.config.OWNER_NUMBER` |
| conn dan sock | `conn` | `conn = sock` (keduanya bisa dipakai) |
| Perhitungan ukuran | `substring(0,2)` tidak akurat | `/ (1024*1024).toFixed(2)` akurat |

---

## 📡 Shorthand API — Tulis Plugin Lebih Cepat

Marin mendukung **dua gaya penulisan** yang keduanya 100% valid — gaya Marin native atau gaya KannaBot/bot lama.

```js
async execute(sock, m, msgData, user, group) {
    const conn = sock  // conn = sock, bisa dipakai keduanya

    // ── Reply ──────────────────────────────────────────
    await m.reply('Teks balasan')                        // ✅ shorthand m
    await msgData.reply('Teks balasan')                  // ✅ cara lama
    await conn.reply(m.chat, 'Teks balasan', m)          // ✅ gaya KannaBot

    // ── Quoted Message ─────────────────────────────────
    if (m.quoted) {
        console.log(m.quoted.text)       // teks pesan yang di-quote
        console.log(m.quoted.sender)     // JID pengirim
        const buf = await m.quoted.download()  // download media quoted
        await m.quoted.reply('Ini balasan ke quoted')
    }

    // ── Kirim File ─────────────────────────────────────
    await conn.sendFile(m.chat, buffer, 'file.zip', 'Caption', m)
    await conn.sendFile(m.chat, 'https://url.com/img.jpg', '', 'Caption', m)

    // ── Kirim Media ────────────────────────────────────
    await conn.sendImage(m.chat, buffer, 'Caption', m)
    await conn.sendVideo(m.chat, buffer, 'Caption', m)
    await conn.sendAudio(m.chat, buffer, m, false)   // audio biasa
    await conn.sendAudio(m.chat, buffer, m, true)    // voice note (PTT)
    await conn.sendSticker(m.chat, buffer, m)

    // ── React ──────────────────────────────────────────
    await m.react('⏳')   // loading
    await m.react('✅')   // sukses
    await m.react('❌')   // gagal

    // ── Properti m ─────────────────────────────────────
    m.chat        // remoteJid
    m.sender      // senderJid
    m.text        // isi pesan
    m.name        // pushName
    m.isGroup     // boolean
    m.quoted      // quoted message (sama seperti KannaBot)
    m.isMedia     // ada media?
    m.conn        // sock yang diperkaya
}
```

---

## 🤖 Marin Bisa Apa Saja

### 💬 Kecerdasan Buatan (AI)
- Chat bebas tanpa prefix di DM — **seperti punya asisten pribadi**
- Di grup: mention `@marin` atau reply pesannya
- Analisa gambar yang dikirim — describe, OCR, baca dokumen dari foto
- Transkripsi voice note ke teks otomatis
- Web search real-time — jawaban selalu update
- Ingat preferensi dan riwayat percakapan lewat memori permanen
- Buat dan fix plugin sendiri tanpa bantuan developer
- Translate plugin dari bot lain ke format Marin
- Ganti model AI kapan saja: `flash-lite`, `flash`, `gemma`, `gemma-moe`

### ⏰ Pengingat & Alarm
```
.ingat 20 menit lagi mandi
.ingat 1 jam 30 menit lagi meeting
.ingat 2 jam lagi minum obat
.ingat list  →  lihat semua pengingat aktif
.ingat batal <id>  →  batalkan pengingat
```
Atau cukup bilang: *"ingatkan aku minum obat 2 jam lagi"*

### 😴 Status AFK
```
.afk lagi makan
.afk meeting dulu
```
Siapapun yang mention kamu saat AFK, Marin otomatis kasih tahu mereka. Kalau kamu kirim pesan lagi, status AFK langsung batal sendiri.

### 🎮 Sistem RPG Lengkap
Game RPG berbasis chat dengan ekonomi, inventori, dan progres yang tersimpan:

| Command | Fungsi |
|:---|:---|
| `.profile` / `.xp` / `.pp` | Lihat level, EXP, health, money, dan role |
| `.daily` / `.claim` | Klaim reward harian (reset tiap 24 jam) |
| `.weekly` / `.monthly` | Klaim reward mingguan & bulanan |
| `.adventure` / `.petualang` | Berpetualang, dapat resource (wood, rock, iron, dll) |
| `.mining` | Tambang batu & mineral |
| `.dungeon` | Masuk dungeon berisiko tinggi, reward besar |
| `.craft sword` / `.craft armor` | Craft equipment dari resource |
| `.repair sword` / `.repair armor` | Perbaiki durability equipment |
| `.shop` / `.buy` / `.sell` | Beli/jual item di toko |
| `.petshop` / `.feed` | Beli dan rawat pet |
| `.inventory` / `.inv` | Lihat semua item yang kamu punya |
| `.heal` | Pulihkan health dengan potion |
| `.nabung` / `.tarik` / `.bank` | Sistem bank — simpan dan tarik money |
| `.transfer` | Transfer money ke user lain |
| `.bet` | Taruhan money |
| `.merampok` | Rampok user lain (berisiko!) |
| `.open` | Buka chest/loot box |
| `.leaderboard` | Peringkat top player server |
| `.cheat` | Mode cheat (Owner only) |

**Level & Role sistem otomatis:** setiap pesan = EXP, naik level otomatis terdeteksi dan diumumkan.

### 📥 Downloader
- TikTok tanpa watermark
- Instagram (Reels, foto, carousel)
- YouTube (MP4 + MP3/audio)
- Facebook, Twitter/X, Pinterest, Threads
- Pixiv, Danbooru (anime art)
- Mega.nz, Mediafire, Krakenfiles

### 🎨 Generator Konten (100% Lokal)
- Fake Instagram Story
- Fake Tweet
- Image Quote Chat (bubble chat)
- Welcome/leave banner otomatis di grup
- Semua dibuat lokal dengan `sharp` + SVG — tidak butuh API eksternal

### 🏷️ Sticker
- Konvert gambar/video/GIF → stiker WhatsApp
- Brat-style sticker (bold hitam-putih)
- Quotly — stiker bubble chat
- Lihat EXIF metadata stiker
- Konvert stiker balik → gambar/video

### 😂 Fun & Hiburan
- 🐚 Kerang Ajaib / 8Ball — tanya ya/tidak
- 💘 Gombal & rayuan random
- 🎲 Seberapa / How — cek persentase random
- 🔮 Cek sifat random
- 👴 Tebak umur random
- 😂 Jokes — tanya jawab lucu
- Quotes inspiratif random

### 🔍 Pencarian
- Lirik lagu dari judul/artis
- Data mahasiswa di database PDDIKTI
- Gambar dari Pinterest
- Karya dari Pixiv
- Cari dan preview video YouTube

### 🛠️ Alat Bantu
- Kalkulator
- Konversi teks ke morse & sebaliknya
- Style text (bold, italic, strikethrough, dll)
- Encode/decode Base64
- Screenshot website dari URL
- Fetch konten halaman web
- Baca pesan view-once yang sudah expired
- Upload file ke CDN, dapat link publik
- Cek resi paket (semua ekspedisi via BinderByte)
- Cek tagihan PLN
- Cek pajak kendaraan Jabar (Bapenda)

### 👥 Manajemen Grup
- Kick/tendang member
- Promote dan demote admin
- Buka/tutup grup
- Kunci/buka edit info grup
- Ganti nama dan deskripsi grup
- Kelola link undangan (get, reset)
- Anti-link: hapus otomatis pesan yang ada link
- Welcome/leave message otomatis (customizable)
- Tambah anggota via nomor
- Gabung grup via link
- Info lengkap grup

### 🖼️ Anime & Waifu
- Random gambar waifu/anime berdasarkan kategori

### 👑 Owner & Developer Tools
```
.eval          → Eval JavaScript langsung dari chat
.exec          → Jalankan perintah terminal/shell
.backups       → Lihat daftar backup file otomatis
.restore       → Pulihkan file ke versi sebelumnya
.auditlog      → Riwayat perubahan file (write/delete)
.github        → Push ke GitHub dari chat
.approve       → Approve request yang pending
.deny          → Tolak request
.banuser       → Ban user
.cleartmp      → Bersihkan folder temporary
.poststatus    → Kirim WhatsApp Status dari chat
.addprem       → Tambah status premium user
.delprem       → Hapus status premium user
.debuginfo     → Debug info pesan (payload raw, flags)
```

---

## 🤖 Model AI yang Digunakan

| Model Key | Model Asli | Kapan Dipakai |
|:---|:---|:---|
| `flash-lite` ✨ *(default)* | Gemini 3.5 Flash Lite | Chat sehari-hari, respon cepat |
| `flash` | Gemini 3.5 Flash | Butuh sedikit lebih akurat |
| `gemma` | Gemma 4 31b-it | Tugas yang lebih kompleks |
| `gemma-moe` | Gemma 4 26b-a4b-it | Alternatif hemat resource |

Ganti model: `.ai:flash pertanyaan kamu` atau bilang ke Marin *"ganti ke model flash"*.

Kalau satu model down/overload (429/500/503), Marin **otomatis fallback** ke model lain — nyaris tidak pernah gagal total.

---

## 🔧 30 MCP Tools — Otak Marin

Semua tools ini dipanggil Gemini secara **otonom** saat dibutuhkan — tanpa harus diminta eksplisit oleh user.

<details>
<summary><b>🧠 Memory & Learning (6 tools)</b></summary>

| Tool | Fungsi |
|:---|:---|
| `remember` | Simpan pengetahuan baru ke memori permanen |
| `recall` | Cari memori relevan sebelum menjawab |
| `list_learned` | Tampilkan semua yang sudah dipelajari |
| `forget` | Hapus memori tertentu |
| `log_plugin_created` | Catat histori plugin baru yang dibuat |
| `log_failure` | Catat percobaan gagal agar tidak diulang |

</details>

<details>
<summary><b>📥 Downloader (6 tools)</b></summary>

| Tool | Fungsi |
|:---|:---|
| `download_tiktok` | Download video TikTok tanpa watermark |
| `download_instagram` | Download Reels/foto/carousel Instagram |
| `download_youtube` | Download video YouTube |
| `play_youtube` | Download audio/MP3 dari YouTube |
| `download_facebook` | Download video Facebook |
| `download_twitter` | Download video/GIF dari Twitter/X |

</details>

<details>
<summary><b>📁 File Management (6 tools)</b></summary>

| Tool | Fungsi |
|:---|:---|
| `list_files` | Lihat isi folder di server |
| `read_file` | Baca isi file apapun, dikirim verbatim |
| `write_file` | Tulis/overwrite file — basis dari self-healing |
| `delete_file` | Hapus file (Owner only) |
| `move_file` | Pindah/rename file atau folder |
| `search_files` | Cari file berdasarkan nama/isi |

</details>

<details>
<summary><b>⚙️ System & Shell (7 tools)</b></summary>

| Tool | Fungsi |
|:---|:---|
| `shell_exec` | Jalankan perintah shell apapun |
| `system_info` | Info CPU, RAM, disk, uptime |
| `restart_bot` | Restart proses bot |
| `read_env` | Baca isi file `.env` |
| `update_env` | Update value di `.env` tanpa edit manual |
| `install_package` | Install npm package baru |
| `create_folder` | Buat folder baru |

</details>

<details>
<summary><b>🔌 Plugin & Media (5 tools)</b></summary>

| Tool | Fungsi |
|:---|:---|
| `run_plugin` | Jalankan plugin berdasarkan command-nya |
| `list_plugins` | Tampilkan semua plugin terdaftar |
| `analyze_image` | Analisa gambar yang dikirim user |
| `transcribe_audio` | Transkrip voice note/audio |
| `read_plugin_guide` | Baca panduan internal sebelum buat plugin |

</details>

---

## 🤖 Sub-Bot — Satu Server, Banyak Bot

Marin bisa "beranak" — nomor WhatsApp lain bisa diaktifkan sebagai bot terpisah yang berjalan **paralel** dengan bot utama.

| Command | Siapa | Keterangan |
|:---|:---|:---|
| `.jadibot` | User Premium | Daftarkan nomor sendiri sebagai sub-bot |
| `.jadibot pairing` | User Premium | Sama, pakai kode pairing bukan QR |
| `.jadibot 628xxx` | Owner/Koordinator | Jadikan nomor manapun sub-bot |
| `.jadibot list` | Owner/Koordinator | Lihat semua sub-bot aktif |
| `.jadibot stop 628xxx` | Owner/Koordinator | Hentikan sub-bot tertentu |

**Keamanan berlapis — sub-bot tidak bisa dapat hak owner, apapun nomornya:**

```
Lapis 1: middlewares/auth.js      → isOwner & isCoordinator dipaksa false untuk _isSubBot
Lapis 2: middlewares/validator.js → command sensitif diblokir total
Lapis 3: mcp/registry.js          → tool ownerOnly ditolak di level pemanggilan
```

---

## 🛡️ Sistem Role

| Role | Akses |
|:---|:---|
| **Owner** | Penuh tanpa batas — file, eval, shell, restart, semua MCP tool |
| **Koordinator** | Sama seperti Owner, **kecuali** hapus dan buat file baru |
| **Premium** | Akses fitur premium + bisa buat sub-bot |
| **Member** | Akses fitur publik sesuai limit, wajib `.daftar` dulu |

---

## 🔑 Login — QR Code atau Pairing Code

```env
PAIRING_CODE=false   # QR Code (default) — scan dari terminal
PAIRING_CODE=true    # Pairing Code — masukkan kode 8 digit di WhatsApp

# Multi-session
MULTI_SESSIONS=akun2:6281111111111,akun3:6282222222222
```

---

## 🔌 Daftar Plugin Lengkap

Marin punya **100+ command** tersebar di **15 kategori**:

<details>
<summary><b>🤖 AI (3 plugin)</b></summary>

`.ai` `.marin` `.tanya` `.ask` — Chat dengan Marin AI

Sub-command: `info` `tools` `models` `sessions` `reset`

Ganti model: `.ai:flash` `.ai:flash-lite` `.ai:gemma` `.ai:gemma-moe`

</details>

<details>
<summary><b>📥 Downloader (13 plugin)</b></summary>

TikTok, Instagram, Facebook, Twitter/X, YouTube MP4, YouTube MP3, Pinterest, Pixiv, Threads, Danbooru, Mediafire, Mega.nz, Krakenfiles

</details>

<details>
<summary><b>🎮 RPG (23 plugin)</b></summary>

`profile` `xp` `daily` `weekly` `monthly` `adventure` `mining` `dungeon` `craft` `repair` `shop` `buy` `sell` `petshop` `feed` `inventory` `heal` `nabung` `tarik` `bank` `transfer` `bet` `merampok` `open` `leaderboard` `cheat`

</details>

<details>
<summary><b>👥 Group Management (16 plugin)</b></summary>

`kick` `add` `promote` `demote` `close` `open` `lock` `unlock` `rename` `desc` `getinvite` `resetinvite` `join` `groupinfo` `welcome` `antilink`

</details>

<details>
<summary><b>🎨 Maker (3 plugin)</b></summary>

`fakeig` `faketweet` `iqc`

</details>

<details>
<summary><b>🏷️ Sticker (5 plugin)</b></summary>

`sticker` `s` `brat` `qc` `toimg` `tomp4` `exif`

</details>

<details>
<summary><b>🔍 Search (5 plugin)</b></summary>

`lyrics` `lirik` `pddikti` `pinterest` `pixiv` `ytsearch`

</details>

<details>
<summary><b>🛠️ Tool (11 plugin)</b></summary>

`calc` `morse` `styletext` `base64` `bapenda` `pln` `resi` `fetch` `viewonce` `ssweb` `upload`

</details>

<details>
<summary><b>😂 Fun (3 plugin)</b></summary>

`kerang` `8ball` `apakah` `gombal` `rayuan` `how` `seberapa` `sifat` `tebakumur` `joke` `lucu` `quotes` `generatenama`

</details>

<details>
<summary><b>🖼️ Anime (1 plugin)</b></summary>

`waifu` + berbagai kategori

</details>

<details>
<summary><b>🎯 Misc (5 plugin)</b></summary>

`afk` `ping` `stat` `on` `off` `reminder` `ingat`

</details>

<details>
<summary><b>👑 Owner (15 plugin)</b></summary>

`eval` `exec` `backups` `restore` `auditlog` `github` `push` `approve` `deny` `ban` `cleartmp` `poststatus` `addprem` `delprem` `debuginfo`

</details>

<details>
<summary><b>🙋 Account (2 plugin)</b></summary>

`daftar` `unregister`

</details>

<details>
<summary><b>📋 Main (2 plugin)</b></summary>

`menu` `jadibot`

</details>

---

## 🌐 Sumber Data

| Kategori | Sumber |
|:---|:---|
| TikTok | [tikwm.com](https://tikwm.com) — API publik, tanpa key |
| YouTube | `@distube/ytdl-core` — library lokal |
| Instagram / Facebook / Twitter | Multi-API fallback |
| Mega.nz | `megajs` — library resmi |
| Mediafire / Krakenfiles | Scraping (cheerio) |
| Danbooru | API resmi donmai.us |
| Pixiv | Proxy phixiv.net |
| Lirik lagu | lrclib.net |
| PDDIKTI | pddikti.rone.dev |
| Generator gambar (Fake IG, Tweet, IQC, Banner) | **100% lokal** — `sharp` + SVG |
| Screenshot website | **100% lokal** — Puppeteer headless |
| Upload CDN | Telegraph + tmpfiles.org (fallback) |
| Cek resi paket | BinderByte (butuh `BINDERBYTE_API_KEY`) |

---

## 🚀 Instalasi

**Kebutuhan:** Node.js v20+, akun WhatsApp, Gemini API Key (gratis)

```bash
# 1. Clone
git clone <repo-url> && cd marin-bot

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env

# 4. Isi .env
nano .env
```

```env
BOT_NUMBER="628xxxxxxxxxx"
OWNER_NUMBER="628xxxxxxxxxx"
COORDINATOR_NUMBERS="628xxxxxxxxxx,628yyyyyyyyyy"
GEMINI_API_KEY="AIzaSy..."              # Gratis dari aistudio.google.com
BINDERBYTE_API_KEY="..."                # Opsional, untuk cek resi
PAIRING_CODE=false                       # true = pairing code, false = QR
```

```bash
# 5. Jalankan
npm start
```

---

## 🏗️ Arsitektur

```
marin-bot/
├── mcp/                  → Inti kecerdasan: agent, registry, memory, auto-heal
├── plugins/              → 100+ command dalam 15 kategori
│   ├── ai/               → AI chat + downloader AI
│   ├── rpg/              → 23 plugin game RPG
│   ├── group/            → Manajemen grup
│   ├── downloader/       → 13 platform download
│   ├── fun/              → Hiburan & games ringan
│   ├── misc/             → Reminder, AFK, ping, stat
│   ├── tool/             → Kalkulator, morse, ssweb, dll
│   └── owner/            → Tools developer & admin
├── middlewares/          → Auth tiga lapis, validator, handler
├── libs/                 → Hot-reload, adapter pesan, rpg-helper
│   └── adapter/          → messageAdapter (shorthand m, conn)
├── databases/            → ORM: User, Group, Setting
├── PLUGIN_GUIDE.md       → Panduan internal yang dibaca Marin
└── PLUGIN_SHORTHAND.md   → Referensi cepat shorthand m & conn
```

Setiap pesan diproses lewat `middlewares/handler.js` → dibungkus `safeExecute()` dari auto-heal → error tidak pernah crash bot.

---

## 👨‍💻 Developer

| | |
|:---|:---|
| **Developer** | +62 812-4924-1152 |
| **Nomor Bot** | +62 853-3493-0628 |

Ada bug, request fitur, atau pertanyaan yang tidak ada di dokumentasi ini? Chat developer-nya langsung, jangan sungkan~

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,20,24&height=120&section=footer&animation=fadeIn" width="100%"/>

**Dibuat dengan 🏵️ dan secangkir kopi developer yang nggak tidur**

*Marin — bukan cuma bot, tapi partner yang terus belajar, terus berkembang, dan selalu ada.*

</div>

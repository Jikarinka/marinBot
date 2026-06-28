# 🌸 Marin Bot — MCP Features Update

## Fitur Baru yang Ditambahkan

### 1. 🖼️ Image Recognition
Kirim foto ke bot (atau reply foto) + tanya apapun → Marin langsung analisa.
```
[kirim foto] + "ini gambar apa?"
[kirim foto] + ".ai ada berapa orang di foto ini?"
```
Gambar otomatis terkirim ke Gemini sebagai `inlineData` — tidak perlu OCR eksternal.

### 2. 🎙️ Voice Note Recognition
Kirim voice note (atau reply VN) → Marin transkrip & pahami isinya.
```
[kirim voice note] + ".ai apa isi voice note ini?"
[reply voice note] + "terjemahkan ke teks"
```

### 3. 🛡️ Anti-Spam
Rate limiting otomatis per user (`mcp/anti-spam.js`):
- Maksimal 8 request/menit
- Deteksi burst (4x dalam 5 detik) → cooldown 30 detik
- Auto cleanup memory setiap 5 menit

### 4. 📡 Multi-Session (Satu bot kode, banyak nomor WA)
Set di `.env`:
```
MULTI_SESSIONS=akun1,akun2,akun3
```
Setiap session jalan paralel dengan folder auth terpisah (`sessions-multi/<nama>`).
Kosongkan untuk mode single-session normal (pakai folder `sessions`).

Cek session aktif: `.ai sessions`

### 5. 💬 Mode Private vs Grup
- **Private Chat**: Marin SELALU aktif, chat natural tanpa perlu `.ai` atau prefix apapun
- **Group Chat**: harus mention `@bot` atau reply pesan Marin, atau pakai `.ai`

Diatur lewat `passiveListener` di `ai-chat.js`, dipanggil dari `handler.js` saat tidak ada command yang cocok.

### 6. 🧹 Filter Thinking yang Lebih Baik
```js
function filterThoughtTags(text) {
    if (typeof text !== "string") return "";
    return text.replace(/<thought\b[^>]*>([\s\S]*?)(?:<\/thought>|$)/gi, "").trim();
}
```
Filter ini jadi prioritas utama di `cleanOutput()`, plus fallback filter untuk monolog reasoning yang lolos tanpa tag.

## File yang Diubah/Ditambah

| File | Status | Keterangan |
|---|---|---|
| `mcp/anti-spam.js` | ✨ Baru | Rate limiting |
| `mcp/session-manager.js` | ✨ Baru | Multi-session tracking |
| `mcp/agent.js` | 🔧 Diubah | filterThoughtTags, anti-spam, media handling |
| `plugins/ai/ai-chat.js` | 🔧 Diubah | passiveListener untuk private/grup |
| `plugins/ai/ai-system.js` | 🔧 Diubah | tambah analyze_image, transcribe_audio |
| `middlewares/handler.js` | 🔧 Diubah | panggil passiveListener saat tanpa command |
| `libs/adapter/messageAdapter.js` | 🔧 Diubah | tambah field `quotedSender` |
| `index.js` | 🔧 Diubah | multi-session bootstrap |

## Setup
```bash
# Single session (default)
GEMINI_API_KEY=AIzaSy...

# Multi session
GEMINI_API_KEY=AIzaSy...
MULTI_SESSIONS=akun1,akun2
```

## Update — Audit Log, Backup Otomatis & Perluasan Tools

### 7. 📋 Audit Log
Semua aksi tool AI (write_file, delete_file, shell_exec, eval, dll) otomatis tercatat di `mcp/logs/audit.jsonl` (append-only, auto-rotate setelah 10MB). Dicatat: tool, pengirim, waktu, argumen (terpotong & disensor field internal), berhasil/gagal, durasi.

Cek dari chat:
```
.auditlog          → 15 entri terakhir
.auditlog 30       → 30 entri terakhir
```
Atau lewat AI: "lihat log aksi terakhir"

### 8. 🗄️ Backup Otomatis
Sebelum `write_file`, `delete_file`, atau `move_file` mengubah/menghapus file, isi lama otomatis disimpan ke `mcp/backups/` dengan timestamp. Tidak perlu aksi manual.

Cek & pulihkan dari chat:
```
.backups                  → daftar backup tersedia
.restore <nama_backup>    → pulihkan ke lokasi asli
```
Atau lewat AI: "kembalikan plugin tiktok ke versi sebelumnya"

### 9. 🔧 Tools Tambahan (Owner only)
- `process_info` — lihat proses Node yang berjalan
- `kill_process` — hentikan proses berdasarkan PID (tidak bisa kill proses bot sendiri/PID 1)
- `git_status` — branch, perubahan belum commit, 5 commit terakhir
- `git_pull` — tarik update dari remote
- `view_audit_log`, `list_backups`, `restore_backup` — versi tool AI dari command manual di atas

### 10. 🛠️ Plugin Exec/Eval Diperbaiki
`owner-exec.js` dan `owner-exec2.js` lama pakai format handler tidak kompatibel (prefix `>`, `=>`, `$` yang tidak pernah dikenali parser command). Diganti dengan command standar:
```
.eval <kode JS>
.exec <shell command>   (alias: .shell)
```
Keduanya `isOwner: true` + tercatat di audit log + diblokir total di sub-bot (defense-in-depth via `SUBBOT_BLOCKED_KEYWORDS`).

## File yang Diubah/Ditambah (lanjutan)

| File | Status | Keterangan |
|---|---|---|
| `mcp/audit-log.js` | ✨ Baru | Audit log JSONL + backup/restore file |
| `mcp/registry.js` | 🔧 Diubah | `callTool` otomatis log + backup sebelum tool destruktif |
| `plugins/owner/owner-eval.js` | ✨ Baru | Ganti `owner-evalh`/`owner-exec.js` lama, command `.eval` |
| `plugins/owner/owner-exec.js` | 🔧 Ditulis ulang | Ganti format lama, command `.exec`/`.shell` |
| `plugins/owner/owner-auditlog.js` | ✨ Baru | Command `.auditlog`/`.logs` |
| `plugins/owner/owner-backups.js` | ✨ Baru | Command `.backups`/`.restore` |
| `plugins/ai/ai-system.js` | 🔧 Diubah | Tambah `process_info`, `kill_process`, `git_status`, `git_pull`, `view_audit_log`, `list_backups`, `restore_backup` |
| `middlewares/validator.js` | 🔧 Diubah | Tambah `restore`, `auditlog` ke `SUBBOT_BLOCKED_KEYWORDS` |

## Update — Perbaikan Crash & Konfirmasi npm install

### 11. 🛡️ Perlindungan dari Plugin Rusak
Sebelumnya satu plugin dengan format `command` yang salah (misal string bukan array — kerap terjadi kalau plugin ditulis ulang oleh AI/auto-heal) bisa bikin SELURUH bot crash (`plugin.command.includes is not a function`) karena tidak ada validasi struktur saat plugin di-load.

Sekarang:
- `libs/hot-reload.js` memvalidasi setiap plugin saat dimuat (harus ada `execute`/`passiveListener`, `command` harus array-of-string atau string). Plugin yang tidak valid ditolak dengan log jelas, tidak ikut ter-load.
- `middlewares/handler.js` juga defensif saat mengecek `plugin.command` — kalaupun ada yang lolos validasi tapi tetap rusak, tidak akan meng-crash seluruh handler.

### 12. ✅ Konfirmasi Wajib untuk `npm install`
AI (lewat `shell_exec`, termasuk dari auto-heal) sekarang **tidak bisa langsung** menjalankan `npm install`/`npm i`/`npm add`. Begitu terdeteksi, prosesnya:
1. Eksekusi ditahan, pesan konfirmasi otomatis terkirim ke owner dengan ID unik
2. Owner balas `.approve <id>` → baru benar-benar dijalankan
3. Owner balas `.deny <id>` → dibatalkan
4. Tidak direspon dalam 10 menit → otomatis expired

Catatan: status pending disimpan in-memory — kalau bot restart sebelum di-approve, permintaan akan hilang dan perlu diulang dari AI.

## File yang Diubah/Ditambah (lanjutan)

| File | Status | Keterangan |
|---|---|---|
| `libs/hot-reload.js` | 🔧 Diubah | Validasi struktur plugin saat load (`isValidPlugin`) |
| `middlewares/handler.js` | 🔧 Diubah | Defensive check `plugin.command` agar tidak crash seluruh bot |
| `mcp/pending-confirmations.js` | ✨ Baru | Sistem antrian konfirmasi untuk aksi berisiko (npm install) |
| `plugins/ai/ai-system.js` | 🔧 Diubah | `shell_exec` menahan `npm install`/`i`/`add` sampai owner approve |
| `plugins/owner/owner-approve.js` | ✨ Baru | Command `.approve <id>` |
| `plugins/owner/owner-deny.js` | ✨ Baru | Command `.deny <id>` |
| `middlewares/validator.js` | 🔧 Diubah | Tambah `approve`, `deny` ke `SUBBOT_BLOCKED_KEYWORDS` |
| `mcp/auto-heal.js` | 🔧 Diubah | Prompt diupdate: npm install tidak instan, perlu approval |

## Update — Perbaikan Validasi Plugin, Cek .env Startup & Fitur Pengingat

### 13. 🐛 Fix: Validasi Plugin Terlalu Ketat
Perbaikan sebelumnya (poin #11) sempat membuat plugin event-handler seperti `group-welcome-leave.js` (pakai `onParticipantsUpdate`, bukan `execute`/`passiveListener`) ikut ter-skip secara salah. Sekarang `hot-reload.js` mengenali tiga pola valid:
- `execute()` — command plugin biasa
- `passiveListener()` — chat tanpa command
- `onXxx()` apapun — event handler WhatsApp (welcome/leave, dll), dipanggil langsung dari `index.js`

### 14. 🚨 Validasi .env Saat Startup
Sebelumnya kalau `.env` kosong/hilang (misal tertimpa proses redeploy di panel hosting), bot bisa jalan diam-diam dengan kredensial kosong — termasuk celah keamanan (`OWNER_NUMBER` kosong = sistem owner-only tidak aktif).

Sekarang `libs/env-validator.js` mengecek saat startup:
- Variabel kritis (`BOT_NUMBER`, `OWNER_NUMBER`) — peringatan mencolok di console kalau kosong
- Variabel penting (`GEMINI_API_KEY`) — peringatan kalau kosong
- Kalau `OWNER_NUMBER` ternyata valid meski variabel lain kosong, owner juga dapat notif WA otomatis setelah bot connect

**Catatan penting**: kode bot ini sendiri **tidak** melakukan operasi git/clone otomatis terhadap `.env` — `.env` memang sengaja dikecualikan dari git (`.gitignore` & `github-push.js`). Kalau `.env` sering kosong setelah restart, kemungkinan besar penyebabnya ada di startup script/konfigurasi panel hosting (bukan kode bot) yang melakukan git pull/clone dan menimpa folder kerja.

### 15. ⏰ Fitur Pengingat
Command baru: `.ingat`, `.remind`, atau `.reminder`
```
.ingat 20 menit lagi mandi
.ingat 1 jam 30 menit lagi meeting
.ingat list              → lihat pengingat aktif
.ingat batal <id>        → batalkan pengingat
```
Atau lewat AI secara natural: "ingatkan aku 20 menit lagi mandi"

Pengingat tersimpan persisten di `mcp/reminders.json` — kalau bot restart sebelum waktunya tiba, otomatis dijadwalkan ulang saat bot connect kembali (atau langsung fire kalau ternyata sudah lewat waktunya saat bot mati).

## File yang Diubah/Ditambah (lanjutan)

| File | Status | Keterangan |
|---|---|---|
| `libs/hot-reload.js` | 🐛 Fix | Validasi plugin sekarang mengenali event handler (`onXxx`) |
| `libs/env-validator.js` | ✨ Baru | Cek `.env` saat startup + notif WA ke owner kalau bermasalah |
| `index.js` | 🔧 Diubah | Panggil validasi env saat boot + reschedule reminder saat connect |
| `libs/reminder.js` | ✨ Baru | Sistem pengingat persisten (parse waktu relatif, jadwal ulang otomatis) |
| `plugins/misc/misc-reminder.js` | ✨ Baru | Command `.ingat`/`.remind`/`.reminder` |
| `plugins/ai/ai-system.js` | 🔧 Diubah | Tambah tool `create_reminder` untuk AI |

## Update — Fitur Upload Status WhatsApp

### 16. 📸 Upload Status/Story
Command baru: `.poststatus` (khusus Owner)
```
.poststatus Halo semua!                    → status teks
[kirim/reply gambar atau video] .poststatus [caption]   → status media
```

**Catatan penting soal reliabilitas**: ini fitur yang didukung Baileys lewat JID khusus `status@broadcast`, tapi ada beberapa laporan bug terbuka di repo resmi Baileys (termasuk yang masih open per akhir 2025) di mana status kadang tidak muncul di WhatsApp meski API mengembalikan respons sukses. Sebagai workaround, plugin ini mengisi `statusJidList` dengan semua JID user yang sudah terdaftar di bot (`User.getAll()`) — beberapa laporan komunitas menyebut `statusJidList` kosong sebagai pemicu status tidak muncul. Kalau tetap tidak konsisten, ini keterbatasan di level library, bukan bug di plugin.

## File yang Diubah/Ditambah (lanjutan)

| File | Status | Keterangan |
|---|---|---|
| `plugins/owner/owner-poststatus.js` | ✨ Baru | Command `.poststatus` — upload status teks/media |
| `databases/connector.js` | 🔧 Diubah | Tambah `User.getAll()` untuk ambil semua JID terdaftar |

## Update — Migrasi Sistem RPG dari KannaBot-V10 (Tahap 1)

### 17. 🎮 Sistem RPG — Fondasi & Fitur Inti

Migrasi sebagian sistem RPG dari KannaBot-V10, ditulis ulang total ke arsitektur Marin (bukan port langsung — KannaBot pakai paradigma `global.db`, `handler.command` RegExp, `conn.reply()` yang sepenuhnya berbeda dari Marin).

**Struktur data baru**: `user.rpg` — objek terpisah di model `User`, tidak bercampur dengan field akun (`is_premium`, `limit`, dll). Migrasi otomatis: user lama yang belum punya field `rpg` otomatis dilengkapi default saat diakses (`findOne`, `findOrCreate`, `getAll`), tanpa kehilangan data akun yang sudah ada.

**Commands yang sudah jadi:**
| Command | Fungsi |
|---|---|
| `.adventure` / `.petualang` | Dapat resource awal (wood/rock/string/iron/money) — tidak butuh equipment, titik mulai progresi |
| `.craft <item>` | Craft pickaxe/sword/fishingrod/armor/atm dari resource |
| `.mining` / `.mine` | Mining untuk resource lebih banyak — butuh pickaxe |
| `.repair <item>` | Perbaiki durability equipment yang rusak |
| `.heal [jumlah]` | Pakai potion untuk pulihkan health |
| `.shop` / `.buy` / `.sell` | Jual-beli item di shop |
| `.bank` | Cek saldo bank & money |
| `.nabung [jumlah\|all]` | Setor money ke bank |
| `.tarik [jumlah\|all]` | Tarik money dari bank |
| `.transfer <type> <jumlah> @user` | Kirim item/money ke user lain |
| `.daily` / `.weekly` / `.monthly` | Klaim reward berkala |
| `.inventory` / `.inv` | Lihat semua item & status cooldown |
| `.profile` / `.xp` | Lihat level, exp, progress bar |
| `.leaderboard <type>` | Top 10 ranking |

**Perubahan desain dari aslinya (disengaja, bukan kelalaian):**
- `Array.prototype.getRandom()` (memodifikasi prototype global) **diganti** fungsi biasa `randomInt()`/`randomFrom()` di `libs/rpg-helper.js` — modifikasi prototype bawaan JS berisiko bentrok dengan library lain.
- `.transfer` disederhanakan jadi instan (aslinya pakai `handler.before` 2-step confirmation dengan timeout 60 detik — pola middleware yang tidak ada di arsitektur Marin).
- `.atm` aslinya tidak punya plugin pembelian eksplisit di KannaBot (hanya dikonsumsi di `bank-nabung`/`bank-tarik`) — di Marin, ATM didapat lewat `.craft atm` (sesuai resep yang ditemukan di `rpg-craft.js` aslinya).
- Reward `.adventure` ditambah sedikit drop iron (aslinya tidak ada) — tanpa ini, hasil testing menunjukkan progresi `adventure → craft pickaxe` butuh waktu sangat lama karena harga beli iron jauh lebih mahal dari yang realistis didapat di awal permainan.
- Reward mining disederhanakan (base random, belum dipengaruhi level pet) — sistem pet belum dimigrasikan di tahap ini.

**Belum dimigrasikan (tahap selanjutnya):**
- Sistem pet (cat/dog/fox/horse) — level, exp, feeding, dan pengaruhnya ke reward mining/adventure
- `.dungeon`, `.merampok` (rob), `.bet`, `.open` (buka crate), `.petstore`, `.feed`
- `rpg-cheat-*.js` (tools owner/admin) — sengaja belum dibawa, perlu didiskusikan dulu apakah masih relevan

## File yang Diubah/Ditambah (lanjutan)

| File | Status | Keterangan |
|---|---|---|
| `databases/connector.js` | 🔧 Diubah | Tambah `user.rpg` schema + `ensureRpg()` migrasi otomatis + `User.updateRpg()` |
| `libs/rpg-helper.js` | ✨ Baru | Formula leveling, random helper aman, emoticon, shop price, reward constants |
| `plugins/rpg/*.js` | ✨ Baru (16 file) | Seluruh command RPG tahap 1 |

## Update — Bug Fix Kritis + Migrasi RPG Tahap 2 (Pet & Crate)

### 🐛 Bug Fix: `User.updateRpg()` Diam-Diam Gagal pada User Baru

**Ditemukan saat testing fitur pet** — kemungkinan ini juga akar masalah error `Cannot read properties of undefined (reading 'lastclaim')` yang terjadi di server produksi.

**Akar masalah**: `User.updateRpg(jid, patch)` mencari user dengan `usersDb.data.users.find(...)`. Kalau user **belum pernah** dibuat lewat `findOrCreate` sebelumnya, method ini diam-diam `return null` — update hilang tanpa error, tanpa log, tanpa jejak apapun.

**Fix**: `updateRpg()` sekarang otomatis membuat user baru (lewat `User._make()`) kalau belum ada, sebelum melakukan update — perilaku yang sebenarnya diharapkan semua pemanggil.

**Catatan jujur**: Semua plugin RPG yang saya tulis di tahap 1 sudah konsisten memanggil `findOrCreate` sebelum `updateRpg`, jadi bug ini *seharusnya* tidak ter-trigger lewat jalur command manapun. Tapi karena gejala di server produksi persis mengarah ke pola "field rpg hilang/undefined", dan saya tidak punya akses langsung ke server untuk debug live, fix ini saya pasang sebagai lapis pertahanan tambahan yang menutup kemungkinan penyebabnya — entah dari jalur AI tool, race condition, atau kombinasi keduanya.

**Tindakan yang disarankan**: timpa ulang `databases/connector.js` dan seluruh `plugins/rpg/` di server dengan isi archive ini, lalu restart bot total (bukan cuma hot-reload) untuk memastikan tidak ada state lama yang nyangkut.

### 18. 🐾 Sistem Pet & Crate (Tahap 2)

| Command | Fungsi |
|---|---|
| `.open <crate> [jumlah]` | Buka crate (common/uncommon/mythic/legendary) untuk reward acak, termasuk pet token |
| `.petshop [pet\|petfood]` | Beli pet (cat/dog/horse/fox) pakai pet token, atau petfood pakai money |
| `.feed <pet>` | Kasih makan pet → exp naik → level up otomatis kalau cukup |

**Perubahan dari source asli (disengaja):**
- Bug parsing `count` di `rpg-open.js` asli diperbaiki — source asli salah ambil `count` dari `args[0]` (yang sudah dipakai untuk `type`), bukan `args[1]`.
- Inkonsistensi nama field `catexp` vs `catngexp` di source asli (nambah ke satu field, cek level-up dari field lain — kemungkinan bug di KannaBot sendiri) disatukan jadi satu field konsisten per pet.

## File yang Diubah/Ditambah (lanjutan)

| File | Status | Keterangan |
|---|---|---|
| `databases/connector.js` | 🐛 Fix kritis | `updateRpg()` auto-create user kalau belum ada |
| `plugins/rpg/rpg-open.js` | ✨ Baru | Command `.open` — buka crate |
| `plugins/rpg/rpg-petshop.js` | ✨ Baru | Command `.petshop` — beli pet/petfood |
| `plugins/rpg/rpg-feed.js` | ✨ Baru | Command `.feed` — kasih makan pet |

## Update — Migrasi RPG Tahap 3 (Selesai): Dungeon, Rob, Bet, Cheat

### 19. 🏰 Fitur Lanjutan

| Command | Fungsi |
|---|---|
| `.dungeon` | Risiko/reward tinggi — taruhkan health & sword durability untuk hadiah besar. Butuh sword + armor + health 90+ |
| `.merampok` / `.rob` | Rampok money user lain (tag/reply) — ada kemungkinan gagal & kena denda |
| `.bet` / `.judi` | Taruhan money lawan bot, sistem dadu sederhana |
| `.rpgcheat` | Owner only — tambah resource untuk testing |

**Perubahan besar dari source asli (disengaja):**
- **`.dungeon`** dirombak total. Source asli (~600 baris) adalah sistem room multiplayer 4-pemain dengan state global (`global.dungeon`), `handler.before` middleware, dan WhatsApp button messages (fitur yang sudah **deprecated**, tidak didukung Baileys modern) — plus beberapa bug nyata di source asli (`users[siapa]` salah index, typo variabel `st2`/`str2`). Diganti versi solo-run yang jauh lebih sederhana, tetap dengan konsep risk/reward yang sama, tanpa kerapuhan state management multiplayer.
- **`.merampok`** memperbaiki 2 bug nyata di source asli: (1) rampokan **selalu sukses 100%**, tidak ada chance gagal sama sekali — ditambahkan 50% success rate dengan konsekuensi denda kalau gagal; (2) jumlah curian **tidak dibatasi** oleh uang yang dimiliki korban, bisa membuat saldo korban negatif — sekarang dibatasi `Math.min(victim.money, ...)`.
- **`.bet`** disederhanakan dari pola 2-step confirmation (`handler.before`, timeout 60 detik) jadi instan — konsisten dengan keputusan desain yang sama di `.transfer`.
- **`.rpgcheat`** menggantikan banyak file `cheat-money.js`/`cheat-legendary.js` terpisah (yang masing-masing cuma hardcode 1 item) jadi satu command fleksibel dengan parameter item & jumlah.

### Status Migrasi RPG: SELESAI
Total 23 plugin, mencakup seluruh siklus permainan: gather (adventure) → craft → mining/dungeon → shop/bank → pet → social (transfer/rob/bet) → progress tracking (profile/leaderboard/inventory).

## File yang Diubah/Ditambah (lanjutan)

| File | Status | Keterangan |
|---|---|---|
| `plugins/rpg/rpg-dungeon.js` | ✨ Baru | Command `.dungeon` — dirombak total dari versi multiplayer asli |
| `plugins/rpg/rpg-merampok.js` | ✨ Baru | Command `.merampok`/`.rob` — 2 bug source asli diperbaiki |
| `plugins/rpg/rpg-bet.js` | ✨ Baru | Command `.bet`/`.judi` |
| `plugins/rpg/rpg-cheat.js` | ✨ Baru | Command `.rpgcheat` — owner only, testing |
| `middlewares/validator.js` | 🔧 Diubah | Tambah `cheat` ke `SUBBOT_BLOCKED_KEYWORDS` |

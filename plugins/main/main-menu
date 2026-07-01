/**
 * Marin Bot — Menu Plugin
 * Ported & adapted from KannaBot-V10
 * Versi plain text — tanpa adReply, tanpa thumbnail, kirim sebagai quoted reply biasa
 * Pakai readMore trick untuk collapse teks panjang di WhatsApp
 */

import moment from 'moment-timezone'
import os from 'os'
import config from '../../config.js'
import User from '../../databases/orm/User.js'
import { findLevel, getRoleForLevel } from '../../libs/rpg-helper.js'

// ── readMore trick (U+200E × 4001) ─────────────────────────────────────────
const more = String.fromCharCode(8206)
const readMore = more.repeat(4001)

// ── Format uptime ────────────────────────────────────────────────────────────
function clockString(ms) {
    if (!ms || isNaN(ms)) return '0 H 0 M 0 S'
    const h = Math.floor(ms / 3600000)
    const m = Math.floor(ms / 60000) % 60
    const s = Math.floor(ms / 1000) % 60
    return `${h} H ${m} M ${s} S`
}

// ── Greeting ─────────────────────────────────────────────────────────────────
function ucapan() {
    const h = parseInt(moment.tz('Asia/Jakarta').format('HH'))
    if (h >= 4  && h < 10) return 'Good Morning 🌄'
    if (h >= 10 && h < 15) return 'Good Afternoon ☀️'
    if (h >= 15 && h < 18) return 'Good Afternoon 🌇'
    if (h >= 18)            return 'Good Night 🌙'
    return 'Selamat Dinihari 🌙'
}

// ── Definisi menu per kategori ────────────────────────────────────────────────
const CATEGORIES = [
    {
        tag: 'ai', emoji: '🤖', label: 'AI & ASISTEN',
        cmds: [
            ['.ai / .marin / .tanya [pesan]',    'Chat bebas dengan Marin (teks, gambar, voice note)'],
            ['.ai:flash / .ai:gemma',              'Ganti model AI secara eksplisit'],
            ['.ingat [waktu] [teks]',              'Buat pengingat otomatis'],
        ]
    },
    {
        tag: 'rpg', emoji: '⚔️', label: 'RPG GAMES',
        cmds: [
            ['.profile / .xp',           'Lihat level, EXP progress & role kamu'],
            ['.inventory / .inv',         'Semua item, equipment & cooldown'],
            ['.daily / .weekly / .monthly','Klaim reward berkala'],
            ['.adventure',                'Petualangan — dapat resource awal'],
            ['.mining',                   'Mining — butuh pickaxe'],
            ['.dungeon',                  'Dungeon — butuh sword + armor, reward besar'],
            ['.craft [item]',             'Buat equipment dari resource'],
            ['.repair [item]',            'Perbaiki durability equipment'],
            ['.heal [n]',                 'Pakai potion untuk recover health'],
            ['.shop / .buy / .sell',      'Toko item'],
            ['.bank / .nabung / .tarik',  'Sistem perbankan'],
            ['.transfer [item] [n] @user','Kirim item ke orang lain'],
            ['.merampok / .rob @user',    'Rampok money (ada chance gagal)'],
            ['.bet [n] / .judi',          'Taruhan lawan bot'],
            ['.petshop / .feed [pet]',    'Beli & rawat pet'],
            ['.open [crate]',             'Buka crate → reward acak + pet token'],
            ['.leaderboard / .lb [type]', 'Ranking top 10'],
        ]
    },
    {
        tag: 'game', emoji: '🎮', label: 'MINI GAMES',
        cmds: [
            ['.tekateki',      'Teka-teki — berhadiah XP'],
            ['.asahotak',      'Asah otak / logika'],
            ['.trivia',        'Trivia pengetahuan umum'],
            ['.tebakbendera',  'Tebak bendera negara (emoji)'],
            ['.tebakemoji',    'Tebak arti kombinasi emoji'],
            ['.tebaklirik',    'Tebak judul lagu dari lirik'],
            ['.tebakkata',     'Tebak kata dari deskripsi'],
            ['.tebakkalimat',  'Lengkapi peribahasa'],
            ['.susunkata',     'Susun huruf acak jadi kata'],
            ['.family100',     'Family 100 — semua jawaban'],
            ['.math [level]',  'Soal matematika (easy/medium/hard)'],
            ['[ketik jawaban]', 'Jawab tanpa prefix — blokir AI otomatis'],
        ]
    },
    {
        tag: 'downloader', emoji: '📥', label: 'DOWNLOADER',
        cmds: [
            ['.tiktok / .tt [url]',     'Video TikTok/Douyin tanpa watermark'],
            ['.ig / .instagram [url]',  'Video & foto Instagram'],
            ['.ytmp4 / .ytv [url]',     'Video YouTube'],
            ['.ytmp3 / .yta [url]',     'Audio YouTube (MP3)'],
            ['.yt / .play [url]',       'YouTube multi-format'],
            ['.fb / .facebook [url]',   'Video Facebook'],
            ['.twitter / .x [url]',     'Media Twitter/X'],
            ['.threads [url]',          'Video/gambar Threads'],
            ['.pinterest / .pin [url]', 'Gambar Pinterest'],
            ['.mediafire [url]',        'File Mediafire'],
            ['.mega [url]',             'File Mega.nz'],
        ]
    },
    {
        tag: 'tools', emoji: '🔧', label: 'TOOLS',
        cmds: [
            ['.calc [ekspresi]',       'Kalkulator lengkap (π, e, operator)'],
            ['.translate [teks]',      'Terjemah ke bahasa Indonesia'],
            ['.morse encode/decode',   'Encode/decode kode Morse'],
            ['.style [teks]',          'Gaya teks unik (fullwidth, leet, dll)'],
            ['.base64 encode/decode',  'Encode/decode Base64'],
            ['.ssweb / .ss [url]',     'Screenshot website'],
            ['.upload / .cdn [file]',  'Upload file, dapat link permanen'],
            ['.resi [nomor]',          'Cek resi pengiriman paket'],
            ['.read / .rvo',           'Buka pesan View Once'],
        ]
    },
    {
        tag: 'fun', emoji: '🎉', label: 'FUN',
        cmds: [
            ['.gombal / .rayuan',     'Kirim gombal random'],
            ['.kerang / .8ball',      'Tanya kerang ajaib'],
            ['.apakah [pertanyaan]',  'Jawaban ya/tidak random'],
            ['.how / .seberapa',      'Seberapa persen?'],
            ['.ceksifat @user',       'Cek karakter seseorang'],
            ['.tebakumur @user',      'Tebak umur (hiburan)'],
            ['.joke / .lucu',         'Lelucon & tebakan ringan'],
            ['.bucin',                'Quote bucin/romantis'],
            ['.truth / .dare',        'Pertanyaan truth atau dare'],
            ['.generatenama',         'Nama Indonesia random'],
            ['.afk [alasan]',         'Set status AFK otomatis'],
        ]
    },
    {
        tag: 'anime', emoji: '🌸', label: 'ANIME',
        cmds: [
            ['.waifu / .neko / .shinobu', 'Gambar anime random'],
            ['.megumin / .hug / .pat',    'Ekspresi anime (peluk, tepuk)'],
            ['.cuddle / .kiss / .cry',    'Ekspresi lebih banyak'],
        ]
    },
    {
        tag: 'sticker', emoji: '🎭', label: 'STIKER',
        cmds: [
            ['.sticker / .s',    'Buat stiker dari gambar/video/GIF'],
            ['.toimg / .tovideo','Konversi stiker → gambar/video'],
            ['.brat [teks]',     'Stiker gaya Brat (viral)'],
            ['.qc / .quotly',    'Stiker bubble chat quote'],
            ['.getexif / .exif', 'Info EXIF stiker'],
        ]
    },
    {
        tag: 'search', emoji: '🔍', label: 'SEARCH',
        cmds: [
            ['.ytsearch / .yts [q]', 'Cari video YouTube'],
            ['.pinsearch [q]',       'Cari gambar Pinterest'],
            ['.lirik [judul]',       'Cari lirik lagu'],
            ['.pddikti [nama]',      'Cari data mahasiswa PDDIKTI'],
        ]
    },
    {
        tag: 'group', emoji: '👥', label: 'GROUP',
        cmds: [
            ['.kick / .tendang @user', 'Keluarkan member'],
            ['.add [nomor]',           'Tambah member'],
            ['.promote / .demote',     'Angkat/copot admin'],
            ['.antilink on/off',       'Anti-link grup'],
            ['.tagall / .pengumuman',  'Tag semua member'],
        ]
    },
    {
        tag: 'owner', emoji: '👑', label: 'OWNER',
        cmds: [
            ['.eval [kode]',          'Jalankan kode JavaScript'],
            ['.exec / .shell [cmd]',  'Jalankan shell command'],
            ['.ban / .unban @user',   'Ban/unban user dari bot'],
            ['.addprem / .delprem',   'Kelola user premium'],
            ['.auditlog / .logs',     'Log semua aksi AI & owner'],
            ['.backups / .restore',   'Lihat & pulihkan file backup'],
            ['.approve / .deny [id]', 'Approve/tolak install package'],
            ['.rpgcheat [item] [n]',  'Tambah resource RPG (testing)'],
            ['.cleartmp / .ct',       'Hapus file temporary'],
            ['.poststatus [teks]',    'Upload status WhatsApp'],
        ]
    },
    {
        tag: 'account', emoji: '👤', label: 'AKUN',
        cmds: [
            ['.register / .daftar', 'Daftar ke bot'],
            ['.ping / .p',          'Cek latensi & status bot'],
            ['.menu / .help',       'Tampilkan menu ini'],
        ]
    },
]

// ── Build teks kategori ──────────────────────────────────────────────────────
function buildCategory(cat, prefix = '.') {
    const lines = []
    lines.push(`╭─「 ${cat.emoji} *${cat.label}* 」`)
    for (const [cmd, desc] of cat.cmds) {
        lines.push(`│ ❯ *${cmd}*`)
        lines.push(`│   ${desc}`)
    }
    lines.push(`╰────────────────`)
    return lines.join('\n')
}

export default {
    command: ['menu', 'help', '?'],
    category: 'main',
    description: 'Tampilkan menu Marin Bot.',

    async execute(sock, m, msgData, user) {
        const name    = user?.name || msgData.pushName || 'Kakak'
        const numTag  = `@${msgData.senderJid.split('@')[0]}`
        const isOwner = user?.isOwner || false
        const isPrem  = user?.is_premium || false
        const statusStr = isOwner ? '👑 Developer' : isPrem ? '💎 Premium' : '🌸 Free User'

        // RPG
        const rpgExp   = user?.rpg?.exp   || 0
        const rpgMoney = user?.rpg?.money  || 0
        const rpgLevel = findLevel(rpgExp)
        const rpgRole  = getRoleForLevel(rpgLevel)
        const rpgLimit = user?.limit ?? 0

        // Waktu
        const wib  = moment.tz('Asia/Jakarta').format('HH:mm:ss')
        const d    = new Date()
        const locale = 'id'
        const week = d.toLocaleDateString(locale, { weekday: 'long' })
        const date = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
        const weton = ['Pahing','Pon','Wage','Kliwon','Legi'][Math.floor(d / 86400000) % 5]

        // Uptime
        const uptime = clockString(process.uptime() * 1000)
        const platform = os.platform()
        const botName = config.BOT_NAME || 'Marin'
        const greeting = ucapan()

        // Total registered user
        let totalUser = '?'
        try {
            const allUsers = await User.getAll()
            totalUser = allUsers.length
        } catch (_) {}

        const arg = (msgData.args[0] || '').toLowerCase()

        // ── Tentukan konten ──────────────────────────────────────────
        let menuText = ''

        if (!arg || arg === '404') {
            // Menu utama — info user + kategori
            menuText = [
                `┏━━━━━━━━━━━━━━━━━`,
                `┃ *U S E R  I N F O*`,
                `┣━━━━━━━━━━━━━━━━━`,
                `┃ *Name:* ${name}`,
                `┃ *Tag:* ${numTag}`,
                `┃ *Status:* ${statusStr}`,
                `┃ *Limit:* ${rpgLimit}`,
                `┃ *Money:* ${rpgMoney} 💹`,
                `┃ *Role:* ${rpgRole}`,
                `┃ *Level:* ${rpgLevel}`,
                `┃ *Exp:* ${rpgExp}`,
                `┗━━━━━━━━━━━━━━━━━`,
                ``,
                `┏━━━━━━━━━━━━━━━━━`,
                `┃ *T O D A Y*`,
                `┣━━━━━━━━━━━━━━━━━`,
                `┃ *${greeting}*`,
                `┃ *Days:* ${week} — ${weton}`,
                `┃ *Date:* ${date}`,
                `┃ *Time:* ${wib} WIB`,
                `┗━━━━━━━━━━━━━━━━━`,
                ``,
                `┏━━━━━━━━━━━━━━━━━`,
                `┃ *B O T  I N F O*`,
                `┣━━━━━━━━━━━━━━━━━`,
                `┃ *Bot:* ${botName}`,
                `┃ *Engine:* Gemini AI + MCP`,
                `┃ *Platform:* ${platform} / Node.js`,
                `┃ *Uptime:* ${uptime}`,
                `┃ *Users:* ${totalUser}`,
                `┃ *Prefix:* [ . ]`,
                `┗━━━━━━━━━━━━━━━━━`,
                ``,
                `┏━━━━━━━━━━━━━━━━━`,
                `┃ *K A T E G O R I*`,
                `┣━━━━━━━━━━━━━━━━━`,
                ...CATEGORIES.map(c => `┃ ${c.emoji} *.menu ${c.tag}* — ${c.label}`),
                `┃`,
                `┃ *.menu all* → semua fitur`,
                `┗━━━━━━━━━━━━━━━━━`,
                ``,
                readMore,   // ← readMore trick: teks di bawah ini di-collapse
                `_${botName} — Powered by Gemini AI 🌸_`,
            ].join('\n')

        } else if (arg === 'all') {
            menuText = CATEGORIES.map(buildCategory).join('\n\n')
            menuText += `\n\n${readMore}\n_Total: ${CATEGORIES.reduce((a, c) => a + c.cmds.length, 0)} fitur_`

        } else {
            const found = CATEGORIES.find(c => c.tag === arg || c.label.toLowerCase().includes(arg))
            if (!found) {
                const list = CATEGORIES.map(c => `${c.emoji} .menu ${c.tag}`).join('\n')
                return msgData.reply(`❌ Kategori *${arg}* tidak ditemukan.\n\nKategori tersedia:\n${list}`)
            }
            menuText = buildCategory(found)
            menuText += `\n\n${readMore}`
        }

        await sock.sendMessage(msgData.remoteJid, {
            text: menuText,
            mentions: [msgData.senderJid]
        }, { quoted: m })
    }
}

# 📖 Marin Plugin — Cheatsheet Shorthand

Semua shorthand ini tersedia di setiap plugin secara otomatis.
Parameter plugin: `async execute(sock, m, msgData, user, group)`
- `sock` = conn (sudah diperkaya, bisa pakai `conn.sendFile()` dll)
- `m`    = pesan mentah Baileys (sudah diperkaya dengan shorthand)
- `msgData` = data pesan terstruktur (tetap tersedia seperti biasa)

---

## 📨 Kirim Pesan

```js
// Teks biasa (reply ke m)
await m.reply('Halo!')
await m.reply(`Hasilnya: ${value}`)

// Teks ke JID tertentu
await m.reply('Halo!', '628xxx@s.whatsapp.net')

// Pakai msgData (cara lama, tetap jalan)
await msgData.reply('Halo!')

// conn.reply(jid, teks, quoted)
await conn.reply(m.chat, 'Halo!', m)
await conn.reply(m.chat, 'Tanpa quote')
```

## 📁 Kirim File / Media

```js
// Auto-detect tipe dari buffer/url
await conn.sendFile(m.chat, buffer, 'nama.jpg', 'caption', m)
await conn.sendFile(m.chat, 'https://url.com/img.jpg', '', 'caption', m)
await conn.sendFile(m.chat, '/path/ke/file.mp3', '', '', m)

// Spesifik tipe
await conn.sendImage(m.chat, buffer, 'caption', m)
await conn.sendImage(m.chat, { url: 'https://...' }, 'caption')
await conn.sendVideo(m.chat, buffer, 'caption', m)
await conn.sendAudio(m.chat, buffer, m, false)  // false = bukan PTT
await conn.sendAudio(m.chat, buffer, m, true)   // true  = PTT (voice note)
await conn.sendSticker(m.chat, buffer, m)

// Buffer langsung reply (m.reply otomatis deteksi buffer)
await m.reply(imageBuffer)
await m.reply(videoBuffer)
```

## 📍 Properti m (pesan)

```js
m.chat        // remoteJid   → '628xxx@g.us' atau '628xxx@s.whatsapp.net'
m.sender      // senderJid   → '628xxx@s.whatsapp.net'
m.isGroup     // boolean     → true/false
m.fromMe      // boolean     → pesan dari bot sendiri?
m.text        // isi pesan   → 'halo ini teksnya'
m.name        // pushName    → 'Nama User'
m.mtype       // tipe pesan  → 'imageMessage', 'conversation', dll
m.msg         // unwrapped message object
m.isMedia     // boolean     → ada media?
m.mediaType   // string      → 'imageMessage', 'videoMessage', dll
m.mentionedJid// array JID yang di-mention
m.conn        // sock/conn yang sudah diperkaya
```

## 💬 Quoted Message (m.quoted)

```js
if (m.quoted) {
    m.quoted.text       // teks pesan yang di-quote
    m.quoted.sender     // JID pengirim pesan quoted
    m.quoted.mtype      // tipe pesan quoted
    m.quoted.isMedia    // ada media di quoted?
    m.quoted.caption    // caption jika quoted adalah gambar/video

    // Reply ke pesan quoted
    await m.quoted.reply('Ini balasan ke quoted')

    // Download media dari quoted message
    const buffer = await m.quoted.download()

    // Hapus pesan quoted
    await m.quoted.delete()
}
```

## ⬇️ Download Media

```js
// Download media dari pesan ini
const buffer = await m.download()

// Download dan simpan ke file
const { buffer, filename } = await m.download(true)

// Download media dari quoted
const buffer = await m.quoted.download()
```

## 🎯 Aksi Pesan

```js
// React emoji
await m.react('✅')
await m.react('⏳')
await m.react('❌')

// Hapus pesan
await m.delete()

// Forward pesan
await m.forward('628xxx@s.whatsapp.net')
```

## 👤 conn Helper

```js
// Kirim dari conn
conn.getName('628xxx@s.whatsapp.net')  // → '628xxx' (nomor)
conn.parseMention('@6281234 dan @6285678')  // → ['6281234@s.whatsapp.net', ...]

// React via conn
await conn.react(m, '🔥')
```

## 📦 msgData (tetap tersedia seperti biasa)

```js
msgData.senderJid     // alias m.sender
msgData.remoteJid     // alias m.chat
msgData.isGroup       // alias m.isGroup
msgData.commandName   // nama command (tanpa prefix)
msgData.args          // array argumen
msgData.text          // alias m.text
msgData.isQuoted      // boolean
msgData.quotedMsg     // raw quoted message object
msgData.isMedia       // boolean
msgData.mime          // mimetype
msgData.mentions      // array JID yang di-mention
msgData.pushName      // alias m.name
msgData.reply(text)   // shorthand reply (cara lama, tetap jalan)
msgData.react(emoji)  // shorthand react (cara lama, tetap jalan)
```

## 🏗️ Template Plugin Lengkap

```js
export default {
    command: ['contoh', 'example'],
    category: 'tool',
    description: 'Contoh plugin dengan shorthand gaya KannaBot',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData, user, group) {
        const conn = sock  // conn = sock (sudah diperkaya)

        // Info pengirim
        const nama = m.name          // atau msgData.pushName
        const jid  = m.sender        // atau msgData.senderJid
        const chat = m.chat          // atau msgData.remoteJid

        // Ambil argumen
        const [arg1, ...rest] = msgData.args
        const teks = rest.join(' ')

        // Cek quoted
        if (!m.quoted) return m.reply('Reply ke pesan dulu!')
        const q = m.quoted
        const qteks = q.text
        const qsender = q.sender

        // Download media dari quoted
        if (q.isMedia) {
            await m.react('⏳')
            const buffer = await q.download()
            await conn.sendImage(chat, buffer, 'Ini hasilnya', m)
            await m.react('✅')
        }

        // Reply dengan teks
        await m.reply(`Halo ${nama}! Kamu kirim: ${teks}`)

        // Kirim gambar
        await conn.sendImage(chat, { url: 'https://example.com/img.jpg' }, 'caption', m)

        // Kirim file dari buffer
        const buf = Buffer.from('hello world')
        await conn.sendFile(chat, buf, 'hello.txt', '', m)
    }
}
```

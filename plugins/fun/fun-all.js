const KERANG = ['Mungkin suatu hari','Tidak juga','Tidak keduanya','Kurasa tidak','Ya','Coba tanya lagi','Tidak ada','Pasti iya!','Sangat tidak mungkin','Tanyakan lagi nanti']
const APAKAH = ['Ya','Mungkin iya','Mungkin','Mungkin tidak','Tidak','Tidak mungkin','Sudah pasti!','Tidak sama sekali']
const GOMBAL  = [
    'Kamu tau gak? Kalau aku menghafal lihatnya ke atas, soalnya kalau merem langsung kebayang wajahmu.',
    'Orang kurus itu setia, makan aja tidak pernah nambah apalagi pasangan.',
    'Kamu tu kayak warteg, sederhana namun berkualitas.',
    'Cintaku kepadamu itu bagaikan metabolisme, tidak akan berhenti sampai mati.',
    'Aku hanya ingin hidup cukup. Cukup lihat senyummu setiap hari.',
    'Kalau orang butuh sandang pangan papan, aku butuh kamu, kamu, kamu.',
    'Tahu gak kenapa pelangi cuma setengah? Setengahnya lagi ada di matamu.',
    'Aku rela jadi abang nasi goreng asalkan tiap malam bisa lewat depan rumah kamu.',
    'Kamu kayak parkir di garasi hatiku, aku lupa cara ngusirnya.',
    'Cintaku padamu bagai diare. Tak bisa kutahan, terus keluar begitu saja.',
    'Tanggal merah sekalipun aku tidak libur untuk memikirkan kamu.',
    'Jika kamu tanya berapa kali kamu datang ke pikiranku — cuma sekali. Habisnya, gak pergi-pergi!',
    'Kamu tau gak? Lukisan makin lama makin antik, kalau kamu makin lama makin cantik.',
    'Aku rela dipenjara seumur hidup asalkan pelanggarannya karena mencintaimu.',
]
const SIFAT = ['Penyayang 💕','Pemberani ⚔️','Pemalu 🌸','Humoris 😄','Setia 🤝','Optimis ☀️','Kreatif 🎨','Romantis 💌','Cerdas 🧠','Misterius 🌙','Ambisius 🎯','Baik hati 😇','Supel 🫂','Gigih 💪','Jujur 🫡']
const JOKES  = [
    {soal:'Kenapa matematika buku paling berat?',jawaban:'Karena penuh dengan masalah!'},
    {soal:'Apa bedanya pohon sama telepon?',jawaban:'Pohon ditebang, telepon diangkat.'},
    {soal:'Kenapa kucing tidak bisa main kartu?',jawaban:'Karena selalu ketahuan nyontek!'},
    {soal:'Apa yang makin besar makin kecil?',jawaban:'Lubang!'},
    {soal:'Kenapa buku matematika selalu sedih?',jawaban:'Karena punya banyak masalah.'},
    {soal:'Apa yang hitam di luar, putih di dalam, dan berbahaya?',jawaban:'Hiu yang memakai jas.'},
    {soal:'Kenapa programmer tidak bisa tidur?',jawaban:'Karena ada bug di balik bantal.'},
]
const pick = arr => arr[Math.floor(Math.random() * arr.length)]

export default {
    command: ['kerang','kerangajaib','8ball','apakah','gombal','rayuan','how','seberapa','ceksifat','sifat','tebakumur','umur','joke','lucu'],
    category: 'fun',
    description: 'Fitur fun: kerang ajaib, gombal, seberapa, sifat, tebak umur, joke.',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const { commandName, args, remoteJid, senderJid, mentions } = msgData
        const text = args.join(' ').trim()

        // ── Kerang Ajaib ──
        if (['kerang','kerangajaib','8ball'].includes(commandName)) {
            if (!text) return msgData.reply('Format: .kerang [pertanyaan]\nContoh: .kerang apakah aku beruntung?')
            return msgData.reply(`🐚 *Kerang Ajaib*\n\n_"${text}"_\n\n*Jawaban:* ${pick(KERANG)}`)
        }

        // ── Apakah ──
        if (commandName === 'apakah') {
            if (!text) return msgData.reply('Format: .apakah [pertanyaan]')
            return msgData.reply(`*Pertanyaan:* ${text}\n*Jawaban:* ${pick(APAKAH)}`)
        }

        // ── Gombal ──
        if (['gombal','rayuan'].includes(commandName)) {
            return msgData.reply(`💘 ${pick(GOMBAL)}`)
        }

        // ── How / Seberapa ──
        if (['how','seberapa'].includes(commandName)) {
            if (!text) return msgData.reply('Format: .how [sesuatu]\nContoh: .how ganteng aku?')
            const pct = Math.floor(Math.random() * 101)
            const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10))
            return msgData.reply(`📊 *Seberapa ${text}?*\n\n[${bar}] ${pct}%`)
        }

        // ── Cek Sifat ──
        if (['ceksifat','sifat'].includes(commandName)) {
            const target = mentions?.[0] || senderJid
            const name = target.split('@')[0]
            const picks = [...SIFAT].sort(() => Math.random() - .5).slice(0, 3)
            return sock.sendMessage(remoteJid, {
                text: `✨ *Karakter @${name}:*\n\n${picks.join('\n')}`,
                mentions: [target]
            })
        }

        // ── Tebak Umur ──
        if (['tebakumur','umur'].includes(commandName)) {
            const target = mentions?.[0] || senderJid
            const name = target.split('@')[0]
            const age = Math.floor(Math.random() * 35) + 15
            return sock.sendMessage(remoteJid, {
                text: `🎂 Menurut analisa Marin, umur @${name} adalah *${age} tahun*!\n\n_(Hanya untuk hiburan ya~)_`,
                mentions: [target]
            })
        }

        // ── Joke ──
        if (['joke','lucu'].includes(commandName)) {
            const j = pick(JOKES)
            return msgData.reply(`😄 *Tebakan:*\n${j.soal}\n\n||_${j.jawaban}_||`)
        }
    }
}

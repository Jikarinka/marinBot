const BUCIN = [
    'Aku memilih untuk sendiri, bukan karena menunggu yang sempurna, tetapi butuh yang tak pernah menyerah.',
    'Seorang yang single diciptakan bersama pasangan yang belum ditemukannya.',
    'Jomblo adalah anak muda yang mendahulukan pengembangan pribadinya untuk cinta yang lebih berkelas nantinya.',
    'Aku bukan mencari seseorang yang sempurna, tapi aku mencari orang yang menjadi sempurna berkat kelebihanku.',
    'Cintaku kepadamu itu bagaikan metabolisme, tidak akan berhenti sampai mati.',
    'Aku hanya ingin hidup cukup — cukup lihat senyummu setiap hari.',
    'Bila mencintaimu adalah ilusi, maka izinkan aku berimajinasi selamanya.',
    'Saat aku bersamamu, 1 jam hanya 1 detik. Tapi jika jauh, 1 hari jadi 1 tahun.',
    'Jika kamu jadi senar gitar, aku nggak mau jadi gitarisnya — aku nggak mau mutusin kamu.',
    'Aku ingin menjadi satu-satunya, bukan salah satunya.',
    'Kamu tidak akan pernah jauh dariku. Kemanapun aku pergi kamu selalu ada — di hatiku.',
    'Rindu tidak hanya muncul karena jarak. Tapi juga karena keinginan yang tidak terwujud.',
    'Kalau kamu lagi di AS, Patung Liberty ga akan bawa obor tapi bakal bawa bunga untukmu.',
    'Tanggal merah sekalipun aku tidak libur untuk memikirkan kamu.',
    'Kolak pisang tahu sumedang, walau jarak membentang cintaku takkan pernah hilang.',
    'Tahu gak kenapa pelangi cuma setengah lingkaran? Setengahnya lagi ada di matamu.',
]

const TRUTH = [
    'Pernahkah kamu berbohong ke orang tuamu? Apa yang kamu bohongi?',
    'Apa hal paling memalukan yang pernah kamu lakukan di depan umum?',
    'Siapakah crush pertamamu dan apa yang paling kamu suka darinya?',
    'Pernahkah kamu menangis karena sebuah film atau lagu? Apa filmnya?',
    'Apa kebiasaan paling konyol yang pernah kamu punya?',
    'Pernahkah kamu pura-pura sakit untuk menghindari sesuatu?',
    'Apa hal yang paling kamu sesali dalam hidupmu?',
    'Siapa yang paling sering kamu stalking di media sosial?',
    'Apa nickname paling aneh yang pernah kamu punya?',
    'Pernahkah kamu kirim pesan ke orang yang salah? Apa isinya?',
    'Apa hal terlucunya yang pernah kamu lakuin saat sendirian?',
    'Kalau bisa menghapus satu memori, memori apa yang akan kamu hapus?',
]

const DARE = [
    'Ketik "Aku sayang kamu" dan kirim ke 5 orang pertama di kontakmu!',
    'Ubah status WhatsApp-mu menjadi "Aku mencari cinta sejati" selama 10 menit!',
    'Kirim foto selfie paling konyol yang kamu punya!',
    'Nyanyikan lagu anak-anak secara live di grup ini selama 30 detik!',
    'Kirim voice note bilang "Aku jatuh cinta" dengan nada dramatis!',
    'Tag 3 orang dan bilang mereka adalah trio comedy terbaik!',
    'Tulis puisi pendek (4 baris) tentang nasi goreng sekarang juga!',
    'Kirim meme paling lucu yang ada di galerimu!',
    'Ucapkan ikrar setia ke bot WhatsApp ini lewat voice note!',
    'Foto tangan sambil pose paling dramatic yang bisa kamu lakukan!',
    'Kirim pesan ke grup "Siapa mau jadi teman nonton bareng?" tanpa konteks!',
    'Ganti nama display-mu selama 5 menit dengan nama yang diberikan anggota grup!',
]

const pick = arr => arr[Math.floor(Math.random() * arr.length)]

export default {
    command: ['bucin', 'truth', 'dare'],
    category: 'fun',
    description: 'Quote bucin, pertanyaan truth, atau tantangan dare.',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const { commandName } = msgData

        if (commandName === 'bucin') return msgData.reply(`💕 _"${pick(BUCIN)}"_`)
        if (commandName === 'truth') return msgData.reply(`🤔 *Truth:*\n\n${pick(TRUTH)}`)
        if (commandName === 'dare')  return msgData.reply(`🎯 *Dare:*\n\n${pick(DARE)}`)
    }
}

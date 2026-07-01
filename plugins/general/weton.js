import moment from 'moment-timezone'

export default {
    command: ['weton'],
    category: 'general',
    description: 'Mengetahui weton dan neptu berdasarkan tanggal lahir',
    
    async execute(sock, m, msgData) {
        const { args, remoteJid } = msgData

        if (!args[0]) {
            return await msgData.reply('❌ Mohon masukkan tanggal lahir!\n\nContoh:\n`.weton 1995-08-17`\n`.weton 17-08-1995`')
        }

        // Parsing tanggal
        const dateInput = args[0]
        const date = moment(dateInput, ['YYYY-MM-DD', 'DD-MM-YYYY'], true)

        if (!date.isValid()) {
            return await msgData.reply('❌ Format tanggal tidak valid! Gunakan YYYY-MM-DD atau DD-MM-YYYY.')
        }

        // Data Neptu Hari
        const neptuHari = {
            'Minggu': 5,
            'Senin': 4,
            'Selasa': 3,
            'Rabu': 7,
            'Kamis': 8,
            'Jumat': 6,
            'Sabtu': 9
        }

        // Data Neptu Pasaran
        const neptuPasaran = {
            'Legi': 5,
            'Pahing': 9,
            'Pon': 7,
            'Wage': 4,
            'Kliwon': 8
        }

        // Nama Hari Indonesia
        const hariIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
        
        // Perhitungan Hari
        const hari = hariIndo[date.day()]
        const nHari = neptuHari[hari]

        // Perhitungan Pasaran
        // Referensi: 1 Januari 2024 adalah Senin Pahing
        const refDate = moment('2024-01-01')
        const pasaranList = ['Pahing', 'Pon', 'Wage', 'Kliwon', 'Legi']
        const diffDays = date.diff(refDate, 'days')
        const pasaranIndex = ((diffDays % 5) + 5) % 5
        const pasaran = pasaranList[pasaranIndex]
        const nPasaran = neptuPasaran[pasaran]

        const totalNeptu = nHari + nPasaran

        const caption = `🔮 *HASIL HITUNG WETON* 🔮\n\n` +
                        `📅 *Tanggal:* ${date.format('DD MMMM YYYY')}\n` +
                        `☀️ *Hari:* ${hari} (${nHari})\n` +
                        `🌙 *Pasaran:* ${pasaran} (${nPasaran})\n` +
                        `━━━━━━━━━━━━━━━━━━\n` +
                        `🔢 *Total Neptu:* ${totalNeptu}\n\n` +
                        `_Weton Anda adalah ${hari} ${pasaran}_`

        await msgData.reply(caption)
        await msgData.react('✨')
    }
}

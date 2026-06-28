import axios from 'axios'

export default {
    command: ['crypto', 'kurs', 'price'],
    category: 'general',
    description: 'Cek harga cryptocurrency atau kurs mata uang secara real-time.',
    limit: 0,

    async execute(sock, m, msgData) {
        const { args, commandName, remoteJid } = msgData

        if (!args || args.length === 0) {
            return await msgData.reply(
                `*💰 Currency & Crypto Tracker*\n\n` +
                `• *.crypto <nama/simbol>*\n` +
                `Contoh: .crypto bitcoin atau .crypto btc\n\n` +
                `• *.kurs <base> <target>*\n` +
                `Contoh: .kurs USD IDR\n\n` +
                `_Gunakan nama koin lengkap untuk hasil lebih akurat di crypto._`
            )
        }

        try {
            if (commandName === 'kurs' || args.length >= 2) {
                // Logika Kurs Mata Uang (Fiat)
                const base = args[0].toUpperCase()
                const target = args[1] ? args[1].toUpperCase() : 'IDR'
                
                const response = await axios.get(`https://open.er-api.com/v6/latest/${base}`)
                const rate = response.data.rates[target]

                if (!rate) {
                    return await msgData.reply(`❌ Mata uang *${target}* tidak ditemukan.`)
                }

                await msgData.reply(
                    `*💵 Kurs Mata Uang*\n\n` +
                    `1 ${base} = *${rate.toLocaleString('id-ID')} ${target}*`
                )
            } else {
                // Logika Crypto
                const query = args[0].toLowerCase()
                
                // 1. Cari ID koin di CoinGecko
                const searchRes = await axios.get(`https://api.coingecko.com/api/v3/search?query=${query}`)
                const coin = searchRes.data.coins[0]

                if (!coin) {
                    return await msgData.reply(`❌ Koin *${query}* tidak ditemukan. Coba gunakan nama lengkap (contoh: bitcoin).`)
                }

                const coinId = coin.id
                const coinSymbol = coin.symbol.toUpperCase()

                // 2. Ambil harga berdasarkan ID
                const priceRes = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd,idr`)
                const data = priceRes.data[coinId]

                if (!data) {
                    return await msgData.reply(`❌ Gagal mengambil harga untuk *${coin.name}*.`)
                }

                await msgData.reply(
                    `*🪙 Crypto Price*\n\n` +
                    `Nama: *${coin.name}* (${coinSymbol})\n` +
                    `Harga USD: *$${data.usd.toLocaleString('en-US')}*\n` +
                    `Harga IDR: *Rp${data.idr.toLocaleString('id-ID')}*`
                )
            }
        } catch (error) {
            console.error('[CryptoPlugin] Error:', error)
            await msgData.reply(`❌ Terjadi kesalahan saat mengambil data. Pastikan input benar atau coba lagi nanti.`)
        }
    }
}

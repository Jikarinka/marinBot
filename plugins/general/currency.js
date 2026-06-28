import axios from 'axios'
import moment from 'moment-timezone'

export default {
    command: ['currency', 'crypto', 'price'],
    category: 'general',
    description: 'Track currency exchange rates and cryptocurrency prices.',
    isRegistered: true,
    limit: 1,

    async execute(sock, m, msgData) {
        const { remoteJid, args, commandName } = msgData

        if (commandName === 'currency') {
            if (args.length < 3) {
                return await msgData.reply('❌ Format salah!\nContoh: `.currency USD IDR 10` (Konversi 10 USD ke IDR)')
            }

            const [from, to, amount] = args.map(v => v.toUpperCase())
            const numAmount = parseFloat(amount)

            if (isNaN(numAmount)) {
                return await msgData.reply('❌ Jumlah (amount) harus berupa angka!')
            }

            try {
                await msgData.react('⏳')
                const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`)
                const rate = response.data.rates[to]

                if (!rate) {
                    return await msgData.reply(`❌ Mata uang \`${to}\` tidak ditemukan.`)
                }

                const result = (numAmount * rate).toLocaleString('id-ID', { style: 'currency', currency: to })
                const date = moment().tz('Asia/Jakarta').format('DD MMM YYYY, HH:mm')

                await msgData.reply(`💵 *Currency Converter*\n\nAmount: ${numAmount} ${from}\nRate: 1 ${from} = ${rate} ${to}\nTotal: *${result}*\n\n📅 Update: ${date}`)
                await msgData.react('✅')
            } catch (error) {
                console.error('[CurrencyPlugin] Error:', error)
                await msgData.reply('❌ Gagal mengambil data kurs. Pastikan kode mata uang benar (contoh: USD, IDR, JPY).')
            }
        }

        if (commandName === 'crypto' || commandName === 'price') {
            if (args.length < 1) {
                return await msgData.reply('❌ Masukkan nama koin!\nContoh: `.crypto bitcoin` atau `.crypto ethereum`')
            }

            const coin = args[0].toLowerCase()

            try {
                await msgData.react('⏳')
                const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd,idr`)
                const data = response.data[coin]

                if (!data) {
                    return await msgData.reply(`❌ Koin \`${coin}\` tidak ditemukan di CoinGecko. Coba gunakan nama lengkap (contoh: bitcoin, ethereum, solana).`)
                }

                const priceUsd = data.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                const priceIdr = data.idr.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })
                const date = moment().tz('Asia/Jakarta').format('DD MMM YYYY, HH:mm')

                await msgData.reply(`🪙 *Crypto Tracker*\n\nCoin: *${coin.toUpperCase()}*\nPrice (USD): *${priceUsd}*\nPrice (IDR): *${priceIdr}*\n\n📅 Update: ${date}`)
                await msgData.react('✅')
            } catch (error) {
                console.error('[CryptoPlugin] Error:', error)
                await msgData.reply('❌ Gagal mengambil data crypto. Coba lagi nanti atau cek nama koin.')
            }
        }
    }
}

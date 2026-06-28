import axios from 'axios';

const CATEGORIES = {
    waifu:  { api: 'https://api.waifu.pics/sfw/waifu',   urlKey: 'url' },
    neko:   { api: 'https://api.waifu.pics/sfw/neko',    urlKey: 'url' },
    shinobu:{ api: 'https://api.waifu.pics/sfw/shinobu', urlKey: 'url' },
    megumin:{ api: 'https://api.waifu.pics/sfw/megumin', urlKey: 'url' },
    cuddle: { api: 'https://api.waifu.pics/sfw/cuddle',  urlKey: 'url' },
    hug:    { api: 'https://api.waifu.pics/sfw/hug',     urlKey: 'url' },
    pat:    { api: 'https://api.waifu.pics/sfw/pat',     urlKey: 'url' },
    bully:  { api: 'https://api.waifu.pics/sfw/bully',   urlKey: 'url' },
    kiss:   { api: 'https://api.waifu.pics/sfw/kiss',    urlKey: 'url' },
    cry:    { api: 'https://api.waifu.pics/sfw/cry',     urlKey: 'url' },
}

export default {
    command: ['waifu', 'neko', 'shinobu', 'megumin', 'cuddle', 'hug', 'pat', 'bully', 'kiss', 'cry'],
    category: 'anime',
    description: 'Gambar anime acak. Contoh: .waifu | .neko | .hug | .pat',
    isRegistered: false,
    limit: true,

    async execute(sock, m, msgData) {
        const { commandName, remoteJid } = msgData
        const cfg = CATEGORIES[commandName]
        if (!cfg) return

        try {
            await msgData.react('⏳')
            const { data } = await axios.get(cfg.api, { timeout: 10000 })
            const url = data[cfg.urlKey]
            if (!url) throw new Error('URL tidak ditemukan')

            await sock.sendMessage(remoteJid, {
                image: { url },
                caption: `✨ ${commandName} ~`
            }, { quoted: m })
            await msgData.react('✅')
        } catch (e) {
            await msgData.react('❌')
            await msgData.reply(`❌ Gagal ambil gambar: ${e.message}`)
        }
    }
}

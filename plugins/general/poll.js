export default {
    command: ['poll'],
    category: 'general',
    description: 'Kirim polling ke chat',

    async execute(sock, m, msgData) {
        const { remoteJid, args } = msgData
        const text = args.join(' ')

        if (!text) {
            return await msgData.reply('Format salah! Contoh:\n.poll Pertanyaan? | Pilihan A | Pilihan B')
        }

        const parts = text.split('|').map(p => p.trim())
        const question = parts[0]
        const options = parts.slice(1)

        if (options.length < 2) {
            return await msgData.reply('Minimal harus ada 2 pilihan! Gunakan pemisah "|" (pipe).')
        }

        try {
            await sock.sendMessage(remoteJid, {
                poll: {
                    name: question,
                    values: options,
                    selectableCount: 1
                }
            }, { quoted: m })
            
            await msgData.react('✅')
        } catch (error) {
            console.error('[PollPlugin] Error:', error)
            await msgData.reply(`❌ Gagal mengirim poll: ${error.message}`)
        }
    }
}

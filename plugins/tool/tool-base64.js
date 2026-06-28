export default {
    command: ['base64', 'b64'],
    category: 'tool',
    description: 'Encode/decode base64. Contoh: .base64 encode hello',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [mode, ...rest] = msgData.args
        const text = rest.join(' ').trim()

        if (!mode || !text) {
            return msgData.reply('Format: .base64 [encode|decode] [teks]\nContoh:\n.base64 encode hello\n.base64 decode aGVsbG8=')
        }

        try {
            if (mode === 'encode') {
                const result = Buffer.from(text, 'utf-8').toString('base64')
                return msgData.reply(`*Base64 Encoded:*\n\`\`\`${result}\`\`\``)
            }
            if (mode === 'decode') {
                const result = Buffer.from(text, 'base64').toString('utf-8')
                return msgData.reply(`*Base64 Decoded:*\n${result}`)
            }
            await msgData.reply('Mode: encode atau decode')
        } catch {
            await msgData.reply('❌ Gagal memproses. Pastikan input valid.')
        }
    }
}

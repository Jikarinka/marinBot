export default {
    command: ['calc', 'kalkulator', 'calculate'],
    category: 'tool',
    description: 'Kalkulator ekspresi matematika. Contoh: .calc 5 * (3 + 2)',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const text = msgData.args.join(' ').trim()
        if (!text) return msgData.reply('Format: .calc [ekspresi]\nContoh: .calc 5 * (3 + 2)')

        const sanitized = text
            .replace(/[^0-9\-\/+*×÷πEe().\s]/g, '')
            .replace(/×/g, '*').replace(/÷/g, '/')
            .replace(/π|pi/gi, 'Math.PI').replace(/\be\b/gi, 'Math.E')

        const display = sanitized
            .replace(/Math\.PI/g, 'π').replace(/Math\.E/g, 'e')
            .replace(/\//g, '÷').replace(/\*/g, '×')

        try {
            const result = Function('"use strict"; return (' + sanitized + ')')()
            if (result === undefined || isNaN(result)) throw new Error()
            await msgData.reply(`*${display.trim()}* = _${result}_`)
        } catch {
            await msgData.reply('❌ Ekspresi tidak valid. Hanya angka dan operator +, -, *, /, (, ) yang didukung.')
        }
    }
}

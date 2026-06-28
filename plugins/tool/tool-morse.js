const ENC = {a:'•-',b:'-•••',c:'-•-•',d:'-••',e:'•',f:'••-•',g:'--•',h:'••••',i:'••',j:'•---',k:'-•-',l:'•-••',m:'--',n:'-•',o:'---',p:'•--•',q:'--•-',r:'•-•',s:'•••',t:'-',u:'••-',v:'•••-',w:'•--',x:'-••-',y:'-•--',z:'--••','1':'•----','2':'••---','3':'•••--','4':'••••-','5':'•••••','6':'-••••','7':'--•••','8':'---••','9':'----•','0':'-----','.':'•-•-•-',',':'--••--','?':'••--••'}
const DEC = Object.fromEntries(Object.entries(ENC).map(([k,v]) => [v,k]))

export default {
    command: ['morse', 'morsecode'],
    category: 'tool',
    description: 'Encode/decode morse code. Contoh: .morse encode hello',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [mode, ...rest] = msgData.args
        const text = rest.join(' ').trim()

        if (!mode || !text) return msgData.reply('Format: .morse [encode|decode] [teks]\nContoh:\n.morse encode hello\n.morse decode •- -••')

        if (mode === 'encode') {
            const result = text.toLowerCase().split('').map(c => ENC[c] || c).join(' ')
            return msgData.reply(`*Morse Code:*\n${result}`)
        }
        if (mode === 'decode') {
            const result = text.split(' ').map(c => DEC[c] || '?').join('')
            return msgData.reply(`*Decoded:*\n${result}`)
        }
        await msgData.reply('Mode: encode atau decode')
    }
}

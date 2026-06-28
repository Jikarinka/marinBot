// Transformasi teks ke berbagai gaya visual (full-width, caps-mix, leet, reversed, dll)
// Menggantikan tool-styletext.js dari KannaBot yang bergantung pada situs eksternal qaz.wtf

function fw(t) { return [...t].map(c => c >= '!' && c <= '~' ? String.fromCodePoint(c.charCodeAt(0) - 33 + 0xFF01) : c).join('') }
function rev(t) { return [...t].reverse().join('') }
function leet(t) { return t.replace(/[aeiostzb]/gi, c => ({'a':'4','e':'3','i':'1','o':'0','s':'5','t':'7','z':'2','b':'8','A':'4','E':'3','I':'1','O':'0','S':'5','T':'7','Z':'2','B':'8'}[c] || c)) }
function capsmix(t) { return [...t].map((c,i) => i%2 ? c.toUpperCase() : c.toLowerCase()).join('') }
function spaced(t) { return [...t].join(' ') }
function strike(t) { return [...t].join('̶') + '̶' }
function curly(t) { const m = 'abcdefghijklmnopqrstuvwxyz'; const c = '𝒶𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏'; return [...t.toLowerCase()].map(ch => { const i = m.indexOf(ch); return i >= 0 ? c[i] : ch }).join('') }

const STYLES = [
    ['Fullwidth',  fw],
    ['Reversed',   rev],
    ['Leet',       leet],
    ['Caps Mix',   capsmix],
    ['Spaced',     spaced],
    ['Strikethrough', strike],
    ['Curly',      curly],
]

export default {
    command: ['style', 'styletext'],
    category: 'tool',
    description: 'Ganti gaya penulisan teks. Contoh: .style hello world',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const text = msgData.args.join(' ').trim()
        if (!text) return msgData.reply('Format: .style [teks]\nContoh: .style hello world')

        const results = STYLES.map(([name, fn]) => {
            try { return `*${name}:*\n${fn(text)}` } catch { return null }
        }).filter(Boolean)

        await msgData.reply(results.join('\n\n'))
    }
}

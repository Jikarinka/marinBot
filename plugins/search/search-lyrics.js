import axios from 'axios';

export default {
    command: ['lirik', 'lyrics', 'lyric'],
    category: 'search',
    isRegistered: true,
    limit: 1,
    description: 'Mencari lirik lagu',
    async execute(sock, m, msgData) {
        const text = msgData.args.join(' ');

        if (!text) {
            return sock.sendMessage(msgData.remoteJid, {
                text: `Uwaaa! Kakak mau cari lirik lagu apa? Kasih tahu Marin yaa~ (˶˃ ᵕ ˂˶)\n\nContoh: \`.${msgData.commandName} Seven oops - Orange\``
            }, { quoted: m });
        }

        await sock.sendMessage(msgData.remoteJid, {
            react: { text: '🕓', key: m.key }
        });

        try {
            // lrclib.net — API publik resmi, tanpa API key, tanpa rate limit
            const { data: results } = await axios.get('https://lrclib.net/api/search', {
                params: { q: text },
                headers: { 'User-Agent': 'Marin Bot WhatsApp (https://github.com)' },
                timeout: 15000
            });

            if (!results || results.length === 0) {
                return sock.sendMessage(msgData.remoteJid, {
                    text: `Maafin Marin kak, lirik lagu yang kakak cari nggak ketemu.. (｡T ω T｡)`
                }, { quoted: m });
            }

            const data = results[0];
            const duration = data.duration ? `${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}` : '-';

            const infoText = `
🎵 *LIRIK LAGU* 🎵

• *Judul:* ${data.name}
• *Artis:* ${data.artistName}
• *Album:* ${data.albumName || '-'}
• *Durasi:* ${duration}

*Lyrics:*
${data.plainLyrics || 'Liriknya nggak ada kak.. (╥﹏╥)'}
`.trim();

            await sock.sendMessage(msgData.remoteJid, {
                text: infoText,
            }, { quoted: m });

            await sock.sendMessage(msgData.remoteJid, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Search Lyrics Error:', error);
            await sock.sendMessage(msgData.remoteJid, {
                react: { text: '❌', key: m.key }
            });
            await sock.sendMessage(msgData.remoteJid, {
                text: `Uwaaa gawat! Marin gagal cari lirik lagunya kak.. (╥﹏╥)\n\n*Error:* ${error.message || 'Internal Server Error'}`
            }, { quoted: m });
        }
    }
};

export default {
    command: ['pln', 'cekpln'],
    category: 'tool',
    isRegistered: true,
    limit: 1,
    description: 'Mengecek tagihan PLN pascabayar (saat ini tidak tersedia).',
    async execute(sock, m, msgData) {
        await sock.sendMessage(msgData.remoteJid, {
            text: `Yahh, maaf banget kak! Fitur cek tagihan PLN lagi nggak tersedia nih~ (｡T ω T｡)\n\n` +
                `Situs resmi PLN punya proteksi captcha yang bikin Marin nggak bisa cek otomatis tanpa API resmi berbayar.\n\n` +
                `Kakak bisa cek manual langsung di:\nhttps://web.pln.co.id atau aplikasi PLN Mobile yaa~ 🙏`
        }, { quoted: m });
    }
};

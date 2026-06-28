export default {
    command: ['bapendajabar'],
    category: 'tool',
    isRegistered: true,
    limit: 1,
    description: 'Mengecek data pajak kendaraan Jawa Barat (saat ini tidak tersedia).',
    async execute(sock, m, msgData) {
        await sock.sendMessage(msgData.remoteJid, {
            text: `Yahh, maaf banget kak! Fitur cek pajak Bapenda Jabar lagi nggak tersedia nih~ (｡T ω T｡)\n\n` +
                `Situs resmi Bapenda Jabar punya proteksi yang bikin Marin nggak bisa cek otomatis tanpa API resmi.\n\n` +
                `Kakak bisa cek manual langsung di:\nhttps://bapenda.jabarprov.go.id atau aplikasi Sambara yaa~ 🙏`
        }, { quoted: m });
    }
};

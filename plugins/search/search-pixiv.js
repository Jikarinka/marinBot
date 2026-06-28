export default {
    command: ['pixivsearch', 'pixivs'],
    category: 'search',
    isRegistered: true,
    limit: 1,
    description: 'Mencari gambar di Pixiv (saat ini tidak tersedia tanpa API key resmi).',
    async execute(sock, m, msgData) {
        await sock.sendMessage(msgData.remoteJid, {
            text: `Yahh, maaf banget kak! Pencarian Pixiv butuh login resmi Pixiv yang Marin belum punya nih~ (｡T ω T｡)\n\n` +
                `Tapi kalau kakak udah punya link artwork-nya langsung, Marin bisa download kok pakai:\n` +
                `\`.pixiv <link artwork>\`\n\n` +
                `Contoh: \`.pixiv https://www.pixiv.net/en/artworks/92445569\``
        }, { quoted: m });
    }
};

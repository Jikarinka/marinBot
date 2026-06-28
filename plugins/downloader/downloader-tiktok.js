import axios from 'axios';

export default {
    command: ['tiktok', 'ttdl', 'douyin', 'tt', 'tiktokdl'],
    category: 'downloader',
    isRegistered: true,
    limit: true,
    description: 'Mengunduh video atau gambar dari TikTok/Douyin.',
    async execute(sock, m, msgData) {
        const { args, commandName, remoteJid } = msgData;

        if (args.length === 0) {
            return msgData.reply(`Kakak lupa kasih link TikTok-nya yaa? Contohnya gini: .${commandName} https://www.tiktok.com/@... (˶˃ ᵕ ˂˶)`);
        }

        await msgData.react('⏳');

        try {
            const url = args[0];

            // tikwm.com — API publik gratis tanpa API key, support TikTok & Douyin
            const { data: response } = await axios.get('https://www.tikwm.com/api/', {
                params: { url, hd: 1 }
            });

            if (response.code !== 0 || !response.data) {
                throw new Error(response.msg || "Gagal mendownload video TikTok kak~ (╥﹏╥)");
            }

            const videoData = response.data;
            const hdURL = videoData.hdplay;
            const videoURL = (args[1] === "hd" && hdURL) ? hdURL : videoData.play;

            const author = videoData.author || {};
            const info = `*Title:* ${videoData.title || '-'}\n*Uploader:* ${author.nickname || author.unique_id || "unknown"}\n\n*Statistik:* ✨\n❤️ ${videoData.digg_count ?? 0} | 💬 ${videoData.comment_count ?? 0} | 🔁 ${videoData.share_count ?? 0}`;

            // Jika TikTok berupa koleksi gambar (slideshow)
            if (videoData.images && videoData.images.length > 0) {
                for (let i = 0; i < videoData.images.length; i++) {
                    const caption = i === 0 ? `Ini foto TikTok-nya kak~ (๑>ᴗ<๑)\n\n${info}` : '';
                    await sock.sendMessage(remoteJid, {
                        image: { url: videoData.images[i] },
                        caption: caption
                    }, { quoted: m });
                }
            } else if (videoURL) {
                await sock.sendMessage(remoteJid, {
                    video: { url: videoURL },
                    caption: `Ini videonya buat kakak~ (˶˃ ᵕ ˂˶)\n\n${info}`,
                    mimetype: 'video/mp4'
                }, { quoted: m });
            } else {
                throw new Error("Maafin aku kak, nggak ada video atau gambar yang bisa aku ambil.. (╥﹏╥)");
            }

            await msgData.react('✅');

        } catch (error) {
            console.error('TikTok Downloader Error:', error);
            await msgData.react('❌');
            const errMsg = error.response?.data?.message || error.message;
            await msgData.reply(`Uwaaa gawat! Ada error pas download TikTok: ${errMsg}.. (｡T ω T｡)`);
        }
    }
};

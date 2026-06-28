import axios from 'axios';

export default {
    command: ['mahasiswa', 'pddikti'],
    category: 'search',
    isRegistered: true,
    limit: 1,
    description: 'Mencari data mahasiswa di PDDIKTI',
    async execute(sock, m, msgData) {
        const text = msgData.args.join(' ');

        if (!text) {
            return sock.sendMessage(msgData.remoteJid, {
                text: `Uwaaa! Kakak mau cari mahasiswa siapa? Kasih tahu Marin nama atau NIM-nya yaa~ (˶˃ ᵕ ˂˶)\n\nContoh: \`.${msgData.commandName} Budi Utomo\``
            }, { quoted: m });
        }

        await sock.sendMessage(msgData.remoteJid, {
            react: { text: '🕓', key: m.key }
        });

        try {
            // pddikti.rone.dev — hosted API publik tanpa key untuk data PDDIKTI Kemdikbud
            const { data: res } = await axios.get(`https://pddikti.rone.dev/api/search/mahasiswa/${encodeURIComponent(text)}/`, {
                timeout: 15000
            });
            const data = res?.data;

            if (!Array.isArray(data) || data.length === 0) {
                return sock.sendMessage(msgData.remoteJid, {
                    text: `Maafin Marin kak, data mahasiswa "${text}" nggak ketemu di PDDIKTI.. (｡T ω T｡)`
                }, { quoted: m });
            }

            let message = `🔍 *HASIL PENCARIAN MAHASISWA* 🔍\n\nHasil untuk: "${text}"\n\n`;

            data.forEach((mahasiswa, index) => {
                const nama = mahasiswa.nama || '-';
                const nim = mahasiswa.nim || '-';
                const namaPt = mahasiswa.nama_pt || '-';
                const namaProdi = mahasiswa.nama_prodi || '-';

                message += `${index + 1}. *Nama:* ${nama}\n   *NIM:* ${nim}\n   *PT:* ${namaPt}\n   *Prodi:* ${namaProdi}\n\n`;
            });

            message += `Horeee! Itu tadi data yang Marin temukan kak~ (๑>ᴗ<๑)`;

            await sock.sendMessage(msgData.remoteJid, {
                text: message.trim(),
            }, { quoted: m });

            await sock.sendMessage(msgData.remoteJid, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('PDDIKTI Search Error:', error);
            await sock.sendMessage(msgData.remoteJid, {
                react: { text: '❌', key: m.key }
            });
            await sock.sendMessage(msgData.remoteJid, {
                text: `Uwaaa gawat! Marin gagal cari data mahasiswanya kak.. (╥﹏╥)\n\n*Error:* ${error.message || 'Internal Server Error'}`
            }, { quoted: m });
        }
    }
};

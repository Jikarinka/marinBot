import axios from 'axios';
import config from '../../config.js';

const ekspedisiList = {
    'jne': 'jne', 'pos': 'pos', 'jnt': 'jnt', 'tiki': 'tiki',
    'sicepat': 'sicepat', 'anteraja': 'anteraja', 'wahana': 'wahana',
    'lion-parcel': 'lion', 'ninja': 'ninja', 'sap': 'sap',
};

export default {
    command: ['resi', 'cekresi'],
    category: 'tool',
    isRegistered: true,
    limit: 1,
    description: 'Melacak status pengiriman paket (butuh BINDERBYTE_API_KEY di .env).',
    async execute(sock, m, msgData) {
        const noResi = msgData.args[0];
        const ekspedisi = msgData.args[1] || '';

        if (!noResi) {
            return sock.sendMessage(msgData.remoteJid, {
                text: `Uwaaa! Kakak lupa masukin nomor resinya ya? (｡T ω T｡)\n\nContoh: \`.${msgData.commandName} SPXID054330680586 sicepat\`\n\nJangan lupa kasih tau Marin nomornya yaa~ (๑>ᴗ<๑)`
            }, { quoted: m });
        }

        if (!ekspedisi) {
            const available = Object.keys(ekspedisiList).join(', ');
            return sock.sendMessage(msgData.remoteJid, {
                text: `Kakak perlu sertakan nama ekspedisinya juga yaa~ (｡T ω T｡)\n\n*Contoh:* \`.cekresi ${noResi} jne\`\n\n*Ekspedisi tersedia:* ${available}`
            }, { quoted: m });
        }

        const courierCode = ekspedisiList[ekspedisi.toLowerCase()];
        if (!courierCode) {
            return sock.sendMessage(msgData.remoteJid, {
                text: `Hmm, Marin nggak kenal ekspedisi "${ekspedisi}" kak~\n\n*Ekspedisi tersedia:* ${Object.keys(ekspedisiList).join(', ')}`
            }, { quoted: m });
        }

        const apiKey = config.BINDERBYTE_API_KEY;
        if (!apiKey) {
            return sock.sendMessage(msgData.remoteJid, {
                text: `Yahh, fitur cek resi ini butuh API key dari BinderByte kak~ (｡T ω T｡)\n\n` +
                    `Owner Marin belum setting *BINDERBYTE_API_KEY* di file .env nih.\n` +
                    `Daftar gratis di: https://binderbyte.com lalu isi key-nya ke .env yaa~`
            }, { quoted: m });
        }

        await sock.sendMessage(msgData.remoteJid, { react: { text: '🕓', key: m.key } });

        try {
            const { data: result } = await axios.get('https://api.binderbyte.com/v1/track', {
                params: { api_key: apiKey, courier: courierCode, awb: noResi },
                timeout: 15000
            });

            if (result.status !== 200 || !result.data) {
                throw new Error(result.message || 'Resi nggak ketemu');
            }

            const data = result.data;
            const summary = data.summary || {};
            const history = data.history || [];

            const historyText = history.slice(0, 5).map(item =>
                `• *${item.date}*\n  ${item.desc}`
            ).join('\n\n') || 'Belum ada histori nih kak..';

            const infoText = `
📦 *HASIL PELACAKAN RESI* 📦

No Resi        : \`${summary.awb || noResi}\`
Ekspedisi      : ${(summary.courier || courierCode).toUpperCase()}
Status         : ${summary.status || '-'}
Penerima       : ${summary.receiver || '-'}

🕓 *5 Riwayat Terbaru:*
${historyText}

Horeee! Itu tadi status paket kakak~ Semoga cepet sampe yaa! (๑>ᴗ<๑)
`.trim();

            await sock.sendMessage(msgData.remoteJid, { text: infoText }, { quoted: m });
            await sock.sendMessage(msgData.remoteJid, { react: { text: '✅', key: m.key } });

        } catch (error) {
            console.error('Cek Resi Error:', error);
            await sock.sendMessage(msgData.remoteJid, { react: { text: '❌', key: m.key } });
            await sock.sendMessage(msgData.remoteJid, {
                text: `Uwaaa gawat! Marin nggak nemu resinya kak.. Mungkin nomor atau ekspedisinya salah? (｡T ω T｡)\n\n*Error:* ${error.message}`
            }, { quoted: m });
        }
    }
};

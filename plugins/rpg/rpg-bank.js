import User from '../../databases/orm/User.js';

export default {
    command: ['bank'],
    category: 'rpg',
    description: 'Cek saldo bank & money kamu.',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        const bankPercent = rpg.fullatm > 0 ? Math.round((rpg.bank / rpg.fullatm) * 100) : 0;
        const barLen = 10;
        const filled = Math.round((bankPercent / 100) * barLen);
        const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

        const caption = [
            `╭───「 🏦 *BANK ACCOUNT* 」`,
            `│`,
            `│ 📛 *Nama:* ${user.name || msgData.pushName || 'Unknown'}`,
            `│ 💳 *ATM:* ${rpg.atm > 0 ? `Level ${rpg.atm}` : '✖️ Belum punya (.craft atm)'}`,
            `│`,
            `│ 🏦 *Saldo Bank:* ${rpg.bank} 💲`,
            `│ 📊 Kapasitas: ${bar} ${bankPercent}%`,
            `│ 💰 Maks: ${rpg.fullatm} 💲`,
            `│`,
            `│ 💹 *Money (Cash):* ${rpg.money} 💲`,
            `│ 💎 *Total Aset:* ${rpg.money + rpg.bank} 💲`,
            `╰───────────────`,
        ].join('\n');

        await sock.sendMessage(msgData.remoteJid, {
            text: caption,
            footer: 'Marin Bot 🌸',
            nativeFlow: [
                { text: '💰 Nabung', id: `.nabung ${Math.min(rpg.money, 1000)}` },
                { text: '🏧 Tarik', id: `.tarik 1000` },
                { text: '💸 Transfer', id: '.transfer' },
            ]
        }, { quoted: m });
    }
};

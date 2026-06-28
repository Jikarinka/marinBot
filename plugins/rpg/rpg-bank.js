import User from '../../databases/orm/User.js';

export default {
    command: ['bank'],
    category: 'rpg',
    description: 'Cek saldo bank dan money kamu.',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        const caption = `
*──「 BANK ACCOUNT 」──*
│ 📛 *Nama:* ${user.name || msgData.pushName || 'Tidak diketahui'}
│ 💳 *ATM:* ${rpg.atm > 0 ? 'Level ' + rpg.atm : '✖️ Belum punya'}
│ 🏦 *Bank:* ${rpg.bank} 💲 / ${rpg.fullatm} 💲
│ 💹 *Money:* ${rpg.money} 💲
└──···
        `.trim();

        await msgData.reply(caption);
    }
};

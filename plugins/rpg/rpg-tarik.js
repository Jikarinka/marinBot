import User from '../../databases/orm/User.js';

export default {
    command: ['tarik', 'withdraw'],
    category: 'rpg',
    description: 'Tarik money dari bank. Contoh: .tarik 1000 atau .tarik all',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        if (rpg.atm === 0) {
            return msgData.reply('❌ Kamu belum punya ATM! Beli dulu pakai `.atm`');
        }

        const arg = (msgData.args[0] || '').toLowerCase();
        let count = arg === 'all' ? rpg.bank : parseInt(arg, 10);

        if (!count || isNaN(count) || count <= 0) {
            return msgData.reply('❌ Format salah. Contoh: `.tarik 1000` atau `.tarik all`');
        }

        if (rpg.bank < count) {
            return msgData.reply(`❌ Uang di bank kamu tidak cukup untuk menarik *${count}* 💹\nSaldo bank: *${rpg.bank}* 💹`);
        }

        User.updateRpg(msgData.senderJid, {
            bank: rpg.bank - count,
            money: rpg.money + count
        });

        await msgData.reply(`✅ Sukses menarik *${count}* 💹 dari bank!`);
    }
};

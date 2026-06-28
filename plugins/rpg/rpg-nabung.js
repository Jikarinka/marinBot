import User from '../../databases/orm/User.js';

export default {
    command: ['nabung', 'deposit'],
    category: 'rpg',
    description: 'Simpan money ke bank. Contoh: .nabung 1000 atau .nabung all',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        if (rpg.atm === 0) {
            return msgData.reply('❌ Kamu belum punya ATM! Beli dulu pakai `.atm`');
        }

        const arg = (msgData.args[0] || '').toLowerCase();
        const sisaKapasitas = rpg.fullatm - rpg.bank;

        if (sisaKapasitas <= 0) {
            return msgData.reply('❌ Uang di bank kamu sudah penuh! Upgrade ATM dulu pakai `.atm`');
        }

        let count = arg === 'all'
            ? Math.min(rpg.money, sisaKapasitas)
            : parseInt(arg, 10);

        if (!count || isNaN(count) || count <= 0) {
            return msgData.reply('❌ Format salah. Contoh: `.nabung 1000` atau `.nabung all`');
        }

        count = Math.min(count, sisaKapasitas);

        if (rpg.money < count) {
            return msgData.reply(`❌ Money kamu tidak cukup untuk menabung *${count}* 💹`);
        }

        User.updateRpg(msgData.senderJid, {
            money: rpg.money - count,
            bank: rpg.bank + count
        });

        await msgData.reply(`✅ Sukses menabung *${count}* 💹 ke bank!`);
    }
};

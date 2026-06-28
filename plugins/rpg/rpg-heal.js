import User from '../../databases/orm/User.js';

const HEAL_PER_POTION = 15;

export default {
    command: ['heal'],
    category: 'rpg',
    description: 'Gunakan potion untuk heal. Contoh: .heal 3',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        if (rpg.health >= 100) {
            return msgData.reply('✅ Health kamu sudah penuh!');
        }

        const needed = Math.ceil((100 - rpg.health) / HEAL_PER_POTION);
        const count = Math.max(1, parseInt(msgData.args[0], 10) || needed);

        if (rpg.potion < count) {
            return msgData.reply(
                `❌ Potion kamu kurang! Kamu punya *${rpg.potion}* 🥤, butuh *${count}*.\n` +
                `Beli dulu pakai \`.buy potion ${count - rpg.potion}\``
            );
        }

        const newHealth = Math.min(100, rpg.health + HEAL_PER_POTION * count);

        User.updateRpg(msgData.senderJid, {
            potion: rpg.potion - count,
            health: newHealth
        });

        await msgData.reply(`✅ Berhasil pakai *${count}* 🥤 potion! Health sekarang: *${newHealth}* ❤️`);
    }
};

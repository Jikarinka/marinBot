import User from '../../databases/orm/User.js';
import { emoticon } from '../../libs/rpg-helper.js';

const CHEATABLE = [
    'money', 'bank', 'exp', 'wood', 'rock', 'iron', 'string', 'trash',
    'gold', 'diamond', 'emerald', 'common', 'uncommon', 'mythic', 'legendary',
    'potion', 'pet', 'petFood', 'health'
];

export default {
    command: ['rpgcheat'],
    category: 'rpg',
    description: 'Owner only — tambah resource RPG untuk testing. Contoh: .rpgcheat money 100000',
    isOwner: true,

    async execute(sock, m, msgData) {
        const [item, amountRaw] = msgData.args;
        const type = (item || '').toLowerCase();
        const amount = parseInt(amountRaw, 10);

        if (!CHEATABLE.includes(type) || isNaN(amount)) {
            return msgData.reply(
                `Format: .rpgcheat [item] [jumlah]\nContoh: .rpgcheat money 100000\n\n` +
                `📍 Item: ${CHEATABLE.join(', ')}`
            );
        }

        const targetJid = msgData.mentions?.[0] || msgData.quotedSender || msgData.senderJid;
        const [user] = User.findOrCreate({ where: { jid: targetJid } });

        User.updateRpg(targetJid, { [type]: Math.max(0, (user.rpg[type] || 0) + amount) });

        await msgData.reply(`✅ Berhasil tambah *${amount}* ${emoticon(type)} ${type} untuk @${targetJid.split('@')[0]}`);
    }
};

import User from '../../databases/orm/User.js';
import { emoticon } from '../../libs/rpg-helper.js';

const TRANSFERABLE = [
    'money', 'bank', 'potion', 'trash', 'wood', 'rock', 'string',
    'petFood', 'emerald', 'diamond', 'gold', 'iron',
    'common', 'uncommon', 'mythic', 'legendary'
];

export default {
    command: ['transfer', 'tf'],
    category: 'rpg',
    description: 'Transfer item/money ke user lain. Contoh: .transfer money 1000 @user',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const { args, mentions, quotedSender, senderJid } = msgData;
        const type = (args[0] || '').toLowerCase();

        if (!TRANSFERABLE.includes(type)) {
            return msgData.reply(
                `❌ Format: .transfer [type] [jumlah] [@user]\nContoh: .transfer money 1000 @user\n\n` +
                `📍 Item yang bisa ditransfer:\n${TRANSFERABLE.map(t => `${emoticon(t)} ${t}`).join('\n')}`
            );
        }

        const count = Math.max(1, parseInt(args[1], 10) || 0);
        if (!count) return msgData.reply('❌ Jumlah tidak valid.');

        const targetJid = mentions?.[0] || quotedSender || null;
        if (!targetJid) return msgData.reply('❌ Tag/reply user yang mau dikirimi dulu ya!');
        if (targetJid === senderJid) return msgData.reply('❌ Tidak bisa transfer ke diri sendiri 🙄');

        const [sender] = User.findOrCreate({ where: { jid: senderJid } });
        const [target] = User.findOrCreate({ where: { jid: targetJid } });

        if ((sender.rpg[type] || 0) < count) {
            return msgData.reply(`❌ ${emoticon(type)} ${type} kamu kurang *${count - sender.rpg[type]}* lagi.`);
        }

        User.updateRpg(senderJid, { [type]: sender.rpg[type] - count });
        User.updateRpg(targetJid, { [type]: (target.rpg[type] || 0) + count });

        await sock.sendMessage(msgData.remoteJid, {
            text: `✅ *Transfer berhasil!*\n${emoticon(type)} *${count}* ${type} → @${targetJid.split('@')[0]}`,
            mentions: [targetJid]
        });
    }
};

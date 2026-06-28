import User from '../../databases/orm/User.js';

export default {
    command: ['banuser', 'ban', 'unbanuser', 'unban'],
    category: 'owner',
    isOwner: true,
    description: 'Ban/unban user dari menggunakan bot. Contoh: .ban @user',

    async execute(sock, m, msgData) {
        const { commandName, mentions, quotedSender, senderJid } = msgData;
        const isBan = ['banuser', 'ban'].includes(commandName);

        const targetJid = mentions?.[0] || quotedSender || null;
        if (!targetJid) return msgData.reply(`❌ Tag/reply user yang mau di-${isBan ? 'ban' : 'unban'} dulu!`);
        if (targetJid === senderJid) return msgData.reply('❌ Tidak bisa ban diri sendiri.');

        const [user] = User.findOrCreate({ where: { jid: targetJid } });

        if (isBan && user.is_banned) return msgData.reply(`⚠️ User @${targetJid.split('@')[0]} sudah di-ban sebelumnya.`);
        if (!isBan && !user.is_banned) return msgData.reply(`⚠️ User @${targetJid.split('@')[0]} tidak sedang di-ban.`);

        await user.update({ is_banned: isBan });

        await sock.sendMessage(msgData.remoteJid, {
            text: isBan
                ? `🚫 @${targetJid.split('@')[0]} berhasil di-ban dari bot.`
                : `✅ @${targetJid.split('@')[0]} berhasil di-unban.`,
            mentions: [targetJid]
        });
    }
};

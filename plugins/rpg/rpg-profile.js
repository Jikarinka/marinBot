import User from '../../databases/orm/User.js';
import { findLevel, xpRange, getRoleForLevel } from '../../libs/rpg-helper.js';

export default {
    command: ['profile', 'xp', 'pp'],
    category: 'rpg',
    description: 'Lihat profile level & exp kamu.',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const targetJid = msgData.mentions?.[0] || msgData.quotedSender || msgData.senderJid;
        const isSelf = targetJid === msgData.senderJid;
        const [user] = User.findOrCreate({ where: { jid: targetJid } });
        const { rpg } = user;

        const currentLevel = findLevel(rpg.exp);
        const range = xpRange(currentLevel);
        const progress = rpg.exp - range.min;
        const needed = range.xp;
        const percent = needed > 0 ? Math.min(100, Math.round((progress / needed) * 100)) : 100;

        const barLength = 12;
        const filled = Math.round((percent / 100) * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

        const caption = [
            `╭───「 👤 *PROFILE* 」`,
            `│`,
            `│ 📛 *Nama:* ${user.name || msgData.pushName || 'Unknown'}`,
            `│ 🏅 *Role:* ${getRoleForLevel(currentLevel)}`,
            `│ 📊 *Level:* ${currentLevel}`,
            `│ ✨ *EXP:* ${rpg.exp}`,
            `│ ${bar} ${percent}%`,
            `│ _(${progress}/${needed} menuju level ${currentLevel + 1})_`,
            `│`,
            `│ ❤️ *Health:* ${rpg.health}/100`,
            `│ 💹 *Money:* ${rpg.money}`,
            `│ 🏦 *Bank:* ${rpg.bank}`,
            `╰───────────────`,
        ].join('\n');

        // nativeFlow tombol aksi setelah profile
        return sock.sendMessage(msgData.remoteJid, {
            text: caption,
            footer: 'Marin Bot 🌸',
            nativeFlow: [
                { text: '🎒 Inventory', id: '.inv' },
                { text: '🏆 Leaderboard', id: '.lb' },
                ...(isSelf ? [{ text: '💹 Shop', id: '.shop' }] : [])
            ],
            mentions: [targetJid]
        }, { quoted: m });
    }
};

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
        const [user] = User.findOrCreate({ where: { jid: targetJid } });
        const { rpg } = user;

        const currentLevel = findLevel(rpg.exp);
        const range = xpRange(currentLevel);
        const progress = rpg.exp - range.min;
        const needed = range.xp;
        const percent = needed > 0 ? Math.min(100, Math.round((progress / needed) * 100)) : 100;

        const barLength = 10;
        const filled = Math.round((percent / 100) * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

        const caption = `
*──「 PROFILE 」──*
│ 📛 *Nama:* ${user.name || msgData.pushName || 'Tidak diketahui'}
│ 🏅 *Role:* ${getRoleForLevel(currentLevel)}
│ 📊 *Level:* ${currentLevel}
│ ✨ *EXP:* ${rpg.exp} (${progress}/${needed})
│ ${bar} ${percent}%
│ ❤️ *Health:* ${rpg.health}/100
│ 💹 *Money:* ${rpg.money}
└──···
        `.trim();

        await sock.sendMessage(msgData.remoteJid, {
            text: caption,
            mentions: [targetJid]
        });
    }
};

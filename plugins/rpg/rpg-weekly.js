import User from '../../databases/orm/User.js';
import { WEEKLY_REWARD, COOLDOWNS, checkCooldown, emoticon } from '../../libs/rpg-helper.js';

export default {
    command: ['weekly'],
    category: 'rpg',
    description: 'Klaim reward mingguan (reset tiap 7 hari).',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        const sisaWaktu = checkCooldown(rpg.lastweekly, COOLDOWNS.weekly);
        if (sisaWaktu) {
            return msgData.reply(`⏰ Kamu sudah klaim weekly minggu ini!\nCoba lagi dalam *${sisaWaktu}*`);
        }

        const patch = { lastweekly: Date.now() };
        let text = '';
        for (const [key, val] of Object.entries(WEEKLY_REWARD)) {
            patch[key] = (rpg[key] || 0) + val;
            text += `*+${val}* ${emoticon(key)} ${key}\n`;
        }

        User.updateRpg(msgData.senderJid, patch);

        await msgData.reply(`*──── 『 WEEKLY REWARD 』────*\n\n${text.trim()}`);
    }
};

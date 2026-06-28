import User from '../../databases/orm/User.js';
import { DAILY_REWARD, COOLDOWNS, checkCooldown, emoticon } from '../../libs/rpg-helper.js';

export default {
    command: ['daily', 'claim'],
    category: 'rpg',
    description: 'Klaim reward harian (reset tiap 24 jam).',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        const sisaWaktu = checkCooldown(rpg.lastclaim, COOLDOWNS.daily);
        if (sisaWaktu) {
            return msgData.reply(`⏰ Kamu sudah klaim daily hari ini!\nCoba lagi dalam *${sisaWaktu}*`);
        }

        const patch = { lastclaim: Date.now() };
        let text = '';
        for (const [key, val] of Object.entries(DAILY_REWARD)) {
            patch[key] = (rpg[key] || 0) + val;
            text += `*+${val}* ${emoticon(key)} ${key}\n`;
        }

        User.updateRpg(msgData.senderJid, patch);

        await msgData.reply(`*──── 『 DAILY REWARD 』────*\n\n${text.trim()}`);
    }
};

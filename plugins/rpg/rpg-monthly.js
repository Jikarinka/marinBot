import User from '../../databases/orm/User.js';
import { MONTHLY_REWARD, COOLDOWNS, checkCooldown, emoticon } from '../../libs/rpg-helper.js';

export default {
    command: ['monthly'],
    category: 'rpg',
    description: 'Klaim reward bulanan (reset tiap 30 hari).',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        const sisaWaktu = checkCooldown(rpg.lastmonthly, COOLDOWNS.monthly);
        if (sisaWaktu) {
            return msgData.reply(`⏰ Kamu sudah klaim monthly bulan ini!\nCoba lagi dalam *${sisaWaktu}*`);
        }

        const patch = { lastmonthly: Date.now() };
        let text = '';
        for (const [key, val] of Object.entries(MONTHLY_REWARD)) {
            patch[key] = (rpg[key] || 0) + val;
            text += `*+${val}* ${emoticon(key)} ${key}\n`;
        }

        User.updateRpg(msgData.senderJid, patch);

        await msgData.reply(`*──── 『 MONTHLY REWARD 』────*\n\n${text.trim()}`);
    }
};

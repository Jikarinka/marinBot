import User from '../../databases/orm/User.js';
import { COOLDOWNS, checkCooldown, emoticon, randomInt } from '../../libs/rpg-helper.js';

const COOLDOWN_MS = 300000;

export default {
    command: ['adventure', 'petualang'],
    category: 'rpg',
    description: 'Berpetualang untuk dapat resource awal.',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        if (rpg.health < 80) return msgData.reply(
            `❌ Butuh minimal *80* ❤️ Health untuk adventure!\nHealth kamu: *${rpg.health}*\n\nBeli potion dulu: \`.buy potion 1\` lalu \`.heal\``
        );

        const sisaWaktu = checkCooldown(rpg.lastadventure, COOLDOWN_MS);
        if (sisaWaktu) return msgData.reply(`⏰ Masih capek! Coba lagi dalam *${sisaWaktu}*`);

        const rewards = {
            money: randomInt(201), exp: randomInt(301), trash: randomInt(101),
            potion: randomInt(2), rock: randomInt(2) + 1,
            wood: randomInt(2) + 1, string: randomInt(2) + 1,
        };
        if (randomInt(100) < 40) rewards.iron = randomInt(2) + 1;

        const patch = { lastadventure: Date.now() };
        let gainText = '';
        for (const [key, val] of Object.entries(rewards)) {
            if (!val) continue;
            patch[key] = (rpg[key] || 0) + val;
            gainText += `*+${val}* ${emoticon(key)} ${key}\n`;
        }
        User.updateRpg(msgData.senderJid, patch);

        await sock.sendMessage(msgData.remoteJid, {
            text: `🗺️ *Adventure selesai!*\n\nKamu mendapat:\n${gainText.trim() || '_(tidak ada hasil)_'}`,
            footer: 'Marin Bot 🌸',
            nativeFlow: [
                { text: '🗺️ Adventure Lagi', id: '.adventure' },
                { text: '🎒 Inventory', id: '.inv' },
                { text: '⛏️ Mining', id: '.mining' },
            ]
        }, { quoted: m });
    }
};

import User from '../../databases/orm/User.js';
import { COOLDOWNS, checkCooldown, emoticon, randomInt } from '../../libs/rpg-helper.js';

const COOLDOWN_MS = 300000; // 5 menit, sama seperti mining

export default {
    command: ['adventure', 'petualang'],
    category: 'rpg',
    description: 'Berpetualang untuk dapat resource awal (wood, rock, string, dll). Tidak butuh equipment apapun.',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        if (rpg.health < 80) {
            return msgData.reply(
                `❌ Butuh minimal 80 ❤️ Health untuk adventure!\n` +
                `Beli potion dulu pakai \`.buy potion <jumlah>\`, lalu pakai \`.heal <jumlah>\``
            );
        }

        const sisaWaktu = checkCooldown(rpg.lastadventure, COOLDOWN_MS);
        if (sisaWaktu) {
            return msgData.reply(`⏰ Kamu masih capek berpetualang! Coba lagi dalam *${sisaWaktu}*`);
        }

        const rewards = {
            money: randomInt(201),
            exp: randomInt(301),
            trash: randomInt(101),
            potion: randomInt(2),
            rock: randomInt(2) + 1,
            wood: randomInt(2) + 1,
            string: randomInt(2) + 1,
        };
        // Iron drop kecil — tanpa ini, progresi awal (adventure → craft pickaxe) terlalu lambat
        // karena harga beli iron jauh lebih mahal dari yang bisa didapat lewat adventure.
        if (randomInt(100) < 40) rewards.iron = randomInt(2) + 1;

        const patch = { lastadventure: Date.now() };
        let text = '';
        for (const [key, val] of Object.entries(rewards)) {
            if (!val) continue;
            patch[key] = (rpg[key] || 0) + val;
            text += `*+${val}* ${emoticon(key)} ${key}\n`;
        }

        User.updateRpg(msgData.senderJid, patch);

        await msgData.reply(`🗺️ *Adventure selesai!*\n\nKamu mendapat:\n${text.trim() || '_(tidak ada hasil kali ini)_'}`);
    }
};

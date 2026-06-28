import User from '../../databases/orm/User.js';
import { COOLDOWNS, checkCooldown, emoticon, randomInt } from '../../libs/rpg-helper.js';

export default {
    command: ['mining', 'mine'],
    category: 'rpg',
    description: 'Mining untuk dapat resource (wood, rock, iron, dll). Butuh pickaxe & health minimal 80.',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        if (rpg.health < 80) {
            return msgData.reply(
                `❌ Butuh minimal 80 ❤️ Health untuk mining!\n` +
                `Beli potion dulu pakai \`.buy potion <jumlah>\`, lalu pakai \`.heal <jumlah>\``
            );
        }

        if (rpg.pickaxe === 0) {
            return msgData.reply('❌ Kamu belum punya pickaxe! Beli dulu di `.shop`');
        }

        if (rpg.pickaxedurability <= 0) {
            return msgData.reply('❌ Pickaxe kamu sudah rusak! Perbaiki dulu pakai `.repair pickaxe`');
        }

        const sisaWaktu = checkCooldown(rpg.lastmining, COOLDOWNS.mining);
        if (sisaWaktu) {
            return msgData.reply(`⏰ Kamu masih capek mining! Coba lagi dalam *${sisaWaktu}*`);
        }

        // ── Reward acak (base, belum dipengaruhi pet — ditambahkan di tahap selanjutnya) ──
        const rewards = {
            exp: randomInt(1000),
            trash: randomInt(101),
            string: randomInt(25),
            rock: randomInt(30),
            iron: randomInt(25),
        };
        // Drop rare item dengan chance kecil
        if (randomInt(100) < 15) rewards.diamond = randomInt(4) + 1;
        if (randomInt(100) < 5) rewards.emerald = randomInt(2) + 1;

        const lostHealth = Math.min(rpg.health, 40);
        const lostDurability = Math.min(rpg.pickaxedurability, 10);

        const patch = {
            lastmining: Date.now(),
            health: rpg.health - lostHealth,
            pickaxedurability: rpg.pickaxedurability - lostDurability,
        };

        let gainText = '';
        for (const [key, val] of Object.entries(rewards)) {
            if (!val) continue;
            patch[key] = (rpg[key] || 0) + val;
            gainText += `*+${val}* ${emoticon(key)} ${key}\n`;
        }

        User.updateRpg(msgData.senderJid, patch);

        await msgData.reply(
            `⛏️ *Mining selesai!*\n\n` +
            `Kamu kehilangan:\n*-${lostHealth}* ❤️ health\n*-${lostDurability}* ⛏️ pickaxe durability\n\n` +
            `Kamu mendapat:\n${gainText.trim() || '_(tidak ada hasil kali ini)_'}`
        );
    }
};

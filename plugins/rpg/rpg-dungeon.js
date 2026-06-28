import User from '../../databases/orm/User.js';
import { checkCooldown, emoticon, randomInt, randomFrom } from '../../libs/rpg-helper.js';

const COOLDOWN_MS = 600000; // 10 menit

export default {
    command: ['dungeon'],
    category: 'rpg',
    description: 'Masuk dungeon, taruhkan health & sword durability untuk reward besar. Butuh sword & armor.',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        const missing = [];
        if (rpg.sword === 0) missing.push('⚔️ sword (`.craft sword`)');
        if (rpg.armor === 0) missing.push('🥼 armor (`.craft armor`)');
        if (rpg.health < 90) missing.push('❤️ health minimal 90 (`.heal`)');

        if (missing.length) {
            return msgData.reply(`❌ Sebelum masuk dungeon, kamu butuh:\n${missing.join('\n')}`);
        }

        const sisaWaktu = checkCooldown(rpg.lastdungeon, COOLDOWN_MS);
        if (sisaWaktu) {
            return msgData.reply(`⏰ Kamu masih lelah dari dungeon terakhir! Coba lagi dalam *${sisaWaktu}*`);
        }

        // ── Risiko: kehilangan health & sword durability ──
        const lostHealth = randomInt(101);
        const lostSwordDurability = randomInt(50);

        // ── Reward ──
        const rewards = {
            money: randomInt(1001),
            exp: randomInt(3001),
            trash: randomInt(1001),
            potion: randomInt(5),
            iron: randomInt(10),
            wood: randomInt(12),
            rock: randomInt(10),
            string: randomInt(5),
        };
        if (randomInt(100) < 30) rewards.diamond = randomFrom([1, 1, 1, 5, 3]);
        if (randomInt(100) < 25) rewards.common = randomFrom([1, 2, 3, 4]);
        if (randomInt(100) < 15) rewards.uncommon = randomFrom([1, 2, 3]);
        if (randomInt(100) < 8) rewards.mythic = 1;
        if (randomInt(100) < 4) { rewards.legendary = 1; rewards.pet = randomInt(3) + 1; }

        const patch = {
            lastdungeon: Date.now(),
            health: Math.max(0, rpg.health - lostHealth),
            sworddurability: Math.max(0, rpg.sworddurability - lostSwordDurability),
        };

        let brokenSwordText = '';
        if (patch.sworddurability === 0) {
            patch.sword = Math.max(0, rpg.sword - 1);
            brokenSwordText = patch.sword === 0
                ? '\n\n💔 Sword kamu hancur total! Craft ulang pakai `.craft sword`'
                : '\n\n⚠️ Sword durability habis, level sword turun 1.';
        }

        let gainText = '';
        for (const [key, val] of Object.entries(rewards)) {
            if (!val) continue;
            patch[key] = (rpg[key] || 0) + val;
            gainText += `*+${val}* ${emoticon(key)} ${key}\n`;
        }

        User.updateRpg(msgData.senderJid, patch);

        let warnText = '';
        if (patch.health === 0) warnText += '\n\n💀 Health kamu habis! Heal dulu pakai `.heal`';

        await msgData.reply(
            `🏰 *Dungeon selesai!*\n\n` +
            `Kamu kehilangan:\n*-${lostHealth}* ❤️ health\n*-${lostSwordDurability}* ⚔️ sword durability\n\n` +
            `Kamu mendapat:\n${gainText.trim()}${brokenSwordText}${warnText}`
        );
    }
};

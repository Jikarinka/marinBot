import User from '../../databases/orm/User.js';
import { COOLDOWNS, checkCooldown, emoticon, randomInt } from '../../libs/rpg-helper.js';

export default {
    command: ['mining', 'mine'],
    category: 'rpg',
    description: 'Mining untuk dapat resource. Butuh pickaxe & health min 80.',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        if (rpg.health < 80) return msgData.reply(`❌ Butuh minimal *80* ❤️ Health! Kamu punya: *${rpg.health}*`);
        if (rpg.pickaxe === 0) return msgData.reply('❌ Belum punya pickaxe! Craft dulu: `.craft pickaxe`');
        if (rpg.pickaxedurability <= 0) return msgData.reply('❌ Pickaxe rusak! Perbaiki dulu: `.repair pickaxe`');

        const sisaWaktu = checkCooldown(rpg.lastmining, COOLDOWNS.mining);
        if (sisaWaktu) return msgData.reply(`⏰ Masih capek mining! Coba lagi dalam *${sisaWaktu}*`);

        const rewards = {
            exp: randomInt(1000), trash: randomInt(101),
            string: randomInt(25), rock: randomInt(30), iron: randomInt(25),
        };
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

        const warnDurability = patch.pickaxedurability <= 5 ? '\n\n⚠️ Durability pickaxe hampir habis! `.repair pickaxe`' : '';
        const warnHealth = patch.health < 20 ? '\n\n💔 Health kamu kritis! `.heal` segera!' : '';

        await sock.sendMessage(msgData.remoteJid, {
            text: [
                `⛏️ *Mining selesai!*`,
                ``,
                `Kehilangan:\n*-${lostHealth}* ❤️ health | *-${lostDurability}* ⛏️ durability`,
                ``,
                `Didapat:\n${gainText.trim() || '_(tidak ada)_'}`,
                warnDurability, warnHealth
            ].join('\n').trim(),
            footer: 'Marin Bot 🌸',
            nativeFlow: [
                { text: '⛏️ Mining Lagi', id: '.mining' },
                { text: '🎒 Inventory', id: '.inv' },
                { text: '💊 Heal', id: '.heal 1' },
            ]
        }, { quoted: m });
    }
};

import User from '../../databases/orm/User.js';
import { checkCooldown, emoticon, randomInt, randomFrom } from '../../libs/rpg-helper.js';

const COOLDOWN_MS = 600000;

export default {
    command: ['dungeon'],
    category: 'rpg',
    description: 'Masuk dungeon untuk reward besar. Butuh sword & armor.',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        const missing = [];
        if (rpg.sword === 0) missing.push('⚔️ sword — `.craft sword`');
        if (rpg.armor === 0) missing.push('🥼 armor — `.craft armor`');
        if (rpg.health < 90) missing.push(`❤️ health min 90 (sekarang: ${rpg.health}) — \`.heal\``);

        if (missing.length) return msgData.reply(`❌ *Sebelum masuk dungeon, kamu butuh:*\n${missing.join('\n')}`);

        const sisaWaktu = checkCooldown(rpg.lastdungeon, COOLDOWN_MS);
        if (sisaWaktu) return msgData.reply(`⏰ Masih lelah dari dungeon! Coba lagi dalam *${sisaWaktu}*`);

        const lostHealth = randomInt(101);
        const lostSwordDurability = randomInt(50);

        const rewards = {
            money: randomInt(1001), exp: randomInt(3001), trash: randomInt(1001),
            potion: randomInt(5), iron: randomInt(10), wood: randomInt(12),
            rock: randomInt(10), string: randomInt(5),
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

        let brokenText = '';
        if (patch.sworddurability === 0) {
            patch.sword = Math.max(0, rpg.sword - 1);
            brokenText = patch.sword === 0
                ? '\n\n💔 Sword *hancur total*! `.craft sword` untuk buat baru'
                : '\n\n⚠️ Sword durability habis, level turun 1';
        }

        let gainText = '';
        const rareGain = [];
        const RARE = ['diamond', 'mythic', 'emerald', 'legendary', 'pet'];
        for (const [key, val] of Object.entries(rewards)) {
            if (!val) continue;
            patch[key] = (rpg[key] || 0) + val;
            if (RARE.includes(key)) rareGain.push(`*+${val}* ${emoticon(key)} ${key}`);
            else gainText += `*+${val}* ${emoticon(key)} ${key}\n`;
        }
        User.updateRpg(msgData.senderJid, patch);

        const deadText = patch.health === 0 ? '\n\n💀 *Health habis!* `.heal` segera!' : '';

        await sock.sendMessage(msgData.remoteJid, {
            text: [
                `🏰 *Dungeon selesai!*`,
                ``,
                `Kehilangan:\n*-${lostHealth}* ❤️ health | *-${lostSwordDurability}* ⚔️ durability`,
                ``,
                `Didapat:\n${gainText.trim() || '_(tidak ada)_'}`,
                rareGain.length ? `\n✨ *Item Langka!*\n${rareGain.join('\n')}` : '',
                brokenText, deadText
            ].join('\n').trim(),
            footer: 'Marin Bot 🌸',
            nativeFlow: [
                { text: '🏰 Dungeon Lagi', id: '.dungeon' },
                { text: '🎁 Buka Crate', id: '.open common 1' },
                { text: '🎒 Inventory', id: '.inv' },
                { text: '💊 Heal', id: '.heal 1' },
            ]
        }, { quoted: m });
    }
};

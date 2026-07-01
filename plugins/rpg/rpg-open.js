import User from '../../databases/orm/User.js';
import { emoticon, randomInt, randomFrom } from '../../libs/rpg-helper.js';
import { sendSmartList } from '../../libs/message-builder.js';

const CRATE_REWARDS = {
    common: {
        money: () => randomInt(101), exp: () => randomInt(201), trash: () => randomInt(11),
        potion: () => randomFrom([0, 1, 0, 1, 0, 0, 0, 0, 0]),
        common: () => randomFrom([0, 1, 0, 1, 0, 0, 0, 0, 0, 0]),
        uncommon: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    },
    uncommon: {
        money: () => randomInt(201), exp: () => randomInt(401), trash: () => randomInt(31),
        potion: () => randomFrom([0, 1, 0, 0, 0, 0, 0]),
        diamond: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        common: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0]),
        uncommon: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0, 0, 0]),
        mythic: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        wood: () => randomFrom([0, 1, 0, 0, 0, 0]), rock: () => randomFrom([0, 1, 0, 0, 0, 0]),
        string: () => randomFrom([0, 1, 0, 0, 0, 0]),
    },
    mythic: {
        money: () => randomInt(301), exp: () => randomInt(551), trash: () => randomInt(61),
        potion: () => randomFrom([0, 1, 0, 0, 0, 0]),
        emerald: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        diamond: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0, 0, 0]),
        gold: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0, 0]),
        iron: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0]),
        common: () => randomFrom([0, 1, 0, 0, 0, 0]), uncommon: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0]),
        mythic: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0, 0, 0]),
        legendary: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        wood: () => randomFrom([0, 1, 0, 0, 0]), rock: () => randomFrom([0, 1, 0, 0, 0]),
        string: () => randomFrom([0, 1, 0, 0, 0]),
    },
    legendary: {
        money: () => randomInt(401), exp: () => randomInt(601), trash: () => randomInt(101),
        potion: () => randomFrom([0, 1, 0, 0, 0]),
        emerald: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0, 0, 0]),
        diamond: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0, 0]),
        gold: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0]),
        iron: () => randomFrom([0, 1, 0, 0, 0, 0, 0]),
        common: () => randomFrom([0, 1, 0, 0]), uncommon: () => randomFrom([0, 1, 0, 0, 0, 0]),
        mythic: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0, 0]),
        legendary: () => randomFrom([0, 1, 0, 0, 0, 0, 0, 0, 0, 0]),
        wood: () => randomFrom([0, 1, 0, 0]), rock: () => randomFrom([0, 1, 0, 0]),
        string: () => randomFrom([0, 1, 0, 0]),
    },
};

const CRATE_DESC = {
    common: 'Drop biasa, reward standar',
    uncommon: 'Drop lebih baik, ada chance diamond',
    mythic: 'Drop langka, chance emerald & gold',
    legendary: 'Drop terbaik, reward maksimal'
};
const RARE_ITEMS = ['diamond', 'mythic', 'emerald', 'legendary'];

export default {
    command: ['open', 'buka', 'gacha'],
    category: 'rpg',
    description: 'Buka crate untuk reward acak. Contoh: .open common 5',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const type = (msgData.args[0] || '').toLowerCase();
        const table = CRATE_REWARDS[type];

        if (!table) {
            const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
            const { rpg } = user;

            const sections = [{
                title: '🎁 Pilih Crate yang ingin dibuka',
                rows: Object.keys(CRATE_REWARDS).map(c => ({
                    title: `${emoticon(c)} ${c.charAt(0).toUpperCase() + c.slice(1)} — ${rpg[c] || 0}x dimiliki`,
                    description: CRATE_DESC[c],
                    rowId: `.open ${c} 1`
                }))
            }];

            return sendSmartList(sock, msgData, m, {
                text: `🎁 *Buka Crate*\n\nPilih crate yang ingin dibuka!\n_(default 1 crate, edit command untuk lebih banyak)_`,
                title: '🎁 Gacha Crate',
                buttonText: '🎰 Pilih Crate',
                sections
            });
        }

        const count = Math.max(1, Math.min(parseInt(msgData.args[1], 10) || 1, 1000));
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        if ((rpg[type] || 0) < count) return msgData.reply(`❌ Crate ${emoticon(type)} ${type} kamu hanya *${rpg[type] || 0}*, kurang untuk buka *${count}*.`);

        const totalReward = {};
        for (let i = 0; i < count; i++) {
            for (const [item, rollFn] of Object.entries(table)) {
                const val = rollFn();
                if (val) totalReward[item] = (totalReward[item] || 0) + val;
            }
        }

        const patch = { [type]: rpg[type] - count };
        for (const [item, val] of Object.entries(totalReward)) patch[item] = (rpg[item] || 0) + val;
        User.updateRpg(msgData.senderJid, patch);

        const normalItems = Object.entries(totalReward).filter(([k]) => !RARE_ITEMS.includes(k));
        const rareItems = Object.entries(totalReward).filter(([k]) => RARE_ITEMS.includes(k));

        const text = [
            `🎁 Membuka *${count}* ${emoticon(type)} *${type}* crate...`,
            ``,
            normalItems.map(([k, v]) => `*+${v}* ${emoticon(k)} ${k}`).join('\n') || '_(tidak ada)_',
            rareItems.length ? `\n✨ *RARE!*\n${rareItems.map(([k, v]) => `🌟 *+${v}* ${emoticon(k)} ${k}`).join('\n')}` : ''
        ].join('\n').trim();

        await sock.sendMessage(msgData.remoteJid, {
            text,
            footer: 'Marin Bot 🌸',
            nativeFlow: [
                { text: `🎁 Buka Lagi`, id: `.open ${type} ${count}` },
                { text: '🎒 Inventory', id: '.inv' },
                { text: '🏆 Leaderboard', id: '.lb' },
            ]
        }, { quoted: m });
    }
};

import User from '../../databases/orm/User.js';

const RECIPES = {
    pickaxe: {
        cost: { wood: 10, rock: 5, iron: 5, string: 20 },
        ownField: 'pickaxe', durabilityField: 'pickaxedurability', startDurability: 40,
        emoji: '⛏️'
    },
    sword: {
        cost: { wood: 10, iron: 15 },
        ownField: 'sword', durabilityField: 'sworddurability', startDurability: 40,
        emoji: '⚔️'
    },
    fishingrod: {
        cost: { wood: 10, iron: 2, string: 20 },
        ownField: 'fishingrod', durabilityField: 'fishingroddurability', startDurability: 40,
        emoji: '🎣'
    },
    armor: {
        cost: { iron: 30, emerald: 1, diamond: 5 },
        ownField: 'armor', durabilityField: 'armordurability', startDurability: 50,
        emoji: '🥼'
    },
    atm: {
        cost: { emerald: 3, diamond: 6, money: 10000 },
        ownField: 'atm', startValue: 1,
        emoji: '💳'
    },
};

export default {
    command: ['craft'],
    category: 'rpg',
    description: 'Craft equipment (pickaxe, sword, fishingrod, armor, atm) dari resource hasil adventure/mining.',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const type = (msgData.args[0] || '').toLowerCase();
        const recipe = RECIPES[type];

        if (!recipe) {
            return msgData.reply(
                `*「 CRAFT 」*\n\n` +
                `▧ pickaxe ⛏️ — 10 wood, 5 rock, 5 iron, 20 string\n` +
                `▧ sword ⚔️ — 10 wood, 15 iron\n` +
                `▧ fishingrod 🎣 — 10 wood, 2 iron, 20 string\n` +
                `▧ armor 🥼 — 30 iron, 1 emerald, 5 diamond\n` +
                `▧ atm 💳 — 10.000 money, 3 emerald, 6 diamond\n\n` +
                `Contoh: \`.craft pickaxe\`\n\n` +
                `_Tip: belum punya resource? Coba \`.adventure\` dulu buat dapat wood/rock/string awal._`
            );
        }

        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        if (rpg[recipe.ownField] > 0) {
            return msgData.reply(`✅ Kamu sudah punya ${type}!`);
        }

        const missing = Object.entries(recipe.cost).filter(([item, amt]) => (rpg[item] || 0) < amt);
        if (missing.length) {
            const list = missing.map(([item, amt]) => `${item}: butuh ${amt}, kamu punya ${rpg[item] || 0}`).join('\n');
            return msgData.reply(`❌ Bahan tidak cukup!\n${list}`);
        }

        const patch = {};
        for (const [item, amt] of Object.entries(recipe.cost)) {
            patch[item] = rpg[item] - amt;
        }
        patch[recipe.ownField] = recipe.startValue || 1;
        if (recipe.durabilityField) patch[recipe.durabilityField] = recipe.startDurability;

        User.updateRpg(msgData.senderJid, patch);

        await msgData.reply(`✅ Sukses craft 1 ${type} ${recipe.emoji}!`);
    }
};

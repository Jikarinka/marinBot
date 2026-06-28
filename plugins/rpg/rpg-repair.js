import User from '../../databases/orm/User.js';

const RECIPES = {
    pickaxe: { cost: { wood: 5, rock: 3, iron: 3, diamond: 1 }, durabilityField: 'pickaxedurability', ownField: 'pickaxe' },
    sword:   { cost: { wood: 5, iron: 9, diamond: 1 },          durabilityField: 'sworddurability',   ownField: 'sword' },
    armor:   { cost: { iron: 15, diamond: 3 },                  durabilityField: 'armordurability',   ownField: 'armor' },
};

export default {
    command: ['repair'],
    category: 'rpg',
    description: 'Perbaiki durability equipment. Contoh: .repair pickaxe',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const type = (msgData.args[0] || '').toLowerCase();
        const recipe = RECIPES[type];

        if (!recipe) {
            return msgData.reply(
                `*「 REPAIR 」*\n` +
                `▧ pickaxe ⛏️ — 5 wood, 3 rock, 3 iron, 1 diamond\n` +
                `▧ sword ⚔️ — 5 wood, 9 iron, 1 diamond\n` +
                `▧ armor 🥼 — 15 iron, 3 diamond\n\n` +
                `Contoh: \`.repair pickaxe\``
            );
        }

        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        if (rpg[recipe.ownField] === 0) {
            return msgData.reply(`❌ Kamu belum punya ${type}!`);
        }
        if (rpg[recipe.durabilityField] > 99) {
            return msgData.reply(`✅ ${type} kamu belum rusak, durability masih penuh.`);
        }

        const missing = Object.entries(recipe.cost).filter(([item, amt]) => (rpg[item] || 0) < amt);
        if (missing.length) {
            const list = missing.map(([item, amt]) => `${item}: butuh ${amt}, kamu punya ${rpg[item] || 0}`).join('\n');
            return msgData.reply(`❌ Bahan tidak cukup!\n${list}`);
        }

        const patch = { [recipe.durabilityField]: 100 };
        for (const [item, amt] of Object.entries(recipe.cost)) {
            patch[item] = rpg[item] - amt;
        }

        User.updateRpg(msgData.senderJid, patch);

        await msgData.reply(`✅ Berhasil memperbaiki ${type}! Durability kembali 100.`);
    }
};

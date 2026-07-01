import User from '../../databases/orm/User.js';
import { sendSmartList } from '../../libs/message-builder.js';

const RECIPES = {
    pickaxe: { cost: { wood: 5, rock: 3, iron: 3, diamond: 1 }, durabilityField: 'pickaxedurability', ownField: 'pickaxe', emoji: '⛏️' },
    sword:   { cost: { wood: 5, iron: 9, diamond: 1 },          durabilityField: 'sworddurability',   ownField: 'sword',   emoji: '⚔️' },
    armor:   { cost: { iron: 15, diamond: 3 },                  durabilityField: 'armordurability',   ownField: 'armor',   emoji: '🥼' },
};

const formatCost = (cost) => Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(', ');

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
            const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
            const { rpg } = user;

            const sections = [{
                title: '🔧 Pilih Equipment yang ingin di-Repair',
                rows: Object.entries(RECIPES).map(([k, r]) => {
                    const durability = rpg[r.durabilityField] ?? 0;
                    const own = rpg[r.ownField] > 0;
                    return {
                        title: `${r.emoji} ${k.charAt(0).toUpperCase() + k.slice(1)} ${own ? `| Durability: ${durability}` : '| Belum punya'}`,
                        description: `Bahan: ${formatCost(r.cost)}`,
                        rowId: `.repair ${k}`
                    };
                })
            }];

            return sendSmartList(sock, msgData, m, {
                text: `🔧 *Repair Equipment*\n\nPilih equipment yang ingin kamu perbaiki.\n_Semua equipment akan kembali ke durability 100._`,
                title: '🔧 Repair',
                buttonText: '⚙️ Pilih Equipment',
                sections
            });
        }

        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        if (rpg[recipe.ownField] === 0) return msgData.reply(`❌ Kamu belum punya *${type}*!`);
        if (rpg[recipe.durabilityField] > 99) return msgData.reply(`✅ *${type}* kamu masih penuh, belum perlu direpair.`);

        const missing = Object.entries(recipe.cost).filter(([item, amt]) => (rpg[item] || 0) < amt);
        if (missing.length) {
            const list = missing.map(([item, amt]) => `• ${item}: butuh *${amt}*, punya *${rpg[item] || 0}*`).join('\n');
            return msgData.reply(`❌ *Bahan tidak cukup!*\n\n${list}`);
        }

        const patch = { [recipe.durabilityField]: 100 };
        for (const [item, amt] of Object.entries(recipe.cost)) {
            patch[item] = rpg[item] - amt;
        }

        User.updateRpg(msgData.senderJid, patch);
        await msgData.reply(`✅ *${recipe.emoji} ${type}* berhasil diperbaiki!\nDurability kembali ke *100*`);
    }
};

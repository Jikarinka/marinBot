import User from '../../databases/orm/User.js';
import { sendSmartList } from '../../libs/message-builder.js';

const RECIPES = {
    pickaxe: {
        cost: { wood: 10, rock: 5, iron: 5, string: 20 },
        ownField: 'pickaxe', durabilityField: 'pickaxedurability', startDurability: 40,
        emoji: '⛏️', desc: 'Untuk mining resource'
    },
    sword: {
        cost: { wood: 10, iron: 15 },
        ownField: 'sword', durabilityField: 'sworddurability', startDurability: 40,
        emoji: '⚔️', desc: 'Untuk masuk dungeon'
    },
    fishingrod: {
        cost: { wood: 10, iron: 2, string: 20 },
        ownField: 'fishingrod', durabilityField: 'fishingroddurability', startDurability: 40,
        emoji: '🎣', desc: 'Untuk fishing'
    },
    armor: {
        cost: { iron: 30, emerald: 1, diamond: 5 },
        ownField: 'armor', durabilityField: 'armordurability', startDurability: 50,
        emoji: '🥼', desc: 'Pelindung di dungeon'
    },
    atm: {
        cost: { emerald: 3, diamond: 6, money: 10000 },
        ownField: 'atm', startValue: 1,
        emoji: '💳', desc: 'Buka akses bank'
    },
};

const formatCost = (cost) => Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(', ');

export default {
    command: ['craft'],
    category: 'rpg',
    description: 'Craft equipment dari resource. Contoh: .craft pickaxe',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const type = (msgData.args[0] || '').toLowerCase();
        const recipe = RECIPES[type];

        if (!recipe) {
            const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
            const { rpg } = user;

            const sections = [{
                title: '🔨 Pilih Item yang ingin di-Craft',
                rows: Object.entries(RECIPES).map(([k, r]) => ({
                    title: `${r.emoji} ${k.charAt(0).toUpperCase() + k.slice(1)}`,
                    description: `${r.desc} | Bahan: ${formatCost(r.cost)} | ${rpg[r.ownField] > 0 ? '✅ Sudah punya' : '🔧 Belum craft'}`,
                    rowId: `.craft ${k}`
                }))
            }];

            return sendSmartList(sock, msgData, m, {
                text: `🔨 *Craft Equipment*\n\nPilih item yang mau kamu craft!\n_Tip: belum punya resource? Coba \`.adventure\` dulu._`,
                title: '🔨 Craft Menu',
                buttonText: '⚙️ Pilih Equipment',
                sections
            });
        }

        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        if (rpg[recipe.ownField] > 0) {
            return msgData.reply(`✅ Kamu sudah punya *${type}* ${recipe.emoji}!`);
        }

        const missing = Object.entries(recipe.cost).filter(([item, amt]) => (rpg[item] || 0) < amt);
        if (missing.length) {
            const list = missing.map(([item, amt]) => `• ${item}: butuh *${amt}*, punya *${rpg[item] || 0}*`).join('\n');
            return msgData.reply(`❌ *Bahan tidak cukup!*\n\n${list}\n\nTambah resource lewat \`.adventure\` atau \`.mining\``);
        }

        const patch = {};
        for (const [item, amt] of Object.entries(recipe.cost)) {
            patch[item] = rpg[item] - amt;
        }
        patch[recipe.ownField] = recipe.startValue || 1;
        if (recipe.durabilityField) patch[recipe.durabilityField] = recipe.startDurability;

        User.updateRpg(msgData.senderJid, patch);
        await msgData.reply(`✅ *Sukses craft* 1 ${recipe.emoji} *${type}*!\n\nDurability: ${recipe.startDurability || '-'}`);
    }
};

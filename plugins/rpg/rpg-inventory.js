import User from '../../databases/orm/User.js';
import { emoticon, EQUIPMENT_NAMES, checkCooldown, COOLDOWNS } from '../../libs/rpg-helper.js';
import { sendSmartList } from '../../libs/message-builder.js';

const OTHERS = ['health', 'money', 'exp', 'level'];
const ITEMS = ['potion', 'trash', 'wood', 'rock', 'string', 'emerald', 'diamond', 'gold', 'iron'];
const TOOLS = ['sword', 'pickaxe', 'armor', 'fishingrod'];
const CRATES = ['common', 'uncommon', 'mythic', 'legendary'];

export default {
    command: ['inventory', 'inv'],
    category: 'rpg',
    description: 'Lihat inventory kamu.',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const sub = (msgData.args[0] || '').toLowerCase();
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        // Tanpa argumen → List pilih bagian inventory
        if (!sub) {
            const toolList = TOOLS.filter(k => rpg[k] > 0)
                .map(k => `${emoticon(k)} ${EQUIPMENT_NAMES[k]?.[rpg[k]] || k}`)
                .join(', ') || 'Belum ada';

            const itemList = ITEMS.filter(k => rpg[k] > 0)
                .map(k => `${emoticon(k)} ${k}:${rpg[k]}`).join(' | ') || 'Kosong';

            const crateList = CRATES.filter(k => rpg[k] > 0)
                .map(k => `${emoticon(k)} ${k}:${rpg[k]}`).join(' | ') || 'Kosong';

            const cdList = [
                ['daily', rpg.lastclaim, COOLDOWNS.daily],
                ['weekly', rpg.lastweekly, COOLDOWNS.weekly],
                ['monthly', rpg.lastmonthly, COOLDOWNS.monthly],
                ['mining', rpg.lastmining, COOLDOWNS.mining],
            ].map(([name, last, cd]) => `${checkCooldown(last, cd) ? '❌' : '✅'} ${name}`).join(' | ');

            const sections = [
                {
                    title: '📊 Ringkasan Stats',
                    rows: [
                        { title: '❤️ Health & Level', description: `Health: ${rpg.health}/100 | Level: ${rpg.level} | EXP: ${rpg.exp}`, rowId: '.profile' },
                        { title: '💹 Money & Bank', description: `Money: ${rpg.money} | Bank: ${rpg.bank}`, rowId: '.bank' },
                    ]
                },
                {
                    title: '⚔️ Equipment',
                    rows: TOOLS.map(k => ({
                        title: `${emoticon(k)} ${k.charAt(0).toUpperCase() + k.slice(1)}`,
                        description: rpg[k] > 0
                            ? `${EQUIPMENT_NAMES[k]?.[rpg[k]] || `Level ${rpg[k]}`} | Durability: ${rpg[k + 'durability'] ?? '-'}`
                            : 'Belum punya — ketik .craft untuk buat',
                        rowId: `.craft ${k}`
                    }))
                },
                {
                    title: '🎒 Items',
                    rows: ITEMS.filter(k => rpg[k] > 0).length
                        ? ITEMS.filter(k => rpg[k] > 0).map(k => ({
                            title: `${emoticon(k)} ${k} — ${rpg[k]}x`,
                            description: `Ketik .sell ${k} untuk jual`,
                            rowId: `.sell ${k} 1`
                        }))
                        : [{ title: '🎒 Inventory kosong', description: 'Coba .adventure atau .mining dulu!', rowId: '.adventure' }]
                },
                {
                    title: '🎁 Crates',
                    rows: CRATES.filter(k => rpg[k] > 0).length
                        ? CRATES.filter(k => rpg[k] > 0).map(k => ({
                            title: `${emoticon(k)} ${k} — ${rpg[k]}x`,
                            description: `Ketik .open ${k} 1 untuk buka`,
                            rowId: `.open ${k} 1`
                        }))
                        : [{ title: '🎁 Belum punya crate', description: 'Crate bisa dapat dari adventure/dungeon', rowId: '.adventure' }]
                },
                {
                    title: '⏱️ Cooldown Status',
                    rows: [
                        ['daily', rpg.lastclaim, COOLDOWNS.daily],
                        ['weekly', rpg.lastweekly, COOLDOWNS.weekly],
                        ['monthly', rpg.lastmonthly, COOLDOWNS.monthly],
                        ['mining', rpg.lastmining, COOLDOWNS.mining],
                    ].map(([name, last, cd]) => {
                        const sisa = checkCooldown(last, cd);
                        return {
                            title: `${sisa ? '❌' : '✅'} ${name.charAt(0).toUpperCase() + name.slice(1)}`,
                            description: sisa ? `Cooldown: ${sisa} lagi` : 'Siap digunakan!',
                            rowId: `.${name}`
                        };
                    })
                }
            ];

            return sendSmartList(sock, msgData, m, {
                text: `🎒 *Inventory — ${user.name || msgData.pushName}*\n\n⚔️ Tools: ${toolList}\n🎒 Items: ${itemList}\n🎁 Crates: ${crateList}\n⏱️ CD: ${cdList}`,
                title: '🎒 Inventory',
                buttonText: '📋 Lihat Detail',
                sections
            });
        }

        // Fallback teks untuk sub-command tak dikenal
        return msgData.reply('Format: `.inv` — tanpa argumen untuk lihat semua');
    }
};

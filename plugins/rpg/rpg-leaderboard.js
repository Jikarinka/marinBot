import User from '../../databases/orm/User.js';
import { emoticon } from '../../libs/rpg-helper.js';
import { sendSmartList } from '../../libs/message-builder.js';

const LEADERBOARD_TYPES = [
    'level', 'exp', 'money', 'iron', 'gold', 'diamond', 'emerald',
    'trash', 'potion', 'wood', 'rock', 'string',
    'common', 'uncommon', 'mythic', 'legendary'
];

const LB_ICON = {
    level: '🎖️', exp: '✨', money: '💹', iron: '🪨', gold: '🥇',
    diamond: '💎', emerald: '🟢', trash: '🗑️', potion: '🧪',
    wood: '🪵', rock: '🪨', string: '🧵', common: '📦',
    uncommon: '🎁', mythic: '🌌', legendary: '⭐'
};

export default {
    command: ['leaderboard', 'lb'],
    category: 'rpg',
    description: 'Lihat ranking top 10. Contoh: .lb money',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const type = (msgData.args[0] || '').toLowerCase();

        // Tanpa argumen → tampilkan List pilihan kategori
        if (!type || !LEADERBOARD_TYPES.includes(type)) {
            const sections = [
                {
                    title: '⚔️ Battle Stats',
                    rows: ['level', 'exp'].map(t => ({
                        title: `${LB_ICON[t]} Leaderboard ${t.toUpperCase()}`,
                        description: `Lihat siapa yang paling tinggi ${t}`,
                        rowId: `.lb ${t}`
                    }))
                },
                {
                    title: '💰 Ekonomi',
                    rows: ['money', 'gold', 'diamond', 'emerald', 'iron'].map(t => ({
                        title: `${LB_ICON[t]} Leaderboard ${t.toUpperCase()}`,
                        description: `Ranking ${t} terbanyak`,
                        rowId: `.lb ${t}`
                    }))
                },
                {
                    title: '🎁 Crate & Resource',
                    rows: ['legendary', 'mythic', 'uncommon', 'common', 'wood', 'rock', 'string', 'trash', 'potion'].map(t => ({
                        title: `${LB_ICON[t]} Leaderboard ${t.toUpperCase()}`,
                        description: `Siapa paling banyak punya ${t}?`,
                        rowId: `.lb ${t}`
                    }))
                }
            ];

            return sendSmartList(sock, msgData, m, {
                text: '🏆 *Pilih kategori Leaderboard!*\n\nKlik salah satu untuk melihat Top 10 pemain.',
                title: '🏆 Leaderboard',
                buttonText: '📊 Pilih Kategori',
                sections
            });
        }

        // Ada argumen → langsung tampilkan hasil LB
        const allUsers = await User.getAll();
        const sorted = allUsers
            .filter(u => u.rpg && (u.rpg[type] || 0) > 0)
            .sort((a, b) => (b.rpg[type] || 0) - (a.rpg[type] || 0))
            .slice(0, 10);

        if (!sorted.length) {
            return msgData.reply(`📋 Belum ada data untuk leaderboard *${type}*.`);
        }

        const myRank = allUsers
            .filter(u => u.rpg && (u.rpg[type] || 0) > 0)
            .sort((a, b) => (b.rpg[type] || 0) - (a.rpg[type] || 0))
            .findIndex(u => u.jid === msgData.senderJid) + 1;

        const medals = ['🥇', '🥈', '🥉'];
        const lines = sorted.map((u, i) =>
            `${medals[i] || `${i + 1}.`} @${u.jid.split('@')[0]} — *${u.rpg[type]}* ${emoticon(type)}`
        );

        await sock.sendMessage(msgData.remoteJid, {
            text: `${LB_ICON[type]} *Leaderboard ${type.toUpperCase()}*\n\n${lines.join('\n')}\n\n${myRank ? `📍 Rank kamu: *#${myRank}*` : '📍 Kamu belum masuk top list'}`,
            mentions: sorted.map(u => u.jid)
        }, { quoted: m });
    }
};

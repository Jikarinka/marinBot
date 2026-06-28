import User from '../../databases/orm/User.js';
import { emoticon } from '../../libs/rpg-helper.js';

const LEADERBOARD_TYPES = [
    'level', 'exp', 'money', 'iron', 'gold', 'diamond', 'emerald',
    'trash', 'potion', 'wood', 'rock', 'string',
    'common', 'uncommon', 'mythic', 'legendary'
];

export default {
    command: ['leaderboard', 'lb'],
    category: 'rpg',
    description: 'Lihat ranking top 10. Contoh: .lb money',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const type = (msgData.args[0] || 'money').toLowerCase();

        if (!LEADERBOARD_TYPES.includes(type)) {
            return msgData.reply(
                `Format: .lb [type]\nContoh: .lb money\n\n📍 Tipe tersedia:\n${LEADERBOARD_TYPES.map(t => `${emoticon(t)} ${t}`).join('\n')}`
            );
        }

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

        const lines = sorted.map((u, i) => `${i + 1}. @${u.jid.split('@')[0]} — ${u.rpg[type]} ${emoticon(type)}`);

        await sock.sendMessage(msgData.remoteJid, {
            text: `🏆 *Leaderboard ${type}*\n\n${lines.join('\n')}\n\n${myRank ? `📍 Rank kamu: *${myRank}*` : ''}`,
            mentions: sorted.map(u => u.jid)
        });
    }
};

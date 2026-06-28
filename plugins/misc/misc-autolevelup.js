/**
 * Auto Level-Up — passiveListener
 * Tiap kali user kirim pesan, cek apakah level-nya sudah naik berdasarkan exp saat ini.
 * Kalau iya, kirim notifikasi. Juga update role otomatis.
 */

import User from '../../databases/orm/User.js';
import { findLevel, getRoleForLevel } from '../../libs/rpg-helper.js';

export default {
    // Tidak punya command — hanya passiveListener
    passiveListener: async function (sock, m, msgData) {
        const { senderJid, remoteJid } = msgData;

        const u = User.findOne({ where: { jid: senderJid } });
        if (!u || !u.rpg || u.rpg.exp <= 0) return false;

        const currentLevel = findLevel(u.rpg.exp);

        // Level sudah sama, tidak perlu update
        if (currentLevel === u.rpg.level) return false;

        const newRole = getRoleForLevel(currentLevel);
        const oldLevel = u.rpg.level;

        User.updateRpg(senderJid, {
            level: currentLevel,
            role: newRole,
        });

        if (currentLevel > oldLevel) {
            await sock.sendMessage(remoteJid, {
                text: `🎉 *Level Up!*\n@${senderJid.split('@')[0]} naik dari Level *${oldLevel}* → *${currentLevel}*\n🏅 Role: *${newRole}*`,
                mentions: [senderJid]
            });
        }

        return false; // jangan blokir pesan normal
    }
};

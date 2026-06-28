import config from '../config.js';

// Plugin yang DILARANG untuk koordinator
const COORDINATOR_BLOCKED_COMMANDS = [
    // File management — koordinator tidak boleh hapus/buat file
    'deletefile', 'delfile', 'rmfile', 'removefile',
    'newfile', 'createfile', 'addfile', 'writefile',
    // Plugin management
    'addplugin', 'delplugin', 'deleteplugin',
];

// Plugin yang DILARANG TOTAL untuk sub-bot — defense-in-depth.
// isOwner sudah dipaksa false di auth.js untuk sub-bot, ini lapisan kedua
// agar plugin apapun yang lupa flag isOwner tetap tidak bisa diakses sub-bot.
const SUBBOT_BLOCKED_KEYWORDS = [
    'eval', 'exec', 'shell', 'restart', 'addprem', 'delprem',
    'addpremium', 'delpremium', 'coordinator', 'env', 'backup',
    'restore', 'auditlog', 'approve', 'deny', 'cheat',
];

export const validatePlugin = async (sock, m, msgData, user, group, plugin, setting) => {
    const isOwner = user.isOwner;
    const isCoordinator = user.isCoordinator || false;
    const isPrivileged = isOwner || isCoordinator;
    const isSubBot = msgData._isSubBot === true;

    // ── SUB-BOT GUARD (defense-in-depth) ──────────────────────────
    // Plugin isOwner, isCoordinator, atau command sensitif TIDAK PERNAH
    // boleh jalan di sesi sub-bot, walau pemilik nomor chat ke sub-botnya sendiri.
    if (isSubBot) {
        const cmd = (Array.isArray(plugin.command) ? plugin.command[0] : plugin.command || '').toLowerCase();
        const isSensitive = plugin.isOwner ||
            SUBBOT_BLOCKED_KEYWORDS.some(k => cmd.includes(k));

        if (isSensitive) {
            await sock.sendMessage(msgData.remoteJid, {
                text: '⛔ Fitur ini hanya tersedia di bot utama, bukan di sub-bot~'
            }, { quoted: m });
            return false;
        }
    }

    // Setting global: jika register dimatikan, skip plugin register/unregister
    if (!setting.is_register && (plugin.command && (
        plugin.command.includes('register') ||
        plugin.command.includes('daftar') ||
        plugin.command.includes('unregister')
    ))) {
        return false;
    }

    // Cek apakah command diblokir untuk koordinator
    if (isCoordinator && !isOwner) {
        const cmd = Array.isArray(plugin.command) ? plugin.command[0] : plugin.command;
        const isBlocked = COORDINATOR_BLOCKED_COMMANDS.some(blocked =>
            plugin.command?.includes(blocked) || cmd?.toLowerCase().includes(blocked)
        );
        if (isBlocked) {
            await sock.sendMessage(msgData.remoteJid, {
                text: config.MARIN_MSG_COORDINATOR ||
                    '⛔ Koordinator tidak bisa melakukan aksi hapus/buat file~'
            }, { quoted: m });
            return false;
        }
    }

    if (plugin.isPrivate && msgData.isGroup) {
        await sock.sendMessage(msgData.remoteJid, { text: config.MARIN_MSG_PRIVATE }, { quoted: m });
        return false;
    }

    // User yang di-ban tidak bisa pakai perintah apapun (kecuali owner)
    if (user.is_banned && !isOwner) {
        await sock.sendMessage(msgData.remoteJid, {
            text: '🚫 Kamu di-ban dari menggunakan bot ini.'
        }, { quoted: m });
        return false;
    }

    if (plugin.isGroup && !msgData.isGroup) {
        await sock.sendMessage(msgData.remoteJid, { text: config.MARIN_MSG_GROUP }, { quoted: m });
        return false;
    }

    if (setting.is_register) {
        if (plugin.isRegistered && !user.is_registered && !isPrivileged) {
            await sock.sendMessage(msgData.remoteJid, { text: config.MARIN_MSG_REGISTER }, { quoted: m });
            return false;
        }

        if (plugin.limit) {
            const isLimitBypassed = isPrivileged || user.is_premium || (group && !group.is_limited);
            if (user.limit < plugin.limit && !isLimitBypassed) {
                await sock.sendMessage(msgData.remoteJid, { text: config.MARIN_MSG_LIMIT }, { quoted: m });
                return false;
            }
            if (!isLimitBypassed) {
                user.limit -= plugin.limit;
                await user.save();
            }
        }
    }

    if (plugin.isAdmin && !msgData.isAdmin && !isPrivileged) {
        await sock.sendMessage(msgData.remoteJid, { text: config.MARIN_MSG_ADMIN }, { quoted: m });
        return false;
    }

    if (plugin.isBotAdmin && !msgData.isBotAdmin) {
        await sock.sendMessage(msgData.remoteJid, { text: config.MARIN_MSG_BOTADMIN }, { quoted: m });
        return false;
    }

    // isOwner plugin: koordinator TIDAK bisa akses
    if (plugin.isOwner && !isOwner) {
        await sock.sendMessage(msgData.remoteJid, { text: config.MARIN_MSG_OWNER }, { quoted: m });
        return false;
    }

    if (plugin.isPremium && !user.is_premium && !isPrivileged) {
        await sock.sendMessage(msgData.remoteJid, { text: config.MARIN_MSG_PREMIUM }, { quoted: m });
        return false;
    }

    return true;
};

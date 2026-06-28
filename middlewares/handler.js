import path from 'path';
import { plugins, loadPlugins, watchPlugins } from '../libs/hot-reload.js';
import { processAuth } from './auth.js';
import { validatePlugin } from './validator.js';
import { safeExecute, handleError } from '../mcp/auto-heal.js';
import { enrichMessage } from '../libs/m-helper.js';
import config from '../config.js';

const pluginDir = path.join(process.cwd(), 'plugins');
await loadPlugins(pluginDir);
watchPlugins(pluginDir);

export default async function botHandler(sock, rawM, msgData) {
    try {
        // ── Perkaya m dengan shorthand gaya KannaBot (m.reply, m.chat, m.quoted, dll) ──
        const { m, conn } = enrichMessage(sock, rawM, msgData);

        // ── Pesan tanpa command → passiveListener (DM selalu aktif) ──
        if (!msgData.commandName) {
            if (!msgData.text && !msgData.isMedia && !msgData.isQuotedMedia) return;

            const auth = await processAuth(sock, msgData);
            const user    = auth.user    || auth;
            const group   = auth.group   || null;
            const setting = auth.setting || { is_public: true, is_gconly: false };

            if (!setting.is_public && !user.isOwner) return;
            if (setting.is_gconly && !msgData.isGroup && !user.isOwner) return;

            for (const plugin of plugins) {
                if (typeof plugin.passiveListener === 'function') {
                    try {
                        const handled = await plugin.passiveListener(conn, m, msgData, user, group);
                        if (handled) return;
                    } catch (err) {
                        await handleError(conn, m, msgData, err, plugin, user);
                        return;
                    }
                }
            }
            return;
        }

        // ── Pesan dengan command ──────────────────────────────────────
        const auth = await processAuth(sock, msgData);
        const user    = auth.user    || auth;
        const group   = auth.group   || null;
        const setting = auth.setting || { is_public: true, is_gconly: false };

        if (!setting.is_public) {
            if (!user.isOwner) return;
        } else if (setting.is_gconly) {
            if (!msgData.isGroup && !user.isOwner) return;
        }

        for (const plugin of plugins) {
            const cmdList = Array.isArray(plugin.command)
                ? plugin.command
                : (typeof plugin.command === 'string' ? [plugin.command] : null);

            if (!cmdList) continue;

            if (cmdList.includes(msgData.commandName)) {
                const isValid = await validatePlugin(conn, m, msgData, user, group, plugin, setting);
                if (!isValid) return;

                try { await sock.sendPresenceUpdate('composing', msgData.remoteJid); } catch (_) {}

                await safeExecute(plugin, conn, m, msgData, user, group, plugins);
                break;
            }
        }
    } catch (error) {
        console.error('[Handler] Global error:', error);
        try {
            await handleError(sock, rawM, msgData, error, null, null);
        } catch (_) {
            const ownerJid = (config.OWNER_NUMBER || '').replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            try {
                await sock.sendMessage(ownerJid, {
                    text: `🚨 *HANDLER ERROR*\n\nMsg: ${error.message}\n\nStack:\n${(error.stack || '').slice(0, 800)}`
                });
            } catch (_2) {}
        }
    }
}

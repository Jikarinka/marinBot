import { exec } from 'child_process';
import { promisify } from 'util';
import { logAction } from '../../mcp/audit-log.js';

const execAsync = promisify(exec);

export default {
    command: ['exec', 'shell'],
    category: 'owner',
    isOwner: true,
    description: 'Jalankan shell command langsung di server. Khusus Owner.',

    async execute(sock, m, msgData) {
        const command = msgData.args.join(' ');
        if (!command) return msgData.reply('Mana commandnya kak? Contoh: `.exec ls -la`');

        try { await msgData.react('⏳'); } catch (_) {}

        const startedAt = Date.now();
        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: process.cwd(),
                timeout: 30000,
                env: { ...process.env }
            });

            const out = (stdout || '').trim();
            const err = (stderr || '').trim();

            let text = '*─「 EXEC RESULT 」─*\n\n';
            if (out) text += '```\n' + out.slice(0, 3000) + '\n```';
            if (err) text += (out ? '\n\n⚠️ *Stderr:*\n' : '⚠️ *Stderr:*\n') + '```\n' + err.slice(0, 1000) + '\n```';
            if (!out && !err) text += '_(tidak ada output)_';

            logAction({
                tool: 'manual_exec', args: { command }, senderId: msgData.senderJid,
                isOwner: true, success: true, durationMs: Date.now() - startedAt,
                resultPreview: out || err
            });

            await msgData.reply(text);
            try { await msgData.react('✅'); } catch (_) {}
        } catch (error) {
            logAction({
                tool: 'manual_exec', args: { command }, senderId: msgData.senderJid,
                isOwner: true, success: false, durationMs: Date.now() - startedAt,
                error: error.message || String(error)
            });
            await msgData.reply('*─「 EXEC ERROR 」─*\n\n```\n' + String(error.message || error).slice(0, 1000) + '\n```');
            try { await msgData.react('❌'); } catch (_) {}
        }
    }
};

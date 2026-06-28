import config from '../../config.js';
import { logAction } from '../../mcp/audit-log.js';

export default {
    command: ['eval'],
    category: 'owner',
    isOwner: true,
    description: 'Eksekusi kode JavaScript langsung dari chat. Khusus Owner.',

    async execute(sock, m, msgData) {
        const code = msgData.args.join(' ');
        if (!code) return msgData.reply('Mana kodenya kak? Contoh: `.eval 1 + 1`');

        try { await msgData.react('⏳'); } catch (_) {}

        const startedAt = Date.now();
        let result;
        try {
            // Konteks yang bisa diakses dalam kode eval
            const context = { sock, m, msgData, config };

            const evalFunc = new Function(
                ...Object.keys(context),
                `return (async () => {
                    ${code.includes('return') ? code : `return (${code})`}
                })()`
            );

            result = await evalFunc(...Object.values(context));

            if (typeof result !== 'string') {
                result = JSON.stringify(result, null, 2);
            }

            logAction({
                tool: 'manual_eval', args: { code }, senderId: msgData.senderJid,
                isOwner: true, success: true, durationMs: Date.now() - startedAt,
                resultPreview: result
            });

            await msgData.reply('*─「 EVAL RESULT 」─*\n\n```javascript\n' + result.slice(0, 3000) + '\n```');
            try { await msgData.react('✅'); } catch (_) {}
        } catch (error) {
            logAction({
                tool: 'manual_eval', args: { code }, senderId: msgData.senderJid,
                isOwner: true, success: false, durationMs: Date.now() - startedAt,
                error: error.message || String(error)
            });
            await msgData.reply('*─「 EVAL ERROR 」─*\n\n```\n' + String(error.message || error).slice(0, 1000) + '\n```');
            try { await msgData.react('❌'); } catch (_) {}
        }
    }
};

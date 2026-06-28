import { getRecentLogs, listBackups, restoreBackup } from '../../mcp/audit-log.js';

function fmt(b) {
    if (b < 1024) return `${b}B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)}KB`;
    return `${(b / 1048576).toFixed(1)}MB`;
}

export default {
    command: ['auditlog', 'logs'],
    category: 'owner',
    isOwner: true,
    description: 'Lihat riwayat aksi AI/owner di server (write_file, shell_exec, dll). Khusus Owner.',

    async execute(sock, m, msgData) {
        const args = msgData.args;
        const limit = Math.min(Number(args[0]) || 15, 50);

        const entries = getRecentLogs(limit);
        if (!entries.length) return msgData.reply('📋 Belum ada riwayat aksi tercatat.');

        const lines = entries.map(e => {
            const time = new Date(e.at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
            const status = e.success ? '✅' : '❌';
            return `${status} [${time}] *${e.tool}* — ${e.sender}${e.error ? `\n   ⚠️ ${e.error.slice(0, 100)}` : ''}`;
        });

        await msgData.reply(`📋 *Audit Log — ${entries.length} entri terakhir:*\n\n${lines.join('\n')}`);
    }
};

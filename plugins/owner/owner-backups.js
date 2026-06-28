import { listBackups, restoreBackup } from '../../mcp/audit-log.js';

function fmt(b) {
    if (b < 1024) return `${b}B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)}KB`;
    return `${(b / 1048576).toFixed(1)}MB`;
}

export default {
    command: ['backups', 'restore'],
    category: 'owner',
    isOwner: true,
    description: 'Lihat & pulihkan backup file otomatis (sebelum write_file/delete_file menimpa). Khusus Owner.',

    async execute(sock, m, msgData) {
        const { commandName, args } = msgData;

        if (commandName === 'restore') {
            const backupName = args[0];
            if (!backupName) return msgData.reply('Mana nama backupnya kak? Cek dulu pakai `.backups`');
            try {
                const restoredTo = restoreBackup(backupName, args[1] || null);
                return msgData.reply(`✅ Backup berhasil dipulihkan ke *${restoredTo}*`);
            } catch (e) {
                return msgData.reply(`❌ Gagal restore: ${e.message}`);
            }
        }

        // .backups → tampilkan daftar
        const backups = listBackups(30);
        if (!backups.length) return msgData.reply('🗄️ Belum ada backup tersimpan.');

        const lines = backups.map((b, i) => {
            const time = new Date(b.mtime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
            return `${i + 1}. ${b.name}\n   📦 ${fmt(b.size)} — ${time}`;
        });

        await msgData.reply(
            `🗄️ *Backup tersedia — ${backups.length}:*\n\n${lines.join('\n')}\n\n` +
            `_Pulihkan dengan: .restore <nama_backup>_`
        );
    }
};

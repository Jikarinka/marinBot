import fs from 'fs';
import path from 'path';
import os from 'os';

export default {
    command: ['cleartmp', 'ct'],
    category: 'owner',
    isOwner: true,
    description: 'Hapus file temporary untuk bebaskan disk space.',

    async execute(sock, m, msgData) {
        const dirs = [os.tmpdir(), path.join(process.cwd(), 'tmp')].filter(d => fs.existsSync(d));
        let count = 0, totalSize = 0;

        for (const dir of dirs) {
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    try {
                        const full = path.join(dir, file);
                        const stat = fs.statSync(full);
                        if (stat.isFile()) {
                            totalSize += stat.size;
                            fs.unlinkSync(full);
                            count++;
                        }
                    } catch (_) {}
                }
            } catch (_) {}
        }

        const sizeMB = (totalSize / 1048576).toFixed(2);
        await msgData.reply(`✅ Berhasil hapus *${count}* file temporary (${sizeMB} MB)`);
    }
};

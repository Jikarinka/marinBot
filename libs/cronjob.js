import cron from 'node-cron';
import { User } from '../databases/connector.js';

export function startCronJobs() {
    // Jalankan setiap hari pada pukul 00:00
    cron.schedule('0 0 * * *', async () => {
        console.log('[Cron] ⏰ Menjalankan tugas: Reset Limit Harian...');
        try {
            // Update limit menjadi 10 HANYA untuk user yang limitnya berada di bawah 10
            const [updatedRows] = User.updateWhere(
                { limit: 10 },
                (u) => u.limit < 10
            );
            console.log(`[Cron] ✅ Berhasil mereset limit untuk ${updatedRows} user.`);
        } catch (error) {
            console.error('[Cron] ❌ Gagal mereset limit:', error);
        }
    }, {
        scheduled: true,
        timezone: 'Asia/Jakarta'
    });

    console.log('✅ Cron Jobs berhasil diinisialisasi.');
}

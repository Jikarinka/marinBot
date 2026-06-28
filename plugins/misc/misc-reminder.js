import { parseRelativeTime, createReminder, listReminders, removeReminder } from '../../libs/reminder.js';

export default {
    command: ['ingat', 'remind', 'reminder'],
    category: 'misc',
    description: 'Buat pengingat. Contoh: .ingat 20 menit lagi mandi',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const { args, remoteJid } = msgData;
        const full = args.join(' ').trim();

        // ── .ingat list → lihat pengingat aktif ──
        if (full.toLowerCase() === 'list' || full.toLowerCase() === 'daftar') {
            const mine = listReminders(remoteJid);
            if (!mine.length) return msgData.reply('📋 Belum ada pengingat aktif~');

            const lines = mine.map((r, i) => {
                const sisaMs = r.fireAt - Date.now();
                const sisaMin = Math.max(0, Math.round(sisaMs / 60000));
                return `${i + 1}. *${r.message}*\n   ⏰ ${sisaMin} menit lagi (ID: ${r.id})`;
            });
            return msgData.reply(`📋 *Pengingat aktif:*\n\n${lines.join('\n\n')}`);
        }

        // ── .ingat batal <id> → hapus pengingat ──
        if (full.toLowerCase().startsWith('batal') || full.toLowerCase().startsWith('cancel')) {
            const id = args[1];
            if (!id) return msgData.reply('Mana ID-nya kak? Cek dulu pakai `.ingat list`');
            removeReminder(id);
            return msgData.reply(`✅ Pengingat *${id}* dibatalkan~`);
        }

        if (!full) {
            return msgData.reply(
                '⏰ *Cara pakai pengingat:*\n\n' +
                '`.ingat 20 menit lagi mandi`\n' +
                '`.ingat 1 jam 30 menit lagi meeting`\n' +
                '`.ingat 2 jam lagi minum obat`\n\n' +
                '`.ingat list` → lihat pengingat aktif\n' +
                '`.ingat batal <id>` → batalkan pengingat'
            );
        }

        // Parse waktu dari awal kalimat (sebelum kata "lagi" biasanya, tapi parser cari pola angka+satuan di mana saja)
        const delayMs = parseRelativeTime(full);
        if (!delayMs) {
            return msgData.reply(
                '❌ Marin gak nangkep waktunya kak~\n\n' +
                'Contoh yang benar:\n`.ingat 20 menit lagi mandi`\n`.ingat 1 jam lagi olahraga`'
            );
        }

        if (delayMs > 30 * 24 * 60 * 60 * 1000) {
            return msgData.reply('❌ Maksimal pengingat 30 hari ke depan ya kak~');
        }

        // Bersihkan teks pesan: hapus bagian angka+satuan waktu dan kata "lagi"
        let message = full
            .replace(/(\d+)\s*(?:hari|days?|d|jam|hours?|h|j|menit|minutes?|min|m|detik|seconds?|sec|s)\b/gi, '')
            .replace(/\blagi\b/gi, '')
            .trim()
            .replace(/^untuk\s+/i, '');

        if (!message) message = 'Waktunya!';

        const reminder = createReminder({ jid: remoteJid, message, delayMs, sock });

        const totalMin = Math.round(delayMs / 60000);
        const displayTime = totalMin >= 60
            ? `${Math.floor(totalMin / 60)} jam ${totalMin % 60} menit`
            : `${totalMin} menit`;

        await msgData.reply(
            `✅ Oke kak! Marin bakal ingetin *"${message}"* dalam ${displayTime} lagi~\n\n` +
            `_ID: ${reminder.id} (pakai .ingat batal ${reminder.id} kalau mau dibatalkan)_`
        );
    }
};

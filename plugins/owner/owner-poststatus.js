import User from '../../databases/orm/User.js';

export default {
    command: ['poststatus'],
    category: 'owner',
    isOwner: true,
    description: 'Upload status/story WhatsApp (teks, gambar, atau video). Khusus Owner.',

    async execute(sock, m, msgData) {
        const { args, isMedia, isQuotedMedia, quotedMsg, mime, quotedMime } = msgData;
        const caption = args.join(' ').trim();

        // Ambil daftar JID user terdaftar untuk statusJidList — beberapa versi Baileys
        // butuh ini terisi (tidak boleh kosong) supaya status benar-benar muncul,
        // ini known issue di Baileys: https://github.com/WhiskeySockets/Baileys/issues/2118
        let statusJidList = [];
        try {
            const users = await User.getAll();
            statusJidList = users.map(u => u.jid).filter(Boolean);
        } catch (_) {}

        const baseOptions = {
            backgroundColor: '#25D366',
            font: 1,
            statusJidList,
            broadcast: true
        };

        try {
            await msgData.react('⏳');

            // ── Status dengan media (gambar/video, langsung kirim atau reply ke media) ──
            const hasMediaHere = isMedia || isQuotedMedia;
            if (hasMediaHere) {
                const { downloadMediaMessage } = await import('baileys');
                const target = isMedia ? m : {
                    message: quotedMsg,
                    key: { ...m.key, id: msgData.contextInfo?.stanzaId }
                };
                const buffer = await downloadMediaMessage(target, 'buffer', {});
                if (!buffer) throw new Error('Gagal download media');

                const effectiveMime = mime || quotedMime || '';
                const isVideo = effectiveMime.includes('video');

                const mediaContent = isVideo
                    ? { video: buffer, caption: caption || undefined }
                    : { image: buffer, caption: caption || undefined };

                await sock.sendMessage('status@broadcast', mediaContent, baseOptions);

            } else if (caption) {
                // ── Status teks ──
                await sock.sendMessage('status@broadcast', { text: caption }, baseOptions);

            } else {
                await msgData.react('❌');
                return msgData.reply(
                    '❌ Mau upload apa kak?\n\n' +
                    'Contoh:\n' +
                    '`.poststatus Halo semua!` → status teks\n' +
                    'Kirim/reply gambar/video dengan caption `.poststatus` → status media'
                );
            }

            await msgData.react('✅');
            await msgData.reply(
                `✅ Status berhasil diupload!\n\n` +
                `_Catatan: status dikirim ke ${statusJidList.length} kontak terdaftar di bot. ` +
                `Kalau status tidak muncul di WhatsApp, ini known issue di Baileys — coba lagi ` +
                `beberapa saat atau cek versi Baileys yang dipakai._`
            );

        } catch (error) {
            await msgData.react('❌');
            await msgData.reply(`❌ Gagal upload status: ${error.message}`);
        }
    }
};

/**
 * Anti-Link Grup — passiveListener
 * Kalau ada member non-admin yang kirim link grup WhatsApp, pesan dihapus
 * (kalau bot admin) dan user di-warn.
 * Fitur ini hanya aktif kalau setting anti_link di group == true.
 * Owner/admin grup dikecualikan.
 */

const LINK_REGEX = /chat\.whatsapp\.com\/(?:invite\/)?([0-9A-Za-z]{20,24})/i;

export default {
    passiveListener: async function (sock, m, msgData) {
        const { isGroup, senderJid, remoteJid } = msgData;

        // Hanya jalan di grup
        if (!isGroup) return false;

        // Cek apakah fitur antilink aktif di grup ini
        // (baca dari field group.anti_link — bisa di-toggle via .antilink on/off)
        if (!msgData._group?.anti_link) return false;

        const text = m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption || ''

        const hasLink = LINK_REGEX.test(text);
        if (!hasLink) return false;

        // Jangan hapus link dari admin/owner
        try {
            const metadata = await sock.groupMetadata(remoteJid);
            const isAdmin = metadata.participants
                .find(p => p.id === senderJid)
                ?.admin === 'admin' || metadata.participants
                .find(p => p.id === senderJid)
                ?.admin === 'superadmin';

            if (isAdmin) return false;

            // Coba hapus pesan
            try {
                await sock.sendMessage(remoteJid, { delete: m.key });
            } catch (_) {}

            // Warn user
            await sock.sendMessage(remoteJid, {
                text: `⚠️ @${senderJid.split('@')[0]}, dilarang kirim link grup di sini!`,
                mentions: [senderJid]
            });

            return true; // sudah dihandle
        } catch (_) {
            return false;
        }
    }
};

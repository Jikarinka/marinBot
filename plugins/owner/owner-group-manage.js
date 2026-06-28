export default {
    command: ['leavegc', 'out', 'kannaout', 'joingrup', 'tagall', 'pengumuman'],
    category: 'owner',
    isOwner: true,
    description: 'Keluar grup, join link grup, tag semua member, atau kirim pengumuman.',

    async execute(sock, m, msgData) {
        const { commandName, args, remoteJid } = msgData;

        // ── Leave group ──────────────────────────────────────────────
        if (['leavegc', 'out', 'kannaout'].includes(commandName)) {
            await msgData.reply('Sayonara~! (≧ω≦)ゞ');
            await sock.groupLeave(remoteJid);
            return;
        }

        // ── Join group by invite link ────────────────────────────────
        if (commandName === 'joingrup') {
            const link = args[0] || '';
            const match = link.match(/chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i);
            if (!match) return msgData.reply('❌ Link grup tidak valid. Contoh: .join https://chat.whatsapp.com/ABC123');
            try {
                const groupId = await sock.groupAcceptInvite(match[1]);
                await msgData.reply(`✅ Berhasil join grup: ${groupId}`);
            } catch (e) {
                await msgData.reply(`❌ Gagal join: ${e.message}`);
            }
            return;
        }

        // ── Tag all / Pengumuman ─────────────────────────────────────
        if (['tagall', 'pengumuman'].includes(commandName)) {
            if (!msgData.isGroup) return msgData.reply('❌ Command ini hanya untuk grup!');
            try {
                const metadata = await sock.groupMetadata(remoteJid);
                const members = metadata.participants.map(p => p.id);
                const text = args.join(' ').trim() || '📢 Pengumuman!';
                const mentions = members.join('\n').replace(/[^@]/g, '');
                await sock.sendMessage(remoteJid, {
                    text: `📢 *Pengumuman*\n\n${text}\n\n${members.map(m => `@${m.split('@')[0]}`).join(' ')}`,
                    mentions: members
                });
            } catch (e) {
                await msgData.reply(`❌ Gagal: ${e.message}`);
            }
        }
    }
};

import Group from '../../databases/orm/Group.js';
import User from '../../databases/orm/User.js';
import config from '../../config.js';
import { resolveLidToJid } from '../../libs/lid-resolver.js';
import { getPP } from '../../libs/baileys-utils.js';
import { generateWelcomeBanner } from '../../libs/imagegen/local-imagegen.js';

async function fetchAvatarBuffer(ppUrl) {
    if (!ppUrl || !ppUrl.startsWith('http')) return null;
    try {
        const fetch = (await import('node-fetch')).default;
        const res = await fetch(ppUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch (_) {}
    return null;
}

export default {
    category: 'group',
    description: 'Menangani pesan selamat datang dan selamat tinggal dengan gaya Moe (˶˃ ᵕ ˂˶), banner digenerate lokal.',
    async onParticipantsUpdate(sock, { id, participants, action }) {
        try {
            const group = await Group.findOne({ where: { jid: id } });
            if (!group || !group.is_welcome) return;

            const metadata = await sock.groupMetadata(id);

            for (const part of participants) {
                const participant = typeof part === 'string' ? part : (part.id || part.jid);
                if (!participant) continue;

                let resolvedJid = resolveLidToJid(participant);

                // Jika masih LID, coba cari di metadata grup
                if (resolvedJid.endsWith('@lid')) {
                    const groupParticipant = metadata.participants.find(p => p.id === resolvedJid || p.lid === resolvedJid || p.id?.split('@')[0] === resolvedJid.split('@')[0]);
                    if (groupParticipant && groupParticipant.id && !groupParticipant.id.endsWith('@lid')) {
                        resolvedJid = groupParticipant.id;
                    }
                }

                const user = await User.findOne({ where: { jid: resolvedJid } });
                const pushname = typeof part === 'object' ? (part.pushname || part.notify) : null;
                const username = user?.name || pushname || resolvedJid.split('@')[0];
                const memberCount = metadata.participants.length;

                // Ambil PP sebagai buffer (Raw Query Bypass)
                const ppUrl = await getPP(sock, resolvedJid, 'image');
                const avatarBuffer = await fetchAvatarBuffer(ppUrl);

                if (action === 'add') {
                    const bannerBuffer = await generateWelcomeBanner({
                        title: 'Welcome',
                        name: username,
                        subtitle: `${metadata.subject} • Member ke-${memberCount}`,
                        avatarBuffer
                    });

                    const welcomeText = `Uwaaa! Selamat datang @${resolvedJid.split('@')[0]} di grup *${metadata.subject}*! (˶˃ ᵕ ˂˶)\n\n` +
                        `Semoga kakak betah main di sini bareng kita semua yaa! Jangan lupa baca aturan grupnya kakak manis~ (๑>ᴗ<๑)`;

                    await sock.sendMessage(id, {
                        image: bannerBuffer,
                        caption: welcomeText,
                        mentions: [resolvedJid]
                    });

                } else if (action === 'remove') {
                    const bannerBuffer = await generateWelcomeBanner({
                        title: 'Goodbye',
                        name: username,
                        subtitle: `${metadata.subject} • Sisa ${memberCount} member`,
                        avatarBuffer
                    });

                    const leaveText = `Yahhh... Sayang sekali, Kakak @${resolvedJid.split('@')[0]} sudah meninggalkan grup.. (｡T ω T｡)\n\n` +
                        `Selamat jalan ya kak, terima kasih sudah mampir! Marin bakal kangen~ (╥﹏╥)`;

                    await sock.sendMessage(id, {
                        image: bannerBuffer,
                        caption: leaveText,
                        mentions: [resolvedJid]
                    });
                }
            }
        } catch (error) {
            console.error('Welcome-Leave Error:', error);
            const ownerJid = config.OWNER_NUMBER.includes('@') ? config.OWNER_NUMBER : `${config.OWNER_NUMBER}@s.whatsapp.net`;
            await sock.sendMessage(ownerJid, { text: `[CRITICAL ERROR] Welcome-Leave:\n\n${error.message}` }).catch(() => { });
        }
    }
};

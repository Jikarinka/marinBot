import fetch from 'node-fetch';
import { generateFakeIGStory } from '../../libs/imagegen/local-imagegen.js';

export default {
    command: ['fakestory', 'fakeig'],
    category: 'maker',
    isRegistered: true,
    limit: 1,
    description: 'Membuat tampilan cerita Instagram palsu (Fake Story), digenerate lokal.',
    async execute(sock, m, msgData, user) {
        const { db, quotedContent, args, isQuoted, pushName, remoteJid, senderJid, isQuotedMedia, quotedType } = msgData;

        // Ambil data dari argumen atau quote
        const fullArgs = args.join(' ');
        let [usernameArg, ...captionArgs] = fullArgs.split('|');

        let username = usernameArg?.trim();
        let caption = captionArgs.join('|').trim();

        if (!caption && isQuoted) {
            caption = quotedContent;
        }

        if (!caption && usernameArg && !fullArgs.includes('|')) {
            caption = usernameArg;
            username = '';
        }

        if (!caption) {
            return msgData.reply(`Kakak manis~ Cara pakainya gini yaa:\n*.fakestory username|caption*\n\nAtau balas pesan teks dengan *.fakestory username*~ (˶˃ ᵕ ˂˶)`);
        }

        // Ambil target JID (default ke pengirim)
        const targetJid = msgData.parseTargetJid() || senderJid;

        // Fallback untuk username
        if (!username) {
            const targetUser = await db.User.findOne({ where: { jid: targetJid } });
            username = targetUser?.name || (targetJid === senderJid ? pushName : 'User');
        }

        await msgData.react('⏳');

        try {
            // Ambil foto profil target — langsung sebagai buffer
            const ppUrl = await msgData.getPP(targetJid, 'image');
            let avatarBuffer = null;

            if (ppUrl && ppUrl.startsWith('http')) {
                try {
                    const ppRes = await fetch(ppUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                        }
                    });
                    if (ppRes.ok) avatarBuffer = Buffer.from(await ppRes.arrayBuffer());
                } catch (e) {
                    console.error('Fake IG Avatar Fetch Error:', e.message);
                }
            }

            // Cek apakah ada gambar yang di-quote untuk dijadikan background story
            let mediaBuffer = null;
            if (isQuotedMedia && /imageMessage/.test(quotedType)) {
                mediaBuffer = await msgData.downloadMedia();
            }

            const pngBuffer = await generateFakeIGStory({
                username,
                text: caption,
                avatarBuffer,
                mediaBuffer
            });

            await sock.sendMessage(remoteJid, {
                image: pngBuffer,
                caption: `Horeee~! Ini dia Fake Story buat Kakak ${pushName}! Keren kan? (๑>ᴗ<๑)`
            }, { quoted: m });

            await msgData.react('✅');

        } catch (error) {
            console.error('Fake Story Error:', error);
            await msgData.react('❌');
            await msgData.reply(`Aduuh gawat! Marin gagal bikin story-nya kak: ${error.message}.. (╥﹏╥)`);
        }
    }
};

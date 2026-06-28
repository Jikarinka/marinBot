import fetch from 'node-fetch';
import { generateFakeTweet } from '../../libs/imagegen/local-imagegen.js';

export default {
    command: ['faketweet', 'tweet'],
    category: 'maker',
    isRegistered: true,
    limit: 1,
    description: 'Membuat tampilan Tweet palsu (Fake Tweet), digenerate lokal.',
    async execute(sock, m, msgData) {
        const { config, db, quotedContent, args, isQuoted, pushName, remoteJid, senderJid, messageType } = msgData;

        const fullArgs = args.join(' ');
        let [nameArg, usernameArg, tweetArg] = fullArgs.split('|');

        const targetJid = msgData.parseTargetJid() || senderJid;

        const targetUser = await db.User.findOne({ where: { jid: targetJid } });
        const displayName = nameArg?.trim() || (targetJid === senderJid ? pushName : (targetUser?.name || 'User'));
        const username = usernameArg?.trim() || displayName.replace(/\s+/g, '_').toLowerCase();

        let tweet = tweetArg?.trim();
        if (!tweet && isQuoted) {
            tweet = quotedContent;
        }

        if (!tweet && nameArg && !fullArgs.includes('|')) {
            tweet = nameArg;
        }

        if (!tweet) {
            return msgData.reply(config.MARIN_MSG_QUOTED);
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
                    console.error('Fake Tweet Avatar Fetch Error:', e.message);
                }
            }

            // Cek apakah ada media (gambar) yang di-attach/quote untuk dimasukkan ke tweet
            let mediaBuffer = null;
            const bufferMedia = await msgData.downloadMedia();
            if (bufferMedia && /imageMessage/.test(isQuoted ? msgData.quotedType : messageType)) {
                mediaBuffer = bufferMedia;
            }

            const pngBuffer = await generateFakeTweet({
                name: displayName,
                username,
                text: tweet,
                avatarBuffer,
                mediaBuffer
            });

            await sock.sendMessage(remoteJid, {
                image: pngBuffer,
                caption: `Waaa! Tweet Kakak ${displayName} viral banget nih~! (˶˃ ᵕ ˂˶)`
            }, { quoted: m });

            await msgData.react('✅');

        } catch (error) {
            console.error('Fake Tweet Error:', error);
            await msgData.react('❌');
            await msgData.reply(`Aduuh gawat! Marin gagal bikin tweet-nya kak: ${error.message}.. (╥﹏╥)`);
        }
    }
};

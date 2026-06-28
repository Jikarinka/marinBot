import fetch from 'node-fetch';
import { generateQuote } from '../../libs/imagegen/local-imagegen.js';
import { writeExif, imageToWebp } from '../../libs/sticker/sticker.js';

export default {
    command: ['qc', 'quotly'],
    category: 'sticker',
    isRegistered: true,
    description: 'Membuat stiker gelembung chat (Quotly), digenerate lokal.',
    async execute(sock, m, msgData, user) {
        const { config, db, quotedContent, args, isQuoted, pushName, remoteJid, senderJid } = msgData;

        let text = args.join(' ');
        if (!text && isQuoted) {
            text = quotedContent;
        }

        if (!text) {
            return msgData.reply(config.MARIN_MSG_QUOTED);
        }

        await msgData.react('⏳');

        try {
            const targetJid = msgData.parseTargetJid() || senderJid;

            const targetUser = await db.User.findOne({ where: { jid: targetJid } });
            const targetName = targetJid === senderJid ? pushName : (targetUser?.name || 'User');

            // Ambil foto profil target — langsung sebagai buffer, tanpa perlu upload CDN
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
                    if (ppRes.ok) {
                        avatarBuffer = Buffer.from(await ppRes.arrayBuffer());
                    }
                } catch (e) {
                    console.error('QC Avatar Fetch Error:', e.message);
                }
            }

            const pngBuffer = await generateQuote({
                name: targetName,
                text: String(text),
                avatarBuffer,
                dark: true
            });

            const stickerBuffer = await imageToWebp(pngBuffer);
            const exifData = { packName: config.BOT_NAME, packPublish: user.name };
            const finalSticker = await writeExif(stickerBuffer, exifData);
            await sock.sendMessage(remoteJid, { sticker: finalSticker }, { quoted: m });

            await msgData.react('✅');

        } catch (error) {
            console.error('QC Sticker Error:', error);
            await msgData.react('❌');
            await msgData.reply(`Uwaaa gawat! Gagal bikin stiker quotly-nya kak: ${error.message}.. (╥﹏╥)`);
        }
    }
};

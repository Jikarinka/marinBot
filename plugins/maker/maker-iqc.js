import { generateQuote } from '../../libs/imagegen/local-imagegen.js';

export default {
    command: ['iqc'],
    category: 'maker',
    isRegistered: true,
    limit: 1,
    description: 'Membuat tampilan chat bubble dalam bentuk gambar (bukan stiker), digenerate lokal.',
    async execute(sock, m, msgData) {
        const { config, quotedContent, args, isQuoted, remoteJid, pushName, senderJid } = msgData;

        // Ambil teks dari argumen atau dari pesan yang di-reply
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
            const ppUrl = await msgData.getPP(targetJid, 'image');

            let avatarBuffer = null;
            if (ppUrl && ppUrl.startsWith('http')) {
                try {
                    const fetch = (await import('node-fetch')).default;
                    const ppRes = await fetch(ppUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                    if (ppRes.ok) avatarBuffer = Buffer.from(await ppRes.arrayBuffer());
                } catch (_) {}
            }

            const pngBuffer = await generateQuote({
                name: pushName || 'User',
                text: String(text),
                avatarBuffer,
                dark: true
            });

            await sock.sendMessage(remoteJid, {
                image: pngBuffer,
                caption: `Nih kak, gelembung chat-nya dalam versi gambar! Cantik kan? (๑>ᴗ<๑)`
            }, { quoted: m });

            await msgData.react('✅');

        } catch (error) {
            console.error('IQC Error:', error);
            await msgData.react('❌');
            await msgData.reply(`Aduuh gawat! Marin gagal bikin gambarnya kak: ${error.message}.. (╥﹏╥)`);
        }
    }
};

import axios from 'axios';
import sharp from 'sharp';
import { generateWAMessageContent, generateWAMessageFromContent, proto } from 'baileys';

/**
 * Ambil data artwork Pixiv via phixiv.net — proxy publik tanpa API key
 * yang mem-bypass proteksi Pixiv (https://github.com/thelaao/phixiv).
 */
async function fetchPixiv(link) {
    const match = link.match(/(?:artworks\/|illust_id=)(\d+)/);
    if (!match) throw new Error('Link Pixiv-nya nggak valid kak, harus link artwork (ada angka ID-nya)~');

    const id = match[1];
    const { data } = await axios.get(`https://www.phixiv.net/api/info`, {
        params: { id },
        timeout: 20000
    });

    if (!data || !data.image_proxy_urls?.length) {
        throw new Error('Artwork-nya nggak ketemu atau udah dihapus kak~ (｡T ω T｡)');
    }

    return {
        Media: data.image_proxy_urls,
        caption: data.description || data.title || 'Pixiv Artwork',
        artist: data.author_name || 'Unknown',
        tags: data.tags || []
    };
}

export default {
    command: ['pixiv', 'pixivdl'],
    category: 'downloader',
    isRegistered: true,
    limit: 1,
    description: 'Mengunduh gambar dari link Pixiv',
    async execute(sock, m, msgData) {
        const link = msgData.args[0];

        if (!link || !link.includes('pixiv.net')) {
            return sock.sendMessage(msgData.remoteJid, {
                text: `Uwaaa! Kasih Marin link Pixiv-nya dong kak buat di-download~ (˶˃ ᵕ ˂˶)\n\nContoh: \`.${msgData.commandName} https://www.pixiv.net/en/artworks/92445569\``
            }, { quoted: m });
        }

        await sock.sendMessage(msgData.remoteJid, {
            react: { text: '🕓', key: m.key }
        });

        try {
            const data = await fetchPixiv(link);

            if (!data || !data.Media || !Array.isArray(data.Media) || data.Media.length < 1) {
                return sock.sendMessage(msgData.remoteJid, {
                    text: `Maafin Marin kak, link Pixiv-nya nggak valid atau datanya nggak ketemu.. (｡T ω T｡)`
                }, { quoted: m });
            }

            const images = data.Media;
            const caption = data.caption || 'Pixiv Downloader Result';
            const artist = data.artist || 'Unknown';
            const tags = data.tags ? data.tags.join(', ') : '-';

            const push = [];

            const createImage = async (imgUrl) => {
                const response = await axios.get(imgUrl, { responseType: 'arraybuffer' });
                let buffer = Buffer.from(response.data);

                const threshold = 12 * 1024 * 1024;
                if (buffer.length > threshold) {
                    buffer = await sharp(buffer)
                        .jpeg({ quality: 80 })
                        .toBuffer();
                }

                const { imageMessage } = await generateWAMessageContent({
                    image: buffer
                }, {
                    upload: sock.waUploadToServer
                });
                return imageMessage;
            };

            if (images.length === 1) {
                const response = await axios.get(images[0], { responseType: 'arraybuffer' });
                await sock.sendMessage(msgData.remoteJid, {
                    image: Buffer.from(response.data),
                    caption: `*Pixiv Downloader*\n\n*Artist:* ${artist}\n*Tags:* ${tags}\n\n${caption}`
                }, { quoted: m });
            } else {
                for (const imageUrl of images) {
                    const imageMsg = await createImage(imageUrl);
                    push.push({
                        body: proto.Message.InteractiveMessage.Body.create({ text: caption }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: `Artist: ${artist}\nTags: ${tags}` }),
                        header: proto.Message.InteractiveMessage.Header.create({
                            title: '', hasMediaAttachment: true, imageMessage: imageMsg
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons: [{
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({ display_text: "View on Pixiv", cta_type: "1", url: link })
                            }]
                        })
                    });
                }

                const msg = generateWAMessageFromContent(msgData.remoteJid, {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                            interactiveMessage: proto.Message.InteractiveMessage.create({
                                body: proto.Message.InteractiveMessage.Body.create({
                                    text: `Horeee! Ini gambar dari link Pixiv kakak~ (˶˃ ᵕ ˂˶)\nTotal: ${images.length} halaman.`
                                }),
                                footer: proto.Message.InteractiveMessage.Footer.create({ text: `Marin Bot • Pixiv Downloader` }),
                                header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
                                carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.create({ cards: push })
                            })
                        }
                    }
                }, { quoted: m });

                await sock.relayMessage(msgData.remoteJid, msg.message, { messageId: msg.key.id });
            }

            await sock.sendMessage(msgData.remoteJid, { react: { text: '✅', key: m.key } });

        } catch (error) {
            console.error('Pixiv Downloader Error:', error);
            await sock.sendMessage(msgData.remoteJid, { react: { text: '❌', key: m.key } });
            await sock.sendMessage(msgData.remoteJid, {
                text: `Uwaaa gawat! Marin gagal download gambarnya kak.. (╥﹏╥)\n\n*Error:* ${error.message || 'Internal Server Error'}`
            }, { quoted: m });
        }
    }
};

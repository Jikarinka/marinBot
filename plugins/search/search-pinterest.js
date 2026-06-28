import axios from 'axios';
import { generateWAMessageContent, generateWAMessageFromContent, proto } from 'baileys';

/**
 * Scrape hasil pencarian Pinterest via endpoint internal resource mereka.
 * Endpoint ini dipakai oleh web Pinterest sendiri untuk render hasil search,
 * jadi tidak butuh API key.
 */
async function searchPinterest(query) {
    const sourceUrl = `/search/pins/?q=${encodeURIComponent(query)}`;
    const options = {
        isPrefetch: false,
        query,
        scope: 'pins'
    };

    const params = new URLSearchParams({
        source_url: sourceUrl,
        data: JSON.stringify({ options, context: {} }),
        _: Date.now().toString()
    });

    const { data } = await axios.get(`https://www.pinterest.com/resource/BaseSearchResource/get/?${params.toString()}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': `https://www.pinterest.com${sourceUrl}`
        },
        timeout: 20000
    });

    const results = data?.resource_response?.data?.results || [];
    return results
        .filter(r => r.images?.orig?.url)
        .map(r => ({
            directLink: r.images.orig.url,
            link: `https://www.pinterest.com/pin/${r.id}/`
        }));
}

export default {
    command: ['pinsearch', 'pinterestsearch', 'pins'],
    category: 'search',
    isRegistered: true,
    limit: 1,
    description: 'Mencari gambar di Pinterest',
    async execute(sock, m, msgData) {
        const query = msgData.args.join(' ');

        if (!query) {
            return sock.sendMessage(msgData.remoteJid, {
                text: `Uwaaa! Kakak mau cari gambar apa di Pinterest? Kasih tahu Marin yaa~ (˶˃ ᵕ ˂˶)\n\nContoh: \`.${msgData.commandName} Nao Tomori\``
            }, { quoted: m });
        }

        if (query.includes('pinterest.com') || query.includes('pin.it')) {
            return sock.sendMessage(msgData.remoteJid, {
                text: `Uwaaa! Kalau kakak punya link Pinterest-nya, pakai perintah \`.pin\` aja yaa~ (๑>ᴗ<๑)`
            }, { quoted: m });
        }

        await sock.sendMessage(msgData.remoteJid, {
            react: { text: '🕓', key: m.key }
        });

        try {
            const data = await searchPinterest(query);

            if (!Array.isArray(data) || data.length < 1) {
                return sock.sendMessage(msgData.remoteJid, {
                    text: `Maafin Marin kak, gambar Pinterest yang kakak cari nggak ketemu.. (｡T ω T｡)`
                }, { quoted: m });
            }

            const results = data.sort(() => Math.random() - 0.5).slice(0, Math.min(5, data.length));
            const push = [];

            const createImage = async (imgUrl) => {
                const response = await axios.get(imgUrl, {
                    responseType: 'arraybuffer',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                        'Referer': imgUrl
                    }
                });

                const { imageMessage } = await generateWAMessageContent({
                    image: Buffer.from(response.data)
                }, {
                    upload: sock.waUploadToServer
                });
                return imageMessage;
            };

            for (const result of results) {
                try {
                    const imageMsg = await createImage(result.directLink);
                    push.push({
                        body: proto.Message.InteractiveMessage.Body.create({ text: `Pencarian: ${query}` }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: `Marin Bot • Pinterest` }),
                        header: proto.Message.InteractiveMessage.Header.create({
                            title: '', hasMediaAttachment: true, imageMessage: imageMsg
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons: [{
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({ display_text: "View on Pinterest", cta_type: "1", url: result.link })
                            }]
                        })
                    });
                } catch (err) {
                    console.error('Failed to process one Pinterest image:', err.message);
                }
            }

            if (push.length === 0) {
                throw new Error('Gagal memproses semua gambar Pinterest.. (╥﹏╥)');
            }

            const msg = generateWAMessageFromContent(msgData.remoteJid, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: proto.Message.InteractiveMessage.Body.create({
                                text: `Horeee! Ini hasil pencarian Pinterest buat kakak~ (˶˃ ᵕ ˂˶)\nKetemu ${push.length} gambar.`
                            }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: `Marin Bot • Pinterest Search` }),
                            header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
                            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.create({ cards: push })
                        })
                    }
                }
            }, { quoted: m });

            await sock.relayMessage(msgData.remoteJid, msg.message, { messageId: msg.key.id });

            await sock.sendMessage(msgData.remoteJid, { react: { text: '✅', key: m.key } });

        } catch (error) {
            console.error('Pinterest Search Error:', error);
            await sock.sendMessage(msgData.remoteJid, { react: { text: '❌', key: m.key } });
            await sock.sendMessage(msgData.remoteJid, {
                text: `Uwaaa gawat! Marin gagal cari gambar Pinterest-nya kak.. (╥﹏╥)\n\n*Error:* ${error.message || 'Internal Server Error'}`
            }, { quoted: m });
        }
    }
};

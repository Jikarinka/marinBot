import fs from 'fs'

export default {
    command: ['forward', 'resend', 'kirimulang'],
    category: 'general',
    description: 'Kirim ulang media/file yang di-quote',
    isRegistered: true,
    limit: 1,

    async execute(sock, m, msgData) {
        const { remoteJid, isQuoted, isQuotedMedia, quotedMsg, quotedType, quotedMime, args } = msgData

        if (!isQuoted || !isQuotedMedia) {
            return await msgData.reply('Silakan quote/reply media yang ingin dikirim ulang! 📌')
        }

        await msgData.react('⏳')

        try {
            const buffer = await msgData.downloadMedia()
            
            if (!buffer) {
                return await msgData.reply('Gagal mengunduh media. Coba lagi nanti! ❌')
            }

            // Perbaikan: Jika args adalah array, gabungkan menjadi string dengan spasi
            const customCaption = Array.isArray(args) ? args.join(' ') : args;
            const caption = customCaption || quotedMsg[quotedType]?.caption || ''
            const fileName = quotedMsg[quotedType]?.fileName || 'file'

            let messagePayload = {}

            if (quotedType === 'imageMessage') {
                messagePayload = { image: buffer, caption: caption }
            } else if (quotedType === 'videoMessage') {
                messagePayload = { video: buffer, caption: caption, mimetype: 'video/mp4' }
            } else if (quotedType === 'audioMessage') {
                messagePayload = { audio: buffer, mimetype: 'audio/mpeg', ptt: quotedMsg[quotedType]?.ptt || false }
            } else if (quotedType === 'documentMessage') {
                // Deteksi lebih akurat untuk file yang sebenarnya adalah gambar atau video
                const mime = quotedMime || quotedMsg[quotedType]?.mimetype || ''
                const isImage = mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName)
                const isVideo = mime.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/i.test(fileName)

                if (isImage) {
                    messagePayload = { image: buffer, caption: caption }
                } else if (isVideo) {
                    messagePayload = { video: buffer, caption: caption, mimetype: mime || 'video/mp4' }
                } else {
                    messagePayload = { document: buffer, mimetype: mime || 'application/octet-stream', fileName: fileName, caption: caption }
                }
            } else if (quotedType === 'stickerMessage') {
                messagePayload = { sticker: buffer }
            } else {
                return await msgData.reply('Tipe media ini tidak didukung untuk dikirim ulang. 😕')
            }

            await sock.sendMessage(remoteJid, messagePayload, { quoted: m })
            await msgData.react('✅')
        } catch (error) {
            console.error('[ForwardPlugin] Error:', error)
            await msgData.reply(`❌ Gagal mengirim ulang media: ${error.message}`)
        }
    }
}

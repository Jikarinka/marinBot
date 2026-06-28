import axios from 'axios'

export default {
    command: ['ernieimg'],
    category: 'ai',
    isRegistered: true,
    description: 'Mengubah teks menjadi gambar menggunakan ERNIE-Image',

    async execute(sock, m, msgData) {
        const { remoteJid, args, commandName } = msgData
        const text = args.join(' ')

        if (!text) {
            return msgData.reply(`Cara penggunaan:\n${commandName} <prompt>\n\nContoh:\n${commandName} a sunset at the alps`)
        }

        // Lock process per chat
        sock.ernieimg = sock.ernieimg || {}
        if (sock.ernieimg[remoteJid]) {
            return msgData.reply('⚠️ Kamu masih punya proses generate gambar yang berjalan. Tunggu sebentar ya!')
        }

        const initialMessage = await msgData.reply('✨ Generating image... Please wait.')
        
        const timeout = setTimeout(() => {
            if (sock.ernieimg[remoteJid]) {
                sock.sendMessage(remoteJid, { text: `[ ⚠️ ] Timeout!\nCommand ${commandName} bisa digunakan kembali.` }, { quoted: m })
                delete sock.ernieimg[remoteJid]
            }
        }, 1000 * 60 * 2)

        sock.ernieimg[remoteJid] = { initialMessage, timeout }

        try {
            const hfToken = process.env.HF_KEY
            if (!hfToken) {
                throw new Error('HF_KEY tidak ditemukan di environment variables. Hubungi owner!')
            }

            const result = await erniePoll({
                baseUrl: 'https://baidu-ernie-image-turbo.hf.space/gradio_api/call/generate_image/',
                prompt: text,
                token: hfToken
            })

            if (!result.status) {
                throw new Error(result.message)
            }

            const imageUrl = result.data.image_url
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
            
            await sock.sendMessage(remoteJid, {
                image: Buffer.from(response.data),
                caption: `*Prompt:* ${text}`
            }, { quoted: m })

        } catch (error) {
            console.error('[ernieimg] Error:', error)
            await msgData.reply(`❌ Gagal: ${error.message}`)
        } finally {
            if (sock.ernieimg[remoteJid]) {
                clearTimeout(sock.ernieimg[remoteJid].timeout)
                delete sock.ernieimg[remoteJid]
            }
        }
    }
}

async function erniePoll(opts, retryCount = 10) {
    try {
        const generate = await axios.post(opts.baseUrl, {
            data: [opts.prompt, '1024x1024', -1, true]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${opts.token}`
            }
        })

        const eventId = generate.data.event_id
        const statusUrl = opts.baseUrl + eventId

        // Polling for the result
        for (let i = 0; i < retryCount; i++) {
            const statusRes = await axios.get(statusUrl)
            const responseText = statusRes.data
            
            // Gradio API often returns text/html or json with the URL
            const regex = /https?:\/\/[^\s"]+/g
            const urls = typeof responseText === 'string' ? responseText.match(regex) : JSON.stringify(responseText).match(regex)

            if (urls && urls.length > 0 && !urls[0].includes('subscription')) {
                return {
                    status: true,
                    data: { image_url: urls[0] }
                }
            }
            
            // Wait 1 second before next poll
            await new Promise(resolve => setTimeout(resolve, 1000))
        }

        return {
            status: false,
            message: 'Gagal mendapatkan URL gambar setelah beberapa kali percobaan.'
        }
    } catch (e) {
        return {
            status: false,
            message: e.response?.data?.message || e.message
        }
    }
}

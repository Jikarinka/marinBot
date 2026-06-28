import fs from 'fs'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

const filters = {
    bass: '-af equalizer=f=94:width_type=o:width=2:g=30',
    blown: '-af acrusher=.1:1:64:0:log',
    deep: '-af atempo=4/4,asetrate=44500*2/3',
    earrape: '-af volume=12',
    fast: '-filter:a "atempo=1.63,asetrate=44100"',
    fat: '-filter:a "atempo=1.6,asetrate=22100"',
    nightcore: '-filter:a atempo=1.06,asetrate=44100*1.25',
    reverse: '-filter_complex "areverse"',
    robot: '-filter_complex "afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75"',
    slow: '-filter:a "atempo=0.7,asetrate=44100"',
    smooth: '-filter:v "minterpolate=\'mi_mode=mci:mc_mode=aobmc:vsbmc=1:fps=120\'"',
    tupai: '-filter:a "atempo=0.5,asetrate=65100"',
    squirrel: '-filter:a "atempo=0.5,asetrate=65100"',
    chipmunk: '-filter:a "atempo=0.5,asetrate=65100"',
}

export default {
    // Menggunakan suffix _file agar tidak bentrok dengan plugin audio-mod sebelumnya
    command: ['bassfile', 'blownfile', 'deepfile', 'earrapefile', 'fastfile', 'nightcorefile', 'reversefile', 'robotfile', 'slowfile', 'smoothfile', 'tupaifile', 'squirrelfile', 'chipmunkfile'],
    category: 'general',
    description: 'Modifikasi audio dan kirim sebagai file (document).',

    async execute(sock, m, msgData) {
        const { remoteJid, commandName } = msgData
        
        // Map commandName back to filter key (e.g., 'bassfile' -> 'bass')
        const filterKey = commandName.replace('file', '')
        
        // Fallback logic if m.quoted is missing
        let q = m.quoted
        if (!q && m.message?.extendedTextMessage?.contextInfo) {
            const context = m.message.extendedTextMessage.contextInfo
            q = {
                key: { 
                    remoteJid: context.participant || remoteJid, 
                    id: context.stanzaId 
                },
                message: context.quotedMessage,
                ...context
            }
        }
        if (!q) q = m

        const content = q.message || q.msg || q
        const mime = q.mimetype || 
                     (q.msg && q.msg.mimetype) || 
                     (content.mimetype) || 
                     (Object.values(content)[0]?.mimetype) || 
                     ''

        const isMedia = /audio|video|application\/octet-stream/.test(mime) || 
                        content.audioMessage || 
                        content.videoMessage || 
                        content.documentMessage ||
                        (q.msg && (q.msg.audioMessage || q.msg.videoMessage || q.msg.documentMessage))

        if (!isMedia) {
            return await msgData.reply(`*ʀᴇꜱᴘᴏɴᴅ ᴛᴏ ᴛʜᴇ ᴀᴜᴅɪᴏ, ᴠɪᴅᴇᴏ, ᴏʀ ᴅᴏᴄᴜᴍᴇɴᴛ ꜰɪʟᴇ, ᴜꜱᴇ ᴛʜᴇ ᴄᴏᴍᴍᴀɴᴅ .${commandName}*`)
        }

        try {
            await msgData.react('⏳')
            
            const filter = filters[filterKey]
            if (!filter) throw new Error('Filter tidak ditemukan.')

            let mediaBuffer
            if (typeof q.download === 'function') {
                mediaBuffer = await q.download()
            } else if (typeof msgData.downloadMedia === 'function') {
                mediaBuffer = await msgData.downloadMedia(q)
            } else if (sock.downloadMedia) {
                mediaBuffer = await sock.downloadMedia(q)
            } else {
                throw new Error('Metode download tidak tersedia.')
            }

            if (!mediaBuffer) throw new Error('Gagal mengunduh media.')

            const inputPath = path.join(os.tmpdir(), `input_${Date.now()}.tmp`)
            const outputPath = path.join(os.tmpdir(), `output_${Date.now()}.mp3`)

            fs.writeFileSync(inputPath, mediaBuffer)

            await execPromise(`ffmpeg -i "${inputPath}" ${filter} "${outputPath}"`)

            const outputBuffer = fs.readFileSync(outputPath)

            // Kirim sebagai Dokumen/File
            await sock.sendMessage(remoteJid, {
                document: outputBuffer,
                mimetype: 'audio/mpeg',
                fileName: `${filterKey}_modified.mp3`
            }, { quoted: m })

            // Cleanup
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)

            await msgData.react('✅')
        } catch (error) {
            console.error(`[audio-mod-file] Error:`, error)
            await msgData.reply(`❌ Gagal memproses audio: ${error.message}`)
        }
    }
}

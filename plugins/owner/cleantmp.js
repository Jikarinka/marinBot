import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const ROOT       = path.join(__dirname, '../../')

export default {
    command: ['ctmp'],
    category: 'owner',
    isOwner: true,
    description: 'Bersihkan folder tmp, temp, dan hapus file player-script.js',

    async execute(sock, m, msgData) {
        const { remoteJid } = msgData
        await msgData.reply('🧹 Sedang membersihkan sampah sistem...')

        let deletedCount = 0
        let errors = []

        const targetFolders = [
            path.join(ROOT, 'temp'), // Local temp
            os.tmpdir()              // System tmp
        ]

        for (const folder of targetFolders) {
            try {
                if (fs.existsSync(folder)) {
                    const files = fs.readdirSync(folder)
                    for (const file of files) {
                        const filePath = path.join(folder, file)
                        
                        // Hapus jika file ada di folder temp/tmp ATAU mengandung 'player-script.js'
                        if (file.includes('player-script.js') || folder.includes('temp') || folder.includes('tmp')) {
                            try {
                                if (fs.lstatSync(filePath).isFile()) {
                                    fs.unlinkSync(filePath)
                                    deletedCount++
                                }
                            } catch (e) {
                                // Beberapa file sistem /tmp mungkin tidak bisa dihapus (permission denied)
                                // Kita abaikan saja agar tidak memenuhi log
                            }
                        }
                    }
                }
            } catch (err) {
                errors.push(`Folder ${folder}: ${err.message}`)
            }
        }

        // Tambahan: Cari player-script.js di root folder juga
        try {
            const rootFiles = fs.readdirSync(ROOT)
            for (const file of rootFiles) {
                if (file.includes('player-script.js')) {
                    fs.unlinkSync(path.join(ROOT, file))
                    deletedCount++
                }
            }
        } catch (err) {
            errors.push(`Root folder: ${err.message}`)
        }

        const response = `✅ *Cleanup Selesai!*\n\n` +
                         `🗑️ Total file dihapus: *${deletedCount} file*\n` +
                         `📂 Folder dibersihkan: \n- \`${os.tmpdir()}\`\n- \`${path.join(ROOT, 'temp')}\`\n\n` +
                         (errors.length > 0 ? `⚠️ *Catatan:* Beberapa file sistem tidak bisa dihapus karena izin akses.` : '')

        await sock.sendMessage(remoteJid, { text: response }, { quoted: m })
        await msgData.react('✨')
    }
}

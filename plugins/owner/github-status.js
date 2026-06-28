import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { fileURLToPath } from 'url'

const execPromise = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const ROOT       = path.join(__dirname, '../../')

export default {
    command: ['github-status', 'ghstatus'],
    category: 'owner',
    isOwner: true,
    description: 'Cek status repository GitHub (perubahan file, branch, dll)',

    async execute(sock, m, msgData) {
        const { remoteJid } = msgData
        await msgData.react('🔍')

        try {
            // 1. Cek Branch saat ini
            const { stdout: branch } = await execPromise('git rev-parse --abbrev-ref HEAD', { cwd: ROOT })
            
            // 2. Cek Status Singkat (Short Status)
            const { stdout: statusShort } = await execPromise('git status --short', { cwd: ROOT })
            
            // 3. Cek apakah ada commit yang belum di-push
            const { stdout: statusBranch } = await execPromise('git status -sb', { cwd: ROOT })
            const isAhead = statusBranch.includes('ahead')

            let response = `📊 *GitHub Repository Status*\n\n`
            response += `🌿 *Branch:* \`${branch.trim()}\`\n`

            if (!statusShort) {
                response += `✅ *Status:* Working directory clean. (Tidak ada perubahan)\n`
            } else {
                response += `⚠️ *Status:* Ada perubahan yang belum di-commit:\n`
                response += `\`\`\`\n${statusShort.trim()}\n\`\`\`\n`
            }

            if (isAhead) {
                response += `🚀 *Sync:* Ada commit yang belum di-push ke remote.\n`
                response += `Gunakan \`.github-push\` untuk upload.`
            } else {
                response += `☁️ *Sync:* Up-to-date dengan remote.`
            }

            await sock.sendMessage(remoteJid, { text: response }, { quoted: m })
            await msgData.react('✅')

        } catch (error) {
            console.error('[github-status] Error:', error)
            await msgData.reply(`❌ Gagal mengecek status GitHub: ${error.message}`)
            await msgData.react('❌')
        }
    }
}

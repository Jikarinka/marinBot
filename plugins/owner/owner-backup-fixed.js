import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { ZipArchive } from 'archiver'   // ⬅️ FIX: archiver v8 ESM-only, named export 'ZipArchive' (bukan default export lagi)
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const ROOT       = path.join(__dirname, '../../')
export default {
    command: ['kbackup', 'backup'],
    category: 'owner',
    isOwner: true,
    description: 'Backup seluruh file bot ke zip dan kirim ke Owner',
    async execute(sock, m, msgData) {
        const { remoteJid } = msgData
        const ownerNumber = '6281249241152@s.whatsapp.net'
        const nameFile = `kanna-backup-${Date.now()}.zip`
        
        // FIX: Pindah dari os.tmpdir() (limit 100MB) ke folder temp internal bot (limit 20GB)
        const tempDir = path.join(ROOT, 'temp')
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
        const outPath = path.join(tempDir, nameFile)

        await msgData.reply(`📦 Sedang membuat backup: *${nameFile}*...`)
        const output = fs.createWriteStream(outPath)
        const archive = new ZipArchive({ zlib: { level: 9 } })   // ⬅️ FIX: new ZipArchive({...}) menggantikan archiver('zip', {...})
        
        // UPDATED EXCLUDE: Menambahkan 'sessions' dan 'mcp/backups' agar tidak ikut ter-backup
        const EXCLUDE = ['node_modules', 'tmp', 'temp', '.local', '.config', '.npm', '.cache', '.git', 'sessions', 'mcp/backups']
        
        try {
            await new Promise((resolve, reject) => {
                let settled = false
                const fail = (err) => { if (!settled) { settled = true; reject(err) } }
                const ok = () => { if (!settled) { settled = true; resolve() } }

                output.on('close', ok)
                output.on('error', fail)      // tanpa ini, error nulis ke disk bikin nyangkut/crash diam-diam
                archive.on('error', fail)
                archive.on('warning', (err) => {
                    if (err.code === 'ENOENT') {
                        console.warn('[BackupPlugin] Warning (file hilang saat dibaca):', err.message)
                    } else {
                        fail(err)
                    }
                })
                archive.pipe(output)

                // Menambahkan semua file dari root kecuali folder yang di-exclude
                // dot: true → .env dkk ikut ke-backup (default glob skip semua yang diawali titik)
                archive.glob('**/*', {
                    cwd: ROOT,
                    dot: true,
                    ignore: EXCLUDE.map(e => `${e}/**`)
                })

                // archiver v8: finalize() juga return Promise sendiri — di-catch ke 'fail',
                // sementara 'resolve' tetap nunggu event 'close' di output (paling akurat
                // menandakan file zip sudah benar-benar selesai ditulis & di-flush ke disk)
                archive.finalize().catch(fail)
            })

            const stat = fs.statSync(outPath)
            const fileSize = (stat.size / (1024 * 1024)).toFixed(2)

            if (stat.size > 1900 * 1024 * 1024) {
                throw new Error(`Arsip ${fileSize} MB, terlalu besar untuk dikirim ke WhatsApp.`)
            }

            const buffer = fs.readFileSync(outPath)
            // Kirim ke nomor Owner yang ditentukan
            await sock.sendMessage(ownerNumber, {
                document: buffer,
                mimetype: 'application/zip',
                fileName: nameFile,
                caption: `🗓️ *Backup KannaBot*\nUkuran: ${fileSize} MB\nArsip otomatis terhapus dari server.`
            }, { quoted: m })
            await msgData.reply(`✅ Arsip selesai (${fileSize} MB) dan telah dikirim ke nomor Owner.`)
            await msgData.react('✅')
            // Hapus file temporary
            if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
        } catch (error) {
            console.error('[BackupPlugin] Error:', error)
            await msgData.reply(`❌ Gagal membuat backup: ${error.message}`)
            if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
        }
    }
}

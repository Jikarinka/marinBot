import { exec } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { promisify } from 'util'

const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.join(__dirname, '../../')

export default {
    command: ['github-push'],
    category: 'owner',
    isOwner: true,
    description: 'Upload project ke GitHub',

    async execute(sock, m, msgData) {
        const { args } = msgData

        const commitMessage =
            args.length > 0
                ? args.join(' ')
                : 'Update by Marin Bot'

        await msgData.reply('🚀 Sedang upload ke GitHub...')
        await msgData.react('⏳')

        try {
            const token = process.env.GITHUB_TOKEN
            const user = process.env.GITHUB_USER
            const repo = process.env.GITHUB_REPO

            if (!token || !user || !repo) {
                throw new Error(
                    'GITHUB_TOKEN, GITHUB_USER, atau GITHUB_REPO belum diset'
                )
            }

            // Hapus cache puppeteer agar tidak ikut ke GitHub
            const cacheDir = path.join(ROOT, '.cache')

            if (existsSync(cacheDir)) {
                await fs.rm(cacheDir, {
                    recursive: true,
                    force: true
                })
            }

            const gitignorePath = path.join(ROOT, '.gitignore')

            const ignoreRules = [
                '.cache/',
                'node_modules/',
                '.env',
                'README.md',
                'sessions/',
                '*.log',
                '*.zip',
                '.DS_Store'
            ]

            if (!existsSync(gitignorePath)) {
                await fs.writeFile(
                    gitignorePath,
                    ignoreRules.join('\n')
                )
            } else {
                let content = await fs.readFile(
                    gitignorePath,
                    'utf8'
                )

                for (const rule of ignoreRules) {
                    if (!content.includes(rule)) {
                        content += '\n' + rule
                    }
                }

                await fs.writeFile(gitignorePath, content)
            }

            const remoteUrl =
                `https://${user}:${token}@github.com/${user}/${repo}.git`

            try {
                await execAsync('git init', {
                    cwd: ROOT
                })
            } catch {}

            await execAsync(
                'git config user.email "marin@bot.com"',
                { cwd: ROOT }
            )

            await execAsync(
                'git config user.name "Marin Bot"',
                { cwd: ROOT }
            )

            try {
                await execAsync(
                    'git remote remove origin',
                    { cwd: ROOT }
                )
            } catch {}

            await execAsync(
                `git remote add origin "${remoteUrl}"`,
                { cwd: ROOT }
            )

            // Hapus cache dari git index jika pernah terlanjur masuk
            try {
                await execAsync(
                    'git rm -r --cached .cache',
                    { cwd: ROOT }
                )
            } catch {}

            try {
                await execAsync(
                    'git rm -r --cached node_modules',
                    { cwd: ROOT }
                )
            } catch {}

            await execAsync('git add .', {
                cwd: ROOT
            })

            const { stdout: status } =
                await execAsync(
                    'git status --porcelain',
                    { cwd: ROOT }
                )

            if (!status.trim()) {
                await msgData.reply(
                    '✅ Tidak ada perubahan untuk di-upload.'
                )
                await msgData.react('✅')
                return
            }

            await execAsync(
                `git commit -m "${commitMessage}"`,
                { cwd: ROOT }
            )

            await execAsync(
                'git branch -M main',
                { cwd: ROOT }
            )

            await execAsync(
                'git push -u origin main',
                { cwd: ROOT }
            )

            await msgData.reply(
                `✅ Berhasil upload ke GitHub!\n\n` +
                `📦 Repo: ${repo}\n` +
                `📝 Commit: ${commitMessage}\n` +
                `🌿 Branch: main`
            )

            await msgData.react('✅')

        } catch (error) {
            console.error(error)

            await msgData.reply(
                `❌ Gagal upload:\n\n${error.message}`
            )

            await msgData.react('❌')
        }
    }
}
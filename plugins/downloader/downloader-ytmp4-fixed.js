import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execPromise = promisify(exec);

export default {
    command: ['ytmp4', 'ytvideo', 'ytv'],
    category: 'downloader',
    isRegistered: true,
    limit: 5,
    description: 'Mengunduh video dari YouTube menggunakan yt-dlp (Local Binary)',
    async execute(sock, m, msgData) {
        const { remoteJid, args } = msgData;

        if (!args[0]) {
            return msgData.reply(`Umm... Kakak lupa masukkan link YouTube-nya ya? Ketik .${msgData.commandName} <url> yaa~ (˶˃ ᵕ ˂˶)`);
        }

        const videoUrl = args[0];
        await msgData.react('🕓');

        try {
            const tempDir = path.join(process.cwd(), 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // PAKSA Node.js dan Baileys menggunakan folder temp lokal, bukan /tmp sistem yang cuma 100MB
            process.env.TMPDIR = tempDir;
            process.env.TMP = tempDir;
            process.env.TEMP = tempDir;

            // 1. Ambil judul video
            const { stdout: infoOut } = await execPromise(`TMPDIR=${tempDir} ./bin/yt-dlp --get-title --no-playlist ${videoUrl}`);
            const title = infoOut.trim();

            // 2. Download video
            const fileName = `yt_${Date.now()}.mp4`;
            const filePath = path.join(tempDir, fileName);
            
            await execPromise(`TMPDIR=${tempDir} ./bin/yt-dlp -f "best[ext=mp4]/best" --no-playlist -o "${filePath}" ${videoUrl}`);

            // 3. Validasi file
            if (!fs.existsSync(filePath)) {
                throw new Error('Gagal mengunduh video, file tidak ditemukan di server.');
            }

            const stats = fs.statSync(filePath);
            const fileSizeInMB = stats.size / (1024 * 1024);

            if (fileSizeInMB > 64) {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                throw new Error(`Video terlalu besar (${fileSizeInMB.toFixed(2)} MB). Maksimal 64 MB ya kak!`);
            }

            // 4. Kirim video
            // Kita gunakan buffer (readFileSync) agar Baileys tidak mencoba membuat file temporary di /tmp sistem
            // karena file sudah divalidasi < 64MB, jadi aman bagi RAM.
            const videoBuffer = fs.readFileSync(filePath);

            await sock.sendMessage(remoteJid, {
                video: videoBuffer, 
                caption: `🎬 *${title}*\n\nBerhasil didownload oleh Marin! (๑˃ᴗ˂)ﻭ`,
                mimetype: 'video/mp4'
            }, { quoted: m });

            // 5. Hapus file temporary
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            await msgData.react('✅');

        } catch (error) {
            console.error('YT-DLP Error:', error);
            await msgData.react('❌');
            
            let errorMsg = error.message;
            if (errorMsg.includes('Unable to download')) {
                errorMsg = 'Video ini tidak bisa didownload atau link-nya salah kak.';
            } else if (errorMsg.includes('ENOSPC')) {
                errorMsg = 'Penyimpanan sementara server penuh. Marin sudah mencoba memperbaikinya, coba lagi ya!';
            }

            msgData.reply(`Ups, Marin gagal download videonya kak.. (╥﹏╥)\n\n*Error:* ${errorMsg}`);
        }
    }
};

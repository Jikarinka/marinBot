import fs from 'fs';
import path from 'path';

export default {
    command: ['ytmp3', 'ytaudio', 'yta'],
    category: 'downloader',
    isRegistered: true,
    limit: 3,
    description: 'Mengunduh audio dari YouTube menggunakan API Etacloud.',
    async execute(sock, m, msgData) {
        const { remoteJid, args, commandName } = msgData;

        if (!args[0]) {
            return msgData.reply(`Duhh Kakak lupa ya? Masukkan link YouTube-nya yaa! Contoh: .${commandName} <url> (˶˃ ᵕ ˂˶)`);
        }

        const youtubeUrl = args[0];
        await msgData.react('🕓');

        try {
            const result = await ytmp3(youtubeUrl);

            if (result.message) {
                throw new Error(result.message);
            }

            await msgData.react('✅');

            // Download buffer sendiri (bukan kasih url mentah ke Baileys) — beberapa
            // CDN Etacloud butuh header Referer/User-Agent yang sama kayak API call-nya,
            // kalau di-fetch langsung sama Baileys tanpa header itu bisa balik kosong/ditolak.
            const audioBuffer = await downloadAudioBuffer(result.downloadURL);

            await sock.sendMessage(remoteJid, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: m });

            await sock.sendMessage(remoteJid, {
                text: `✅ *Berhasil Mengunduh Audio*\n\n🎵 *Judul:* ${result.title || 'Unknown Title'}\n👤 *Channel:* ${result.author || '-'}\n🆔 *ID:* ${result.videoId}\n📦 *Format:* ${result.format}`
            }, { quoted: m });

        } catch (error) {
            await msgData.react('❌');
            console.error(`[ytmp3] Error: ${error.message}`);
            await msgData.reply(`❌ *Ups, terjadi kesalahan:*\n${error.message}`);
        }
    }
};

// Download buffer audio sendiri, pakai header yang sama kayak panggilan API Etacloud
// lainnya (beberapa CDN nolak/return kosong kalau di-fetch tanpa Referer/User-Agent ini).
async function downloadAudioBuffer(url) {
    if (!url) throw new Error('downloadURL kosong dari server Etacloud');

    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 16; Infinix X6837 Build/BP2A.250605.031.A2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.217 Mobile Safari/537.36",
            "Accept": "*/*",
            "Origin": "https://y2mate.cc",
            "Referer": "https://y2mate.cc/"
        }
    });

    if (!res.ok) throw new Error(`Gagal download audio dari server (HTTP ${res.status})`);

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validasi: kalau hasilnya kekecilan atau ternyata bukan binary audio (misal
    // malah dapat halaman error/JSON yang nyamar), jangan dikirim sebagai audio kosong.
    if (buffer.length < 2048) {
        const preview = buffer.toString('utf8', 0, Math.min(buffer.length, 200));
        throw new Error(`File audio kosong/terlalu kecil (${buffer.length} bytes). Kemungkinan link sudah expired atau diblokir server. Preview: ${preview}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
        throw new Error(`Server balikin ${contentType} bukan file audio (link mungkin expired/diblokir)`);
    }

    return buffer;
}

// Ambil judul & nama channel asli dari YouTube oEmbed (resmi, publik, no API key)
// — independen dari Etacloud yang ternyata gak pernah ngembaliin title sama sekali.
async function fetchYoutubeMeta(videoId) {
    try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
        const res = await fetch(oembedUrl);
        if (!res.ok) return { title: '', author: '' };
        const data = await res.json();
        return { title: data.title || '', author: data.author_name || '' };
    } catch (e) {
        console.warn('[ytmp3] Gagal ambil metadata oEmbed:', e.message);
        return { title: '', author: '' };
    }
}

async function ytmp3(youtubeUrl, format = 'mp3') {
    const match = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|live\/|shorts\/)|[?&]v=)([a-zA-Z0-9-_]{11})/.exec(youtubeUrl);
    if (!match) return { message: "URL YouTube tidak valid" };

    const videoId = match[1];
    const endpoint = 'etacloud.org';
    const getTs = () => Date.now();

    const browserHeaders = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 16; Infinix X6837 Build/BP2A.250605.031.A2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.217 Mobile Safari/537.36",
        "Accept": "*/*",
        "Origin": "https://y2mate.cc",
        "Referer": "https://y2mate.cc/",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-Mode": "cors"
    };

    async function safeFetch(url, options = {}) {
        options.headers = { ...browserHeaders, ...options.headers };
        const res = await fetch(url, options);
        const text = await res.text();

        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error(`Diblokir oleh server! URL: ${url} \nStatus HTTP: ${res.status}\nBody Response: ${text.substring(0, 150)}...`);
        }
    }

    const appendParam = (url, params) => url.includes('?') ? `${url}&${params}` : `${url}?${params}`;

    try {
        // Ambil metadata YouTube secara paralel, gak nunggu/ngeblok proses convert
        const metaPromise = fetchYoutubeMeta(videoId);

        const authData = await safeFetch(`https://eta.${endpoint}/api/v1/auth?_=${getTs()}`);
        if (authData.error > 0) throw new Error('Authorization gagal');

        const initData = await safeFetch(`https://eta.${endpoint}/api/v1/init?_=${getTs()}`, {
            headers: { 'Authorization': `Bearer ${authData.key}` }
        });
        if (initData.error > 0) throw new Error('Initialization gagal');

        async function executeConvert(url) {
            let baseUrl = url.includes('&v=') ? url.split('&v=')[0] : url;
            let fetchUrl = appendParam(baseUrl, `v=${videoId}&f=${format}&_=${getTs()}`);
            const convertData = await safeFetch(fetchUrl);

            if (convertData.error > 0) throw new Error(`Server menolak konversi. Error Code: ${convertData.error}`);

            if (convertData.redirect === 1) {
                return executeConvert(convertData.redirectURL);
            }
            return convertData;
        }

        const convertData = await executeConvert(initData.convertURL);
        let finalData = convertData;

        // FIX: dibatasi maksimal 30x polling (~90 detik). Tanpa batas ini, kalau
        // progress macet di server Etacloud, command bisa nyangkut selama-lamanya
        // tanpa pernah ngirim respon apapun ke user.
        let pollCount = 0;
        const MAX_POLL = 30;
        while (finalData.progress !== undefined && finalData.progress < 3) {
            if (++pollCount > MAX_POLL) {
                throw new Error('Timeout: proses convert di server Etacloud kelamaan (>90 detik), dibatalkan.');
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
            let progressUrl = appendParam(convertData.progressURL, `_=${getTs()}`);
            finalData = await safeFetch(progressUrl);

            if (finalData.error > 0) throw new Error('Server gagal saat mencoba men-convert video');
        }

        const meta = await metaPromise;

        return {
            videoId: videoId,
            format: format,
            title: finalData.title || convertData.title || meta.title || "",
            author: meta.author || "",
            downloadURL: finalData.downloadURL || convertData.downloadURL,
            raw: finalData
        };

    } catch (error) {
        return {
            message: error.message
        };
    }
}

/**
 * Local Image Generator — pengganti API_MARIN image-generator
 * Generate gambar dari SVG lalu render ke PNG pakai sharp.
 * Semua lokal, tidak bergantung API eksternal sama sekali.
 */

import sharp from 'sharp';

/** Escape karakter spesial XML agar SVG tidak rusak */
function escapeXml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Wrap teks panjang menjadi beberapa baris berdasarkan estimasi lebar karakter.
 * @param {string} text
 * @param {number} maxCharsPerLine
 * @returns {string[]}
 */
function wrapText(text, maxCharsPerLine = 20) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let current = '';

    for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (test.length > maxCharsPerLine && current) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
    return lines;
}

/**
 * Generate stiker bergaya "Brat" — teks hitam di atas background putih polos,
 * font besar, posisi center, sedikit miring khas estetika brat.
 *
 * @param {string} text
 * @returns {Promise<Buffer>} PNG buffer 512x512
 */
export async function generateBrat(text) {
    const size = 512;
    const lines = wrapText(text.toUpperCase(), 14).slice(0, 6);
    const fontSize = lines.length <= 2 ? 64 : lines.length <= 4 ? 48 : 36;
    const lineHeight = fontSize * 1.15;
    const totalHeight = lines.length * lineHeight;
    const startY = (size - totalHeight) / 2 + fontSize * 0.8;

    const textElements = lines.map((line, i) =>
        `<text x="50%" y="${startY + i * lineHeight}" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-weight="700"
            font-size="${fontSize}" fill="#0a0a0a" letter-spacing="-1">${escapeXml(line)}</text>`
    ).join('\n');

    const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <filter id="blur"><feGaussianBlur stdDeviation="0.6"/></filter>
        <g filter="url(#blur)">
            ${textElements}
        </g>
    </svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Generate Quote Chat (quotly-style) — bubble chat yang dijadikan stiker.
 *
 * @param {object} opts
 * @param {string} opts.name Nama pengirim
 * @param {string} opts.text Isi pesan
 * @param {Buffer} [opts.avatarBuffer] Foto profil (opsional)
 * @param {boolean} [opts.dark=true] Tema gelap atau terang
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateQuote({ name, text, avatarBuffer = null, dark = true }) {
    const width = 600;
    const lines = wrapText(text, 38).slice(0, 12);
    const fontSize = 28;
    const lineHeight = fontSize * 1.4;
    const padding = 30;
    const avatarSize = 60;
    const bubbleHeight = lines.length * lineHeight + 80;
    const height = bubbleHeight + padding * 2;

    const bg = dark ? '#0b141a' : '#e9edef';
    const bubbleBg = dark ? '#1f2c34' : '#ffffff';
    const nameColor = dark ? '#06cf9c' : '#06cf9c';
    const textColor = dark ? '#e9edef' : '#111b21';

    let avatarBase64 = '';
    if (avatarBuffer) {
        const resized = await sharp(avatarBuffer).resize(avatarSize, avatarSize).png().toBuffer();
        avatarBase64 = resized.toString('base64');
    }

    const textElements = lines.map((line, i) =>
        `<text x="${padding + avatarSize + 60}" y="${padding + 50 + i * lineHeight}"
            font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}"
            fill="${textColor}">${escapeXml(line)}</text>`
    ).join('\n');

    const avatarElement = avatarBase64
        ? `<defs>
             <clipPath id="avatarClip"><circle cx="${padding + avatarSize / 2 + 20}" cy="${padding + 50}" r="${avatarSize / 2}"/></clipPath>
           </defs>
           <image x="${padding + 20}" y="${padding + 20}" width="${avatarSize}" height="${avatarSize}"
             xlink:href="data:image/png;base64,${avatarBase64}" clip-path="url(#avatarClip)"/>`
        : `<circle cx="${padding + avatarSize / 2 + 20}" cy="${padding + 50}" r="${avatarSize / 2}" fill="#6b7c85"/>`;

    const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <rect width="100%" height="100%" fill="${bg}"/>
        <rect x="${padding}" y="${padding}" width="${width - padding * 2}" height="${bubbleHeight}"
            rx="20" fill="${bubbleBg}"/>
        ${avatarElement}
        <text x="${padding + avatarSize + 60}" y="${padding + 35}"
            font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="22"
            fill="${nameColor}">${escapeXml(name)}</text>
        ${textElements}
    </svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Generate Fake Tweet — mirip tampilan tweet Twitter/X.
 *
 * @param {object} opts
 * @param {string} opts.name Nama display
 * @param {string} opts.username Username (tanpa @)
 * @param {string} opts.text Isi tweet
 * @param {Buffer} [opts.avatarBuffer]
 * @param {Buffer} [opts.mediaBuffer] Gambar tambahan di tweet (opsional)
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateFakeTweet({ name, username, text, avatarBuffer = null, mediaBuffer = null }) {
    const width = 600;
    const padding = 24;
    const avatarSize = 50;
    const fontSize = 26;
    const lines = wrapText(text, 42).slice(0, 10);
    const lineHeight = fontSize * 1.35;
    const textBlockHeight = lines.length * lineHeight;

    let mediaHeight = 0;
    let mediaBase64 = '';
    const mediaWidth = width - padding * 2;
    if (mediaBuffer) {
        const resized = await sharp(mediaBuffer)
            .resize(mediaWidth, 320, { fit: 'cover' })
            .png().toBuffer();
        mediaBase64 = resized.toString('base64');
        mediaHeight = 320 + 16;
    }

    const height = padding + avatarSize + 24 + textBlockHeight + mediaHeight + padding + 50;

    let avatarBase64 = '';
    if (avatarBuffer) {
        const resized = await sharp(avatarBuffer).resize(avatarSize, avatarSize).png().toBuffer();
        avatarBase64 = resized.toString('base64');
    }

    const textY = padding + avatarSize + 50;
    const textElements = lines.map((line, i) =>
        `<text x="${padding}" y="${textY + i * lineHeight}"
            font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}"
            fill="#0f1419">${escapeXml(line)}</text>`
    ).join('\n');

    const avatarElement = avatarBase64
        ? `<defs><clipPath id="avClip"><circle cx="${padding + avatarSize / 2}" cy="${padding + avatarSize / 2}" r="${avatarSize / 2}"/></clipPath></defs>
           <image x="${padding}" y="${padding}" width="${avatarSize}" height="${avatarSize}"
             xlink:href="data:image/png;base64,${avatarBase64}" clip-path="url(#avClip)"/>`
        : `<circle cx="${padding + avatarSize / 2}" cy="${padding + avatarSize / 2}" r="${avatarSize / 2}" fill="#1d9bf0"/>`;

    const mediaElement = mediaBase64
        ? `<rect x="${padding}" y="${textY + textBlockHeight}" width="${mediaWidth}" height="320" rx="16" fill="#eee"/>
           <clipPath id="mediaClip"><rect x="${padding}" y="${textY + textBlockHeight}" width="${mediaWidth}" height="320" rx="16"/></clipPath>
           <image x="${padding}" y="${textY + textBlockHeight}" width="${mediaWidth}" height="320"
             xlink:href="data:image/png;base64,${mediaBase64}" clip-path="url(#mediaClip)"/>`
        : '';

    const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <rect width="100%" height="100%" fill="#ffffff"/>
        ${avatarElement}
        <text x="${padding + avatarSize + 16}" y="${padding + 22}"
            font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="24"
            fill="#0f1419">${escapeXml(name)}</text>
        <text x="${padding + avatarSize + 16}" y="${padding + 46}"
            font-family="Arial, Helvetica, sans-serif" font-size="20"
            fill="#536471">@${escapeXml(username)}</text>
        ${textElements}
        ${mediaElement}
        <line x1="${padding}" y1="${height - 40}" x2="${width - padding}" y2="${height - 40}" stroke="#eff3f4" stroke-width="2"/>
        <text x="${padding}" y="${height - 12}" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#536471">𝕏 Twitter Mock — dibuat via Marin Bot</text>
    </svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Generate Fake Instagram Story — mirip tampilan story IG.
 *
 * @param {object} opts
 * @param {string} opts.username
 * @param {string} opts.text Caption/teks story
 * @param {Buffer} [opts.avatarBuffer]
 * @param {Buffer} [opts.mediaBuffer] Background story (foto/video frame), kalau kosong pakai gradient
 * @returns {Promise<Buffer>} PNG buffer 1080x1920 (rasio story)
 */
export async function generateFakeIGStory({ username, text, avatarBuffer = null, mediaBuffer = null }) {
    const width = 540;
    const height = 960;
    const padding = 28;
    const avatarSize = 56;
    const fontSize = 34;
    const lines = wrapText(text, 26).slice(0, 8);
    const lineHeight = fontSize * 1.3;

    let bgBase64 = '';
    if (mediaBuffer) {
        const resized = await sharp(mediaBuffer).resize(width, height, { fit: 'cover' }).png().toBuffer();
        bgBase64 = resized.toString('base64');
    }

    let avatarBase64 = '';
    if (avatarBuffer) {
        const resized = await sharp(avatarBuffer).resize(avatarSize, avatarSize).png().toBuffer();
        avatarBase64 = resized.toString('base64');
    }

    const bgElement = bgBase64
        ? `<image x="0" y="0" width="${width}" height="${height}" xlink:href="data:image/png;base64,${bgBase64}"/>`
        : `<defs>
             <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" stop-color="#feda75"/>
               <stop offset="50%" stop-color="#d62976"/>
               <stop offset="100%" stop-color="#4f5bd5"/>
             </linearGradient>
           </defs>
           <rect width="100%" height="100%" fill="url(#grad)"/>`;

    const avatarElement = avatarBase64
        ? `<defs><clipPath id="igAv"><circle cx="${padding + avatarSize / 2}" cy="${padding + avatarSize / 2}" r="${avatarSize / 2}"/></clipPath></defs>
           <image x="${padding}" y="${padding}" width="${avatarSize}" height="${avatarSize}"
             xlink:href="data:image/png;base64,${avatarBase64}" clip-path="url(#igAv)"/>`
        : `<circle cx="${padding + avatarSize / 2}" cy="${padding + avatarSize / 2}" r="${avatarSize / 2}" fill="#ffffff"/>`;

    const textStartY = height / 2 - (lines.length * lineHeight) / 2;
    const textBg = lines.length
        ? `<rect x="${padding - 10}" y="${textStartY - fontSize}" width="${width - (padding - 10) * 2}"
             height="${lines.length * lineHeight + 30}" rx="16" fill="rgba(0,0,0,0.35)"/>`
        : '';
    const textElements = lines.map((line, i) =>
        `<text x="50%" y="${textStartY + i * lineHeight}" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${fontSize}"
            fill="#ffffff">${escapeXml(line)}</text>`
    ).join('\n');

    const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        ${bgElement}
        <rect x="${padding - 4}" y="${padding - 4}" width="${width - (padding - 4) * 2}" height="8" rx="4" fill="rgba(255,255,255,0.85)"/>
        ${avatarElement}
        <text x="${padding + avatarSize + 12}" y="${padding + 36}"
            font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="24"
            fill="#ffffff">${escapeXml(username)}</text>
        ${textBg}
        ${textElements}
    </svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Generate Welcome/Leave Banner — banner untuk member baru gabung/keluar grup.
 *
 * @param {object} opts
 * @param {string} opts.title Misal "WELCOME" atau "GOODBYE"
 * @param {string} opts.name Nama member
 * @param {string} opts.subtitle Misal nama grup atau jumlah member
 * @param {Buffer} [opts.avatarBuffer]
 * @returns {Promise<Buffer>} PNG buffer 1280x720
 */
export async function generateWelcomeBanner({ title, name, subtitle, avatarBuffer = null }) {
    const width = 1280;
    const height = 720;
    const avatarSize = 220;

    let avatarBase64 = '';
    if (avatarBuffer) {
        const resized = await sharp(avatarBuffer).resize(avatarSize, avatarSize).png().toBuffer();
        avatarBase64 = resized.toString('base64');
    }

    const avatarElement = avatarBase64
        ? `<defs><clipPath id="wbAv"><circle cx="${width / 2}" cy="220" r="${avatarSize / 2}"/></clipPath></defs>
           <circle cx="${width / 2}" cy="220" r="${avatarSize / 2 + 6}" fill="#ffffff"/>
           <image x="${width / 2 - avatarSize / 2}" y="110" width="${avatarSize}" height="${avatarSize}"
             xlink:href="data:image/png;base64,${avatarBase64}" clip-path="url(#wbAv)"/>`
        : `<circle cx="${width / 2}" cy="220" r="${avatarSize / 2}" fill="#ffffff" opacity="0.3"/>`;

    const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>
            <linearGradient id="wbg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ff9a9e"/>
                <stop offset="50%" stop-color="#fad0c4"/>
                <stop offset="100%" stop-color="#a18cd1"/>
            </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#wbg)"/>
        ${avatarElement}
        <text x="50%" y="420" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="64"
            fill="#ffffff" letter-spacing="4">${escapeXml(title.toUpperCase())}</text>
        <text x="50%" y="490" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="48"
            fill="#ffffff">${escapeXml(name)}</text>
        <text x="50%" y="540" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-size="28"
            fill="rgba(255,255,255,0.9)">${escapeXml(subtitle)}</text>
    </svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

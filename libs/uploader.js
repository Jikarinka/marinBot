import fetch from 'node-fetch';
import axios from 'axios';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';

/**
 * Upload gambar ke Telegraph (telegra.ph)
 * Mendukung: image/jpeg, image/jpg, image/png
 *
 * @param {Buffer} buffer Image buffer
 * @returns {Promise<{ url: string }>}
 */
export async function telegra(buffer) {
    if (!Buffer.isBuffer(buffer)) throw new Error('Format buffer tidak valid kak.. (｡T ω T｡)');

    const type = await fileTypeFromBuffer(buffer);
    if (!type) throw new Error('Tipe file tidak dikenali kak.. (╥﹏╥)');

    const form = new FormData();
    form.append('file', buffer, {
        filename: `tmp.${type.ext}`,
        contentType: type.mime
    });

    const res = await fetch('https://telegra.ph/upload', {
        method: 'POST',
        headers: form.getHeaders(),
        body: form
    });

    const json = await res.json();
    if (json.error) throw new Error('Telegraph Error: ' + json.error);
    if (!Array.isArray(json) || !json[0]?.src) throw new Error('Telegraph Error: respons tidak valid');

    return { url: 'https://telegra.ph' + json[0].src };
}

/**
 * Upload file apapun ke tmpfiles.org (fallback untuk file non-gambar
 * atau saat Telegraph gagal — tmpfiles.org expire dalam beberapa jam,
 * cocok untuk link sementara seperti hasil .upload)
 *
 * @param {Buffer} buffer File buffer
 * @returns {Promise<{ url: string }>}
 */
export async function tmpFiles(buffer) {
    if (!Buffer.isBuffer(buffer)) throw new Error('Format buffer tidak valid kak.. (｡T ω T｡)');

    const type = await fileTypeFromBuffer(buffer);
    const form = new FormData();
    form.append('file', buffer, { filename: `media.${type?.ext || 'bin'}` });

    const { data } = await axios.request({
        baseURL: 'https://tmpfiles.org',
        url: '/api/v1/upload',
        method: 'POST',
        data: form,
        headers: form.getHeaders()
    }).catch(e => e?.response || { data: null });

    if (!data?.data?.url) throw new Error('tmpfiles.org Error: gagal upload');

    const url = data.data.url.replace('https://tmpfiles.org', 'https://tmpfiles.org/dl');
    return { url };
}

/**
 * Upload media — otomatis pilih Telegraph untuk gambar,
 * fallback ke tmpfiles.org untuk tipe file lain atau jika Telegraph gagal.
 * Menggantikan marinCDN lama (API eksternal).
 *
 * @param {Buffer|Array<Buffer>} inp Buffer tunggal atau array buffer
 * @returns {Promise<{ url: string }|Array<{ url: string }>>}
 */
export async function marinCDN(inp) {
    const files = Array.isArray(inp) ? inp : [inp];
    const results = [];

    for (const file of files) {
        const buffer = Buffer.isBuffer(file) ? file : file.buffer;
        if (!Buffer.isBuffer(buffer)) throw new Error('Format buffer tidak valid kak.. (｡T ω T｡)');

        const type = await fileTypeFromBuffer(buffer);
        const isImage = type && ['image/jpeg', 'image/png', 'image/jpg'].includes(type.mime);
        const originalName = (file.originalname || 'marin-file').split('.').shift();
        const filename = `${originalName}.${type?.ext || 'bin'}`;

        let uploaded;
        try {
            uploaded = isImage ? await telegra(buffer) : await tmpFiles(buffer);
        } catch (err) {
            // Fallback: kalau Telegraph gagal untuk gambar, coba tmpfiles.org
            if (isImage) {
                try {
                    uploaded = await tmpFiles(buffer);
                } catch (err2) {
                    throw new Error('Upload Error: ' + err2.message);
                }
            } else {
                throw new Error('Upload Error: ' + err.message);
            }
        }

        results.push({ ...uploaded, filename, size: buffer.length });
    }

    return Array.isArray(inp) ? results : results[0];
}

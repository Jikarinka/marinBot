import fs from 'fs';
import path from 'path';

// Array utama untuk menyimpan plugin yang di-load
export const plugins = [];

let isReloading = false;

// Validasi struktur plugin sebelum diterima — mencegah satu plugin rusak
// (mis. ditulis AI dengan format salah) bikin seluruh bot crash saat dipanggil.
//
// Plugin yang VALID punya salah satu dari:
// - execute()           → command plugin biasa, dipanggil dari handler.js
// - passiveListener()    → chat tanpa command, dipanggil dari handler.js
// - onXxx() apapun       → event handler WhatsApp (mis. onParticipantsUpdate),
//                          dipanggil langsung dari index.js berdasar nama event
function hasEventHandler(p) {
    return Object.keys(p).some(key => /^on[A-Z]/.test(key) && typeof p[key] === 'function');
}

function isValidPlugin(p, fileName) {
    if (!p || typeof p !== 'object') {
        console.error(`[Hot-Reload] ⚠️ Skip "${fileName}": export default bukan object`);
        return false;
    }
    const hasExecute = typeof p.execute === 'function';
    const hasPassive  = typeof p.passiveListener === 'function';
    const hasEvent    = hasEventHandler(p);

    if (!hasExecute && !hasPassive && !hasEvent) {
        console.error(`[Hot-Reload] ⚠️ Skip "${fileName}": tidak ada execute(), passiveListener(), atau event handler (onXxx)`);
        return false;
    }
    if (p.command !== undefined) {
        const isArrayOfStrings = Array.isArray(p.command) && p.command.every(c => typeof c === 'string');
        const isString = typeof p.command === 'string';
        if (!isArrayOfStrings && !isString) {
            console.error(`[Hot-Reload] ⚠️ Skip "${fileName}": field "command" harus array of string atau string, dapat: ${typeof p.command}`);
            return false;
        }
        // Normalisasi: command string tunggal → jadi array, supaya konsisten di seluruh sistem
        if (isString) p.command = [p.command];
    }
    return true;
}

// Fungsi untuk me-load ulang seluruh plugin secara atomic
export const loadPlugins = async (dir) => {
    const tempPlugins = [];

    const readDirRecursively = async (currentDir) => {
        if (!fs.existsSync(currentDir)) return;
        const files = fs.readdirSync(currentDir, { withFileTypes: true });
        
        for (const file of files) {
            const fullPath = path.join(currentDir, file.name);
            if (file.isDirectory()) {
                await readDirRecursively(fullPath);
            } else if (file.name.endsWith('.js')) {
                try {
                    // Tambahkan query parameter Date.now() untuk by-pass sistem cache ESM
                    const module = await import(`file://${fullPath}?update=${Date.now()}`);
                    if (module.default && isValidPlugin(module.default, file.name)) {
                        tempPlugins.push(module.default);
                    }
                } catch (err) {
                    console.error(`[Hot-Reload] Gagal memuat plugin: ${file.name}`, err.message);
                }
            }
        }
    };

    await readDirRecursively(dir);
    
    // Swap array secara atomic agar tidak ada kondisi plugins kosong saat sedang loading
    plugins.length = 0;
    plugins.push(...tempPlugins);

    console.log(`[Hot-Reload] ✅ Berhasil memuat ulang ${plugins.length} plugins.`);
};

// Fungsi untuk me-watch file menggunakan fs.watch
export const watchPlugins = (dir) => {
    console.log(`[Hot-Reload] 👀 Memantau perubahan di folder plugins...`);

    // Recursive watch tidak selalu didukung sempurna di OS lama, tapi bekerja baik di Windows/macOS
    fs.watch(dir, { recursive: true }, async (eventType, filename) => {
        if (!filename || !filename.endsWith('.js')) return;

        // Cegah reload berkali-kali dalam waktu bersamaan (Debounce)
        if (isReloading) return;
        isReloading = true;

        console.log(`[Hot-Reload] 🔄 Perubahan terdeteksi pada file: ${filename}`);
        await loadPlugins(dir);

        // Reset debounce delay
        setTimeout(() => {
            isReloading = false;
        }, 1000);
    });
};

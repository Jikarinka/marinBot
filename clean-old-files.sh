#!/bin/bash
# Jalankan script ini di server setelah extract zip baru

echo "🧹 Membersihkan file lama..."

# File yang dibuat AI dengan format salah — hapus paksa
FILES_TO_DELETE=(
    "plugins/owner/backup.js"
    "plugins/downloader/downloader-all-in-one.js"
)

for f in "${FILES_TO_DELETE[@]}"; do
    if [ -f "$f" ]; then
        echo "🗑️  Hapus: $f"
        rm "$f"
    fi
done

echo ""
echo "🔍 Mencari file CommonJS yang masih tersisa..."
found=0

for f in $(find plugins/ libs/ middlewares/ -name "*.js" 2>/dev/null); do
    # Cek apakah baris kode (bukan string/komentar) pakai require() atau module.exports
    # Gunakan grep yang hanya match di awal baris atau setelah whitespace, bukan di dalam string
    if grep -Pn "^[^/'\"\`]*\brequire\s*\(|^[^/'\"\`]*\bmodule\.exports\s*=" "$f" 2>/dev/null | grep -q .; then
        echo "⚠️  File CJS ditemukan: $f"
        grep -Pn "^[^/'\"\`]*\brequire\s*\(|^[^/'\"\`]*\bmodule\.exports\s*=" "$f" | head -2
        found=$((found+1))
    fi
done

# mcp/ folder — skip agent.js karena punya contoh require() di string system prompt
for f in $(find mcp/ -name "*.js" 2>/dev/null | grep -v "agent.js"); do
    if grep -Pn "^[^/'\"\`]*\brequire\s*\(|^[^/'\"\`]*\bmodule\.exports\s*=" "$f" 2>/dev/null | grep -q .; then
        echo "⚠️  File CJS ditemukan: $f"
        found=$((found+1))
    fi
done

if [ $found -eq 0 ]; then
    echo "✅ Tidak ada file CJS yang tersisa"
else
    echo ""
    echo "❗ Ada $found file bermasalah — hapus manual lalu restart"
fi

echo ""
echo "✅ Selesai! Restart bot sekarang."

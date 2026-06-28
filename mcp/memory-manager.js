/**
 * Marin Memory Manager
 * Sistem memori jangka panjang — persisten lintas sesi & restart
 *
 * Tools yang tersedia untuk Agent:
 *   remember(key, value, category)  — simpan pelajaran baru
 *   recall(query)                   — cari pengetahuan relevan
 *   list_learned(category)          — lihat semua yang dipelajari
 *   forget(key)                     — hapus memori tertentu
 *   log_plugin_created(name, path)  — catat plugin baru yang dibuat
 *   log_failure(action, reason)     — catat percobaan gagal agar tidak diulang
 */

import fs from 'fs'
import path from 'path'
import { registerTool } from './registry.js'

const BRAIN_PATH = path.join(process.cwd(), 'mcp', 'marin-brain.json')

function loadBrain() {
    try {
        return JSON.parse(fs.readFileSync(BRAIN_PATH, 'utf-8'))
    } catch {
        return {
            _meta: { version: '1.0', created: new Date().toISOString() },
            learned: [],
            plugins_created: [],
            failed_attempts: [],
            user_patterns: {},
            capabilities: []
        }
    }
}

function saveBrain(brain) {
    brain._meta.last_updated = new Date().toISOString()
    brain._meta.total_memories = brain.learned.length
    fs.writeFileSync(BRAIN_PATH, JSON.stringify(brain, null, 2), 'utf-8')
}

// ── REMEMBER — simpan pelajaran baru ─────────────────────────────
registerTool({
    name: 'remember',
    description: 'Simpan pelajaran, fakta, atau pengetahuan baru ke memori permanen Marin. Gunakan ini setelah berhasil melakukan sesuatu yang baru, menemukan cara kerja sesuatu, atau mendapat info penting dari user. Memori ini persisten dan akan diingat di semua sesi berikutnya.',
    parameters: {
        key:      { type: 'string', description: 'Nama/judul singkat memori (contoh: "cara_restart_bot", "owner_suka_anime")', required: true },
        value:    { type: 'string', description: 'Isi pengetahuan yang ingin disimpan — boleh panjang dan detail', required: true },
        category: { type: 'string', description: 'Kategori: "skill" (kemampuan baru), "user_pref" (preferensi user), "system" (info sistem), "plugin" (info plugin), "general" (lainnya)', required: false }
    },
    execute: async ({ key, value, category = 'general' }) => {
        const brain = loadBrain()

        const existing = brain.learned.findIndex(m => m.key === key)
        const entry = {
            key,
            value,
            category,
            saved_at: new Date().toISOString(),
            times_recalled: 0
        }

        if (existing >= 0) {
            entry.times_recalled = brain.learned[existing].times_recalled || 0
            entry.updated_at = new Date().toISOString()
            brain.learned[existing] = entry
            saveBrain(brain)
            return `✅ Memori diperbarui: "${key}"\nKategori: ${category}`
        }

        brain.learned.push(entry)
        saveBrain(brain)
        return `✅ Memori baru tersimpan: "${key}"\nKategori: ${category}\nTotal memori: ${brain.learned.length}`
    }
})

// ── RECALL — cari pengetahuan relevan ────────────────────────────
registerTool({
    name: 'recall',
    description: 'Cari memori/pengetahuan yang relevan dengan topik tertentu. Gunakan sebelum menjawab pertanyaan untuk cek apakah Marin sudah pernah belajar tentang ini sebelumnya.',
    parameters: {
        query:    { type: 'string', description: 'Kata kunci atau topik yang dicari', required: true },
        category: { type: 'string', description: 'Filter kategori (opsional): skill, user_pref, system, plugin, general', required: false }
    },
    execute: async ({ query, category }) => {
        const brain = loadBrain()
        const q = query.toLowerCase()

        let results = brain.learned.filter(m => {
            const matchQuery = m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q)
            const matchCategory = !category || m.category === category
            return matchQuery && matchCategory
        })

        if (!results.length) {
            return `🔍 Tidak ditemukan memori tentang "${query}"\nMarin belum pernah belajar tentang ini.`
        }

        // update times_recalled
        results.forEach(r => {
            const idx = brain.learned.findIndex(m => m.key === r.key)
            if (idx >= 0) brain.learned[idx].times_recalled = (brain.learned[idx].times_recalled || 0) + 1
        })
        saveBrain(brain)

        const out = results.slice(0, 5).map(m =>
            `📌 [${m.category}] ${m.key}\n${m.value}`
        ).join('\n\n---\n\n')

        return `🧠 Ditemukan ${results.length} memori tentang "${query}":\n\n${out}`
    }
})

// ── LIST LEARNED — lihat semua memori ────────────────────────────
registerTool({
    name: 'list_learned',
    description: 'Tampilkan semua yang sudah dipelajari Marin. Bisa filter per kategori.',
    parameters: {
        category: { type: 'string', description: 'Filter kategori (opsional)', required: false }
    },
    execute: async ({ category }) => {
        const brain = loadBrain()

        let items = category
            ? brain.learned.filter(m => m.category === category)
            : brain.learned

        if (!items.length) {
            return `🧠 Marin belum punya memori${category ? ` kategori "${category}"` : ''}.`
        }

        const grouped = {}
        items.forEach(m => {
            if (!grouped[m.category]) grouped[m.category] = []
            grouped[m.category].push(m.key)
        })

        let out = `🧠 *Marin Brain* (${items.length} memori)\n\n`
        for (const [cat, keys] of Object.entries(grouped)) {
            out += `*${cat}* (${keys.length})\n`
            out += keys.map(k => `  • ${k}`).join('\n') + '\n\n'
        }

        if (brain.plugins_created.length) {
            out += `\n🔧 *Plugin dibuat* (${brain.plugins_created.length})\n`
            out += brain.plugins_created.map(p => `  • ${p.name} — ${p.path}`).join('\n')
        }

        return out.trim()
    }
})

// ── FORGET — hapus memori ─────────────────────────────────────────
registerTool({
    name: 'forget',
    description: 'Hapus memori tertentu dari brain Marin.',
    parameters: {
        key: { type: 'string', description: 'Key memori yang ingin dihapus', required: true }
    },
    execute: async ({ key }) => {
        const brain = loadBrain()
        const before = brain.learned.length
        brain.learned = brain.learned.filter(m => m.key !== key)
        if (brain.learned.length === before) return `❌ Memori "${key}" tidak ditemukan`
        saveBrain(brain)
        return `🗑️ Memori "${key}" dihapus`
    }
})

// ── LOG PLUGIN CREATED — catat plugin baru ────────────────────────
registerTool({
    name: 'log_plugin_created',
    description: 'Catat ke brain bahwa Marin telah membuat plugin baru. Panggil ini setelah berhasil buat dan test plugin baru.',
    parameters: {
        name:        { type: 'string', description: 'Nama plugin', required: true },
        file_path:   { type: 'string', description: 'Path file plugin yang dibuat', required: true },
        description: { type: 'string', description: 'Apa yang dilakukan plugin ini', required: true },
        trigger:     { type: 'string', description: 'Apa yang memicu pembuatan plugin ini (permintaan/kebutuhan user)', required: false }
    },
    execute: async ({ name, file_path, description, trigger }) => {
        const brain = loadBrain()
        brain.plugins_created.push({
            name,
            path: file_path,
            description,
            trigger: trigger || 'tidak diketahui',
            created_at: new Date().toISOString()
        })
        // juga simpan ke learned agar bisa di-recall
        brain.learned.push({
            key: `plugin_${name}`,
            value: `Plugin "${name}" dibuat di ${file_path}. Fungsi: ${description}. Trigger: ${trigger || '-'}`,
            category: 'plugin',
            saved_at: new Date().toISOString(),
            times_recalled: 0
        })
        saveBrain(brain)
        return `✅ Plugin "${name}" tercatat di brain Marin\nPath: ${file_path}\nFungsi: ${description}`
    }
})

// ── LOG FAILURE — catat percobaan gagal ──────────────────────────
registerTool({
    name: 'log_failure',
    description: 'Catat percobaan yang gagal ke brain agar tidak diulangi dengan cara yang sama. Marin belajar dari kesalahan.',
    parameters: {
        action: { type: 'string', description: 'Apa yang dicoba dilakukan', required: true },
        reason: { type: 'string', description: 'Kenapa gagal / error apa yang terjadi', required: true },
        alternative: { type: 'string', description: 'Alternatif solusi yang mungkin (opsional)', required: false }
    },
    execute: async ({ action, reason, alternative }) => {
        const brain = loadBrain()
        brain.failed_attempts.push({
            action,
            reason,
            alternative: alternative || null,
            logged_at: new Date().toISOString()
        })
        // simpan juga ke learned dengan prefix "jangan_"
        const key = `jangan_${action.toLowerCase().replace(/\s+/g, '_').slice(0, 40)}`
        brain.learned.push({
            key,
            value: `GAGAL: ${action} → ${reason}${alternative ? `. Coba: ${alternative}` : ''}`,
            category: 'system',
            saved_at: new Date().toISOString(),
            times_recalled: 0
        })
        saveBrain(brain)
        return `📝 Kegagalan tercatat. Marin tidak akan mengulangi cara yang sama.\nAksi: ${action}\nAlasan: ${reason}`
    }
})

export { loadBrain }

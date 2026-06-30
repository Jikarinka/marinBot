/**
 * Compact Session — Marin Bot
 * Padatkan riwayat percakapan AI agar context window tidak bengkak.
 *
 * .compact          → ringkas sesi sekarang
 * .compact status   → lihat info sesi (turns, ukuran, terakhir update)
 * .compact reset    → hapus sesi & mulai dari nol
 */

import { resetSession, getSessionRaw, getAllSessionsRaw, compressSession, saveSessionToDisk } from '../../mcp/agent.js'
import { User } from '../../databases/connector.js'

export default {
    command: ['compact', 'compress', 'ringkas'],
    category: 'ai',
    description: 'Padatkan riwayat percakapan AI agar context window tidak penuh',
    isRegistered: true,

    async execute(sock, m, msgData) {
        const { args, senderJid } = msgData
        const sub = args[0]?.toLowerCase()

        // ── Status ───────────────────────────────────────────────
        if (sub === 'status' || sub === 'info') {
            const history = getSessionRaw(senderJid)
            const turns   = Math.floor(history.length / 2)

            if (turns === 0) {
                return msgData.reply(
                    `📊 *Status Sesi AI*\n\n` +
                    `Belum ada riwayat percakapan kak~\n` +
                    `Mulai ngobrol dengan Marin dulu ya!`
                )
            }

            // Info dari DB
            const user       = User.findOne({ where: { jid: senderJid } })
            const updatedAt  = user?.aiSessionUpdatedAt
                ? new Date(user.aiSessionUpdatedAt).toLocaleString('id-ID')
                : 'Belum tersimpan'
            const sizeKb     = (JSON.stringify(history).length / 1024).toFixed(1)
            const hasSummary = history.some(h => h.parts?.[0]?.text?.startsWith('[SESSION SUMMARY]'))

            return msgData.reply(
                `📊 *Status Sesi AI*\n\n` +
                `👤 Nomor: ${senderJid.split('@')[0]}\n` +
                `💬 Turns: *${turns}* (${history.length} items)\n` +
                `💾 Ukuran: *${sizeKb} KB*\n` +
                `🗂️ Di DB: ${user ? '✅ Tersimpan' : '⚠️ Belum register'}\n` +
                `🕐 Update: ${updatedAt}\n` +
                `📝 Summary: ${hasSummary ? '✅ Ada ringkasan' : '❌ Belum dipadatkan'}\n\n` +
                `_${turns >= 16 ? '⚠️ Sesi mulai panjang, .compact untuk padatkan!' : '✅ Sesi masih ringan'}_`
            )
        }

        // ── Reset ────────────────────────────────────────────────
        if (sub === 'reset' || sub === 'clear' || sub === 'mulai') {
            const turnsBefore = Math.floor(getSessionRaw(senderJid).length / 2)
            resetSession(senderJid)
            await msgData.react('🔄')
            return msgData.reply(
                `🔄 *Sesi AI Direset*\n\n` +
                `${turnsBefore} turns dihapus dari memori & database.\n` +
                `Marin sekarang fresh dan siap ngobrol dari awal~`
            )
        }

        // ── Lihat semua sesi aktif (owner only) ──────────────────
        if (sub === 'all' || sub === 'list') {
            if (!msgData.isOwner && !msgData.isCoordinator) {
                return msgData.reply('❌ Hanya Owner/Koordinator yang bisa lihat semua sesi')
            }
            const all = getAllSessionsRaw()
            const entries = Object.entries(all)
            if (entries.length === 0) return msgData.reply('📊 Tidak ada sesi aktif di memori')

            const list = entries.map(([jid, h]) => {
                const turns = Math.floor(h.length / 2)
                const kb    = (JSON.stringify(h).length / 1024).toFixed(1)
                return `• ${jid.split('@')[0]}: ${turns} turns (${kb} KB)`
            }).join('\n')

            return msgData.reply(
                `📊 *Semua Sesi Aktif di Memori*\n\n${list}\n\n` +
                `Total: ${entries.length} sesi`
            )
        }

        // ── Compact ──────────────────────────────────────────────
        const historyBefore = getSessionRaw(senderJid)
        const turnsBefore   = Math.floor(historyBefore.length / 2)

        if (turnsBefore < 4) {
            return msgData.reply(
                `📊 Sesi kamu baru *${turnsBefore} turns* — belum perlu dipadatkan kak~\n\n` +
                `Marin baru kompres kalau sudah lebih dari 16 turns.`
            )
        }

        await msgData.react('⏳')

        try {
            const apiKey = process.env.GEMINI_API_KEY
            if (!apiKey || apiKey === 'ISI_GEMINI_API_KEY') {
                return msgData.reply('❌ GEMINI_API_KEY belum diisi di .env')
            }

            // Paksa kompres meski belum mencapai threshold otomatis
            await compressSession(senderJid, apiKey, true)

            // Simpan hasil kompres ke DB sekarang juga
            saveSessionToDisk(senderJid)

            const turnsAfter = Math.floor(getSessionRaw(senderJid).length / 2)
            const saved      = turnsBefore - turnsAfter

            await msgData.react('✅')
            return msgData.reply(
                `✅ *Sesi Dipadatkan!*\n\n` +
                `Sebelum : *${turnsBefore} turns*\n` +
                `Sesudah : *${turnsAfter} turns*\n` +
                `Dihemat : *${saved} turns* → disimpan sebagai ringkasan\n\n` +
                `📌 *Yang tetap diingat Marin:*\n` +
                `• File yang diedit\n` +
                `• Plugin yang dibuat\n` +
                `• Bug yang difix\n` +
                `• Keputusan teknis\n` +
                `• Preferensi kamu\n\n` +
                `_Sudah disimpan ke database users.json~_`
            )
        } catch (err) {
            await msgData.react('❌')
            return msgData.reply(`❌ Gagal memadatkan sesi: ${err.message}`)
        }
    }
}

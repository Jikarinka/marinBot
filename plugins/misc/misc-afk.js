/**
 * Sistem AFK (Away From Keyboard)
 * - .afk [alasan] → set status AFK
 * - passiveListener: kalau AFK user kirim pesan → otomatis cancel AFK
 *                    kalau ada yang mention/reply user AFK → kasih tahu
 */

const afkSessions = new Map() // jid → { reason, since }

function formatDuration(ms) {
    const s = Math.floor(ms / 1000)
    if (s < 60)   return `${s} detik`
    if (s < 3600) return `${Math.floor(s / 60)} menit`
    return `${Math.floor(s / 3600)} jam ${Math.floor((s % 3600) / 60)} menit`
}

export default {
    command: ['afk'],
    category: 'misc',
    description: 'Set status AFK. Contoh: .afk lagi makan',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const { senderJid, remoteJid } = msgData
        const reason = msgData.args.join(' ').trim() || ''

        afkSessions.set(senderJid, { reason, since: Date.now() })

        await sock.sendMessage(remoteJid, {
            text: `😴 @${senderJid.split('@')[0]} sekarang AFK${reason ? ': ' + reason : ''}`,
            mentions: [senderJid]
        })
    },

    async passiveListener(sock, m, msgData) {
        const { senderJid, remoteJid, mentions, quotedSender } = msgData

        // ── User AFK kirim pesan → cancel AFK ──────────────────────
        if (afkSessions.has(senderJid)) {
            const { reason, since } = afkSessions.get(senderJid)
            afkSessions.delete(senderJid)
            const durasi = formatDuration(Date.now() - since)
            await sock.sendMessage(remoteJid, {
                text: `👋 @${senderJid.split('@')[0]} sudah tidak AFK setelah *${durasi}*${reason ? `\n_Alasan: ${reason}_` : ''}`,
                mentions: [senderJid]
            })
            return false // tetap lanjut, biarkan pesan diproses normal
        }

        // ── Mention/reply ke user yang sedang AFK ──────────────────
        const mentioned = [...new Set([
            ...(mentions || []),
            ...(quotedSender ? [quotedSender] : [])
        ])].filter(jid => jid !== senderJid && afkSessions.has(jid))

        for (const jid of mentioned) {
            const { reason, since } = afkSessions.get(jid)
            const durasi = formatDuration(Date.now() - since)
            await sock.sendMessage(remoteJid, {
                text: `😴 @${jid.split('@')[0]} sedang AFK selama *${durasi}*${reason ? `\n_Alasan: ${reason}_` : ''}`,
                mentions: [jid]
            })
        }

        return false // jangan blokir pesan
    }
}

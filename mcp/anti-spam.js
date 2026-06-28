/**
 * Anti-Spam — Marin Bot
 * Rate limiting per user untuk command .ai
 * Mencegah flood/spam request ke Gemini API
 */

const userRequests = new Map() // jid → [timestamp, ...]
const userCooldown = new Map()  // jid → cooldown until timestamp

const WINDOW_MS = 60 * 1000      // 1 menit window
const MAX_REQUESTS = 8           // max 8 request per menit
const COOLDOWN_MS = 30 * 1000    // cooldown 30 detik jika spam
const SPAM_THRESHOLD = 4         // jika kirim 4x dalam 5 detik = spam

/**
 * Cek apakah user sedang di-cooldown
 */
export function isOnCooldown(jid) {
    const until = userCooldown.get(jid)
    if (!until) return false
    if (Date.now() > until) {
        userCooldown.delete(jid)
        return false
    }
    return true
}

export function getCooldownRemaining(jid) {
    const until = userCooldown.get(jid)
    if (!until) return 0
    return Math.max(0, Math.ceil((until - Date.now()) / 1000))
}

/**
 * Cek & catat request — return true jika diizinkan, false jika spam
 */
export function checkRateLimit(jid) {
    const now = Date.now()

    if (isOnCooldown(jid)) return { allowed: false, reason: 'cooldown', remaining: getCooldownRemaining(jid) }

    let timestamps = userRequests.get(jid) || []
    // Buang timestamp di luar window
    timestamps = timestamps.filter(t => now - t < WINDOW_MS)

    // Deteksi burst spam (banyak request dalam waktu sangat singkat)
    const recentBurst = timestamps.filter(t => now - t < 5000)
    if (recentBurst.length >= SPAM_THRESHOLD - 1) {
        userCooldown.set(jid, now + COOLDOWN_MS)
        userRequests.delete(jid)
        return { allowed: false, reason: 'burst', remaining: COOLDOWN_MS / 1000 }
    }

    // Cek limit per menit
    if (timestamps.length >= MAX_REQUESTS) {
        userCooldown.set(jid, now + COOLDOWN_MS)
        return { allowed: false, reason: 'rate_limit', remaining: COOLDOWN_MS / 1000 }
    }

    timestamps.push(now)
    userRequests.set(jid, timestamps)
    return { allowed: true }
}

/**
 * Reset rate limit untuk user (dipakai owner/admin)
 */
export function resetRateLimit(jid) {
    userRequests.delete(jid)
    userCooldown.delete(jid)
}

// Cleanup otomatis setiap 5 menit agar memory tidak bocor
setInterval(() => {
    const now = Date.now()
    for (const [jid, timestamps] of userRequests.entries()) {
        const filtered = timestamps.filter(t => now - t < WINDOW_MS)
        if (filtered.length === 0) userRequests.delete(jid)
        else userRequests.set(jid, filtered)
    }
    for (const [jid, until] of userCooldown.entries()) {
        if (now > until) userCooldown.delete(jid)
    }
}, 5 * 60 * 1000)

/**
 * Session Manager — Marin Bot Multi-Session
 * Tracking semua sock instance yang aktif (untuk multi-akun WA)
 */

const activeSessions = new Map() // sessionId → sock instance

export function registerSession(sessionId, sock) {
    activeSessions.set(sessionId, sock)
    console.log(`📡 Session "${sessionId}" terdaftar (total aktif: ${activeSessions.size})`)
}

export function unregisterSession(sessionId) {
    activeSessions.delete(sessionId)
}

export function getSession(sessionId) {
    return activeSessions.get(sessionId)
}

export function getAllSessions() {
    return [...activeSessions.entries()].map(([id, sock]) => ({
        sessionId: id,
        number: sock?.user?.id?.split(':')[0] || 'unknown',
        connected: !!sock?.user
    }))
}

export function countActiveSessions() {
    return activeSessions.size
}

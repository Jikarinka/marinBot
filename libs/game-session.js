/**
 * Marin Game Session Manager
 * State in-memory per-chat untuk game tebak-tebakan aktif.
 * Setiap chat hanya boleh punya 1 game aktif dalam satu waktu.
 */

const sessions = new Map() // chatId → session

export const EXP_REWARD = 4999
const DEFAULT_TIMEOUT = 120000 // 2 menit

/**
 * Mulai session game baru.
 * Return false kalau sudah ada game aktif di chat tersebut.
 */
export function startGame(chatId, { type, question, answer, hint = null, extraData = null }) {
    if (sessions.has(chatId)) return false

    const timeoutHandle = setTimeout(() => {
        const s = sessions.get(chatId)
        if (s) {
            sessions.delete(chatId)
            if (s.onTimeout) s.onTimeout(s.answer)
        }
    }, DEFAULT_TIMEOUT)

    sessions.set(chatId, {
        type, question, answer, hint, extraData,
        startedAt: Date.now(),
        timeoutHandle,
        onTimeout: null,
    })
    return true
}

export function getSession(chatId) {
    return sessions.get(chatId) || null
}

export function setOnTimeout(chatId, fn) {
    const s = sessions.get(chatId)
    if (s) s.onTimeout = fn
}

export function endGame(chatId) {
    const s = sessions.get(chatId)
    if (!s) return null
    clearTimeout(s.timeoutHandle)
    sessions.delete(chatId)
    return s
}

export function hasActiveGame(chatId) {
    return sessions.has(chatId)
}

/**
 * Cek apakah teks jawaban user cocok dengan jawaban yang benar.
 * mode 'exact': string match case-insensitive
 * mode 'multi': array jawaban, cek apakah sudah semua terjawab
 * mode 'number': jawaban angka
 * mode 'anagram': susun huruf, cocokkan setelah sorted
 */
export function checkAnswer(session, userText) {
    const text = userText.trim().toLowerCase()
    const { answer, type } = session

    if (type === 'family100') {
        const remaining = answer.filter(a => !session.answered?.includes(a.toLowerCase()))
        const matched = remaining.find(a => a.toLowerCase() === text)
        return { correct: !!matched, matched, allDone: matched && remaining.length === 1 }
    }

    if (type === 'math') {
        return { correct: text === String(answer).toLowerCase() }
    }

    // Default: case-insensitive string match
    const correct = text === String(answer).toLowerCase()
    return { correct }
}

export function formatSisa(chatId) {
    const s = sessions.get(chatId)
    if (!s) return 0
    const elapsed = Date.now() - s.startedAt
    return Math.max(0, Math.round((DEFAULT_TIMEOUT - elapsed) / 1000))
}

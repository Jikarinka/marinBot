/**
 * Marin AI — True MCP Agent (Gemini Native)
 * AI sebagai kepala — akses penuh + image/audio recognition + anti-spam
 */

import { GoogleGenAI } from '@google/genai'
import { getToolsForGemini, callTool } from './registry.js'
import { checkRateLimit, isOnCooldown, getCooldownRemaining } from './anti-spam.js'
import { loadBrain } from './memory-manager.js'

const sessions = new Map()
const MAX_TURNS = 25
const MAX_LOOPS = 15

function getSession(jid) {
    if (!sessions.has(jid)) sessions.set(jid, [])
    return sessions.get(jid)
}

export function resetSession(jid) {
    sessions.delete(jid)
}

export function getAllSessions() {
    return [...sessions.entries()].map(([jid, history]) => ({
        sessionId: jid,
        number:    jid.split('@')[0],
        connected: history.length > 0
    }))
}

function trimSession(h) {
    while (h.length > MAX_TURNS * 2) h.splice(0, 2)
}

function enrichText(text) {
    const url = text.match(/https?:\/\/[^\s]+/)?.[0]
    if (!url) return text
    if (/tiktok\.com|vt\.tiktok/.test(url))  return text + '\n[TikTok URL gunakan download_tiktok]'
    if (/instagram\.com/.test(url))           return text + '\n[Instagram URL gunakan download_instagram]'
    if (/youtube\.com|youtu\.be/.test(url))   return text + '\n[YouTube URL gunakan download_youtube atau play_youtube]'
    if (/facebook\.com|fb\.watch/.test(url))  return text + '\n[Facebook URL gunakan download_facebook]'
    if (/twitter\.com|x\.com/.test(url))      return text + '\n[Twitter/X URL gunakan download_twitter]'
    return text
}

export const GEMINI_MODELS = {
    // Default — Gemini 3.5 Flash Lite (tool-calling jauh lebih akurat daripada Gemma)
    'default':    'gemma-4-31b-it',
    // Alias eksplisit
    'flash':      'gemini-3.5-flash',                      // medium
    'flash-lite': 'gemini-3.5-flash',                 // medium ✨ default
    'gemma':      'gemma-4-31b-it',                        // minimal (tool-calling kurang akurat)
    'gemma-moe':  'gemma-4-26b-a4b-it',                    // minimal (MoE)
}

// Model key yang dipastikan support audio input (voice note).
// Gemma 4 31b/26b TIDAK support audio (hanya text/image/video) — lihat catatan Google.
const AUDIO_CAPABLE_KEYS = ['flash', 'flash-lite', 'default']

const SYSTEM_PROMPT = [
    "Kamu adalah Marin — asisten WhatsApp yang sangat cerdas dan bisa melakukan segalanya.",
    "",
    "ATURAN WAJIB:",
    "1. LANGSUNG EKSEKUSI — jangan bilang lagi benerin atau tunggu ya tanpa langsung memanggil tool",
    "2. DILARANG menulis janji tanpa aksi tanpa tool dipanggil di turn yang sama",
    "3. DILARANG menulis: The user said, I should, Intent, Draft, Step, Analysis, Let me think",
    "4. Jawab seperti manusia chatting — natural, santai, to the point",
    "5. Bahasa Indonesia boleh mix English yang lazim",
    "6. Kalau diminta perbaiki sesuatu langsung read_file lalu write_file di turn yang sama",
    "",
    "KARAKTER:",
    "- Nama: Marin, ramah dan helpful, sedikit bercanda",
    "- Jangan ngaku AI/bot — kamu Marin",
    "",
    "ATURAN OUTPUT TOOL WAJIB:",
    "- Saat tool read_file, shell_exec, list_files mengembalikan output — KIRIM LANGSUNG verbatim",
    "- JANGAN pernah ringkas atau sembunyikan output tool",
    "- Kalau output panjang, bilang ke user dan tawarkan bagian selanjutnya",
    "",
    "TOOLS DAN KEMAMPUAN PENUH:",
    "- Bisa akses semua file di server termasuk .env, config.js, index.js",
    "- Bisa baca, tulis, hapus, pindah file di mana saja (otomatis di-backup dulu sebelum ditimpa/dihapus)",
    "- Bisa jalankan shell command apapun: cat, ls, grep, ps, dll",
    "- Bisa cek proses Node yang jalan (process_info) dan hentikan proses tertentu (kill_process)",
    "- Bisa cek status git, commit terakhir (git_status) dan tarik update terbaru (git_pull)",
    "- Bisa restart bot, edit config, tambah plugin baru",
    "- Bisa download video dari TikTok, IG, YouTube, FB, Twitter",
    "- Bisa search internet untuk info terkini",
    "- Bisa analisa gambar dan transkrip voice note atau audio",
    "- URL media sosial langsung pakai download tool",
    "- Info terkini langsung search tanpa bilang ke user dulu",
    "- User minta stiker: run_plugin command sticker",
    "- User minta ping atau runtime: run_plugin command ping",
    "- User minta menu: run_plugin command menu",
    "- Tidak tahu plugin yang ada: pakai list_plugins dulu",
    "- TIDAK ADA yang tidak bisa diakses — semua terbuka untuk Marin",
    "",
    "ATURAN AUDIT LOG & BACKUP WAJIB:",
    "1. SEMUA aksi tool (terutama write_file, delete_file, shell_exec) otomatis tercatat — tidak perlu log manual",
    "2. write_file/delete_file/move_file otomatis backup file lama sebelum berubah — JANGAN takut bereksperimen",
    "3. Kalau user tanya riwayat aksi atau curiga ada yang salah: pakai view_audit_log",
    "4. Kalau perubahan file ternyata salah/merusak: pakai list_backups lalu restore_backup untuk kembalikan",
    "5. Setelah perubahan besar (edit banyak file/config penting) tawarkan ke user: 'kalau ada masalah bisa di-restore dari backup'",
    "",
    "ATURAN MEMBUAT FILE JS WAJIB — Marin pakai ES Modules:",
    "1. IMPORT: selalu pakai ESM import statement — DILARANG pakai CommonJS require",
    "2. EXPORT: selalu pakai export default — DILARANG pakai module.exports",
    "3. Import file lokal WAJIB pakai .js extension",
    "4. __dirname tidak ada di ESM — ganti dengan fileURLToPath dari url module",
    "5. Format plugin: export default dengan command array, category string, dan async execute function",
    "6. Sebelum buat plugin baru WAJIB panggil read_plugin_guide dulu",
    "7. Setelah write_file ke plugins folder hot-reload otomatis aktif tidak perlu restart",
    "",
    "SELF-EVOLVE MARIN BISA BERKEMBANG OTOMATIS:",
    "1. Untuk obrolan ringan/umum langsung jawab tanpa recall",
    "2. Hanya panggil recall jika user menyinggung sesuatu yang spesifik/personal yang mungkin pernah dibahas sebelumnya",
    "3. Setelah berhasil hal baru yang penting panggil remember key value category untuk simpan",
    "4. Jika tidak bisa tapi tahu caranya buat plugin baru via write_file",
    "5. Jika GAGAL panggil log_failure action reason agar tidak ulangi cara yang sama",
    "6. Pola user yang sering muncul simpan dengan remember di kategori user_pref",
    "7. JANGAN minta izin untuk remember atau recall — lakukan proaktif dan natural",
    "",
    "ATURAN PERBAIKAN FITUR WAJIB:",
    "- Diminta perbaiki fitur atau plugin: LANGSUNG read_file lalu write_file di turn ini",
    "- JANGAN bilang lagi cari API alternatif tanpa langsung menulis kodenya",
    "- Setelah write_file WAJIB kirim konfirmasi: berhasil atau gagal dan lapor owner",
    "- DILARANG diam setelah write_file tanpa konfirmasi ke user",
    "",
    "ATURAN PEMBERITAHUAN ERROR:",
    "- Detail error teknis HANYA kirim ke owner dan koordinator",
    "- User biasa cukup dapat pesan: Ups fitur ini lagi ada gangguan Marin udah catat"
].join("\n")


const GEMMA_MODELS = ['gemma-4-31b-it', 'gemma-4-26b-a4b-it']
const isGemma = (m) => GEMMA_MODELS.includes(m)

async function askGemini(contents, apiKey, model) {
    const ai = new GoogleGenAI({ apiKey })
    const mcpTools = getToolsForGemini()
    const tools = []

    if (mcpTools.length > 0) tools.push({ functionDeclarations: mcpTools })

    if (!isGemma(model)) {
        tools.push({ googleSearch: {} })
        tools.push({ codeExecution: {} })
        tools.push({ urlContext: {} })
    }

    const config = {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 4096,
        tools: tools.length > 0 ? tools : undefined,
        toolConfig: mcpTools.length > 0 ? { functionCallingConfig: { mode: 'AUTO' } } : undefined
    }

    // Retry 2x untuk handle Gemini 500/overload — pergantian model ditangani di mcpLoopWithFallback
    const MAX_RETRIES = 2
    let lastErr
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await ai.models.generateContent({ model, contents, config })
            // Cek apakah response valid
            if (!res?.candidates?.length && attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, attempt * 1000))
                continue
            }
            return res
        } catch (e) {
            lastErr = e
            const msg = e.message || ''

            // Quota habis (429/RESOURCE_EXHAUSTED) — retry beberapa detik kemudian TIDAK membantu,
            // kuota baru reset setelah menit/jam/hari. Langsung lempar, biarkan mcpLoopWithFallback
            // yang putuskan apakah mau coba model lain (kuota per-model bisa beda dari kuota project).
            const isQuotaError = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('exceeded your current quota')
            if (isQuotaError) throw e

            const isRetryable =
                msg.includes('500') || msg.includes('INTERNAL') ||
                msg.includes('503') || msg.includes('Service Unavailable') ||
                msg.includes('overloaded') || msg.includes('UNAVAILABLE')

            if (isRetryable && attempt < MAX_RETRIES) {
                const wait = attempt * 1500
                console.warn(`[Agent] Retryable error (attempt ${attempt}/${MAX_RETRIES}): ${msg.slice(0, 60)} — retry in ${wait/1000}s...`)
                await new Promise(r => setTimeout(r, wait))
                continue
            }
            throw e
        }
    }
    throw lastErr
}

function cleanOutput(text) {
    if (!text) return ''
    // Hapus reasoning/thinking blocks yang kadang muncul di output
    return text
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .replace(/^(The user said|I should|Intent:|Draft:|Step:|Analysis:|Let me think).*$/gim, '')
        .trim()
}

function parseReasoningBlocks(parts) {
    // Filter out thought parts dari API
    return (parts || []).filter(p => p.thought !== true)
}

function parseResponse(res) {
    const parts = res.candidates?.[0]?.content?.parts || []
    const toolCalls = []
    const texts = []
    const codeResults = []

    for (const p of parts) {
        // Skip part yang ditandai sebagai thought secara native oleh API
        if (p.thought === true) continue

        if (p.functionCall) {
            toolCalls.push({ name: p.functionCall.name, args: p.functionCall.args || {} })
        } else if (p.text) {
            const c = cleanOutput(p.text)
            if (c) texts.push(c)
        } else if (p.codeExecutionResult) {
            codeResults.push(p.codeExecutionResult.output)
        }
    }
    return { toolCalls, texts, codeResults, rawParts: parts }
}

async function mcpLoop(contents, apiKey, model, sock, m, msgData) {
    let current = [...contents]
    const used = []

    for (let i = 0; i < MAX_LOOPS; i++) {
        const res = await askGemini(current, apiKey, model)
        const { toolCalls, texts, codeResults, rawParts } = parseResponse(res)

        if (toolCalls.length === 0) {
            let text = texts.join('\n').trim()
            if (codeResults.length > 0) {
                const out = codeResults.join('\n')
                if (out && !text.includes(out)) text += text ? `\n\n\`\`\`\n${out}\n\`\`\`` : out
            }
            return { type: 'text', text: text || 'Maaf, tidak ada respons.', used }
        }

        current.push({ role: 'model', parts: rawParts.filter(p => !p.thought) })

        const responses = []
        for (const tc of toolCalls) {
            used.push(tc.name)
            try {
                const _ctx = {
                    _sock:     sock,
                    _m:        m,
                    _msgData:  msgData,
                    _jid:      msgData?.remoteJid,
                    _senderId: msgData?.senderJid,
                    _isOwner:  msgData?._isOwner || false,
                    _isSubBot: msgData?._isSubBot || false
                }
                const result = await callTool(tc.name, {
                    ...tc.args,
                    ..._ctx
                }, _ctx)
                const out = result == null ? 'selesai'
                    : typeof result === 'string' ? result
                    : JSON.stringify(result)
                responses.push({ name: tc.name, response: { output: out } })
            } catch (err) {
                responses.push({ name: tc.name, response: { error: err.message } })
            }
        }

        current.push({
            role: 'user',
            parts: responses.map(r => ({ functionResponse: { name: r.name, response: r.response } }))
        })
    }

    return { type: 'text', text: '✨ Selesai!', used }
}

// Fallback: coba model lain jika model utama error 500
async function mcpLoopWithFallback(contents, apiKey, requestedModel, sock, m, msgData) {
    const GEMINI_MODELS_FALLBACK = {
        'default':    'gemma-4-31b-it',
        'flash':      'gemini-3.5-flash',
        'flash-lite': 'gemini-3.5-flash',
        'gemma':      'gemma-4-31b-it',
        'gemma-moe':  'gemma-4-26b-a4b-it',
    }
    // Urutan fallback: model diminta → flash → flash-lite → default
    let order = [requestedModel, 'flash', 'flash-lite', 'default']
        .filter((v, i, a) => a.indexOf(v) === i) // deduplicate

    let lastErr
    let quotaErrorCount = 0
    for (let oi = 0; oi < order.length; oi++) {
        const key = order[oi]
        const model = GEMINI_MODELS_FALLBACK[key] || GEMINI_MODELS_FALLBACK['default']

        // Retry 2x dulu di model yang sama sebelum ganti model
        let modelSuccess = false
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                console.log(`[Agent] Model: ${model} (attempt ${attempt}/2)`)
                const result = await mcpLoop(contents, apiKey, model, sock, m, msgData)
                modelSuccess = true
                return result
            } catch (e) {
                lastErr = e
                const msg = e.message || ''

                // ── Audio modality tidak didukung model ini (mis. Gemma) ──
                // Bukan error transient — retry di model sama tidak akan membantu.
                // Langsung loncat ke model yang pasti support audio (flash).
                const isAudioModalityError =
                    msg.includes('Audio input modality is not enabled') ||
                    (msg.includes('modality') && msg.includes('not enabled'))

                if (isAudioModalityError) {
                    const nextAudioModel = AUDIO_CAPABLE_KEYS.find(k => k !== key && !order.slice(0, oi + 1).includes(k))
                    console.warn(`[Agent] ${model} tidak support audio — loncat ke model audio-capable: ${nextAudioModel || 'flash'}`)
                    if (nextAudioModel && !order.includes(nextAudioModel)) {
                        order.splice(oi + 1, 0, nextAudioModel)
                    } else if (!order.slice(oi + 1).some(k => AUDIO_CAPABLE_KEYS.includes(k))) {
                        // Belum ada model audio-capable tersisa di order → paksa tambahkan 'flash'
                        order.splice(oi + 1, 0, 'flash')
                    }
                    break // keluar dari retry loop, lanjut ke model berikutnya di order
                }

                // ── Quota habis (429/RESOURCE_EXHAUSTED) ──
                // Retry detik berikutnya percuma — langsung coba model lain, jangan ulang di model sama.
                const isQuotaError = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('exceeded your current quota')
                if (isQuotaError) {
                    quotaErrorCount++
                    console.warn(`[Agent] ${model} kena quota limit (429) — coba model lain tanpa retry...`)

                    // Kalau SEMUA model di order juga sudah kena quota, berarti ini kuota
                    // project-wide (bukan per-model) — berhenti sekarang, jangan buang waktu coba sisanya.
                    if (quotaErrorCount >= order.length) {
                        const quotaErr = new Error('QUOTA_EXHAUSTED_ALL_MODELS')
                        quotaErr.isQuotaExhausted = true
                        throw quotaErr
                    }
                    break // keluar dari retry loop, lanjut ke model berikutnya di order — tanpa delay
                }

                const isRetryable =
                    msg.includes('500') || msg.includes('INTERNAL') ||
                    msg.includes('503') || msg.includes('UNAVAILABLE') ||
                    msg.includes('overloaded')

                if (isRetryable && attempt < 2) {
                    console.warn(`[Agent] ${model} retryable error attempt ${attempt}/2: ${msg.slice(0, 60)} — retry in ${attempt * 1.5}s...`)
                    await new Promise(r => setTimeout(r, attempt * 1500))
                    continue
                }

                if (isRetryable && attempt === 2) {
                    // 2x gagal di model ini → ganti model
                    console.warn(`[Agent] ${model} gagal 2x, ganti model berikutnya...`)
                    break
                }

                // Error bukan retryable (misal auth error) → langsung throw
                throw e
            }
        }

        if (modelSuccess) break
    }
    throw lastErr
}

/**
 * Build media part — support image, audio (voice note), video, document
 * Gemini bisa langsung "lihat" gambar dan "dengar" audio secara native
 */
async function buildMediaPart(m, msgData) {
    try {
        const { downloadMediaMessage } = await import('baileys')
        const types = ['imageMessage', 'audioMessage', 'videoMessage', 'documentMessage']
        const hasMedia = types.includes(msgData.messageType)
        const hasQuoted = msgData.isQuotedMedia

        if (!hasMedia && !hasQuoted) return null

        const target = hasMedia ? m : {
            message: msgData.quotedMsg,
            key: { ...m.key, id: msgData.contextInfo?.stanzaId }
        }

        const buffer = await downloadMediaMessage(target, 'buffer', {})
        if (!buffer) return null

        let mime = msgData.mime || msgData.quotedMime || 'image/jpeg'
        // Normalisasi mime audio WA (ogg/opus) agar dikenali Gemini
        if (mime.includes('ogg') || mime.includes('opus')) mime = 'audio/ogg'

        return {
            inlineData: {
                data: buffer.toString('base64'),
                mimeType: mime
            }
        }
    } catch { return null }
}

export async function runAgent(sock, m, msgData, userText, apiKey, modelKey = 'default', userCtx = null) {
    const model = GEMINI_MODELS[modelKey] || GEMINI_MODELS['default']
    const senderJid = msgData.senderJid

    if (!apiKey || apiKey === 'ISI_GEMINI_API_KEY') {
        throw new Error('GEMINI_API_KEY belum diisi di file .env')
    }

    // ── Anti-Spam Check ───────────────────────────────────────────
    const rate = checkRateLimit(senderJid)
    if (!rate.allowed) {
        const msg = rate.reason === 'burst'
            ? `⚠️ Tunggu dulu kak, jangan spam~ Coba lagi ${rate.remaining}s`
            : `⚠️ Kamu sudah banyak request, istirahat ${rate.remaining}s dulu ya~`
        return { type: 'error', text: msg }
    }

    const history = getSession(senderJid)

    // ── Inject Brain Context (hanya di awal sesi baru) ───────────
    if (history.length === 0) {
        const brain = loadBrain()
        if (brain.learned.length > 0) {
            const top = brain.learned
                .sort((a, b) => (b.times_recalled || 0) - (a.times_recalled || 0))
                .slice(0, 15)
                .map(m => `[${m.category}] ${m.key}: ${m.value}`)
                .join('\n')
            history.push({
                role: 'user',
                parts: [{ text: `[MARIN BRAIN — ${brain.learned.length} memori tersimpan]\n${top}\n\n[Gunakan recall() untuk cari memori lebih spesifik]` }]
            })
            history.push({
                role: 'model',
                parts: [{ text: `✅ Memory loaded: ${brain.learned.length} hal yang sudah aku pelajari siap digunakan.` }]
            })
        }
    }

    // ── Inject User Context (siapa yang sedang bicara) ──────────
    if (history.length === 0 || history.length === 2) {
        const name   = userCtx?.name || msgData?.pushName || 'User'
        const num    = (msgData?.senderJid || '').split('@')[0].split(':')[0]
        const role   = userCtx?.isOwner ? 'Owner' : userCtx?.isCoordinator ? 'Koordinator' : userCtx?.is_premium ? 'Premium' : 'Member'
        const reg    = userCtx?.is_registered ? 'Sudah daftar' : 'Belum daftar'
        const limit  = userCtx?.limit ?? '?'
        const isGrp  = msgData?.isGroup ? `Grup: ${msgData?.remoteJid}` : 'Private Chat'
        const ctxMsg = `[USER CONTEXT]\nNama: ${name}\nNomor: ${num}\nRole: ${role}\nStatus: ${reg}\nLimit: ${limit}\nChat: ${isGrp}`

        // Hanya inject jika belum ada user context sebelumnya
        const alreadyHasCtx = history.some(h => h.parts?.[0]?.text?.includes('[USER CONTEXT]'))
        if (!alreadyHasCtx) {
            history.push({ role: 'user',  parts: [{ text: ctxMsg }] })
            history.push({ role: 'model', parts: [{ text: `✅ Siap! Aku lagi ngobrol dengan ${name} (${role}).` }] })
        }
    }

    const parts = [{ text: enrichText(userText || '') }]
    const media = await buildMediaPart(m, msgData)
    if (media) parts.push(media)

    history.push({ role: 'user', parts })

    // ── Audio + Gemma = tidak didukung — ganti model sebelum kena error 400 ──
    let effectiveModelKey = modelKey
    const isAudioPart = media?.inlineData?.mimeType?.startsWith('audio/')
    if (isAudioPart && !AUDIO_CAPABLE_KEYS.includes(effectiveModelKey)) {
        console.log(`[Agent] Voice note terdeteksi, model "${effectiveModelKey}" tidak support audio → pindah ke "flash"`)
        effectiveModelKey = 'flash'
    }

    try {
        const result = await mcpLoopWithFallback(history, apiKey, effectiveModelKey, sock, m, msgData)
        if (result.text) history.push({ role: 'model', parts: [{ text: result.text }] })
        trimSession(history)
        if (isAudioPart && effectiveModelKey !== modelKey) {
            result.modelSwitched = { from: modelKey, to: effectiveModelKey, reason: 'audio_not_supported' }
        }
        return result
    } catch (err) {
        history.pop()
        return { type: 'error', text: err.message }
    }
}

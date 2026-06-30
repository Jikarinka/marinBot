import config  from '../../config.js'
import axios   from 'axios'
import fs      from 'fs'
import path    from 'path'
import { logAction } from '../../mcp/audit-log.js'

// ── Pre-load modul yang sering dipakai di eval ───────────────────
// Semua ini langsung tersedia sebagai variable di dalam .eval
// Tidak perlu import manual lagi~
let _preloaded = null
async function getPreloaded() {
    if (_preloaded) return _preloaded

    const [
        cheerioMod,
        agentMod,
        baileysMod,
        dbUserMod,
        dbGroupMod,
    ] = await Promise.allSettled([
        import('cheerio'),
        import('../../mcp/agent.js'),
        import('baileys'),
        import('../../databases/User.js'),
        import('../../databases/Group.js'),
    ])

    _preloaded = {
        // ── HTTP / Scraping ───────────────────────────────
        axios,
        fetch: globalThis.fetch,
        cheerio: cheerioMod.status === 'fulfilled' ? cheerioMod.value : null,

        // ── File System ───────────────────────────────────
        fs,
        path,
        cwd: process.cwd(),

        // ── Bot internals ─────────────────────────────────
        config,
        agent: agentMod.status === 'fulfilled' ? agentMod.value : null,
        getSessionRaw:     agentMod.status === 'fulfilled' ? agentMod.value.getSessionRaw     : null,
        getAllSessionsRaw:  agentMod.status === 'fulfilled' ? agentMod.value.getAllSessionsRaw  : null,
        resetSession:      agentMod.status === 'fulfilled' ? agentMod.value.resetSession       : null,
        compressSession:   agentMod.status === 'fulfilled' ? agentMod.value.compressSession    : null,
        getAllSessions:     agentMod.status === 'fulfilled' ? agentMod.value.getAllSessions      : null,
        GEMINI_MODELS:     agentMod.status === 'fulfilled' ? agentMod.value.GEMINI_MODELS       : null,

        // ── Baileys utilities ─────────────────────────────
        baileys: baileysMod.status === 'fulfilled' ? baileysMod.value : null,
        downloadMediaMessage: baileysMod.status === 'fulfilled' ? baileysMod.value.downloadMediaMessage : null,
        jidDecode:            baileysMod.status === 'fulfilled' ? baileysMod.value.jidDecode            : null,

        // ── Database models ───────────────────────────────
        User:  dbUserMod.status  === 'fulfilled' ? dbUserMod.value.default  || dbUserMod.value  : null,
        Group: dbGroupMod.status === 'fulfilled' ? dbGroupMod.value.default || dbGroupMod.value : null,

        // ── Node built-ins ────────────────────────────────
        process,
        Buffer,
        URL,
        crypto: await import('crypto').then(m => m.default || m).catch(() => null),
        util:   await import('util').then(m => m.default || m).catch(() => null),
        os:     await import('os').then(m => m.default || m).catch(() => null),
    }

    return _preloaded
}

function sanitize(s) {
    return s
        .replace(/[\u2018\u2019\u201A\u201B]/g, "'")  // '' → '
        .replace(/[\u201C\u201D\u201E\u201F]/g, '"')  // "" → "
        .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, '-')
        .replace(/\u00B4/g, "'")
}

function formatResult(result) {
    if (result === undefined) return 'undefined'
    if (result === null)      return 'null'
    if (typeof result === 'string') return result
    if (typeof result === 'function') return result.toString().slice(0, 500)
    if (result instanceof Buffer) return `<Buffer ${result.length} bytes>`
    if (result instanceof Map) return JSON.stringify([...result.entries()], null, 2)
    if (result instanceof Set) return JSON.stringify([...result.values()], null, 2)
    try { return JSON.stringify(result, null, 2) } catch { return String(result) }
}

export default {
    command: ['eval', 'ev'],
    category: 'owner',
    isOwner: true,
    description: 'Eksekusi JavaScript langsung dari chat. Semua modul penting sudah tersedia.',

    async execute(sock, m, msgData) {
        const raw  = sanitize(msgData.args.join(' '))
        const code = raw.trim()

        if (!code) {
            return msgData.reply(
                `*─「 EVAL 」─*\n\n` +
                `*Variable yang tersedia:*\n` +
                `\`sock\` \`m\` \`msgData\` \`config\`\n` +
                `\`conn\` _(alias sock)_\n\n` +
                `*HTTP/Scraping:*\n` +
                `\`axios\` \`fetch\` \`cheerio\`\n\n` +
                `*File System:*\n` +
                `\`fs\` \`path\` \`cwd\`\n\n` +
                `*Bot Internal:*\n` +
                `\`agent\` \`getSessionRaw\` \`getAllSessionsRaw\`\n` +
                `\`resetSession\` \`compressSession\`\n` +
                `\`GEMINI_MODELS\`\n\n` +
                `*Database:*\n` +
                `\`User\` \`Group\`\n\n` +
                `*Baileys:*\n` +
                `\`baileys\` \`downloadMediaMessage\` \`jidDecode\`\n\n` +
                `*Node Built-ins:*\n` +
                `\`process\` \`Buffer\` \`crypto\` \`util\` \`os\`\n\n` +
                `*Contoh:*\n` +
                `\`.eval getSessionRaw(m.sender)\`\n` +
                `\`.eval axios.get('https://api.github.com').then(r=>r.status)\`\n` +
                `\`.eval fs.readdirSync(cwd).slice(0,10)\`\n` +
                `\`.eval User.findOne({ jid: m.sender })\``
            )
        }

        try { await msgData.react('⏳') } catch (_) {}

        const startedAt = Date.now()

        try {
            const pre  = await getPreloaded()
            const conn = sock  // alias familiar

            const context = {
                sock, m, msgData, config, conn,
                ...pre,
            }

            // Wrap: kalau tidak ada return, coba eval sebagai expression
            const wrappedCode = code.includes('return')
                ? code
                : `return (${code})`

            const evalFunc = new Function(
                ...Object.keys(context),
                `return (async () => { ${wrappedCode} })()`
            )

            const result = await evalFunc(...Object.values(context))
            const str    = formatResult(result)

            logAction({
                tool: 'manual_eval', args: { code }, senderId: msgData.senderJid,
                isOwner: true, success: true, durationMs: Date.now() - startedAt,
                resultPreview: str?.slice(0, 100)
            })

            const elapsed = Date.now() - startedAt
            await msgData.reply(
                `*─「 EVAL RESULT 」─*\n` +
                `_${elapsed}ms_\n\n` +
                `\`\`\`javascript\n${str.slice(0, 3500)}\n\`\`\``
            )
            try { await msgData.react('✅') } catch (_) {}

        } catch (error) {
            logAction({
                tool: 'manual_eval', args: { code }, senderId: msgData.senderJid,
                isOwner: true, success: false, durationMs: Date.now() - startedAt,
                error: error.message || String(error)
            })
            await msgData.reply(
                `*─「 EVAL ERROR 」─*\n\n` +
                `\`\`\`\n${String(error.message || error).slice(0, 1000)}\n\`\`\``
            )
            try { await msgData.react('❌') } catch (_) {}
        }
    }
}

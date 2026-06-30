/**
 * Plugin AI Chat — Marin Bot
 * Private Chat: aktif tanpa prefix (seperti Claude)
 * Group Chat: aktif jika di-mention atau reply ke bot
 */

import { runAgent, resetSession, GEMINI_MODELS } from '../../mcp/agent.js'
import { listTools, countTools } from '../../mcp/registry.js'
import { getAllSessions } from '../../mcp/session-manager.js'

async function handleAiLogic(sock, m, msgData, user, group, rawText) {
    const { remoteJid, commandName } = msgData
    const apiKey = process.env.GEMINI_API_KEY || ''
    const keyOk  = apiKey && apiKey !== 'ISI_GEMINI_API_KEY_DISINI' && apiKey.length > 10

    const args = rawText.trim().split(/\s+/).filter(Boolean)
    const sub  = args[0]?.toLowerCase()
    const text = rawText.trim()

    if (sub === 'reset') {
        resetSession(msgData.senderJid)
        return msgData.reply('✅ Sesi Marin direset~')
    }

    if (sub === 'info') {
        const sessions = getAllSessions()
        return msgData.reply(
            '🌸 *Marin AI — Info*\n\n' +
            '🤖 Model: gemini-3.5-flash-lite (default)\n' +
            '🔑 API Key: ' + (keyOk ? '✅ Aktif' : '❌ Belum diisi') + '\n' +
            '🔧 MCP Tools: ' + countTools() + ' tools\n' +
            '📡 Session aktif: ' + sessions.length + '\n\n' +
            '_.ai reset_ | _.ai info_ | _.ai tools_ | _.ai models_'
        )
    }

    if (sub === 'tools') {
        const tools = listTools()
        if (!tools.length) return msgData.reply('❌ Belum ada MCP tool')
        return msgData.reply(
            '🔧 *MCP Tools (' + tools.length + ')*\n\n' +
            tools.map((t, i) => (i + 1) + '. `' + t + '`').join('\n')
        )
    }

    if (sub === 'models') {
        return msgData.reply(
            '🤖 *Model Tersedia*\n\n' +
            '• `flash` → Gemini 3.5 Flash (medium)\n' +
            '• `flash-lite` → Gemini 3.5 Flash Lite (medium) ✨ *default*\n' +
            '• `gemma` → Gemma 4 31b-it (minimal)\n' +
            '• `gemma-moe` → Gemma 4 26b-a4b-it (minimal MoE)\n\n' +
            'Gunakan: _.ai:flash_, _.ai:flash-lite_, _.ai:gemma_ atau _.ai:gemma-moe_'
        )
    }

    if (sub === 'sessions') {
        const sessions = getAllSessions()
        if (!sessions.length) return msgData.reply('❌ Tidak ada session aktif')
        return msgData.reply(
            '📡 *Active Sessions (' + sessions.length + ')*\n\n' +
            sessions.map((s, i) => (i + 1) + '. ' + s.sessionId + ' → ' + s.number + ' ' + (s.connected ? '✅' : '❌')).join('\n')
        )
    }

    if (!text && !msgData.isMedia && !msgData.isQuotedMedia) {
        return msgData.reply(
            '🌸 *Haii~ Aku Marin!*\n\n' +
            'Asisten WhatsApp dengan AI Gemini~\n\n' +
            '*Bisa aku lakukan:*\n' +
            '• 💬 Chat & jawab pertanyaan apapun\n' +
            '• 🌐 Search internet (info terkini)\n' +
            '• 🐍 Jalankan kode Python\n' +
            '• 🔗 Baca isi URL/website\n' +
            '• 🖼️ Analisa gambar yang dikirim\n' +
            '• 🎙️ Pahami voice note/audio\n' +
            '• 📥 Download TikTok/IG/YouTube/FB/Twitter\n\n' +
            '*Di Private Chat:* langsung ngobrol, gak perlu .ai!\n' +
            '*Di Grup:* pakai *.ai* atau mention/reply Marin\n\n' +
            '_.ai reset_ | _.ai info_ | _.ai tools_ | _.ai models_'
        )
    }

    if (!keyOk) {
        return msgData.reply(
            '❌ *GEMINI_API_KEY belum diisi!*\n\n' +
            'Edit file *.env*:\n`GEMINI_API_KEY=AIzaSy...`\n\n' +
            '🔑 https://aistudio.google.com/app/apikey'
        )
    }

    let modelKey = 'default'
    if (commandName && commandName.includes(':')) {
        modelKey = commandName.split(':')[1] || 'default'
    }

    try {
        await sock.sendPresenceUpdate('composing', remoteJid)
    } catch (_) {}

    let userText = text
    if ((msgData.isMedia || msgData.isQuotedMedia) && !userText) {
        const mtype = msgData.isMedia ? msgData.messageType : msgData.quotedType
        if (mtype === 'imageMessage')         userText = 'Analisa gambar ini'
        else if (mtype === 'audioMessage')    userText = 'Transkrip dan pahami audio/voice note ini'
        else if (mtype === 'videoMessage')    userText = 'Deskripsikan video ini'
        else if (mtype === 'documentMessage') userText = 'Baca dan rangkum dokumen ini'
    }

    msgData._isOwner = user?.isOwner || false

    try {
        const result = await runAgent(sock, m, msgData, userText, apiKey, modelKey, user);

        if (result.type === 'error') {
            await msgData.react('❌');
            return msgData.reply('❌ ' + result.text);
        }

        if (result.modelSwitched?.reason === 'audio_not_supported') {
            await msgData.reply(`🔄 _Model "${result.modelSwitched.from}" belum support voice note, otomatis pindah ke "${result.modelSwitched.to}"~_`);
        }

        if (result.text) {
            const skip = ['selesai', '✨ selesai!', '✨ selesai', ''].includes(result.text.toLowerCase().trim());
            if (!skip) await msgData.reply(result.text);
        }
    } catch (e) {
        console.error('AI Chat Error:', e)
        if (e.message === 'Connection Closed') {
            return msgData.reply('⚠️ Koneksi terputus saat memproses permintaan. Marin coba stabilkan dulu ya~');
        }
        return msgData.reply('❌ Ups, ada gangguan teknis di otak Marin. Coba lagi nanti ya!');
    }
}

export default {
    command: ['ai', 'marin', 'tanya', 'ask'],
    category: 'ai',
    description: 'Chat dengan Marin AI',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData, user, group) {
        const { args, remoteJid } = msgData

        if (!user?.is_registered && !user?.isOwner && !user?.isCoordinator) {
            return sock.sendMessage(remoteJid, {
                text: '👋 Kamu belum terdaftar nih kak!\nKetik *.daftar* dulu ya biar Marin kenal kamu~ 😊'
            }, { quoted: m })
        }

        await handleAiLogic(sock, m, msgData, user, group, args.join(' '))
    },

    async passiveListener(sock, m, msgData, user, group) {
        if (msgData.commandName) return false

        const botId     = sock?.user?.id || ''
        const botLid    = sock?.user?.lid || ''
        const botNumber = botId.split(':')[0].split('@')[0]
        const botNumLid = botLid.split(':')[0].split('@')[0]

        const toNum = (jid) => (jid || '').split(':')[0].split('@')[0]

        const isMentioned  = msgData.mentions?.some(jid => {
            const n = toNum(jid)
            return n === botNumber || n === botNumLid
        })

        const quotedSenderNum = toNum(msgData.quotedSender)
        const isReplyToBot = msgData.isQuoted && (
            quotedSenderNum === botNumber ||
            quotedSenderNum === botNumLid ||
            toNum(msgData.contextInfo?.participant) === botNumber ||
            toNum(msgData.msg?.[msgData.messageType]?.contextInfo?.participant) === botNumber
        )

        if (isMentioned || isReplyToBot || (!msgData.isGroup)) {
            await handleAiLogic(sock, m, msgData, user, group, msgData.text || '')
            return true
        }

        return false
    }
}

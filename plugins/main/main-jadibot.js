/**
 * .jadibot — Jadikan nomor sebagai sub-bot Marin
 *
 * User premium : .jadibot               → daftarkan nomor sendiri
 * User premium : .jadibot qr             → paksa metode QR
 * Owner         : .jadibot 628xxxxxxxxxx  → daftarkan nomor manapun
 * Owner         : .jadibot 628xxx pairing → paksa metode pairing code
 *
 * Sub-bot yang lahir dari sini TIDAK PERNAH dapat akses owner/koordinator,
 * berapapun nomornya — lihat middlewares/auth.js & validator.js untuk guard-nya.
 */

import sharp from 'sharp'
import {
    startSubBot,
    isSubBotActive,
    listSubBots,
    stopSubBot
} from '../../mcp/subbot-manager.js'

function normalizeNumber(num) {
    return String(num || '').replace(/[^0-9]/g, '')
}

async function qrToPngBuffer(qrString) {
    // Pakai qrcode (bukan qrcode-terminal) untuk render PNG asli yang bisa dikirim sebagai gambar
    const QRCode = (await import('qrcode')).default
    const dataUrl = await QRCode.toDataURL(qrString, { width: 512, margin: 2 })
    const base64 = dataUrl.split(',')[1]
    return Buffer.from(base64, 'base64')
}

export default {
    command: ['jadibot', 'subbot'],
    category: 'main',
    isRegistered: true,
    description: 'Menjadikan nomor WhatsApp sebagai sub-bot Marin.',

    async execute(sock, m, msgData, user) {
        const { args, remoteJid, senderJid, isOwner, isCoordinator } = msgData
        const isPrivileged = user?.isOwner || user?.isCoordinator

        // ── Sub-command: list & stop (owner/koordinator only) ─────────
        if (args[0] === 'list' && isPrivileged) {
            const list = listSubBots()
            if (!list.length) return msgData.reply('📡 Belum ada sub-bot yang aktif~')
            const text = list.map((s, i) =>
                `${i + 1}. ${s.number} — ${s.connected ? '✅ terhubung' : '⏳ menunggu'} (sejak ${new Date(s.startedAt).toLocaleString('id-ID')})`
            ).join('\n')
            return msgData.reply(`📡 *Sub-Bot Aktif (${list.length})*\n\n${text}`)
        }

        if (args[0] === 'stop' && isPrivileged) {
            const target = normalizeNumber(args[1])
            if (!target) return msgData.reply('Kasih nomor sub-bot yang mau dihentikan ya~ Contoh: `.jadibot stop 628xxxx`')
            const ok = await stopSubBot(target)
            return msgData.reply(ok ? `✅ Sub-bot ${target} dihentikan~` : `❌ Sub-bot ${target} tidak ditemukan/tidak aktif.`)
        }

        // ── Tentukan nomor target & apakah owner yang assign orang lain ──
        let targetNumber;
        let assignedByOwner = false;

        const firstArgNum = normalizeNumber(args[0])
        const looksLikeNumber = firstArgNum.length >= 8

        if (isPrivileged && looksLikeNumber) {
            // Owner/koordinator menjadikan NOMOR LAIN sebagai sub-bot
            targetNumber = firstArgNum
            assignedByOwner = true
        } else {
            // User (atau owner tanpa argumen nomor) mendaftarkan diri SENDIRI
            targetNumber = normalizeNumber(senderJid)

            // ── Syarat: WAJIB premium, kecuali owner/koordinator ──────
            if (!isPrivileged && !user?.is_premium) {
                return sock.sendMessage(remoteJid, {
                    text: `Uwaaa, maaf banget kak! Fitur *.jadibot* ini khusus buat member *Premium* nih~ (｡T ω T｡)\n\n` +
                        `Biar nomor kakak bisa jadi sub-bot Marin sendiri, kakak perlu upgrade ke Premium dulu yaa. Hubungi Owner buat info lebih lanjut~ ✨`
                }, { quoted: m })
            }
        }

        if (isSubBotActive(targetNumber)) {
            return msgData.reply(`Nomor ${targetNumber} sudah jadi sub-bot aktif kok kak~ Nggak perlu daftar ulang lagi! (๑>ᴗ<๑)`)
        }

        // ── Tentukan metode: qr (default) atau pairing ────────────────
        const methodArg = (assignedByOwner ? args[1] : args[0] || '').toLowerCase()
        const method = methodArg === 'pairing' || methodArg === 'pair' ? 'pairing' : 'qr'

        await msgData.reply(
            `🌸 Oke kak, Marin siapin sub-bot buat nomor *${targetNumber}* dulu ya~\n` +
            `Metode: *${method === 'pairing' ? 'Pairing Code' : 'QR Code'}*\n\n` +
            `Tunggu sebentar, Marin lagi buka koneksinya... (˶˃ ᵕ ˂˶)`
        )

        try {
            await startSubBot(targetNumber, {
                method,

                onQR: async (qrString) => {
                    try {
                        const buffer = await qrToPngBuffer(qrString)
                        await sock.sendMessage(remoteJid, {
                            image: buffer,
                            caption: `📷 *Scan QR ini di WhatsApp nomor ${targetNumber}*\n\n` +
                                `Buka WhatsApp → Perangkat Tertaut → Tautkan Perangkat → scan QR ini.\n` +
                                `QR berlaku sebentar, buruan di-scan yaa! ⏳`
                        }, { quoted: m })
                    } catch (e) {
                        await sock.sendMessage(remoteJid, { text: `❌ Gagal generate gambar QR: ${e.message}` }, { quoted: m })
                    }
                },

                onPairingCode: async (code) => {
                    await sock.sendMessage(remoteJid, {
                        text: `🔢 *Kode Pairing untuk ${targetNumber}:*\n\n` +
                            `\`\`\`${code}\`\`\`\n\n` +
                            `Buka WhatsApp di nomor *${targetNumber}* → Perangkat Tertaut → Tautkan dengan nomor telepon → masukkan kode ini.\n` +
                            `Kode berlaku sebentar, buruan dimasukin yaa! ⏳`
                    }, { quoted: m })
                },

                onConnected: async () => {
                    await sock.sendMessage(remoteJid, {
                        text: `✅ *Yeay! Sub-bot ${targetNumber} berhasil terhubung!* 🎉\n\n` +
                            `Sekarang nomor itu sudah aktif jadi bot Marin~ Tapi perlu diingat:\n` +
                            `• Sub-bot ini cuma berfungsi sebagai bot publik biasa\n` +
                            `• TIDAK punya akses owner/koordinator ke server\n` +
                            `• Fitur file, shell, eval, restart server semuanya diblokir\n\n` +
                            `Selamat menikmati sub-bot barunya kak~ (˶˃ ᵕ ˂˶)`
                    }, { quoted: m })
                },

                onFailed: async (reason) => {
                    const reasonText = reason === 'logged_out'
                        ? 'sesi logout/expired'
                        : reason === 'disconnected'
                        ? 'koneksi terputus'
                        : reason
                    await sock.sendMessage(remoteJid, {
                        text: `❌ Yahh, gagal menghubungkan sub-bot ${targetNumber}~ (${reasonText})\n\nCoba ketik *.jadibot* lagi yaa kak~ (╥﹏╥)`
                    }, { quoted: m })
                }
            })

        } catch (error) {
            console.error('[JadiBot] Error:', error)
            await msgData.reply(`❌ Gagal memulai sub-bot: ${error.message}`)
        }
    }
}

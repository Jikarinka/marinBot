import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from 'baileys';
import chalk from 'chalk';
import pino from 'pino';
import config from './config.js';
import sequelize, { Group, Setting } from './databases/connector.js';
import qrcode from 'qrcode-terminal';
import botHandler from './middlewares/handler.js';
import { extractMessageData } from './libs/adapter/messageAdapter.js';
import { logMessage } from './libs/console.js';
import fs from 'fs';
import path from 'path';
import { startCronJobs } from './libs/cronjob.js';
import { setGroupMetadata } from './libs/groupCache.js';
import { registerSession, unregisterSession } from './mcp/session-manager.js';
import { validateEnv, notifyEnvIssueIfAny } from './libs/env-validator.js';
import { rescheduleAllReminders } from './libs/reminder.js';

// ── Cek .env saat startup — peringatan jelas kalau kosong/hilang, bukan crash diam-diam ──
const envValidation = validateEnv();

let isDbConnected = false;
let cronStarted = false;

// sessionId → nomor WA (dipakai saat PAIRING_CODE=true)
// Diisi dari BOT_NUMBER (untuk sesi 'default') atau format sessionId:nomor di MULTI_SESSIONS
const pairingNumbers = new Map();

async function syncGroups(sock) {
    try {
        console.log('⏳ Sedang menyinkronkan data grup ke database...');
        const groups = await sock.groupFetchAllParticipating();
        const groupJids = Object.keys(groups);

        for (const jid of groupJids) {
            setGroupMetadata(jid, groups[jid]);
        }

        let newGroups = 0;
        let updatedGroups = 0;

        for (const jid of groupJids) {
            const groupData = groups[jid];
            const [group, created] = await Group.findOrCreate({
                where: { jid: jid },
                defaults: { name: groupData.subject, is_welcome: false, is_ban: false }
            });

            if (created) {
                newGroups++;
            } else if (group.name !== groupData.subject) {
                await group.update({ name: groupData.subject });
                updatedGroups++;
            }
        }

        if (newGroups > 0 || updatedGroups > 0) {
            console.log(`✅ Sinkronisasi grup selesai! (${newGroups} baru, ${updatedGroups} diperbarui)`);
        } else {
            console.log('✅ Data grup sudah sesuai dengan database.');
        }
    } catch (e) {
        console.error('❌ Gagal sinkronisasi grup:', e.message);
    }
}

/**
 * Konek ke WhatsApp untuk satu session tertentu.
 * sessionId menentukan folder auth — memungkinkan multi-akun berjalan paralel.
 */
async function connectToWhatsApp(sessionId = 'default') {
    if (!isDbConnected) {
        try {
            await Setting.findOrCreate({
                where: { id: 1 },
                defaults: { is_public: true, is_register: true, is_gconly: false }
            });
            console.log('✅ JSON Database (lowdb) siap digunakan!');
            isDbConnected = true;
        } catch (error) {
            console.error('❌ Gagal inisialisasi database JSON:', error.message);
            return;
        }
    }

    if (!cronStarted) {
        startCronJobs();
        cronStarted = true;
    }

    // Dibatasi timeout 8 detik — fetchLatestBaileysVersion() kadang nge-hang
    // selamanya (tanpa error) kalau host tidak bisa akses raw.githubusercontent.com.
    // Lihat: https://github.com/WhiskeySockets/Baileys/issues/1990
    const versionCheck = Promise.race([
        fetchLatestBaileysVersion().catch(err => {
            console.error(`[${sessionId}] Gagal fetch versi Baileys:`, err.message);
            return { version: undefined, isLatest: false };
        }),
        new Promise(resolve => setTimeout(() => resolve({ version: undefined, isLatest: false, timedOut: true }), 8000))
    ]);
    const { version: waVersion, isLatest, timedOut } = await versionCheck;

    if (timedOut) {
        console.log(chalk.yellow(`[${sessionId}] Cek versi WhatsApp Web timeout (>8s) — kemungkinan akses ke GitHub diblokir/lambat dari host ini. Lanjut pakai versi bawaan Baileys...`));
    } else if (waVersion) {
        const verStr = waVersion.join('.');
        console.log(chalk.cyan(`[${sessionId}] Using WhatsApp Web version: v${verStr} (${isLatest ? 'latest' : 'not latest'})`));
    } else {
        console.log(chalk.yellow(`[${sessionId}] Tidak dapat versi terbaru, pakai versi bawaan Baileys...`));
    }

    const sessionDir = sessionId === 'default' ? 'sessions' : path.join('sessions-multi', sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    // Pairing code dipakai jika belum login DAN PAIRING_CODE=true di .env
    // (atau MULTI_SESSIONS dipakai dengan format sessionId:nomor, lihat bootstrap())
    const usePairing = process.env.PAIRING_CODE === 'true' && !state.creds.registered;
    const pairingNumber = pairingNumbers.get(sessionId);

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        version: waVersion,
        browser: usePairing ? ['Ubuntu', 'Chrome', '120.0.0.0'] : ["macOS", "Safari", "20.0.00"],
        printQRInTerminal: false,
        markOnlineOnConnect: true,
        keepAliveIntervalMs: 30000,
        connectTimeoutMs: 60000,
        retryRequestDelayMs: 5000,
        maxMsgRetryCount: 5,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
    });

    registerSession(sessionId, sock);

    // ── Pairing code: diminta sebelum event QR muncul ─────────────────
    if (usePairing) {
        if (!pairingNumber) {
            console.log(chalk.yellow(`[${sessionId}] PAIRING_CODE=true tapi nomor belum diset. Set BOT_NUMBER di .env atau pakai format sessionId:nomor di MULTI_SESSIONS.`));
        } else {
            try {
                await new Promise(r => setTimeout(r, 1500));
                const code = await sock.requestPairingCode(pairingNumber.replace(/[^0-9]/g, ''));
                console.log(chalk.green(`\n[${sessionId}] Kode Pairing: ${chalk.bold(code)}`));
                console.log(chalk.green(`Buka WhatsApp → Perangkat Tertaut → Tautkan dengan nomor telepon → masukkan kode ini.\n`));
            } catch (err) {
                console.error(`[${sessionId}] Gagal request pairing code:`, err.message);
            }
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !usePairing) {
            console.log(`\n[${sessionId}] Scan QR Code ini menggunakan WhatsApp Anda:`);
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const reason = lastDisconnect.error?.output?.statusCode;
            console.log(`[${sessionId}] Koneksi terputus. Alasan: ${reason}`);
            unregisterSession(sessionId);

            if (reason === DisconnectReason.loggedOut) {
                console.log(`[${sessionId}] Sesi telah kedaluwarsa. Menghapus session...`);
                if (fs.existsSync(sessionDir)) {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                }
                setTimeout(() => connectToWhatsApp(sessionId), 2000);
            } else {
                console.log(`[${sessionId}] Mencoba menyambungkan kembali...`);
                setTimeout(() => connectToWhatsApp(sessionId), 2000);
            }
        } else if (connection === 'open') {
            console.log(`✅ [${sessionId}] Bot berhasil terhubung ke WhatsApp! Sedang menyinkronkan data...`);

            const syncPromise = syncGroups(sock);
            await Promise.race([
                syncPromise,
                new Promise(resolve => setTimeout(resolve, 3000))
            ]);

            console.log(`✅ [${sessionId}] Bot siap digunakan!`);

            // Kalau .env bermasalah saat startup, kabari owner lewat WA juga (bukan cuma console)
            if (!envValidation.ok) {
                await notifyEnvIssueIfAny(sock, envValidation);
            }

            // Jadwalkan ulang semua pengingat yang tersimpan (kalau bot sempat restart)
            if (sessionId === 'default') {
                rescheduleAllReminders(sock);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify' && type !== 'append') return;

        for (const m of messages) {
            if (!m.message) continue;

            const msgData = extractMessageData(m, sock);
            msgData.sessionId = sessionId;

            const protocolTypes = ['messageContextInfo', 'senderKeyDistributionMessage', 'protocolMessage', 'peerDataOperationRequestMessage'];
            if (protocolTypes.includes(msgData.messageType)) continue;

            if (m.key.fromMe) {
                logMessage(sock, msgData);
                if (!msgData.commandName) continue;
            } else {
                logMessage(sock, msgData);
            }

            botHandler(sock, m, msgData).catch(err => console.error(`[${sessionId}] Handler Error:`, err));
        }
    });

    sock.ev.on('groups.upsert', async (groups) => {
        for (const group of groups) {
            try {
                const [record, created] = await Group.findOrCreate({
                    where: { jid: group.id },
                    defaults: { name: group.subject, is_welcome: false, is_ban: false }
                });
                if (created) {
                    console.log(`✨ [${sessionId}] Terdeteksi masuk ke grup baru: ${group.subject} (${group.id})`);
                }
                const metadata = await sock.groupMetadata(group.id);
                setGroupMetadata(group.id, metadata);
            } catch (e) {
                console.error(`[${sessionId}] ❌ Gagal mendaftarkan grup baru:`, e.message);
            }
        }
    });

    sock.ev.on('group-participants.update', async (update) => {
        const { plugins } = await import('./libs/hot-reload.js');
        for (const plugin of plugins) {
            if (plugin.onParticipantsUpdate) {
                await plugin.onParticipantsUpdate(sock, update);
            }
        }
    });

    return sock;
}

/**
 * Multi-Session Bootstrap
 * MULTI_SESSIONS=akun1,akun2,akun3 di .env untuk multi-akun
 * Format per-item bisa: "namasesi" (QR) atau "namasesi:628xxxx" (pairing, jika PAIRING_CODE=true)
 * Jika tidak diset, jalankan 1 session default (backward compatible)
 */
async function bootstrap() {
    const multiSessionEnv = process.env.MULTI_SESSIONS?.trim();

    // Sesi 'default' pakai BOT_NUMBER dari .env sebagai nomor pairing
    if (config.BOT_NUMBER) {
        pairingNumbers.set('default', config.BOT_NUMBER);
    }

    if (multiSessionEnv) {
        const rawIds = multiSessionEnv.split(',').map(s => s.trim()).filter(Boolean);
        const sessionIds = rawIds.map(entry => {
            const [sid, number] = entry.split(':').map(s => s.trim());
            if (number) pairingNumbers.set(sid, number);
            return sid;
        });

        console.log(chalk.magenta(`🌸 Multi-Session aktif! Menjalankan ${sessionIds.length} akun: ${sessionIds.join(', ')}`));

        for (const sid of sessionIds) {
            await connectToWhatsApp(sid);
            await new Promise(r => setTimeout(r, 3000));
        }
    } else {
        await connectToWhatsApp('default');
    }
}

bootstrap();

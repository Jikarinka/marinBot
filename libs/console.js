import moment from 'moment-timezone';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'bot.log');

export const logMessage = (sock, msgData) => {
    const time = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
    const botNumber = sock.user?.id?.split(':')[0] || 'Bot';
    const targetNumber = msgData.remoteJid.split('@')[0];
    const senderNumber = msgData.senderJid.split('@')[0];

    const type = msgData.messageType || 'unknown';

    // Jangan print log untuk sistem WhatsApp untuk menghindari spam
    const protocolTypes = ['protocolMessage', 'senderKeyDistributionMessage', 'messageContextInfo', 'peerDataOperationRequestMessage'];
    if (protocolTypes.includes(type)) return;

    let content = msgData.messageContent;
    if (!content && type !== 'conversation' && type !== 'extendedTextMessage') {
        content = `[Media/Type: ${type}]`;
    }
    if (content.length > 60) {
        content = content.slice(0, 60) + '...';
    }
    content = content.replace(/\n/g, ' ');

    let logOutput = `\n=========================================`;
    logOutput += `\n[⏰ Waktu]      : ${time}`;

    if (msgData.fromMe) {
        logOutput += `\n[🤖 OUTGOING]   : BOT (${botNumber}) ➔ ${targetNumber}`;
        logOutput += `\n[💬 Tipe Pesan] : ${type}`;
        logOutput += `\n[📄 Balasan]    : ${content}`;
    } else {
        const cmd = msgData.commandName ? `.${msgData.commandName}` : '-';
        logOutput += `\n[🤖 Bot]        : ${botNumber}`;
        logOutput += `\n[👤 Pengirim]   : ${senderNumber} (${msgData.pushName})`;
        logOutput += `\n[👥 Chat]       : ${msgData.isGroup ? 'Group' : 'Private'} (${msgData.remoteJid})`;
        logOutput += `\n[💬 Tipe Pesan] : ${type}`;
        logOutput += `\n[⚙️  Command]    : ${cmd}`;
        logOutput += `\n[📄 Isi Pesan]  : ${content}`;
    }
    logOutput += `\n=========================================\n`;

    // Print to console
    console.log(logOutput);

    // Save to file
    try {
        fs.appendFileSync(LOG_FILE, logOutput);
    } catch (e) {
        console.error('❌ Gagal menulis ke bot.log:', e.message);
    }
};

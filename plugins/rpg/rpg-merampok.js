import User from '../../databases/orm/User.js';
import { checkCooldown, randomInt } from '../../libs/rpg-helper.js';

const COOLDOWN_MS = 3600000; // 1 jam
const SUCCESS_RATE = 50; // % — di source asli rampokan SELALU sukses, ini saya perbaiki

export default {
    command: ['merampok', 'rob'],
    category: 'rpg',
    description: 'Rampok money user lain (tag/reply). Ada kemungkinan gagal!',
    isRegistered: false,
    limit: true,

    async execute(sock, m, msgData) {
        const targetJid = msgData.mentions?.[0] || msgData.quotedSender || null;
        if (!targetJid) return msgData.reply('❌ Tag/reply user yang mau dirampok dulu!');
        if (targetJid === msgData.senderJid) return msgData.reply('❌ Tidak bisa merampok diri sendiri 🙄');

        const [robber] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const [victim] = User.findOrCreate({ where: { jid: targetJid } });

        const sisaWaktu = checkCooldown(robber.rpg.lastrob, COOLDOWN_MS);
        if (sisaWaktu) {
            return msgData.reply(`⏰ Kamu baru saja merampok! Sembunyi dulu, coba lagi dalam *${sisaWaktu}*`);
        }

        if (victim.rpg.money < 10000) {
            return msgData.reply('❌ Target tidak punya cukup money untuk dirampok (minimal 10.000).');
        }

        User.updateRpg(msgData.senderJid, { lastrob: Date.now() });

        // Chance gagal — kalau gagal, perampok malah kena "denda"
        if (randomInt(100) >= SUCCESS_RATE) {
            const fine = Math.min(robber.rpg.money, randomInt(5000) + 1000);
            User.updateRpg(msgData.senderJid, { money: robber.rpg.money - fine });
            return msgData.reply(`🚨 Kamu ketahuan! Rampokan gagal dan kamu kena denda *${fine}* 💹`);
        }

        // Jumlah curian dibatasi maksimal uang yang dimiliki korban (source asli tidak membatasi ini — bug)
        const stolen = Math.min(victim.rpg.money, randomInt(100000));

        User.updateRpg(targetJid, { money: victim.rpg.money - stolen });
        User.updateRpg(msgData.senderJid, { money: robber.rpg.money + stolen });

        await sock.sendMessage(msgData.remoteJid, {
            text: `💰 Berhasil merampok @${targetJid.split('@')[0]} sebesar *${stolen}* 💹!`,
            mentions: [targetJid]
        });
    }
};

import User from '../../databases/orm/User.js';
import { randomInt } from '../../libs/rpg-helper.js';

export default {
    command: ['bet', 'judi'],
    category: 'rpg',
    description: 'Taruhan money lawan bot. Contoh: .bet 1000 atau .bet all',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        const arg = (msgData.args[0] || '').toLowerCase();
        let count = arg === 'all' ? rpg.money : parseInt(arg, 10);

        if (!count || isNaN(count) || count <= 0) {
            return msgData.reply('❌ Format: .bet [jumlah]\nContoh: .bet 1000 atau .bet all');
        }
        if (rpg.money < count) {
            return msgData.reply('❌ Money kamu tidak cukup!');
        }

        const botRoll = randomInt(91) + 1;   // 1-91
        const playerRoll = randomInt(71) + 1; // 1-71

        let status, moneyChange, resultText;
        if (playerRoll > botRoll) {
            status = 'Menang';
            moneyChange = count;
            resultText = `Mendapatkan *+${count}* 💹`;
        } else if (playerRoll < botRoll) {
            status = 'Kalah';
            moneyChange = -count;
            resultText = `Kehilangan *-${count}* 💹`;
        } else {
            status = 'Seri';
            moneyChange = Math.floor(count / 1.5);
            resultText = `Mendapatkan *+${moneyChange}* 💹`;
        }

        User.updateRpg(msgData.senderJid, { money: rpg.money + moneyChange });

        await msgData.reply(
            `🎰 *CASINO*\n\n` +
            `🤖 BOT: ${botRoll}\n👤 KAMU: ${playerRoll}\n\n` +
            `Kamu *${status}*, ${resultText}`
        );
    }
};

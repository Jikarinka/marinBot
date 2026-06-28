import User from '../../databases/orm/User.js';
import { checkCooldown, randomFrom } from '../../libs/rpg-helper.js';

const PET_EMOJI = { cat: '🐈', dog: '🐕', fox: '🦊', horse: '🐴' };
const FEED_COOLDOWN = 600000; // 10 menit
const MAX_PET_LEVEL = 10;
const THANK_YOU = ['Nyummm~', 'Thanks!', 'Terima kasih ^-^', '...', 'Makasih~', 'Arigatou ^-^'];

export default {
    command: ['feed'],
    category: 'rpg',
    description: 'Kasih makan pet biar level up. Contoh: .feed cat',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const type = (msgData.args[0] || '').toLowerCase();
        const emoji = PET_EMOJI[type];

        if (!emoji) {
            return msgData.reply(
                `Format: .feed [pet]\nContoh: .feed cat\n\n` +
                `📍 Pet:\n${Object.entries(PET_EMOJI).map(([k, e]) => `${e} ${k}`).join('\n')}`
            );
        }

        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        const levelField = type;             // rpg.cat, rpg.dog, dst
        const expField = `${type}exp`;        // rpg.catexp, dst
        const lastFeedField = `${type}lastfeed`;

        if (rpg[levelField] === 0) {
            return msgData.reply(`❌ Kamu belum punya pet ${type}!\nBeli dulu pakai \`.petshop ${type}\``);
        }

        if (rpg[levelField] >= MAX_PET_LEVEL) {
            return msgData.reply(`✅ Pet ${type} kamu sudah level maksimal (${MAX_PET_LEVEL})!`);
        }

        const sisaWaktu = checkCooldown(rpg[lastFeedField], FEED_COOLDOWN);
        if (sisaWaktu) {
            return msgData.reply(`⏰ Pet ${type} kamu masih kenyang! Coba lagi dalam *${sisaWaktu}*`);
        }

        if ((rpg.petFood || 0) <= 0) {
            return msgData.reply(`❌ Pet food kamu habis! Beli dulu pakai \`.petshop petfood\``);
        }

        const patch = {
            petFood: rpg.petFood - 1,
            [expField]: (rpg[expField] || 0) + 20,
            [lastFeedField]: Date.now(),
        };

        let levelUpText = '';
        const expNeeded = rpg[levelField] * 100;
        if (patch[expField] >= expNeeded && expNeeded > 0) {
            patch[levelField] = rpg[levelField] + 1;
            patch[expField] -= expNeeded;
            levelUpText = `\n\n🎉 *Level up!* Pet ${type} kamu sekarang level *${patch[levelField]}*!`;
        }

        User.updateRpg(msgData.senderJid, patch);

        await msgData.reply(`Feeding *${type}*...\n${emoji} ${type}: ${randomFrom(THANK_YOU)}${levelUpText}`);
    }
};

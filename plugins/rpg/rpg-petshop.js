import User from '../../databases/orm/User.js';
import { emoticon } from '../../libs/rpg-helper.js';

const PET_PRICE = { cat: 2, dog: 2, horse: 4, fox: 6 }; // dalam pet token
const PETFOOD_PRICE = 950; // dalam money

export default {
    command: ['petshop', 'petstore'],
    category: 'rpg',
    description: 'Beli pet (pakai pet token 🔖) atau pet food. Contoh: .petshop cat',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const type = (msgData.args[0] || '').toLowerCase();

        if (!type) {
            const list = Object.entries(PET_PRICE).map(([k, v]) => `${emoticon(k)} ${k}: ${v} 🔖 pet token`).join('\n');
            return msgData.reply(
                `*「 PET STORE 」*\n\n${list}\n🍖 petfood: ${PETFOOD_PRICE} 💹 money\n\n` +
                `Contoh: \`.petshop cat\` atau \`.petshop petfood\`\n\n` +
                `_Pet token didapat dari membuka crate (.open mythic/legendary)_`
            );
        }

        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        if (type === 'petfood') {
            if (rpg.money < PETFOOD_PRICE) {
                return msgData.reply(`❌ Money kamu kurang *${PETFOOD_PRICE - rpg.money}* lagi untuk beli petfood.`);
            }
            User.updateRpg(msgData.senderJid, { money: rpg.money - PETFOOD_PRICE, petFood: (rpg.petFood || 0) + 1 });
            return msgData.reply(`✅ Berhasil beli 1 🍖 petfood!`);
        }

        const price = PET_PRICE[type];
        if (!price) {
            return msgData.reply(`❌ Pet "${type}" tidak ada. Pilihan: ${Object.keys(PET_PRICE).join(', ')}, petfood`);
        }

        if (rpg[type] > 0) {
            return msgData.reply(`✅ Kamu sudah punya ${type}!`);
        }

        if ((rpg.pet || 0) < price) {
            return msgData.reply(`❌ Pet token kamu kurang *${price - (rpg.pet || 0)}* lagi untuk beli ${type}.`);
        }

        User.updateRpg(msgData.senderJid, {
            pet: rpg.pet - price,
            [type]: 1
        });

        await msgData.reply(`✅ Selamat! Kamu sekarang punya ${emoticon(type)} *${type}*!\nJangan lupa kasih makan pakai \`.feed ${type}\``);
    }
};

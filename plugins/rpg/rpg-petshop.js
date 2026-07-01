import User from '../../databases/orm/User.js';
import { emoticon } from '../../libs/rpg-helper.js';
import { sendSmartList } from '../../libs/message-builder.js';

const PET_PRICE = { cat: 2, dog: 2, horse: 4, fox: 6 };
const PETFOOD_PRICE = 950;

export default {
    command: ['petshop', 'petstore'],
    category: 'rpg',
    description: 'Beli pet atau petfood. Contoh: .petshop cat',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const type = (msgData.args[0] || '').toLowerCase();

        if (!type) {
            const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
            const { rpg } = user;

            const sections = [
                {
                    title: '🐾 Beli Pet — Pakai Pet Token 🔖',
                    rows: Object.entries(PET_PRICE).map(([k, v]) => ({
                        title: `${emoticon(k)} ${k.charAt(0).toUpperCase() + k.slice(1)} — ${v} 🔖`,
                        description: rpg[k] > 0 ? '✅ Sudah punya' : `Token kamu: ${rpg.pet || 0} 🔖 | Ketik .petshop ${k}`,
                        rowId: `.petshop ${k}`
                    }))
                },
                {
                    title: '🍖 Makanan Pet',
                    rows: [{
                        title: `🍖 Petfood — ${PETFOOD_PRICE} 💹`,
                        description: `Money kamu: ${rpg.money} 💹 | Petfood kamu: ${rpg.petFood || 0}x`,
                        rowId: '.petshop petfood'
                    }]
                }
            ];

            return sendSmartList(sock, msgData, m, {
                text: `🐾 *Pet Store*\n\n🔖 Pet Token kamu: *${rpg.pet || 0}*\n💹 Money kamu: *${rpg.money}*\n\n_Pet token didapat dari membuka crate (.open mythic/legendary)_`,
                title: '🐾 Pet Store',
                buttonText: '🛒 Lihat Toko',
                sections
            });
        }

        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        if (type === 'petfood') {
            if (rpg.money < PETFOOD_PRICE) {
                return msgData.reply(`❌ Money kamu kurang *${PETFOOD_PRICE - rpg.money}* lagi untuk beli petfood.`);
            }
            User.updateRpg(msgData.senderJid, { money: rpg.money - PETFOOD_PRICE, petFood: (rpg.petFood || 0) + 1 });
            return msgData.reply(`✅ Berhasil beli 1 🍖 petfood!\n\nPetfood kamu sekarang: *${(rpg.petFood || 0) + 1}*`);
        }

        const price = PET_PRICE[type];
        if (!price) return msgData.reply(`❌ Pet *"${type}"* tidak ada.\nPilihan: ${Object.keys(PET_PRICE).join(', ')}, petfood`);
        if (rpg[type] > 0) return msgData.reply(`✅ Kamu sudah punya *${type}* ${emoticon(type)}!`);
        if ((rpg.pet || 0) < price) return msgData.reply(`❌ Pet token kamu kurang *${price - (rpg.pet || 0)}* lagi untuk beli ${type}.`);

        User.updateRpg(msgData.senderJid, { pet: rpg.pet - price, [type]: 1 });
        await msgData.reply(`✅ Selamat! Kamu sekarang punya ${emoticon(type)} *${type}*!\nJangan lupa kasih makan pakai \`.feed ${type}\``);
    }
};

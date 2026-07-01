import User from '../../databases/orm/User.js';
import { SHOP_BUY, SHOP_SELL, emoticon } from '../../libs/rpg-helper.js';
import { sendSmartList } from '../../libs/message-builder.js';

export default {
    command: ['buy', 'sell', 'shop'],
    category: 'rpg',
    description: 'Beli/jual item di shop. Contoh: .buy potion 10',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const { commandName, args } = msgData;
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        const mode = commandName === 'sell' ? 'sell' : 'buy';
        const items = mode === 'sell' ? SHOP_SELL : SHOP_BUY;

        // .shop → tampilkan daftar harga buy & sell sebagai List Message
        if (commandName === 'shop') {
            const sections = [
                {
                    title: '📥 BUY — .buy [item] [jumlah]',
                    rows: Object.entries(SHOP_BUY).map(([k, v]) => ({
                        title: `${emoticon(k)} ${k.charAt(0).toUpperCase() + k.slice(1)}`,
                        description: `Harga beli: ${v.money} 💹 — ketik .buy ${k} 1`,
                        rowId: `.buy ${k} 1`
                    }))
                },
                {
                    title: '📤 SELL — .sell [item] [jumlah]',
                    rows: Object.entries(SHOP_SELL).map(([k, v]) => ({
                        title: `${emoticon(k)} ${k.charAt(0).toUpperCase() + k.slice(1)}`,
                        description: `Harga jual: ${v.money} 💹 — ketik .sell ${k} 1`,
                        rowId: `.sell ${k} 1`
                    }))
                }
            ];

            return sendSmartList(sock, msgData, m, {
                text: `🏪 *Selamat datang di Shop!*\n\nMoney kamu saat ini: *${rpg.money}* 💹\n\nPilih item di bawah untuk beli/jual cepat (jumlah default 1, edit manual kalau mau lebih banyak).`,
                title: '🏪 Marin Shop',
                buttonText: '🛒 Buka Daftar Item',
                sections
            });
        }

        const item = (args[0] || '').toLowerCase();
        const total = Math.max(1, parseInt(args[1], 10) || 1);

        if (!items[item]) {
            const list = Object.keys(items).map(k => `${emoticon(k)} ${k}: ${items[k].money} 💹`).join('\n');
            return msgData.reply(
                `Format: .${mode} [item] [jumlah]\nContoh: .${mode} potion 10\n\n📍 Item tersedia:\n${list}`
            );
        }

        const price = items[item].money;

        if (mode === 'buy') {
            const cost = price * total;
            if (rpg.money < cost) {
                return msgData.reply(`❌ Money kamu kurang *${cost - rpg.money}* lagi untuk beli *${total}* ${emoticon(item)} ${item}.`);
            }
            User.updateRpg(msgData.senderJid, {
                money: rpg.money - cost,
                [item]: (rpg[item] || 0) + total
            });
            await msgData.reply(`✅ Berhasil beli *${total}* ${emoticon(item)} ${item} seharga *${cost}* 💹`);

        } else {
            if ((rpg[item] || 0) < total) {
                return msgData.reply(`❌ ${emoticon(item)} ${item} kamu cuma ada *${rpg[item] || 0}*, tidak cukup untuk jual *${total}*.`);
            }
            const income = price * total;
            User.updateRpg(msgData.senderJid, {
                [item]: rpg[item] - total,
                money: rpg.money + income
            });
            await msgData.reply(`✅ Berhasil jual *${total}* ${emoticon(item)} ${item} seharga *${income}* 💹`);
        }
    }
};

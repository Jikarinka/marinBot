import User from '../../databases/orm/User.js';
import { emoticon, EQUIPMENT_NAMES, checkCooldown, COOLDOWNS } from '../../libs/rpg-helper.js';

const OTHERS = ['health', 'money', 'exp', 'level'];
const ITEMS = ['potion', 'trash', 'wood', 'rock', 'string', 'emerald', 'diamond', 'gold', 'iron'];
const TOOLS = ['sword', 'pickaxe', 'armor'];
const CRATES = ['common', 'uncommon', 'mythic', 'legendary'];

export default {
    command: ['inventory', 'inv'],
    category: 'rpg',
    description: 'Lihat inventory kamu (item, equipment, crate, cooldown).',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const [user] = User.findOrCreate({ where: { jid: msgData.senderJid } });
        const { rpg } = user;

        const others = OTHERS.map(k => `➔ ${emoticon(k)} ${k}: ${rpg[k]}`).join('\n');

        const tools = TOOLS
            .filter(k => rpg[k] > 0)
            .map(k => `${emoticon(k)} ${k}: ${EQUIPMENT_NAMES[k]?.[rpg[k]] || `Level ${rpg[k]}`}`)
            .join('\n');

        const items = ITEMS
            .filter(k => rpg[k] > 0)
            .map(k => `${emoticon(k)} ${k}: ${rpg[k]}`)
            .join('\n');

        const crates = CRATES
            .filter(k => rpg[k] > 0)
            .map(k => `${emoticon(k)} ${k}: ${rpg[k]}`)
            .join('\n');

        const cooldowns = [
            ['daily', rpg.lastclaim, COOLDOWNS.daily],
            ['weekly', rpg.lastweekly, COOLDOWNS.weekly],
            ['monthly', rpg.lastmonthly, COOLDOWNS.monthly],
            ['mining', rpg.lastmining, COOLDOWNS.mining],
        ].map(([name, last, cd]) => `• ${name}: ${checkCooldown(last, cd) ? '❌' : '✅'}`).join('\n');

        let caption = others;
        if (tools) caption += `\n\n*───── TOOLS ─────*\n${tools}`;
        if (items) caption += `\n\n*───── ITEMS ─────*\n${items}`;
        if (crates) caption += `\n\n*───── CRATES ─────*\n${crates}`;
        caption += `\n\n*───── COOLDOWN ─────*\n${cooldowns}`;

        await msgData.reply(caption.trim());
    }
};

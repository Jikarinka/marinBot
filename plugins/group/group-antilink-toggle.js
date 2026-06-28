import { Group } from '../../databases/connector.js';

export default {
    command: ['antilink'],
    category: 'group',
    description: 'Aktifkan/matikan anti-link di grup. Contoh: .antilink on',
    isGroup: true,
    isAdmin: true,

    async execute(sock, m, msgData) {
        const arg = (msgData.args[0] || '').toLowerCase();
        if (!['on','off','ya','tidak'].includes(arg)) {
            return msgData.reply('Format: .antilink [on|off]\nContoh: .antilink on');
        }

        const active = ['on','ya'].includes(arg);
        const [grp] = Group.findOrCreate({ where: { jid: msgData.remoteJid } });
        await grp.update({ anti_link: active });

        await msgData.reply(`✅ Anti-link *${active ? 'diaktifkan' : 'dimatikan'}* di grup ini.`);
    }
};

import { approve } from '../../mcp/pending-confirmations.js';

export default {
    command: ['approve'],
    category: 'owner',
    isOwner: true,
    description: 'Setujui permintaan instalasi package yang sedang menunggu (dari shell_exec npm install). Khusus Owner.',

    async execute(sock, m, msgData) {
        const id = msgData.args[0];
        if (!id) return msgData.reply('Mana ID-nya kak? Contoh: `.approve a1b2c3`');

        const result = approve(id, msgData.senderJid);
        if (!result.ok) return msgData.reply(result.message);

        await msgData.reply(`✅ Disetujui! Marin lanjut install:\n\`\`\`${result.command}\`\`\``);
    }
};

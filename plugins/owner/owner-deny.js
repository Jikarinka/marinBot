import { deny } from '../../mcp/pending-confirmations.js';

export default {
    command: ['deny'],
    category: 'owner',
    isOwner: true,
    description: 'Tolak permintaan instalasi package yang sedang menunggu. Khusus Owner.',

    async execute(sock, m, msgData) {
        const id = msgData.args[0];
        if (!id) return msgData.reply('Mana ID-nya kak? Contoh: `.deny a1b2c3`');

        const result = deny(id, msgData.senderJid);
        if (!result.ok) return msgData.reply(result.message);

        await msgData.reply(`🚫 Ditolak. Marin tidak jadi install:\n\`\`\`${result.command}\`\`\``);
    }
};

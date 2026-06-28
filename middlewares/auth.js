import { User, Group, Setting } from '../databases/connector.js';
import config from '../config.js';
import { resolveLidToJid } from '../libs/lid-resolver.js';
import { getGroupMetadata, setGroupMetadata } from '../libs/groupCache.js';

let cachedSetting = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 30000;

export const processAuth = async (sock, msgData) => {
    // Jangan simpan grup atau status broadcast ke tabel User
    if (msgData.senderJid.endsWith('@g.us') || msgData.senderJid === 'status@broadcast') {
        return {
            user: { isOwner: false, isCoordinator: false, is_registered: false, is_premium: false, is_banned: false, limit: 0 },
            group: null,
            setting: { is_public: true, is_register: true, is_gconly: false }
        };
    }

    const [user] = await User.findOrCreate({
        where: { jid: msgData.senderJid },
        defaults: {
            name: msgData.pushName,
            is_registered: false
        }
    });

    if (user.name !== msgData.pushName && msgData.pushName) {
        await user.update({ name: msgData.pushName });
    }

    const ownerJid = config.OWNER_NUMBER?.includes('@')
        ? config.OWNER_NUMBER
        : `${config.OWNER_NUMBER}@s.whatsapp.net`;
    const botJid = sock.user?.id?.split(':')[0].split('@')[0] + '@s.whatsapp.net';

    const senderNum = msgData.senderJid.split(':')[0].split('@')[0];

    let isOwner = (senderNum === ownerJid.split(':')[0].split('@')[0]) ||
                    (senderNum === botJid.split(':')[0].split('@')[0]) ||
                    msgData.fromMe;

    // Koordinator — cek dari config.COORDINATOR_NUMBERS
    let isCoordinator = !isOwner && (config.COORDINATOR_NUMBERS || []).some(jid =>
        jid.split(':')[0].split('@')[0] === senderNum
    );

    // ── SUB-BOT GUARD ────────────────────────────────────────────────
    // Sesi sub-bot TIDAK PERNAH dapat hak owner/koordinator, apapun nomornya —
    // termasuk saat pemilik nomor itu sendiri yang chat (fromMe=true di sub-bot).
    if (msgData._isSubBot) {
        isOwner = false;
        isCoordinator = false;
    }

    user.isOwner = isOwner;
    user.isCoordinator = isCoordinator;

    let group = null;
    if (msgData.isGroup) {
        let metadata = getGroupMetadata(msgData.remoteJid);
        let dbGroup = Group.findOne({ where: { jid: msgData.remoteJid } });

        if (!metadata) {
            try {
                const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), ms));
                metadata = await Promise.race([
                    sock.groupMetadata(msgData.remoteJid),
                    timeout(2000)
                ]);
                setGroupMetadata(msgData.remoteJid, metadata);
            } catch (err) {
                metadata = {
                    id: msgData.remoteJid,
                    subject: dbGroup?.name || 'Unknown Group',
                    participants: []
                };
            }
        }

        const [groupData, created] = await Group.findOrCreate({
            where: { jid: msgData.remoteJid },
            defaults: { name: metadata.subject }
        });

        group = groupData;

        if (!created && group.name !== metadata.subject && metadata.subject !== 'Unknown Group') {
            await group.update({ name: metadata.subject });
        }

        const jidToNum = (jid) => jid?.split('@')[0].split(':')[0];
        const normalizedSender = jidToNum(msgData.senderJid);
        const normalizedBot = jidToNum(botJid);

        const botId = sock.user?.id;
        const botLid = sock.user?.lid;

        const participant = metadata.participants.find(p =>
            p.id === msgData.senderJid ||
            jidToNum(resolveLidToJid(p.id)) === normalizedSender
        );
        msgData.isAdmin = participant?.admin !== null && participant?.admin !== undefined;

        const botParticipant = metadata.participants.find(p =>
            p.id === botId ||
            p.id === botLid ||
            jidToNum(resolveLidToJid(p.id)) === normalizedBot
        );
        msgData.isBotAdmin = botParticipant?.admin !== null && botParticipant?.admin !== undefined;
    }

    const now = Date.now();
    if (!cachedSetting || (now - lastCacheUpdate) > CACHE_TTL) {
        const [setting] = await Setting.findOrCreate({
            where: { id: 1 },
            defaults: { is_public: true, is_register: true, is_gconly: false }
        });
        cachedSetting = setting;
        lastCacheUpdate = now;
    }

    return { user, group, setting: cachedSetting };
};

import User from '../../databases/orm/User.js';
import {
    startGame, endGame, getSession, hasActiveGame, setOnTimeout,
    checkAnswer, formatSisa, EXP_REWARD
} from '../../libs/game-session.js';
import {
    TEKATEKI, ASAHOTAK, TEBAKEMOJI, SUSUNKATA,
    TEBAKLIRIK, FAMILY100, TRIVIA, TEBAKBENDERA,
    TEBAKKATA, TEBAKKALIMAT, generateMath
} from '../../libs/game-data.js';

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Daftar semua game yang tersedia
const GAMES = {
    tekateki:    { data: TEKATEKI,    label: '🧩 Teka-teki',     type: 'exact', qField: 'soal',    aField: 'jawaban' },
    asahotak:    { data: ASAHOTAK,    label: '🧠 Asah Otak',     type: 'exact', qField: 'soal',    aField: 'jawaban' },
    tebakemoji:  { data: TEBAKEMOJI,  label: '😀 Tebak Emoji',   type: 'exact', qField: 'emoji',   aField: 'jawaban' },
    susunkata:   { data: SUSUNKATA,   label: '🔤 Susun Kata',    type: 'exact', qField: 'soal',    aField: 'jawaban' },
    tebaklirik:  { data: TEBAKLIRIK,  label: '🎵 Tebak Lirik',   type: 'exact', qField: 'soal',    aField: 'jawaban' },
    trivia:      { data: TRIVIA,      label: '❓ Trivia',         type: 'exact', qField: 'soal',    aField: 'jawaban' },
    tebakbendera:{ data: TEBAKBENDERA,label: '🏳️ Tebak Bendera', type: 'exact', qField: 'soal',    aField: 'jawaban' },
    tebakkata:   { data: TEBAKKATA,   label: '💬 Tebak Kata',    type: 'exact', qField: 'soal',    aField: 'jawaban' },
    tebakkalimat:{ data: TEBAKKALIMAT,label: '📝 Tebak Kalimat', type: 'exact', qField: 'soal',    aField: 'jawaban' },
    family100:   { data: FAMILY100,   label: '👨‍👩‍👧‍👦 Family 100', type: 'family100', qField: 'soal', aField: 'jawaban' },
    math:        { data: null,        label: '🔢 Matematika',     type: 'math',  qField: null,      aField: null },
}

// ── Handler utama untuk memulai game ──────────────────────────────
export default {
    command: Object.keys(GAMES),
    category: 'game',
    description: 'Game tebak-tebakan. Ketik nama game untuk mulai, contoh: .tekateki',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const { commandName, args, remoteJid } = msgData;
        const gameKey = commandName;
        const cfg = GAMES[gameKey];

        if (hasActiveGame(remoteJid)) {
            const s = getSession(remoteJid);
            return msgData.reply(`⚠️ Masih ada game *${s.type}* yang aktif!\nKetik *nyerah* untuk menyerah, atau tunggu *${formatSisa(remoteJid)} detik* lagi.`);
        }

        let item, question, answer, hint = null, extraData = null;

        if (gameKey === 'math') {
            const mode = (args[0] || 'easy').toLowerCase();
            if (!['easy', 'medium', 'hard'].includes(mode)) {
                return msgData.reply('Format: .math [easy|medium|hard]\nContoh: .math medium');
            }
            const mathData = generateMath(mode);
            question = `Berapa hasil dari *${mathData.str}*?`;
            answer = mathData.result;
            extraData = { bonus: mathData.bonus };
        } else {
            item = pickRandom(cfg.data);
            question = item[cfg.qField];
            answer = item[cfg.aField];
            hint = item.hint || null;
        }

        const started = startGame(remoteJid, {
            type: gameKey, question, answer, hint, extraData
        });

        if (!started) {
            return msgData.reply('⚠️ Gagal memulai game, coba lagi.');
        }

        const bonus = extraData?.bonus || EXP_REWARD;
        const text = gameKey === 'family100'
            ? `*${cfg.label}*\n\n*Soal:* ${question}\n\nTerdapat *${answer.length}* jawaban\n+${bonus} XP tiap jawaban benar\n\n_Ketik *nyerah* untuk menyerah_`
            : `*${cfg.label}*\n\n${question}\n\nBonus: +${bonus} ✨ XP\nWaktu: 2 menit\n\n_Ketik *nyerah* untuk menyerah_`;

        const sentMsg = await sock.sendMessage(remoteJid, { text }, { quoted: m });

        setOnTimeout(remoteJid, async (correctAnswer) => {
            const ans = Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer;
            await sock.sendMessage(remoteJid, {
                text: `⏱️ Waktu habis! Jawabannya adalah *${ans}*`,
            }, { quoted: sentMsg });
        });
    },

    // ── passiveListener: cek jawaban user tanpa command prefix ──────
    async passiveListener(sock, m, msgData, user) {
        const { remoteJid, text, senderJid } = msgData;
        if (!text || !hasActiveGame(remoteJid)) return false;

        const session = getSession(remoteJid);
        const normalized = text.trim().toLowerCase();

        // Cek menyerah
        if (/^(nyerah|menyerah|give\s?up|angkat\s?tangan)$/i.test(normalized)) {
            endGame(remoteJid);
            const ans = Array.isArray(session.answer) ? session.answer.join(', ') : session.answer;
            await sock.sendMessage(remoteJid, {
                text: `😔 Yah menyerah...\nJawabannya adalah *${ans}*`
            });
            return true;
        }

        // Cek hint
        if (/^(hint|bantuan|clue)$/i.test(normalized) && session.hint) {
            await sock.sendMessage(remoteJid, {
                text: `💡 Petunjuk: ${session.hint}`
            });
            return true;
        }

        // ── Family 100: kumpulkan semua jawaban ──────────────────────
        if (session.type === 'family100') {
            if (!session.answered) session.answered = [];
            const correctArr = Array.isArray(session.answer)
                ? session.answer.map(a => a.toLowerCase())
                : [];
            const alreadyAnswered = session.answered.includes(normalized);
            const isCorrect = correctArr.includes(normalized);

            if (!isCorrect) return true; // bukan jawaban yang benar, abaikan tapi jangan lewat ke AI
            if (alreadyAnswered) {
                await sock.sendMessage(remoteJid, { text: `✅ *${text}* sudah pernah dijawab!` });
                return true;
            }

            session.answered.push(normalized);
            const [u] = User.findOrCreate({ where: { jid: senderJid } });
            User.updateRpg(senderJid, { exp: (u.rpg.exp || 0) + EXP_REWARD });

            const remaining = correctArr.filter(a => !session.answered.includes(a));
            if (remaining.length === 0) {
                endGame(remoteJid);
                await sock.sendMessage(remoteJid, {
                    text: `🎉 *Semua jawaban benar!*\nJawaban: ${session.answer.join(', ')}`
                });
            } else {
                await sock.sendMessage(remoteJid, {
                    text: `✅ *Benar!* +${EXP_REWARD} XP\nSisa jawaban: *${remaining.length}*`
                });
            }
            return true;
        }

        // ── Game biasa: satu jawaban ──────────────────────────────────
        const { correct } = checkAnswer(session, text);
        if (correct) {
            endGame(remoteJid);
            const [u] = User.findOrCreate({ where: { jid: senderJid } });
            const bonus = session.extraData?.bonus || EXP_REWARD;
            User.updateRpg(senderJid, { exp: (u.rpg.exp || 0) + bonus });
            await sock.sendMessage(remoteJid, {
                text: `✅ *Benar!* Jawabannya *${session.answer}*\n+${bonus} ✨ XP untuk @${senderJid.split('@')[0]}`,
                mentions: [senderJid]
            });
            return true;
        }

        // Jawaban salah — tidak usah kirim pesan, biarkan user coba lagi (tapi blok AI)
        return true; // return true supaya AI tidak ikut merespon teks ini
    }
};

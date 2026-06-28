import dotenv from 'dotenv';
dotenv.config();

// Helper: parse daftar nomor dari env (dipisah koma)
const parseNumbers = (str) =>
    (str || '').split(',').map(n => n.trim()).filter(Boolean)
        .map(n => n.includes('@') ? n : `${n.replace(/[^0-9]/g, '')}@s.whatsapp.net`);

const config = {
  // Bot Config
  BOT_NUMBER:    process.env.BOT_NUMBER,
  OWNER_NUMBER:  process.env.OWNER_NUMBER,
  PORT:          process.env.PORT,

  // Koordinator — bisa akses semua fitur kecuali hapus/buat file
  // Isi di .env: COORDINATOR_NUMBERS=628xxx,628yyy
  COORDINATOR_NUMBERS: parseNumbers(process.env.COORDINATOR_NUMBERS),

  // Bot Watermark
  BOT_NAME: process.env.BOT_NAME,

  // Social Media
  SOC_FACEBOOK:  process.env.SOC_FACEBOOK,
  SOC_INSTAGRAM: process.env.SOC_INSTAGRAM,
  SOC_GITHUB:    process.env.SOC_GITHUB,
  SOC_WA_GROUP:  process.env.SOC_WA_GROUP,
  SOC_WEBSITE:   process.env.SOC_WEBSITE,

  // Payment Config
  PAY_QRIS: process.env.PAY_QRIS,

  // API Service
  API_MARIN: process.env.API_MARIN,
  BINDERBYTE_API_KEY: process.env.BINDERBYTE_API_KEY,

  // Gemini AI
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,

  // Image Link
  MARIN_DEFAULT_PP:      process.env.MARIN_DEFAULT_PP,
  MARIN_BANNER:          process.env.MARIN_BANNER,
  MARIN_WELCOME_BANNER:  process.env.MARIN_WELCOME_BANNER,
  MARIN_LEAVE_BANNER:    process.env.MARIN_LEAVE_BANNER,

  // Marin Message
  MARIN_MSG_REGISTER:   process.env.MARIN_MSG_REGISTER,
  MARIN_MSG_DISABLE:    process.env.MARIN_MSG_DISABLE,
  MARIN_MSG_GROUP:      process.env.MARIN_MSG_GROUP,
  MARIN_MSG_PRIVATE:    process.env.MARIN_MSG_PRIVATE,
  MARIN_MSG_LIMIT:      process.env.MARIN_MSG_LIMIT,
  MARIN_MSG_COOLDOWN:   process.env.MARIN_MSG_COOLDOWN,
  MARIN_MSG_OWNER:      process.env.MARIN_MSG_OWNER,
  MARIN_MSG_MODERATOR:  process.env.MARIN_MSG_MODERATOR,
  MARIN_MSG_BOTADMIN:   process.env.MARIN_MSG_BOTADMIN,
  MARIN_MSG_ADMIN:      process.env.MARIN_MSG_ADMIN,
  MARIN_MSG_QUOTED:     process.env.MARIN_MSG_QUOTED,
  MARIN_MSG_PREMIUM:    process.env.MARIN_MSG_PREMIUM,
  MARIN_MSG_COORDINATOR: process.env.MARIN_MSG_COORDINATOR,
};

export default config;

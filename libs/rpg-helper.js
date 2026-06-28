/**
 * Marin RPG Helper
 * Fungsi & konstanta bersama untuk seluruh sistem RPG (mining, bank, pet, dll).
 * Migrasi dari KannaBot-V10, ditulis ulang tanpa modifikasi prototype global.
 */

// ── Leveling (formula sama persis dengan KannaBot, growth rate identik) ──────
const GROWTH = Math.pow(Math.PI / Math.E, 1.618) * Math.E * 0.75

export function xpRange(level, multiplier = 1) {
    if (level < 0) throw new TypeError('level tidak boleh negatif')
    level = Math.floor(level)
    const min = level === 0 ? 0 : Math.round(Math.pow(level, GROWTH) * multiplier) + 1
    const max = Math.round(Math.pow(level + 1, GROWTH) * multiplier)
    return { min, max, xp: max - min }
}

export function findLevel(xp, multiplier = 1) {
    if (xp === Infinity) return Infinity
    if (isNaN(xp)) return NaN
    if (xp <= 0) return 0
    let level = 0
    do { level++ } while (xpRange(level, multiplier).min <= xp)
    return level - 1
}

// ── Random helpers — pengganti Array.prototype.getRandom() yang aman ─────────
// (tidak memodifikasi prototype bawaan JS, dipanggil sebagai fungsi biasa)
export function randomInt(max) {
    return Math.floor(Math.random() * max)
}

export function randomFrom(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return undefined
    return arr[Math.floor(Math.random() * arr.length)]
}

// ── Emoticon item — dipetakan dari config.js KannaBot ─────────────────────────
const EMOTICON_MAP = {
    level: '📊', limit: '🎫', health: '❤️', exp: '✨',
    money: '💹', bank: '🏦', potion: '🥤',
    diamond: '💎', common: '📦', uncommon: '🛍️', mythic: '🎁',
    legendary: '🗃️', pet: '🔖', trash: '🗑️',
    armor: '🥼', sword: '⚔️', pickaxe: '⛏️', fishingrod: '🎣',
    wood: '🪵', rock: '🪨', string: '🕸️',
    horse: '🐴', cat: '🐱', dog: '🐶', fox: '🦊', petFood: '🍖',
    iron: '⛓️', gold: '🪙', emerald: '❇️',
}

export function emoticon(key) {
    return EMOTICON_MAP[key] || ''
}

// ── Nama tier equipment ────────────────────────────────────────────────────
export const EQUIPMENT_NAMES = {
    sword: ['❌', 'Wooden Sword', 'Stone Sword', 'Iron Sword', 'Gold Sword', 'Copper Sword', 'Diamond Sword', 'Emerald Sword', 'Obsidian Sword', 'Netherite Sword', 'Samurai Slayer Sword'],
    pickaxe: ['❌', 'Wooden Pickaxe', 'Stone Pickaxe', 'Iron Pickaxe', 'Gold Pickaxe', 'Copper Pickaxe', 'Diamond Pickaxe', 'Emerald Pickaxe', 'Crystal Pickaxe', 'Obsidian Pickaxe', 'Netherite Pickaxe'],
    armor: ['❌', 'Leather Armor', 'Iron Armor', 'Gold Armor', 'Diamond Armor', 'Emerald Armor', 'Crystal Armor', 'Obsidian Armor', 'Netherite Armor', 'Wither Armor', 'Dragon Armor'],
}

// ── Format durasi ms → teks Indonesia ─────────────────────────────────────────
export function formatDuration(ms) {
    if (ms <= 0) return '0 detik'
    const sec = Math.floor(ms / 1000)
    const d = Math.floor(sec / 86400)
    const h = Math.floor((sec % 86400) / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    const parts = []
    if (d) parts.push(`${d} hari`)
    if (h) parts.push(`${h} jam`)
    if (m) parts.push(`${m} menit`)
    if (!d && !h && s) parts.push(`${s} detik`)
    return parts.join(' ') || '0 detik'
}

/**
 * Cek cooldown. Return null kalau sudah boleh dipakai lagi,
 * atau string sisa waktu kalau masih dalam cooldown.
 */
export function checkCooldown(lastTimestamp, cooldownMs) {
    const elapsed = Date.now() - (lastTimestamp || 0)
    if (elapsed >= cooldownMs) return null
    return formatDuration(cooldownMs - elapsed)
}

// ── Harga shop (buy/sell) — dipetakan dari rpg-shop.js KannaBot ──────────────
export const SHOP_BUY = {
    potion: { money: 1250 },
    trash: { money: 4 },
    wood: { money: 700 },
    rock: { money: 850 },
    string: { money: 400 },
    iron: { money: 3000 },
    legendary: { money: 15000 },
}

export const SHOP_SELL = {
    potion: { money: 125 },
    trash: { money: 2 },
    wood: { money: 600 },
    rock: { money: 750 },
    string: { money: 300 },
    iron: { money: 2500 },
    gold: { money: 4700 },
    diamond: { money: 9000 },
    legendary: { money: 10000 },
    emerald: { money: 15000 },
}

// ── Reward tetap untuk daily/weekly/monthly ───────────────────────────────────
export const DAILY_REWARD   = { exp: 9999, money: 4999, potion: 5 }
export const WEEKLY_REWARD  = { exp: 15000, money: 35999, potion: 9 }
export const MONTHLY_REWARD = { exp: 50000, money: 49999, potion: 10, mythic: 3, legendary: 1 }

export const COOLDOWNS = {
    daily: 86400000,      // 24 jam
    weekly: 604800000,    // 7 hari
    monthly: 2592000000,  // 30 hari
    mining: 300000,       // 5 menit
}

// ── Role berdasarkan level (dari z-role.js KannaBot) ─────────────────────────
const ROLES = [
    ['Bronze V',0],['Bronze IV',5],['Bronze III',10],['Bronze II',15],['Bronze I',20],
    ['Elite V',25],['Elite IV',30],['Elite III',35],['Elite II',40],['Elite I',45],
    ['Master V',50],['Master IV',55],['Master III',60],['Master II',65],['Master I',70],
    ['Grand Master V',75],['Grand Master IV',80],['Grand Master III',85],['Grand Master II',90],['Grand Master I',95],
    ['Epic V',100],['Epic IV',105],['Epic III',110],['Epic II',115],['Epic I',120],
    ['Legend V',125],['Legend IV',130],['Legend III',135],['Legend II',140],['Legend I',145],
    ['Mythic V',150],['Mythic IV',155],['Mythic III',160],['Mythic II',165],['Mythic I',170],
    ['Mythic Glory',175],
    ['EMERALD V',180],['EMERALD IV',185],['EMERALD III',190],['EMERALD II',195],['EMERALD I',200],
    ['THE EMERALD',205]
]

export function getRoleForLevel(level) {
    const entry = [...ROLES].reverse().find(([, minLevel]) => level >= minLevel)
    return entry ? entry[0] : 'Newbie'
}

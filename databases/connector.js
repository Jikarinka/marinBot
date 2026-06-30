import { Low } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import path from 'path';
import fs from 'fs';

const DB_DIR = './databases/data';

// Pastikan folder data/ ada
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// ── Users DB ─────────────────────────────────────────────────────────────────
const usersAdapter  = new JSONFileSync(path.join(DB_DIR, 'users.json'));
const usersDb       = new Low(usersAdapter, { users: [] });
usersDb.read();

// ── Groups DB ────────────────────────────────────────────────────────────────
const groupsAdapter = new JSONFileSync(path.join(DB_DIR, 'groups.json'));
const groupsDb      = new Low(groupsAdapter, { groups: [] });
groupsDb.read();

// ── Settings DB ──────────────────────────────────────────────────────────────
const settingsAdapter = new JSONFileSync(path.join(DB_DIR, 'settings.json'));
const settingsDb      = new Low(settingsAdapter, {
    setting: {
        id: 1,
        is_public: true,
        is_register: true,
        is_gconly: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
});
settingsDb.read();

// ── Helper: simpan perubahan ke file ─────────────────────────────────────────
function saveUsers()    { usersDb.write(); }
function saveGroups()   { groupsDb.write(); }
function saveSettings() { settingsDb.write(); }

// ── RPG default state — dipakai user.rpg, terpisah dari field akun ──────────
function makeDefaultRpg() {
    return {
        // Currency & XP
        money: 0,
        bank: 0,
        atm: 0,           // level ATM, 0 = belum punya
        fullatm: 50000,   // kapasitas bank
        exp: 0,
        level: 0,
        health: 100,

        // Resource hasil mining/adventure
        wood: 0,
        rock: 0,
        iron: 0,
        string: 0,
        trash: 0,
        gold: 0,
        diamond: 0,
        emerald: 0,

        // Crate (kotak hadiah)
        common: 0,
        uncommon: 0,
        mythic: 0,
        legendary: 0,

        // Equipment (level 0 = belum punya), masing-masing dengan durability
        sword: 0,         sworddurability: 0,
        pickaxe: 0,       pickaxedurability: 0,
        fishingrod: 0,    fishingroddurability: 0,
        armor: 0,         armordurability: 0,

        // Konsumsi
        potion: 0,
        petFood: 0,

        // Pet — level + exp + waktu makan terakhir, masing-masing jenis
        cat: 0,    catexp: 0,    catlastfeed: 0,
        dog: 0,    dogexp: 0,    doglastfeed: 0,
        fox: 0,    foxexp: 0,    foxlastfeed: 0,
        horse: 0,  horseexp: 0,  horselastfeed: 0,

        // Cooldown timestamp (0 = belum pernah klaim)
        lastclaim: 0,     // daily
        lastweekly: 0,
        lastmonthly: 0,
        lastmining: 0,
        lastadventure: 0,
        lastdungeon: 0,

        role: 'Newbie',
    };
}

// Migrasi otomatis: kalau user lama belum punya field rpg (atau ada field baru
// yang ditambahkan belakangan), lengkapi dengan default tanpa menimpa data yang sudah ada.
function ensureRpg(u) {
    if (!u.rpg) {
        u.rpg = makeDefaultRpg();
        return;
    }
    const defaults = makeDefaultRpg();
    for (const key of Object.keys(defaults)) {
        if (u.rpg[key] === undefined) u.rpg[key] = defaults[key];
    }
}

// Migrasi: pastikan user lama punya field aiSession
function ensureAiSession(u) {
    if (!Array.isArray(u.aiSession)) u.aiSession = [];
    if (u.aiSessionUpdatedAt === undefined) u.aiSessionUpdatedAt = null;
}

// ── MODEL: User ──────────────────────────────────────────────────────────────
const User = {
    _now: () => new Date().toISOString(),

    _make: (jid, defaults = {}) => ({
        jid,
        name: defaults.name ?? null,
        is_premium: defaults.is_premium ?? false,
        is_banned: defaults.is_banned ?? false,
        limit: defaults.limit ?? 10,
        is_registered: defaults.is_registered ?? false,
        rpg: defaults.rpg ?? makeDefaultRpg(),
        aiSession: defaults.aiSession ?? [],   // riwayat percakapan AI
        aiSessionUpdatedAt: null,
        createdAt: User._now(),
        updatedAt: User._now(),
    }),

    findOne({ where }) {
        const u = usersDb.data.users.find(u => u.jid === where.jid);
        if (!u) return null;
        ensureRpg(u);
        ensureAiSession(u);
        return User._wrap(u);
    },

    findOrCreate({ where, defaults = {} }) {
        let u = usersDb.data.users.find(u => u.jid === where.jid);
        let created = false;
        if (!u) {
            u = User._make(where.jid, defaults);
            usersDb.data.users.push(u);
            saveUsers();
            created = true;
        } else {
            ensureRpg(u);
            ensureAiSession(u);
        }
        return [User._wrap(u), created];
    },

    update(values, { where }) {
        let count = 0;
        usersDb.data.users = usersDb.data.users.map(u => {
            if (u.jid === where.jid) {
                Object.assign(u, values, { updatedAt: User._now() });
                count++;
            }
            return u;
        });
        saveUsers();
        return [count];
    },

    // Update field rpg tertentu saja (merge, BUKAN replace seluruh objek rpg)
    // Contoh: User.updateRpg(jid, { money: 5000, lastclaim: Date.now() })
    //
    // PENTING: kalau user belum pernah dibuat (belum pernah lewat findOrCreate),
    // method ini OTOMATIS membuat user baru dulu — sebelumnya method ini diam-diam
    // return null dan update hilang tanpa jejak kalau dipanggil sebelum findOrCreate.
    updateRpg(jid, rpgPatch) {
        let u = usersDb.data.users.find(u => u.jid === jid);
        if (!u) {
            u = User._make(jid);
            usersDb.data.users.push(u);
        }
        ensureRpg(u);
        Object.assign(u.rpg, rpgPatch);
        u.updatedAt = User._now();
        saveUsers();
        return u.rpg;
    },

    // Untuk cron: update semua user yang memenuhi kondisi where sederhana
    updateWhere(values, filterFn) {
        let count = 0;
        usersDb.data.users = usersDb.data.users.map(u => {
            if (filterFn(u)) {
                Object.assign(u, values, { updatedAt: User._now() });
                count++;
            }
            return u;
        });
        saveUsers();
        return [count];
    },

    _wrap(rawUser) {
        // Kembalikan object yang punya method .update() dan .save() seperti Sequelize
        const proxy = { ...rawUser };

        proxy.update = async (values) => {
            Object.assign(proxy, values, { updatedAt: User._now() });
            // Sinkron ke array
            const idx = usersDb.data.users.findIndex(u => u.jid === proxy.jid);
            if (idx !== -1) {
                Object.assign(usersDb.data.users[idx], values, { updatedAt: User._now() });
                saveUsers();
            }
            return proxy;
        };

        proxy.save = async () => {
            const idx = usersDb.data.users.findIndex(u => u.jid === proxy.jid);
            if (idx !== -1) {
                const { update, save, ...plain } = proxy;
                Object.assign(usersDb.data.users[idx], plain, { updatedAt: User._now() });
                saveUsers();
            }
            return proxy;
        };

        return proxy;
    },

    // Ambil semua user terdaftar (dipakai mis. untuk statusJidList saat upload status)
    async getAll() {
        for (const u of usersDb.data.users) ensureRpg(u);
        return [...usersDb.data.users];
    }
};

// ── MODEL: Group ─────────────────────────────────────────────────────────────
const Group = {
    _now: () => new Date().toISOString(),

    _make: (jid, defaults = {}) => ({
        jid,
        name: defaults.name ?? null,
        is_welcome: defaults.is_welcome ?? false,
        is_ban: defaults.is_ban ?? false,
        is_limited: defaults.is_limited ?? true,
        anti_link: defaults.anti_link ?? false,
        createdAt: Group._now(),
        updatedAt: Group._now(),
    }),

    findOne({ where }) {
        const g = groupsDb.data.groups.find(g => g.jid === where.jid);
        if (!g) return null;
        return Group._wrap(g);
    },

    findOrCreate({ where, defaults = {} }) {
        let g = groupsDb.data.groups.find(g => g.jid === where.jid);
        let created = false;
        if (!g) {
            g = Group._make(where.jid, defaults);
            groupsDb.data.groups.push(g);
            saveGroups();
            created = true;
        }
        return [Group._wrap(g), created];
    },

    update(values, { where }) {
        let count = 0;
        groupsDb.data.groups = groupsDb.data.groups.map(g => {
            if (g.jid === where.jid) {
                Object.assign(g, values, { updatedAt: Group._now() });
                count++;
            }
            return g;
        });
        saveGroups();
        return [count];
    },

    _wrap(rawGroup) {
        const proxy = { ...rawGroup };

        proxy.update = async (values) => {
            Object.assign(proxy, values, { updatedAt: Group._now() });
            const idx = groupsDb.data.groups.findIndex(g => g.jid === proxy.jid);
            if (idx !== -1) {
                Object.assign(groupsDb.data.groups[idx], values, { updatedAt: Group._now() });
                saveGroups();
            }
            return proxy;
        };

        proxy.save = async () => {
            const idx = groupsDb.data.groups.findIndex(g => g.jid === proxy.jid);
            if (idx !== -1) {
                const { update, save, ...plain } = proxy;
                Object.assign(groupsDb.data.groups[idx], plain, { updatedAt: Group._now() });
                saveGroups();
            }
            return proxy;
        };

        return proxy;
    }
};

// ── MODEL: Setting ───────────────────────────────────────────────────────────
const Setting = {
    _now: () => new Date().toISOString(),

    findOrCreate({ where, defaults = {} }) {
        if (!settingsDb.data.setting) {
            settingsDb.data.setting = {
                id: 1,
                is_public: defaults.is_public ?? true,
                is_register: defaults.is_register ?? true,
                is_gconly: defaults.is_gconly ?? false,
                createdAt: Setting._now(),
                updatedAt: Setting._now(),
            };
            saveSettings();
        }
        const s = settingsDb.data.setting;
        return [Setting._wrap(s), false];
    },

    _wrap(rawSetting) {
        const proxy = { ...rawSetting };

        proxy.update = async (values) => {
            Object.assign(proxy, values, { updatedAt: Setting._now() });
            Object.assign(settingsDb.data.setting, values, { updatedAt: Setting._now() });
            saveSettings();
            return proxy;
        };

        proxy.save = async () => {
            const { update, save, ...plain } = proxy;
            Object.assign(settingsDb.data.setting, plain, { updatedAt: Setting._now() });
            saveSettings();
            return proxy;
        };

        return proxy;
    }
};

// ── Export db object (kompatibel dengan msgData.db.*) ─────────────────────────
export const db = { User, Group, Setting };

// Export individual juga agar import lama tetap jalan
export { User, Group, Setting };

// Dummy sequelize-like object untuk index.js (authenticate, sync sudah tidak diperlukan)
const sequelize = {
    authenticate: async () => true,
    sync: async () => true,
};

export default sequelize;

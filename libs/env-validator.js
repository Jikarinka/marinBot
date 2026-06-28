/**
 * Marin Env Validator
 * Dipanggil saat startup — kalau .env kosong/hilang (misal tertimpa saat
 * container restart/redeploy dari panel hosting), kasih peringatan JELAS
 * di console, bukan biarkan bot crash diam-diam atau jalan dengan kredensial kosong.
 */

import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()

// Variabel yang WAJIB ada — tanpa ini bot tidak bisa berfungsi sama sekali
const CRITICAL_VARS = [
    { key: 'BOT_NUMBER',     reason: 'nomor WA bot tidak diketahui' },
    { key: 'OWNER_NUMBER',   reason: 'sistem keamanan owner-only tidak akan berfungsi — SIAPAPUN bisa pakai fitur owner!' },
]

// Variabel penting tapi bot masih bisa jalan tanpanya (fitur terkait saja yang mati)
const IMPORTANT_VARS = [
    { key: 'GEMINI_API_KEY', reason: 'fitur AI chat tidak akan berfungsi' },
]

export function validateEnv() {
    const envPath = path.join(ROOT, '.env')
    const envExists = fs.existsSync(envPath)
    const envSize = envExists ? fs.statSync(envPath).size : 0

    const missingCritical = CRITICAL_VARS.filter(v => !process.env[v.key]?.trim())
    const missingImportant = IMPORTANT_VARS.filter(v => !process.env[v.key]?.trim())

    const hasIssue = !envExists || envSize === 0 || missingCritical.length > 0

    if (!hasIssue && missingImportant.length === 0) {
        console.log('✅ [Env Check] Semua environment variable penting sudah terisi.')
        return { ok: true, missingCritical: [], missingImportant: [] }
    }

    console.log('')
    console.log('🚨🚨🚨 ===================================== 🚨🚨🚨')
    console.log('🚨   PERINGATAN: ENVIRONMENT VARIABLE BERMASALAH   🚨')
    console.log('🚨🚨🚨 ===================================== 🚨🚨🚨')
    console.log('')

    if (!envExists) {
        console.log('❌ File .env TIDAK DITEMUKAN sama sekali di: ' + envPath)
        console.log('   Kemungkinan: belum dibuat, atau tertimpa saat container restart/redeploy')
        console.log('   (cek pengaturan startup script di panel hosting — apakah ada git pull/clone')
        console.log('   yang menimpa folder kerja setiap restart?)')
    } else if (envSize === 0) {
        console.log('❌ File .env ADA tapi KOSONG (0 byte) di: ' + envPath)
        console.log('   Kemungkinan tertimpa oleh proses deploy/restart yang menarik ulang dari')
        console.log('   git repo (yang memang sengaja TIDAK menyertakan .env demi keamanan).')
    }

    if (missingCritical.length > 0) {
        console.log('')
        console.log('❌ Variabel KRITIS yang kosong/hilang:')
        for (const v of missingCritical) {
            console.log(`   - ${v.key} → ${v.reason}`)
        }
    }

    if (missingImportant.length > 0) {
        console.log('')
        console.log('⚠️  Variabel penting yang kosong:')
        for (const v of missingImportant) {
            console.log(`   - ${v.key} → ${v.reason}`)
        }
    }

    console.log('')
    console.log('👉 Isi ulang file .env sebelum bot dipakai untuk produksi.')
    console.log('   Bot akan tetap mencoba start, TAPI fitur-fitur terkait tidak akan berfungsi')
    console.log('   dan ini BISA JADI CELAH KEAMANAN (mis. sistem owner-only tidak aktif).')
    console.log('')
    console.log('🚨🚨🚨 ===================================== 🚨🚨🚨')
    console.log('')

    return { ok: false, missingCritical, missingImportant, envExists, envSize }
}

/**
 * Kirim notifikasi WA ke owner kalau env bermasalah — dipanggil setelah
 * sock berhasil connect (jadi sekalipun OWNER_NUMBER kosong saat ini,
 * pesan ini hanya akan terkirim kalau OWNER_NUMBER memang valid).
 */
export async function notifyEnvIssueIfAny(sock, validationResult) {
    if (validationResult.ok) return
    if (!validationResult.missingCritical?.length && !validationResult.missingImportant?.length) return

    const ownerNum = (process.env.OWNER_NUMBER || '').replace(/[^0-9]/g, '')
    if (!ownerNum) return // tidak bisa notif kalau OWNER_NUMBER sendiri yang hilang

    try {
        const lines = ['🚨 *PERINGATAN: .env bermasalah saat startup!*', '']
        if (validationResult.missingCritical?.length) {
            lines.push('*Variabel kritis kosong:*')
            for (const v of validationResult.missingCritical) lines.push(`- ${v.key}`)
        }
        if (validationResult.missingImportant?.length) {
            lines.push('', '*Variabel penting kosong:*')
            for (const v of validationResult.missingImportant) lines.push(`- ${v.key}`)
        }
        lines.push('', 'Cek server dan isi ulang .env secepatnya.')

        await sock.sendMessage(ownerNum + '@s.whatsapp.net', { text: lines.join('\n') })
    } catch (_) {}
}

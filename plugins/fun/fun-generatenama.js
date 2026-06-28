const FIRST = ['Andi','Budi','Citra','Devi','Eko','Fitri','Gilang','Hana','Irfan','Joko','Kartika','Lukman','Maya','Nanda','Okta','Putri','Reza','Sari','Taufik','Ulfa','Vina','Wahyu','Xenia','Yoga','Zahra','Arya','Bella','Candra','Dian','Elsa','Faisal','Gita','Hendra','Indra','Julia']
const LAST  = ['Santoso','Wijaya','Kusuma','Pramana','Nugroho','Saputra','Hidayat','Setiawan','Kurniawan','Rahayu','Wibowo','Susanto','Hartono','Sugiarto','Mulyono','Pranoto','Budiman','Suharto','Gunawan','Wahyudi','Prasetyo','Suryadi','Hermawan','Firmansyah','Rachmad']

export default {
    command: ['generatenama', 'randnama', 'namaacak'],
    category: 'fun',
    description: 'Generate nama random Indonesia.',
    isRegistered: false,
    limit: false,

    async execute(sock, m, msgData) {
        const count = Math.min(parseInt(msgData.args[0]) || 3, 10)
        const names = Array.from({ length: count }, () =>
            `${FIRST[Math.floor(Math.random() * FIRST.length)]} ${LAST[Math.floor(Math.random() * LAST.length)]}`
        )
        await msgData.reply(`*Nama Random:*\n${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}`)
    }
}

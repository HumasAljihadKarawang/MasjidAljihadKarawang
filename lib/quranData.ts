export interface SurahSummary {
  nomor: number
  nama: string
  namaLatin: string
  jumlahAyat: number
  tempatTurun: string
  arti: string
  deskripsi: string
  audioFull: Record<string, string>
}

export interface AyatItem {
  nomorAyat: number
  teksArab: string
  teksLatin: string
  teksIndonesia: string
  audio: Record<string, string>
  surahName?: string
  surahNomor?: number
}

export interface SurahDetail extends SurahSummary {
  ayat: AyatItem[]
}

export interface JuzSurahRange {
  surahNomor: number
  namaLatin: string
  ayatMulai: number
  ayatSelesai: number
}

export interface JuzInfo {
  juz: number
  namaJuz: string
  mulai: string
  daftarSurat: JuzSurahRange[]
}

export const QARI_LIST: Array<{ id: string; nama: string; cdnFolder: string }> = [
  { id: '05', nama: 'Syaikh Misyari Rasyid Al-Afasy', cdnFolder: 'Misyari-Rasyid-Al-Afasi' },
  { id: '03', nama: 'Syaikh Abdurrahman As-Sudais', cdnFolder: 'Abdurrahman-as-Sudais' },
  { id: '01', nama: 'Syaikh Abdullah Al-Juhany', cdnFolder: 'Abdullah-Al-Juhany' },
  { id: '02', nama: 'Syaikh Abdul Muhsin Al-Qasim', cdnFolder: 'Abdul-Muhsin-Al-Qasim' },
  { id: '04', nama: 'Syaikh Ibrahim Al-Dossari', cdnFolder: 'Ibrahim-Al-Dossari' },
]

// URL generator lokal tanpa perlu menunggu response API (Instant Play / Preload)
export function getDirectSurahAudioUrl(surahNomor: number, qariId: string): string {
  const padded = String(surahNomor).padStart(3, '0')
  const qari = QARI_LIST.find((q) => q.id === qariId) || QARI_LIST[0]
  return `https://equran.nos.wjv-1.neo.id/audio-full/${qari.cdnFolder}/${padded}.mp3`
}

export function getDirectAyatAudioUrl(
  surahNomor: number,
  ayatNomor: number,
  qariId: string
): string {
  const sPad = String(surahNomor).padStart(3, '0')
  const aPad = String(ayatNomor).padStart(3, '0')
  const qari = QARI_LIST.find((q) => q.id === qariId) || QARI_LIST[0]
  return `https://equran.nos.wjv-1.neo.id/audio-partial/${qari.cdnFolder}/${sPad}${aPad}.mp3`
}

// Database Klasifikasi 30 Juz beserta Daftar Surat & Rentang Ayat di dalam tiap Juz
export const JUZ_DATABASE: JuzInfo[] = [
  {
    juz: 1,
    namaJuz: 'Juz 1 (Alif Lam Mim)',
    mulai: 'Al-Fatihah: 1 – Al-Baqarah: 141',
    daftarSurat: [
      { surahNomor: 1, namaLatin: 'Al-Fatihah', ayatMulai: 1, ayatSelesai: 7 },
      { surahNomor: 2, namaLatin: 'Al-Baqarah', ayatMulai: 1, ayatSelesai: 141 },
    ],
  },
  {
    juz: 2,
    namaJuz: 'Juz 2 (Sayaqul)',
    mulai: 'Al-Baqarah: 142 – 252',
    daftarSurat: [{ surahNomor: 2, namaLatin: 'Al-Baqarah', ayatMulai: 142, ayatSelesai: 252 }],
  },
  {
    juz: 3,
    namaJuz: 'Juz 3 (Tilkar Rusul)',
    mulai: 'Al-Baqarah: 253 – Ali Imran: 92',
    daftarSurat: [
      { surahNomor: 2, namaLatin: 'Al-Baqarah', ayatMulai: 253, ayatSelesai: 286 },
      { surahNomor: 3, namaLatin: "Ali 'Imran", ayatMulai: 1, ayatSelesai: 92 },
    ],
  },
  {
    juz: 4,
    namaJuz: 'Juz 4 (Lan Tanalul Birra)',
    mulai: 'Ali Imran: 93 – An-Nisa: 23',
    daftarSurat: [
      { surahNomor: 3, namaLatin: "Ali 'Imran", ayatMulai: 93, ayatSelesai: 200 },
      { surahNomor: 4, namaLatin: "An-Nisa'", ayatMulai: 1, ayatSelesai: 23 },
    ],
  },
  {
    juz: 5,
    namaJuz: 'Juz 5 (Wal Muhshanat)',
    mulai: 'An-Nisa: 24 – 147',
    daftarSurat: [{ surahNomor: 4, namaLatin: "An-Nisa'", ayatMulai: 24, ayatSelesai: 147 }],
  },
  {
    juz: 6,
    namaJuz: 'Juz 6 (La Yuhibbullah)',
    mulai: 'An-Nisa: 148 – Al-Maidah: 81',
    daftarSurat: [
      { surahNomor: 4, namaLatin: "An-Nisa'", ayatMulai: 148, ayatSelesai: 176 },
      { surahNomor: 5, namaLatin: "Al-Ma'idah", ayatMulai: 1, ayatSelesai: 81 },
    ],
  },
  {
    juz: 7,
    namaJuz: 'Juz 7 (Wa Idza Sami’u)',
    mulai: 'Al-Maidah: 82 – Al-An’am: 110',
    daftarSurat: [
      { surahNomor: 5, namaLatin: "Al-Ma'idah", ayatMulai: 82, ayatSelesai: 120 },
      { surahNomor: 6, namaLatin: "Al-An'am", ayatMulai: 1, ayatSelesai: 110 },
    ],
  },
  {
    juz: 8,
    namaJuz: 'Juz 8 (Wa Lau Annana)',
    mulai: 'Al-An’am: 111 – Al-A’raf: 87',
    daftarSurat: [
      { surahNomor: 6, namaLatin: "Al-An'am", ayatMulai: 111, ayatSelesai: 165 },
      { surahNomor: 7, namaLatin: "Al-A'raf", ayatMulai: 1, ayatSelesai: 87 },
    ],
  },
  {
    juz: 9,
    namaJuz: 'Juz 9 (Qalal Mala’u)',
    mulai: 'Al-A’raf: 88 – Al-Anfal: 40',
    daftarSurat: [
      { surahNomor: 7, namaLatin: "Al-A'raf", ayatMulai: 88, ayatSelesai: 206 },
      { surahNomor: 8, namaLatin: 'Al-Anfal', ayatMulai: 1, ayatSelesai: 40 },
    ],
  },
  {
    juz: 10,
    namaJuz: 'Juz 10 (Wa’lamu)',
    mulai: 'Al-Anfal: 41 – At-Taubah: 92',
    daftarSurat: [
      { surahNomor: 8, namaLatin: 'Al-Anfal', ayatMulai: 41, ayatSelesai: 75 },
      { surahNomor: 9, namaLatin: 'At-Taubah', ayatMulai: 1, ayatSelesai: 92 },
    ],
  },
  {
    juz: 11,
    namaJuz: 'Juz 11 (Ya’tadzirun)',
    mulai: 'At-Taubah: 93 – Hud: 5',
    daftarSurat: [
      { surahNomor: 9, namaLatin: 'At-Taubah', ayatMulai: 93, ayatSelesai: 129 },
      { surahNomor: 10, namaLatin: 'Yunus', ayatMulai: 1, ayatSelesai: 109 },
      { surahNomor: 11, namaLatin: 'Hud', ayatMulai: 1, ayatSelesai: 5 },
    ],
  },
  {
    juz: 12,
    namaJuz: 'Juz 12 (Wa Ma Min Dabbah)',
    mulai: 'Hud: 6 – Yusuf: 52',
    daftarSurat: [
      { surahNomor: 11, namaLatin: 'Hud', ayatMulai: 6, ayatSelesai: 123 },
      { surahNomor: 12, namaLatin: 'Yusuf', ayatMulai: 1, ayatSelesai: 52 },
    ],
  },
  {
    juz: 13,
    namaJuz: 'Juz 13 (Wa Ma Ubarri’u)',
    mulai: 'Yusuf: 53 – Ibrahim: 52',
    daftarSurat: [
      { surahNomor: 12, namaLatin: 'Yusuf', ayatMulai: 53, ayatSelesai: 111 },
      { surahNomor: 13, namaLatin: "Ar-Ra'd", ayatMulai: 1, ayatSelesai: 43 },
      { surahNomor: 14, namaLatin: 'Ibrahim', ayatMulai: 1, ayatSelesai: 52 },
    ],
  },
  {
    juz: 14,
    namaJuz: 'Juz 14 (Rubama)',
    mulai: 'Al-Hijr: 1 – An-Nahl: 128',
    daftarSurat: [
      { surahNomor: 15, namaLatin: 'Al-Hijr', ayatMulai: 1, ayatSelesai: 99 },
      { surahNomor: 16, namaLatin: 'An-Nahl', ayatMulai: 1, ayatSelesai: 128 },
    ],
  },
  {
    juz: 15,
    namaJuz: 'Juz 15 (Subhanalladzi)',
    mulai: 'Al-Isra: 1 – Al-Kahf: 74',
    daftarSurat: [
      { surahNomor: 17, namaLatin: "Al-Isra'", ayatMulai: 1, ayatSelesai: 111 },
      { surahNomor: 18, namaLatin: 'Al-Kahf', ayatMulai: 1, ayatSelesai: 74 },
    ],
  },
  {
    juz: 16,
    namaJuz: 'Juz 16 (Qala Alam)',
    mulai: 'Al-Kahf: 75 – Thaha: 135',
    daftarSurat: [
      { surahNomor: 18, namaLatin: 'Al-Kahf', ayatMulai: 75, ayatSelesai: 110 },
      { surahNomor: 19, namaLatin: 'Maryam', ayatMulai: 1, ayatSelesai: 98 },
      { surahNomor: 20, namaLatin: 'Thaha', ayatMulai: 1, ayatSelesai: 135 },
    ],
  },
  {
    juz: 17,
    namaJuz: 'Juz 17 (Iqtaraba)',
    mulai: 'Al-Anbiya: 1 – Al-Hajj: 78',
    daftarSurat: [
      { surahNomor: 21, namaLatin: "Al-Anbiya'", ayatMulai: 1, ayatSelesai: 112 },
      { surahNomor: 22, namaLatin: 'Al-Hajj', ayatMulai: 1, ayatSelesai: 78 },
    ],
  },
  {
    juz: 18,
    namaJuz: 'Juz 18 (Qad Aflaha)',
    mulai: 'Al-Mu’minun: 1 – Al-Furqan: 20',
    daftarSurat: [
      { surahNomor: 23, namaLatin: "Al-Mu'minun", ayatMulai: 1, ayatSelesai: 118 },
      { surahNomor: 24, namaLatin: 'An-Nur', ayatMulai: 1, ayatSelesai: 64 },
      { surahNomor: 25, namaLatin: 'Al-Furqan', ayatMulai: 1, ayatSelesai: 20 },
    ],
  },
  {
    juz: 19,
    namaJuz: 'Juz 19 (Wa Qalalladzina)',
    mulai: 'Al-Furqan: 21 – An-Naml: 55',
    daftarSurat: [
      { surahNomor: 25, namaLatin: 'Al-Furqan', ayatMulai: 21, ayatSelesai: 77 },
      { surahNomor: 26, namaLatin: "Asy-Syu'ara'", ayatMulai: 1, ayatSelesai: 227 },
      { surahNomor: 27, namaLatin: 'An-Naml', ayatMulai: 1, ayatSelesai: 55 },
    ],
  },
  {
    juz: 20,
    namaJuz: 'Juz 20 (Amman Khalaqa)',
    mulai: 'An-Naml: 56 – Al-Ankabut: 45',
    daftarSurat: [
      { surahNomor: 27, namaLatin: 'An-Naml', ayatMulai: 56, ayatSelesai: 93 },
      { surahNomor: 28, namaLatin: 'Al-Qashash', ayatMulai: 1, ayatSelesai: 88 },
      { surahNomor: 29, namaLatin: "Al-'Ankabut", ayatMulai: 1, ayatSelesai: 45 },
    ],
  },
  {
    juz: 21,
    namaJuz: 'Juz 21 (Utlu Ma Uhiya)',
    mulai: 'Al-Ankabut: 46 – Al-Ahzab: 30',
    daftarSurat: [
      { surahNomor: 29, namaLatin: "Al-'Ankabut", ayatMulai: 46, ayatSelesai: 69 },
      { surahNomor: 30, namaLatin: 'Ar-Rum', ayatMulai: 1, ayatSelesai: 60 },
      { surahNomor: 31, namaLatin: 'Luqman', ayatMulai: 1, ayatSelesai: 34 },
      { surahNomor: 32, namaLatin: 'As-Sajdah', ayatMulai: 1, ayatSelesai: 30 },
      { surahNomor: 33, namaLatin: 'Al-Ahzab', ayatMulai: 1, ayatSelesai: 30 },
    ],
  },
  {
    juz: 22,
    namaJuz: 'Juz 22 (Wa Man Yaqnut)',
    mulai: 'Al-Ahzab: 31 – Yasin: 27',
    daftarSurat: [
      { surahNomor: 33, namaLatin: 'Al-Ahzab', ayatMulai: 31, ayatSelesai: 73 },
      { surahNomor: 34, namaLatin: "Saba'", ayatMulai: 1, ayatSelesai: 54 },
      { surahNomor: 35, namaLatin: 'Fathir', ayatMulai: 1, ayatSelesai: 45 },
      { surahNomor: 36, namaLatin: 'Yasin', ayatMulai: 1, ayatSelesai: 27 },
    ],
  },
  {
    juz: 23,
    namaJuz: 'Juz 23 (Wa Maliya)',
    mulai: 'Yasin: 28 – Az-Zumar: 31',
    daftarSurat: [
      { surahNomor: 36, namaLatin: 'Yasin', ayatMulai: 28, ayatSelesai: 83 },
      { surahNomor: 37, namaLatin: 'Ash-Shaffat', ayatMulai: 1, ayatSelesai: 182 },
      { surahNomor: 38, namaLatin: 'Shad', ayatMulai: 1, ayatSelesai: 88 },
      { surahNomor: 39, namaLatin: 'Az-Zumar', ayatMulai: 1, ayatSelesai: 31 },
    ],
  },
  {
    juz: 24,
    namaJuz: 'Juz 24 (Faman Azhlamu)',
    mulai: 'Az-Zumar: 32 – Fushshilat: 46',
    daftarSurat: [
      { surahNomor: 39, namaLatin: 'Az-Zumar', ayatMulai: 32, ayatSelesai: 75 },
      { surahNomor: 40, namaLatin: 'Ghafir', ayatMulai: 1, ayatSelesai: 85 },
      { surahNomor: 41, namaLatin: 'Fushshilat', ayatMulai: 1, ayatSelesai: 46 },
    ],
  },
  {
    juz: 25,
    namaJuz: 'Juz 25 (Ilaihi Yuraddu)',
    mulai: 'Fushshilat: 47 – Al-Jatsiyah: 37',
    daftarSurat: [
      { surahNomor: 41, namaLatin: 'Fushshilat', ayatMulai: 47, ayatSelesai: 54 },
      { surahNomor: 42, namaLatin: 'Asy-Syura', ayatMulai: 1, ayatSelesai: 53 },
      { surahNomor: 43, namaLatin: 'Az-Zukhruf', ayatMulai: 1, ayatSelesai: 89 },
      { surahNomor: 44, namaLatin: 'Ad-Dukhan', ayatMulai: 1, ayatSelesai: 59 },
      { surahNomor: 45, namaLatin: 'Al-Jatsiyah', ayatMulai: 1, ayatSelesai: 37 },
    ],
  },
  {
    juz: 26,
    namaJuz: 'Juz 26 (Ha Mim)',
    mulai: 'Al-Ahqaf: 1 – Adz-Dzariyat: 30',
    daftarSurat: [
      { surahNomor: 46, namaLatin: 'Al-Ahqaf', ayatMulai: 1, ayatSelesai: 35 },
      { surahNomor: 47, namaLatin: 'Muhammad', ayatMulai: 1, ayatSelesai: 38 },
      { surahNomor: 48, namaLatin: 'Al-Fath', ayatMulai: 1, ayatSelesai: 29 },
      { surahNomor: 49, namaLatin: 'Al-Hujurat', ayatMulai: 1, ayatSelesai: 18 },
      { surahNomor: 50, namaLatin: 'Qaf', ayatMulai: 1, ayatSelesai: 45 },
      { surahNomor: 51, namaLatin: 'Adz-Dzariyat', ayatMulai: 1, ayatSelesai: 30 },
    ],
  },
  {
    juz: 27,
    namaJuz: 'Juz 27 (Qala Fama Khathbukum)',
    mulai: 'Adz-Dzariyat: 31 – Al-Hadid: 29',
    daftarSurat: [
      { surahNomor: 51, namaLatin: 'Adz-Dzariyat', ayatMulai: 31, ayatSelesai: 60 },
      { surahNomor: 52, namaLatin: 'Ath-Thur', ayatMulai: 1, ayatSelesai: 49 },
      { surahNomor: 53, namaLatin: 'An-Najm', ayatMulai: 1, ayatSelesai: 62 },
      { surahNomor: 54, namaLatin: 'Al-Qamar', ayatMulai: 1, ayatSelesai: 55 },
      { surahNomor: 55, namaLatin: 'Ar-Rahman', ayatMulai: 1, ayatSelesai: 78 },
      { surahNomor: 56, namaLatin: "Al-Waqi'ah", ayatMulai: 1, ayatSelesai: 96 },
      { surahNomor: 57, namaLatin: 'Al-Hadid', ayatMulai: 1, ayatSelesai: 29 },
    ],
  },
  {
    juz: 28,
    namaJuz: 'Juz 28 (Qad Sami’allahu)',
    mulai: 'Al-Mujadilah: 1 – At-Tahrim: 12',
    daftarSurat: [
      { surahNomor: 58, namaLatin: 'Al-Mujadilah', ayatMulai: 1, ayatSelesai: 22 },
      { surahNomor: 59, namaLatin: 'Al-Hasyr', ayatMulai: 1, ayatSelesai: 24 },
      { surahNomor: 60, namaLatin: 'Al-Mumtahanah', ayatMulai: 1, ayatSelesai: 13 },
      { surahNomor: 61, namaLatin: 'Ash-Shaff', ayatMulai: 1, ayatSelesai: 14 },
      { surahNomor: 62, namaLatin: "Al-Jumu'ah", ayatMulai: 1, ayatSelesai: 11 },
      { surahNomor: 63, namaLatin: 'Al-Munafiqun', ayatMulai: 1, ayatSelesai: 11 },
      { surahNomor: 64, namaLatin: 'At-Taghabun', ayatMulai: 1, ayatSelesai: 18 },
      { surahNomor: 65, namaLatin: 'Ath-Thalaq', ayatMulai: 1, ayatSelesai: 12 },
      { surahNomor: 66, namaLatin: 'At-Tahrim', ayatMulai: 1, ayatSelesai: 12 },
    ],
  },
  {
    juz: 29,
    namaJuz: 'Juz 29 (Tabarakalladzi)',
    mulai: 'Al-Mulk: 1 – Al-Mursalat: 50',
    daftarSurat: [
      { surahNomor: 67, namaLatin: 'Al-Mulk', ayatMulai: 1, ayatSelesai: 30 },
      { surahNomor: 68, namaLatin: 'Al-Qalam', ayatMulai: 1, ayatSelesai: 52 },
      { surahNomor: 69, namaLatin: 'Al-Haqqah', ayatMulai: 1, ayatSelesai: 52 },
      { surahNomor: 70, namaLatin: "Al-Ma'arij", ayatMulai: 1, ayatSelesai: 44 },
      { surahNomor: 71, namaLatin: 'Nuh', ayatMulai: 1, ayatSelesai: 28 },
      { surahNomor: 72, namaLatin: 'Al-Jinn', ayatMulai: 1, ayatSelesai: 28 },
      { surahNomor: 73, namaLatin: 'Al-Muzzammil', ayatMulai: 1, ayatSelesai: 20 },
      { surahNomor: 74, namaLatin: 'Al-Muddatstsir', ayatMulai: 1, ayatSelesai: 56 },
      { surahNomor: 75, namaLatin: 'Al-Qiyamah', ayatMulai: 1, ayatSelesai: 40 },
      { surahNomor: 76, namaLatin: 'Al-Insan', ayatMulai: 1, ayatSelesai: 31 },
      { surahNomor: 77, namaLatin: 'Al-Mursalat', ayatMulai: 1, ayatSelesai: 50 },
    ],
  },
  {
    juz: 30,
    namaJuz: "Juz 30 (Juz 'Amma)",
    mulai: 'An-Naba: 1 – An-Nas: 6 (37 Surat)',
    daftarSurat: [
      { surahNomor: 78, namaLatin: "An-Naba'", ayatMulai: 1, ayatSelesai: 40 },
      { surahNomor: 79, namaLatin: "An-Nazi'at", ayatMulai: 1, ayatSelesai: 46 },
      { surahNomor: 80, namaLatin: "'Abasa", ayatMulai: 1, ayatSelesai: 42 },
      { surahNomor: 81, namaLatin: 'At-Takwir', ayatMulai: 1, ayatSelesai: 29 },
      { surahNomor: 82, namaLatin: 'Al-Infithar', ayatMulai: 1, ayatSelesai: 19 },
      { surahNomor: 83, namaLatin: 'Al-Muthaffifin', ayatMulai: 1, ayatSelesai: 36 },
      { surahNomor: 84, namaLatin: 'Al-Insyiqaq', ayatMulai: 1, ayatSelesai: 25 },
      { surahNomor: 85, namaLatin: 'Al-Buruj', ayatMulai: 1, ayatSelesai: 22 },
      { surahNomor: 86, namaLatin: 'Ath-Thariq', ayatMulai: 1, ayatSelesai: 17 },
      { surahNomor: 87, namaLatin: "Al-A'la", ayatMulai: 1, ayatSelesai: 19 },
      { surahNomor: 88, namaLatin: 'Al-Ghasyiyah', ayatMulai: 1, ayatSelesai: 26 },
      { surahNomor: 89, namaLatin: 'Al-Fajr', ayatMulai: 1, ayatSelesai: 30 },
      { surahNomor: 90, namaLatin: 'Al-Balad', ayatMulai: 1, ayatSelesai: 20 },
      { surahNomor: 91, namaLatin: 'Asy-Syams', ayatMulai: 1, ayatSelesai: 15 },
      { surahNomor: 92, namaLatin: 'Al-Lail', ayatMulai: 1, ayatSelesai: 21 },
      { surahNomor: 93, namaLatin: 'Adh-Dhuha', ayatMulai: 1, ayatSelesai: 11 },
      { surahNomor: 94, namaLatin: 'Al-Insyirah', ayatMulai: 1, ayatSelesai: 8 },
      { surahNomor: 95, namaLatin: 'At-Tin', ayatMulai: 1, ayatSelesai: 8 },
      { surahNomor: 96, namaLatin: "Al-'Alaq", ayatMulai: 1, ayatSelesai: 19 },
      { surahNomor: 97, namaLatin: 'Al-Qadr', ayatMulai: 1, ayatSelesai: 5 },
      { surahNomor: 98, namaLatin: 'Al-Bayyinah', ayatMulai: 1, ayatSelesai: 8 },
      { surahNomor: 99, namaLatin: 'Az-Zalzalah', ayatMulai: 1, ayatSelesai: 8 },
      { surahNomor: 100, namaLatin: "Al-'Adiyat", ayatMulai: 1, ayatSelesai: 11 },
      { surahNomor: 101, namaLatin: "Al-Qari'ah", ayatMulai: 1, ayatSelesai: 11 },
      { surahNomor: 102, namaLatin: 'At-Takatsur', ayatMulai: 1, ayatSelesai: 8 },
      { surahNomor: 103, namaLatin: "Al-'Ashr", ayatMulai: 1, ayatSelesai: 3 },
      { surahNomor: 104, namaLatin: 'Al-Humazah', ayatMulai: 1, ayatSelesai: 9 },
      { surahNomor: 105, namaLatin: 'Al-Fil', ayatMulai: 1, ayatSelesai: 5 },
      { surahNomor: 106, namaLatin: 'Quraisy', ayatMulai: 1, ayatSelesai: 4 },
      { surahNomor: 107, namaLatin: "Al-Ma'un", ayatMulai: 1, ayatSelesai: 7 },
      { surahNomor: 108, namaLatin: 'Al-Kautsar', ayatMulai: 1, ayatSelesai: 3 },
      { surahNomor: 109, namaLatin: 'Al-Kafirun', ayatMulai: 1, ayatSelesai: 6 },
      { surahNomor: 110, namaLatin: 'An-Nashr', ayatMulai: 1, ayatSelesai: 3 },
      { surahNomor: 111, namaLatin: 'Al-Lahab', ayatMulai: 1, ayatSelesai: 5 },
      { surahNomor: 112, namaLatin: 'Al-Ikhlas', ayatMulai: 1, ayatSelesai: 4 },
      { surahNomor: 113, namaLatin: 'Al-Falaq', ayatMulai: 1, ayatSelesai: 5 },
      { surahNomor: 114, namaLatin: 'An-Nas', ayatMulai: 1, ayatSelesai: 6 },
    ],
  },
]

export function getJuzForSurah(surahNomor: number): number[] {
  const result: number[] = []
  for (const j of JUZ_DATABASE) {
    if (j.daftarSurat.some((s) => s.surahNomor === surahNomor)) {
      result.push(j.juz)
    }
  }
  return result.length > 0 ? result : [1]
}

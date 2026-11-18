import { mockBerita, mockProgram, mockReels } from './mockData'

export interface BeritaItem {
  id: string
  judul: string
  slug: string
  ringkasan: string
  konten: string
  thumbnail_url: string
  kategori: string
  created_at: string
  published: boolean
}

export interface VideoKegiatanItem {
  id: string
  judul: string
  url_video: string
  thumbnail_url: string
  kategori: string
  durasi: string
  urutan: number
  aktif: boolean
}

export interface KegiatanUnggulanItem {
  id: string
  nama: string
  deskripsi: string
  kategori: string
  ikon: string
  jadwal: string
  lokasi: string
  badgeCustom: string
  warnaCustom: string
  tampilDiBeranda: boolean
  aktif: boolean
}

export interface AgendaKalenderItem {
  id: string
  judul: string
  pemateri: string
  tanggal: string // YYYY-MM-DD
  jamMulai: string // HH:mm
  jamSelesai: string // HH:mm
  ruangan: string
  kategori: 'Kajian' | 'Khutbah Jumat' | 'Rapat DKM' | 'Sosial' | 'Pendidikan' | 'PHBI'
  keterangan: string
}

export interface KritikSaranItem {
  id: string
  nama: string
  kontak: string
  kategori: string
  pesan: string
  tanggal: string
  status: 'Baru' | 'Sudah Dibaca' | 'Ditindaklanjuti'
  balasanAdmin?: string
}

export const INITIAL_BERITA: BeritaItem[] = [
  {
    id: 'b-1',
    judul: 'RIBUAN JAMAAH IKUTI TABLIGH AKBAR & DOA BERSAMA DI MASJID RAYA AL-JIHAD KARAWANG',
    slug: 'ribuan-jamaah-ikuti-tabligh-akbar-masjid-al-jihad-karawang',
    ringkasan:
      'Ribuan jamaah memadati ruang utama dan pelataran Masjid Al-Jihad Islamic Center Karawang dalam rangkaian Tabligh Akbar dan doa bersama untuk kemakmuran umat.',
    konten:
      'Ribuan jamaah dari berbagai kecamatan di Kabupaten Karawang memadati kompleks Masjid Al-Jihad (Islamic Center Karawang) di Jl. Jenderal Ahmad Yani, Karangpawitan.',
    thumbnail_url: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1200&q=80',
    kategori: 'KEGIATAN MASJID',
    created_at: '2026-11-15T08:00:00Z',
    published: true,
  },
  {
    id: 'b-2',
    judul: 'DKM AL-JIHAD & ISLAMIC CENTER KARAWANG PERKUAT SINERGI PEMBINAAN GENERASI QURANI',
    slug: 'dkm-al-jihad-islamic-center-karawang-perkuat-sinergi-generasi-qurani',
    ringkasan:
      'Pengurus DKM Masjid Al-Jihad bersama Yayasan Islamic Center Kabupaten Karawang menggelar rapat koordinasi penguatan pendidikan Al-Quran dan kajian kitab rutin.',
    konten:
      'Pengurus DKM Masjid Al-Jihad bersama Yayasan Islamic Center Kabupaten Karawang meresmikan kurikulum terpadu pembinaan tahsin, tahfidz, dan kajian kitab turats.',
    thumbnail_url: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=1200&q=80',
    kategori: 'ISLAM KARAWANG',
    created_at: '2026-11-13T09:30:00Z',
    published: true,
  },
  {
    id: 'b-3',
    judul: 'JADWAL KAJIAN KITAB RIYADUSH SHALIHIN & TAFSIR AL-QURAN PEKAN INI DI MASJID AL-JIHAD',
    slug: 'jadwal-kajian-kitab-riyadush-shalihin-pekan-ini',
    ringkasan:
      'Simak jadwal lengkap kajian rutin ba’da Maghrib dan kuliah Subuh bersama para ulama dan asatidz Kabupaten Karawang.',
    konten: 'Kajian rutin ba’da Maghrib dan Subuh terbuka untuk seluruh jamaah ikhwan dan akhwat.',
    thumbnail_url: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=800&q=80',
    kategori: 'KAJIAN RUTIN',
    created_at: '2026-11-12T10:00:00Z',
    published: true,
  },
  {
    id: 'b-4',
    judul: 'PENYALURAN SANTUNAN YATIM & PAKET SEMBAKO JUMAT BERKAH DKM AL-JIHAD KARAWANG',
    slug: 'penyaluran-santunan-yatim-dan-jumat-berkah',
    ringkasan:
      'Alhamdulillah telah tersalurkan ratusan paket Jumat Berkah dan santunan yatim dhuafa dari infaq jamaah Masjid Al-Jihad.',
    konten: 'Program Jumat Berkah rutin menyalurkan amanah donasi jamaah setiap hari Jumat.',
    thumbnail_url: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&q=80',
    kategori: 'SOSIAL & ZISWAF',
    created_at: '2026-11-10T14:00:00Z',
    published: true,
  },
  {
    id: 'b-5',
    judul: 'PEMBUKAAN PENDAFTARAN SANTRI BARU TPA & TAHFIDZ AL-JIHAD SEMESTER GENAP',
    slug: 'pembukaan-pendaftaran-santri-baru-tpa-tahfidz',
    ringkasan:
      'Pendaftaran santri baru Taman Pendidikan Al-Quran (TPA) dan kelas Tahfidz anak maupun dewasa kini resmi dibuka.',
    konten: 'Mari daftarkan putra-putri Anda dalam program pendidikan Al-Quran di Masjid Al-Jihad.',
    thumbnail_url: 'https://images.unsplash.com/photo-1585036156171-384164a8c675?w=800&q=80',
    kategori: 'PENDIDIKAN ISLAM',
    created_at: '2026-11-08T08:00:00Z',
    published: true,
  },
  {
    id: 'b-6',
    judul: 'OPTIMALISASI FASILITAS IBADAH & AREA WUDHU RAMAH LANSIA DI KOMPLEKS ISLAMIC CENTER',
    slug: 'optimalisasi-fasilitas-ibadah-area-wudhu-ramah-lansia',
    ringkasan:
      'DKM Al-Jihad terus meningkatkan kenyamanan beribadah melalui perawatan berkala ruang utama dan area wudhu.',
    konten: 'Kenyamanan dan kekhusyukan jamaah menjadi prioritas utama layanan Masjid Al-Jihad.',
    thumbnail_url: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=800&q=80',
    kategori: 'LAYANAN UMAT',
    created_at: '2026-11-05T11:20:00Z',
    published: true,
  },
  {
    id: 'b-7',
    judul: 'SEMARAK SUBUH BERJAMAAH & SARAPAN BERSAMA JAMAAH MASJID AL-JIHAD KARANGPAWITAN',
    slug: 'semarak-subuh-berjamaah-dan-sarapan-bersama-jamaah',
    ringkasan:
      'Kegiatan Gerakan Subuh Berjamaah akhir pekan dihadiri ratusan jamaah dilanjutkan tausiyah dan ramah tamah.',
    konten: 'Gerakan Subuh Berjamaah mempererat ukhuwah islamiyah warga Karawang.',
    thumbnail_url: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=800&q=80',
    kategori: 'UKHUWAH ISLAMIYAH',
    created_at: '2026-11-02T06:30:00Z',
    published: true,
  },
]

export const INITIAL_VIDEO_KEGIATAN: VideoKegiatanItem[] = mockReels.map((r, i) => ({
  id: r.id,
  judul: r.judul || 'Dokumentasi Kegiatan Masjid Al-Jihad',
  url_video: r.url_video,
  thumbnail_url:
    r.thumbnail_url || 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600&q=80',
  kategori: ['Ibadah & Sholat', 'Pendidikan TPA', 'Kajian Rutin', 'Sosial & Zakat'][i % 4],
  durasi: ['01:15', '00:58', '01:30', '01:05'][i % 4],
  urutan: i + 1,
  aktif: true,
}))

export const INITIAL_KEGIATAN_UNGGULAN: KegiatanUnggulanItem[] = []

export const INITIAL_KALENDER: AgendaKalenderItem[] = [
  {
    id: 'kal-1',
    judul: 'Kajian Tafsir Al-Qur’an & Hadits Pilihan',
    pemateri: 'KH. Ahmad Fauzan, S.Ag.',
    tanggal: '2026-11-17',
    jamMulai: '18:30',
    jamSelesai: '20:00',
    ruangan: 'Ruang Sholat Utama Lantai 1',
    kategori: 'Kajian',
    keterangan: 'Terbuka untuk jamaah ikhwan dan akhwat',
  },
  {
    id: 'kal-2',
    judul: 'Khutbah & Sholat Jumat Berjamaah',
    pemateri: 'Ustaz Muhammad Ridwan, M.Pd.I.',
    tanggal: '2026-11-20',
    jamMulai: '11:30',
    jamSelesai: '13:00',
    ruangan: 'Ruang Sholat Utama Lantai 1 & 2',
    kategori: 'Khutbah Jumat',
    keterangan: 'Tema: Memakmurkan Masjid sebagai Pusat Peradaban Umat',
  },
  {
    id: 'kal-3',
    judul: 'Pembinaan Tahsin & Tahfidz Al-Qur’an Anak',
    pemateri: 'Tim Asatidz TPQ Al-Jihad',
    tanggal: '2026-11-20',
    jamMulai: '15:30',
    jamSelesai: '17:15',
    ruangan: 'Aula Pendidikan Islamic Center',
    kategori: 'Pendidikan',
    keterangan: 'Kelas reguler santri TPA & Madrasah',
  },
  {
    id: 'kal-4',
    judul: 'Kuliah Subuh Akhir Pekan & Sarapan Bersama',
    pemateri: 'Drs. KH. Abdullah Rahman',
    tanggal: '2026-11-22',
    jamMulai: '05:00',
    jamSelesai: '06:30',
    ruangan: 'Ruang Sholat Utama Lantai 1',
    kategori: 'Kajian',
    keterangan: 'Dilanjutkan ramah tamah di serambi masjid',
  },
]

const KEYS = {
  berita: 'aljihad_berita_v1',
  video: 'aljihad_video_v1',
  kegiatan: 'aljihad_kegiatan_v2',
  kalender: 'aljihad_kalender_v1',
  kritik: 'aljihad_kritik_v1',
}

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T) : fallback
  } catch {
    return fallback
  }
}

function safeSet<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    window.dispatchEvent(new CustomEvent('aljihad-store-updated', { detail: { key } }))
  } catch {
    // ignore quota error
  }
}

export const masjidStore = {
  getBerita: (): BeritaItem[] => safeGet(KEYS.berita, INITIAL_BERITA),
  saveBerita: (list: BeritaItem[]) => safeSet(KEYS.berita, list),

  getVideo: (): VideoKegiatanItem[] => safeGet(KEYS.video, INITIAL_VIDEO_KEGIATAN),
  saveVideo: (list: VideoKegiatanItem[]) => safeSet(KEYS.video, list),

  getKegiatan: (): KegiatanUnggulanItem[] => safeGet(KEYS.kegiatan, INITIAL_KEGIATAN_UNGGULAN),
  saveKegiatan: (list: KegiatanUnggulanItem[]) => safeSet(KEYS.kegiatan, list),

  getKalender: (): AgendaKalenderItem[] => safeGet(KEYS.kalender, INITIAL_KALENDER),
  saveKalender: (list: AgendaKalenderItem[]) => safeSet(KEYS.kalender, list),

  getKritik: (): KritikSaranItem[] => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(KEYS.kritik)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  },
  saveKritik: (list: KritikSaranItem[]) => safeSet(KEYS.kritik, list),
}

// Fungsi deteksi bentrok jadwal (Tanggal sama, Ruangan sama, dan rentang jam beririsan)
export function findScheduleConflicts(
  candidate: Omit<AgendaKalenderItem, 'id'>,
  existingList: AgendaKalenderItem[],
  ignoreId?: string
): AgendaKalenderItem[] {
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  const startA = toMinutes(candidate.jamMulai)
  const endA = toMinutes(candidate.jamSelesai)

  return existingList.filter((item) => {
    if (ignoreId && item.id === ignoreId) return false
    if (item.tanggal !== candidate.tanggal) return false

    const startB = toMinutes(item.jamMulai)
    const endB = toMinutes(item.jamSelesai)
    const timeOverlap = startA < endB && endA > startB
    return timeOverlap
  })
}

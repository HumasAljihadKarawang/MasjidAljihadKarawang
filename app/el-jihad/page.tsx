'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import QuranBookReader from '@/components/ElJihad/QuranBookReader'
import QuranFullPageTajweed from '@/components/ElJihad/QuranFullPageTajweed'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import styles from './navigasi.module.css'

interface KitabItem {
  id: string
  judul_kitab: string
  penulis_ulama: string | null
  kategori_kitab: string | null
  deskripsi: string | null
  file_pdf_url: string
}

const DEFAULT_KITAB: KitabItem[] = [
  {
    id: 'kitab-1',
    judul_kitab: 'Riyadush Shalihin',
    penulis_ulama: 'Imam Abu Zakariya An-Nawawi',
    kategori_kitab: 'Hadits & Akhlak',
    deskripsi:
      'Kumpulan hadits shahih pilihan tentang adab, akhlak mulia, keutamaan amal, dan penyucian jiwa yang rutin dikaji di Masjid Al-Jihad.',
    file_pdf_url: 'https://d1.islamhouse.com/data/id/ih_books/single/id_riyadh_assaliheen.pdf',
  },
  {
    id: 'kitab-2',
    judul_kitab: "Hadits Arba'in Nawawiyah",
    penulis_ulama: 'Imam An-Nawawi',
    kategori_kitab: 'Pokok Agama & Hadits',
    deskripsi:
      '42 hadits pondasi utama ajaran Islam yang mencakup pokok-pokok aqidah, syariat, muamalah, dan adab seorang muslim.',
    file_pdf_url: 'https://d1.islamhouse.com/data/id/ih_books/single/id_Arbaeen_Nawawi.pdf',
  },
  {
    id: 'kitab-3',
    judul_kitab: 'Safinatun Najah (Fiqih Ibadah)',
    penulis_ulama: 'Syaikh Salim bin Sumair Al-Hadhrami',
    kategori_kitab: 'Fiqih & Thaharah',
    deskripsi:
      'Kitab rujukan dasar fiqih mazhab Syafi’i mengenai rukun Islam, tata cara bersuci (thaharah), wudhu, dan pelaksanaan sholat.',
    file_pdf_url: 'https://d1.islamhouse.com/data/id/ih_books/single/id_Fiqh_Al_Muyassar.pdf',
  },
]

const ZONA_KAWASAN = [
  {
    kode: 'ZONA A',
    nama: 'Ruang Sholat Utama & Serambi',
    lokasi: 'Bangunan Utama (Lantai 1 & Lantai 2)',
    desc: 'Area ibadah utama pria dan wanita dengan arsitektur atap limas bersusun yang sejuk dan luas.',
  },
  {
    kode: 'ZONA B',
    nama: 'Gedung Islamic Center Karawang',
    lokasi: 'Sisi Kawasan Terpadu',
    desc: 'Pusat administrasi, aula serbaguna, pembinaan umat, serta pusat kegiatan keislaman Kabupaten Karawang.',
  },
  {
    kode: 'ZONA C',
    nama: 'Kantor MUI & Layanan Umat',
    lokasi: 'Kompleks Islamic Center',
    desc: 'Kantor Majelis Ulama Indonesia (MUI) Kabupaten Karawang, sekretariat DKM, dan layanan konsultasi syariah.',
  },
  {
    kode: 'ZONA D',
    nama: 'Wisma / Asrama Haji',
    lokasi: 'Area Kompleks Barat/Selatan',
    desc: 'Fasilitas pembinaan manasik, pemberangkatan jamaah haji, serta penginapan kegiatan keumatan.',
  },
  {
    kode: 'ZONA E',
    nama: 'Area Wudhu & Sanitasi Terpisah',
    lokasi: 'Sayap Kanan & Kiri Masjid',
    desc: 'Tempat wudhu dan kamar kecil bersih yang terpisah antara jamaah ikhwan (pria) dan akhwat (wanita).',
  },
  {
    kode: 'ZONA F',
    nama: 'Taman Terbuka & Area Parkir Luas',
    lokasi: 'Halaman Depan (Jl. Jend. Ahmad Yani)',
    desc: 'Area parkir kendaraan roda dua, mobil, dan bus jamaah tepat di seberang Lapangan Karangpawitan.',
  },
]

export default function ElJihadPage() {
  const [activeSection, setActiveSection] = useState<'quran_tajwid' | 'quran' | 'kitab' | 'navigasi'>('quran_tajwid')
  const [kitabList, setKitabList] = useState<KitabItem[]>(DEFAULT_KITAB)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase
      .from('kitab_eljihad')
      .select('*')
      .eq('aktif', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setKitabList([...data, ...DEFAULT_KITAB])
        }
      })
  }, [])

  return (
    <>
      <Navbar />
      <main>
        <div className={styles.pageHero}>
          <div className={styles.heroOverlay} />
          <div className="container">
            <div className={styles.heroContent}>
              <span className="section-badge white">Pusat Literasi & Layanan Digital</span>
              <h1 className={styles.heroTitle}>El Jihad</h1>
              <p className={styles.heroDesc}>
                Mushaf Al-Qur&apos;an Online Interaktif (30 Juz & 114 Surat dengan Murottal),
                Perpustakaan Kitab Digital Kajian, serta Navigasi Kawasan Masjid Al-Jihad Karawang
              </p>
            </div>
          </div>
        </div>

        <section className={styles.section}>
          <div className="container">
            {/* Navigasi 4 Fitur Utama El Jihad */}
            <div className={styles.elJihadNavBar}>
              <button
                type="button"
                className={`${styles.elJihadTabBtn} ${
                  activeSection === 'quran_tajwid' ? styles.elJihadTabBtnActive : ''
                }`}
                onClick={() => setActiveSection('quran_tajwid')}
              >
                Mushaf 15 Baris (Tajwid Berwarna)
              </button>
              <button
                type="button"
                className={`${styles.elJihadTabBtn} ${
                  activeSection === 'quran' ? styles.elJihadTabBtnActive : ''
                }`}
                onClick={() => setActiveSection('quran')}
              >
                Al-Qur&apos;an Per Ayat & Terjemahan
              </button>
              <button
                type="button"
                className={`${styles.elJihadTabBtn} ${
                  activeSection === 'kitab' ? styles.elJihadTabBtnActive : ''
                }`}
                onClick={() => setActiveSection('kitab')}
              >
                Perpustakaan Kitab Kajian ({kitabList.length})
              </button>
              <button
                type="button"
                className={`${styles.elJihadTabBtn} ${
                  activeSection === 'navigasi' ? styles.elJihadTabBtnActive : ''
                }`}
                onClick={() => setActiveSection('navigasi')}
              >
                Navigasi & Zona Kawasan Masjid
              </button>
            </div>

            {/* 1. MUSHAF HALAMAN PENUH 15 BARIS (TAJWID BERWARNA & MUROTTAL PER SURAT) */}
            <div style={{ display: activeSection === 'quran_tajwid' ? 'block' : 'none' }}>
              <QuranFullPageTajweed />
            </div>

            {/* 2. AL-QURAN PER AYAT (BUKU TERBUKA 3D + PER JUZ / PER SURAT + MUROTTAL PER AYAT) */}
            <div style={{ display: activeSection === 'quran' ? 'block' : 'none' }}>
              <QuranBookReader />
            </div>

            {/* 2. PERPUSTAKAAN KITAB DIGITAL (YANG DI-UPLOAD DARI ADMIN) */}
            <div style={{ display: activeSection === 'kitab' ? 'block' : 'none' }}>
              <div className={styles.kitabGrid}>
                {kitabList.map((kitab) => (
                  <div key={kitab.id} className={styles.kitabCard}>
                    <div>
                      <span className={styles.kitabCategory}>
                        {kitab.kategori_kitab || 'Kitab Kajian'}
                      </span>
                      <h3 className={styles.kitabTitle}>{kitab.judul_kitab}</h3>
                      <span className={styles.kitabAuthor}>
                        {kitab.penulis_ulama || 'Koleksi Kajian DKM Al-Jihad'}
                      </span>
                      <p className={styles.kitabDesc}>
                        {kitab.deskripsi ||
                          'Kitab rujukan kajian keislaman di Masjid Al-Jihad Karawang.'}
                      </p>
                    </div>
                    <a
                      href={kitab.file_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                    >
                      Buka / Unduh Kitab PDF →
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. NAVIGASI & ZONA KAWASAN MASJID */}
            <div style={{ display: activeSection === 'navigasi' ? 'block' : 'none' }}>
              <div className={styles.topGrid}>
                <div className={styles.mapCard}>
                  <span className={styles.cardBadge}>Peta Interaktif</span>
                  <h2 className={styles.cardTitle}>Lokasi Masjid Al-Jihad Karawang</h2>
                  <p className={styles.cardDesc}>
                    Jl. Jenderal Ahmad Yani, Kel. Karangpawitan, Kec. Karawang Barat, Kabupaten
                    Karawang, Jawa Barat (Seberang Lapangan Karangpawitan)
                  </p>

                  <div className={styles.mapFrameWrap}>
                    <iframe
                      title="Peta Lokasi Masjid Al-Jihad Karawang"
                      src="https://www.google.com/maps?q=Masjid+Al-Jihad+Karawang,+Jl.+Jenderal+Ahmad+Yani,+Karangpawitan,+Karawang&output=embed"
                      className={styles.mapFrame}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>

                  <div className={styles.mapFooter}>
                    <span className={styles.coordText}>
                      Titik Koordinat: 6°18&apos;07&quot;S 107°18&apos;14&quot;E
                    </span>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=Masjid+Al-Jihad+Karawang"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                    >
                      Buka di Google Maps →
                    </a>
                  </div>
                </div>

                <div className={styles.accessCard}>
                  <span className={styles.cardBadge}>Panduan Rute</span>
                  <h2 className={styles.cardTitle}>Akses Menuju Kawasan</h2>
                  <p className={styles.cardDesc}>
                    Masjid Al-Jihad berada di jalur protokol utama pusat Kota Karawang yang sangat
                    mudah diakses dari berbagai arah:
                  </p>

                  <div className={styles.routeList}>
                    <div className={styles.routeItem}>
                      <h4>Dari Arah Gerbang Tol Karawang Barat</h4>
                      <p>
                        Lurus mengikuti Jl. Akses Tol Karawang Barat menuju pusat kota / Jl.
                        Jenderal Ahmad Yani (Bypass). Masjid berada tepat di seberang Lapangan
                        Karangpawitan (±12–15 menit).
                      </p>
                    </div>
                    <div className={styles.routeItem}>
                      <h4>Dari Stasiun Kereta Api Karawang</h4>
                      <p>
                        Berjarak sekitar ±1,8 km ke arah Jl. Jenderal Ahmad Yani menuju kawasan
                        Stadion Singaperbangsa dan Lapangan Karangpawitan (±5 menit berkendara).
                      </p>
                    </div>
                    <div className={styles.routeItem}>
                      <h4>Dari Arah Klari / Karawang Timur</h4>
                      <p>
                        Mengikuti jalur utama Jl. Tuparev atau Jl. Ahmad Yani Bypass lurus ke arah
                        Karangpawitan hingga menemukan kompleks Islamic Center Karawang di sisi
                        jalan utama.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`section-header center ${styles.zoneHeader}`}>
                <h2 className="section-title">
                  Zona Kawasan <span>El Jihad & Islamic Center</span>
                </h2>
                <p className="section-subtitle">
                  Panduan area dan gedung fasilitas di dalam kompleks Masjid Al-Jihad Karawang
                </p>
              </div>

              <div className={styles.zoneGrid}>
                {ZONA_KAWASAN.map((zona) => (
                  <div key={zona.kode} className={styles.zoneCard}>
                    <span className={styles.zoneCode}>{zona.kode}</span>
                    <h3 className={styles.zoneTitle}>{zona.nama}</h3>
                    <span className={styles.zoneFloor}>{zona.lokasi}</span>
                    <p className={styles.zoneDesc}>{zona.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

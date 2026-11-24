'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import { SLIDE_PROFIL, FAKTA_MENARIK } from '@/components/Sejarah/SejarahSection'
import {
  ASET_MASJID_LIST,
  masjidStore,
  computeTotalKasMasjidRealtime,
  type LaporanKeuanganItem,
} from '@/lib/masjidStore'
import { formatRupiah, formatTanggalSlash } from '@/lib/keuanganPdf'
import styles from './profil.module.css'

const FASILITAS = [
  { icon: '🕌', label: 'Ruang Sholat Utama', desc: 'Kapasitas 500+ jamaah (2 Lantai)' },
  { icon: '📚', label: 'Perpustakaan Islam', desc: 'Koleksi kitab & literatur keislaman' },
  { icon: '🎓', label: 'TPA / Madrasah', desc: 'Pendidikan Al-Quran & Tahfidz' },
  { icon: '🚿', label: 'Fasilitas Wudhu', desc: 'Pria & wanita terpisah bersih' },
  { icon: '🅿️', label: 'Area Parkir Luas', desc: 'Halaman seberang Lapang Karangpawitan' },
  { icon: '🏛️', label: 'Kawasan Terpadu', desc: 'Islamic Center, Kantor MUI & Wisma Haji' },
]

const PENGURUS = [
  { jabatan: 'Ketua DKM', nama: 'H. Ahmad Fauzan, S.Ag.', periode: '2022-2026' },
  { jabatan: 'Wakil Ketua', nama: 'Ustaz Muhammad Ridwan', periode: '2022-2026' },
  { jabatan: 'Sekretaris', nama: 'Drs. Abdullah Rahman', periode: '2022-2026' },
  { jabatan: 'Bendahara', nama: 'H. Slamet Riyadi, S.E.', periode: '2022-2026' },
  { jabatan: 'Bid. Ibadah', nama: 'Ustaz Ibrahim Khalil', periode: '2022-2026' },
  { jabatan: 'Bid. Pendidikan', nama: 'Ustazah Fatimah, S.Pd.I.', periode: '2022-2026' },
]

const JEJAK_SEJARAH_LENGKAP = [
  {
    tahun: '1974',
    judul: 'Pendirian Bangunan Awal Berlapis Beton',
    desc: 'Masjid Al-Jihad Karawang pertama kali dibangun pada tahun 1974 dengan struktur beton berlantai dua. Pada masa awal berdirinya, bangunan masjid mengusung perpaduan arsitektur klasik-modern dengan ciri khas kubah kopula tunggal.',
  },
  {
    tahun: '2009',
    judul: 'Perombakan Total & Transformasi Arsitektur',
    desc: 'Bangunan lama tahun 1974 dirombak secara menyeluruh pada tahun 2009 untuk dibangun kembali menjadi wujud baru yang jauh lebih megah, luas, dan representatif bagi jamaah Karawang.',
  },
  {
    tahun: 'Kini',
    judul: 'Ikon Atap Limas Bersusun & Pusat Syiar Kota',
    desc: 'Hadir dengan desain geometris modern beratap limas bersusun khas Nusantara tanpa kubah bulat, menjadi pusat ibadah, dakwah, serta kegiatan keislaman masyarakat dan Pemerintah Kabupaten Karawang.',
  },
]

export default function ProfilPage() {
  const [slideIdx, setSlideIdx] = useState(0)
  const [factIdx, setFactIdx] = useState(0)
  const [keuanganList, setKeuanganList] = useState<LaporanKeuanganItem[]>([])
  const [saldoMap, setSaldoMap] = useState<Record<string, number>>({})
  const [transparansiFilter, setTransparansiFilter] = useState<'1_minggu' | '1_bulan'>('1_bulan')
  const [transparansiPage, setTransparansiPage] = useState(1)

  const syncKeuanganProfil = useCallback(() => {
    setKeuanganList(masjidStore.getKeuangan())
    setSaldoMap(masjidStore.getSaldoSebelumnyaMap())
  }, [])

  useEffect(() => {
    syncKeuanganProfil()
    window.addEventListener('aljihad-store-updated', syncKeuanganProfil)
    return () => window.removeEventListener('aljihad-store-updated', syncKeuanganProfil)
  }, [syncKeuanganProfil])

  useEffect(() => {
    const t1 = setInterval(() => setSlideIdx((p) => (p + 1) % SLIDE_PROFIL.length), 6500)
    const t2 = setInterval(() => setFactIdx((p) => (p + 1) % FAKTA_MENARIK.length), 6000)
    return () => {
      clearInterval(t1)
      clearInterval(t2)
    }
  }, [])

  const totalKasRealtime = computeTotalKasMasjidRealtime(keuanganList, saldoMap)

  // Ambil daftar pengeluaran terakhir (1 minggu terakhir & 1 bulan terakhir)
  const allPengeluaranSorted = [...keuanganList]
    .filter((it) => it.jenis !== 'Pemasukan')
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.createdAt.localeCompare(a.createdAt))

  const latestAnchorTs =
    allPengeluaranSorted.length > 0
      ? new Date(allPengeluaranSorted[0].tanggal + 'T23:59:59').getTime()
      : Date.now()

  const oneWeekCutoffTs = latestAnchorTs - 7 * 24 * 60 * 60 * 1000
  const oneMonthCutoffTs = latestAnchorTs - 31 * 24 * 60 * 60 * 1000

  const pengeluaran1Minggu = allPengeluaranSorted.filter(
    (it) => new Date(it.tanggal + 'T12:00:00').getTime() >= oneWeekCutoffTs
  )
  const pengeluaran1Bulan = allPengeluaranSorted.filter(
    (it) => new Date(it.tanggal + 'T12:00:00').getTime() >= oneMonthCutoffTs
  )

  const activePengeluaranTransparansi =
    transparansiFilter === '1_minggu' ? pengeluaran1Minggu : pengeluaran1Bulan

  const ITEMS_PER_PAGE = 8
  const totalPagesTransparansi = Math.max(
    1,
    Math.ceil(activePengeluaranTransparansi.length / ITEMS_PER_PAGE)
  )
  const currentSafePage = Math.min(transparansiPage, totalPagesTransparansi)
  const paginatedPengeluaran = activePengeluaranTransparansi.slice(
    (currentSafePage - 1) * ITEMS_PER_PAGE,
    currentSafePage * ITEMS_PER_PAGE
  )

  return (
    <>
      <Navbar />
      <main>
        {/* Page Hero */}
        <div className={styles.pageHero}>
          <div className={styles.heroOverlay} />
          <div className="container">
            <div className={styles.heroContent}>
              <span className="section-badge white">Tentang Kami</span>
              <h1 className={styles.heroTitle}>Profil & Sejarah Masjid Al-Jihad</h1>
              <p className={styles.heroDesc}>
                Mengenal lebih dekat Masjid Al-Jihad Karawang — identitas, sejarah lengkap, visi
                misi, fasilitas, dan kepengurusan DKM
              </p>
            </div>
          </div>
        </div>

        {/* Profil Content */}
        <section className={`section ${styles.profilSection}`}>
          <div className="container">
            <div className={styles.profilGrid}>
              <div className={styles.profilText}>
                <span className="section-badge">Identitas Masjid</span>
                <h2 className="section-title">
                  Profil <span>Lengkap</span>
                </h2>
                <div className={styles.profilTable}>
                  {[
                    { label: 'Nama Masjid', value: 'Masjid Al-Jihad Karawang' },
                    {
                      label: 'Alamat',
                      value:
                        'Jl. Jenderal Ahmad Yani, Karangpawitan, Kec. Karawang Barat, Kab. Karawang, Jawa Barat',
                    },
                    { label: 'Tahun Berdiri', value: '1974 (Pemugaran Total: 2009)' },
                    {
                      label: 'Arsitektur',
                      value: 'Geometris Modern & Atap Limas Bersusun Nusantara (2 Lantai)',
                    },
                    {
                      label: 'Kawasan Terpadu',
                      value: 'Islamic Center Karawang, Kantor MUI & Wisma Haji',
                    },
                    {
                      label: 'Landmark Sekitar',
                      value: 'Seberang Lapangan Karangpawitan & Stadion Singaperbangsa',
                    },
                    { label: 'No. Telp', value: '+62 812 3456 7890' },
                    { label: 'Email', value: 'dkm@masjidaljihad.or.id' },
                  ].map((item) => (
                    <div key={item.label} className={styles.tableRow}>
                      <span className={styles.tableLabel}>{item.label}</span>
                      <span className={styles.tableSep}>:</span>
                      <span className={styles.tableValue}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.profilVisi}>
                <div className={styles.visiCard}>
                  <h3>Visi</h3>
                  <p>
                    Menjadi masjid yang makmur sebagai pusat ibadah, dakwah, pendidikan, dan
                    pemberdayaan umat Islam yang unggul dan bermartabat di Kabupaten Karawang.
                  </p>
                </div>
                <div className={styles.misiCard}>
                  <h3>Misi</h3>
                  <ul>
                    <li>Menyelenggarakan ibadah secara tertib, nyaman, dan khusyu&apos;</li>
                    <li>Mengembangkan pendidikan Al-Qur&apos;an dan kajian Islam berkualitas</li>
                    <li>Meningkatkan pelayanan sosial, zakat, infaq, dan kesejahteraan umat</li>
                    <li>Membangun generasi Islam Karawang yang berakhlak mulia</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sejarah Lengkap (Dipindahkan dari Halaman Utama) */}
        <section id="sejarah" className={`section ${styles.sejarahSection}`}>
          <div className="container">
            <div className="section-header center">
              <h2 className="section-title">
                Sejarah <span>Masjid Al-Jihad Karawang</span>
              </h2>
            </div>

            <div className={styles.sejarahFullGrid}>
              {/* Kolom Kiri: Slide Gambar + Narasi Lengkap */}
              <div className={styles.sejarahLeftCol}>
                <div className={styles.profilSliderCard}>
                  {SLIDE_PROFIL.map((slide, idx) => (
                    <div
                      key={idx}
                      className={`${styles.profilSlideItem} ${
                        idx === slideIdx ? styles.profilSlideActive : ''
                      }`}
                    >
                      <Image
                        src={slide.src}
                        alt={slide.title}
                        fill
                        unoptimized
                        sizes="(max-width: 992px) 100vw, 50vw"
                        className={styles.profilSlideImg}
                      />
                      <div className={styles.profilSlideOverlay} />
                      <span className={styles.profilSlideTag}>{slide.tag}</span>
                      <div className={styles.profilSlideCaption}>
                        <span className={styles.profilSlideBadge}>{slide.badge}</span>
                        <h3 className={styles.profilSlideTitle}>{slide.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.sejarahNarrativeBox}>
                  <h3>Sejarah Masjid Al-Jihad & Kawasan Islamic Center Karawang</h3>
                  <p>
                    <strong>Masjid Al-Jihad Karawang</strong> berdiri di lokasi yang sangat
                    strategis di pusat keramaian Kota Karawang, tepatnya di{' '}
                    <strong>
                      Jl. Jenderal Ahmad Yani, Kelurahan Karangpawitan, Kecamatan Karawang Barat
                    </strong>{' '}
                    — berhadapan langsung dengan <strong>Lapangan Karangpawitan</strong> dan tidak
                    jauh dari Stadion Singaperbangsa. Karena kemegahannya serta posisinya yang
                    menyatu dalam satu kawasan dengan{' '}
                    <strong>Islamic Center Kabupaten Karawang</strong>, Kantor MUI, dan Wisma Haji,
                    masjid ini kerap disangka masyarakat sebagai Masjid Agung Karawang.
                  </p>
                  <p>
                    Pertama kali didirikan pada tahun <strong>1974</strong> dengan struktur beton
                    berlantai dua berkubah kopula tunggal, bangunan lama Masjid Al-Jihad kemudian
                    dirombak total pada tahun <strong>2009</strong>. Kini, bangunan utamanya tampil
                    megah memadukan konsep geometris modern kontemporer dengan kearifan lokal
                    Nusantara melalui ciri khas <strong>atap limas bersusun</strong>.
                  </p>
                </div>
              </div>

              {/* Kolom Kanan: Timeline Jejak Sejarah + Fakta Menarik */}
              <div className={styles.sejarahRightCol}>
                <div className={styles.sejarahTimelineCard}>
                  <div className={styles.sejarahTimeline}>
                    {JEJAK_SEJARAH_LENGKAP.map((item, idx) => (
                      <div key={item.tahun} className={styles.timelineItem}>
                        <div className={styles.timelineYear}>{item.tahun}</div>
                        <div className={styles.timelineLine}>
                          <div className={styles.timelineDot} />
                          {idx < JEJAK_SEJARAH_LENGKAP.length - 1 && (
                            <div className={styles.timelineConnector} />
                          )}
                        </div>
                        <div className={styles.timelineContent}>
                          <h4>{item.judul}</h4>
                          <p>{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.sejarahFactCard}>
                  <span>Fakta Menarik</span>
                  <h4>{FAKTA_MENARIK[factIdx].judul}</h4>
                  <p>{FAKTA_MENARIK[factIdx].isi}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fasilitas */}
        <section className={`section ${styles.fasilitasSection}`}>
          <div className="container">
            <div className="section-header center">
              <span className="section-badge">Sarana & Prasarana</span>
              <h2 className="section-title">
                Fasilitas <span>Masjid</span>
              </h2>
            </div>
            <div className="grid-3">
              {FASILITAS.map((f) => (
                <div key={f.label} className={styles.fasilitasCard}>
                  <span className={styles.fasilitasIcon}>{f.icon}</span>
                  <h4 className={styles.fasilitasLabel}>{f.label}</h4>
                  <p className={styles.fasilitasDesc}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pengurus */}
        <section className={`section ${styles.pengurusSection}`}>
          <div className="container">
            <div className="section-header center">
              <span className="section-badge">Organisasi</span>
              <h2 className="section-title">
                Pengurus <span>DKM Al-Jihad</span>
              </h2>
              <p className="section-subtitle">Periode 2022 - 2026</p>
            </div>
            <div className="grid-3">
              {PENGURUS.map((p) => (
                <div key={p.jabatan} className={styles.pengurusCard}>
                  <div className={styles.pengurusAvatar}>
                    <span>👤</span>
                  </div>
                  <div className={styles.pengurusInfo}>
                    <span className={styles.pengurusJabatan}>{p.jabatan}</span>
                    <h4 className={styles.pengurusNama}>{p.nama}</h4>
                    <span className={styles.pengurusPeriode}>{p.periode}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* My.DKM: Daftar Aset Masjid & Transparansi Keuangan / Pengeluaran Terakhir */}
        <section id="aset-masjid" className={`section ${styles.fasilitasSection}`}>
          <div className="container">
            <div className="section-header center">
              <span className="section-badge">Portal My.DKM Al-Jihad</span>
              <h2 className="section-title">
                Inventaris Aset &amp; <span>Transparansi Kas Masjid</span>
              </h2>
              <p className="section-subtitle">
                Informasi terbuka daftar perlengkapan aset Masjid Al-Jihad serta laporan pengeluaran
                terakhir dan total kas masjid secara realtime
              </p>
            </div>

            {/* BARIS HALAMAN TRANSPARANSI KEUANGAN & TOTAL KAS MASJID REALTIME */}
            <div
              style={{
                maxWidth: '940px',
                margin: '0 auto 32px',
                background: '#ffffff',
                borderRadius: '18px',
                padding: '24px',
                border: '1px solid rgba(27, 107, 69, 0.18)',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
              }}
            >
              {/* Banner Total Kas Masjid Realtime */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                  gap: '14px',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    padding: '16px 18px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #0f4a2a, #15803d)',
                    color: '#ffffff',
                    boxShadow: '0 8px 22px rgba(15, 74, 42, 0.22)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      opacity: 0.92,
                      marginBottom: '4px',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '999px',
                        background: '#4ade80',
                        display: 'inline-block',
                      }}
                    />
                    TOTAL KAS MASJID REALTIME
                  </div>
                  <div style={{ fontSize: '1.42rem', fontWeight: 900 }}>
                    {formatRupiah(totalKasRealtime)}
                  </div>
                  <div style={{ fontSize: '0.73rem', opacity: 0.85, marginTop: '3px' }}>
                    Otomatis menyesuaikan dari saldo awal &amp; mutasi BKU DKM
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px 18px',
                    borderRadius: '14px',
                    background: '#f0fdf4',
                    border: '1px solid rgba(22, 163, 74, 0.25)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: '#166534',
                      marginBottom: '4px',
                    }}
                  >
                    PENGELUARAN 1 MINGGU TERAKHIR
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#dc2626' }}>
                    {formatRupiah(
                      pengeluaran1Minggu.reduce((acc, i) => acc + (Number(i.nominal) || 0), 0)
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#4b5563', marginTop: '3px' }}>
                    {`${pengeluaran1Minggu.length} transaksi tercatat`}
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px 18px',
                    borderRadius: '14px',
                    background: '#f0fdf4',
                    border: '1px solid rgba(22, 163, 74, 0.25)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: '#166534',
                      marginBottom: '4px',
                    }}
                  >
                    PENGELUARAN 1 BULAN TERAKHIR
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#dc2626' }}>
                    {formatRupiah(
                      pengeluaran1Bulan.reduce((acc, i) => acc + (Number(i.nominal) || 0), 0)
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#4b5563', marginTop: '3px' }}>
                    {`${pengeluaran1Bulan.length} transaksi tercatat`}
                  </div>
                </div>
              </div>

              {/* Header Filter 1 Minggu Terakhir vs 1 Bulan Terakhir */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '1.08rem',
                      fontWeight: 800,
                      color: '#0f4a2a',
                    }}
                  >
                    Display Pengeluaran Masjid Al-Jihad
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 600 }}>
                    Transparansi rincian pengeluaran 1 minggu &amp; 1 bulan terakhir (terhubung otomatis dari BKU Admin)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setTransparansiFilter('1_minggu')
                      setTransparansiPage(1)
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '9px',
                      border:
                        transparansiFilter === '1_minggu'
                          ? '1px solid #0f4a2a'
                          : '1px solid rgba(27, 107, 69, 0.25)',
                      background: transparansiFilter === '1_minggu' ? '#0f4a2a' : '#f0fdf4',
                      color: transparansiFilter === '1_minggu' ? '#ffffff' : '#14532d',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    {`1 Minggu Terakhir (${pengeluaran1Minggu.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransparansiFilter('1_bulan')
                      setTransparansiPage(1)
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '9px',
                      border:
                        transparansiFilter === '1_bulan'
                          ? '1px solid #0f4a2a'
                          : '1px solid rgba(27, 107, 69, 0.25)',
                      background: transparansiFilter === '1_bulan' ? '#0f4a2a' : '#f0fdf4',
                      color: transparansiFilter === '1_bulan' ? '#ffffff' : '#14532d',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    {`1 Bulan Terakhir (${pengeluaran1Bulan.length})`}
                  </button>
                </div>
              </div>

              {/* Tabel Pengeluaran Terakhir dengan Baris Halaman (Pagination) */}
              <div
                style={{
                  overflowX: 'auto',
                  borderRadius: '12px',
                  border: '1px solid rgba(27, 107, 69, 0.18)',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.85rem',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: '#0f4a2a',
                        color: '#ffffff',
                        textAlign: 'left',
                      }}
                    >
                      <th style={{ padding: '10px 12px', width: '50px' }}>No</th>
                      <th style={{ padding: '10px 12px', width: '115px' }}>Tanggal</th>
                      <th style={{ padding: '10px 12px' }}>Uraian Pengeluaran</th>
                      <th style={{ padding: '10px 12px' }}>Kategori</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Jumlah (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPengeluaran.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            padding: '22px',
                            textAlign: 'center',
                            color: '#6b7280',
                            fontWeight: 600,
                          }}
                        >
                          Belum ada data pengeluaran pada rentang waktu ini.
                        </td>
                      </tr>
                    ) : (
                      paginatedPengeluaran.map((item, idx) => {
                        const rowNo = (currentSafePage - 1) * ITEMS_PER_PAGE + idx + 1
                        return (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom: '1px solid #e5e7eb',
                              background: idx % 2 === 0 ? '#ffffff' : '#f8faf8',
                            }}
                          >
                            <td
                              style={{
                                padding: '9px 12px',
                                fontWeight: 700,
                                color: '#6b7280',
                              }}
                            >
                              {rowNo}
                            </td>
                            <td
                              style={{
                                padding: '9px 12px',
                                fontWeight: 700,
                                color: '#14532d',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatTanggalSlash(item.tanggal)}
                            </td>
                            <td
                              style={{
                                padding: '9px 12px',
                                fontWeight: 800,
                                color: '#111827',
                              }}
                            >
                              {item.uraian}
                            </td>
                            <td style={{ padding: '9px 12px', color: '#374151' }}>
                              {item.kategori}
                            </td>
                            <td
                              style={{
                                padding: '9px 12px',
                                textAlign: 'right',
                                fontWeight: 800,
                                color: '#991b1b',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatRupiah(item.nominal)}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Baris Halaman (Pagination Controls) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  marginTop: '14px',
                }}
              >
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 700 }}>
                  {`Menampilkan halaman ${currentSafePage} dari ${totalPagesTransparansi} (${activePengeluaranTransparansi.length} catatan pengeluaran)`}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={currentSafePage <= 1}
                    onClick={() => setTransparansiPage((p) => Math.max(1, p - 1))}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(27, 107, 69, 0.25)',
                      background: '#ffffff',
                      color: '#0f4a2a',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: currentSafePage > 1 ? 'pointer' : 'not-allowed',
                      opacity: currentSafePage > 1 ? 1 : 0.45,
                    }}
                  >
                    ‹ Sebelumnya
                  </button>

                  {Array.from({ length: totalPagesTransparansi }, (_, i) => i + 1).map(
                    (pgNum) => (
                      <button
                        key={pgNum}
                        type="button"
                        onClick={() => setTransparansiPage(pgNum)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border:
                            pgNum === currentSafePage
                              ? '1px solid #0f4a2a'
                              : '1px solid rgba(27, 107, 69, 0.22)',
                          background: pgNum === currentSafePage ? '#0f4a2a' : '#f0fdf4',
                          color: pgNum === currentSafePage ? '#ffffff' : '#14532d',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                        }}
                      >
                        {pgNum}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    disabled={currentSafePage >= totalPagesTransparansi}
                    onClick={() =>
                      setTransparansiPage((p) => Math.min(totalPagesTransparansi, p + 1))
                    }
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(27, 107, 69, 0.25)',
                      background: '#ffffff',
                      color: '#0f4a2a',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor:
                        currentSafePage < totalPagesTransparansi ? 'pointer' : 'not-allowed',
                      opacity: currentSafePage < totalPagesTransparansi ? 1 : 0.45,
                    }}
                  >
                    Berikutnya ›
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                maxWidth: '940px',
                margin: '0 auto',
                background: '#ffffff',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid rgba(27, 107, 69, 0.16)',
                boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)',
              }}
            >
              <h3
                style={{
                  margin: '0 0 12px',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: '#0f4a2a',
                }}
              >
                Daftar Inventaris Aset Masjid Al-Jihad
              </h3>
              <div style={{ maxHeight: '420px', overflowY: 'auto', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr
                      style={{
                        background: '#0f4a2a',
                        color: '#ffffff',
                        position: 'sticky',
                        top: 0,
                        textAlign: 'left',
                      }}
                    >
                      <th style={{ padding: '10px 12px', width: '52px' }}>No</th>
                      <th style={{ padding: '10px 12px' }}>Nama Barang</th>
                      <th style={{ padding: '10px 12px' }}>Kategori</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ASET_MASJID_LIST.map((item, idx) => (
                      <tr
                        key={item.nama}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          background: idx % 2 === 0 ? '#ffffff' : '#f8faf8',
                        }}
                      >
                        <td style={{ padding: '9px 12px', fontWeight: 700, color: '#4b5563' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '9px 12px', fontWeight: 700, color: '#111827' }}>
                          {item.nama}
                        </td>
                        <td style={{ padding: '9px 12px', color: '#374151' }}>{item.kategori}</td>
                        <td
                          style={{
                            padding: '9px 12px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: '#15803d',
                          }}
                        >
                          {item.stok}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

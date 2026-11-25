'use client'

import { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import {
  ASET_MASJID_LIST,
  masjidStore,
  computeTotalKasMasjidRealtime,
  type LaporanKeuanganItem,
} from '@/lib/masjidStore'
import { formatRupiah, formatTanggalSlash } from '@/lib/keuanganPdf'
import styles from './mydkm.module.css'

const PENGURUS_DKM_SLIDES = [
  {
    inisial: 'AK',
    jabatan: 'Ketua DKM Masjid Al-Jihad',
    nama: 'Drs. H. Acep Kusnadi, M.Pd., C.Med.',
    bidang: 'Pimpinan Umum & Kebijakan Strategis DKM',
    periode: 'Periode 2022 – 2026',
  },
  {
    inisial: 'AF',
    jabatan: 'Bendahara Umum DKM',
    nama: 'Dr. K.H. Asep Khareul Faizin, MM',
    bidang: 'Pengelolaan Kas, BKU & Transparansi Keuangan Masjid',
    periode: 'Periode 2022 – 2026',
  },
  {
    inisial: 'MR',
    jabatan: 'Wakil Ketua DKM',
    nama: 'Ustaz Muhammad Ridwan',
    bidang: 'Koordinator Program Dakwah & Kemakmuran Masjid',
    periode: 'Periode 2022 – 2026',
  },
  {
    inisial: 'AR',
    jabatan: 'Sekretaris Umum DKM',
    nama: 'Drs. Abdullah Rahman',
    bidang: 'Administrasi Surat Menyurat, Jadwal & Arsip Resmi',
    periode: 'Periode 2022 – 2026',
  },
  {
    inisial: 'IK',
    jabatan: 'Ketua Bidang Ibadah & Kajian',
    nama: 'Ustaz Ibrahim Khalil',
    bidang: 'Koordinator Khatib, Imam, Bilal & Kajian Pekanan',
    periode: 'Periode 2022 – 2026',
  },
  {
    inisial: 'FT',
    jabatan: 'Ketua Bidang Pendidikan & Sosial',
    nama: 'Ustazah Fatimah, S.Pd.I.',
    bidang: 'TPA / Tahfidz, Santunan Sosial & Pembinaan Jamaah',
    periode: 'Periode 2022 – 2026',
  },
]

export default function MyDkmPage() {
  const [keuanganList, setKeuanganList] = useState<LaporanKeuanganItem[]>([])
  const [saldoMap, setSaldoMap] = useState<Record<string, number>>({})
  const [transparansiFilter, setTransparansiFilter] = useState<'1_minggu' | '1_bulan'>('1_bulan')
  const [transparansiPage, setTransparansiPage] = useState(1)

  const [pengurusSlideIdx, setPengurusSlideIdx] = useState(0)
  const [slidePaused, setSlidePaused] = useState(false)

  const syncKeuangan = useCallback(() => {
    setKeuanganList(masjidStore.getKeuangan())
    setSaldoMap(masjidStore.getSaldoSebelumnyaMap())
  }, [])

  useEffect(() => {
    syncKeuangan()
    window.addEventListener('aljihad-store-updated', syncKeuangan)
    return () => window.removeEventListener('aljihad-store-updated', syncKeuangan)
  }, [syncKeuangan])

  // Auto-slide Pengurus DKM setiap 3.8 detik (berhenti sementara saat kursor diarahkan)
  useEffect(() => {
    if (slidePaused) return
    const timer = window.setInterval(() => {
      setPengurusSlideIdx((prev) => (prev + 1) % PENGURUS_DKM_SLIDES.length)
    }, 3800)
    return () => window.clearInterval(timer)
  }, [slidePaused])

  // Hitung data transparansi keuangan
  const totalKasRealtime = computeTotalKasMasjidRealtime(keuanganList, saldoMap)
  const allPengeluaranSorted = keuanganList
    .filter((i) => i.jenis !== 'Pemasukan')
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))

  const latestTglStr = allPengeluaranSorted[0]?.tanggal || new Date().toISOString().slice(0, 10)
  const latestTglMs = new Date(`${latestTglStr}T12:00:00`).getTime()
  const dayMs = 24 * 60 * 60 * 1000

  const pengeluaran1Minggu = allPengeluaranSorted.filter((item) => {
    const tMs = new Date(`${item.tanggal}T12:00:00`).getTime()
    return !Number.isNaN(tMs) && latestTglMs - tMs <= 7 * dayMs
  })
  const pengeluaran1Bulan = allPengeluaranSorted.filter((item) => {
    const tMs = new Date(`${item.tanggal}T12:00:00`).getTime()
    return !Number.isNaN(tMs) && latestTglMs - tMs <= 31 * dayMs
  })

  const filteredTransparansi =
    transparansiFilter === '1_minggu' ? pengeluaran1Minggu : pengeluaran1Bulan
  const perPageTransparansi = 8
  const totalPagesTransparansi = Math.max(
    1,
    Math.ceil(filteredTransparansi.length / perPageTransparansi)
  )
  const currentSafePage = Math.min(transparansiPage, totalPagesTransparansi)
  const pagedTransparansi = filteredTransparansi.slice(
    (currentSafePage - 1) * perPageTransparansi,
    currentSafePage * perPageTransparansi
  )

  return (
    <>
      <Navbar />
      <main>
        {/* 1. OPENING HALAMAN MY.DKM DENGAN ANIMASI */}
        <section id="opening" className={styles.heroOpening}>
          <div className={styles.glowOrbOne} />
          <div className={styles.glowOrbTwo} />
          <div className="container">
            <div className={styles.heroContent}>
              <div className={styles.heroBadge}>Portal Resmi My.DKM Al-Jihad</div>
              <h1 className={styles.heroTitle}>
                Transparansi &amp; Tata Kelola{' '}
                <span className={styles.heroTitleAccent}>Masjid Al-Jihad</span>
              </h1>
              <p className={styles.heroDesc}>
                Akses informasi terbuka mengenai posisi kas masjid secara realtime, catatan
                pengeluaran terkini, inventaris aset resmi DKM, serta susunan pengurus Masjid
                Al-Jihad Islamic Center Karawang.
              </p>
              <div className={styles.heroQuickNav}>
                <a href="#transparansi" className={styles.heroQuickBtn}>
                  Transparansi Kas
                </a>
                <a href="#aset" className={styles.heroQuickBtn}>
                  Inventaris Aset
                </a>
                <a href="#pengurus-struktur" className={styles.heroQuickBtn}>
                  Pengurus &amp; Struktur DKM
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 2. TRANSPARANSI KEUANGAN & DISPLAY PENGELUARAN */}
        <section id="transparansi" className={styles.sectionLight}>
          <div className="container">
            <div className="section-header center">
              <span className="section-badge">Transparansi Keuangan</span>
              <h2 className="section-title">
                Display Pengeluaran &amp; <span>Kas Masjid Realtime</span>
              </h2>
              <p className="section-subtitle">
                Terhubung langsung dengan pembukuan BKU Bendahara DKM Masjid Al-Jihad Karawang
              </p>
            </div>

            <div
              style={{
                maxWidth: '940px',
                margin: '0 auto',
                background: '#ffffff',
                borderRadius: '18px',
                padding: '24px',
                border: '1px solid rgba(27, 107, 69, 0.18)',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
              }}
            >
              {/* Banner Total Kas Masjid Realtime & Ringkasan Pengeluaran */}
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
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: '#111827',
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
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: '#111827',
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

              {/* Filter 1 Minggu Terakhir vs 1 Bulan Terakhir */}
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
                    Menampilkan rincian pengeluaran dalam rentang 1 minggu &amp; 1 bulan terakhir
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

              <div style={{ overflowX: 'auto', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ background: '#f0fdf4', color: '#0f4a2a', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px', borderBottom: '2px solid #bbf7d0' }}>
                        Tanggal
                      </th>
                      <th style={{ padding: '10px 12px', borderBottom: '2px solid #bbf7d0' }}>
                        Uraian Pengeluaran
                      </th>
                      <th style={{ padding: '10px 12px', borderBottom: '2px solid #bbf7d0' }}>
                        Kategori
                      </th>
                      <th
                        style={{
                          padding: '10px 12px',
                          borderBottom: '2px solid #bbf7d0',
                          textAlign: 'right',
                        }}
                      >
                        Nominal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTransparansi.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            padding: '18px',
                            textAlign: 'center',
                            color: '#6b7280',
                            fontWeight: 600,
                          }}
                        >
                          Belum ada data pengeluaran pada rentang waktu ini.
                        </td>
                      </tr>
                    ) : (
                      pagedTransparansi.map((item, idx) => (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: '1px solid #e5e7eb',
                            background: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                          }}
                        >
                          <td style={{ padding: '9px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {formatTanggalSlash(item.tanggal)}
                          </td>
                          <td style={{ padding: '9px 12px', fontWeight: 600, color: '#111827' }}>
                            {item.uraian}
                          </td>
                          <td style={{ padding: '9px 12px', color: '#4b5563' }}>{item.kategori}</td>
                          <td
                            style={{
                              padding: '9px 12px',
                              textAlign: 'right',
                              fontWeight: 800,
                              color: '#dc2626',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatRupiah(item.nominal)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '14px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 600 }}>
                  {`Halaman ${currentSafePage} dari ${totalPagesTransparansi} • Total ${filteredTransparansi.length} transaksi`}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
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
                      cursor: currentSafePage < totalPagesTransparansi ? 'pointer' : 'not-allowed',
                      opacity: currentSafePage < totalPagesTransparansi ? 1 : 0.45,
                    }}
                  >
                    Berikutnya ›
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. DAFTAR INVENTARIS ASET MASJID AL-JIHAD */}
        <section id="aset" className={styles.sectionWhite}>
          <div className="container">
            <div className="section-header center">
              <span className="section-badge">Inventaris DKM</span>
              <h2 className="section-title">
                Daftar Aset &amp; <span>Perlengkapan Masjid</span>
              </h2>
              <p className="section-subtitle">
                Daftar sarana, prasarana, dan perlengkapan milik Masjid Al-Jihad Islamic Center
                Karawang
              </p>
            </div>

            <div
              style={{
                maxWidth: '940px',
                margin: '0 auto',
                background: '#ffffff',
                borderRadius: '18px',
                padding: '22px',
                border: '1px solid rgba(27, 107, 69, 0.16)',
                boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)',
              }}
            >
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

        {/* 4. PALING BAWAH: AUTO-SLIDE PENGURUS DKM & STRUKTUR ORGANISASI DKM */}
        <section id="pengurus-struktur" className={styles.sectionLight}>
          <div className="container">
            <div className="section-header center">
              <span className="section-badge">Kepengurusan Resmi</span>
              <h2 className="section-title">
                Slide Pengurus &amp; <span>Struktur DKM Al-Jihad</span>
              </h2>
              <p className="section-subtitle">
                Susunan Dewan Kemakmuran Masjid Al-Jihad Islamic Center Karawang
              </p>
            </div>

            {/* Auto-Slide Pengurus DKM */}
            <div
              style={{ maxWidth: '860px', margin: '0 auto 44px' }}
              onMouseEnter={() => setSlidePaused(true)}
              onMouseLeave={() => setSlidePaused(false)}
            >
              <div className={styles.sliderViewport}>
                <div
                  className={styles.sliderTrack}
                  style={{ transform: `translateX(-${pengurusSlideIdx * 100}%)` }}
                >
                  {PENGURUS_DKM_SLIDES.map((p) => (
                    <div key={p.nama} className={styles.slideCard}>
                      <div className={styles.avatarCircle}>{p.inisial}</div>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: '#dcfce7',
                            color: '#166534',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            marginBottom: '6px',
                          }}
                        >
                          {p.jabatan}
                        </span>
                        <h3
                          style={{
                            margin: '0 0 4px',
                            fontSize: '1.22rem',
                            fontWeight: 900,
                            color: '#111827',
                          }}
                        >
                          {p.nama}
                        </h3>
                        <p
                          style={{
                            margin: '0 0 4px',
                            fontSize: '0.86rem',
                            color: '#374151',
                            fontWeight: 600,
                          }}
                        >
                          {p.bidang}
                        </p>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 700 }}>
                          {p.periode}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kontrol Navigasi Slide + Indikator Titik */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '14px',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setPengurusSlideIdx(
                      (prev) => (prev - 1 + PENGURUS_DKM_SLIDES.length) % PENGURUS_DKM_SLIDES.length
                    )
                  }
                  style={{
                    padding: '7px 14px',
                    borderRadius: '9px',
                    border: '1px solid rgba(27, 107, 69, 0.25)',
                    background: '#ffffff',
                    color: '#0f4a2a',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  ‹ Sebelumnya
                </button>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {PENGURUS_DKM_SLIDES.map((p, idx) => (
                    <button
                      key={p.nama}
                      type="button"
                      aria-label={`Slide ${idx + 1}`}
                      onClick={() => setPengurusSlideIdx(idx)}
                      style={{
                        width: idx === pengurusSlideIdx ? '22px' : '8px',
                        height: '8px',
                        borderRadius: '999px',
                        border: 'none',
                        background: idx === pengurusSlideIdx ? '#0f4a2a' : '#cbd5e1',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                      }}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPengurusSlideIdx((prev) => (prev + 1) % PENGURUS_DKM_SLIDES.length)
                  }
                  style={{
                    padding: '7px 14px',
                    borderRadius: '9px',
                    border: '1px solid rgba(27, 107, 69, 0.25)',
                    background: '#ffffff',
                    color: '#0f4a2a',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Berikutnya ›
                </button>
              </div>
            </div>

            {/* Struktur Organisasi DKM Al-Jihad */}
            <div className={styles.orgTreeWrap}>
              <div className={`${styles.orgBox} ${styles.orgBoxPrimary}`}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.88 }}>
                  PIMPINAN UMUM DKM
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 900, marginTop: '2px' }}>
                  Ketua DKM Masjid Al-Jihad
                </div>
                <div style={{ fontSize: '0.82rem', marginTop: '4px', opacity: 0.94 }}>
                  Drs. H. Acep Kusnadi, M.Pd., C.Med.
                </div>
              </div>

              <div className={styles.orgConnectorV} />

              <div className={styles.orgRow} style={{ maxWidth: '680px' }}>
                <div className={styles.orgBox}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d' }}>
                    WAKIL KETUA
                  </div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#111827', marginTop: '3px' }}>
                    Ustaz Muhammad Ridwan
                  </div>
                </div>
                <div className={styles.orgBox}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d' }}>
                    SEKRETARIS UMUM
                  </div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#111827', marginTop: '3px' }}>
                    Drs. Abdullah Rahman
                  </div>
                </div>
                <div className={styles.orgBox}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d' }}>
                    BENDAHARA UMUM
                  </div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#111827', marginTop: '3px' }}>
                    Dr. K.H. Asep Khareul Faizin, MM
                  </div>
                </div>
              </div>

              <div className={styles.orgConnectorV} />

              <div className={styles.orgRow}>
                <div className={styles.orgBox}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f4a2a' }}>
                    BIDANG IMARAH (IBADAH &amp; DAKWAH)
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827', marginTop: '3px' }}>
                    Ustaz Ibrahim Khalil
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#4b5563', marginTop: '2px' }}>
                    Kajian Pekanan, Khutbah Jumat &amp; PHBI
                  </div>
                </div>
                <div className={styles.orgBox}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f4a2a' }}>
                    BIDANG PENDIDIKAN &amp; SOSIAL
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827', marginTop: '3px' }}>
                    Ustazah Fatimah, S.Pd.I.
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#4b5563', marginTop: '2px' }}>
                    TPA / Tahfidz, Infaq &amp; Santunan Jamaah
                  </div>
                </div>
                <div className={styles.orgBox}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f4a2a' }}>
                    BIDANG RI&apos;AYAH &amp; ASET
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827', marginTop: '3px' }}>
                    Tim Sarana &amp; Prasarana DKM
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#4b5563', marginTop: '2px' }}>
                    Pemeliharaan Gedung, Kebersihan &amp; Aset
                  </div>
                </div>
                <div className={styles.orgBox}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f4a2a' }}>
                    HUMAS &amp; MEDIA DIGITAL
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827', marginTop: '3px' }}>
                    Tim Publikasi Masjid Al-Jihad
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#4b5563', marginTop: '2px' }}>
                    Dokumentasi, Poster &amp; Layanan Informasi
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

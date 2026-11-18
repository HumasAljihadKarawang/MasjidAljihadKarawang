'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import { SLIDE_PROFIL, FAKTA_MENARIK } from '@/components/Sejarah/SejarahSection'
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

  useEffect(() => {
    const t1 = setInterval(() => setSlideIdx((p) => (p + 1) % SLIDE_PROFIL.length), 6500)
    const t2 = setInterval(() => setFactIdx((p) => (p + 1) % FAKTA_MENARIK.length), 6000)
    return () => {
      clearInterval(t1)
      clearInterval(t2)
    }
  }, [])

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
        {/* Daftar Aset Masjid */}
        <section id="aset-masjid" className={`section ${styles.fasilitasSection}`}>
          <div className="container">
            <div className="section-header center">
              <span className="section-badge">Inventaris DKM</span>
              <h2 className="section-title">
                Daftar <span>Aset Masjid</span>
              </h2>
              <p className="section-subtitle">
                Daftar perlengkapan &amp; aset Masjid Al-Jihad yang dapat diajukan peminjamannya
              </p>
            </div>
            <div
              style={{
                maxWidth: '720px',
                margin: '0 auto',
                background: '#ffffff',
                borderRadius: '18px',
                padding: '32px 24px',
                textAlign: 'center',
                border: '1px dashed rgba(27, 107, 69, 0.28)',
              }}
            >
              <h4 style={{ margin: '0 0 8px', color: '#0f4a2a', fontWeight: 800 }}>
                Daftar Aset Masjid Belum Tersedia
              </h4>
              <p style={{ margin: 0, color: '#4b5563', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Daftar lengkap inventaris aset masjid sedang dalam pendataan oleh DKM dan akan segera
                ditampilkan di sini. Untuk pengajuan saat ini, silakan ketik langsung kebutuhan aset
                Anda pada formulir Kalender Kegiatan.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'

export const metadata: Metadata = {
  title: 'Aset Masjid',
  description: 'Daftar inventaris dan peminjaman aset Masjid Al-Jihad Karawang.',
}

export default function AsetMasjidPage() {
  return (
    <>
      <Navbar />
      <main>
        <section
          style={{
            background: 'linear-gradient(135deg, #0d3b23 0%, #1b6b45 100%)',
            color: '#ffffff',
            padding: '120px 0 64px',
            textAlign: 'center',
          }}
        >
          <div className="container">
            <span className="section-badge white">Inventaris Masjid</span>
            <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', margin: '12px 0 10px' }}>
              Daftar Aset Masjid Al-Jihad
            </h1>
            <p style={{ maxWidth: '640px', margin: '0 auto', opacity: 0.9, lineHeight: 1.65 }}>
              Informasi inventaris perlengkapan dan sarana prasarana Masjid Raya Al-Jihad Karawang
              yang dapat diajukan untuk keperluan kegiatan ibadah maupun sosial umat.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div
              style={{
                maxWidth: '740px',
                margin: '0 auto',
                background: '#ffffff',
                borderRadius: '20px',
                padding: '44px 28px',
                textAlign: 'center',
                border: '1px dashed rgba(27, 107, 69, 0.3)',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.05)',
              }}
            >
              <h2 style={{ margin: '0 0 10px', color: '#0f4a2a', fontSize: '1.35rem' }}>
                Daftar Aset Masjid Belum Tersedia
              </h2>
              <p
                style={{
                  margin: '0 auto 22px',
                  maxWidth: '520px',
                  color: '#4b5563',
                  fontSize: '0.94rem',
                  lineHeight: 1.65,
                }}
              >
                Daftar lengkap inventaris aset masjid sedang dalam proses pendataan oleh pengurus
                DKM dan akan segera ditampilkan di halaman ini. Untuk pengajuan peminjaman aset
                saat ini, Anda dapat langsung mengetikkan kebutuhannya pada formulir kalender.
              </p>
              <Link href="/kegiatan#kalender-masjid" className="btn btn-gold">
                Buka Formulir Pengajuan Kalender
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

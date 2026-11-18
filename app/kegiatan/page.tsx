import type { Metadata } from 'next'
import Navbar from '@/components/Navbar/Navbar'
import ProgramSection from '@/components/Program/ProgramSection'
import KalenderSection from '@/components/Kalender/KalenderSection'
import Footer from '@/components/Footer/Footer'
import styles from './kegiatan.module.css'

export const metadata: Metadata = {
  title: 'Kegiatan & Kalender Masjid Al-Jihad Karawang',
  description:
    'Kegiatan ibadah, kajian rutin, kalender penggunaan ruangan, dan layanan sosial Masjid Al-Jihad Karawang.',
}

export default function KegiatanPage() {
  return (
    <>
      <Navbar />
      <main>
        <div className={styles.pageHero}>
          <div className={styles.heroOverlay} />
          <div className="container">
            <div className={styles.heroContent}>
              <span className="section-badge white">Agenda & Aktivitas</span>
              <h1 className={styles.heroTitle}>Kegiatan & Kalender Masjid Al-Jihad</h1>
              <p className={styles.heroDesc}>
                Berbagai kegiatan ibadah, kajian keislaman, pendidikan, serta kalender pemantauan
                jadwal acara Masjid Al-Jihad & Islamic Center Karawang
              </p>
            </div>
          </div>
        </div>
        <KalenderSection />
        <ProgramSection />
      </main>
      <Footer />
    </>
  )
}

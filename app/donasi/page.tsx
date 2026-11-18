import type { Metadata } from 'next'
import Navbar from '@/components/Navbar/Navbar'
import DonasiSection from '@/components/Donasi/DonasiSection'
import Footer from '@/components/Footer/Footer'
import styles from './donasi.module.css'

export const metadata: Metadata = {
  title: 'Infaq & Donasi',
  description: 'Salurkan infaq, sedekah, dan wakaf terbaik Anda untuk kemakmuran Masjid Al-Jihad Karawang melalui QRIS dan transfer bank.',
}

export default function DonasiPage() {
  return (
    <>
      <Navbar />
      <main>
        <div className={styles.pageHero}>
          <div className={styles.heroOverlay} />
          <div className="container">
            <div className={styles.heroContent}>
              <span className="section-badge white">💚 Amal Jariyah</span>
              <h1 className={styles.heroTitle}>Infaq, Sedekah & Wakaf</h1>
              <p className={styles.heroDesc}>
                Mari bersama-sama memakmurkan Masjid Al-Jihad Karawang melalui harta terbaik kita
              </p>
            </div>
          </div>
        </div>
        <DonasiSection />
      </main>
      <Footer />
    </>
  )
}

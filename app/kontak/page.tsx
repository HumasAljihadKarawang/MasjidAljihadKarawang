import type { Metadata } from 'next'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import styles from './kontak.module.css'

export const metadata: Metadata = {
  title: 'Hubungi Kami',
  description: 'Informasi kontak, alamat, dan lokasi Masjid Al-Jihad Karawang.',
}

export default function KontakPage() {
  return (
    <>
      <Navbar />
      <main>
        <div className={styles.pageHero}>
          <div className={styles.heroOverlay} />
          <div className="container">
            <div className={styles.heroContent}>
              <span className="section-badge white">📞 Hubungi Kami</span>
              <h1 className={styles.heroTitle}>Kontak & Lokasi</h1>
              <p className={styles.heroDesc}>
                Silakan hubungi sekretariat DKM Masjid Al-Jihad Karawang untuk informasi kegiatan, layanan, atau konfirmasi donasi
              </p>
            </div>
          </div>
        </div>

        <section className="section">
          <div className="container">
            <div className={styles.contactGrid}>
              <div className={styles.infoColumn}>
                <span className="section-badge">📍 Sekretariat DKM</span>
                <h2 className="section-title">Informasi <span>Kontak</span></h2>
                <div className={styles.infoCards}>
                  <div className={styles.infoCard}>
                    <span className={styles.icon}>📍</span>
                    <div>
                      <h4>Alamat</h4>
                      <p>Jl. Al-Jihad No. 1, Karawang Barat, Kabupaten Karawang, Jawa Barat 41311</p>
                    </div>
                  </div>
                  <div className={styles.infoCard}>
                    <span className={styles.icon}>📞</span>
                    <div>
                      <h4>Telepon / WhatsApp</h4>
                      <p>+62 812 3456 7890</p>
                    </div>
                  </div>
                  <div className={styles.infoCard}>
                    <span className={styles.icon}>✉️</span>
                    <div>
                      <h4>Email</h4>
                      <p>dkm@masjidaljihad.or.id</p>
                    </div>
                  </div>
                  <div className={styles.infoCard}>
                    <span className={styles.icon}>⏰</span>
                    <div>
                      <h4>Jam Operasional Sekretariat</h4>
                      <p>Senin – Ahad: 08:00 – 20:00 WIB</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.mapColumn}>
                <div className={styles.mapWrapper}>
                  <iframe
                    title="Lokasi Masjid Al-Jihad Karawang"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.716364602247!2d107.2962!3d-6.3016!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69775e79e72f1d%3A0x401576d14fed560!2sKarawang%2C%20West%20Java!5e0!3m2!1sen!2sid!4v1700000000000!5m2!1sen!2sid"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
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

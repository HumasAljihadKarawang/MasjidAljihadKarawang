import Link from 'next/link'
import styles from './DonasiSection.module.css'
import { mockDonasi } from '@/lib/mockData'

export default function DonasiSection() {
  return (
    <section className={styles.section}>
      {/* Decorative top */}
      <div className={styles.topWave} />
      
      <div className="container">
        <div className="section-header center">
          <span className="section-badge gold">💚 Donasi</span>
          <h2 className="section-title">
            Extend Your Hand of <span>Charity</span>
          </h2>
          <p className="section-subtitle">
            Setiap donasi Anda adalah investasi akhirat. Berkontribusi untuk kemakmuran Masjid Al-Jihad Karawang
          </p>
          <div className={styles.ayat}>
            <span className="font-arabic">مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَٰلَهُمْ فِى سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ</span>
            <span className={styles.ayatTrans}>"Perumpamaan orang yang menginfakkan hartanya di jalan Allah seperti sebutir biji" (QS. Al-Baqarah: 261)</span>
          </div>
        </div>

        <div className={styles.donasiGrid}>
          {/* QRIS */}
          <div className={styles.qrisCard}>
            <div className={styles.qrisHeader}>
              <span className={styles.qrisIcon}>📱</span>
              <div>
                <h3 className={styles.qrisTitle}>QRIS</h3>
                <p className={styles.qrisSub}>Scan untuk donasi cepat & mudah</p>
              </div>
            </div>
            <div className={styles.qrisCode}>
              {/* QRIS placeholder - ganti dengan gambar QR Code nyata */}
              <div className={styles.qrisPlaceholder}>
                <div className={styles.qrisPattern}>
                  <span style={{ fontSize: '5rem' }}>🕌</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Upload QR Code QRIS
                  </p>
                </div>
                <div className={styles.qrisCorner} data-pos="tl" />
                <div className={styles.qrisCorner} data-pos="tr" />
                <div className={styles.qrisCorner} data-pos="bl" />
                <div className={styles.qrisCorner} data-pos="br" />
              </div>
            </div>
            <p className={styles.qrisNote}>Semua bank & e-wallet didukung</p>
            <div className={styles.bankIcons}>
              {['BRI', 'BNI', 'Mandiri', 'BCA', 'Dana', 'GoPay', 'OVO'].map(b => (
                <span key={b} className={styles.bankIcon}>{b}</span>
              ))}
            </div>
          </div>

          {/* Bank Accounts */}
          <div className={styles.rekeningList}>
            <h3 className={styles.rekeningTitle}>Transfer Bank</h3>
            {mockDonasi.map((item) => (
              <div key={item.id} className={styles.rekeningCard}>
                <div className={styles.rekeningHeader}>
                  <span className={styles.rekeningBank}>{item.bank}</span>
                  {item.keterangan && (
                    <span className="badge badge-green">{item.keterangan}</span>
                  )}
                </div>
                <div className={styles.rekeningRow}>
                  <div>
                    <span className={styles.rekeningLabel}>Nomor Rekening</span>
                    <span className={styles.rekeningNo}>{item.no_rekening}</span>
                  </div>
                  <div>
                    <span className={styles.rekeningLabel}>Atas Nama</span>
                    <span className={styles.rekeningName}>{item.nama_rekening}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Konfirmasi */}
            <div className={styles.konfirmasi}>
              <p className={styles.konfirmasiText}>
                Setelah transfer, harap konfirmasi melalui:
              </p>
              <a href="https://wa.me/6281234567890" className={styles.waBtn}>
                <span>📱</span>
                Konfirmasi via WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <span className={styles.statNum}>Rp 850 Jt+</span>
            <span className={styles.statLabel}>Total Donasi Terkumpul</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statNum}>1.200+</span>
            <span className={styles.statLabel}>Donatur Aktif</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statNum}>3</span>
            <span className={styles.statLabel}>Program Didanai</span>
          </div>
        </div>
      </div>
    </section>
  )
}

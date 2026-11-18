import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import { mockBerita } from '@/lib/mockData'
import styles from './berita.module.css'

export const metadata: Metadata = {
  title: 'Berita & Pengumuman',
  description: 'Kabar terbaru, artikel dakwah, dan pengumuman kegiatan Masjid Al-Jihad Karawang.',
}

export default function BeritaPage() {
  return (
    <>
      <Navbar />
      <main>
        <div className={styles.pageHero}>
          <div className={styles.heroOverlay} />
          <div className="container">
            <div className={styles.heroContent}>
              <span className="section-badge white">📰 Kabar Masjid</span>
              <h1 className={styles.heroTitle}>Berita & Pengumuman</h1>
              <p className={styles.heroDesc}>
                Ikuti perkembangan kegiatan, kajian, dan informasi terkini dari Masjid Al-Jihad Karawang
              </p>
            </div>
          </div>
        </div>

        <section className="section">
          <div className="container">
            <div className="grid-3">
              {mockBerita.map((berita) => (
                <article key={berita.id} className={styles.newsCard}>
                  <div className={styles.imgWrap}>
                    <Image
                      src={berita.thumbnail_url || 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=800&q=80'}
                      alt={berita.judul}
                      fill
                      className={styles.img}
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    {berita.kategori && (
                      <span className={styles.categoryBadge}>{berita.kategori}</span>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.meta}>
                      <span>📅 {format(new Date(berita.created_at), 'd MMMM yyyy', { locale: id })}</span>
                      <span>✍️ Admin DKM</span>
                    </div>
                    <h3 className={styles.title}>
                      <Link href={`/berita/${berita.slug}`}>{berita.judul}</Link>
                    </h3>
                    <p className={styles.excerpt}>{berita.ringkasan}</p>
                    <Link href={`/berita/${berita.slug}`} className={styles.readMore}>
                      Baca Selengkapnya →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

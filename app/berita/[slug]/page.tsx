import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import { mockBerita } from '@/lib/mockData'
import styles from './detail.module.css'

export function generateStaticParams() {
  return mockBerita.map((b) => ({ slug: b.slug }))
}

export default function BeritaDetailPage({ params }: { params: { slug: string } }) {
  const berita = mockBerita.find((b) => b.slug === params.slug)
  if (!berita) {
    notFound()
  }

  const fullText = berita.konten || `${berita.ringkasan}\n\nKegiatan ini diselenggarakan oleh Dewan Kemakmuran Masjid (DKM) Al-Jihad Karawang sebagai bagian dari upaya memakmurkan masjid dan mempererat ukhuwah Islamiyah antar jamaah serta masyarakat sekitar Karawang.`

  return (
    <>
      <Navbar />
      <main>
        <div className={styles.pageHero}>
          <div className={styles.heroOverlay} />
          <div className="container">
            <div className={styles.heroContent}>
              <Link href="/berita" className={styles.backLink}>← Kembali ke Berita</Link>
              {berita.kategori && <span className="section-badge white">{berita.kategori}</span>}
              <h1 className={styles.heroTitle}>{berita.judul}</h1>
              <div className={styles.meta}>
                <span>📅 {format(new Date(berita.created_at), 'd MMMM yyyy', { locale: id })}</span>
                <span>✍️ Oleh Admin DKM</span>
              </div>
            </div>
          </div>
        </div>

        <section className="section">
          <div className="container">
            <article className={styles.articleWrap}>
              {berita.thumbnail_url && (
                <div className={styles.featuredImg}>
                  <Image
                    src={berita.thumbnail_url}
                    alt={berita.judul}
                    fill
                    className={styles.img}
                    sizes="(max-width: 900px) 100vw, 850px"
                  />
                </div>
              )}
              <div className={styles.content}>
                {fullText.split('\n\n').map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

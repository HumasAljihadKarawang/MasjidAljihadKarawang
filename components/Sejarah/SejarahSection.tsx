'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import gambarMasjid1 from '@/logo/Gambar 1 Masjid Al-Jihad.png'
import gambarMasjid2 from '@/logo/Gambar 2 Masjid Al-Jihad.png'
import gambarMasjid3 from '@/logo/Gambar 3 Masjid Al-Jihad.png'
import gambarMasjidDulu from '@/logo/Gambar 4 Masjid Al-Jihad dulu.png'
import styles from './SejarahSection.module.css'

export const SLIDE_PROFIL = [
  {
    src: gambarMasjid1,
    tag: 'Kawasan Islamic Center Karawang',
    badge: 'Masjid Al-Jihad Karawang',
    title: 'Wajah Megah Masjid Al-Jihad Karawang',
    objectPosition: 'center center',
  },
  {
    src: gambarMasjidDulu,
    tag: 'Didirikan Tahun 1974',
    badge: 'Arsip Sejarah (Tempo Dulu)',
    title: 'Bangunan Awal Masjid Al-Jihad Berkubah Kopula',
    objectPosition: 'center center',
  },
  {
    src: gambarMasjid3,
    tag: 'Ornamen & Menara',
    badge: 'Ciri Khas',
    title: 'Menara & Ornamen Bintang Segi Delapan',
    objectPosition: 'center center',
  },
  {
    src: gambarMasjid2,
    tag: 'Renovasi Total 2009',
    badge: 'Arsitektur Nusantara Modern',
    title: 'Fasad Geometris & Atap Limas Bersusun',
    objectPosition: 'center center',
  },
]

export const FAKTA_MENARIK = [
  {
    judul: 'Transformasi dari Kubah Kopula ke Atap Limas Bersusun',
    isi: 'Didirikan tahun 1974 dengan kubah kopula tunggal, lalu dipugar total tahun 2009 menjadi bangunan geometris modern beratap limas berundak khas Nusantara.',
  },
  {
    judul: 'Sering Disangka sebagai Masjid Agung Karawang',
    isi: 'Karena kemegahannya di seberang Lapangan Karangpawitan dan menyatu dengan Islamic Center, Kantor MUI, serta Wisma Haji, warga luar daerah kerap mengiranya Masjid Agung.',
  },
  {
    judul: 'Ornamen Bintang Segi Delapan & Fasad Hijau Zamrud',
    isi: 'Fasad dan menara Masjid Al-Jihad dihiasi ornamen bintang segi delapan (Rub el Hizb) yang berpadu dengan deretan gerbang segitiga meruncing hijau zamrud.',
  },
]

export default function SejarahSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentFact, setCurrentFact] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDE_PROFIL.length)
    }, 6500)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const factTimer = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % FAKTA_MENARIK.length)
    }, 6000)
    return () => clearInterval(factTimer)
  }, [])

  return (
    <section id="sejarah-singkat" className={styles.section}>
      <div className="container">
        <div className={styles.contentGrid}>
          {/* Kiri: Slide Gambar Crossfade */}
          <div className={styles.sliderCard}>
            <div className={styles.sliderTrack}>
              {SLIDE_PROFIL.map((slide, idx) => (
                <div
                  key={idx}
                  className={`${styles.slideItem} ${
                    idx === currentSlide ? styles.slideItemActive : ''
                  }`}
                >
                  <Image
                    src={slide.src}
                    alt={slide.title}
                    fill
                    unoptimized
                    sizes="(max-width: 992px) 100vw, 55vw"
                    className={styles.slideImage}
                    style={{ objectPosition: slide.objectPosition }}
                  />
                  <div className={styles.slideOverlay} />

                  <div className={styles.slideTopBar}>
                    <span className={styles.slideYearTag}>{slide.tag}</span>
                  </div>

                  <div className={styles.slideCaption}>
                    <span className={styles.captionBadge}>{slide.badge}</span>
                    <h3 className={styles.captionTitle}>{slide.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kanan: Sejarah Ringkas + Fakta Menarik */}
          <div className={styles.compactRightCol}>
            <div className={styles.narrativeCard}>
              <div>
                <h2 className={styles.narrativeTitle}>
                  Sejarah Singkat Masjid Al-Jihad Karawang
                </h2>
                <p className={styles.narrativeText}>
                  Berdiri sejak tahun <strong>1974</strong> di{' '}
                  <strong>Jl. Jenderal Ahmad Yani, Karangpawitan, Karawang Barat</strong> (seberang
                  Lapangan Karangpawitan) dalam satu kawasan terpadu bersama{' '}
                  <strong>Islamic Center Kabupaten Karawang</strong>, Kantor MUI, dan Wisma Haji.
                  Setelah dipugar total pada tahun <strong>2009</strong>, masjid ini tampil megah
                  dengan arsitektur geometris modern beratap limas bersusun khas Nusantara.
                </p>
              </div>

              <div className={styles.storyActions}>
                <Link href="/profil#sejarah" className="btn btn-primary">
                  Lihat Sejarah & Jejak Lengkap di Profil →
                </Link>
              </div>
            </div>

            <div className={styles.architectureCard}>
              <div className={styles.factTopBar}>
                <span className={styles.archBadge}>Fakta Menarik</span>
                <div className={styles.factDots}>
                  {FAKTA_MENARIK.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Fakta menarik ${idx + 1}`}
                      className={`${styles.factDot} ${
                        idx === currentFact ? styles.factDotActive : ''
                      }`}
                      onClick={() => setCurrentFact(idx)}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.factStack}>
                {FAKTA_MENARIK.map((fakta, idx) => (
                  <div
                    key={idx}
                    className={`${styles.factItem} ${
                      idx === currentFact ? styles.factItemActive : ''
                    }`}
                    aria-hidden={idx !== currentFact}
                  >
                    <h4 className={styles.archTitle}>{fakta.judul}</h4>
                    <p className={styles.archText}>{fakta.isi}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

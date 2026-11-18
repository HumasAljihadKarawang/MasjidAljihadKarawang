'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import logoMasjidPutih from '@/logo/Logo Masjid Al-Jihad Putih.png'
import styles from './PageLoader.module.css'

export default function PageLoader() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    // Tampilkan animasi pembuka saat halaman di-refresh dengan durasi lebih lega,
    // lalu transisi menghilang (exit) secara smooth
    const timer = setTimeout(() => {
      setHidden(true)
    }, 2650)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`${styles.loaderOverlay} ${hidden ? styles.loaderHidden : ''}`}
      aria-hidden={hidden}
    >
      <div className={styles.bgPattern} />
      <div className={styles.ambientGlow} />

      {/* Orbit Animation Container */}
      <div className={styles.orbitStage}>
        {/* Cincin Orbit Luar (Berputar Searah Jarum Jam dengan Bola Cahaya Emas & Hijau) */}
        <div className={styles.orbitRingOuter}>
          <span className={styles.orbitNodeGold} />
          <span className={styles.orbitNodeEmerald} />
        </div>

        {/* Cincin Orbit Tengah (Berputar Berlawanan Jarum Jam dengan Bintang) */}
        <div className={styles.orbitRingMiddle}>
          <span className={styles.orbitStar}>✦</span>
        </div>

        {/* Cincin Orbit Dalam (Efek Gyro 3D) */}
        <div className={styles.orbitRingInner} />

        {/* Logo Masjid Putih di Tengah Orbit */}
        <div className={styles.logoCenterBox}>
          <Image
            src={logoMasjidPutih}
            alt="Logo Masjid Al-Jihad Karawang"
            className={styles.logoImage}
            priority
          />
        </div>
      </div>

      {/* Kaligrafi & Progress Bar */}
      <div className={styles.loaderTextWrap}>
        <span className={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
        <span className={styles.masjidTitle}>Masjid Al-Jihad Karawang</span>
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} />
        </div>
      </div>
    </div>
  )
}

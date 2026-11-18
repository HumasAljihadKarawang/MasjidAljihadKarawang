'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import logoMasjidPutih from '@/logo/Logo Masjid Al-Jihad Putih.png'
import { getPrayerTimesByLocation, DEFAULT_LOCATION, type PrayerTimes } from '@/lib/prayerTimes'
import styles from './Footer.module.css'

export default function Footer() {
  const [timings, setTimings] = useState<PrayerTimes | null>(null)
  const [cityName, setCityName] = useState<string>(DEFAULT_LOCATION.name)
  const secretClickCount = useRef(0)
  const secretClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  // Shortcut rahasia Admin: Ctrl + Shift + A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        router.push('/admin')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  // Klik 3x cepat pada teks "Powered by DKM Al-Jihad" di footer untuk masuk ke halaman login admin tersembunyi
  const handleSecretAdminClick = () => {
    secretClickCount.current += 1
    if (secretClickTimer.current) clearTimeout(secretClickTimer.current)

    if (secretClickCount.current >= 3) {
      secretClickCount.current = 0
      router.push('/admin')
      return
    }

    secretClickTimer.current = setTimeout(() => {
      secretClickCount.current = 0
    }, 900)
  }

  useEffect(() => {
    getPrayerTimesByLocation(DEFAULT_LOCATION)
      .then((res) => setTimings(res.data.timings))
      .catch(() => {})

    const handleUpdated = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.timings) {
        setTimings(customEvent.detail.timings)
      }
      if (customEvent.detail?.location?.name) {
        setCityName(customEvent.detail.location.name)
      }
    }

    window.addEventListener('prayer-times-updated', handleUpdated)
    return () => window.removeEventListener('prayer-times-updated', handleUpdated)
  }, [])
  return (
    <footer className={styles.footer}>
      {/* Top CTA Band */}
      <div className={styles.ctaBand}>
        <div className="container">
          <div className={styles.ctaInner}>
            <div className={styles.ctaText}>
              <span className={styles.ctaArabic}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم</span>
              <h3>Bersama Memakmurkan Masjid Al-Jihad</h3>
              <p>Dukung program dakwah dan pembangunan masjid kami</p>
            </div>
            <Link href="/donasi" className="btn btn-gold btn-lg">
              💚 Donasi Sekarang
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className={styles.mainFooter}>
        <div className="container">
          <div className={styles.footerGrid}>
            {/* About */}
            <div className={styles.footerCol}>
              <div className={styles.footerLogo}>
                <Image
                  src={logoMasjidPutih}
                  alt="Logo Masjid Al-Jihad Karawang"
                  className={styles.footerLogoImage}
                />
              </div>
              <p className={styles.footerDesc}>
                Masjid Al-Jihad Karawang hadir sebagai pusat ibadah, dakwah, pendidikan, dan 
                pemberdayaan umat Islam di wilayah Karawang dan sekitarnya.
              </p>
              {/* Social Media */}
              <div className={styles.socials}>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={styles.socialBtn} aria-label="Instagram">📸</a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className={styles.socialBtn} aria-label="YouTube">▶️</a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={styles.socialBtn} aria-label="Facebook">📘</a>
                <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" className={styles.socialBtn} aria-label="WhatsApp">💬</a>
              </div>

              {/* Tombol Tegas Portal Al-Jihad (Ikon Kerangka Masjid + Deskripsi) */}
              <Link href="/admin" className={styles.portalBtn}>
                <span className={styles.portalIconWrap}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 2v2" />
                    <path d="M8 10c0-2.8 1.8-5 4-6 2.2 1 4 3.2 4 6" />
                    <path d="M4 21V12l2-2 2 2v9" />
                    <path d="M16 21V12l2-2 2 2v9" />
                    <path d="M8 21V10h8v11" />
                    <path d="M2 21h20" />
                    <path d="M10.5 21v-4a1.5 1.5 0 0 1 3 0v4" />
                  </svg>
                </span>
                <span className={styles.portalTextWrap}>
                  <span className={styles.portalTitle}>Portal Al-Jihad</span>
                  <span className={styles.portalDesc}>
                    Portal Pengelola Masjid Al-Jihad Karawang
                  </span>
                </span>
              </Link>
            </div>

            {/* Quick Links */}
            <div className={styles.footerCol}>
              <h4 className={styles.colTitle}>Navigasi</h4>
              <ul className={styles.footerLinks}>
                {[
                  { href: '/', label: 'Beranda' },
                  { href: '/profil', label: 'Profil Masjid' },
                  { href: '/profil#sejarah', label: 'Sejarah' },
                  { href: '/berita', label: 'Berita' },
                  { href: '/kegiatan', label: 'Kegiatan' },
                  { href: '/el-jihad', label: 'El Jihad' },
                  { href: '/donasi', label: 'Donasi' },
                  { href: '/kontak', label: 'Kontak' },
                ].map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className={styles.footerLink}>
                      → {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className={styles.footerCol}>
              <h4 className={styles.colTitle}>Kontak</h4>
              <div className={styles.contactList}>
                <div className={styles.contactItem}>
                  <span className={styles.contactIcon}>📍</span>
                  <span>Jl. Al-Jihad No. 1, Karawang, Jawa Barat 41311</span>
                </div>
                <div className={styles.contactItem}>
                  <span className={styles.contactIcon}>📞</span>
                  <span>+62 812 3456 7890</span>
                </div>
                <div className={styles.contactItem}>
                  <span className={styles.contactIcon}>✉️</span>
                  <span>dkm@masjidaljihad.or.id</span>
                </div>
                <div className={styles.contactItem}>
                  <span className={styles.contactIcon}>⏰</span>
                  <div>
                    <span>Sekretariat: Senin - Jumat</span>
                    <span>08:00 - 16:00 WIB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Prayer Times Quick */}
            <div className={styles.footerCol}>
              <h4 className={styles.colTitle}>Jadwal Ibadah ({cityName})</h4>
              <div className={styles.prayerQuick}>
                {[
                  { name: 'Subuh', key: 'Fajr', icon: '🌙' },
                  { name: 'Dzuhur', key: 'Dhuhr', icon: '☀️' },
                  { name: 'Ashar', key: 'Asr', icon: '🌤️' },
                  { name: 'Maghrib', key: 'Maghrib', icon: '🌇' },
                  { name: 'Isya', key: 'Isha', icon: '🌙' },
                ].map(p => (
                  <div key={p.name} className={styles.prayerItem}>
                    <span>{p.icon} {p.name}</span>
                    <span className={styles.prayerDash} />
                    <span>{timings ? timings[p.key as keyof PrayerTimes] : '—'}</span>
                  </div>
                ))}
                <Link href="/#waktu-sholat" className={styles.seeJadwal}>
                  Lihat Jadwal Lengkap →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={styles.bottomBar}>
        <div className="container">
          <div className={styles.bottomInner}>
            <p>© {new Date().getFullYear()} Masjid Al-Jihad Karawang. All rights reserved.</p>
            <p className={styles.bottomRight}>
              Dibuat dengan ❤️ untuk kemakmuran umat •{' '}
              <span
                className={styles.powered}
                onClick={handleSecretAdminClick}
                style={{ cursor: 'default', userSelect: 'none' }}
              >
                Powered by DKM Al-Jihad
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

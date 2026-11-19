'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import logoMasjid from '@/logo/Logo Masjid Al-Jihad.png'
import logoMasjidPutih from '@/logo/Logo Masjid Al-Jihad Putih.png'
import logoIslamicCenter from '@/logo/Logo Islamic Center.png'
import logoIslamicCenterPutih from '@/logo/Logo Islamic Center Putih.png'
import styles from './Navbar.module.css'

const navLinks = [
  { href: '/', label: 'Beranda' },
  { href: '/profil', label: 'Profil' },
  { href: '/berita', label: 'Berita' },
  { href: '/kegiatan', label: 'Kegiatan' },
  { href: '/el-jihad', label: 'El Jihad' },
  { href: '/kontak', label: 'Kontak' },
  { href: '/profil#aset-masjid', label: 'My.DKM' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeLogoIdx, setActiveLogoIdx] = useState<0 | 1>(0)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Satu timer terpadu (6 detik) untuk switch logo tanpa reset saat scroll berubah
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLogoIdx((prev) => (prev === 0 ? 1 : 0))
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
        <div className={`container ${styles.navInner}`}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <div className={styles.logoContainer}>
              {/* Brand 1: Masjid Al-Jihad (Putih & Warna) */}
              <div
                className={`${styles.brandSlide} ${
                  activeLogoIdx === 0 ? styles.brandActive : styles.brandExit
                }`}
              >
                <Image
                  src={logoMasjidPutih}
                  alt="Logo Masjid Al-Jihad Karawang"
                  className={`${styles.logoImage} ${styles.logoWhite}`}
                  priority
                />
                <Image
                  src={logoMasjid}
                  alt="Logo Masjid Al-Jihad Karawang"
                  className={`${styles.logoImage} ${styles.logoColor}`}
                  priority
                />
              </div>

              {/* Brand 2: Islamic Center Karawang (Putih & Warna) */}
              <div
                className={`${styles.brandSlide} ${
                  activeLogoIdx === 1 ? styles.brandActive : ''
                }`}
              >
                <Image
                  src={logoIslamicCenterPutih}
                  alt="Logo Islamic Center Karawang"
                  className={`${styles.logoImage} ${styles.logoWhite}`}
                  priority
                />
                <Image
                  src={logoIslamicCenter}
                  alt="Logo Islamic Center Karawang"
                  className={`${styles.logoImage} ${styles.logoColor}`}
                  priority
                />
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <ul className={styles.navLinks}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <div className={styles.navActions}>
            <Link href="/donasi" className={`btn btn-primary ${styles.donateBtn}`}>
              <span>💚</span>
              Donasi
            </Link>
            {/* Hamburger */}
            <button
              className={`${styles.hamburger} ${mobileOpen ? styles.open : ''}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`${styles.mobileOverlay} ${mobileOpen ? styles.overlayOpen : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile Menu Drawer */}
      <div className={`${styles.mobileMenu} ${mobileOpen ? styles.mobileOpen : ''}`}>
        <div className={styles.mobileHeader}>
          <div className={styles.mobileLogoWrap}>
            <Image
              src={logoMasjidPutih}
              alt="Logo Masjid Al-Jihad Karawang"
              className={`${styles.mobileLogoImage} ${
                activeLogoIdx === 0 ? styles.mobileLogoActive : ''
              }`}
            />
            <Image
              src={logoIslamicCenterPutih}
              alt="Logo Islamic Center Karawang"
              className={`${styles.mobileLogoImage} ${
                activeLogoIdx === 1 ? styles.mobileLogoActive : ''
              }`}
            />
          </div>
          <button onClick={() => setMobileOpen(false)} className={styles.closeBtn}>✕</button>
        </div>
        <ul className={styles.mobileLinks}>
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`${styles.mobileLink} ${pathname === link.href ? styles.active : ''}`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className={styles.mobileDonate}>
          <Link href="/donasi" className="btn btn-primary btn-lg w-full">
            💚 Donasi Sekarang
          </Link>
        </div>
      </div>
    </>
  )
}

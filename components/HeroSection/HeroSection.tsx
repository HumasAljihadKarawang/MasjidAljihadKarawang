'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import gambarMasjid from '@/logo/Gambar 1 Masjid Al-Jihad.png'
import {
  getPrayerTimesByLocation,
  getNextPrayer,
  getCurrentHourMinuteInTz,
  findNearestRegency,
  getCitiesByProvince,
  INDONESIA_PROVINCES_RAW,
  DEFAULT_LOCATION,
  PRAYER_NAMES,
  PRAYER_ORDER,
  PRAYER_ICONS_MAP,
  type PrayerTimes,
  type RegencyCity,
} from '@/lib/prayerTimes'
import styles from './HeroSection.module.css'

const HIJRI_MONTHS_ID: Record<string, string> = {
  Muharram: 'Muharram',
  Safar: 'Shafar',
  "Rabi' al-awwal": "Rabi'ul Awal",
  "Rabi' al-thani": "Rabi'ul Akhir",
  "Jumada al-ula": 'Jumadil Awal',
  "Jumada al-thani": 'Jumadil Akhir',
  Rajab: 'Rajab',
  "Sha'ban": "Sya'ban",
  Ramadan: 'Ramadhan',
  Shawwal: 'Syawal',
  "Dhu al-Qidah": "Dzulqa'dah",
  "Dhu al-Hijjah": 'Dzulhijjah',
}

const AYAT_MOTIVASI = [
  {
    arab: 'إِنَّمَا يَعْمُرُ مَسَاجِدَ اللَّهِ مَنْ آمَنَ بِاللَّهِ وَالْيَوْمِ الْآخِرِ',
    arti: '“Sesungguhnya yang memakmurkan masjid Allah hanyalah orang-orang yang beriman kepada Allah dan hari kemudian.” (QS. At-Taubah: 18)',
  },
  {
    arab: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    arti: '“Maka sesungguhnya bersama kesulitan ada kemudahan. Sesungguhnya bersama kesulitan itu ada kemudahan.” (QS. Al-Insyirah: 5–6)',
  },
  {
    arab: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    arti: '“Ingatlah, hanya dengan mengingat Allah hati menjadi tenteram.” (QS. Ar-Ra’d: 28)',
  },
  {
    arab: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا',
    arti: '“Allah tidak membebani seseorang melainkan sesuai dengan kesanggupannya.” (QS. Al-Baqarah: 286)',
  },
  {
    arab: 'وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجًا ۝ وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ',
    arti: '“Barangsiapa bertakwa kepada Allah niscaya Dia membukakan jalan keluar baginya dan memberinya rezeki dari arah yang tiada disangka-sangka.” (QS. Ath-Thalaq: 2–3)',
  },
]

export default function HeroSection() {
  const [location, setLocation] = useState<RegencyCity>(DEFAULT_LOCATION)
  const [locationMode, setLocationMode] = useState<'checkpoint' | 'gps' | 'custom'>('checkpoint')
  const [showSelector, setShowSelector] = useState(false)
  const [detectingGps, setDetectingGps] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [timings, setTimings] = useState<PrayerTimes | null>(null)
  const [hijriStr, setHijriStr] = useState<string>('Memuat...')
  const [countdown, setCountdown] = useState<string>('--:--:--')
  const [showFloatingPopup, setShowFloatingPopup] = useState<boolean>(false)
  const [ayatIndex, setAyatIndex] = useState<number>(0)
  const clockCardRef = useRef<HTMLDivElement | null>(null)
  const regionBoxRef = useRef<HTMLDivElement | null>(null)

  // Rotasi otomatis 5 ayat motivasi dengan transisi smooth & ukuran kotak konsisten
  useEffect(() => {
    const interval = setInterval(() => {
      setAyatIndex((prev) => (prev + 1) % AYAT_MOTIVASI.length)
    }, 6500)
    return () => clearInterval(interval)
  }, [])

  const handleSelectAyat = (idx: number) => {
    setAyatIndex(idx)
  }

  // Tutup popup custom lokasi jika klik di luar area
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (regionBoxRef.current && !regionBoxRef.current.contains(e.target as Node)) {
        setShowSelector(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Deteksi saat kartu jam utama sudah tenggelam / ter-scroll out sepenuhnya
  useEffect(() => {
    const checkScrollOut = () => {
      if (!clockCardRef.current) return
      const rect = clockCardRef.current.getBoundingClientRect()
      setShowFloatingPopup(rect.bottom <= 72)
    }

    checkScrollOut()
    window.addEventListener('scroll', checkScrollOut, { passive: true })
    window.addEventListener('resize', checkScrollOut)
    return () => {
      window.removeEventListener('scroll', checkScrollOut)
      window.removeEventListener('resize', checkScrollOut)
    }
  }, [])

  // Deteksi lokasi GPS otomatis, fallback ke Checkpoint Karawang bila tidak diizinkan/gagal
  const detectUserLocation = useCallback((showFeedback = false) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocation(DEFAULT_LOCATION)
      setLocationMode('checkpoint')
      return
    }

    setDetectingGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const nearest = findNearestRegency(latitude, longitude)
        const detectedLocation: RegencyCity = {
          ...nearest,
          lat:
            nearest.id === DEFAULT_LOCATION.id && Math.abs(latitude - DEFAULT_LOCATION.lat) > 10
              ? DEFAULT_LOCATION.lat
              : latitude,
          lng:
            nearest.id === DEFAULT_LOCATION.id && Math.abs(longitude - DEFAULT_LOCATION.lng) > 10
              ? DEFAULT_LOCATION.lng
              : longitude,
        }
        setLocation(detectedLocation)
        setLocationMode('gps')
        setDetectingGps(false)
        window.dispatchEvent(
          new CustomEvent('location-changed', {
            detail: { location: detectedLocation, mode: 'gps' },
          })
        )
        if (showFeedback) {
          setStatusMsg(`Lokasi terdeteksi: ${nearest.name}`)
          setTimeout(() => setStatusMsg(''), 3500)
        }
      },
      () => {
        setLocation(DEFAULT_LOCATION)
        setLocationMode('checkpoint')
        setDetectingGps(false)
        window.dispatchEvent(
          new CustomEvent('location-changed', {
            detail: { location: DEFAULT_LOCATION, mode: 'checkpoint' },
          })
        )
        if (showFeedback) {
          setStatusMsg('Lokasi tidak diizinkan. Mengikuti Checkpoint Kab. Karawang.')
          setTimeout(() => setStatusMsg(''), 4000)
        }
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 }
    )
  }, [])

  useEffect(() => {
    detectUserLocation(false)
  }, [detectUserLocation])

  // Sinkronisasi bila lokasi diubah dari bagian Jadwal Sholat di bawah
  useEffect(() => {
    const handleExternalLocation = (e: Event) => {
      const custom = e as CustomEvent
      if (custom.detail?.location) {
        setLocation(custom.detail.location)
        setLocationMode(custom.detail.mode || 'custom')
      }
    }
    window.addEventListener('location-changed-from-section', handleExternalLocation)
    return () => window.removeEventListener('location-changed-from-section', handleExternalLocation)
  }, [])

  // Update jam & hitung mundur setiap detik
  useEffect(() => {
    const tick = () => {
      setCurrentTime(new Date())

      if (timings) {
        const next = getNextPrayer(timings, location.timezone)
        if (next) {
          const { hours: curH, minutes: curM, seconds: curS } = getCurrentHourMinuteInTz(location.timezone)
          const [targetH, targetM] = next.time.split(':').map(Number)

          let diffSeconds = targetH * 3600 + targetM * 60 - (curH * 3600 + curM * 60 + curS)
          if (diffSeconds <= 0) diffSeconds += 24 * 3600

          const h = Math.floor(diffSeconds / 3600)
          const m = Math.floor((diffSeconds % 3600) / 60)
          const s = diffSeconds % 60
          setCountdown(
            `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
          )
        }
      }
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [timings, location.timezone])

  // Ambil jadwal sholat & tanggal Hijriah sesuai lokasi
  useEffect(() => {
    let active = true
    getPrayerTimesByLocation(location)
      .then((res) => {
        if (!active) return
        setTimings(res.data.timings)
        const hijri = res.data.date.hijri
        const monthId = HIJRI_MONTHS_ID[hijri.month.en] || hijri.month.en
        setHijriStr(`${hijri.day} ${monthId} ${hijri.year} H`)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('prayer-times-updated', {
              detail: { timings: res.data.timings, location },
            })
          )
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [location])

  const timeString = currentTime
    ? currentTime
        .toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: location.timezone,
          hour12: false,
        })
        .replace(/\./g, ':')
    : '--:--:--'

  const dateString = currentTime
    ? currentTime.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: location.timezone,
      })
    : 'Memuat tanggal...'

  const nextPrayer = timings ? getNextPrayer(timings, location.timezone) : null
  const availableCities = getCitiesByProvince(location.province)

  const isCurrentPrayer = (prayerName: string) => {
    if (!timings || !nextPrayer) return false
    const prayerIdx = PRAYER_ORDER.indexOf(prayerName)
    const nextIdx = PRAYER_ORDER.indexOf(nextPrayer.name)
    if (nextIdx === 0) return prayerIdx === PRAYER_ORDER.length - 1
    return prayerIdx === nextIdx - 1
  }

  const handleProvinceChange = (provName: string) => {
    const cities = getCitiesByProvince(provName)
    if (cities.length > 0) {
      const chosen =
        provName === 'Jawa Barat'
          ? cities.find((c) => c.id === DEFAULT_LOCATION.id) || cities[0]
          : cities[0]
      const mode = chosen.id === DEFAULT_LOCATION.id ? 'checkpoint' : 'custom'
      setLocation(chosen)
      setLocationMode(mode)
      window.dispatchEvent(
        new CustomEvent('location-changed', { detail: { location: chosen, mode } })
      )
    }
  }

  const handleCityChange = (cityId: string) => {
    const found = availableCities.find((c) => c.id === cityId)
    if (found) {
      const mode = found.id === DEFAULT_LOCATION.id ? 'checkpoint' : 'custom'
      setLocation(found)
      setLocationMode(mode)
      window.dispatchEvent(
        new CustomEvent('location-changed', { detail: { location: found, mode } })
      )
    }
  }

  const handleResetKarawang = () => {
    setLocation(DEFAULT_LOCATION)
    setLocationMode('checkpoint')
    window.dispatchEvent(
      new CustomEvent('location-changed', {
        detail: { location: DEFAULT_LOCATION, mode: 'checkpoint' },
      })
    )
    setStatusMsg('Kembali ke Checkpoint: Kab. Karawang (WIB)')
    setTimeout(() => setStatusMsg(''), 3000)
  }

  const TZ_FULL_NAME: Record<string, string> = {
    WIB: 'Waktu Indonesia Barat (WIB)',
    WITA: 'Waktu Indonesia Tengah (WITA)',
    WIT: 'Waktu Indonesia Timur (WIT)',
  }

  const badgeLabel =
    locationMode === 'gps' ? 'GPS' : locationMode === 'checkpoint' ? 'Karawang' : 'Custom'

  return (
    <section className={styles.hero}>
      {/* Background */}
      <div className={styles.heroBg}>
        <Image
          src={gambarMasjid}
          alt="Masjid Al-Jihad Karawang"
          fill
          priority
          unoptimized
          sizes="100vw"
          className={styles.heroBgImage}
        />
        <div className={styles.heroOverlay} />
        <div className={styles.bgPattern} />
      </div>

      {/* Floating Decorative Elements */}
      <div className={styles.floatDecor1}>☽</div>
      <div className={styles.floatDecor2}>✦</div>
      <div className={styles.floatDecor3}>⋆</div>

      <div className={`container ${styles.heroContent}`}>
        {/* Left Content (Tanpa Location Badge agar Tombol Profil & Waktu Sholat Tidak Terpotong) */}
        <div className={styles.heroLeft}>
          {/* Title */}
          <h1 className={styles.heroTitle}>
            Masjid Al-Jihad
            <br />
            <span className={styles.titleAccent}>Karawang</span>
            <br />
            <span className={styles.titleSub}>Pusat Ibadah & Dakwah</span>
          </h1>

          <p className={styles.heroDesc}>
            Menjadi rumah Allah yang makmur, pusat pendidikan Islam,
            dan sumber kebaikan bagi seluruh umat di Karawang dan sekitarnya.
          </p>

          {/* Arabic Text (Berganti 5 Ayat Motivasi secara Smooth dengan Rasio Kotak Konsisten) */}
          <div className={styles.arabicText}>
            <div className={styles.ayatStack}>
              {AYAT_MOTIVASI.map((item, idx) => (
                <div
                  key={idx}
                  className={`${styles.ayatSlideItem} ${
                    idx === ayatIndex ? styles.ayatSlideActive : ''
                  }`}
                  aria-hidden={idx !== ayatIndex}
                >
                  <span className={`font-arabic ${styles.ayatArab}`}>{item.arab}</span>
                  <span className={styles.arabicTranslation}>{item.arti}</span>
                </div>
              ))}
            </div>
            <div className={styles.ayatDots}>
              {AYAT_MOTIVASI.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Ayat ${idx + 1}`}
                  className={`${styles.ayatDot} ${idx === ayatIndex ? styles.ayatDotActive : ''}`}
                  onClick={() => handleSelectAyat(idx)}
                />
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className={styles.heroBtns}>
            <Link href="/profil" className="btn btn-gold btn-lg">
              Profil Masjid
            </Link>
            <Link href="#sejarah-singkat" className="btn btn-outline-white btn-lg">
              Sejarah Masjid
            </Link>
          </div>
        </div>

        {/* Right - Clock, Region & Full Prayer Schedule Card */}
        <div className={styles.heroRight}>
          <div id="waktu-sholat" ref={clockCardRef} className={styles.clockCard}>
            {/* WIB / WITA / WIT Label */}
            <div className={styles.wibBadge}>
              <span className={styles.wibDot} />
              <span>{TZ_FULL_NAME[location.tzLabel] || 'Waktu Indonesia Barat (WIB)'}</span>
            </div>

            {/* Digital Clock */}
            <div className={styles.clockDisplay}>
              <span className={styles.clockTime}>{timeString}</span>
            </div>

            {/* Compact Date Row (Masehi & Hijriah) */}
            <div className={styles.compactDateRow}>
              <span>{dateString}</span>
              <span className={styles.dateDot}>•</span>
              <span>{hijriStr}</span>
            </div>

            {/* Location Selector Trigger */}
            <div ref={regionBoxRef} className={styles.regionBox}>
              <button
                type="button"
                className={styles.regionTrigger}
                onClick={() => setShowSelector(!showSelector)}
              >
                <span>{`${location.name}, ${location.province}`}</span>
                <span className={styles.regionBadge}>
                  {`${badgeLabel} ${showSelector ? '▴' : '▾'}`}
                </span>
              </button>

              <div
                className={styles.regionToast}
                style={{ display: statusMsg && !showSelector ? 'block' : 'none' }}
              >
                {statusMsg}
              </div>

              <div
                className={`${styles.regionDropdown} ${
                  showSelector ? styles.regionDropdownOpen : ''
                }`}
              >
                <div className={styles.regionField}>
                  <label>Provinsi</label>
                  <select
                    value={location.province}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                  >
                    {INDONESIA_PROVINCES_RAW.map((prov) => (
                      <option key={prov.name} value={prov.name}>
                        {`${prov.name} (${prov.tzLabel})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.regionField}>
                  <label>Kabupaten / Kota</label>
                  <select
                    value={location.id}
                    onChange={(e) => handleCityChange(e.target.value)}
                  >
                    {availableCities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.regionBtns}>
                  <button
                    type="button"
                    className={styles.btnGps}
                    onClick={() => detectUserLocation(true)}
                    disabled={detectingGps}
                  >
                    {detectingGps ? 'Mendeteksi...' : 'Deteksi Lokasi'}
                  </button>
                  <button
                    type="button"
                    className={styles.btnCheckpoint}
                    onClick={handleResetKarawang}
                  >
                    Checkpoint Karawang
                  </button>
                </div>
              </div>
            </div>

            {/* Next Prayer Banner with Live Countdown */}
            <div
              className={styles.heroNextPrayer}
              style={{ display: nextPrayer ? 'flex' : 'none' }}
            >
              <div className={styles.heroNextLeft}>
                <span className={styles.heroNextSub}>Sholat Berikutnya</span>
                <strong>
                  {nextPrayer
                    ? `${nextPrayer.label} (${nextPrayer.time})`
                    : 'Memuat...'}
                </strong>
              </div>
              <div className={styles.heroNextRight}>
                <span className={styles.heroNextSub}>Menuju Adzan</span>
                <span className={styles.heroCountdown}>{`-${countdown}`}</span>
              </div>
            </div>

            {/* Daftar Jadwal Sholat di dalam Popup Jam (Tanpa Emoji) */}
            <div className={styles.popupPrayerList}>
              <div className={styles.popupPrayerGrid}>
                {PRAYER_ORDER.map((prayer) => {
                  const time = timings ? timings[prayer as keyof PrayerTimes] : '--:--'
                  const isCurrent = isCurrentPrayer(prayer)
                  const isNext = nextPrayer?.name === prayer

                  return (
                    <div
                      key={prayer}
                      className={`${styles.popupPrayerItem} ${
                        isCurrent ? styles.popupPrayerCurrent : ''
                      } ${isNext ? styles.popupPrayerNext : ''}`}
                    >
                      <div className={styles.popupPrayerLeft}>
                        <span className={styles.popupPrayerName}>{PRAYER_NAMES[prayer]}</span>
                        <span
                          className={styles.popupBadgeNext}
                          style={{ display: isNext ? 'inline-block' : 'none' }}
                        >
                          Berikutnya
                        </span>
                        <span
                          className={styles.popupBadgeCurrent}
                          style={{ display: isCurrent ? 'inline-block' : 'none' }}
                        >
                          Sekarang
                        </span>
                      </div>
                      <span className={styles.popupPrayerTime}>
                        {`${time} ${location.tzLabel}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <div className={styles.scrollDown}>
        <span className={styles.scrollText}>Gulir ke bawah</span>
        <div className={styles.scrollMouse}>
          <div className={styles.scrollWheel} />
        </div>
      </div>

      {/* Popup Geser Otomatis (Muncul saat kartu jam utama sudah tenggelam / ke-scroll out) */}
      <div
        className={`${styles.floatingSlidePopup} ${
          showFloatingPopup ? styles.floatingSlideVisible : ''
        }`}
        aria-hidden={!showFloatingPopup}
      >
        <div className={styles.slideTopRow}>
          <div className={styles.slideClockBox}>
            <span className={styles.slideTime}>{timeString}</span>
            <span className={styles.slideTz}>{location.tzLabel}</span>
          </div>
          <div className={styles.slideTopDivider} />
          <div className={styles.slideDateStack}>
            <span className={styles.slideDateMasehi}>{dateString}</span>
            <span className={styles.slideDateHijri}>{hijriStr}</span>
          </div>
        </div>

        <div
          className={styles.slideNextPrayer}
          style={{ display: nextPrayer ? 'flex' : 'none' }}
        >
          <span className={styles.slideNextText}>
            {'Selanjutnya: '}
            <strong>
              {nextPrayer ? `${nextPrayer.label} (${nextPrayer.time})` : '-'}
            </strong>
          </span>
          <span className={styles.slideCountdown}>{`-${countdown}`}</span>
        </div>
      </div>
    </section>
  )
}

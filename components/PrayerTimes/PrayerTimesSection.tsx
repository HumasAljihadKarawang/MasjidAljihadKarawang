'use client'

import { useState, useEffect, useCallback } from 'react'
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
import styles from './PrayerTimesSection.module.css'

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

export default function PrayerTimesSection() {
  const [location, setLocation] = useState<RegencyCity>(DEFAULT_LOCATION)
  const [locationMode, setLocationMode] = useState<'checkpoint' | 'gps' | 'custom'>('checkpoint')
  const [detectingGps, setDetectingGps] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const [timings, setTimings] = useState<PrayerTimes | null>(null)
  const [dateInfo, setDateInfo] = useState<{
    gregorian: string
    hijri: string
  } | null>(null)
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; label: string } | null>(null)
  const [countdown, setCountdown] = useState<string>('--:--:--')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Sinkronisasi ketika lokasi diubah dari kartu Hero di atas
  useEffect(() => {
    const handleLocationChanged = (e: Event) => {
      const custom = e as CustomEvent
      if (custom.detail?.location) {
        setLocation(custom.detail.location)
        setLocationMode(custom.detail.mode || 'custom')
      }
    }
    window.addEventListener('location-changed', handleLocationChanged)
    return () => window.removeEventListener('location-changed', handleLocationChanged)
  }, [])

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
          new CustomEvent('location-changed-from-section', {
            detail: { location: detectedLocation, mode: 'gps' },
          })
        )
        if (showFeedback) {
          setStatusMsg(`Lokasi terdeteksi: ${nearest.name}, ${nearest.province}`)
          setTimeout(() => setStatusMsg(''), 3500)
        }
      },
      () => {
        setLocation(DEFAULT_LOCATION)
        setLocationMode('checkpoint')
        setDetectingGps(false)
        window.dispatchEvent(
          new CustomEvent('location-changed-from-section', {
            detail: { location: DEFAULT_LOCATION, mode: 'checkpoint' },
          })
        )
        if (showFeedback) {
          setStatusMsg('Lokasi tidak diizinkan/terdeteksi. Mengikuti Checkpoint Kab. Karawang.')
          setTimeout(() => setStatusMsg(''), 4000)
        }
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 }
    )
  }, [])

  const fetchPrayerTimes = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const data = await getPrayerTimesByLocation(location)
      setTimings(data.data.timings)

      const gregorianDate = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: location.timezone,
      })

      const hijri = data.data.date.hijri
      setDateInfo({
        gregorian: gregorianDate,
        hijri: `${hijri.day} ${HIJRI_MONTHS_ID[hijri.month.en] || hijri.month.en} ${hijri.year} H`,
      })

      const next = getNextPrayer(data.data.timings, location.timezone)
      setNextPrayer(next)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('prayer-times-updated', {
            detail: { timings: data.data.timings, location },
          })
        )
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [location])

  useEffect(() => {
    fetchPrayerTimes()
  }, [fetchPrayerTimes])

  // Countdown mengikuti zona waktu lokasi terpilih
  useEffect(() => {
    if (!timings) return

    const updateCountdown = () => {
      const next = getNextPrayer(timings, location.timezone)
      setNextPrayer(next)
      if (!next) return

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

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [timings, location.timezone])

  const isCurrentPrayer = (prayerName: string) => {
    if (!timings || !nextPrayer) return false
    const prayerIdx = PRAYER_ORDER.indexOf(prayerName)
    const nextIdx = PRAYER_ORDER.indexOf(nextPrayer.name)
    if (nextIdx === 0) return prayerIdx === PRAYER_ORDER.length - 1
    return prayerIdx === nextIdx - 1
  }

  const availableCities = getCitiesByProvince(location.province)

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
        new CustomEvent('location-changed-from-section', { detail: { location: chosen, mode } })
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
        new CustomEvent('location-changed-from-section', { detail: { location: found, mode } })
      )
    }
  }

  const handleResetKarawang = () => {
    setLocation(DEFAULT_LOCATION)
    setLocationMode('checkpoint')
    window.dispatchEvent(
      new CustomEvent('location-changed-from-section', {
        detail: { location: DEFAULT_LOCATION, mode: 'checkpoint' },
      })
    )
    setStatusMsg('Kembali ke Checkpoint: Kab. Karawang (WIB)')
    setTimeout(() => setStatusMsg(''), 3000)
  }

  return (
    <section id="waktu-sholat" className={styles.section}>
      <div className="container">
        {/* Header */}
        <div className={`section-header center ${styles.header}`}>
          <span className="section-badge">Waktu Sholat</span>
          <h2 className="section-title">
            Jadwal Sholat <span>{location.name}</span>
          </h2>
          <p className="section-subtitle">
            Waktu sholat akurat wilayah {location.name}, {location.province} ({location.tzLabel}) menggunakan metode Kemenag RI
          </p>
        </div>

        <div className={styles.prayerContent}>
          {/* Custom Region Bar */}
          <div className={styles.regionCard}>
            <div className={styles.regionSelects}>
              <div className={styles.selectCol}>
                <label>Provinsi</label>
                <select
                  value={location.province}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                >
                  {INDONESIA_PROVINCES_RAW.map((prov) => (
                    <option key={prov.name} value={prov.name}>
                      {prov.name} ({prov.tzLabel})
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.selectCol}>
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
            </div>

            <div className={styles.regionActions}>
              <button
                type="button"
                className={styles.gpsActionBtn}
                onClick={() => detectUserLocation(true)}
                disabled={detectingGps}
              >
                {detectingGps ? '⏳ Mendeteksi...' : '📍 Deteksi Lokasi Saya'}
              </button>
              <button
                type="button"
                className={`${styles.checkpointActionBtn} ${
                  locationMode === 'checkpoint' ? styles.activeCheckpoint : ''
                }`}
                onClick={handleResetKarawang}
              >
                🕌 Checkpoint Karawang
              </button>
            </div>
            <div
              className={styles.statusNote}
              style={{ display: statusMsg ? 'block' : 'none' }}
            >
              {statusMsg}
            </div>
          </div>

          <div
            className={styles.loadingState}
            style={{ display: loading ? 'flex' : 'none' }}
          >
            <div className="spinner" />
            <p>Memuat jadwal sholat...</p>
          </div>

          <div
            className={styles.errorState}
            style={{ display: !loading && error ? 'flex' : 'none' }}
          >
            <span>⚠️</span>
            <p>Gagal memuat jadwal sholat. Periksa koneksi internet.</p>
            <button className="btn btn-primary" onClick={fetchPrayerTimes}>
              Coba Lagi
            </button>
          </div>

          <div style={{ display: !loading && !error ? 'block' : 'none' }}>
            {/* Date Row */}
            <div className={styles.dateRow}>
              <div className={styles.dateItem}>
                <span className={styles.dateIcon}>📅</span>
                <span className={styles.dateText}>{dateInfo?.gregorian || '-'}</span>
              </div>
              <div className={styles.dateDivider}>|</div>
              <div className={styles.dateItem}>
                <span className={styles.dateIcon}>☽</span>
                <span className={styles.dateText}>{dateInfo?.hijri || '-'}</span>
              </div>
            </div>

            {/* Next Prayer Countdown */}
            <div
              className={styles.nextPrayer}
              style={{ display: nextPrayer ? 'block' : 'none' }}
            >
              <div className={styles.nextPrayerContent}>
                <div className={styles.nextPrayerLeft}>
                  <span className={styles.nextLabel}>
                    {`Waktu Sholat Berikutnya • ${location.name}`}
                  </span>
                  <span className={styles.nextName}>
                    {nextPrayer
                      ? `${PRAYER_ICONS_MAP[nextPrayer.name]} ${nextPrayer.label}`
                      : '-'}
                  </span>
                  <span className={styles.nextTime}>
                    {nextPrayer ? `Pukul ${nextPrayer.time} ${location.tzLabel}` : '-'}
                  </span>
                </div>
                <div className={styles.nextPrayerRight}>
                  <span className={styles.countdownLabel}>Hitung Mundur</span>
                  <span className={styles.countdown}>{countdown}</span>
                </div>
              </div>
              <div className={styles.nextPrayerProgress}>
                <div className={styles.progressBar} />
              </div>
            </div>

            {/* Prayer Times Grid */}
            <div className={styles.prayerGrid}>
              {PRAYER_ORDER.map((prayer) => {
                const time = timings ? timings[prayer as keyof PrayerTimes] : '--:--'
                const isCurrent = isCurrentPrayer(prayer)
                const isNext = nextPrayer?.name === prayer

                return (
                  <div
                    key={prayer}
                    className={`${styles.prayerCard} ${isCurrent ? styles.current : ''} ${
                      isNext ? styles.next : ''
                    }`}
                  >
                    <div className={styles.prayerIcon}>
                      {PRAYER_ICONS_MAP[prayer] || '🕌'}
                    </div>
                    <div className={styles.prayerInfo}>
                      <span className={styles.prayerName}>{PRAYER_NAMES[prayer]}</span>
                      <span
                        className={styles.nextBadge}
                        style={{ display: isNext ? 'inline-block' : 'none' }}
                      >
                        Berikutnya
                      </span>
                      <span
                        className={styles.currentBadge}
                        style={{ display: isCurrent ? 'inline-block' : 'none' }}
                      >
                        Sedang Berlangsung
                      </span>
                    </div>
                    <span className={styles.prayerTime}>
                      {`${time} ${location.tzLabel}`}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Footer note */}
            <p className={styles.footerNote}>
              📌 Jadwal menggunakan metode Kemenag RI • Checkpoint utama: Kab. Karawang (WIB)
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  JUZ_DATABASE,
  QARI_LIST,
  getJuzForSurah,
  getDirectSurahAudioUrl,
  getDirectAyatAudioUrl,
  type SurahSummary,
  type SurahDetail,
  type AyatItem,
} from '@/lib/quranData'
import styles from './QuranBookReader.module.css'

const AYAT_PER_PAGE = 3 // 3 ayat per lembar halaman (6 ayat per 1 bukaan buku kanan-kiri)

export default function QuranBookReader() {
  const [mode, setMode] = useState<'surat' | 'klasifikasi_juz' | 'baca_juz'>('surat')
  const [surahList, setSurahList] = useState<SurahSummary[]>([])
  const [selectedJuz, setSelectedJuz] = useState<number>(30)
  const [selectedSurahNo, setSelectedSurahNo] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState('')

  const [currentSurah, setCurrentSurah] = useState<SurahDetail | null>(null)
  const [displayedAyat, setDisplayedAyat] = useState<AyatItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Spread index: setiap spread menampilkan 2 halaman (Halaman Kanan = Ganjil, Halaman Kiri = Genap)
  const [spreadIndex, setSpreadIndex] = useState<number>(0)
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null)

  // Tampilan teks
  const [showLatin, setShowLatin] = useState<boolean>(true)
  const [showTerjemah, setShowTerjemah] = useState<boolean>(true)

  // Murottal Audio
  const [selectedQari, setSelectedQari] = useState<string>('05')
  const [isPlayingFull, setIsPlayingFull] = useState<boolean>(false)
  const [playingAyatNo, setPlayingAyatNo] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 1. Ambil daftar 114 Surat dari EQuran.id API v2
  useEffect(() => {
    fetch('https://equran.id/api/v2/surat')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) {
          setSurahList(json.data)
        }
      })
      .catch(() => {})
  }, [])

  // 2. Ambil detail Surat atau Juz
  const loadSurahOrJuz = useCallback(
    async (surahNo: number, targetStartAyat = 1) => {
      setLoading(true)
      try {
        const res = await fetch(`https://equran.id/api/v2/surat/${surahNo}`)
        const json = await res.json()
        if (json?.data) {
          const detail: SurahDetail = json.data
          setCurrentSurah(detail)

          if (mode === 'baca_juz') {
            // Filter ayat dalam surat ini yang termasuk ke dalam Juz terpilih
            const juzInfo = JUZ_DATABASE.find((j) => j.juz === selectedJuz)
            const rangeInJuz = juzInfo?.daftarSurat.find((s) => s.surahNomor === surahNo)
            if (rangeInJuz) {
              const filtered = detail.ayat.filter(
                (a) =>
                  a.nomorAyat >= rangeInJuz.ayatMulai && a.nomorAyat <= rangeInJuz.ayatSelesai
              )
              setDisplayedAyat(filtered)
              setSpreadIndex(0)
            } else {
              setDisplayedAyat(detail.ayat)
              setSpreadIndex(0)
            }
          } else {
            setDisplayedAyat(detail.ayat)
            const initialIdx = Math.max(0, targetStartAyat - 1)
            const targetSpread = Math.floor(initialIdx / (AYAT_PER_PAGE * 2))
            setSpreadIndex(targetSpread)
          }
        }
      } catch {
        // Fallback aman
      } finally {
        setLoading(false)
      }
    },
    [mode, selectedJuz]
  )

  useEffect(() => {
    loadSurahOrJuz(selectedSurahNo, 1)
  }, [selectedSurahNo, loadSurahOrJuz])

  // Pre-buffer audio surat otomatis saat pilih surat/qari agar fast-response ketika diklik Play
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlayingFull(false)
      setPlayingAyatNo(null)
      audioRef.current.src = getDirectSurahAudioUrl(selectedSurahNo, selectedQari)
      audioRef.current.preload = 'auto'
      audioRef.current.load()
    }
  }, [selectedSurahNo, selectedQari])

  // Pilih Juz pada mode Klasifikasi Juz / Baca Juz
  const handleSelectJuz = (juzNo: number) => {
    setSelectedJuz(juzNo)
    const foundJuz = JUZ_DATABASE.find((j) => j.juz === juzNo)
    if (foundJuz && foundJuz.daftarSurat.length > 0) {
      const firstSurah = foundJuz.daftarSurat[0]
      setSelectedSurahNo(firstSurah.surahNomor)
      loadSurahOrJuz(firstSurah.surahNomor, firstSurah.ayatMulai)
    }
  }

  // Trigger animasi buka buku (3D Page Turn)
  const triggerFlip = (dir: 'next' | 'prev', nextSpread: number) => {
    setFlipDirection(dir)
    setSpreadIndex(nextSpread)
    setTimeout(() => {
      setFlipDirection(null)
    }, 740)
  }

  const totalPages = Math.max(1, Math.ceil(displayedAyat.length / AYAT_PER_PAGE))
  const totalSpreads = Math.max(1, Math.ceil(totalPages / 2))

  const handleNextSpread = () => {
    if (spreadIndex < totalSpreads - 1) {
      triggerFlip('next', spreadIndex + 1)
    }
  }

  const handlePrevSpread = () => {
    if (spreadIndex > 0) {
      triggerFlip('prev', spreadIndex - 1)
    }
  }

  // Putar Murottal Full 1 Surat
  const handleToggleFullMurottal = () => {
    if (!audioRef.current) return
    const url =
      currentSurah?.audioFull?.[selectedQari] ||
      getDirectSurahAudioUrl(selectedSurahNo, selectedQari)

    if (isPlayingFull) {
      audioRef.current.pause()
      setIsPlayingFull(false)
    } else {
      setPlayingAyatNo(null)
      if (audioRef.current.src !== url) {
        audioRef.current.src = url
      }
      audioRef.current.play()
      setIsPlayingFull(true)
    }
  }

  // Putar Murottal Per Ayat
  const handlePlayAyat = (ayat: AyatItem) => {
    if (!audioRef.current) return
    const url =
      ayat.audio?.[selectedQari] ||
      getDirectAyatAudioUrl(selectedSurahNo, ayat.nomorAyat, selectedQari)

    if (playingAyatNo === ayat.nomorAyat) {
      audioRef.current.pause()
      setPlayingAyatNo(null)
    } else {
      setIsPlayingFull(false)
      audioRef.current.src = url
      audioRef.current.play()
      setPlayingAyatNo(ayat.nomorAyat)
    }
  }

  // Halaman Kanan (Ganjil — dibaca terlebih dahulu sesuai urutan Mushaf Arab RTL)
  const rightPageNumber = spreadIndex * 2 + 1
  const rightPageAyat = displayedAyat.slice(
    (rightPageNumber - 1) * AYAT_PER_PAGE,
    rightPageNumber * AYAT_PER_PAGE
  )

  // Halaman Kiri (Genap — lanjutan dari halaman kanan)
  const leftPageNumber = spreadIndex * 2 + 2
  const leftPageAyat = displayedAyat.slice(
    (leftPageNumber - 1) * AYAT_PER_PAGE,
    leftPageNumber * AYAT_PER_PAGE
  )

  const currentJuzInfo = JUZ_DATABASE.find((j) => j.juz === selectedJuz) || JUZ_DATABASE[29]
  const filteredSurahList = surahList.filter(
    (s) =>
      s.namaLatin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.arti.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(s.nomor) === searchQuery.trim()
  )

  const juzListForCurrentSurah = getJuzForSurah(selectedSurahNo)

  return (
    <div className={styles.readerWrapper}>
      <audio
        ref={audioRef}
        onEnded={() => {
          setIsPlayingFull(false)
          setPlayingAyatNo(null)
        }}
      />

      {/* PANEL KONTROL ATAS */}
      <div className={styles.controlCard}>
        <div className={styles.modeTabs}>
          <div className={styles.modeBtnGroup}>
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === 'surat' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('surat')}
            >
              Pilih Per Surat (114 Surat)
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${
                mode === 'klasifikasi_juz' ? styles.modeBtnActive : ''
              }`}
              onClick={() => setMode('klasifikasi_juz')}
            >
              Klasifikasi Surat Per Juz (30 Juz)
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === 'baca_juz' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('baca_juz')}
            >
              Filter Ayat Per Juz
            </button>
          </div>

          <div className={styles.viewToggles}>
            <button
              type="button"
              className={`${styles.toggleChip} ${showLatin ? styles.toggleChipActive : ''}`}
              onClick={() => setShowLatin(!showLatin)}
            >
              {showLatin ? '✓ Teks Latin' : 'Teks Latin'}
            </button>
            <button
              type="button"
              className={`${styles.toggleChip} ${showTerjemah ? styles.toggleChipActive : ''}`}
              onClick={() => setShowTerjemah(!showTerjemah)}
            >
              {showTerjemah ? '✓ Terjemahan' : 'Terjemahan'}
            </button>
          </div>
        </div>

        {/* Pilihan Juz, Surat, dan Pencarian */}
        <div className={styles.filterGrid}>
          <div className={styles.fieldBox}>
            <label>Pilih Juz (1 – 30)</label>
            <select
              value={selectedJuz}
              onChange={(e) => handleSelectJuz(Number(e.target.value))}
            >
              {JUZ_DATABASE.map((j) => (
                <option key={j.juz} value={j.juz}>
                  {`${j.namaJuz} — (${j.mulai})`}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldBox}>
            <label>Pilih Surat (1 – 114)</label>
            <select
              value={selectedSurahNo}
              onChange={(e) => setSelectedSurahNo(Number(e.target.value))}
            >
              {(filteredSurahList.length > 0 ? filteredSurahList : surahList).map((s) => (
                <option key={s.nomor} value={s.nomor}>
                  {`${s.nomor}. ${s.namaLatin} (${s.arti}) — ${s.jumlahAyat} Ayat [Juz ${getJuzForSurah(
                    s.nomor
                  ).join(', ')}]`}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldBox}>
            <label>Cari Nama / Nomor Surat</label>
            <input
              type="text"
              placeholder="Ketik Yasin, Al-Kahf, Al-Mulk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Box Klasifikasi Surat di dalam Juz Terpilih */}
        <div
          className={styles.juzClassBox}
          style={{
            display: mode === 'klasifikasi_juz' || mode === 'baca_juz' ? 'block' : 'none',
          }}
        >
          <div className={styles.juzClassHeader}>
            <span className={styles.juzClassTitle}>
              {`Daftar Surat di dalam ${currentJuzInfo.namaJuz}:`}
            </span>
            <span className={styles.juzClassRange}>{currentJuzInfo.mulai}</span>
          </div>
          <div className={styles.juzSurahList}>
            {currentJuzInfo.daftarSurat.map((item) => (
              <button
                key={`${currentJuzInfo.juz}-${item.surahNomor}`}
                type="button"
                className={`${styles.juzSurahPill} ${
                  selectedSurahNo === item.surahNomor ? styles.juzSurahPillActive : ''
                }`}
                onClick={() => {
                  setSelectedSurahNo(item.surahNomor)
                  loadSurahOrJuz(item.surahNomor, item.ayatMulai)
                }}
              >
                {`QS. ${item.namaLatin} (Ayat ${item.ayatMulai}–${item.ayatSelesai})`}
              </button>
            ))}
          </div>
        </div>

        {/* Pemutar Audio Murottal */}
        <div className={styles.murottalBar}>
          <div className={styles.murottalLeft}>
            <button
              type="button"
              className={styles.playSuratBtn}
              onClick={handleToggleFullMurottal}
            >
              <span>{isPlayingFull ? '⏸' : '▶'}</span>
              <span>{isPlayingFull ? 'Jeda Murottal' : 'Putar Murottal Full Surat'}</span>
            </button>
            <div className={styles.murottalMeta}>
              <span className={styles.murottalLabel}>Audio Murottal Al-Qur&apos;an</span>
              <span className={styles.murottalSurah}>
                {currentSurah
                  ? `QS. ${currentSurah.namaLatin} (${currentSurah.arti}) • Juz ${juzListForCurrentSurah.join(
                      ', '
                    )}`
                  : 'Memuat Surat...'}
              </span>
            </div>
          </div>

          <div className={styles.qariSelectWrap}>
            <label>Pilih Qari:</label>
            <select
              className={styles.qariSelect}
              value={selectedQari}
              onChange={(e) => setSelectedQari(e.target.value)}
            >
              {QARI_LIST.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.nama}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TAMPILAN MUSHAF BUKU TERBUKA 3D (KANAN & KIRI) */}
      <div className={styles.mushafStage}>
        <div className={styles.mushafCover}>
          <div
            className={`${styles.mushafBookSpread} ${
              flipDirection === 'next'
                ? styles.flipNextAnim
                : flipDirection === 'prev'
                ? styles.flipPrevAnim
                : ''
            }`}
          >
            {/* HALAMAN SEBELAH KIRI (Halaman Genap — Lanjutan Bacaan) */}
            <div className={`${styles.mushafPage} ${styles.mushafPageLeft}`}>
              <div className={styles.pageInnerFrame}>
                <div>
                  <div className={styles.pageHeader}>
                    <span>{`Juz ${juzListForCurrentSurah.join(', ')}`}</span>
                    <span>
                      {currentSurah ? `QS. ${currentSurah.namaLatin}` : 'Al-Qur’an Al-Karim'}
                    </span>
                  </div>

                  <div
                    className={styles.loadingBox}
                    style={{ display: loading ? 'flex' : 'none' }}
                  >
                    <div className="spinner" />
                    <span>Membuka lembaran Mushaf...</span>
                  </div>

                  <div
                    className={styles.ayatListContainer}
                    style={{ display: !loading && leftPageAyat.length > 0 ? 'flex' : 'none' }}
                  >
                    {leftPageAyat.map((ayat) => (
                      <div
                        key={ayat.nomorAyat}
                        className={`${styles.ayatBlock} ${
                          playingAyatNo === ayat.nomorAyat ? styles.ayatBlockPlaying : ''
                        }`}
                      >
                        <div className={styles.ayatTopRow}>
                          <span className={styles.ayatNumberBadge}>
                            {`${currentSurah?.namaLatin || 'Ayat'} : ${ayat.nomorAyat}`}
                          </span>
                          <button
                            type="button"
                            className={styles.playAyatMiniBtn}
                            onClick={() => handlePlayAyat(ayat)}
                          >
                            {playingAyatNo === ayat.nomorAyat ? '⏸ Jeda Ayat' : '▶ Putar Ayat'}
                          </button>
                        </div>

                        <p className={styles.ayatArabicText}>{ayat.teksArab}</p>

                        <p
                          className={styles.ayatLatinText}
                          style={{ display: showLatin ? 'block' : 'none' }}
                        >
                          {ayat.teksLatin}
                        </p>

                        <p
                          className={styles.ayatIndoText}
                          style={{ display: showTerjemah ? 'block' : 'none' }}
                        >
                          {ayat.teksIndonesia}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div
                    className={styles.emptyPageNotice}
                    style={{ display: !loading && leftPageAyat.length === 0 ? 'flex' : 'none' }}
                  >
                    Akhir dari lembaran surat ini. Silakan pilih surat berikutnya.
                  </div>
                </div>

                <div className={styles.pageFooter}>
                  <span className={styles.pageNumberCircle}>{`Hal. ${leftPageNumber}`}</span>
                </div>
              </div>
            </div>

            {/* LIPATAN TENGAH BUKU (SPINE) */}
            <div className={styles.bookSpine} />

            {/* HALAMAN SEBELAH KANAN (Halaman Ganjil — Awal Bacaan Sesuai Mushaf Arab) */}
            <div className={`${styles.mushafPage} ${styles.mushafPageRight}`}>
              <div className={styles.pageInnerFrame}>
                <div>
                  <div className={styles.pageHeader}>
                    <span>
                      {currentSurah
                        ? `${currentSurah.nomor}. QS. ${currentSurah.namaLatin}`
                        : 'Al-Qur’an'}
                    </span>
                    <span>{`Juz ${juzListForCurrentSurah.join(', ')}`}</span>
                  </div>

                  {/* Banner Ornamen Kepala Surat pada Halaman Pertama */}
                  <div
                    className={styles.surahOrnamentBanner}
                    style={{ display: !loading && spreadIndex === 0 ? 'block' : 'none' }}
                  >
                    <span className={styles.bannerArabicName}>{currentSurah?.nama}</span>
                    <span className={styles.bannerLatinMeta}>
                      {currentSurah
                        ? `Surat ${currentSurah.namaLatin} (${currentSurah.arti}) • ${currentSurah.tempatTurun} • ${currentSurah.jumlahAyat} Ayat`
                        : ''}
                    </span>
                  </div>

                  <div
                    className={styles.bismillahHeader}
                    style={{
                      display:
                        !loading &&
                        spreadIndex === 0 &&
                        selectedSurahNo !== 1 &&
                        selectedSurahNo !== 9
                          ? 'block'
                          : 'none',
                    }}
                  >
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </div>

                  <div
                    className={styles.loadingBox}
                    style={{ display: loading ? 'flex' : 'none' }}
                  >
                    <div className="spinner" />
                    <span>Membuka lembaran Mushaf...</span>
                  </div>

                  <div
                    className={styles.ayatListContainer}
                    style={{ display: !loading ? 'flex' : 'none' }}
                  >
                    {rightPageAyat.map((ayat) => (
                      <div
                        key={ayat.nomorAyat}
                        className={`${styles.ayatBlock} ${
                          playingAyatNo === ayat.nomorAyat ? styles.ayatBlockPlaying : ''
                        }`}
                      >
                        <div className={styles.ayatTopRow}>
                          <span className={styles.ayatNumberBadge}>
                            {`${currentSurah?.namaLatin || 'Ayat'} : ${ayat.nomorAyat}`}
                          </span>
                          <button
                            type="button"
                            className={styles.playAyatMiniBtn}
                            onClick={() => handlePlayAyat(ayat)}
                          >
                            {playingAyatNo === ayat.nomorAyat ? '⏸ Jeda Ayat' : '▶ Putar Ayat'}
                          </button>
                        </div>

                        <p className={styles.ayatArabicText}>{ayat.teksArab}</p>

                        <p
                          className={styles.ayatLatinText}
                          style={{ display: showLatin ? 'block' : 'none' }}
                        >
                          {ayat.teksLatin}
                        </p>

                        <p
                          className={styles.ayatIndoText}
                          style={{ display: showTerjemah ? 'block' : 'none' }}
                        >
                          {ayat.teksIndonesia}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.pageFooter}>
                  <span className={styles.pageNumberCircle}>{`Hal. ${rightPageNumber}`}</span>
                </div>
              </div>
            </div>
          </div>

          {/* TOMBOL BUKA HALAMAN BUKU (NEXT / PREV LEMBARAN) */}
          <div className={styles.bookBottomNav}>
            <button
              type="button"
              className={styles.flipPageBtn}
              onClick={handleNextSpread}
              disabled={spreadIndex >= totalSpreads - 1}
            >
              ← Buka Lembar Berikutnya
            </button>

            <span className={styles.spreadIndicator}>
              {`Lembaran ${spreadIndex + 1} dari ${totalSpreads} • QS. ${
                currentSurah?.namaLatin || ''
              }`}
            </span>

            <button
              type="button"
              className={styles.flipPageBtn}
              onClick={handlePrevSpread}
              disabled={spreadIndex <= 0}
            >
              Lembar Sebelumnya →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

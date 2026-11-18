'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  JUZ_DATABASE,
  QARI_LIST,
  getDirectSurahAudioUrl,
  type SurahSummary,
} from '@/lib/quranData'
import styles from './QuranFullPageTajweed.module.css'

interface TajweedVerse {
  id: number
  verse_key: string
  text_uthmani_tajweed: string
}

// Halaman awal standar Mushaf Madinah 15 Baris (604 Halaman) untuk masing-masing Juz 1 - 30
const JUZ_START_PAGE: Record<number, number> = {
  1: 1,
  2: 22,
  3: 42,
  4: 62,
  5: 82,
  6: 102,
  7: 121,
  8: 142,
  9: 162,
  10: 182,
  11: 201,
  12: 222,
  13: 242,
  14: 262,
  15: 282,
  16: 302,
  17: 322,
  18: 342,
  19: 362,
  20: 382,
  21: 402,
  22: 422,
  23: 442,
  24: 462,
  25: 482,
  26: 502,
  27: 522,
  28: 542,
  29: 562,
  30: 582,
}

// Halaman awal standar Mushaf Madinah untuk 114 Surat
const SURAH_START_PAGE: number[] = [
  1, 2, 50, 77, 106, 128, 151, 177, 187, 208, 221, 235, 249, 255, 262, 267, 282, 293, 305, 312,
  322, 332, 342, 350, 359, 367, 377, 385, 396, 404, 411, 415, 418, 428, 434, 440, 446, 453, 458,
  467, 477, 483, 489, 496, 499, 502, 507, 511, 515, 518, 520, 523, 526, 528, 531, 534, 537, 542,
  545, 549, 551, 553, 554, 556, 558, 560, 562, 564, 566, 568, 570, 572, 574, 575, 577, 578, 580,
  582, 583, 585, 586, 587, 587, 589, 590, 591, 591, 592, 593, 594, 595, 595, 596, 596, 597, 597,
  598, 598, 599, 599, 600, 600, 601, 601, 601, 602, 602, 602, 603, 603, 603, 604, 604, 604,
]

function toArabicNumeral(n: number): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}

export default function QuranFullPageTajweed() {
  const [surahList, setSurahList] = useState<SurahSummary[]>([])
  // rightPage adalah halaman ganjil (1, 3, 5, ..., 603), leftPage adalah rightPage + 1 (2, 4, ..., 604)
  const [rightPage, setRightPage] = useState<number>(1)
  const [selectedJuz, setSelectedJuz] = useState<number>(1)
  const [selectedSurahNo, setSelectedSurahNo] = useState<number>(1)

  const [rightVerses, setRightVerses] = useState<TajweedVerse[]>([])
  const [leftVerses, setLeftVerses] = useState<TajweedVerse[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null)

  // Audio Murottal Per Surat Saja
  const [selectedQari, setSelectedQari] = useState<string>('05')
  const [isPlayingSurah, setIsPlayingSurah] = useState<boolean>(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const leftPage = Math.min(604, rightPage + 1)
  const activeSurahObj = surahList.find((s) => s.nomor === selectedSurahNo)

  // Ambil daftar 114 Surat & URL Murottal Full Surat dari EQuran.id
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

  // Ambil data halaman Mushaf Tajwid Berwarna (Halaman Kanan & Halaman Kiri) dari Quran.com API v4
  const fetchSpreadPages = useCallback(async (oddPage: number) => {
    setLoading(true)
    const evenPage = Math.min(604, oddPage + 1)
    try {
      const [resRight, resLeft] = await Promise.all([
        fetch(`https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?page_number=${oddPage}`),
        fetch(`https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?page_number=${evenPage}`),
      ])
      const [jsonRight, jsonLeft] = await Promise.all([resRight.json(), resLeft.json()])
      const rVerses: TajweedVerse[] = jsonRight?.verses || []
      const lVerses: TajweedVerse[] = jsonLeft?.verses || []
      setRightVerses(rVerses)
      setLeftVerses(lVerses)

      // Sinkronkan Surat aktif berdasarkan ayat pertama di halaman kanan
      if (rVerses.length > 0) {
        const firstSurahNo = Number(rVerses[0].verse_key.split(':')[0])
        if (firstSurahNo >= 1 && firstSurahNo <= 114) {
          setSelectedSurahNo(firstSurahNo)
        }
      }
    } catch {
      // Fallback aman
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSpreadPages(rightPage)
  }, [rightPage, fetchSpreadPages])

  // Pre-buffer otomatis URL audio di lokal browser setiap kali surat/qari dipilih agar begitu klik Play langsung bunyi tanpa delay
  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.pause()
    setIsPlayingSurah(false)
    const directUrl =
      activeSurahObj?.audioFull?.[selectedQari] ||
      getDirectSurahAudioUrl(selectedSurahNo, selectedQari)
    audioRef.current.src = directUrl
    audioRef.current.preload = 'auto'
    audioRef.current.load()
  }, [selectedSurahNo, selectedQari, activeSurahObj])

  const jumpToPage = (targetPage: number, dir: 'next' | 'prev' = 'next') => {
    const clamped = Math.max(1, Math.min(603, targetPage % 2 === 0 ? targetPage - 1 : targetPage))
    setFlipDirection(dir)
    setRightPage(clamped)
    setTimeout(() => setFlipDirection(null), 740)
  }

  const handleSelectJuz = (juzNo: number) => {
    setSelectedJuz(juzNo)
    const startPage = JUZ_START_PAGE[juzNo] || 1
    jumpToPage(startPage, 'next')
  }

  const handleSelectSurah = (surahNo: number) => {
    setSelectedSurahNo(surahNo)
    const startPage = SURAH_START_PAGE[surahNo - 1] || 1
    jumpToPage(startPage, 'next')
  }

  const handleNextSpread = () => {
    if (rightPage + 2 <= 603) {
      jumpToPage(rightPage + 2, 'next')
    }
  }

  const handlePrevSpread = () => {
    if (rightPage - 2 >= 1) {
      jumpToPage(rightPage - 2, 'prev')
    }
  }

  const handleToggleMurottalSurah = () => {
    if (!audioRef.current) return
    const directUrl =
      activeSurahObj?.audioFull?.[selectedQari] ||
      getDirectSurahAudioUrl(selectedSurahNo, selectedQari)

    if (isPlayingSurah) {
      audioRef.current.pause()
      setIsPlayingSurah(false)
    } else {
      if (audioRef.current.src !== directUrl) {
        audioRef.current.src = directUrl
      }
      audioRef.current.play()
      setIsPlayingSurah(true)
    }
  }

  const getSurahNameByNo = (no: number) => {
    const found = surahList.find((s) => s.nomor === no)
    return found ? `سُورَةُ ${found.nama} — QS. ${found.namaLatin}` : `Surat ke-${no}`
  }

  const renderMushafPageContent = (verses: TajweedVerse[]) => {
    return (
      <div className={styles.mushafFullText}>
        {verses.map((v) => {
          const [surahStr, ayahStr] = v.verse_key.split(':')
          const surahNo = Number(surahStr)
          const ayahNo = Number(ayahStr)
          const isFirstAyah = ayahNo === 1

          return (
            <span key={v.id} className={styles.ayahInline}>
              {isFirstAyah && (
                <>
                  <div className={styles.surahHeaderOrnament}>{getSurahNameByNo(surahNo)}</div>
                  {surahNo !== 1 && surahNo !== 9 && (
                    <div className={styles.bismillahLine}>
                      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </div>
                  )}
                </>
              )}
              <span
                dangerouslySetInnerHTML={{
                  __html: v.text_uthmani_tajweed,
                }}
              />
              <span className={styles.ayahEndSymbol}>{`﴿${toArabicNumeral(ayahNo)}﴾`}</span>{' '}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <audio ref={audioRef} onEnded={() => setIsPlayingSurah(false)} />

      {/* PANEL KONTROL ATAS */}
      <div className={styles.controlCard}>
        <div className={styles.filterGrid}>
          <div className={styles.fieldBox}>
            <label>Pilih Juz (1 – 30)</label>
            <select
              value={selectedJuz}
              onChange={(e) => handleSelectJuz(Number(e.target.value))}
            >
              {JUZ_DATABASE.map((j) => (
                <option key={j.juz} value={j.juz}>
                  {`${j.namaJuz} (Mulai Hal. ${JUZ_START_PAGE[j.juz]})`}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldBox}>
            <label>Pilih Surat & Murottal (1 – 114)</label>
            <select
              value={selectedSurahNo}
              onChange={(e) => handleSelectSurah(Number(e.target.value))}
            >
              {surahList.map((s, i) => (
                <option key={s.nomor} value={s.nomor}>
                  {`${s.nomor}. ${s.namaLatin} (${s.arti}) — Hal. ${SURAH_START_PAGE[i] || 1}`}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldBox}>
            <label>Lompat ke Halaman Mushaf (1 – 604)</label>
            <select
              value={rightPage}
              onChange={(e) => jumpToPage(Number(e.target.value), 'next')}
            >
              {Array.from({ length: 302 }, (_, idx) => {
                const pRight = idx * 2 + 1
                const pLeft = pRight + 1
                return (
                  <option key={pRight} value={pRight}>
                    {`Halaman ${pRight} – ${pLeft} (dari 604 Halaman)`}
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        {/* Panduan Warna Tajwid */}
        <div className={styles.legendBar}>
          <span className={styles.legendTitle}>Petunjuk Warna Tajwid:</span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#e66100' }} />
            Ghunnah (Dengung)
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#16803c' }} />
            Idgham Bighunnah / Mimi
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#9333ea' }} />
            Ikhfa Haqiqi & Syafawi
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#0284c7' }} />
            Iqlab
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#dc2626' }} />
            Qalqalah (Pantulan)
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#1d4ed8' }} />
            Mad (Panjang 2–6 Harakat)
          </span>
        </div>

        {/* Pemutar Audio Murottal Per Surat Saja */}
        <div className={styles.murottalBar}>
          <div className={styles.murottalLeft}>
            <button
              type="button"
              className={styles.playSuratBtn}
              onClick={handleToggleMurottalSurah}
            >
              <span>{isPlayingSurah ? '⏸' : '▶'}</span>
              <span>{isPlayingSurah ? 'Jeda Murottal Surat' : 'Putar Murottal Full Surat'}</span>
            </button>
            <div className={styles.murottalMeta}>
              <span className={styles.murottalLabel}>Murottal Per Surat</span>
              <span className={styles.murottalSurah}>
                {activeSurahObj
                  ? `QS. ${activeSurahObj.namaLatin} (${activeSurahObj.arti}) — ${activeSurahObj.jumlahAyat} Ayat`
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

      {/* BUKU MUSHAF 15 BARIS FULL HALAMAN (TAJWID BERWARNA) */}
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
            {/* HALAMAN SEBELAH KIRI (Halaman Genap) */}
            <div className={`${styles.mushafPage} ${styles.mushafPageLeft}`}>
              <div className={styles.pageInnerFrame}>
                <div>
                  <div className={styles.pageHeader}>
                    <span>{`Halaman ${leftPage}`}</span>
                    <span>Mushaf Tajwid 15 Baris</span>
                  </div>

                  <div
                    className={styles.loadingBox}
                    style={{ display: loading ? 'flex' : 'none' }}
                  >
                    <div className="spinner" />
                    <span>Membuka halaman Mushaf Tajwid...</span>
                  </div>

                  <div style={{ display: !loading ? 'block' : 'none' }}>
                    {renderMushafPageContent(leftVerses)}
                  </div>
                </div>

                <div className={styles.pageFooter}>
                  <span className={styles.pageNumberCircle}>{`Hal. ${leftPage}`}</span>
                </div>
              </div>
            </div>

            {/* LIPATAN TENGAH BUKU */}
            <div className={styles.bookSpine} />

            {/* HALAMAN SEBELAH KANAN (Halaman Ganjil — Dibaca Lebih Dulu) */}
            <div className={`${styles.mushafPage} ${styles.mushafPageRight}`}>
              <div className={styles.pageInnerFrame}>
                <div>
                  <div className={styles.pageHeader}>
                    <span>Mushaf Tajwid 15 Baris</span>
                    <span>{`Halaman ${rightPage}`}</span>
                  </div>

                  <div
                    className={styles.loadingBox}
                    style={{ display: loading ? 'flex' : 'none' }}
                  >
                    <div className="spinner" />
                    <span>Membuka halaman Mushaf Tajwid...</span>
                  </div>

                  <div style={{ display: !loading ? 'block' : 'none' }}>
                    {renderMushafPageContent(rightVerses)}
                  </div>
                </div>

                <div className={styles.pageFooter}>
                  <span className={styles.pageNumberCircle}>{`Hal. ${rightPage}`}</span>
                </div>
              </div>
            </div>
          </div>

          {/* TOMBOL BUKA HALAMAN BUKU */}
          <div className={styles.bookBottomNav}>
            <button
              type="button"
              className={styles.flipPageBtn}
              onClick={handleNextSpread}
              disabled={rightPage + 2 > 603}
            >
              {`← Buka Halaman ${Math.min(604, rightPage + 2)}–${Math.min(604, rightPage + 3)}`}
            </button>

            <span className={styles.spreadIndicator}>
              {`Mushaf Halaman ${rightPage} (Kanan) & Halaman ${leftPage} (Kiri) dari 604 Halaman`}
            </span>

            <button
              type="button"
              className={styles.flipPageBtn}
              onClick={handlePrevSpread}
              disabled={rightPage <= 1}
            >
              {`Halaman ${Math.max(1, rightPage - 2)}–${Math.max(2, rightPage - 1)} →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

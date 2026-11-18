'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  masjidStore,
  findScheduleConflicts,
  type AgendaKalenderItem,
} from '@/lib/masjidStore'
import { getActiveSupabaseConfig, getSupabaseClient } from '@/lib/supabase'
import styles from './KalenderSection.module.css'

const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

export default function KalenderSection() {
  const [agendas, setAgendas] = useState<AgendaKalenderItem[]>(masjidStore.getKalender())
  const [viewYear, setViewYear] = useState<number>(2026)
  const [viewMonth, setViewMonth] = useState<number>(10) // November (0-indexed = 10)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const syncKalender = useCallback(async () => {
    setAgendas(masjidStore.getKalender())
    const cfg = getActiveSupabaseConfig()
    if (cfg.isConfigured) {
      const sb = getSupabaseClient()
      const { data } = await sb
        .from('jadwal_terdekat')
        .select('*')
        .eq('aktif', true)
        .order('tanggal', { ascending: true })
      if (data && data.length > 0) {
        const mapped: AgendaKalenderItem[] = data.map((d) => ({
          id: d.id,
          judul: d.nama_acara,
          pemateri: d.pemateri || 'DKM Al-Jihad',
          tanggal: d.tanggal,
          jamMulai: d.jam_mulai || '18:30',
          jamSelesai: d.jam_selesai || '20:00',
          ruangan: d.lokasi || 'Ruang Sholat Utama Lantai 1',
          kategori: (d.kategori || 'Kajian') as AgendaKalenderItem['kategori'],
          keterangan: d.keterangan || '',
        }))
        setAgendas(mapped)
      }
    }
  }, [])

  useEffect(() => {
    syncKalender()
    window.addEventListener('aljihad-store-updated', syncKalender)
    return () => window.removeEventListener('aljihad-store-updated', syncKalender)
  }, [syncKalender])

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
    setSelectedDate(null)
  }

  const displayedAgendas = selectedDate
    ? agendas.filter((a) => a.tanggal === selectedDate)
    : agendas

  return (
    <section id="kalender-masjid" className={styles.section}>
      <div className="container">
        <div className="section-header center">
          <h2 className="section-title">
            Kalender Kegiatan & <span>Indikator Jadwal</span> Masjid
          </h2>
          <p className="section-subtitle">
            Sistem pemantauan jadwal acara dan penggunaan ruangan Masjid Al-Jihad Karawang agar
            terkoordinasi dan bebas bentrok jadwal
          </p>
        </div>

        <div className={styles.calendarLayout}>
          {/* Kiri: Kalender Bulanan Interaktif */}
          <div className={styles.calendarCard}>
            <div className={styles.calTopBar}>
              <h3 className={styles.monthTitle}>{`${NAMA_BULAN[viewMonth]} ${viewYear}`}</h3>
              <div className={styles.monthNavBtns}>
                <button type="button" className={styles.monthBtn} onClick={handlePrevMonth}>
                  ‹
                </button>
                <button type="button" className={styles.monthBtn} onClick={handleNextMonth}>
                  ›
                </button>
              </div>
            </div>

            <div className={styles.dayHeaderGrid}>
              {['Ahd', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className={styles.daysGrid}>
              {Array.from({ length: firstDayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(
                  dayNum
                ).padStart(2, '0')}`
                const dayEvents = agendas.filter((a) => a.tanggal === dateStr)
                const hasConflict = dayEvents.some(
                  (ev) => findScheduleConflicts(ev, agendas, ev.id).length > 0
                )

                return (
                  <button
                    key={dateStr}
                    type="button"
                    className={`${styles.dayCell} ${
                      selectedDate === dateStr ? styles.daySelected : ''
                    } ${dayEvents.length > 0 ? styles.dayHasEvent : ''} ${
                      hasConflict ? styles.dayHasConflict : ''
                    }`}
                    onClick={() =>
                      setSelectedDate(selectedDate === dateStr ? null : dateStr)
                    }
                  >
                    <span>{dayNum}</span>
                    {dayEvents.length > 0 && (
                      <span
                        className={`${styles.eventCountBadge} ${
                          hasConflict ? styles.conflictCountBadge : ''
                        }`}
                      >
                        {dayEvents.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className={styles.legendRow}>
              <span className={styles.legendBadge}>
                <span className={styles.dotGreen} />
                Jadwal Terkoordinasi (Aman)
              </span>
              <span className={styles.legendBadge}>
                <span className={styles.dotRed} />
                Indikator Jam Beririsan / Bentrok
              </span>
            </div>
          </div>

          {/* Kanan: Daftar Agenda & Status Bentrok */}
          <div className={styles.agendaCard}>
            <div className={styles.agendaHeader}>
              <h3 className={styles.agendaTitle}>
                {selectedDate
                  ? `Daftar Acara Tanggal ${selectedDate}`
                  : 'Seluruh Jadwal Kegiatan Terdekat'}
              </h3>
              <button
                type="button"
                className={styles.filterResetBtn}
                style={{ display: selectedDate ? 'inline-block' : 'none' }}
                onClick={() => setSelectedDate(null)}
              >
                Tampilkan Semua Tanggal
              </button>
            </div>

            <div className={styles.agendaList}>
              {displayedAgendas.map((item) => {
                const conflicts = findScheduleConflicts(item, agendas, item.id)
                const isConflict = conflicts.length > 0

                return (
                  <div
                    key={item.id}
                    className={`${styles.agendaItem} ${
                      isConflict ? styles.agendaItemConflict : ''
                    }`}
                  >
                    <div className={styles.agendaTop}>
                      <span className={styles.timeBadge}>
                        {`${item.tanggal} • ${item.jamMulai} – ${item.jamSelesai} WIB`}
                      </span>
                      <span className={isConflict ? styles.conflictBadge : styles.safeBadge}>
                        {isConflict
                          ? `⚠️ Bentrok Jam dengan: ${conflicts[0].judul}`
                          : '✓ Jadwal Aman (Tidak Bentrok)'}
                      </span>
                    </div>
                    <h4 className={styles.agendaName}>{item.judul}</h4>
                    <span className={styles.agendaMeta}>
                      {`Pemateri/PIC: ${item.pemateri || 'DKM Al-Jihad'} • Lokasi: ${
                        item.ruangan
                      }`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

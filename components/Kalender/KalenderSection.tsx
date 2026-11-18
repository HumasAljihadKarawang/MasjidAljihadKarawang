'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  masjidStore,
  findScheduleConflicts,
  ASET_MASJID_LIST,
  type AgendaKalenderItem,
  type PengajuanKalenderItem,
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

const COOLDOWN_STEPS_MINUTES = [1, 5, 20, 60]
const CAPTCHA_STORAGE_KEY = 'aljihad_kalender_captcha_guard_v1'

export default function KalenderSection() {
  const [agendas, setAgendas] = useState<AgendaKalenderItem[]>(masjidStore.getKalender())
  const [pengajuanList, setPengajuanList] = useState<PengajuanKalenderItem[]>(
    masjidStore.getPengajuanKalender()
  )
  const [viewYear, setViewYear] = useState<number>(2026)
  const [viewMonth, setViewMonth] = useState<number>(10) // November (0-indexed = 10)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // State Form Pengajuan Jadwal oleh Pengguna
  const [showPengajuanModal, setShowPengajuanModal] = useState(false)
  const [namaKegiatan, setNamaKegiatan] = useState('')
  const [deskripsiKegiatan, setDeskripsiKegiatan] = useState('')
  const [penanggungJawab, setPenanggungJawab] = useState('')
  const [noTeleponPj, setNoTeleponPj] = useState('')
  const [tglPengajuan, setTglPengajuan] = useState('2026-11-21')
  const [jamMulaiPengajuan, setJamMulaiPengajuan] = useState('09:00')
  const [jamSelesaiPengajuan, setJamSelesaiPengajuan] = useState('11:00')
  const [tempatKegiatan, setTempatKegiatan] = useState('')
  const [peminjamanAset, setPeminjamanAset] = useState('')
  const [posterUrl, setPosterUrl] = useState('')
  const [catatanPengajuan, setCatatanPengajuan] = useState('')
  const [formError, setFormError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  // State Pop-up Daftar Aset Masjid (bisa di-scroll + input ketik di bawah)
  const [showAsetModal, setShowAsetModal] = useState(false)

  // State Pop-up Verifikasi Captcha 4-Digit Angka Random
  const [showCaptchaModal, setShowCaptchaModal] = useState(false)
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaAttempts, setCaptchaAttempts] = useState(0)
  const [cooldownLevel, setCooldownLevel] = useState(0)
  const [lockUntilTs, setLockUntilTs] = useState<number>(0)
  const [remainingSec, setRemainingSec] = useState(0)
  const [captchaError, setCaptchaError] = useState('')

  const syncKalender = useCallback(async () => {
    setAgendas(masjidStore.getKalender())
    setPengajuanList(masjidStore.getPengajuanKalender())
    const cfg = getActiveSupabaseConfig()
    if (cfg.isConfigured) {
      const sb = getSupabaseClient()
      const { data, error } = await sb
        .from('jadwal_terdekat')
        .select('*')
        .eq('aktif', true)
        .order('tanggal', { ascending: true })
      if (!error && data) {
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
          peminjamanAset: d.peminjaman_aset || '',
          posterUrl: d.poster_url || '',
        }))
        setAgendas(mapped)
      }

      try {
        const pgjRes = await sb
          .from('pengajuan_kalender')
          .select('*')
          .order('created_at', { ascending: false })
        if (!pgjRes.error && pgjRes.data) {
          const mappedPgj: PengajuanKalenderItem[] = pgjRes.data.map((d) => ({
            id: d.id,
            namaKegiatan: d.nama_kegiatan,
            deskripsi: d.deskripsi || '',
            penanggungJawab: d.penanggung_jawab,
            noTeleponPj: d.no_telepon_pj,
            tanggal: d.tanggal,
            jamMulai: d.jam_mulai,
            jamSelesai: d.jam_selesai,
            tempatKegiatan: d.tempat_kegiatan,
            peminjamanAset: d.peminjaman_aset || '-',
            posterUrl: d.poster_url || '',
            catatan: d.catatan || '',
            status: (d.status || 'Menunggu') as PengajuanKalenderItem['status'],
            createdAt: d.created_at,
          }))
          setPengajuanList(mappedPgj)
        }
      } catch {
        // tabel pengajuan_kalender opsional jika belum dibuat di Supabase
      }
    }
  }, [])

  useEffect(() => {
    syncKalender()
    window.addEventListener('aljihad-store-updated', syncKalender)
    return () => window.removeEventListener('aljihad-store-updated', syncKalender)
  }, [syncKalender])

  // Load status lockout Captcha dari localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CAPTCHA_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.lockUntilTs) setLockUntilTs(Number(parsed.lockUntilTs))
        if (parsed.cooldownLevel) setCooldownLevel(Number(parsed.cooldownLevel))
        if (parsed.captchaAttempts) setCaptchaAttempts(Number(parsed.captchaAttempts))
      }
    } catch {
      // ignore storage error
    }
  }, [])

  // Hitung mundur timer saat Captcha terkunci
  useEffect(() => {
    if (!lockUntilTs) {
      setRemainingSec(0)
      return
    }
    const tick = () => {
      const diff = Math.max(0, Math.ceil((lockUntilTs - Date.now()) / 1000))
      setRemainingSec(diff)
      if (diff === 0 && lockUntilTs > 0) {
        setLockUntilTs(0)
        setCaptchaAttempts(0)
        try {
          window.localStorage.setItem(
            CAPTCHA_STORAGE_KEY,
            JSON.stringify({ lockUntilTs: 0, cooldownLevel, captchaAttempts: 0 })
          )
        } catch {
          // ignore
        }
      }
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [lockUntilTs, cooldownLevel])

  const generateRandomCaptcha = () => {
    const code = String(Math.floor(1000 + Math.random() * 9000))
    setCaptchaCode(code)
    setCaptchaInput('')
    setCaptchaError('')
  }

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

  // Cek bentrok jadwal pengajuan pengguna secara real-time (tanggal sama boleh, jam tidak boleh bertabrakan)
  const userConflicts = findScheduleConflicts(
    {
      judul: namaKegiatan || 'Pengajuan Kegiatan',
      pemateri: penanggungJawab || 'Pengguna',
      tanggal: tglPengajuan,
      jamMulai: jamMulaiPengajuan,
      jamSelesai: jamSelesaiPengajuan,
      ruangan: tempatKegiatan || 'Masjid Al-Jihad',
      kategori: 'Kajian',
      keterangan: deskripsiKegiatan,
    },
    agendas
  )

  const handleOpenCaptchaVerification = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!namaKegiatan.trim() || !penanggungJawab.trim() || !noTeleponPj.trim() || !tempatKegiatan.trim()) {
      setFormError('Mohon lengkapi Nama Kegiatan, Penanggung Jawab, No. Telepon PJ, dan Tempat Kegiatan.')
      return
    }
    if (!tglPengajuan || !jamMulaiPengajuan || !jamSelesaiPengajuan) {
      setFormError('Tanggal dan rentang jam kegiatan wajib diisi.')
      return
    }
    if (jamSelesaiPengajuan <= jamMulaiPengajuan) {
      setFormError('Jam selesai harus lebih akhir daripada jam mulai.')
      return
    }
    if (userConflicts.length > 0) {
      setFormError(
        `Tidak dapat mengajukan pada jam tersebut karena bertabrakan dengan "${userConflicts[0].judul}" (${userConflicts[0].jamMulai}–${userConflicts[0].jamSelesai} WIB). Silakan pilih jam atau tanggal lain.`
      )
      return
    }

    generateRandomCaptcha()
    setShowCaptchaModal(true)
  }

  const handleVerifyCaptchaAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (remainingSec > 0) return

    if (captchaInput.trim() !== captchaCode) {
      const nextAttempts = captchaAttempts + 1
      if (nextAttempts >= 6) {
        const minutes =
          COOLDOWN_STEPS_MINUTES[Math.min(cooldownLevel, COOLDOWN_STEPS_MINUTES.length - 1)]
        const until = Date.now() + minutes * 60 * 1000
        const nextLevel = cooldownLevel + 1
        setLockUntilTs(until)
        setCooldownLevel(nextLevel)
        setCaptchaAttempts(0)
        setCaptchaError(
          `Salah 6 kali berturut-turut. Silakan tunggu ${minutes} menit sebelum mencoba verifikasi kembali.`
        )
        try {
          window.localStorage.setItem(
            CAPTCHA_STORAGE_KEY,
            JSON.stringify({ lockUntilTs: until, cooldownLevel: nextLevel, captchaAttempts: 0 })
          )
        } catch {
          // ignore
        }
      } else {
        setCaptchaAttempts(nextAttempts)
        setCaptchaError(
          `Kode angka tidak cocok. Kesempatan tersisa: ${6 - nextAttempts} kali lagi.`
        )
        try {
          window.localStorage.setItem(
            CAPTCHA_STORAGE_KEY,
            JSON.stringify({ lockUntilTs: 0, cooldownLevel, captchaAttempts: nextAttempts })
          )
        } catch {
          // ignore
        }
      }
      return
    }

    // Captcha benar -> simpan pengajuan ke store & Supabase (jika tersedia)
    const newSubmission: PengajuanKalenderItem = {
      id: `pgj-${Date.now()}`,
      namaKegiatan: namaKegiatan.trim(),
      deskripsi: deskripsiKegiatan.trim(),
      penanggungJawab: penanggungJawab.trim(),
      noTeleponPj: noTeleponPj.trim(),
      tanggal: tglPengajuan,
      jamMulai: jamMulaiPengajuan,
      jamSelesai: jamSelesaiPengajuan,
      tempatKegiatan: tempatKegiatan.trim(),
      peminjamanAset: peminjamanAset.trim() || '-',
      posterUrl: posterUrl || '',
      catatan: catatanPengajuan.trim(),
      status: 'Menunggu',
      createdAt: new Date().toISOString(),
    }

    const existing = masjidStore.getPengajuanKalender()
    masjidStore.savePengajuanKalender([newSubmission, ...existing])

    const cfg = getActiveSupabaseConfig()
    if (cfg.isConfigured) {
      try {
        const sb = getSupabaseClient()
        await sb.from('pengajuan_kalender').insert({
          id: newSubmission.id,
          nama_kegiatan: newSubmission.namaKegiatan,
          deskripsi: newSubmission.deskripsi || '',
          penanggung_jawab: newSubmission.penanggungJawab,
          no_telepon_pj: newSubmission.noTeleponPj,
          tanggal: newSubmission.tanggal,
          jam_mulai: newSubmission.jamMulai,
          jam_selesai: newSubmission.jamSelesai,
          tempat_kegiatan: newSubmission.tempatKegiatan,
          peminjaman_aset: newSubmission.peminjamanAset,
          poster_url: newSubmission.posterUrl || '',
          catatan: newSubmission.catatan || '',
          status: 'Menunggu',
        })
      } catch {
        // fallback ke localStorage sudah tersimpan
      }
    }

    // Reset form & tutup modal
    setCaptchaAttempts(0)
    try {
      window.localStorage.removeItem(CAPTCHA_STORAGE_KEY)
    } catch {
      // ignore
    }
    setShowCaptchaModal(false)
    setShowPengajuanModal(false)
    setNamaKegiatan('')
    setDeskripsiKegiatan('')
    setPenanggungJawab('')
    setNoTeleponPj('')
    setTempatKegiatan('')
    setPeminjamanAset('')
    setPosterUrl('')
    setCatatanPengajuan('')
    setSubmitSuccess(
      'Pengajuan jadwal kegiatan Anda berhasil dikirim dan masuk ke Dashboard Admin DKM untuk ditinjau.'
    )
  }

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.82rem',
    fontWeight: 700,
    color: '#14532d',
    marginBottom: '5px',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(27, 107, 69, 0.25)',
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    background: '#ffffff',
    color: '#111827',
    boxSizing: 'border-box',
  }

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
          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => {
                setSubmitSuccess('')
                setFormError('')
                if (selectedDate) setTglPengajuan(selectedDate)
                setShowPengajuanModal(true)
              }}
            >
              + Ajukan Jadwal Kegiatan / Peminjaman Masjid
            </button>
          </div>
          {submitSuccess && (
            <div
              style={{
                marginTop: '14px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#dcfce7',
                border: '1px solid #86efac',
                color: '#14532d',
                fontWeight: 700,
                fontSize: '0.88rem',
                maxWidth: '680px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              ✓ {submitSuccess}
            </div>
          )}
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

              {Array.from(
                { length: Math.max(0, 42 - (firstDayOfWeek + daysInMonth)) },
                (_, i) => (
                  <div key={`trail-${i}`} style={{ aspectRatio: '1' }} />
                )
              )}
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
              {displayedAgendas.length === 0 ? (
                <div
                  style={{
                    padding: '28px 18px',
                    textAlign: 'center',
                    background: '#f8faf8',
                    borderRadius: '12px',
                    border: '1px dashed rgba(27, 107, 69, 0.25)',
                    color: '#4a6355',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  {selectedDate
                    ? `Belum ada jadwal kegiatan pada tanggal ${selectedDate}.`
                    : 'Belum ada jadwal kegiatan yang terdaftar.'}
                </div>
              ) : (
                displayedAgendas.map((item) => {
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
                      {`Pemateri/PJ: ${item.pemateri || 'DKM Al-Jihad'} • Lokasi: ${
                        item.ruangan
                      }`}
                    </span>
                    {item.peminjamanAset && item.peminjamanAset !== '-' && (
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: '#166534',
                          fontWeight: 600,
                          marginTop: '4px',
                        }}
                      >
                        {`Peminjaman Aset: ${item.peminjamanAset}`}
                      </div>
                    )}
                    {item.posterUrl && (
                      <div style={{ marginTop: '8px' }}>
                        <img
                          src={item.posterUrl}
                          alt={`Poster ${item.judul}`}
                          style={{
                            maxWidth: '180px',
                            maxHeight: '220px',
                            borderRadius: '10px',
                            border: '1px solid rgba(27, 107, 69, 0.2)',
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })
              )}
            </div>
          </div>
        </div>

        {/* LIST PENGAJUAN JADWAL KEGIATAN YANG BISA DILIHAT OLEH UMUM */}
        <div
          style={{
            marginTop: '34px',
            background: '#ffffff',
            borderRadius: '18px',
            padding: '24px',
            border: '1px solid rgba(27, 107, 69, 0.14)',
            boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '14px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: '#0f4a2a' }}>
              Daftar Pengajuan Jadwal Kegiatan ({pengajuanList.length})
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 600 }}>
              Transparansi antrean pengajuan kegiatan masyarakat &amp; instansi
            </span>
          </div>

          {pengajuanList.length === 0 ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                background: '#f8faf8',
                borderRadius: '12px',
                border: '1px dashed rgba(27, 107, 69, 0.25)',
                color: '#4a6355',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            >
              Belum ada pengajuan jadwal kegiatan yang masuk.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                gap: '14px',
              }}
            >
              {pengajuanList.map((pgj) => (
                <div
                  key={pgj.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1px solid rgba(27, 107, 69, 0.16)',
                    background: '#f9fbf9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: '#14532d',
                      }}
                    >
                      {`${pgj.tanggal} • ${pgj.jamMulai}–${pgj.jamSelesai} WIB`}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '999px',
                        background:
                          pgj.status === 'Disetujui'
                            ? '#dcfce7'
                            : pgj.status === 'Ditolak'
                              ? '#fee2e2'
                              : '#fef3c7',
                        color:
                          pgj.status === 'Disetujui'
                            ? '#166534'
                            : pgj.status === 'Ditolak'
                              ? '#991b1b'
                              : '#92400e',
                      }}
                    >
                      {pgj.status === 'Menunggu' ? 'Menunggu Tinjauan' : pgj.status}
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#111827' }}>
                    {pgj.namaKegiatan}
                  </h4>
                  <div style={{ fontSize: '0.8rem', color: '#374151', lineHeight: 1.5 }}>
                    <div>
                      <strong>PJ:</strong> {pgj.penanggungJawab}
                    </div>
                    <div>
                      <strong>Tempat:</strong> {pgj.tempatKegiatan}
                    </div>
                    {pgj.peminjamanAset && pgj.peminjamanAset !== '-' && (
                      <div>
                        <strong>Aset:</strong> {pgj.peminjamanAset}
                      </div>
                    )}
                  </div>
                  {pgj.posterUrl && (
                    <img
                      src={pgj.posterUrl}
                      alt={`Poster ${pgj.namaKegiatan}`}
                      style={{
                        marginTop: '4px',
                        maxWidth: '140px',
                        maxHeight: '170px',
                        borderRadius: '8px',
                        border: '1px solid rgba(27, 107, 69, 0.18)',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* POP-UP FORM PENGAJUAN JADWAL OLEH PENGGUNA */}
      {showPengajuanModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9990,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f4a2a', fontWeight: 800 }}>
                  Ajukan Jadwal Kegiatan Masjid
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#4b5563' }}>
                  Pengajuan akan ditinjau oleh Admin DKM Masjid Al-Jihad Karawang
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPengajuanModal(false)}
                style={{
                  border: 'none',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  width: '34px',
                  height: '34px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: '12px',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleOpenCaptchaVerification} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Nama Kegiatan *</label>
                <input
                  type="text"
                  required
                  value={namaKegiatan}
                  onChange={(e) => setNamaKegiatan(e.target.value)}
                  placeholder="Contoh: Santunan Anak Yatim & Kajian Bersama"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Deskripsi Kegiatan (Opsional)</label>
                <textarea
                  rows={2}
                  value={deskripsiKegiatan}
                  onChange={(e) => setDeskripsiKegiatan(e.target.value)}
                  placeholder="Catatan ringkas agar DKM mengetahui gambaran isi kegiatan..."
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Penanggung Jawab &amp; Instansi *</label>
                  <input
                    type="text"
                    required
                    value={penanggungJawab}
                    onChange={(e) => setPenanggungJawab(e.target.value)}
                    placeholder="Contoh: Husna (Karawang Peduli)"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>No. Telepon / WhatsApp PJ *</label>
                  <input
                    type="tel"
                    required
                    value={noTeleponPj}
                    onChange={(e) => setNoTeleponPj(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Tanggal Kegiatan *</label>
                  <input
                    type="date"
                    required
                    value={tglPengajuan}
                    onChange={(e) => setTglPengajuan(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Jam Mulai (WIB) *</label>
                  <input
                    type="time"
                    required
                    value={jamMulaiPengajuan}
                    onChange={(e) => setJamMulaiPengajuan(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Jam Selesai (WIB) *</label>
                  <input
                    type="time"
                    required
                    value={jamSelesaiPengajuan}
                    onChange={(e) => setJamSelesaiPengajuan(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: userConflicts.length > 0 ? '#fef2f2' : '#f0fdf4',
                  border:
                    userConflicts.length > 0
                      ? '1px solid #fecaca'
                      : '1px solid rgba(22, 163, 74, 0.3)',
                  color: userConflicts.length > 0 ? '#991b1b' : '#166534',
                }}
              >
                {userConflicts.length > 0
                  ? `⚠️ Jam ini bertabrakan dengan "${userConflicts[0].judul}" (${userConflicts[0].jamMulai}–${userConflicts[0].jamSelesai} WIB). Anda tetap dapat memilih tanggal yang sama di jam yang berbeda.`
                  : `✓ Jam ${jamMulaiPengajuan}–${jamSelesaiPengajuan} WIB pada tanggal ${tglPengajuan} tersedia.`}
              </div>

              <div>
                <label style={labelStyle}>Tempat Kegiatan *</label>
                <input
                  type="text"
                  required
                  value={tempatKegiatan}
                  onChange={(e) => setTempatKegiatan(e.target.value)}
                  placeholder="Contoh: Pelataran Masjid / Ruang Sholat Utama Lantai 1"
                  style={inputStyle}
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '5px',
                  }}
                >
                  <label style={{ ...labelStyle, marginBottom: 0 }}>
                    Peminjaman Aset Masjid (Isi Manual)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAsetModal(true)}
                    style={{
                      border: '1px solid rgba(27, 107, 69, 0.3)',
                      background: '#f0fdf4',
                      color: '#14532d',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Lihat Daftar Aset Masjid
                  </button>
                </div>
                <input
                  type="text"
                  value={peminjamanAset}
                  onChange={(e) => setPeminjamanAset(e.target.value)}
                  placeholder="Contoh: Meja Panjang (2), Kursi (2), Sound System Portable (1)"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Poster untuk Bantu Share DKM (Opsional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => setPosterUrl(String(reader.result || ''))
                    reader.readAsDataURL(file)
                  }}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Pesan atau Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  value={catatanPengajuan}
                  onChange={(e) => setCatatanPengajuan(e.target.value)}
                  placeholder="Misal: Permintaan khusus, koordinasi pertemuan, atau poster menyusul..."
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                className="btn btn-gold"
                style={{ width: '100%', padding: '12px', fontWeight: 800, marginTop: '4px' }}
              >
                Ajukan Jadwal Kegiatan
              </button>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP DAFTAR ASET MASJID (BISA DI-SCROLL + INPUT MANUAL DI BAWAH) */}
      {showAsetModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              padding: '20px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <h4 style={{ margin: 0, color: '#0f4a2a', fontWeight: 800 }}>
                Daftar Aset Masjid Al-Jihad
              </h4>
              <button
                type="button"
                onClick={() => setShowAsetModal(false)}
                style={{
                  border: 'none',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  width: '30px',
                  height: '30px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: '#4b5563' }}>
              Gulir daftar di bawah untuk melihat aset yang tersedia (klik item untuk
              menambahkan), lalu ketik/sesuaikan jumlahnya pada kolom di bawah.
            </p>
            <div
              style={{
                maxHeight: '230px',
                overflowY: 'auto',
                border: '1px solid rgba(27, 107, 69, 0.2)',
                borderRadius: '10px',
                padding: '8px',
                display: 'grid',
                gap: '6px',
                background: '#f8faf8',
                marginBottom: '12px',
              }}
            >
              {ASET_MASJID_LIST.map((aset) => (
                <button
                  key={aset.nama}
                  type="button"
                  onClick={() =>
                    setPeminjamanAset((prev) =>
                      prev.trim() ? `${prev.trim()}, ${aset.nama} (1)` : `${aset.nama} (1)`
                    )
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(27, 107, 69, 0.14)',
                    background: '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.84rem', color: '#111827' }}>
                    {aset.nama}
                  </span>
                  <span style={{ fontSize: '0.76rem', color: '#15803d', fontWeight: 700 }}>
                    {`${aset.kategori} • ${aset.stok}`}
                  </span>
                </button>
              ))}
            </div>
            <div>
              <label style={labelStyle}>Ketik Aset &amp; Jumlah yang Dipinjam</label>
              <input
                type="text"
                value={peminjamanAset}
                onChange={(e) => setPeminjamanAset(e.target.value)}
                placeholder="Contoh: Meja Panjang (2), Kursi Lipat (20)"
                style={inputStyle}
              />
            </div>
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => setShowAsetModal(false)}
              style={{ width: '100%', marginTop: '12px', padding: '10px', fontWeight: 800 }}
            >
              Simpan Pilihan Aset
            </button>
          </div>
        </div>
      )}

      {/* POP-UP VERIFIKASI CAPTCHA 4-DIGIT ANGKA RANDOM */}
      {showCaptchaModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            zIndex: 10010,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '400px',
              padding: '22px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.32)',
              textAlign: 'center',
            }}
          >
            <h4 style={{ margin: '0 0 6px', color: '#0f4a2a', fontWeight: 800 }}>
              Verifikasi Keamanan
            </h4>
            <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#4b5563' }}>
              Ketik ulang 4 digit angka di bawah untuk mengirimkan pengajuan jadwal Anda.
            </p>

            <div
              style={{
                display: 'inline-block',
                padding: '12px 26px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                border: '2px dashed #15803d',
                fontSize: '1.85rem',
                fontWeight: 900,
                letterSpacing: '0.35em',
                color: '#064e3b',
                userSelect: 'none',
                marginBottom: '12px',
              }}
            >
              {captchaCode}
            </div>

            {captchaError && (
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  marginBottom: '10px',
                }}
              >
                {captchaError}
              </div>
            )}

            {remainingSec > 0 && (
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  marginBottom: '10px',
                }}
              >
                {`Terlalu banyak percobaan gagal. Tunggu ${formatCountdown(remainingSec)}`}
              </div>
            )}

            <form onSubmit={handleVerifyCaptchaAndSubmit}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                disabled={remainingSec > 0}
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Masukkan 4 digit angka"
                style={{
                  ...inputStyle,
                  textAlign: 'center',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  letterSpacing: '0.2em',
                  marginBottom: '12px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCaptchaModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #d1d5db',
                    background: '#f9fafb',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={remainingSec > 0}
                  className="btn btn-gold"
                  style={{ flex: 1, padding: '10px', fontWeight: 800 }}
                >
                  Verifikasi &amp; Kirim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

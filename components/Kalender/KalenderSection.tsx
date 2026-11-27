'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import logoMasjidWarna from '@/logo/Logo Masjid Al-Jihad.png'
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
  const [viewYear, setViewYear] = useState<number>(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState<number>(() => new Date().getMonth())
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
  const [uploadingPoster, setUploadingPoster] = useState(false)
  const [posterUploadPct, setPosterUploadPct] = useState(0)
  const [catatanPengajuan, setCatatanPengajuan] = useState('')
  const [formError, setFormError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // State Pop-up Daftar Aset Masjid (Tabel Pilih + Jumlah Maksimal Stok + Ketik Manual)
  const [showAsetModal, setShowAsetModal] = useState(false)
  const [previewPengajuan, setPreviewPengajuan] = useState<PengajuanKalenderItem | null>(null)
  const [previewAgendaPublik, setPreviewAgendaPublik] = useState<AgendaKalenderItem | null>(null)
  const [selectedAsetQty, setSelectedAsetQty] = useState<Record<string, number>>({})

  const formatTanggalIndoPublik = (isoDate?: string) => {
    if (!isoDate) return '-'
    const d = new Date(`${isoDate}T12:00:00`)
    if (Number.isNaN(d.getTime())) return isoDate
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const isKhotibAgenda = (item: AgendaKalenderItem) =>
    item.kategori === 'Khutbah Jumat' ||
    (item.keterangan || '').startsWith('[KHOTIB_DATA]') ||
    item.id.startsWith('khotib-kal-')

  const parseKhotibMetaPublik = (keterangan?: string) => {
    const raw = String(keterangan || '')
    if (!raw.startsWith('[KHOTIB_DATA]')) return null
    try {
      return JSON.parse(raw.slice('[KHOTIB_DATA]'.length)) as {
        kategori?: string
        khotib?: string
        imam?: string
        bilal?: string
        tema?: string
        waktu?: string
        noSurat?: string
      }
    } catch {
      return null
    }
  }
  const [manualAsetExtra, setManualAsetExtra] = useState('')
  const [unsavedModalUser, setUnsavedModalUser] = useState<{
    contextLabel?: string
    onDiscard: () => void
  } | null>(null)

  const syncUserAsetSelection = (nextQty: Record<string, number>, nextExtra: string) => {
    const picked = ASET_MASJID_LIST.filter((a) => (nextQty[a.nama] || 0) > 0).map(
      (a) => `${a.nama} (${nextQty[a.nama]} ${a.satuan})`
    )
    const parts = [...picked, ...(nextExtra.trim() ? [nextExtra.trim()] : [])]
    setPeminjamanAset(parts.join(', '))
  }

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

  // Gabungkan jadwal terdaftar dengan pengajuan yang sudah Disetujui agar kalender selalu aktif otomatis
  const approvedFromSubmissions: AgendaKalenderItem[] = pengajuanList
    .filter((p) => p.status === 'Disetujui')
    .map((p) => ({
      id: `approved-${p.id}`,
      judul: p.namaKegiatan,
      pemateri: p.penanggungJawab,
      tanggal: p.tanggal,
      jamMulai: p.jamMulai,
      jamSelesai: p.jamSelesai,
      ruangan: p.tempatKegiatan,
      kategori: 'Sosial' as AgendaKalenderItem['kategori'],
      keterangan: '',
      peminjamanAset: p.peminjamanAset,
      posterUrl: p.posterUrl,
    }))

  const effectiveAgendas: AgendaKalenderItem[] = [...agendas]
  for (const ap of approvedFromSubmissions) {
    const alreadyExists = effectiveAgendas.some(
      (a) =>
        a.judul.trim().toLowerCase() === ap.judul.trim().toLowerCase() &&
        a.tanggal === ap.tanggal &&
        a.jamMulai === ap.jamMulai
    )
    if (!alreadyExists) {
      effectiveAgendas.push(ap)
    }
  }

  const nowLocalUser = new Date()
  const todayIsoUser = `${nowLocalUser.getFullYear()}-${String(
    nowLocalUser.getMonth() + 1
  ).padStart(2, '0')}-${String(nowLocalUser.getDate()).padStart(2, '0')}`

  // Hanya tampilkan kegiatan yang belum lewat tanggalnya & urutkan yang paling dekat waktunya di paling atas
  const upcomingAgendas: AgendaKalenderItem[] = effectiveAgendas
    .filter((a) => a.tanggal >= todayIsoUser)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.jamMulai.localeCompare(b.jamMulai))

  const displayedAgendas = selectedDate
    ? upcomingAgendas.filter((a) => a.tanggal === selectedDate)
    : upcomingAgendas

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
    effectiveAgendas
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
    setSelectedAsetQty({})
    setManualAsetExtra('')
    setSubmitSuccess(
      'Pengajuan berhasil terkirim! Tinggal menunggu tinjauan dari Admin DKM Masjid Al-Jihad.'
    )
    setShowSuccessModal(true)
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
                const dayEvents = effectiveAgendas.filter((a) => a.tanggal === dateStr)
                const hasKhotib = dayEvents.some((ev) => isKhotibAgenda(ev))
                const nonKhotibCount = dayEvents.filter((ev) => !isKhotibAgenda(ev)).length
                const hasConflict = dayEvents.some(
                  (ev) => findScheduleConflicts(ev, effectiveAgendas, ev.id).length > 0
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
                    {(hasKhotib || nonKhotibCount > 0) && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        {hasKhotib && (
                          <span
                            title="Jadwal Khotib Tersedia"
                            style={{
                              width: '17px',
                              height: '17px',
                              borderRadius: '999px',
                              background: '#f59e0b',
                              color: '#ffffff',
                              fontSize: '0.65rem',
                              fontWeight: 900,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 5px rgba(245, 158, 11, 0.35)',
                            }}
                          >
                            ✓
                          </span>
                        )}
                        {nonKhotibCount > 0 && (
                          <span
                            className={`${styles.eventCountBadge} ${
                              hasConflict ? styles.conflictCountBadge : ''
                            }`}
                          >
                            {nonKhotibCount}
                          </span>
                        )}
                      </div>
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
                <span
                  style={{
                    width: '11px',
                    height: '11px',
                    borderRadius: '999px',
                    background: '#f59e0b',
                    display: 'inline-block',
                  }}
                />
                Jadwal Khotib (✓)
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
                  ? `Daftar Acara Tanggal ${formatTanggalIndoPublik(selectedDate)}`
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
                    ? `Belum ada jadwal kegiatan pada tanggal ${formatTanggalIndoPublik(selectedDate)}.`
                    : 'Belum ada jadwal kegiatan yang terdaftar.'}
                </div>
              ) : (
                displayedAgendas.map((item) => {
                const conflicts = findScheduleConflicts(item, effectiveAgendas, item.id)
                const isConflict = conflicts.length > 0
                const isKhotib = isKhotibAgenda(item)

                return (
                  <div
                    key={item.id}
                    onClick={() => setPreviewAgendaPublik(item)}
                    className={`${styles.agendaItem} ${
                      isConflict ? styles.agendaItemConflict : ''
                    }`}
                    style={{
                      cursor: 'pointer',
                      ...(isKhotib
                        ? {
                            background: '#fffbeb',
                            borderColor: 'rgba(245, 158, 11, 0.38)',
                            borderLeft: '4px solid #f59e0b',
                          }
                        : {}),
                    }}
                  >
                    <div className={styles.agendaTop}>
                      <span
                        className={styles.timeBadge}
                        style={
                          isKhotib
                            ? { background: '#fef3c7', color: '#b45309' }
                            : undefined
                        }
                      >
                        {isKhotib
                          ? `${formatTanggalIndoPublik(item.tanggal)} • ${item.jamMulai} WIB`
                          : `${formatTanggalIndoPublik(item.tanggal)} • ${item.jamMulai} – ${item.jamSelesai} WIB`}
                      </span>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span className={isConflict ? styles.conflictBadge : styles.safeBadge}>
                          {isConflict
                            ? `⚠️ Bentrok Jam dengan: ${conflicts[0].judul}`
                            : '✓ Jadwal Aman'}
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: isKhotib ? '#b45309' : '#0f4a2a',
                            background: '#ffffff',
                            border: '1px solid rgba(15, 23, 42, 0.14)',
                            borderRadius: '6px',
                            padding: '2px 8px',
                          }}
                        >
                          Preview ›
                        </span>
                      </div>
                    </div>
                    <h4 className={styles.agendaName}>{item.judul}</h4>
                    {!isKhotib && (
                      <span className={styles.agendaMeta}>
                        {`Pemateri/PJ: ${item.pemateri || 'DKM Al-Jihad'} • Lokasi: ${
                          item.ruangan
                        }`}
                      </span>
                    )}
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

        {/* POP-UP PREVIEW AGENDA / KHOTIB PUBLIK */}
        {previewAgendaPublik &&
          (() => {
            const isKhotib = isKhotibAgenda(previewAgendaPublik)
            const khotibMeta = parseKhotibMetaPublik(previewAgendaPublik.keterangan)
            return (
              <div
                onDoubleClick={(e) => {
                  if (e.target === e.currentTarget) setPreviewAgendaPublik(null)
                }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.68)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: '470px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: '#ffffff',
                    borderRadius: '18px',
                    padding: '22px',
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: isKhotib ? '#b45309' : '#0f4a2a' }}>
                      {previewAgendaPublik.judul}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setPreviewAgendaPublik(null)}
                      style={{
                        border: 'none',
                        background: '#f1f5f9',
                        color: '#475569',
                        borderRadius: '999px',
                        width: '28px',
                        height: '28px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {isKhotib ? (
                    <div
                      style={{
                        display: 'grid',
                        gap: '8px',
                        fontSize: '0.85rem',
                        color: '#1f2937',
                        background: '#fffbeb',
                        padding: '14px',
                        borderRadius: '12px',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                      }}
                    >
                      <div>
                        <strong>Kategori :</strong> {khotibMeta?.kategori || previewAgendaPublik.kategori}
                      </div>
                      <div>
                        <strong>Khotib / Penceramah :</strong>{' '}
                        {khotibMeta?.khotib || previewAgendaPublik.pemateri || '-'}
                      </div>
                      {khotibMeta?.imam && (
                        <div>
                          <strong>Imam :</strong> {khotibMeta.imam}
                        </div>
                      )}
                      <div>
                        <strong>Bilal :</strong> {khotibMeta?.bilal || '-'}
                      </div>
                      <div>
                        <strong>Hari / Tanggal :</strong> {formatTanggalIndoPublik(previewAgendaPublik.tanggal)}
                      </div>
                      <div>
                        <strong>Waktu Masuk :</strong> {`${khotibMeta?.waktu || previewAgendaPublik.jamMulai} WIB`}
                      </div>
                      <div>
                        <strong>Tema :</strong>{' '}
                        {khotibMeta?.tema ||
                          "Mari tegakkan Sholat Jum'at berjamaah, perbanyak shalawat, dan perkuat ukhuwah Islamiyah."}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gap: '8px',
                        fontSize: '0.85rem',
                        color: '#1f2937',
                        background: '#f8faf8',
                        padding: '14px',
                        borderRadius: '12px',
                        border: '1px solid rgba(27, 107, 69, 0.14)',
                      }}
                    >
                      <div>
                        <strong>Hari / Tanggal :</strong> {formatTanggalIndoPublik(previewAgendaPublik.tanggal)}
                      </div>
                      <div>
                        <strong>Waktu :</strong>{' '}
                        {`${previewAgendaPublik.jamMulai} – ${previewAgendaPublik.jamSelesai} WIB`}
                      </div>
                      <div>
                        <strong>Kategori :</strong> {previewAgendaPublik.kategori}
                      </div>
                      <div>
                        <strong>Penanggung Jawab / Pemateri :</strong>{' '}
                        {previewAgendaPublik.pemateri || 'DKM Masjid Al-Jihad'}
                      </div>
                      <div>
                        <strong>Lokasi :</strong> {previewAgendaPublik.ruangan}
                      </div>
                      {previewAgendaPublik.keterangan && (
                        <div>
                          <strong>Keterangan :</strong> {previewAgendaPublik.keterangan}
                        </div>
                      )}
                    </div>
                  )}

                  {previewAgendaPublik.posterUrl && (
                    <div style={{ marginTop: '12px', textAlign: 'center' }}>
                      <img
                        src={previewAgendaPublik.posterUrl}
                        alt={`Poster ${previewAgendaPublik.judul}`}
                        style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '10px', objectFit: 'contain' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pengajuanList.map((pgj) => (
                <button
                  key={pgj.id}
                  type="button"
                  onClick={() => setPreviewPengajuan(pgj)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(27, 107, 69, 0.16)',
                    background: '#f9fbf9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: '#14532d',
                        background: '#ecfdf5',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {`${pgj.tanggal} • ${pgj.jamMulai}–${pgj.jamSelesai} WIB`}
                    </span>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#111827' }}>
                      {pgj.namaKegiatan}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '4px 10px',
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
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#1b6b45',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Preview ›
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* POP-UP PREVIEW DETAIL PENGAJUAN UNTUK PENGGUNA UMUM */}
      {previewPengajuan && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.68)',
            backdropFilter: 'blur(4px)',
            zIndex: 9995,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onDoubleClick={() => setPreviewPengajuan(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '88vh',
              overflowY: 'auto',
              padding: '22px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '999px',
                  background:
                    previewPengajuan.status === 'Disetujui'
                      ? '#dcfce7'
                      : previewPengajuan.status === 'Ditolak'
                        ? '#fee2e2'
                        : '#fef3c7',
                  color:
                    previewPengajuan.status === 'Disetujui'
                      ? '#166534'
                      : previewPengajuan.status === 'Ditolak'
                        ? '#991b1b'
                        : '#92400e',
                }}
              >
                {previewPengajuan.status === 'Menunggu'
                  ? 'Menunggu Tinjauan Admin'
                  : previewPengajuan.status}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPengajuan(null)}
                style={{
                  border: 'none',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <h3 style={{ margin: '0 0 12px', fontSize: '1.15rem', fontWeight: 800, color: '#0f4a2a' }}>
              {previewPengajuan.namaKegiatan}
            </h3>

            {previewPengajuan.status === 'Disetujui' && (
              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: '#ecfdf5',
                  border: '1px solid rgba(22, 163, 74, 0.28)',
                  color: '#14532d',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  marginBottom: '12px',
                }}
              >
                {`Disetujui oleh Pihak DKM pada: ${
                  previewPengajuan.disetujuiPada ||
                  (previewPengajuan.createdAt
                    ? previewPengajuan.createdAt.slice(0, 10)
                    : previewPengajuan.tanggal)
                }`}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gap: '8px',
                fontSize: '0.86rem',
                color: '#1f2937',
                background: '#f8faf8',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid rgba(27, 107, 69, 0.14)',
              }}
            >
              <div>
                <strong>Hari / Tanggal :</strong> {previewPengajuan.tanggal}
              </div>
              <div>
                <strong>Waktu :</strong>{' '}
                {`${previewPengajuan.jamMulai} – ${previewPengajuan.jamSelesai} WIB`}
              </div>
              <div>
                <strong>Penanggung Jawab :</strong> {previewPengajuan.penanggungJawab}
              </div>
              <div>
                <strong>Tempat Kegiatan :</strong> {previewPengajuan.tempatKegiatan}
              </div>
              {previewPengajuan.peminjamanAset && previewPengajuan.peminjamanAset !== '-' && (
                <div>
                  <strong>Peminjaman Aset :</strong> {previewPengajuan.peminjamanAset}
                </div>
              )}
            </div>

            {previewPengajuan.posterUrl && (
              <div style={{ marginTop: '14px', textAlign: 'center' }}>
                <img
                  src={previewPengajuan.posterUrl}
                  alt={`Poster ${previewPengajuan.namaKegiatan}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '320px',
                    borderRadius: '12px',
                    border: '1px solid rgba(27, 107, 69, 0.18)',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

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
          onDoubleClick={() => {
            const hasInput = Boolean(
              namaKegiatan.trim() ||
                deskripsiKegiatan.trim() ||
                penanggungJawab.trim() ||
                noTeleponPj.trim() ||
                tempatKegiatan.trim() ||
                peminjamanAset.trim() ||
                posterUrl.trim() ||
                catatanPengajuan.trim() ||
                manualAsetExtra.trim() ||
                Object.values(selectedAsetQty).some((q) => q > 0)
            )
            if (!hasInput) {
              setShowPengajuanModal(false)
              setFormError('')
              return
            }
            setUnsavedModalUser({
              contextLabel: 'Formulir Pengajuan Kegiatan Masjid Al-Jihad',
              onDiscard: () => {
                setShowPengajuanModal(false)
                setNamaKegiatan('')
                setDeskripsiKegiatan('')
                setPenanggungJawab('')
                setNoTeleponPj('')
                setTempatKegiatan('')
                setPeminjamanAset('')
                setPosterUrl('')
                setCatatanPengajuan('')
                setSelectedAsetQty({})
                setManualAsetExtra('')
                setFormError('')
              },
            })
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
            onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}
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
                  Formulir Pengajuan Kegiatan Masjid Al-Jihad
                </h3>
              </div>
              <button
                type="button"
                aria-label="Tutup Pop-up"
                onClick={() => {
                  const hasInput = Boolean(
                    namaKegiatan.trim() ||
                      deskripsiKegiatan.trim() ||
                      penanggungJawab.trim() ||
                      noTeleponPj.trim() ||
                      tempatKegiatan.trim() ||
                      peminjamanAset.trim() ||
                      posterUrl.trim() ||
                      catatanPengajuan.trim() ||
                      manualAsetExtra.trim() ||
                      Object.values(selectedAsetQty).some((q) => q > 0)
                  )
                  if (!hasInput) {
                    setShowPengajuanModal(false)
                    setFormError('')
                    return
                  }
                  setUnsavedModalUser({
                    contextLabel: 'Formulir Pengajuan Kegiatan Masjid Al-Jihad',
                    onDiscard: () => {
                      setShowPengajuanModal(false)
                      setNamaKegiatan('')
                      setDeskripsiKegiatan('')
                      setPenanggungJawab('')
                      setNoTeleponPj('')
                      setTempatKegiatan('')
                      setPeminjamanAset('')
                      setPosterUrl('')
                      setCatatanPengajuan('')
                      setSelectedAsetQty({})
                      setManualAsetExtra('')
                      setFormError('')
                    },
                  })
                }}
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
                  style={inputStyle}
                />
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#4b5563' }}>
                  Contoh: Santunan Anak Yatim &amp; Kajian Bersama
                </p>
              </div>

              <div>
                <label style={labelStyle}>Deskripsi Kegiatan (Opsional)</label>
                <textarea
                  rows={2}
                  value={deskripsiKegiatan}
                  onChange={(e) => setDeskripsiKegiatan(e.target.value)}
                  style={inputStyle}
                />
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#4b5563' }}>
                  Catatan ringkas agar DKM mengetahui gambaran isi kegiatan.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Penanggung Jawab &amp; Instansi *</label>
                  <input
                    type="text"
                    required
                    value={penanggungJawab}
                    onChange={(e) => setPenanggungJawab(e.target.value)}
                    style={inputStyle}
                  />
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#4b5563' }}>
                    Contoh: Husna (Karawang Peduli)
                  </p>
                </div>
                <div>
                  <label style={labelStyle}>No. Telepon / WhatsApp PJ *</label>
                  <input
                    type="tel"
                    required
                    value={noTeleponPj}
                    onChange={(e) => setNoTeleponPj(e.target.value)}
                    style={inputStyle}
                  />
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#4b5563' }}>
                    Contoh: 081234567890
                  </p>
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
                  style={inputStyle}
                />
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#4b5563' }}>
                  Contoh: Pelataran Masjid / Ruang Sholat Utama Lantai 1
                </p>
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
                    Peminjaman Aset Masjid (Opsional)
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
                  style={inputStyle}
                />
                <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: '#4b5563', lineHeight: 1.45 }}>
                  Contoh: Meja Panjang (2), Kursi (2), Sound System Portable (1).
                </p>
              </div>

              <div>
                <label style={labelStyle}>Poster untuk Bantu Share DKM (Opsional)</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingPoster}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setUploadingPoster(true)
                    setPosterUploadPct(5)
                    try {
                      const fd = new FormData()
                      fd.append('file', file)
                      fd.append('folder', 'masjid-aljihad/kalender-poster')
                      fd.append('resourceType', 'image')

                      const uploadedUrl = await new Promise<string | null>((resolve) => {
                        const xhr = new XMLHttpRequest()
                        xhr.open('POST', '/api/upload')
                        xhr.upload.onprogress = (ev) => {
                          if (ev.lengthComputable && ev.total > 0) {
                            const pct = Math.min(95, Math.max(10, Math.round((ev.loaded / ev.total) * 95)))
                            setPosterUploadPct(pct)
                          }
                        }
                        xhr.onload = () => {
                          try {
                            const json = JSON.parse(xhr.responseText || '{}')
                            if (xhr.status >= 200 && xhr.status < 300 && json.url) {
                              resolve(String(json.url))
                              return
                            }
                          } catch {
                            // ignore parse error
                          }
                          resolve(null)
                        }
                        xhr.onerror = () => resolve(null)
                        xhr.send(fd)
                      })

                      if (uploadedUrl) {
                        setPosterUploadPct(100)
                        setPosterUrl(uploadedUrl)
                        setUploadingPoster(false)
                        return
                      }
                    } catch {
                      // fallback below
                    }

                    const reader = new FileReader()
                    reader.onload = () => {
                      setPosterUrl(String(reader.result || ''))
                      setPosterUploadPct(100)
                      setUploadingPoster(false)
                    }
                    reader.readAsDataURL(file)
                  }}
                  style={inputStyle}
                />
                {uploadingPoster && (
                  <div style={{ marginTop: '6px' }}>
                    <div
                      style={{
                        height: '6px',
                        width: '100%',
                        borderRadius: '999px',
                        background: '#e5e7eb',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${posterUploadPct}%`,
                          background: 'linear-gradient(90deg, #16a34a, #15803d)',
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: '0.76rem',
                        color: '#b45309',
                        fontWeight: 700,
                      }}
                    >
                      {`Mengunggah poster... ${posterUploadPct}%`}
                    </p>
                  </div>
                )}
                {!uploadingPoster && posterUrl && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: '#15803d', fontWeight: 700 }}>
                    ✓ Terupload (100%)
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Pesan atau Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  value={catatanPengajuan}
                  onChange={(e) => setCatatanPengajuan(e.target.value)}
                  style={inputStyle}
                />
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#4b5563' }}>
                  Contoh: Permintaan khusus, koordinasi pertemuan, atau poster menyusul.
                </p>
              </div>

              <button
                type="submit"
                className="btn btn-gold"
                style={{ width: '100%', padding: '12px', fontWeight: 800, marginTop: '4px' }}
              >
                Ajukan Kegiatan
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
          onDoubleClick={() => {
            const hasInput = Boolean(
              Object.values(selectedAsetQty).some((q) => q > 0) || manualAsetExtra.trim()
            )
            if (!hasInput) {
              setShowAsetModal(false)
              return
            }
            setUnsavedModalUser({
              contextLabel: 'Pilihan Peminjaman Aset Masjid',
              onDiscard: () => {
                setSelectedAsetQty({})
                setManualAsetExtra('')
                setPeminjamanAset('')
                setShowAsetModal(false)
              },
            })
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
            onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}
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
                onClick={() => {
                  const hasInput = Boolean(
                    Object.values(selectedAsetQty).some((q) => q > 0) || manualAsetExtra.trim()
                  )
                  if (!hasInput) {
                    setShowAsetModal(false)
                    return
                  }
                  setUnsavedModalUser({
                    contextLabel: 'Pilihan Peminjaman Aset Masjid',
                    onDiscard: () => {
                      setSelectedAsetQty({})
                      setManualAsetExtra('')
                      setPeminjamanAset('')
                      setShowAsetModal(false)
                    },
                  })
                }}
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
            <div
              style={{
                maxHeight: '260px',
                overflowY: 'auto',
                border: '1px solid rgba(27, 107, 69, 0.2)',
                borderRadius: '10px',
                background: '#ffffff',
                marginBottom: '12px',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr
                    style={{
                      background: '#0f4a2a',
                      color: '#ffffff',
                      position: 'sticky',
                      top: 0,
                      textAlign: 'left',
                    }}
                  >
                    <th style={{ padding: '8px 10px', width: '36px' }}>No</th>
                    <th style={{ padding: '8px 10px' }}>Nama Barang</th>
                    <th style={{ padding: '8px 10px' }}>Stok</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Pinjam</th>
                  </tr>
                </thead>
                <tbody>
                  {ASET_MASJID_LIST.map((aset, idx) => {
                    const qty = selectedAsetQty[aset.nama] || 0
                    return (
                      <tr
                        key={aset.nama}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          background: qty > 0 ? '#f0fdf4' : idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                        }}
                      >
                        <td style={{ padding: '7px 10px', color: '#6b7280', fontWeight: 700 }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '7px 10px', fontWeight: 700, color: '#111827' }}>
                          {aset.nama}
                        </td>
                        <td style={{ padding: '7px 10px', color: '#15803d', fontWeight: 700 }}>
                          {aset.stok}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <button
                              type="button"
                              disabled={qty <= 0}
                              onClick={() => {
                                const next = {
                                  ...selectedAsetQty,
                                  [aset.nama]: Math.max(0, qty - 1),
                                }
                                setSelectedAsetQty(next)
                                syncUserAsetSelection(next, manualAsetExtra)
                              }}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                background: '#ffffff',
                                fontWeight: 800,
                                cursor: qty > 0 ? 'pointer' : 'not-allowed',
                                opacity: qty > 0 ? 1 : 0.45,
                              }}
                            >
                              -
                            </button>
                            <span
                              style={{
                                minWidth: '22px',
                                textAlign: 'center',
                                fontWeight: 800,
                                color: qty > 0 ? '#0f4a2a' : '#6b7280',
                              }}
                            >
                              {qty}
                            </span>
                            <button
                              type="button"
                              disabled={qty >= aset.maxQty}
                              onClick={() => {
                                const next = {
                                  ...selectedAsetQty,
                                  [aset.nama]: Math.min(aset.maxQty, qty + 1),
                                }
                                setSelectedAsetQty(next)
                                syncUserAsetSelection(next, manualAsetExtra)
                              }}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                border: '1px solid #15803d',
                                background: '#ecfdf5',
                                color: '#14532d',
                                fontWeight: 800,
                                cursor: qty < aset.maxQty ? 'pointer' : 'not-allowed',
                                opacity: qty < aset.maxQty ? 1 : 0.45,
                              }}
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div>
              <label style={labelStyle}>Ketik Manual / Tambahan Aset Lainnya (Opsional)</label>
              <input
                type="text"
                value={manualAsetExtra}
                onChange={(e) => {
                  const val = e.target.value
                  setManualAsetExtra(val)
                  syncUserAsetSelection(selectedAsetQty, val)
                }}
                placeholder="Contoh: Meja Panjang (2), Kursi (10)"
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
          onDoubleClick={() => {
            if (!captchaInput.trim()) {
              setShowCaptchaModal(false)
              return
            }
            setUnsavedModalUser({
              contextLabel: 'Verifikasi Keamanan Pengajuan',
              onDiscard: () => setShowCaptchaModal(false),
            })
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
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Tutup Pop-up"
              onClick={() => {
                if (!captchaInput.trim()) {
                  setShowCaptchaModal(false)
                  return
                }
                setUnsavedModalUser({
                  contextLabel: 'Verifikasi Keamanan Pengajuan',
                  onDiscard: () => setShowCaptchaModal(false),
                })
              }}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
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
                  onClick={() => {
                    if (!captchaInput.trim()) {
                      setShowCaptchaModal(false)
                      return
                    }
                    setUnsavedModalUser({
                      contextLabel: 'Verifikasi Keamanan Pengajuan',
                      onDiscard: () => setShowCaptchaModal(false),
                    })
                  }}
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
      {/* POP-UP ANIMASI AL-JIHAD BERHASIL TERKIRIM */}
      {showSuccessModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(5px)',
            zIndex: 10020,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onDoubleClick={() => setShowSuccessModal(false)}
        >
          <div
            className={styles.successModalCard}
            style={{ position: 'relative' }}
            onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Tutup Pop-up"
              onClick={() => setShowSuccessModal(false)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
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
            <div className={styles.successLogoWrap}>
              <span className={styles.successPulseRing} />
              <Image
                src={logoMasjidWarna}
                alt="Logo Masjid Al-Jihad"
                width={logoMasjidWarna.width}
                height={logoMasjidWarna.height}
                style={{
                  width: '72px',
                  height: 'auto',
                  objectFit: 'contain',
                  position: 'relative',
                  zIndex: 2,
                }}
              />
              <span className={styles.successCheckBadge}>✓</span>
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#0f4a2a', fontSize: '1.2rem', fontWeight: 800 }}>
              Pengajuan Berhasil Terkirim
            </h3>
            <p
              style={{
                margin: '0 0 18px',
                fontSize: '0.86rem',
                color: '#374151',
                lineHeight: 1.6,
              }}
            >
              Data pengajuan kegiatan Anda sudah diterima sistem dan sedang menunggu tinjauan dari
              Admin DKM Masjid Al-Jihad Karawang.
            </p>
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => setShowSuccessModal(false)}
              style={{ width: '100%', padding: '11px', fontWeight: 800 }}
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {/* POP-UP ALA WEB: NOTIFIKASI PERUBAHAN TIDAK AKAN DISIMPAN */}
      {unsavedModalUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            zIndex: 10050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onDoubleClick={() => setUnsavedModalUser(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.34)',
              position: 'relative',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Tutup"
              onClick={() => setUnsavedModalUser(null)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                border: 'none',
                background: '#f3f4f6',
                borderRadius: '8px',
                width: '30px',
                height: '30px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '999px',
                background: '#fef3c7',
                border: '2px solid #f59e0b',
                color: '#b45309',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 900,
                marginBottom: '12px',
              }}
            >
              !
            </div>

            <h3 style={{ margin: '0 0 8px', color: '#0f4a2a', fontSize: '1.12rem', fontWeight: 800 }}>
              Perubahan Tidak Akan Disimpan
            </h3>

            <p
              style={{
                margin: '0 0 18px',
                fontSize: '0.86rem',
                color: '#374151',
                lineHeight: 1.55,
              }}
            >
              {unsavedModalUser.contextLabel
                ? `Anda akan menutup ${unsavedModalUser.contextLabel}. Data yang sudah diisi belum dikirim dan perubahan tidak akan disimpan.`
                : 'Data yang sedang Anda isi belum dikirim. Jika keluar sekarang, perubahan tidak akan disimpan.'}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setUnsavedModalUser(null)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
                  color: '#1f2937',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Lanjutkan
              </button>
              <button
                type="button"
                onClick={() => {
                  const act = unsavedModalUser.onDiscard
                  setUnsavedModalUser(null)
                  act()
                }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

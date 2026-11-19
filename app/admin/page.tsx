'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import logoMasjidPutih from '@/logo/Logo Masjid Al-Jihad Putih.png'
import logoMasjidWarna from '@/logo/Logo Masjid Al-Jihad.png'
import logoIg from '@/logo/LOGO IG.png'
import logoWeb from '@/logo/LOGO WEB.png'
import posterKajianBg from '@/logo/Poster Kajian Pekanan.png'
import ttdDkm from '@/logo/TTD DKM MASJID AL JIHAD.png'
import {
  getActiveSupabaseConfig,
  saveRuntimeSupabaseConfig,
  getSupabaseClient,
} from '@/lib/supabase'
import {
  masjidStore,
  findScheduleConflicts,
  ASET_MASJID_LIST,
  type BeritaItem,
  type VideoKegiatanItem,
  type KegiatanUnggulanItem,
  type AgendaKalenderItem,
  type PengajuanKalenderItem,
  type KritikSaranItem,
} from '@/lib/masjidStore'
import { getPrayerTimesByLocation, DEFAULT_LOCATION } from '@/lib/prayerTimes'
import type { User } from '@supabase/supabase-js'
import styles from './admin.module.css'

type AdminTab =
  | 'kegiatan_custom'
  | 'kalender'
  | 'berita'
  | 'video'
  | 'kritik_saran'
  | 'poster_khatib'
  | 'surat_undangan'
  | 'kitab_eljihad'

const MENU_LABELS: Record<AdminTab, string> = {
  kegiatan_custom: 'Master & Custom Kegiatan Unggulan',
  kalender: 'Kalender Kegiatan & Anti-Bentrok Jadwal',
  berita: 'Kelola Berita Masjid (Magazine Grid)',
  video: 'Kelola Video Kegiatan Masjid',
  kritik_saran: 'Kotak Masuk Kritik & Saran Jamaah',
  poster_khatib: 'Studio Poster Al-Jihad',
  surat_undangan: 'Pembuat Surat Undangan Resmi DKM',
  kitab_eljihad: 'Upload Kitab Digital (Menu El Jihad)',
}

async function removePhotoBackground(
  imageSrc: string,
  tolerance = 42
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxDim = 700
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No 2d context'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      const imgData = ctx.getImageData(0, 0, w, h)
      const data = imgData.data

      const samplePoints = [
        [2, 2],
        [w - 3, 2],
        [2, Math.floor(h * 0.25)],
        [w - 3, Math.floor(h * 0.25)],
        [Math.floor(w * 0.5), 2],
      ]
      const bgSamples = samplePoints.map(([sx, sy]) => {
        const idx = (sy * w + sx) * 4
        return [data[idx], data[idx + 1], data[idx + 2]]
      })

      const isBgColor = (r: number, g: number, b: number) => {
        for (const [br, bg, bb] of bgSamples) {
          const dist = Math.sqrt((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2)
          if (dist <= tolerance * 1.65) return true
        }
        return false
      }

      const visited = new Uint8Array(w * h)
      const queue: number[] = []

      for (let x = 0; x < w; x++) queue.push(x)
      for (let y = 0; y < Math.floor(h * 0.85); y++) {
        queue.push(y * w)
        queue.push(y * w + (w - 1))
      }

      while (queue.length > 0) {
        const pos = queue.pop()!
        if (visited[pos]) continue
        visited[pos] = 1

        const idx = pos * 4
        if (isBgColor(data[idx], data[idx + 1], data[idx + 2])) {
          data[idx + 3] = 0
          const x = pos % w
          const y = Math.floor(pos / w)
          if (x > 0 && !visited[pos - 1]) queue.push(pos - 1)
          if (x < w - 1 && !visited[pos + 1]) queue.push(pos + 1)
          if (y > 0 && !visited[pos - w]) queue.push(pos - w)
          if (y < h - 1 && !visited[pos + w]) queue.push(pos + w)
        }
      }

      ctx.putImageData(imgData, 0, 0)
      resolve(canvas)
    }
    img.onerror = reject
    img.src = imageSrc
  })
}

export default function AdminSidebarPage() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [activeTab, setActiveTab] = useState<AdminTab>('kegiatan_custom')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Status & Form Koneksi Supabase
  const [sbConfigured, setSbConfigured] = useState(false)
  const [sbUrlInput, setSbUrlInput] = useState('')
  const [sbKeyInput, setSbKeyInput] = useState('')
  const [syncingCloud, setSyncingCloud] = useState(false)
  const [cloudinaryUploading, setCloudinaryUploading] = useState('')

  const uploadFileToCloudinary = async (
    file: File,
    folder: string,
    resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto',
    targetKey: string
  ): Promise<string | null> => {
    setErrorMsg('')
    setCloudinaryUploading(targetKey)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', folder)
      fd.append('resourceType', resourceType)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || !json.url) {
        setErrorMsg(json.error || 'Gagal mengunggah file ke Cloudinary.')
        return null
      }
      setSuccessMsg(`File berhasil diunggah ke Cloudinary!`)
      return String(json.url)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengunggah ke Cloudinary.')
      return null
    } finally {
      setCloudinaryUploading('')
    }
  }

  // Data Stores
  const [kegiatanList, setKegiatanList] = useState<KegiatanUnggulanItem[]>([])
  const [kalenderList, setKalenderList] = useState<AgendaKalenderItem[]>([])
  const [pengajuanKalenderList, setPengajuanKalenderList] = useState<PengajuanKalenderItem[]>([])
  const [beritaList, setBeritaList] = useState<BeritaItem[]>([])
  const [videoList, setVideoList] = useState<VideoKegiatanItem[]>([])
  const [kritikList, setKritikList] = useState<KritikSaranItem[]>([])

  // 1. State Master Kegiatan & Custom Layanan Unggulan
  const [namaKegiatanBaru, setNamaKegiatanBaru] = useState('')
  const [kategoriKegiatanBaru, setKategoriKegiatanBaru] = useState('Ibadah')
  const [jadwalKegiatanBaru, setJadwalKegiatanBaru] = useState('Setiap Pekan')
  const [deskripsiKegiatanBaru, setDeskripsiKegiatanBaru] = useState('')

  const [selectedMasterId, setSelectedMasterId] = useState<string>('')
  const [customIkon, setCustomIkon] = useState('🕌')
  const [customBadge, setCustomBadge] = useState('Rutin Mingguan')
  const [customWarna, setCustomWarna] = useState('#1B6B45')
  const [customJadwal, setCustomJadwal] = useState('')
  const [customDeskripsi, setCustomDeskripsi] = useState('')
  const [customTampil, setCustomTampil] = useState(true)

  // 2. State Kalender & Deteksi Bentrok
  const [judulKal, setJudulKal] = useState('')
  const [pemateriKal, setPemateriKal] = useState('')
  const [noTelpKal, setNoTelpKal] = useState('')
  const [internalMasjidKal, setInternalMasjidKal] = useState(false)
  const [asetKal, setAsetKal] = useState('')
  const [showAsetAdminModal, setShowAsetAdminModal] = useState(false)
  const [selectedAsetQtyAdmin, setSelectedAsetQtyAdmin] = useState<Record<string, number>>({})
  const [manualAsetExtraAdmin, setManualAsetExtraAdmin] = useState('')

  const syncAdminAsetSelection = (nextQty: Record<string, number>, nextExtra: string) => {
    const picked = ASET_MASJID_LIST.filter((a) => (nextQty[a.nama] || 0) > 0).map(
      (a) => `${a.nama} (${nextQty[a.nama]} ${a.satuan})`
    )
    const parts = [...picked, ...(nextExtra.trim() ? [nextExtra.trim()] : [])]
    setAsetKal(parts.join(', '))
  }
  const [tanggalKal, setTanggalKal] = useState('2026-11-20')
  const [jamMulaiKal, setJamMulaiKal] = useState('18:30')
  const [jamSelesaiKal, setJamSelesaiKal] = useState('20:00')
  const [ruanganKal, setRuanganKal] = useState('Ruang Sholat Utama Lantai 1')
  const [kategoriKal, setKategoriKal] = useState<AgendaKalenderItem['kategori']>('Kajian')

  // State Verifikasi Password Admin (aljihad2026) & Chatbot WA Laporan Pengajuan
  const [adminAuthModalOpen, setAdminAuthModalOpen] = useState(false)
  const [adminAuthPassword, setAdminAuthPassword] = useState('')
  const [showAdminAuthPassword, setShowAdminAuthPassword] = useState(false)
  const [adminAuthError, setAdminAuthError] = useState('')
  const [pendingAdminAction, setPendingAdminAction] = useState<
    | { type: 'add_kalender' }
    | { type: 'review_pengajuan'; item: PengajuanKalenderItem; decision: 'Disetujui' | 'Ditolak' }
    | null
  >(null)
  const [waReportModal, setWaReportModal] = useState<{
    item: PengajuanKalenderItem
    decision: 'Disetujui' | 'Ditolak'
  } | null>(null)

  // 3. State Berita
  const [judulBerita, setJudulBerita] = useState('')
  const [kategoriBerita, setKategoriBerita] = useState('KEGIATAN MASJID')
  const [thumbBerita, setThumbBerita] = useState(
    'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1000&q=80'
  )
  const [ringkasanBerita, setRingkasanBerita] = useState('')
  const [kontenBerita, setKontenBerita] = useState('')

  // 4. State Video Kegiatan
  const [judulVideo, setJudulVideo] = useState('')
  const [kategoriVideo, setKategoriVideo] = useState('Ibadah & Sholat')
  const [durasiVideo, setDurasiVideo] = useState('01:15')
  const [urlVideo, setUrlVideo] = useState('')
  const [thumbVideo, setThumbVideo] = useState(
    'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600&q=80'
  )

  // 6. State Studio Poster Khatib
  const [jenisPoster, setJenisPoster] = useState<'Khutbah Jumat' | 'Kajian'>('Khutbah Jumat')
  const [posterTemplate, setPosterTemplate] = useState<
    'klasik_krem' | 'zamrud_elegan' | 'putih_minimalis'
  >('klasik_krem')
  const [tanggalPoster, setTanggalPoster] = useState('2026-11-20')
  const [namaKhatibPoster, setNamaKhatibPoster] = useState('')
  const [kategoriKhotib, setKategoriKhotib] = useState<"Khotib Jum'at" | 'Khotib & Imam'>(
    "Khotib Jum'at"
  )
  const [namaImamPoster, setNamaImamPoster] = useState('')
  const [namaBilalPoster, setNamaBilalPoster] = useState('')
  const [temaPoster, setTemaPoster] = useState('')
  const [useDefaultTemaOtomatis, setUseDefaultTemaOtomatis] = useState(false)
  const autoTemaText =
    jenisPoster === 'Khutbah Jumat'
      ? "Mari tunaikan Sholat Jum'at berjamaah, perkuat iman, dan raih keberkahan."
      : 'Mari hadiri kajian untuk menuntut ilmu, memperkuat iman, dan mempererat ukhuwah Islamiyah.'
  const [waktuOtomatis, setWaktuOtomatis] = useState('11.48 WIB')
  const [waktuKajianInput, setWaktuKajianInput] = useState('19:00')
  const [hijriOtomatis, setHijriOtomatis] = useState('10 Jumadil Akhir 1448 H')
  const [rawKhatibPhoto, setRawKhatibPhoto] = useState<string | null>(null)
  const [aiCutoutPhoto, setAiCutoutPhoto] = useState<string | null>(null)
  const [aiProcessing, setAiProcessing] = useState<boolean>(false)
  const [aiProgressText, setAiProgressText] = useState<string>('')
  const [aiProgressPct, setAiProgressPct] = useState<number>(0)
  const posterCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Bersihkan sisa alpha tipis & potong ketat sesuai siluet objek hasil crop AI
  const trimAndCleanCutout = (srcUrl: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const w = img.width || 1
        const h = img.height || 1
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        const cctx = c.getContext('2d')
        if (!cctx) {
          resolve(srcUrl)
          return
        }
        cctx.drawImage(img, 0, 0)
        const imgData = cctx.getImageData(0, 0, w, h)
        const data = imgData.data
        let minX = w
        let minY = h
        let maxX = 0
        let maxY = 0

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4
            const alpha = data[idx + 3]
            if (alpha < 28) {
              data[idx + 3] = 0
            } else {
              if (x < minX) minX = x
              if (x > maxX) maxX = x
              if (y < minY) minY = y
              if (y > maxY) maxY = y
            }
          }
        }

        if (maxX <= minX || maxY <= minY) {
          resolve(srcUrl)
          return
        }

        cctx.putImageData(imgData, 0, 0)
        const cropW = maxX - minX + 1
        const cropH = maxY - minY + 1
        const out = document.createElement('canvas')
        out.width = cropW
        out.height = cropH
        const octx = out.getContext('2d')
        if (!octx) {
          resolve(srcUrl)
          return
        }
        octx.drawImage(c, minX, minY, cropW, cropH, 0, 0, cropW, cropH)
        resolve(out.toDataURL('image/png'))
      }
      img.onerror = () => resolve(srcUrl)
      img.src = srcUrl
    })

  // Proses AI Neural Network Background Removal (@imgly/background-removal ISNet seperti web remove.bg)
  const handleUploadKhatibWithAI = async (file: File) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      setRawKhatibPhoto(dataUrl)
      setAiCutoutPhoto(null)
      setAiProcessing(true)
      setAiProgressPct(0)
      setAiProgressText('0%')

      // Animasi persen awal halus selama inisialisasi modul AI
      let hasRealProgress = false
      const warmupTimer = window.setInterval(() => {
        if (hasRealProgress) return
        setAiProgressPct((prev) => {
          const next = prev < 18 ? prev + 2 : prev
          setAiProgressText(`${next}%`)
          return next
        })
      }, 220)

      try {
        const mod = await import(
          // @ts-expect-error ESM remote import resolved at runtime in browser
          /* webpackIgnore: true */ 'https://esm.sh/@imgly/background-removal@1.4.5'
        )
        const removeBgFn = mod.removeBackground || mod.default
        const blobResult: Blob = await removeBgFn(file, {
          progress: (_key: string, current: number, total: number) => {
            if (total > 0) {
              hasRealProgress = true
              const pct = Math.min(99, Math.round((current / total) * 100))
              setAiProgressPct((prev) => {
                const next = Math.max(prev, pct)
                setAiProgressText(`${next}%`)
                return next
              })
            }
          },
        })
        const rawCutUrl = URL.createObjectURL(blobResult)
        const trimmedUrl = await trimAndCleanCutout(rawCutUrl)
        URL.revokeObjectURL(rawCutUrl)
        setAiCutoutPhoto(trimmedUrl)
        setAiProgressPct(100)
        setAiProgressText('Latar Belakang berhasil dihapus')
      } catch {
        const fallbackCanvas = await removePhotoBackground(dataUrl, 42)
        const trimmedFallback = await trimAndCleanCutout(fallbackCanvas.toDataURL('image/png'))
        setAiCutoutPhoto(trimmedFallback)
        setAiProgressPct(100)
        setAiProgressText('Latar Belakang berhasil dihapus')
      } finally {
        window.clearInterval(warmupTimer)
        setAiProcessing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  // 7. State Surat Undangan Resmi DKM
  const [noSurat, setNoSurat] = useState('045/DKM-ALJIHAD/KRW/XI/2026')
  const [waShareHint, setWaShareHint] = useState('')
  const [lastUsedNoSurat, setLastUsedNoSurat] = useState<{
    nomor: string
    waktu: string
  } | null>(null)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('aljihad_last_no_surat_v1')
      if (saved) {
        setLastUsedNoSurat(JSON.parse(saved))
      }
    } catch {
      // ignore storage error
    }
  }, [])

  const recordLastUsedNoSurat = (nomor: string) => {
    if (!nomor.trim()) return
    const entry = {
      nomor: nomor.trim(),
      waktu: new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
    setLastUsedNoSurat(entry)
    try {
      window.localStorage.setItem('aljihad_last_no_surat_v1', JSON.stringify(entry))
    } catch {
      // ignore storage error
    }
  }
  const [jenisSurat, setJenisSurat] = useState<'Khutbah Jumat' | 'Umum'>('Khutbah Jumat')
  const [perihalKhutbahOpsi, setPerihalKhutbahOpsi] = useState<
    'Khotib & Imam' | 'Khotib Jumat' | 'Imam Jumat' | 'Bilal' | 'Manual'
  >('Khotib & Imam')
  const [perihalSurat, setPerihalSurat] = useState(
    "Permohonan Menjadi Khotib & Imam Sholat Jum'at"
  )
  const [kepadaSurat, setKepadaSurat] = useState('Al-Mukarram KH. Ahmad Fauzan, S.Ag.')
  const [tanggalSuratAcara, setTanggalSuratAcara] = useState('2026-11-20')
  const [waktuSuratAcara, setWaktuSuratAcara] = useState('11:36 WIB')
  const [tempatSuratAcara, setTempatSuratAcara] = useState(
    'Masjid Raya Al-Jihad Islamic Center Karawang'
  )
  const [agendaSurat, setAgendaSurat] = useState(
    'Menjadi Khotib & Imam dalam pelaksanaan ibadah Jumat.'
  )

  const PERIHAL_KHUTBAH_MAP: Record<
    'Khotib & Imam' | 'Khotib Jumat' | 'Imam Jumat' | 'Bilal',
    { perihal: string; agenda: string }
  > = {
    'Khotib & Imam': {
      perihal: "Permohonan Menjadi Khotib & Imam Sholat Jum'at",
      agenda: 'Menjadi Khotib & Imam dalam pelaksanaan ibadah Jumat.',
    },
    'Khotib Jumat': {
      perihal: "Permohonan Menjadi Khotib Sholat Jum'at",
      agenda: 'Menjadi Khotib dalam pelaksanaan ibadah Jumat.',
    },
    'Imam Jumat': {
      perihal: "Permohonan Menjadi Imam Sholat Jum'at",
      agenda: 'Menjadi Imam dalam pelaksanaan ibadah Jumat.',
    },
    Bilal: {
      perihal: "Permohonan Menjadi Bilal Sholat Jum'at",
      agenda: 'Menjadi Bilal dalam pelaksanaan ibadah Jumat.',
    },
  }

  const handleSelectPerihalKhutbah = (
    opsi: 'Khotib & Imam' | 'Khotib Jumat' | 'Imam Jumat' | 'Bilal' | 'Manual'
  ) => {
    setPerihalKhutbahOpsi(opsi)
    if (opsi === 'Manual') {
      setPerihalSurat('')
      return
    }
    const preset = PERIHAL_KHUTBAH_MAP[opsi]
    setPerihalSurat(preset.perihal)
    setAgendaSurat(preset.agenda)
  }

  // 8. State Upload Kitab El Jihad
  const [judulKitab, setJudulKitab] = useState('')
  const [penulisKitab, setPenulisKitab] = useState('')
  const [kategoriKitab, setKategoriKitab] = useState('Fiqih & Ibadah')
  const [filePdfUrl, setFilePdfUrl] = useState('')

  // Load dari Local + Pull dari Supabase Cloud jika sudah terhubung
  const syncAllData = useCallback(async () => {
    const cfg = getActiveSupabaseConfig()
    setSbConfigured(cfg.isConfigured)
    if (cfg.isConfigured && !sbUrlInput) {
      setSbUrlInput(cfg.url)
      setSbKeyInput(cfg.anonKey)
    }

    const kList = masjidStore.getKegiatan()
    setKegiatanList(kList)
    if (kList.length > 0 && !selectedMasterId) {
      setSelectedMasterId(kList[0].id)
      setCustomIkon(kList[0].ikon)
      setCustomBadge(kList[0].badgeCustom)
      setCustomWarna(kList[0].warnaCustom)
      setCustomJadwal(kList[0].jadwal)
      setCustomDeskripsi(kList[0].deskripsi)
      setCustomTampil(kList[0].tampilDiBeranda)
    }
    setKalenderList(masjidStore.getKalender())
    setPengajuanKalenderList(masjidStore.getPengajuanKalender())
    setBeritaList(masjidStore.getBerita())
    setVideoList(masjidStore.getVideo())
    setKritikList(masjidStore.getKritik())

    if (cfg.isConfigured) {
      const sb = getSupabaseClient()
      const [bRes, pRes, jRes, rRes, ksRes] = await Promise.all([
        sb.from('berita').select('*').order('created_at', { ascending: false }),
        sb.from('program').select('*').order('created_at', { ascending: false }),
        sb.from('jadwal_terdekat').select('*').order('tanggal', { ascending: true }),
        sb.from('reels').select('*').order('urutan', { ascending: true }),
        sb.from('kritik_saran').select('*').order('created_at', { ascending: false }),
      ])

      if (bRes.data && bRes.data.length > 0) {
        const mappedB: BeritaItem[] = bRes.data.map((d) => ({
          id: d.id,
          judul: d.judul,
          slug: d.slug,
          ringkasan: d.ringkasan || '',
          konten: d.konten || '',
          thumbnail_url:
            d.thumbnail_url ||
            'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1000&q=80',
          kategori: d.kategori || 'KEGIATAN MASJID',
          created_at: d.created_at,
          published: d.published ?? true,
        }))
        setBeritaList(mappedB)
        masjidStore.saveBerita(mappedB)
      }

      if (pRes.data && pRes.data.length > 0) {
        const mappedP: KegiatanUnggulanItem[] = pRes.data.map((d) => ({
          id: d.id,
          nama: d.nama,
          deskripsi: d.deskripsi || '',
          kategori: d.kategori || 'Ibadah',
          ikon: d.ikon || '🕌',
          jadwal: d.jadwal || 'Rutin Mingguan',
          lokasi: d.lokasi || 'Masjid Al-Jihad Karawang',
          badgeCustom: d.badge_custom || 'Aktif',
          warnaCustom: d.warna_custom || '#1B6B45',
          tampilDiBeranda: d.tampil_beranda ?? true,
          aktif: d.aktif ?? true,
        }))
        setKegiatanList(mappedP)
        masjidStore.saveKegiatan(mappedP)
      }

      if (!jRes.error && jRes.data) {
        const mappedJ: AgendaKalenderItem[] = jRes.data.map((d) => ({
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
        setKalenderList(mappedJ)
        masjidStore.saveKalender(mappedJ)
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
          setPengajuanKalenderList(mappedPgj)
          masjidStore.savePengajuanKalender(mappedPgj)
        }
      } catch {
        // tabel pengajuan_kalender opsional jika belum dibuat di Supabase
      }

      if (rRes.data && rRes.data.length > 0) {
        const mappedR: VideoKegiatanItem[] = rRes.data.map((d, idx) => ({
          id: d.id,
          judul: d.judul || 'Video Kegiatan Masjid',
          url_video: d.url_video,
          thumbnail_url:
            d.thumbnail_url ||
            'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600&q=80',
          kategori: d.kategori || 'Kegiatan Masjid',
          durasi: d.durasi || '01:15',
          urutan: d.urutan || idx + 1,
          aktif: d.aktif ?? true,
        }))
        setVideoList(mappedR)
        masjidStore.saveVideo(mappedR)
      }

      if (ksRes.data && ksRes.data.length > 0) {
        const mappedK: KritikSaranItem[] = ksRes.data.map((d) => ({
          id: d.id,
          nama: d.nama || 'Jamaah',
          kontak: d.kontak || '-',
          kategori: d.kategori || 'Masukan',
          pesan: d.pesan,
          tanggal: d.tanggal || new Date().toISOString().slice(0, 10),
          status: (d.status || 'Baru') as KritikSaranItem['status'],
        }))
        setKritikList(mappedK)
        masjidStore.saveKritik(mappedK)
      }
    }
  }, [selectedMasterId, sbUrlInput])

  const isRevokedMaintenanceAccount = (userEmail?: string | null) => {
    const normalized = (userEmail || '').toLowerCase().replace(/\s+/g, '')
    return normalized.includes('alazhar') || normalized.includes('al-azhar')
  }

  useEffect(() => {
    syncAllData()
    const cfg = getActiveSupabaseConfig()
    if (!cfg.isConfigured) return
    const sb = getSupabaseClient()
    sb.auth.getSession().then(async ({ data }) => {
      const currentUser = data.session?.user ?? null
      if (currentUser && isRevokedMaintenanceAccount(currentUser.email)) {
        await sb.auth.signOut()
        setUser(null)
        setErrorMsg(
          'Akses akun maintenance (Al-Azhar) telah dicabut dan tidak memiliki akses ke website.'
        )
        return
      }
      if (currentUser) setUser(currentUser)
    })
  }, [syncAllData])

  // Otomatis ambil Waktu Sholat & Tanggal Hijriah dari database waktu sholat terdekat sesuai tanggal yang dipilih
  useEffect(() => {
    const HIJRI_ID: Record<string, string> = {
      Muharram: 'Muharram',
      Safar: 'Shafar',
      "Rabi' al-awwal": "Rabi'ul Awal",
      "Rabi' al-thani": "Rabi'ul Akhir",
      'Jumada al-ula': 'Jumadil Awal',
      'Jumada al-thani': 'Jumadil Akhir',
      Rajab: 'Rajab',
      "Sha'ban": "Sya'ban",
      Ramadan: 'Ramadhan',
      Shawwal: 'Syawal',
      'Dhu al-Qidah': "Dzulqa'dah",
      'Dhu al-Hijjah': 'Dzulhijjah',
    }
    const targetDate = tanggalPoster ? new Date(`${tanggalPoster}T12:00:00`) : new Date()
    getPrayerTimesByLocation(DEFAULT_LOCATION, targetDate)
      .then((res) => {
        const t = res.data.timings
        const h = res.data.date.hijri
        const monthId = HIJRI_ID[h.month.en] || h.month.en
        setHijriOtomatis(`${h.day} ${monthId} ${h.year} H`)
        if (jenisPoster === 'Khutbah Jumat') {
          setWaktuOtomatis(`${t.Dhuhr.replace(':', '.')} WIB`)
          setWaktuSuratAcara(`${t.Dhuhr} WIB`)
        } else {
          const jamKajian = (waktuKajianInput || '19:00').replace(':', '.')
          setWaktuOtomatis(`${jamKajian} WIB`)
          setWaktuSuratAcara(`${jamKajian} WIB s/d Selesai (Kajian Umum)`)
        }
      })
      .catch(() => { })
  }, [jenisPoster, tanggalPoster, waktuKajianInput])

  // Render Template Poster Persis Seperti Desain Referensi (Krem Bersih, Lentera Emas, Bingkai Bintang Segi-8 Hijau, Foto Khatib Kanan + Pill Nama Hijau, Bar Kontak Bawah)
  const renderPosterCanvas = useCallback(async () => {
    const canvas = posterCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 1080
    const H = 1350
    canvas.width = W
    canvas.height = H

    // Helper menggambar Rounded Pill / Persegi Panjang Melengkung
    const drawRoundedRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      const radius = Math.min(r, w / 2, h / 2)
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + w - radius, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
      ctx.lineTo(x + w, y + h - radius)
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
      ctx.lineTo(x + radius, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
    }

    // Helper menggambar strip bawah IG & Website dengan ikon dari folder /logo untuk semua template
    const drawSocialFooterStrip = async (withCornerAccents = false) => {
      const stripY = 1265
      const stripH = 85
      const stripGrad = ctx.createLinearGradient(0, stripY, W, stripY)
      stripGrad.addColorStop(0, '#0B3B22')
      stripGrad.addColorStop(0.5, '#135834')
      stripGrad.addColorStop(1, '#0B3B22')
      ctx.fillStyle = stripGrad
      ctx.fillRect(0, stripY, W, stripH)

      if (withCornerAccents) {
        ctx.fillStyle = '#188549'
        ctx.beginPath()
        ctx.moveTo(0, stripY)
        ctx.lineTo(95, stripY)
        ctx.lineTo(65, H)
        ctx.lineTo(0, H)
        ctx.closePath()
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(W, stripY)
        ctx.lineTo(W - 95, stripY)
        ctx.lineTo(W - 65, H)
        ctx.lineTo(W, H)
        ctx.closePath()
        ctx.fill()
      }

      // Garis aksen emas tipis di atas strip bawah
      ctx.fillStyle = '#D4AF37'
      ctx.fillRect(0, stripY, W, 4)

      const loadIcon = (src: string) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const im = new window.Image()
          im.crossOrigin = 'anonymous'
          im.onload = () => resolve(im.width > 0 ? im : null)
          im.onerror = () => resolve(null)
          im.src = src
        })

      const [igImg, webImg] = await Promise.all([loadIcon(logoIg.src), loadIcon(logoWeb.src)])

      const igText = 'masjidaljihad.karawang'
      const sepText = '•'
      const webText = 'www.masjidaljihadkarawang.or.id'
      const iconSize = 26
      const iconGap = 10
      const sepGap = 24

      ctx.save()
      ctx.font = '700 24px Poppins, sans-serif'
      ctx.fillStyle = '#FFFFFF'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'

      const igTextW = ctx.measureText(igText).width
      const sepW = ctx.measureText(sepText).width
      const webTextW = ctx.measureText(webText).width
      const totalW =
        iconSize + iconGap + igTextW + sepGap + sepW + sepGap + iconSize + iconGap + webTextW
      let curX = (W - totalW) / 2
      const midY = stripY + stripH / 2 + 2

      if (igImg) {
        ctx.drawImage(igImg, curX, midY - iconSize / 2, iconSize, iconSize)
      }
      curX += iconSize + iconGap
      ctx.fillText(igText, curX, midY)
      curX += igTextW + sepGap

      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
      ctx.fillText(sepText, curX, midY)
      curX += sepW + sepGap

      ctx.fillStyle = '#FFFFFF'
      if (webImg) {
        ctx.drawImage(webImg, curX, midY - iconSize / 2, iconSize, iconSize)
      }
      curX += iconSize + iconGap
      ctx.fillText(webText, curX, midY)
      ctx.restore()
    }

    // Helper menggambar Ornamen Bintang Segi Delapan (Rub el Hizb) khas di belakang Khatib
    const drawOctagramFrame = (
      cx: number,
      cy: number,
      size: number,
      strokeColor: string,
      innerColor: string
    ) => {
      ctx.save()
      ctx.translate(cx, cy)

      // Pola jaring geometris tipis di bagian dalam
      ctx.save()
      ctx.beginPath()
      ctx.rect(-size / 2, -size / 2, size, size)
      ctx.clip()
      ctx.strokeStyle = innerColor
      ctx.lineWidth = 2.2
      const step = 36
      for (let gx = -size; gx <= size; gx += step) {
        for (let gy = -size; gy <= size; gy += step) {
          ctx.beginPath()
          ctx.arc(gx, gy, 18, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      ctx.restore()

      // Dua persegi diputar 0 deg dan 45 deg membentuk bintang segi-8
      for (let angle = 0; angle < 2; angle++) {
        ctx.save()
        ctx.rotate((angle * Math.PI) / 4)
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = 14
        ctx.strokeRect(-size / 2, -size / 2, size, size)
        ctx.strokeStyle = '#F8FAF5'
        ctx.lineWidth = 4
        ctx.strokeRect(-size / 2 + 12, -size / 2 + 12, size - 24, size - 24)
        ctx.restore()
      }
      ctx.restore()
    }

    // Helper menggambar Lentera Emas Gantung (Fanoos) di Kanan Atas
    const drawGoldenLantern = (cx: number, topY: number, lanternScale = 1) => {
      ctx.save()
      ctx.translate(cx, topY)
      ctx.scale(lanternScale, lanternScale)

      // Rantai Gantung
      ctx.strokeStyle = '#9E7318'
      ctx.lineWidth = 4
      ctx.setLineDash([8, 5])
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, 72)
      ctx.stroke()
      ctx.setLineDash([])

      // Bayangan Lentera
      ctx.shadowColor = 'rgba(80, 50, 5, 0.28)'
      ctx.shadowBlur = 22
      ctx.shadowOffsetY = 10

      // Badan Lentera Emas
      const lGrad = ctx.createLinearGradient(-68, 70, 68, 250)
      lGrad.addColorStop(0, '#BA7D10')
      lGrad.addColorStop(0.35, '#F8D362')
      lGrad.addColorStop(0.55, '#FFF099')
      lGrad.addColorStop(0.8, '#D2941B')
      lGrad.addColorStop(1, '#8C5808')

      // Sayap Ornamen Belakang Lentera
      ctx.fillStyle = lGrad
      drawRoundedRect(-64, 92, 128, 126, 28)
      ctx.fill()

      // Kubah Atas Lentera
      ctx.beginPath()
      ctx.arc(0, 92, 38, Math.PI, 0)
      ctx.fill()

      // Badan Silinder Tengah Lentera
      const innerGrad = ctx.createLinearGradient(-42, 95, 42, 215)
      innerGrad.addColorStop(0, '#9E640A')
      innerGrad.addColorStop(0.5, '#F7C948')
      innerGrad.addColorStop(1, '#8F5907')
      ctx.fillStyle = innerGrad
      drawRoundedRect(-40, 95, 80, 114, 16)
      ctx.fill()

      // Cahaya Bulan Sabit di Tengah Lentera
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
      ctx.fillStyle = '#FFF6B3'
      ctx.beginPath()
      ctx.arc(0, 152, 16, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#C98A16'
      ctx.beginPath()
      ctx.arc(6, 149, 13, 0, Math.PI * 2)
      ctx.fill()

      // Ujung Bawah Lentera Meruncing
      ctx.fillStyle = lGrad
      ctx.beginPath()
      ctx.moveTo(-42, 208)
      ctx.lineTo(42, 208)
      ctx.lineTo(0, 246)
      ctx.closePath()
      ctx.fill()

      ctx.restore()
    }

    // =========================================================================
    // TEMPLATE KAJIAN PEKANAN DARK EMERALD (TEMPLATE 1 SAAT MODE KAJIAN / TEMPLATE 3)
    // =========================================================================
    if (
      (jenisPoster === 'Kajian' && posterTemplate === 'klasik_krem') ||
      posterTemplate === 'putih_minimalis'
    ) {
      // 1. Gambar template dasar (Poster Kajian Pekanan)
      try {
        const bgImg = new window.Image()
        bgImg.crossOrigin = 'anonymous'
        bgImg.src = posterKajianBg.src
        await new Promise((res) => {
          bgImg.onload = res
          bgImg.onerror = res
        })
        if (bgImg.width > 0) {
          ctx.drawImage(bgImg, 0, 0, W, H)
        } else {
          ctx.fillStyle = '#072A16'
          ctx.fillRect(0, 0, W, H)
        }
      } catch {
        ctx.fillStyle = '#072A16'
        ctx.fillRect(0, 0, W, H)
      }

      // 2. Foto Penceramah / Ustadz di tengah depan teks besar KAJIAN (terpotong rapi di atas pill putih-hijau)
      const t3PhotoCenterX = W / 2
      const t3ClipBottomY = 1004
      if (rawKhatibPhoto) {
        try {
          const img = new window.Image()
          img.crossOrigin = 'anonymous'
          img.src = aiCutoutPhoto || rawKhatibPhoto
          await new Promise((res) => {
            img.onload = res
            img.onerror = res
          })
          const sw = img.width || 1
          const sh = img.height || 1
          const targetH = 820
          const targetW = (sw / sh) * targetH
          const drawX = t3PhotoCenterX - targetW / 2
          const drawY = t3ClipBottomY - targetH + 40

          ctx.save()
          ctx.beginPath()
          ctx.rect(0, 0, W, t3ClipBottomY)
          ctx.clip()
          if (aiCutoutPhoto) {
            ctx.shadowColor = 'rgba(0, 12, 6, 0.55)'
            ctx.shadowBlur = 32
            ctx.shadowOffsetX = -12
            ctx.shadowOffsetY = 10
          }
          ctx.drawImage(img, drawX, drawY, targetW, targetH)
          ctx.restore()
        } catch {
          // fallback
        }
      } else {
        ctx.save()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)'
        ctx.beginPath()
        ctx.arc(t3PhotoCenterX, 420, 90, 0, Math.PI * 2)
        ctx.fill()
        drawRoundedRect(t3PhotoCenterX - 165, 530, 330, 440, 140)
        ctx.fill()
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 23px Poppins, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Upload Foto Khatib', t3PhotoCenterX, 725)
        ctx.font = '19px Poppins, sans-serif'
        ctx.fillText('(AI Remove Background)', t3PhotoCenterX, 758)
        ctx.restore()
      }

      // 4. Pill Nama Khatib ramping tepat di atas bar info putih-hijau
      if (namaKhatibPoster.trim()) {
        ctx.save()
        const pillText = namaKhatibPoster.trim()
        ctx.font = '800 22px Poppins, sans-serif'
        const textW = ctx.measureText(pillText).width
        const pW = Math.min(W - 140, textW + 64)
        const pH = 48
        const pX = (W - pW) / 2
        const pY = 944

        ctx.shadowColor = 'rgba(0, 0, 0, 0.38)'
        ctx.shadowBlur = 16
        ctx.shadowOffsetY = 4
        ctx.fillStyle = 'rgba(8, 52, 27, 0.92)'
        drawRoundedRect(pX, pY, pW, pH, 24)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.strokeStyle = 'rgba(255, 232, 133, 0.65)'
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.fillStyle = '#FFFFFF'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(pillText, W / 2, pY + pH / 2 + 1)
        ctx.restore()
      }

      // 5. Timpa area teks tanggal & pukul bawaan di dalam pill putih dengan Hari + Tanggal & Pukul dinamis
      const t3DateObj = new Date(`${tanggalPoster}T12:00:00`)
      const t3Weekday = t3DateObj.toLocaleDateString('id-ID', { weekday: 'long' })
      const t3DateShort = t3DateObj.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      ctx.save()
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(174, 1034, 138, 76)
      ctx.fillRect(354, 1034, 160, 76)

      ctx.textAlign = 'left'
      ctx.fillStyle = '#0D4E2B'
      ctx.font = '800 24px Poppins, sans-serif'
      ctx.fillText(t3Weekday, 176, 1062)
      ctx.fillText('Pukul', 358, 1062)

      ctx.fillStyle = '#1E3A2B'
      ctx.font = '600 18px Poppins, sans-serif'
      ctx.fillText(t3DateShort, 176, 1091)
      ctx.fillText(waktuOtomatis, 358, 1091)
      ctx.restore()

      // 6. Tema Kajian di bawah shape Tanggal, Waktu & Lokasi
      const effectiveTemaT3 = useDefaultTemaOtomatis ? autoTemaText : temaPoster.trim()
      if (effectiveTemaT3) {
        ctx.save()
        ctx.textAlign = 'center'
        ctx.fillStyle = '#FFE885'
        ctx.font = '700 17px Poppins, sans-serif'
        if (!useDefaultTemaOtomatis) {
          ctx.fillText('TEMA KAJIAN', W / 2, 1166)
        }

        ctx.fillStyle = '#FFFFFF'
        ctx.font = '700 24px Poppins, sans-serif'
        const t3Words = effectiveTemaT3.split(' ')
        let t3Line = ''
        const t3Lines: string[] = []
        for (const w of t3Words) {
          const test = (t3Line + ' ' + w).trim()
          if (ctx.measureText(test).width > 820) {
            if (t3Line) t3Lines.push(t3Line)
            t3Line = w
          } else {
            t3Line = test
          }
        }
        if (t3Line) t3Lines.push(t3Line)

        let t3Y = useDefaultTemaOtomatis ? 1188 : 1198
        for (const line of t3Lines.slice(0, 2)) {
          ctx.fillText(line, W / 2, t3Y)
          t3Y += 32
        }
        ctx.restore()
      }

      // 7. Strip bawah IG & Website dengan ikon dari folder /logo
      await drawSocialFooterStrip(false)
      return
    }

    // =========================================================================
    // TEMPLATE 2: DESAIN PUTIH BERSIH & ZAMRUD (KHUSUS TEMPLATE 2)
    // =========================================================================
    if (posterTemplate === 'zamrud_elegan') {
      // 1. Latar belakang radial putih bersih + berkas cahaya lembut
      const t2Bg = ctx.createRadialGradient(W / 2, 420, 80, W / 2, 650, 920)
      t2Bg.addColorStop(0, '#FFFFFF')
      t2Bg.addColorStop(0.65, '#F8FBF9')
      t2Bg.addColorStop(1, '#EBF2EE')
      ctx.fillStyle = t2Bg
      ctx.fillRect(0, 0, W, H)

      // Berkas cahaya diagonal samar dari pusat atas
      ctx.save()
      ctx.fillStyle = 'rgba(216, 232, 222, 0.28)'
      const rays = [
        [-220, -40, 140, 1350],
        [140, -40, 520, 1350],
        [560, -40, 940, 1350],
        [940, -40, 1300, 1350],
      ]
      for (const [x1, y1, x2, y2] of rays) {
        ctx.beginPath()
        ctx.moveTo(W / 2, 180)
        ctx.lineTo(x1, y2)
        ctx.lineTo(x2, y2)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()

      // 2. Foto asli Masjid Al-Jihad Karawang samar-samar di belakang khatib
      try {
        const masjidBgImg = new window.Image()
        masjidBgImg.crossOrigin = 'anonymous'
        masjidBgImg.src = '/images/masjid-aljihad-facade.png'
        await new Promise((res) => {
          masjidBgImg.onload = res
          masjidBgImg.onerror = res
        })
        if (masjidBgImg.width > 0 && masjidBgImg.height > 0) {
          const sx = masjidBgImg.width * 0.04
          const sy = masjidBgImg.height * 0.27
          const sw = masjidBgImg.width * 0.92
          const sh = masjidBgImg.height * 0.49
          const destW = W
          const destH = (sh / sw) * destW
          const destY = 250

          ctx.save()
          ctx.globalAlpha = 0.17
          ctx.filter = 'grayscale(25%) contrast(1.04)'
          ctx.drawImage(masjidBgImg, sx, sy, sw, sh, 0, destY, destW, destH)
          ctx.restore()

          // Feather lembut di tepi atas & bawah agar menyatu halus ke background putih
          const topFeather = ctx.createLinearGradient(0, destY, 0, destY + 110)
          topFeather.addColorStop(0, 'rgba(255, 255, 255, 0.96)')
          topFeather.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.fillStyle = topFeather
          ctx.fillRect(0, destY, W, 110)

          const botFeather = ctx.createLinearGradient(0, destY + destH - 130, 0, destY + destH + 10)
          botFeather.addColorStop(0, 'rgba(248, 251, 249, 0)')
          botFeather.addColorStop(1, 'rgba(248, 251, 249, 0.98)')
          ctx.fillStyle = botFeather
          ctx.fillRect(0, destY + destH - 130, W, 140)
        }
      } catch {
        // fallback tanpa gambar
      }

      // 3. Aksen titik-titik (dot grid) khas di kanan tengah & kiri bawah
      ctx.fillStyle = 'rgba(13, 78, 43, 0.52)'
      for (let gx = 0; gx < 6; gx++) {
        for (let gy = 0; gy < 5; gy++) {
          ctx.beginPath()
          ctx.arc(920 + gx * 18, 865 + gy * 18, 3.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      for (let gx = 0; gx < 5; gx++) {
        for (let gy = 0; gy < 6; gy++) {
          ctx.beginPath()
          ctx.arc(38 + gx * 18, 1015 + gy * 18, 3.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // 4. Strip hijau atas & tab putih logo Masjid Al-Jihad Karawang
      ctx.fillStyle = '#0B4E2B'
      ctx.fillRect(0, 0, W, 22)

      ctx.save()
      ctx.shadowColor = 'rgba(11, 78, 43, 0.14)'
      ctx.shadowBlur = 22
      ctx.shadowOffsetY = 6
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.moveTo(W / 2 - 205, 0)
      ctx.lineTo(W / 2 + 205, 0)
      ctx.lineTo(W / 2 + 185, 92)
      ctx.quadraticCurveTo(W / 2 + 180, 118, W / 2 + 150, 118)
      ctx.lineTo(W / 2 - 150, 118)
      ctx.quadraticCurveTo(W / 2 - 180, 118, W / 2 - 185, 92)
      ctx.closePath()
      ctx.fill()
      ctx.restore()

      // Logo Masjid Al-Jihad di dalam tab atas
      try {
        const logoImg = new window.Image()
        logoImg.crossOrigin = 'anonymous'
        logoImg.src = logoMasjidWarna.src
        await new Promise((res) => {
          logoImg.onload = res
          logoImg.onerror = res
        })
        if (logoImg.width > 0) {
          const lh = 76
          const lw = Math.min(310, (logoImg.width / logoImg.height) * lh)
          const drawLh = (logoImg.height / logoImg.width) * lw
          ctx.drawImage(logoImg, W / 2 - lw / 2, 18 + (82 - drawLh) / 2, lw, drawLh)
        }
      } catch {
        ctx.fillStyle = '#0B4E2B'
        ctx.font = '900 24px Poppins, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('MASJID AL-JIHAD KARAWANG', W / 2, 72)
      }

      // 5. Foto Khatib di tengah
      const t2PhotoCenterX = W / 2
      if (rawKhatibPhoto) {
        try {
          const img = new window.Image()
          img.crossOrigin = 'anonymous'
          img.src = aiCutoutPhoto || rawKhatibPhoto
          await new Promise((res) => {
            img.onload = res
            img.onerror = res
          })
          const sw = img.width || 1
          const sh = img.height || 1
          const targetH = 620
          const targetW = (sw / sh) * targetH
          const drawX = t2PhotoCenterX - targetW / 2
          const drawY = 748 - targetH

          ctx.save()
          if (aiCutoutPhoto) {
            ctx.shadowColor = 'rgba(7, 28, 16, 0.34)'
            ctx.shadowBlur = 30
            ctx.shadowOffsetX = -14
            ctx.shadowOffsetY = 12
          }
          ctx.drawImage(img, drawX, drawY, targetW, targetH)
          ctx.restore()
        } catch {
          // fallback
        }
      } else {
        ctx.save()
        ctx.fillStyle = 'rgba(11, 78, 43, 0.08)'
        ctx.beginPath()
        ctx.arc(t2PhotoCenterX, 310, 82, 0, Math.PI * 2)
        ctx.fill()
        drawRoundedRect(t2PhotoCenterX - 145, 410, 290, 310, 120)
        ctx.fill()
        ctx.fillStyle = '#0B4E2B'
        ctx.font = 'bold 22px Poppins, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Upload Foto Khatib', t2PhotoCenterX, 555)
        ctx.font = '18px Poppins, sans-serif'
        ctx.fillText('(AI Remove Background)', t2PhotoCenterX, 586)
        ctx.restore()
      }

      // Gradasi putih lembut di bagian pinggang foto agar judul besar terbaca jelas
      const waistFade = ctx.createLinearGradient(0, 560, 0, 755)
      waistFade.addColorStop(0, 'rgba(255, 255, 255, 0)')
      waistFade.addColorStop(0.7, 'rgba(250, 252, 251, 0.86)')
      waistFade.addColorStop(1, 'rgba(248, 251, 249, 1)')
      ctx.fillStyle = waistFade
      ctx.fillRect(140, 560, W - 280, 195)

      // 6. Aksen daun hijau lembut di tepi kiri & kanan
      const drawSoftLeaf = (lx: number, ly: number, rx: number, ry: number, rot: number) => {
        ctx.save()
        ctx.translate(lx, ly)
        ctx.rotate(rot)
        ctx.filter = 'blur(2.5px)'
        const lGrad = ctx.createLinearGradient(-rx, -ry, rx, ry)
        lGrad.addColorStop(0, '#78C850')
        lGrad.addColorStop(1, '#1E7A38')
        ctx.fillStyle = lGrad
        ctx.beginPath()
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      drawSoftLeaf(42, 625, 48, 125, -0.45)
      drawSoftLeaf(1038, 405, 42, 110, 0.52)

      // 7. Nama Khatib di kiri & Kategori Khotib di kanan
      ctx.save()
      ctx.fillStyle = '#0B4E2B'
      ctx.textAlign = 'left'
      let t2NameSize = 27
      ctx.font = `800 ${t2NameSize}px Poppins, sans-serif`
      const maxLeftW = 300
      const nameWords = namaKhatibPoster.split(' ')
      let nameLine1 = ''
      let nameLine2 = ''
      for (const w of nameWords) {
        if (ctx.measureText((nameLine1 + ' ' + w).trim()).width <= maxLeftW && !nameLine2) {
          nameLine1 = (nameLine1 + ' ' + w).trim()
        } else {
          nameLine2 = (nameLine2 + ' ' + w).trim()
        }
      }
      if (nameLine2) {
        while (
          (ctx.measureText(nameLine1).width > maxLeftW ||
            ctx.measureText(nameLine2).width > maxLeftW) &&
          t2NameSize > 19
        ) {
          t2NameSize -= 1
          ctx.font = `800 ${t2NameSize}px Poppins, sans-serif`
        }
        ctx.fillText(nameLine1, 56, 348)
        ctx.fillText(nameLine2, 56, 382)
        ctx.fillStyle = '#0B4E2B'
        ctx.fillRect(56, 396, 150, 3)
      } else {
        ctx.fillText(nameLine1, 56, 372)
        ctx.fillRect(56, 386, 150, 3)
      }

      ctx.textAlign = 'right'
      ctx.fillStyle = '#0B4E2B'
      ctx.font = '800 28px Poppins, sans-serif'
      ctx.fillText(jenisPoster === 'Kajian' ? 'Penceramah' : kategoriKhotib, W - 56, 610)
      ctx.fillRect(W - 206, 624, 150, 3)
      ctx.restore()

      // 8. Judul Besar Tengah (KHUTBAH JUMAT / KAJIAN)
      ctx.save()
      ctx.textAlign = 'center'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 14

      if (jenisPoster === 'Kajian') {
        ctx.font = '900 112px Georgia, serif'
        ctx.strokeText('KAJIAN', W / 2, 792)
        ctx.fillStyle = '#0D5530'
        ctx.fillText('KAJIAN', W / 2, 792)
      } else {
        ctx.font = '900 90px Georgia, serif'
        ctx.strokeText('KHUTBAH', W / 2, 725)
        ctx.fillStyle = '#0D5530'
        ctx.fillText('KHUTBAH', W / 2, 725)

        ctx.strokeText('JUMAT', W / 2, 816)
        ctx.fillText('JUMAT', W / 2, 816)
      }
      ctx.restore()

      // 9. Tema Kajian (Centered)
      const effectiveTemaT2 = useDefaultTemaOtomatis
        ? autoTemaText
        : temaPoster.trim()
      ctx.save()
      ctx.textAlign = 'center'
      ctx.fillStyle = '#25362C'
      ctx.font = '600 25px Poppins, sans-serif'
      const t2TemaWords = effectiveTemaT2 ? effectiveTemaT2.split(' ') : []
      let t2Line = ''
      let t2TemaY = 868
      for (const word of t2TemaWords) {
        const test = t2Line + word + ' '
        if (ctx.measureText(test).width > 740) {
          ctx.fillText(t2Line.trim(), W / 2, t2TemaY)
          t2Line = word + ' '
          t2TemaY += 34
        } else {
          t2Line = test
        }
      }
      if (t2Line) {
        ctx.fillText(t2Line.trim(), W / 2, t2TemaY)
      }
      ctx.restore()

      // 10. Bar 3 Kolom (Tanggal, Pukul, Lokasi Masjid Al-Jihad) dengan garis atas & bawah
      const infoTopY = 944
      const infoBotY = 1034
      ctx.strokeStyle = '#0D5530'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(116, infoTopY)
      ctx.lineTo(W - 116, infoTopY)
      ctx.moveTo(116, infoBotY)
      ctx.lineTo(W - 116, infoBotY)
      ctx.stroke()

      const t2DateObj = new Date(`${tanggalPoster}T12:00:00`)
      const t2Weekday = t2DateObj.toLocaleDateString('id-ID', { weekday: 'long' })
      const t2DateStr = t2DateObj.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })

      const drawInfoBadgeIcon = (cx: number, cy: number, kind: 'cal' | 'clock' | 'pin') => {
        ctx.save()
        ctx.fillStyle = '#0D5530'
        ctx.beginPath()
        ctx.arc(cx, cy, 20, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#FFFFFF'
        ctx.fillStyle = '#FFFFFF'
        ctx.lineWidth = 2.2
        if (kind === 'cal') {
          ctx.strokeRect(cx - 8, cy - 7, 16, 15)
          ctx.beginPath()
          ctx.moveTo(cx - 8, cy - 2)
          ctx.lineTo(cx + 8, cy - 2)
          ctx.stroke()
        } else if (kind === 'clock') {
          ctx.beginPath()
          ctx.arc(cx, cy, 9, 0, Math.PI * 2)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(cx, cy - 5)
          ctx.moveTo(cx, cy)
          ctx.lineTo(cx + 4, cy + 2)
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.arc(cx, cy - 3, 5.5, Math.PI, 0)
          ctx.lineTo(cx, cy + 9)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = '#0D5530'
          ctx.beginPath()
          ctx.arc(cx, cy - 3, 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      const colMidY = (infoTopY + infoBotY) / 2
      // Kolom 1: Tanggal
      drawInfoBadgeIcon(156, colMidY, 'cal')
      ctx.textAlign = 'left'
      ctx.fillStyle = '#0D5530'
      ctx.font = '800 20px Poppins, sans-serif'
      ctx.fillText(`${t2Weekday},`, 188, colMidY - 5)
      ctx.fillStyle = '#1E3529'
      ctx.font = '700 19px Poppins, sans-serif'
      ctx.fillText(t2DateStr, 188, colMidY + 19)

      // Kolom 2: Pukul
      drawInfoBadgeIcon(452, colMidY, 'clock')
      ctx.fillStyle = '#0D5530'
      ctx.font = '800 20px Poppins, sans-serif'
      ctx.fillText('Pukul', 484, colMidY - 5)
      ctx.fillStyle = '#1E3529'
      ctx.font = '700 20px Poppins, sans-serif'
      ctx.fillText(waktuOtomatis, 484, colMidY + 19)

      // Kolom 3: Lokasi
      drawInfoBadgeIcon(668, colMidY, 'pin')
      ctx.fillStyle = '#0D5530'
      ctx.font = '800 20px Poppins, sans-serif'
      ctx.fillText('Masjid Al-Jihad', 700, colMidY - 5)
      ctx.fillStyle = '#1E3529'
      ctx.font = '700 18px Poppins, sans-serif'
      ctx.fillText('Islamic Center Karawang', 700, colMidY + 19)

      // 11. Baris Petugas (Imam & Bilal) + Tanggal Hijriah ringkas
      ctx.textAlign = 'center'
      ctx.fillStyle = '#1A5E38'
      ctx.font = '700 19px Poppins, sans-serif'
      const petugasLine =
        jenisPoster === 'Kajian'
          ? hijriOtomatis
          : kategoriKhotib === "Khotib Jum'at"
            ? `${hijriOtomatis}   •   Imam: ${namaImamPoster || '-'}   •   Bilal: ${namaBilalPoster || '-'}`
            : `${hijriOtomatis}   •   Bilal: ${namaBilalPoster || '-'}`
      ctx.fillText(petugasLine, W / 2, 1072)

      // 12. BAR INFORMASI LEBIH LANJUT (NOMOR TELEPON & GMAIL/EMAIL MASJID)
      const t2FooterGrad = ctx.createLinearGradient(96, 1100, W - 96, 1100)
      t2FooterGrad.addColorStop(0, '#1B8F4C')
      t2FooterGrad.addColorStop(1, '#0B4E2B')
      ctx.save()
      ctx.shadowColor = 'rgba(11, 78, 43, 0.2)'
      ctx.shadowBlur = 18
      ctx.shadowOffsetY = 6
      ctx.fillStyle = t2FooterGrad
      drawRoundedRect(96, 1100, W - 192, 112, 56)
      ctx.fill()
      ctx.restore()

      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'left'
      ctx.font = '700 25px Poppins, sans-serif'
      ctx.fillText('Informasi', 152, 1148)
      ctx.fillText('lebih lanjut', 152, 1180)

      ctx.textAlign = 'right'
      ctx.font = '800 26px Poppins, sans-serif'
      ctx.fillText('+62 812-3456-7890', W - 148, 1148)
      ctx.font = '600 23px Poppins, sans-serif'
      ctx.fillText('masjidaljihadkarawang@gmail.com', W - 148, 1180)

      // 13. STRIP BAWAH FULL KANAN-KIRI (IG & WEBSITE MASJID AL-JIHAD) + AKSEN SUDUT HIJAU
      await drawSocialFooterStrip(true)
      return
    }

    // 1. LATAR BELAKANG TEMPLATE 1 (KREM BERSIH)
    const isDarkTheme = false
    const bgGrad = ctx.createLinearGradient(0, 0, W, H)
    bgGrad.addColorStop(0, '#FAFBF7')
    bgGrad.addColorStop(1, '#F1F5EC')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    // 2. SILUET KUBAH MASJID SAMAR DI LATAR KIRI-TENGAH BAWAH
    ctx.save()
    ctx.fillStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.04)' : 'rgba(24, 92, 55, 0.055)'
    ctx.beginPath()
    ctx.arc(520, 940, 220, Math.PI, 0)
    ctx.fill()
    ctx.fillRect(516, 675, 8, 50)
    ctx.fillRect(250, 940, 560, 220)
    ctx.beginPath()
    ctx.arc(270, 980, 95, Math.PI, 0)
    ctx.fill()
    ctx.restore()

    // Pola titik-titik lembut di sudut kanan bawah
    ctx.fillStyle = isDarkTheme ? 'rgba(240, 192, 64, 0.14)' : 'rgba(24, 92, 55, 0.12)'
    for (let px = 830; px < W - 25; px += 22) {
      for (let py = 860; py < 1120; py += 22) {
        ctx.beginPath()
        ctx.arc(px, py, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 3. BINGKAI ORNAMEN BINTANG SEGI DELAPAN (DIGESER KE KANAN SELARAS FOTO KHATIB)
    drawOctagramFrame(
      825,
      125,
      340,
      isDarkTheme ? '#D4AF37' : '#8AB8A0',
      isDarkTheme ? 'rgba(212, 175, 55, 0.25)' : 'rgba(138, 184, 160, 0.35)'
    )
    drawOctagramFrame(
      955,
      615,
      385,
      isDarkTheme ? '#2ECC71' : '#62BD47',
      isDarkTheme ? 'rgba(46, 204, 113, 0.22)' : 'rgba(98, 189, 71, 0.32)'
    )

    // 4. DUA LENTERA EMAS GANTUNG DI KANAN ATAS
    drawGoldenLantern(665, 0, 0.94)
    drawGoldenLantern(975, -8, 1.03)

    // 5. LOGO MASJID AL-JIHAD KARAWANG DI KIRI ATAS
    try {
      const logoImg = new window.Image()
      logoImg.crossOrigin = 'anonymous'
      logoImg.src = isDarkTheme ? logoMasjidPutih.src : logoMasjidWarna.src
      await new Promise((res) => {
        logoImg.onload = res
        logoImg.onerror = res
      })
      if (logoImg.width > 0) {
        const lh = 74
        const lw = (logoImg.width / logoImg.height) * lh
        ctx.drawImage(logoImg, 76, 66, lw, lh)
      }
    } catch {
      ctx.fillStyle = isDarkTheme ? '#FFE066' : '#115732'
      ctx.font = '900 28px Poppins, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('MASJID AL-JIHAD', 76, 100)
      ctx.fillText('KARAWANG', 76, 134)
    }

    // 6. FOTO KHATIB / USTADZ DI SISI KANAN (TAMPILKAN FOTO ORIGINAL DULU SEBELUM AI REMOVE BG SELESAI)
    const photoCenterX = 838
    if (rawKhatibPhoto) {
      try {
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        img.src = aiCutoutPhoto || rawKhatibPhoto
        await new Promise((res) => {
          img.onload = res
          img.onerror = res
        })
        const sw = img.width || 1
        const sh = img.height || 1

        const targetH = 770
        const targetW = (sw / sh) * targetH
        const drawX = photoCenterX - targetW / 2
        const drawY = 1030 - targetH

        ctx.save()
        if (aiCutoutPhoto) {
          // Efek bayangan lembut yang mengikuti bentuk persis hasil crop AI Remove Background
          ctx.shadowColor = 'rgba(7, 28, 16, 0.36)'
          ctx.shadowBlur = 32
          ctx.shadowOffsetX = -16
          ctx.shadowOffsetY = 14
        }
        ctx.drawImage(img, drawX, drawY, targetW, targetH)
        ctx.restore()
      } catch {
        // fallback
      }
    } else {
      ctx.save()
      ctx.fillStyle = isDarkTheme ? 'rgba(255, 224, 102, 0.14)' : 'rgba(17, 87, 50, 0.1)'
      ctx.beginPath()
      ctx.arc(photoCenterX, 470, 92, 0, Math.PI * 2)
      ctx.fill()
      drawRoundedRect(photoCenterX - 165, 580, 330, 415, 140)
      ctx.fill()
      ctx.fillStyle = isDarkTheme ? '#FFE066' : '#115732'
      ctx.font = 'bold 23px Poppins, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Upload Foto Khatib', photoCenterX, 760)
      ctx.font = '19px Poppins, sans-serif'
      ctx.fillText('(AI Remove Background Otomatis)', photoCenterX, 794)
      ctx.restore()
    }

    // 7. BINGKAI PILL HIJAU NAMA KHATIB (DIPERLUAS & DIGESER SELARAS FOTO KANAN + CAPTION KATEGORI KHOTIB)
    const pillX = 555
    const pillY = 928
    const pillW = 480
    const pillH = 114
    const pillCenterX = pillX + pillW / 2

    const namePillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY)
    namePillGrad.addColorStop(0, '#62C446')
    namePillGrad.addColorStop(1, '#138243')
    ctx.save()
    ctx.shadowColor = 'rgba(15, 75, 40, 0.28)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetY = 6
    ctx.fillStyle = namePillGrad
    drawRoundedRect(pillX, pillY, pillW, pillH, 57)
    ctx.fill()
    ctx.restore()

    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    let dynamicNameSize = 30
    ctx.font = `800 ${dynamicNameSize}px Poppins, sans-serif`
    while (ctx.measureText(namaKhatibPoster).width > pillW - 48 && dynamicNameSize > 18) {
      dynamicNameSize -= 1
      ctx.font = `800 ${dynamicNameSize}px Poppins, sans-serif`
    }
    ctx.fillText(namaKhatibPoster, pillCenterX, pillY + 52)

    ctx.fillStyle = '#FFE885'
    ctx.font = '700 22px Poppins, sans-serif'
    ctx.fillText(kategoriKhotib, pillCenterX, pillY + 88)

    // 8. TIPOGRAFI JUDUL BESAR DI SISI KIRI (POSISI LEBIH KE ATAS AGAR TIDAK MEPET WAKTU)
    ctx.textAlign = 'left'
    ctx.fillStyle = isDarkTheme ? '#FFE066' : '#0E5530'
    ctx.font = '900 100px Poppins, sans-serif'

    if (jenisPoster === 'Khutbah Jumat') {
      ctx.fillText('Khutbah', 76, 325)
      ctx.fillText('Jum’at', 76, 430)
    } else {
      ctx.font = '900 108px Poppins, sans-serif'
      ctx.fillText('Kajian', 76, 392)
    }

    // 9. TEMA KHUTBAH / KAJIAN DI BAWAH JUDUL KIRI (DENGAN LABEL "Tema:" SAAT TEMA DIISI MANUAL)
    const effectiveTemaT1 = useDefaultTemaOtomatis
      ? autoTemaText
      : temaPoster.trim()
    if (!useDefaultTemaOtomatis) {
      ctx.fillStyle = isDarkTheme ? '#FFE066' : '#1E5B3A'
      ctx.font = '700 22px Poppins, sans-serif'
      ctx.fillText('Tema :', 76, 486)
    }

    ctx.fillStyle = isDarkTheme ? '#E2F5EA' : '#164E30'
    ctx.font = '700 29px Poppins, sans-serif'
    const temaWords = effectiveTemaT1 ? effectiveTemaT1.split(' ') : []
    let currentLine = ''
    let temaY = useDefaultTemaOtomatis ? 496 : 524
    const maxTemaWidth = 465
    for (const word of temaWords) {
      const testLine = currentLine + word + ' '
      if (ctx.measureText(testLine).width > maxTemaWidth) {
        ctx.fillText(currentLine.trim(), 76, temaY)
        currentLine = word + ' '
        temaY += 38
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) {
      ctx.fillText(currentLine.trim(), 76, temaY)
    }

    // 10. BLOK WAKTU (Waktu / Pukul ... / di Masjid Al-Jihad Islamic Center Karawang 2 baris) & TANGGAL (MASEHI + HIJRIAH)
    const waktuRowY = 665
    ctx.fillStyle = isDarkTheme ? '#A7F3D0' : '#1E5B3A'
    ctx.font = '600 22px Poppins, sans-serif'
    ctx.fillText('Waktu', 76, waktuRowY)

    ctx.fillStyle = isDarkTheme ? '#FFFFFF' : '#0D4E2B'
    ctx.font = '900 30px Poppins, sans-serif'
    ctx.fillText(`PUKUL ${waktuOtomatis}`, 76, waktuRowY + 38)

    ctx.fillStyle = isDarkTheme ? '#FFE066' : '#1C6E42'
    ctx.font = '700 23px Poppins, sans-serif'
    ctx.fillText('Masjid Al-Jihad', 76, waktuRowY + 70)
    ctx.fillText('Islamic Center Karawang', 76, waktuRowY + 98)

    // Baris 2: Pelaksanaan (Masehi & Hijriah)
    const tanggalRowY = 806
    ctx.fillStyle = isDarkTheme ? '#A7F3D0' : '#1E5B3A'
    ctx.font = '600 22px Poppins, sans-serif'
    ctx.fillText('Pelaksanaan', 76, tanggalRowY)

    const dateObj = new Date(`${tanggalPoster}T12:00:00`)
    const dayMonthYearStr = dateObj
      .toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
      .toUpperCase()

    ctx.fillStyle = isDarkTheme ? '#FFFFFF' : '#0D4E2B'
    ctx.font = '900 27px Poppins, sans-serif'
    ctx.fillText(dayMonthYearStr, 76, tanggalRowY + 38)
    ctx.fillStyle = isDarkTheme ? '#FFE066' : '#1C6E42'
    ctx.font = '700 23px Poppins, sans-serif'
    ctx.fillText(hijriOtomatis, 76, tanggalRowY + 72)

    // 11. BINGKAI PETUGAS (DIPERPANJANG KE SAMPING SHAPE NYA & MENYESUAIKAN KATEGORI KHOTIB)
    const petugasY = 924
    const petugasBoxW = 458
    const showImamRow = kategoriKhotib === "Khotib Jum'at"
    const petugasBoxH = showImamRow ? 108 : 74

    ctx.fillStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(19, 130, 67, 0.1)'
    drawRoundedRect(76, showImamRow ? petugasY : petugasY + 18, petugasBoxW, petugasBoxH, 24)
    ctx.fill()
    ctx.strokeStyle = isDarkTheme ? 'rgba(240, 192, 64, 0.4)' : 'rgba(19, 130, 67, 0.28)'
    ctx.lineWidth = 2
    ctx.stroke()

    if (showImamRow) {
      ctx.fillStyle = isDarkTheme ? '#A7F3D0' : '#1E5B3A'
      ctx.font = '700 22px Poppins, sans-serif'
      ctx.fillText('Imam :', 98, petugasY + 40)
      ctx.fillStyle = isDarkTheme ? '#FFFFFF' : '#0D4E2B'
      ctx.font = '800 24px Poppins, sans-serif'
      ctx.fillText(namaImamPoster || '-', 184, petugasY + 40)

      ctx.fillStyle = isDarkTheme ? '#A7F3D0' : '#1E5B3A'
      ctx.font = '700 22px Poppins, sans-serif'
      ctx.fillText('Bilal   :', 98, petugasY + 82)
      ctx.fillStyle = isDarkTheme ? '#FFFFFF' : '#0D4E2B'
      ctx.font = '800 24px Poppins, sans-serif'
      ctx.fillText(namaBilalPoster || '-', 184, petugasY + 82)
    } else {
      ctx.fillStyle = isDarkTheme ? '#A7F3D0' : '#1E5B3A'
      ctx.font = '700 23px Poppins, sans-serif'
      ctx.fillText('Bilal :', 98, petugasY + 62)
      ctx.fillStyle = isDarkTheme ? '#FFFFFF' : '#0D4E2B'
      ctx.font = '800 25px Poppins, sans-serif'
      ctx.fillText(namaBilalPoster || '-', 176, petugasY + 62)
    }

    // 12. BAR INFORMASI LEBIH LANJUT (NOMOR TELEPON & GMAIL/EMAIL MASJID)
    const footerGrad = ctx.createLinearGradient(80, 1095, 1000, 1095)
    footerGrad.addColorStop(0, '#64C547')
    footerGrad.addColorStop(1, '#128041')
    ctx.save()
    ctx.shadowColor = 'rgba(15, 75, 40, 0.22)'
    ctx.shadowBlur = 20
    ctx.shadowOffsetY = 8
    ctx.fillStyle = footerGrad
    drawRoundedRect(76, 1092, W - 152, 124, 62)
    ctx.fill()
    ctx.restore()

    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'left'
    ctx.font = '700 27px Poppins, sans-serif'
    ctx.fillText('Informasi', 136, 1146)
    ctx.fillText('lebih lanjut', 136, 1180)

    ctx.textAlign = 'right'
    ctx.font = '800 28px Poppins, sans-serif'
    ctx.fillText('+62 812-3456-7890', W - 130, 1146)
    ctx.font = '700 25px Poppins, sans-serif'
    ctx.fillText('masjidaljihadkarawang@gmail.com', W - 130, 1180)

    // 13. STRIP SHAPE KOTAK FULL KANAN-KIRI DI PALING BAWAH (IG & WEBSITE MASJID AL-JIHAD)
    await drawSocialFooterStrip(false)
  }, [
    jenisPoster,
    posterTemplate,
    tanggalPoster,
    waktuOtomatis,
    hijriOtomatis,
    rawKhatibPhoto,
    aiCutoutPhoto,
    namaKhatibPoster,
    kategoriKhotib,
    namaImamPoster,
    namaBilalPoster,
    temaPoster,
    useDefaultTemaOtomatis,
    autoTemaText,
  ])

  useEffect(() => {
    renderPosterCanvas()
  }, [renderPosterCanvas])

  // Template teks WhatsApp simple & formal tanpa stiker untuk pengantar lampiran PDF
  const getSuratWaText = () => {
    const sapaan = jenisSurat === 'Khutbah Jumat' ? 'Bapak/Ustadz' : 'Bapak/Ibu/Ustadz'
    return [
      "*Assalamu'alaikum Warahmatullahi Wabarakatuh*",
      '',
      `Yth. *${kepadaSurat || sapaan}*,`,
      `Dengan hormat, bersama pesan ini kami sampaikan surat undangan resmi dari DKM Masjid Raya Al-Jihad Islamic Center Karawang (${perihalSurat || 'Undangan Resmi'}) sebagaimana terlampir.`,
      '',
      `Mohon kesediaan ${sapaan} untuk berkenan memeriksa rincian undangan tersebut. Atas perhatian dan kehadirannya kami ucapkan _Jazakumullahu Khairan Katsiran_.`,
      '',
      "*Wassalamu'alaikum Warahmatullahi Wabarakatuh*",
      '_DKM Masjid Al-Jihad Karawang_',
    ].join('\n')
  }

  // Render kertas surat undangan A4 (1240x1754px) ke Canvas untuk output PDF & Share Foto WA
  const renderSuratCanvas = async (): Promise<HTMLCanvasElement> => {
    const W = 1240
    const H = 1754
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, H)

    const loadImg = (src: string) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const im = new window.Image()
        im.crossOrigin = 'anonymous'
        im.onload = () => resolve(im.width > 0 ? im : null)
        im.onerror = () => resolve(null)
        im.src = src
      })

    const [logoImg, ttdImg] = await Promise.all([
      loadImg(logoMasjidWarna.src),
      loadImg(ttdDkm.src),
    ])

    const marginX = 110
    let y = 95

    // KOP Surat
    if (logoImg) {
      const lw = 125
      const lh = (logoImg.height / logoImg.width) * lw
      ctx.drawImage(logoImg, marginX, y - 6, lw, lh)
    }

    ctx.textAlign = 'center'
    const textCenterX = marginX + 140 + (W - marginX * 2 - 140) / 2
    ctx.fillStyle = '#134E2E'
    ctx.font = 'bold 28px "Times New Roman", serif'
    ctx.fillText('DEWAN KEMAKMURAN MASJID (DKM)', textCenterX, y + 26)

    ctx.fillStyle = '#111827'
    ctx.font = 'bold 31px "Times New Roman", serif'
    ctx.fillText('MASJID AL-JIHAD ISLAMIC CENTRE KARAWANG', textCenterX, y + 64)

    ctx.fillStyle = '#374151'
    ctx.font = '21px "Times New Roman", serif'
    ctx.fillText(
      'Jl. Jenderal Ahmad Yani, Kel. Karangpawitan, Kab. Karawang, Jawa Barat',
      textCenterX,
      y + 96
    )
    ctx.fillText(
      'Telp/Wa : 0851-1155-6563   •   Email: masjidaljihadkarawang@gmail.com',
      textCenterX,
      y + 124
    )

    y += 148
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(marginX, y)
    ctx.lineTo(W - marginX, y)
    ctx.stroke()
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(marginX, y + 6)
    ctx.lineTo(W - marginX, y + 6)
    ctx.stroke()

    y += 56
    ctx.textAlign = 'left'
    ctx.fillStyle = '#111827'

    const drawKv = (label: string, val: string, xStart: number, labelW: number, boldVal = false) => {
      ctx.font = 'bold 25px "Times New Roman", serif'
      ctx.fillText(label, xStart, y)
      ctx.font = `${boldVal ? 'bold ' : ''}25px "Times New Roman", serif`
      const words = String(val || '-').split(' ')
      let line = ''
      const maxW = W - marginX - (xStart + labelW + 20)
      for (const w of words) {
        const test = (line + ' ' + w).trim()
        if (ctx.measureText(test).width > maxW) {
          ctx.fillText(`: ${line}`, xStart + labelW, y)
          y += 34
          line = w
        } else {
          line = test
        }
      }
      ctx.fillText(line === val || !val.includes(' ') ? `: ${line}` : `  ${line}`, xStart + labelW, y)
      y += 38
    }

    drawKv('Nomor', noSurat || '-', marginX, 130)
    drawKv('Lampiran', '-', marginX, 130)
    drawKv('Perihal', perihalSurat || '-', marginX, 130, true)

    y += 28
    ctx.font = '25px "Times New Roman", serif'
    ctx.fillText('Kepada Yth.', marginX, y)
    y += 34
    ctx.font = 'bold 26px "Times New Roman", serif'
    ctx.fillText(kepadaSurat || '-', marginX, y)
    y += 34
    ctx.font = '25px "Times New Roman", serif'
    ctx.fillText('di Tempat', marginX, y)

    y += 52
    ctx.font = 'italic 25px "Times New Roman", serif'
    ctx.fillText("Assalamu'alaikum Warahmatullahi Wabarakatuh,", marginX, y)

    const drawWrapped = (txt: string, font: string, lineH = 36) => {
      ctx.font = font
      const maxW = W - marginX * 2
      const words = txt.split(' ')
      let line = ''
      for (const w of words) {
        const test = (line + ' ' + w).trim()
        if (ctx.measureText(test).width > maxW) {
          ctx.fillText(line, marginX, y)
          y += lineH
          line = w
        } else {
          line = test
        }
      }
      if (line) {
        ctx.fillText(line, marginX, y)
        y += lineH
      }
    }

    const roleText =
      perihalKhutbahOpsi === 'Khotib & Imam'
        ? 'Khotib & Imam'
        : perihalKhutbahOpsi === 'Khotib Jumat'
          ? 'Khotib'
          : perihalKhutbahOpsi === 'Imam Jumat'
            ? 'Imam'
            : perihalKhutbahOpsi === 'Bilal'
              ? 'Bilal'
              : 'Petugas Ibadah Jumat'

    const pembuka =
      jenisSurat === 'Khutbah Jumat'
        ? `Sehubungan dengan pelaksanaan kegiatan ibadah Jumat di Masjid Raya Al-Jihad Karawang, kami memohon kesediaan Bapak/Ustadz untuk menjadi ${roleText} pada:`
        : 'Sehubungan dengan pelaksanaan kegiatan di Masjid Raya Al-Jihad Karawang, bersama surat ini kami memohon kesediaan Bapak/Ibu/Ustadz untuk hadir pada:'

    y += 42
    drawWrapped(pembuka, '25px "Times New Roman", serif')

    y += 18
    const tglFmt = tanggalSuratAcara
      ? new Date(`${tanggalSuratAcara}T12:00:00`).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '-'

    drawKv('Hari / Tanggal', tglFmt, marginX + 46, 185)
    drawKv(jenisSurat === 'Khutbah Jumat' ? 'Waktu Jumat' : 'Waktu', waktuSuratAcara || '-', marginX + 46, 185)
    drawKv('Tempat', tempatSuratAcara || '-', marginX + 46, 185)
    drawKv('Agenda', agendaSurat || '-', marginX + 46, 185)

    y += 22
    drawWrapped(
      'Demikian surat permohonan ini kami sampaikan. Atas perhatian dan kehadiran Bapak/Ustadz, kami ucapkan Jazakumullahu Khairan Katsiran.',
      '25px "Times New Roman", serif'
    )
    y += 14
    ctx.font = 'italic 25px "Times New Roman", serif'
    ctx.fillText("Wassalamu'alaikum Warahmatullahi Wabarakatuh.", marginX, y)

    // Blok Tanda Tangan + TTD transparan menimpa nama
    y += 72
    const signCenterX = W - marginX - 185
    ctx.textAlign = 'center'
    ctx.font = '25px "Times New Roman", serif'
    const tglNow = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    ctx.fillText(`Karawang, ${tglNow}`, signCenterX, y)
    y += 34
    ctx.font = 'bold 25px "Times New Roman", serif'
    ctx.fillText('Ketua DKM Masjid Al-Jihad Karawang', signCenterX, y)

    const nameY = y + 148
    if (ttdImg) {
      const tw = 290
      const th = (ttdImg.height / ttdImg.width) * tw
      ctx.drawImage(ttdImg, signCenterX - tw / 2, y + 6, tw, th)
    }
    const nameStr = 'Drs. H. Acep Kusnadi, M.Pd., C.Med.'
    ctx.font = 'bold 25px "Times New Roman", serif'
    ctx.fillText(nameStr, signCenterX, nameY)
    const nameW = ctx.measureText(nameStr).width
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(signCenterX - nameW / 2, nameY + 4)
    ctx.lineTo(signCenterX + nameW / 2, nameY + 4)
    ctx.stroke()

    return canvas
  }

  const buildSuratImageBlob = async (): Promise<Blob> => {
    const canvas = await renderSuratCanvas()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    )
    if (blob) return blob
    const dataUrl = canvas.toDataURL('image/png')
    const bin = atob(dataUrl.split(',')[1])
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new Blob([bytes], { type: 'image/png' })
  }

  const buildSuratPdfBlob = async (): Promise<Blob> => {
    const canvas = await renderSuratCanvas()
    const W = canvas.width
    const H = canvas.height

    // Encode Canvas JPEG ke dokumen PDF A4 valid (595 x 842 pt)
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.94)
    const b64 = jpegDataUrl.split(',')[1]
    const binStr = atob(b64)
    const imgBytes = new Uint8Array(binStr.length)
    for (let i = 0; i < binStr.length; i++) {
      imgBytes[i] = binStr.charCodeAt(i)
    }

    const enc = new TextEncoder()
    const chunks: Uint8Array[] = []
    const offsets: number[] = [0]
    let pos = 0
    const pushStr = (s: string) => {
      const b = enc.encode(s)
      chunks.push(b)
      pos += b.length
    }
    const pushBytes = (b: Uint8Array) => {
      chunks.push(b)
      pos += b.length
    }

    pushStr('%PDF-1.4\n')
    const startObj = (id: number) => {
      offsets[id] = pos
      pushStr(`${id} 0 obj\n`)
    }

    startObj(1)
    pushStr('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')

    startObj(2)
    pushStr('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')

    startObj(3)
    pushStr(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n'
    )

    startObj(4)
    pushStr(
      `<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`
    )
    pushBytes(imgBytes)
    pushStr('\nendstream\nendobj\n')

    const contentStream = 'q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ\n'
    startObj(5)
    pushStr(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`)

    const xrefPos = pos
    pushStr(`xref\n0 6\n0000000000 65535 f \n`)
    for (let id = 1; id <= 5; id++) {
      pushStr(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`)
    }
    pushStr(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`)

    return new Blob(chunks as BlobPart[], { type: 'application/pdf' })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (isRevokedMaintenanceAccount(email)) {
      setErrorMsg(
        'Akses ditolak: Akun maintenance (Al-Azhar) sudah dinonaktifkan dan tidak memiliki akses ke Portal Admin Masjid Al-Jihad.'
      )
      return
    }

    const cfg = getActiveSupabaseConfig()
    if (!cfg.isConfigured) {
      setErrorMsg('Konfigurasi Supabase belum aktif.')
      return
    }

    setAuthLoading(true)
    const sb = getSupabaseClient()
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    setAuthLoading(false)
    if (error) {
      setErrorMsg(`Login gagal: ${error.message}`)
    } else if (data.user) {
      if (isRevokedMaintenanceAccount(data.user.email)) {
        await sb.auth.signOut()
        setErrorMsg(
          'Akses ditolak: Akun maintenance (Al-Azhar) sudah dinonaktifkan.'
        )
        return
      }
      setUser(data.user)
      setSuccessMsg('Berhasil masuk melalui Supabase Authentication!')
    }
  }

  // Simpan Koneksi Supabase Langsung dari Menu Sidebar 9
  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    saveRuntimeSupabaseConfig(sbUrlInput, sbKeyInput)
    setSbConfigured(true)
    setSuccessMsg('Koneksi Supabase berhasil disimpan & diaktifkan! Menarik data dari Supabase...')
    await syncAllData()
  }

  // Push seluruh data lokal saat ini ke tabel-tabel Supabase
  const handlePushAllToSupabase = async () => {
    const cfg = getActiveSupabaseConfig()
    if (!cfg.isConfigured) {
      setActiveTab('kegiatan_custom')
      setErrorMsg('Konfigurasi Supabase belum aktif.')
      return
    }

    setSyncingCloud(true)
    setErrorMsg('')
    setSuccessMsg('')
    const sb = getSupabaseClient()
    try {
      for (const b of beritaList) {
        await sb.from('berita').upsert({
          judul: b.judul,
          slug: b.slug,
          ringkasan: b.ringkasan,
          konten: b.konten,
          thumbnail_url: b.thumbnail_url,
          kategori: b.kategori,
          published: true,
        })
      }
      for (const k of kegiatanList) {
        await sb.from('program').insert({
          nama: k.nama,
          deskripsi: k.deskripsi,
          kategori: k.kategori,
          ikon: k.ikon,
          jadwal: k.jadwal,
          badge_custom: k.badgeCustom,
          warna_custom: k.warnaCustom,
          tampil_beranda: k.tampilDiBeranda,
          aktif: true,
        })
      }
      setSuccessMsg('Alhamdulillah! Seluruh data berhasil disinkronkan ke database Supabase Cloud.')
      await syncAllData()
    } catch {
      setErrorMsg('Pastikan Anda sudah menjalankan file supabase-schema.sql di SQL Editor Supabase.')
    } finally {
      setSyncingCloud(false)
    }
  }

  // 1A. Buat Master Kegiatan Manual (+ Simpan ke Supabase)
  const handleCreateMasterKegiatan = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    const newItem: KegiatanUnggulanItem = {
      id: 'keg-' + Date.now(),
      nama: namaKegiatanBaru,
      kategori: kategoriKegiatanBaru,
      jadwal: jadwalKegiatanBaru,
      deskripsi: deskripsiKegiatanBaru,
      ikon: '🕌',
      lokasi: 'Masjid Al-Jihad Karawang',
      badgeCustom: 'Terdaftar Manual',
      warnaCustom: '#1B6B45',
      tampilDiBeranda: true,
      aktif: true,
    }
    const updated = [newItem, ...kegiatanList]
    setKegiatanList(updated)
    masjidStore.saveKegiatan(updated)
    setSelectedMasterId(newItem.id)

    if (getActiveSupabaseConfig().isConfigured) {
      const sb = getSupabaseClient()
      await sb.from('program').insert({
        nama: newItem.nama,
        kategori: newItem.kategori,
        jadwal: newItem.jadwal,
        deskripsi: newItem.deskripsi,
        ikon: newItem.ikon,
        badge_custom: newItem.badgeCustom,
        warna_custom: newItem.warnaCustom,
        tampil_beranda: true,
        aktif: true,
      })
    }

    setNamaKegiatanBaru('')
    setDeskripsiKegiatanBaru('')
    setSuccessMsg(
      'Master Kegiatan baru berhasil dibuat & tersimpan! Silakan custom tampilannya di panel sebelah kanan.'
    )
  }

  // 1B. Custom Kegiatan (+ Update ke Supabase)
  const handleSaveCustomKegiatan = async (e: React.FormEvent) => {
    e.preventDefault()
    const updated = kegiatanList.map((item) =>
      item.id === selectedMasterId
        ? {
          ...item,
          ikon: customIkon,
          badgeCustom: customBadge,
          warnaCustom: customWarna,
          jadwal: customJadwal,
          deskripsi: customDeskripsi,
          tampilDiBeranda: customTampil,
        }
        : item
    )
    setKegiatanList(updated)
    masjidStore.saveKegiatan(updated)

    if (getActiveSupabaseConfig().isConfigured) {
      const sb = getSupabaseClient()
      await sb
        .from('program')
        .update({
          ikon: customIkon,
          badge_custom: customBadge,
          warna_custom: customWarna,
          jadwal: customJadwal,
          deskripsi: customDeskripsi,
          tampil_beranda: customTampil,
        })
        .eq('id', selectedMasterId)
    }

    setSuccessMsg('Kustomisasi Layanan & Kegiatan Unggulan berhasil disimpan!')
  }

  // 2. Kalender Anti-Bentrok (+ Simpan ke Supabase)
  const liveConflicts = findScheduleConflicts(
    {
      judul: judulKal || 'Acara Baru',
      pemateri: pemateriKal,
      tanggal: tanggalKal,
      jamMulai: jamMulaiKal,
      jamSelesai: jamSelesaiKal,
      ruangan: ruanganKal,
      kategori: kategoriKal,
      keterangan: '',
    },
    kalenderList
  )

  const executeAddKalender = async () => {
    const picName = internalMasjidKal ? 'DKM Masjid Al-Jihad' : pemateriKal.trim() || 'DKM Masjid Al-Jihad'
    const newAgenda: AgendaKalenderItem = {
      id: 'kal-' + Date.now(),
      judul: judulKal,
      pemateri: picName,
      tanggal: tanggalKal,
      jamMulai: jamMulaiKal,
      jamSelesai: jamSelesaiKal,
      ruangan: ruanganKal,
      kategori: kategoriKal,
      keterangan: internalMasjidKal ? 'DKM Masjid Al-Jihad' : asetKal ? `Aset: ${asetKal}` : '',
      peminjamanAset: asetKal.trim() || '-',
      noTeleponPj: internalMasjidKal ? '' : noTelpKal.trim(),
      internalMasjid: internalMasjidKal,
    }
    const updated = [...kalenderList, newAgenda]
    setKalenderList(updated)
    masjidStore.saveKalender(updated)

    if (getActiveSupabaseConfig().isConfigured) {
      const sb = getSupabaseClient()
      await sb.from('jadwal_terdekat').insert({
        nama_acara: newAgenda.judul,
        pemateri: newAgenda.pemateri,
        tanggal: newAgenda.tanggal,
        jam_mulai: newAgenda.jamMulai,
        jam_selesai: newAgenda.jamSelesai,
        waktu: `${newAgenda.jamMulai} - ${newAgenda.jamSelesai} WIB`,
        lokasi: newAgenda.ruangan,
        kategori: newAgenda.kategori,
        keterangan: newAgenda.keterangan,
        peminjaman_aset: newAgenda.peminjamanAset || '',
        aktif: true,
      })
    }

    setJudulKal('')
    setPemateriKal('')
    setNoTelpKal('')
    setAsetKal('')
    setInternalMasjidKal(false)
    setSuccessMsg('Jadwal baru aman (tidak bentrok) dan berhasil disimpan!')
  }

  const executeReviewPengajuan = async (
    item: PengajuanKalenderItem,
    decision: 'Disetujui' | 'Ditolak'
  ) => {
    const updatedPgj = pengajuanKalenderList.map((p) =>
      p.id === item.id ? { ...p, status: decision } : p
    )
    setPengajuanKalenderList(updatedPgj)
    masjidStore.savePengajuanKalender(updatedPgj)

    if (getActiveSupabaseConfig().isConfigured) {
      try {
        await getSupabaseClient()
          .from('pengajuan_kalender')
          .update({ status: decision })
          .eq('id', item.id)
      } catch {
        // ignore
      }
    }

    if (decision === 'Disetujui') {
      const newAgenda: AgendaKalenderItem = {
        id: 'kal-' + Date.now(),
        judul: item.namaKegiatan,
        pemateri: item.penanggungJawab,
        tanggal: item.tanggal,
        jamMulai: item.jamMulai,
        jamSelesai: item.jamSelesai,
        ruangan: item.tempatKegiatan,
        kategori: 'Sosial',
        keterangan: item.deskripsi || item.catatan || '',
        peminjamanAset: item.peminjamanAset,
        noTeleponPj: item.noTeleponPj,
        posterUrl: item.posterUrl,
      }
      const updatedKal = [...kalenderList, newAgenda]
      setKalenderList(updatedKal)
      masjidStore.saveKalender(updatedKal)

      if (getActiveSupabaseConfig().isConfigured) {
        const sb = getSupabaseClient()
        await sb.from('jadwal_terdekat').insert({
          nama_acara: newAgenda.judul,
          pemateri: newAgenda.pemateri,
          tanggal: newAgenda.tanggal,
          jam_mulai: newAgenda.jamMulai,
          jam_selesai: newAgenda.jamSelesai,
          waktu: `${newAgenda.jamMulai} - ${newAgenda.jamSelesai} WIB`,
          lokasi: newAgenda.ruangan,
          kategori: newAgenda.kategori,
          keterangan: newAgenda.keterangan,
          peminjaman_aset: newAgenda.peminjamanAset || '',
          poster_url: newAgenda.posterUrl || '',
          aktif: true,
        })
      }
      setSuccessMsg(`Pengajuan "${item.namaKegiatan}" telah disetujui dan masuk ke Kalender Masjid!`)
    } else {
      setSuccessMsg(`Pengajuan "${item.namaKegiatan}" ditandai Ditolak.`)
    }

    setWaReportModal({ item: { ...item, status: decision }, decision })
  }

  const handleAddKalender = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    if (liveConflicts.length > 0) {
      setErrorMsg(
        `Tidak dapat menyimpan karena BENTROK JADWAL dengan acara "${liveConflicts[0].judul}" (${liveConflicts[0].jamMulai}–${liveConflicts[0].jamSelesai} WIB)!`
      )
      return
    }
    setPendingAdminAction({ type: 'add_kalender' })
    setAdminAuthPassword('')
    setShowAdminAuthPassword(false)
    setAdminAuthError('')
    setAdminAuthModalOpen(true)
  }

  const handleConfirmAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (adminAuthPassword !== 'aljihad2026') {
      setAdminAuthError('Password salah! Silakan periksa kembali password konfirmasi Admin DKM.')
      return
    }
    setAdminAuthModalOpen(false)
    setAdminAuthError('')
    setAdminAuthPassword('')
    const action = pendingAdminAction
    setPendingAdminAction(null)
    if (!action) return
    if (action.type === 'add_kalender') {
      await executeAddKalender()
    } else if (action.type === 'review_pengajuan') {
      await executeReviewPengajuan(action.item, action.decision)
    }
  }

  const buildWaChatbotReportUrl = (
    item: PengajuanKalenderItem,
    decision: 'Disetujui' | 'Ditolak'
  ) => {
    let digits = (item.noTeleponPj || '').replace(/\D/g, '')
    if (digits.startsWith('0')) {
      digits = '62' + digits.slice(1)
    } else if (!digits.startsWith('62') && digits.length > 0) {
      digits = '62' + digits
    }

    const statusLabel = decision === 'Disetujui' ? 'DITERIMA / DISETUJUI' : 'DITOLAK'
    const reportLines = [
      "*LAPORAN RESMI ADMIN DKM MASJID AL-JIHAD KARAWANG*",
      `_(Layanan Otomatis Admin DKM: 0851-1155-6563)_`,
      '',
      "Assalamu'alaikum Warahmatullahi Wabarakatuh,",
      `Yth. *${item.penanggungJawab}*,`,
      '',
      `Berikut kami sampaikan hasil peninjauan pengajuan jadwal kegiatan Anda di Masjid Raya Al-Jihad Karawang:`,
      `Status Pengajuan : *${statusLabel}*`,
      '',
      '*Rincian Data Pengajuan Acara:*',
      `- Nama Kegiatan : ${item.namaKegiatan}`,
      `- Penanggung Jawab : ${item.penanggungJawab}`,
      `- No. Telepon PJ : ${item.noTeleponPj}`,
      `- Tanggal : ${item.tanggal}`,
      `- Waktu : ${item.jamMulai} - ${item.jamSelesai} WIB`,
      `- Tempat : ${item.tempatKegiatan}`,
      `- Peminjaman Aset : ${item.peminjamanAset || '-'}`,
      ...(item.deskripsi ? [`- Deskripsi : ${item.deskripsi}`] : []),
      ...(item.catatan ? [`- Catatan : ${item.catatan}`] : []),
      '',
      decision === 'Disetujui'
        ? 'Jadwal kegiatan Anda telah resmi tercatat pada Kalender Masjid Al-Jihad Karawang. Silakan berkoordinasi lebih lanjut dengan Admin DKM (0851-1155-6563).'
        : 'Mohon maaf, pengajuan jadwal tersebut belum dapat kami setujui saat ini. Silakan hubungi Admin DKM (0851-1155-6563) untuk penjadwalan ulang atau informasi lebih lanjut.',
      '',
      "Wassalamu'alaikum Warahmatullahi Wabarakatuh.",
      '_Admin DKM Masjid Al-Jihad Karawang (0851-1155-6563)_',
    ].join('\n')

    return `https://wa.me/${digits}?text=${encodeURIComponent(reportLines)}`
  }

  // 3. Tambah Berita (+ Simpan ke Supabase)
  const handleAddBerita = async (e: React.FormEvent) => {
    e.preventDefault()
    const slug =
      judulBerita
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString().slice(-4)

    const newB: BeritaItem = {
      id: 'b-' + Date.now(),
      judul: judulBerita.toUpperCase(),
      slug,
      kategori: kategoriBerita.toUpperCase(),
      thumbnail_url: thumbBerita,
      ringkasan: ringkasanBerita,
      konten: kontenBerita,
      created_at: new Date().toISOString(),
      published: true,
    }
    const updated = [newB, ...beritaList]
    setBeritaList(updated)
    masjidStore.saveBerita(updated)

    if (getActiveSupabaseConfig().isConfigured) {
      const sb = getSupabaseClient()
      await sb.from('berita').insert({
        judul: newB.judul,
        slug: newB.slug,
        kategori: newB.kategori,
        thumbnail_url: newB.thumbnail_url,
        ringkasan: newB.ringkasan,
        konten: newB.konten,
        published: true,
      })
    }

    setJudulBerita('')
    setRingkasanBerita('')
    setKontenBerita('')
    setSuccessMsg('Berita baru berhasil diterbitkan & disimpan ke Supabase!')
  }

  // 4. Tambah Video Kegiatan (+ Simpan ke Supabase)
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    const newV: VideoKegiatanItem = {
      id: 'vid-' + Date.now(),
      judul: judulVideo,
      kategori: kategoriVideo,
      durasi: durasiVideo,
      url_video: urlVideo,
      thumbnail_url: thumbVideo,
      urutan: videoList.length + 1,
      aktif: true,
    }
    const updated = [newV, ...videoList]
    setVideoList(updated)
    masjidStore.saveVideo(updated)

    if (getActiveSupabaseConfig().isConfigured) {
      const sb = getSupabaseClient()
      await sb.from('reels').insert({
        judul: newV.judul,
        kategori: newV.kategori,
        durasi: newV.durasi,
        url_video: newV.url_video,
        thumbnail_url: newV.thumbnail_url,
        urutan: newV.urutan,
        aktif: true,
      })
    }

    setJudulVideo('')
    setUrlVideo('')
    setSuccessMsg('Video Kegiatan Masjid berhasil disimpan!')
  }

  // 5. Update Status Kritik & Saran (+ Update ke Supabase)
  const handleUpdateKritikStatus = async (id: string, status: KritikSaranItem['status']) => {
    const updated = kritikList.map((k) => (k.id === id ? { ...k, status } : k))
    setKritikList(updated)
    masjidStore.saveKritik(updated)
    if (getActiveSupabaseConfig().isConfigured) {
      const sb = getSupabaseClient()
      await sb.from('kritik_saran').update({ status }).eq('id', id)
    }
  }

  const handleDownloadPoster = () => {
    if (!posterCanvasRef.current) return
    const link = document.createElement('a')
    link.download = `Poster-${jenisPoster.replace(/\s+/g, '-')}-${tanggalPoster}.png`
    link.href = posterCanvasRef.current.toDataURL('image/png')
    link.click()
  }

  const selectMenu = (tab: AdminTab) => {
    setActiveTab(tab)
    setSidebarOpen(false)
    setErrorMsg('')
    setSuccessMsg('')
  }

  return (
    <div className={styles.adminPage}>
      {/* TAMPILAN LOGIN ADMIN (SAAT BELUM LOGIN) */}
      <div className={styles.loginCenterWrap} style={{ display: user ? 'none' : 'flex' }}>
        <div className={styles.loginCard}>
          <div className={styles.badgeRow}>
            <span className={styles.secretBadge}>Portal Admin DKM Al-Jihad</span>
          </div>

          <h1 className={styles.loginTitle}>Login Admin DKM Al-Jihad</h1>
          <p className={styles.loginDesc}>
            Masuk untuk mengakses Sidebar Pengelolaan Masjid Al-Jihad Karawang (Kegiatan, Kalender
            Anti-Bentrok, Berita, Video, Kritik Saran, Poster Khatib, &amp; Surat Undangan).
          </p>

          <div
            className={styles.errorBox}
            style={{ display: errorMsg ? 'block' : 'none', marginBottom: '16px' }}
          >
            {errorMsg}
          </div>

          <form onSubmit={handleLogin}>
            <div className={styles.formGroup}>
              <label>Email Admin</label>
              <input
                type="email"
                required
                placeholder="admin@masjidaljihad.or.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', paddingRight: '44px' }}
                />
                <button
                  type="button"
                  aria-label={showLoginPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#1b6b45',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px',
                  }}
                >
                  {showLoginPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" className={styles.submitBtn} disabled={authLoading}>
              {authLoading ? 'Memverifikasi...' : 'Masuk ke Sidebar Admin →'}
            </button>
          </form>

          <Link href="/" className={styles.backHomeLink}>
            ← Kembali ke Halaman Utama Website
          </Link>
        </div>
      </div>

      {/* TAMPILAN SIDEBAR DASHBOARD ADMIN (SAAT SUDAH LOGIN) */}
      <div className={styles.adminShell} style={{ display: user ? 'grid' : 'none' }}>
        {/* Overlay Sidebar untuk Layar HP */}
        <div
          className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.sidebarOverlayOpen : ''
            }`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* SIDEBAR KIRI */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <div>
            <div className={styles.sidebarBrand}>
              <Image
                src={logoMasjidWarna}
                alt="Logo Masjid Al-Jihad"
                className={styles.sidebarLogoImg}
              />
              <span className={styles.sidebarSub}>PANEL ADMIN DKM AL-JIHAD</span>
            </div>

            <nav className={styles.sidebarNav}>
              <span className={styles.navGroupLabel}>Manajemen Konten &amp; Jadwal</span>

              <button
                type="button"
                className={`${styles.sidebarBtn} ${activeTab === 'kegiatan_custom' ? styles.sidebarBtnActive : ''
                  }`}
                onClick={() => selectMenu('kegiatan_custom')}
              >
                <span>Master &amp; Custom Kegiatan</span>
              </button>

              <button
                type="button"
                className={`${styles.sidebarBtn} ${activeTab === 'berita' ? styles.sidebarBtnActive : ''
                  }`}
                onClick={() => selectMenu('berita')}
              >
                <span>Kelola Berita Masjid</span>
              </button>

              <button
                type="button"
                className={`${styles.sidebarBtn} ${activeTab === 'video' ? styles.sidebarBtnActive : ''
                  }`}
                onClick={() => selectMenu('video')}
              >
                <span>Video Kegiatan</span>
              </button>

              <button
                type="button"
                className={`${styles.sidebarBtn} ${activeTab === 'kritik_saran' ? styles.sidebarBtnActive : ''
                  }`}
                onClick={() => selectMenu('kritik_saran')}
              >
                <span>Kritik &amp; Saran Jamaah</span>
              </button>

              <span className={styles.navGroupLabel}>PENGELOLAAN ADMINISTRASI</span>

              <button
                type="button"
                className={`${styles.sidebarBtn} ${activeTab === 'kalender' ? styles.sidebarBtnActive : ''
                  }`}
                onClick={() => selectMenu('kalender')}
              >
                <span>Kalender Anti-Bentrok</span>
              </button>

              <button
                type="button"
                className={`${styles.sidebarBtn} ${activeTab === 'poster_khatib' ? styles.sidebarBtnActive : ''
                  }`}
                onClick={() => selectMenu('poster_khatib')}
              >
                <span>Studio Poster Al-Jihad</span>
              </button>

              <button
                type="button"
                className={`${styles.sidebarBtn} ${activeTab === 'surat_undangan' ? styles.sidebarBtnActive : ''
                  }`}
                onClick={() => selectMenu('surat_undangan')}
              >
                <span>Surat Undangan DKM</span>
              </button>

              <button
                type="button"
                className={`${styles.sidebarBtn} ${activeTab === 'kitab_eljihad' ? styles.sidebarBtnActive : ''
                  }`}
                onClick={() => selectMenu('kitab_eljihad')}
              >
                <span>Upload Kitab El Jihad</span>
              </button>
            </nav>
          </div>

          <div className={styles.sidebarFooter}>
            <div className={styles.adminUserBox}>
              Admin: <strong>{user?.email}</strong>
            </div>
            <button
              type="button"
              className={styles.logoutBtn}
              onClick={async () => {
                if (getActiveSupabaseConfig().isConfigured) {
                  await getSupabaseClient().auth.signOut()
                }
                setUser(null)
              }}
            >
              Keluar (Logout)
            </button>
          </div>
        </aside>

        {/* AREA KONTEN UTAMA KANAN */}
        <div className={styles.mainContent}>
          <header className={styles.topBar}>
            <div className={styles.topBarLeft}>
              <button
                type="button"
                className={styles.mobileMenuToggle}
                onClick={() => setSidebarOpen(true)}
              >
                ☰ Menu Admin
              </button>
              <h1 className={styles.topBarTitle}>{MENU_LABELS[activeTab]}</h1>
            </div>

            <div className={styles.topBarRight}>
              <Link href="/" className={styles.viewWebLink}>
                Lihat Beranda Web →
              </Link>
            </div>
          </header>

          <div className={styles.contentBody}>
            <div className={styles.errorBox} style={{ display: errorMsg ? 'block' : 'none' }}>
              {errorMsg}
            </div>
            <div className={styles.successBox} style={{ display: successMsg ? 'block' : 'none' }}>
              {successMsg}
            </div>

            {/* MENU 1: MASTER & CUSTOM KEGIATAN */}
            <div
              className={styles.dashGrid}
              style={{ display: activeTab === 'kegiatan_custom' ? 'grid' : 'none' }}
            >
              <div className={styles.panelCard}>
                <h2 className={styles.panelTitle}>Langkah 1: Buat Manual Master Kegiatan</h2>
                <p className={styles.panelSub}>
                  Daftarkan kegiatan baru secara manual terlebih dahulu sebelum dikustomisasi pada
                  tampilan Layanan Unggulan.
                </p>
                <form onSubmit={handleCreateMasterKegiatan}>
                  <div className={styles.formGroup}>
                    <label>Nama Master Kegiatan</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kajian Kitab Kuning / Santunan Ahad Pagi"
                      value={namaKegiatanBaru}
                      onChange={(e) => setNamaKegiatanBaru(e.target.value)}
                    />
                  </div>
                  <div className={styles.twoCols}>
                    <div className={styles.formGroup}>
                      <label>Bidang / Kategori</label>
                      <select
                        value={kategoriKegiatanBaru}
                        onChange={(e) => setKategoriKegiatanBaru(e.target.value)}
                      >
                        <option value="Ibadah">Ibadah</option>
                        <option value="Pendidikan">Pendidikan</option>
                        <option value="Sosial">Sosial</option>
                        <option value="Ekonomi">Ekonomi</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Jadwal Pelaksanaan</label>
                      <input
                        type="text"
                        required
                        value={jadwalKegiatanBaru}
                        onChange={(e) => setJadwalKegiatanBaru(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Deskripsi Dasar Kegiatan</label>
                    <textarea
                      rows={3}
                      required
                      value={deskripsiKegiatanBaru}
                      onChange={(e) => setDeskripsiKegiatanBaru(e.target.value)}
                      placeholder="Tuliskan deskripsi kegiatan..."
                    />
                  </div>
                  <button type="submit" className={styles.submitBtn}>
                    + Buat Master Kegiatan Manual
                  </button>
                </form>
              </div>

              <div className={styles.panelCard}>
                <h2 className={styles.panelTitle}>
                  Langkah 2: Custom Tampilan Kegiatan &amp; Layanan Unggulan
                </h2>
                <p className={styles.panelSub}>
                  Pilih kegiatan dari Master Kegiatan yang sudah dibuat, lalu kustomisasi ikon,
                  warna kartu, status badge, dan jadwalnya.
                </p>
                <form onSubmit={handleSaveCustomKegiatan}>
                  <div className={styles.formGroup}>
                    <label>Pilih Kegiatan dari Daftar Master</label>
                    <select
                      value={selectedMasterId}
                      onChange={(e) => {
                        const id = e.target.value
                        setSelectedMasterId(id)
                        const found = kegiatanList.find((k) => k.id === id)
                        if (found) {
                          setCustomIkon(found.ikon)
                          setCustomBadge(found.badgeCustom)
                          setCustomWarna(found.warnaCustom)
                          setCustomJadwal(found.jadwal)
                          setCustomDeskripsi(found.deskripsi)
                          setCustomTampil(found.tampilDiBeranda)
                        }
                      }}
                    >
                      {kegiatanList.map((k) => (
                        <option key={k.id} value={k.id}>
                          {`${k.nama} (${k.kategori})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.twoCols}>
                    <div className={styles.formGroup}>
                      <label>Custom Ikon Kartu</label>
                      <select value={customIkon} onChange={(e) => setCustomIkon(e.target.value)}>
                        <option value="🕌">🕌 Masjid / Ibadah</option>
                        <option value="📖">📖 Al-Quran / Kajian</option>
                        <option value="🎓">🎓 Pendidikan / Santri</option>
                        <option value="🤝">🤝 Sosial / Santunan</option>
                        <option value="💚">💚 Zakat / Infaq</option>
                        <option value="⚖️">⚖️ Konsultasi Syariah</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Custom Warna Tema Kartu</label>
                      <select
                        value={customWarna}
                        onChange={(e) => setCustomWarna(e.target.value)}
                      >
                        <option value="#1B6B45">Hijau Zamrud Al-Jihad</option>
                        <option value="#0D9488">Toska Islami</option>
                        <option value="#D97706">Emas / Amber</option>
                        <option value="#2563EB">Biru Edukasi</option>
                        <option value="#7C3AED">Ungu Kemuliaan</option>
                        <option value="#DC2626">Merah Peduli Sosial</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.twoCols}>
                    <div className={styles.formGroup}>
                      <label>Custom Label Status Badge</label>
                      <input
                        type="text"
                        value={customBadge}
                        onChange={(e) => setCustomBadge(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Custom Jadwal Tampil</label>
                      <input
                        type="text"
                        value={customJadwal}
                        onChange={(e) => setCustomJadwal(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Custom Deskripsi Unggulan</label>
                    <textarea
                      rows={2}
                      value={customDeskripsi}
                      onChange={(e) => setCustomDeskripsi(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>
                      <input
                        type="checkbox"
                        checked={customTampil}
                        onChange={(e) => setCustomTampil(e.target.checked)}
                        style={{ width: 'auto', marginRight: '8px' }}
                      />
                      Tampilkan di Baris Layanan Unggulan Halaman Utama
                    </label>
                  </div>

                  <button type="submit" className={styles.submitBtn}>
                    Simpan Custom Kegiatan Unggulan
                  </button>
                </form>
              </div>
            </div>

            {/* MENU 2: KALENDER ANTI-BENTROK */}
            <div
              className={styles.dashGrid}
              style={{ display: activeTab === 'kalender' ? 'grid' : 'none' }}
            >
              <div className={styles.panelCard}>
                <h2 className={styles.panelTitle}>Input Jadwal Kalender (Deteksi Anti-Bentrok)</h2>
                <p className={styles.panelSub}>
                  Sistem otomatis memeriksa apakah tanggal dan jam yang dipilih beririsan dengan
                  acara lain di Masjid Al-Jihad.
                </p>

                <div
                  className={styles.errorBox}
                  style={{
                    display: liveConflicts.length > 0 ? 'block' : 'none',
                    marginBottom: '14px',
                  }}
                >
                  {liveConflicts[0]
                    ? `⚠️ INDIKATOR BENTROK JADWAL: Waktu ${jamMulaiKal}–${jamSelesaiKal} pada tanggal ${tanggalKal} berbenturan dengan acara "${liveConflicts[0].judul}" (${liveConflicts[0].jamMulai}–${liveConflicts[0].jamSelesai} WIB di ${liveConflicts[0].ruangan})!`
                    : ''}
                </div>

                <div
                  className={styles.successBox}
                  style={{
                    display: liveConflicts.length === 0 ? 'block' : 'none',
                    marginBottom: '14px',
                  }}
                >
                  ✓ Slot waktu tanggal {tanggalKal} pukul {jamMulaiKal}–{jamSelesaiKal} WIB tersedia
                  (Tidak ada jadwal yang bentrok).
                </div>

                <form onSubmit={handleAddKalender}>
                  <div className={styles.formGroup}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        color: '#14532d',
                        fontWeight: 700,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={internalMasjidKal}
                        onChange={(e) => setInternalMasjidKal(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#15803d' }}
                      />
                      Internal Masjid (Penanggung Jawab otomatis DKM Masjid Al-Jihad)
                    </label>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Nama Acara / Kegiatan</label>
                    <input
                      type="text"
                      required
                      value={judulKal}
                      onChange={(e) => setJudulKal(e.target.value)}
                      placeholder="Contoh: Tabligh Akbar / Rapat Koordinasi DKM"
                    />
                  </div>

                  {!internalMasjidKal && (
                    <div className={styles.twoCols}>
                      <div className={styles.formGroup}>
                        <label>Penanggung Jawab (Beserta Instansi)</label>
                        <input
                          type="text"
                          required
                          value={pemateriKal}
                          onChange={(e) => setPemateriKal(e.target.value)}
                          placeholder="Contoh: Husna (Karawang Peduli)"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>No. Telepon PJ</label>
                        <input
                          type="tel"
                          required
                          value={noTelpKal}
                          onChange={(e) => setNoTelpKal(e.target.value)}
                          placeholder="Contoh: 081234567890"
                        />
                      </div>
                    </div>
                  )}

                  <div className={styles.twoCols}>
                    <div className={styles.formGroup}>
                      <label>Tanggal Pelaksanaan</label>
                      <input
                        type="date"
                        required
                        value={tanggalKal}
                        onChange={(e) => setTanggalKal(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Kategori Acara</label>
                      <select
                        value={kategoriKal}
                        onChange={(e) =>
                          setKategoriKal(e.target.value as AgendaKalenderItem['kategori'])
                        }
                      >
                        <option value="Kajian">Kajian</option>
                        <option value="Khutbah Jumat">Khutbah Jumat</option>
                        <option value="Pendidikan">Pendidikan</option>
                        <option value="Rapat DKM">Rapat DKM</option>
                        <option value="Sosial">Sosial</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.twoCols}>
                    <div className={styles.formGroup}>
                      <label>Jam Mulai (WIB)</label>
                      <input
                        type="time"
                        required
                        value={jamMulaiKal}
                        onChange={(e) => setJamMulaiKal(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Jam Selesai (WIB)</label>
                      <input
                        type="time"
                        required
                        value={jamSelesaiKal}
                        onChange={(e) => setJamSelesaiKal(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Tempat / Area Masjid</label>
                    <input
                      type="text"
                      required
                      value={ruanganKal}
                      onChange={(e) => setRuanganKal(e.target.value)}
                      placeholder="Contoh: Pelataran Masjid / Ruang Sholat Utama Lantai 1"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '6px',
                      }}
                    >
                      <label style={{ marginBottom: 0 }}>Peminjaman Aset Masjid (Opsional)</label>
                      <button
                        type="button"
                        onClick={() => setShowAsetAdminModal(true)}
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
                      value={asetKal}
                      onChange={(e) => setAsetKal(e.target.value)}
                      placeholder="Contoh: Meja Panjang (2), Kursi (2)"
                    />
                    <span className={styles.itemMeta} style={{ marginTop: '4px', display: 'block' }}>
                      Contoh pengisian: Meja Panjang (2), Kursi (2), Sound System Portable (1).
                    </span>
                  </div>

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={liveConflicts.length > 0}
                  >
                    {liveConflicts.length > 0
                      ? 'Jadwal Bentrok — Pilih Jam Lain'
                      : 'Simpan ke Kalender Masjid'}
                  </button>
                </form>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* PANEL PENGAJUAN JADWAL MASUK DARI PENGGUNA */}
                <div className={styles.panelCard}>
                  <h2 className={styles.panelTitle}>
                    Pengajuan Jadwal dari Pengguna (
                    {pengajuanKalenderList.filter((p) => p.status === 'Menunggu').length} Menunggu)
                  </h2>
                  {pengajuanKalenderList.length === 0 ? (
                    <p className={styles.panelSub} style={{ marginBottom: 0 }}>
                      Belum ada pengajuan jadwal dari halaman kalender pengguna.
                    </p>
                  ) : (
                    <div className={styles.itemList}>
                      {pengajuanKalenderList.map((pgj) => (
                        <div
                          key={pgj.id}
                          className={styles.itemRow}
                          style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '8px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <h4 className={styles.itemTitle} style={{ margin: 0 }}>
                              {pgj.namaKegiatan}
                            </h4>
                            <span
                              style={{
                                fontSize: '0.74rem',
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
                              {pgj.status}
                            </span>
                          </div>
                          <div className={styles.itemMeta} style={{ lineHeight: 1.55 }}>
                            <div>
                              <strong>PJ:</strong> {pgj.penanggungJawab} • <strong>Telp:</strong>{' '}
                              {pgj.noTeleponPj}
                            </div>
                            <div>
                              <strong>Waktu:</strong> {pgj.tanggal} ({pgj.jamMulai}–{pgj.jamSelesai}{' '}
                              WIB) • <strong>Tempat:</strong> {pgj.tempatKegiatan}
                            </div>
                            <div>
                              <strong>Aset:</strong> {pgj.peminjamanAset || '-'}
                            </div>
                            {pgj.deskripsi && (
                              <div>
                                <strong>Deskripsi:</strong> {pgj.deskripsi}
                              </div>
                            )}
                            {pgj.catatan && (
                              <div>
                                <strong>Catatan:</strong> {pgj.catatan}
                              </div>
                            )}
                          </div>
                          {pgj.posterUrl && (
                            <img
                              src={pgj.posterUrl}
                              alt="Poster Pengajuan"
                              style={{
                                maxWidth: '160px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                              }}
                            />
                          )}
                          {pgj.status === 'Menunggu' && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <button
                                type="button"
                                className={styles.submitBtn}
                                style={{ padding: '7px 14px', fontSize: '0.8rem', flex: 1 }}
                                onClick={() => {
                                  setPendingAdminAction({
                                    type: 'review_pengajuan',
                                    item: pgj,
                                    decision: 'Disetujui',
                                  })
                                  setAdminAuthPassword('')
                                  setShowAdminAuthPassword(false)
                                  setAdminAuthError('')
                                  setAdminAuthModalOpen(true)
                                }}
                              >
                                Setujui
                              </button>
                              <button
                                type="button"
                                className={styles.deleteBtn}
                                style={{ padding: '7px 14px', fontSize: '0.8rem', flex: 1 }}
                                onClick={() => {
                                  setPendingAdminAction({
                                    type: 'review_pengajuan',
                                    item: pgj,
                                    decision: 'Ditolak',
                                  })
                                  setAdminAuthPassword('')
                                  setShowAdminAuthPassword(false)
                                  setAdminAuthError('')
                                  setAdminAuthModalOpen(true)
                                }}
                              >
                                Tolak
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* DAFTAR JADWAL TERDAFTAR DI KALENDER */}
                <div className={styles.panelCard}>
                  <h2 className={styles.panelTitle}>Daftar Jadwal Terdaftar di Kalender</h2>
                  <div className={styles.itemList}>
                    {kalenderList.map((kal) => (
                      <div key={kal.id} className={styles.itemRow}>
                        <div>
                          <h4 className={styles.itemTitle}>{kal.judul}</h4>
                          <span className={styles.itemMeta}>
                            {`${kal.tanggal} • ${kal.jamMulai}–${kal.jamSelesai} WIB • ${kal.ruangan} • ${kal.pemateri}`}
                          </span>
                        </div>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={async () => {
                            const filtered = kalenderList.filter((x) => x.id !== kal.id)
                            setKalenderList(filtered)
                            masjidStore.saveKalender(filtered)
                            if (getActiveSupabaseConfig().isConfigured) {
                              await getSupabaseClient()
                                .from('jadwal_terdekat')
                                .delete()
                                .eq('id', kal.id)
                            }
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* MODAL DAFTAR ASET MASJID (ADMIN) */}
              {showAsetAdminModal && (
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
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                      }}
                    >
                      <h4 style={{ margin: 0, color: '#0f4a2a', fontWeight: 800 }}>
                        Daftar Aset Masjid Al-Jihad
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowAsetAdminModal(false)}
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
                            const qty = selectedAsetQtyAdmin[aset.nama] || 0
                            return (
                              <tr
                                key={aset.nama}
                                style={{
                                  borderBottom: '1px solid #e5e7eb',
                                  background:
                                    qty > 0 ? '#f0fdf4' : idx % 2 === 0 ? '#ffffff' : '#f9fafb',
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
                                          ...selectedAsetQtyAdmin,
                                          [aset.nama]: Math.max(0, qty - 1),
                                        }
                                        setSelectedAsetQtyAdmin(next)
                                        syncAdminAsetSelection(next, manualAsetExtraAdmin)
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
                                          ...selectedAsetQtyAdmin,
                                          [aset.nama]: Math.min(aset.maxQty, qty + 1),
                                        }
                                        setSelectedAsetQtyAdmin(next)
                                        syncAdminAsetSelection(next, manualAsetExtraAdmin)
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
                    <div className={styles.formGroup}>
                      <label>Ketik Manual / Tambahan Aset Lainnya (Opsional)</label>
                      <input
                        type="text"
                        value={manualAsetExtraAdmin}
                        onChange={(e) => {
                          const val = e.target.value
                          setManualAsetExtraAdmin(val)
                          syncAdminAsetSelection(selectedAsetQtyAdmin, val)
                        }}
                        placeholder="Contoh: Meja Panjang (2), Kursi (2)"
                      />
                    </div>
                    <button
                      type="button"
                      className={styles.submitBtn}
                      onClick={() => setShowAsetAdminModal(false)}
                    >
                      Simpan Pilihan Aset
                    </button>
                  </div>
                </div>
              )}

              {/* MODAL KONFIRMASI PASSWORD ADMIN (aljihad2026) DENGAN PREVIEW SANDI */}
              {adminAuthModalOpen && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.72)',
                    zIndex: 10020,
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
                      maxWidth: '420px',
                      padding: '22px',
                      boxShadow: '0 24px 60px rgba(0, 0, 0, 0.34)',
                    }}
                  >
                    <h3 style={{ margin: '0 0 6px', color: '#0f4a2a', fontWeight: 800 }}>
                      Konfirmasi Keamanan Admin DKM
                    </h3>
                    <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#4b5563' }}>
                      Masukkan password konfirmasi Admin untuk memproses perubahan jadwal kalender.
                    </p>
                    {adminAuthError && (
                      <div className={styles.errorBox} style={{ marginBottom: '12px' }}>
                        {adminAuthError}
                      </div>
                    )}
                    <form onSubmit={handleConfirmAdminPassword}>
                      <div className={styles.formGroup}>
                        <label>Password Konfirmasi Admin</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type={showAdminAuthPassword ? 'text' : 'password'}
                            required
                            autoFocus
                            value={adminAuthPassword}
                            onChange={(e) => setAdminAuthPassword(e.target.value)}
                            placeholder="Masukkan password admin..."
                            style={{ width: '100%', paddingRight: '44px' }}
                          />
                          <button
                            type="button"
                            aria-label={
                              showAdminAuthPassword ? 'Sembunyikan sandi' : 'Lihat sandi'
                            }
                            onClick={() => setShowAdminAuthPassword((prev) => !prev)}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#1b6b45',
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px',
                            }}
                          >
                            {showAdminAuthPassword ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                              </svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setAdminAuthModalOpen(false)
                            setPendingAdminAction(null)
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
                        <button type="submit" className={styles.submitBtn} style={{ flex: 1 }}>
                          Konfirmasi
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* MODAL CHATBOT LAPORAN WHATSAPP KE PENGGUNA */}
              {waReportModal && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.72)',
                    zIndex: 10030,
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
                      maxWidth: '460px',
                      padding: '22px',
                      boxShadow: '0 24px 60px rgba(0, 0, 0, 0.34)',
                      textAlign: 'center',
                    }}
                  >
                    <h3 style={{ margin: '0 0 8px', color: '#0f4a2a', fontWeight: 800 }}>
                      {waReportModal.decision === 'Disetujui'
                        ? 'Pengajuan Disetujui'
                        : 'Pengajuan Ditolak'}
                    </h3>
                    <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#374151', lineHeight: 1.55 }}>
                      Apakah Anda ingin mengirimkan laporan resmi Admin DKM (berisi status{' '}
                      <strong>
                        {waReportModal.decision === 'Disetujui' ? 'Diterima' : 'Ditolak'}
                      </strong>{' '}
                      beserta rincian data acara) ke nomor WhatsApp{' '}
                      <strong>{waReportModal.item.noTeleponPj}</strong>?
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                      <a
                        href={buildWaChatbotReportUrl(waReportModal.item, waReportModal.decision)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setWaReportModal(null)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          background: 'linear-gradient(135deg, #25D366, #128C7E)',
                          color: '#ffffff',
                          padding: '11px 16px',
                          borderRadius: '12px',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          textDecoration: 'none',
                        }}
                      >
                        Kirim Laporan ke Pengguna (WhatsApp)
                      </a>
                      <button
                        type="button"
                        onClick={() => setWaReportModal(null)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid #d1d5db',
                          background: '#f9fafb',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Selesai Saja
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MENU 3: KELOLA BERITA */}
            <div
              className={styles.dashGrid}
              style={{ display: activeTab === 'berita' ? 'grid' : 'none' }}
            >
              <div className={styles.panelCard}>
                <h2 className={styles.panelTitle}>Tambah Berita (Magazine Grid)</h2>
                <form onSubmit={handleAddBerita}>
                  <div className={styles.formGroup}>
                    <label>Judul Berita</label>
                    <input
                      type="text"
                      required
                      value={judulBerita}
                      onChange={(e) => setJudulBerita(e.target.value)}
                      placeholder="Contoh: RIBUAN JAMAAH IKUTI TABLIGH AKBAR MASJID AL-JIHAD"
                    />
                  </div>
                  <div className={styles.twoCols}>
                    <div className={styles.formGroup}>
                      <label>Label Kategori</label>
                      <input
                        type="text"
                        required
                        value={kategoriBerita}
                        onChange={(e) => setKategoriBerita(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>URL Foto Berita (atau Upload ke Cloudinary)</label>
                      <input
                        type="url"
                        required
                        value={thumbBerita}
                        onChange={(e) => setThumbBerita(e.target.value)}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        disabled={cloudinaryUploading === 'berita'}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const url = await uploadFileToCloudinary(
                            file,
                            'masjid-aljihad/berita',
                            'image',
                            'berita'
                          )
                          if (url) setThumbBerita(url)
                        }}
                        style={{ marginTop: '6px' }}
                      />
                      {cloudinaryUploading === 'berita' && (
                        <span className={styles.itemMeta} style={{ color: '#b45309' }}>
                          Mengunggah foto berita ke Cloudinary...
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Ringkasan Berita</label>
                    <input
                      type="text"
                      required
                      value={ringkasanBerita}
                      onChange={(e) => setRingkasanBerita(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Isi Berita Lengkap</label>
                    <textarea
                      rows={3}
                      required
                      value={kontenBerita}
                      onChange={(e) => setKontenBerita(e.target.value)}
                    />
                  </div>
                  <button type="submit" className={styles.submitBtn}>
                    Terbitkan Berita ke Beranda &amp; Supabase
                  </button>
                </form>
              </div>

              <div className={styles.panelCard}>
                <h2 className={styles.panelTitle}>
                  Daftar Berita Aktif (2 Teratas Jadi Headline Utama)
                </h2>
                <div className={styles.itemList}>
                  {beritaList.map((b, idx) => (
                    <div key={b.id} className={styles.itemRow}>
                      <div>
                        <h4 className={styles.itemTitle}>
                          {`${idx < 2 ? '[HEADLINE ATAS] ' : ''}${b.judul}`}
                        </h4>
                        <span className={styles.itemMeta}>{b.kategori}</span>
                      </div>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={async () => {
                          const filtered = beritaList.filter((x) => x.id !== b.id)
                          setBeritaList(filtered)
                          masjidStore.saveBerita(filtered)
                          if (getActiveSupabaseConfig().isConfigured) {
                            await getSupabaseClient().from('berita').delete().eq('id', b.id)
                          }
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* MENU 4: VIDEO KEGIATAN */}
            <div
              className={styles.dashGrid}
              style={{ display: activeTab === 'video' ? 'grid' : 'none' }}
            >
              <div className={styles.panelCard}>
                <h2 className={styles.panelTitle}>Tambah Video Kegiatan Masjid</h2>
                <form onSubmit={handleAddVideo}>
                  <div className={styles.formGroup}>
                    <label>Judul Video Kegiatan</label>
                    <input
                      type="text"
                      required
                      value={judulVideo}
                      onChange={(e) => setJudulVideo(e.target.value)}
                      placeholder="Contoh: Suasana Kajian Ba'da Maghrib Masjid Al-Jihad"
                    />
                  </div>
                  <div className={styles.twoCols}>
                    <div className={styles.formGroup}>
                      <label>Kategori Video</label>
                      <input
                        type="text"
                        required
                        value={kategoriVideo}
                        onChange={(e) => setKategoriVideo(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Durasi Video</label>
                      <input
                        type="text"
                        value={durasiVideo}
                        onChange={(e) => setDurasiVideo(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>URL File Video (.mp4 / Cloudinary)</label>
                    <input
                      type="url"
                      required
                      value={urlVideo}
                      onChange={(e) => setUrlVideo(e.target.value)}
                      placeholder="https://...video.mp4"
                    />
                    <input
                      type="file"
                      accept="video/*"
                      disabled={cloudinaryUploading === 'video'}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const url = await uploadFileToCloudinary(
                          file,
                          'masjid-aljihad/video',
                          'video',
                          'video'
                        )
                        if (url) setUrlVideo(url)
                      }}
                      style={{ marginTop: '6px' }}
                    />
                    {cloudinaryUploading === 'video' && (
                      <span className={styles.itemMeta} style={{ color: '#b45309' }}>
                        Mengunggah video ke Cloudinary...
                      </span>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label>URL Gambar Cover / Thumbnail Video</label>
                    <input
                      type="url"
                      value={thumbVideo}
                      onChange={(e) => setThumbVideo(e.target.value)}
                    />
                  </div>
                  <button type="submit" className={styles.submitBtn}>
                    Simpan Video Kegiatan
                  </button>
                </form>
              </div>

              <div className={styles.panelCard}>
                <h2 className={styles.panelTitle}>Daftar Video Kegiatan di Beranda</h2>
                <div className={styles.itemList}>
                  {videoList.map((v) => (
                    <div key={v.id} className={styles.itemRow}>
                      <div>
                        <h4 className={styles.itemTitle}>{v.judul}</h4>
                        <span className={styles.itemMeta}>{`${v.kategori} • ${v.durasi}`}</span>
                      </div>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={async () => {
                          const filtered = videoList.filter((x) => x.id !== v.id)
                          setVideoList(filtered)
                          masjidStore.saveVideo(filtered)
                          if (getActiveSupabaseConfig().isConfigured) {
                            await getSupabaseClient().from('reels').delete().eq('id', v.id)
                          }
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* MENU 5: KRITIK & SARAN JAMAAH */}
            <div
              className={styles.panelCard}
              style={{ display: activeTab === 'kritik_saran' ? 'block' : 'none' }}
            >
              <h2 className={styles.panelTitle}>Kotak Masuk Kritik &amp; Saran Jamaah</h2>
              <p className={styles.panelSub}>
                Seluruh masukan yang dikirimkan jamaah dari halaman utama masuk ke daftar ini
                terlebih dahulu untuk ditinjau oleh Admin DKM.
              </p>

              <div className={styles.itemList}>
                {kritikList.length === 0 && (
                  <p className={styles.itemMeta}>Belum ada kritik atau saran baru yang masuk.</p>
                )}
                {kritikList.map((k) => (
                  <div key={k.id} className={styles.itemRow}>
                    <div>
                      <h4 className={styles.itemTitle}>
                        {`[${k.status}] ${k.nama} (${k.kontak}) — ${k.kategori}`}
                      </h4>
                      <p style={{ margin: '4px 0', fontSize: '0.88rem', color: '#1A2E1E' }}>
                        {`"${k.pesan}"`}
                      </p>
                      <span className={styles.itemMeta}>{`Dikirim tanggal: ${k.tanggal}`}</span>
                    </div>
                    <div className={styles.actionRowBtns}>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => handleUpdateKritikStatus(k.id, 'Ditindaklanjuti')}
                      >
                        ✓ Tandai Ditindaklanjuti
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={async () => {
                          const filtered = kritikList.filter((x) => x.id !== k.id)
                          setKritikList(filtered)
                          masjidStore.saveKritik(filtered)
                          if (getActiveSupabaseConfig().isConfigured) {
                            await getSupabaseClient().from('kritik_saran').delete().eq('id', k.id)
                          }
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MENU 6: STUDIO POSTER KHATIB */}
            <div
              className={styles.dashGrid}
              style={{ display: activeTab === 'poster_khatib' ? 'grid' : 'none' }}
            >
              <div className={styles.panelCard}>
                <h2 className={styles.panelTitle}>Poster Online</h2>

                <div className={styles.formGroup}>
                  <label>Jenis Poster</label>
                  <div className={styles.switchGroup}>
                    <button
                      type="button"
                      className={`${styles.switchBtn} ${jenisPoster === 'Khutbah Jumat' ? styles.switchBtnActive : ''
                        }`}
                      onClick={() => {
                        setJenisPoster('Khutbah Jumat')
                        if (posterTemplate === 'putih_minimalis') {
                          setPosterTemplate('klasik_krem')
                        }
                        if (tanggalPoster) {
                          const d = new Date(`${tanggalPoster}T12:00:00`)
                          if (d.getDay() !== 5) {
                            const diff = (5 - d.getDay() + 7) % 7
                            d.setDate(d.getDate() + diff)
                            setTanggalPoster(d.toISOString().slice(0, 10))
                          }
                        }
                      }}
                    >
                      Khutbah Jum&apos;at
                    </button>
                    <button
                      type="button"
                      className={`${styles.switchBtn} ${jenisPoster === 'Kajian' ? styles.switchBtnActive : ''
                        }`}
                      onClick={() => {
                        setJenisPoster('Kajian')
                        setPosterTemplate('klasik_krem')
                      }}
                    >
                      Kajian
                    </button>
                  </div>
                </div>

                <div className={styles.twoCols}>
                  <div className={styles.formGroup}>
                    <label>Pilihan Template Poster</label>
                    <select
                      value={posterTemplate === 'putih_minimalis' ? 'klasik_krem' : posterTemplate}
                      onChange={(e) =>
                        setPosterTemplate(
                          e.target.value as
                          | 'klasik_krem'
                          | 'zamrud_elegan'
                          | 'putih_minimalis'
                        )
                      }
                    >
                      <option value="klasik_krem">Template 1</option>
                      <option value="zamrud_elegan">Template 2</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Tanggal Pelaksanaan</label>
                    <input
                      type="date"
                      value={tanggalPoster}
                      min={jenisPoster === 'Khutbah Jumat' ? '2020-01-03' : undefined}
                      step={jenisPoster === 'Khutbah Jumat' ? 7 : undefined}
                      onChange={(e) => {
                        const val = e.target.value
                        if (!val) {
                          setTanggalPoster('')
                          return
                        }
                        if (jenisPoster === 'Khutbah Jumat') {
                          const d = new Date(`${val}T12:00:00`)
                          if (d.getDay() !== 5) {
                            const diff = (5 - d.getDay() + 7) % 7
                            d.setDate(d.getDate() + diff)
                            setTanggalPoster(d.toISOString().slice(0, 10))
                            return
                          }
                        }
                        setTanggalPoster(val)
                      }}
                    />
                  </div>
                </div>

                {jenisPoster === 'Kajian' && (
                  <div className={styles.formGroup}>
                    <label>Waktu Kajian (Jam WIB)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className={styles.switchBtn}
                        style={{
                          border: '1px solid rgba(27, 107, 69, 0.25)',
                          background: '#f1f7f3',
                          whiteSpace: 'nowrap',
                        }}
                        onClick={() => {
                          const [hh, mm] = (waktuKajianInput || '19:00').split(':').map(Number)
                          const nextH = (hh + 23) % 24
                          const nextVal = `${String(nextH).padStart(2, '0')}:${String(mm || 0).padStart(2, '0')}`
                          setWaktuKajianInput(nextVal)
                          setWaktuOtomatis(`${nextVal.replace(':', '.')} WIB`)
                        }}
                      >
                        - 1 Jam
                      </button>
                      <input
                        type="time"
                        value={waktuKajianInput}
                        onChange={(e) => {
                          const val = e.target.value || '19:00'
                          setWaktuKajianInput(val)
                          setWaktuOtomatis(`${val.replace(':', '.')} WIB`)
                        }}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className={styles.switchBtn}
                        style={{
                          border: '1px solid rgba(27, 107, 69, 0.25)',
                          background: '#f1f7f3',
                          whiteSpace: 'nowrap',
                        }}
                        onClick={() => {
                          const [hh, mm] = (waktuKajianInput || '19:00').split(':').map(Number)
                          const nextH = (hh + 1) % 24
                          const nextVal = `${String(nextH).padStart(2, '0')}:${String(mm || 0).padStart(2, '0')}`
                          setWaktuKajianInput(nextVal)
                          setWaktuOtomatis(`${nextVal.replace(':', '.')} WIB`)
                        }}
                      >
                        + 1 Jam
                      </button>
                    </div>
                  </div>
                )}

                <div
                  className={styles.autoSyncPill}
                  style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}
                >
                  <span>
                    {new Date(`${tanggalPoster}T12:00:00`).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span>{hijriOtomatis}</span>
                  <span>{`Waktu ${jenisPoster === 'Khutbah Jumat' ? 'Jumat' : 'Kajian'} : ${waktuOtomatis}`}</span>
                </div>

                {jenisPoster === 'Kajian' ? (
                  <div key="kajian-speaker" className={styles.formGroup}>
                    <label>Nama Penceramah</label>
                    <input
                      type="text"
                      value={namaKhatibPoster}
                      onChange={(e) => setNamaKhatibPoster(e.target.value)}
                      placeholder="Contoh: Ust. Adi Hidayat, Lc., M.A."
                    />
                  </div>
                ) : (
                  <div key="khutbah-officers">
                    <div className={styles.twoCols}>
                      <div className={styles.formGroup}>
                        <label>Nama Khatib</label>
                        <input
                          type="text"
                          value={namaKhatibPoster}
                          onChange={(e) => setNamaKhatibPoster(e.target.value)}
                          placeholder="Contoh: KH. Ahmad Fauzan, S.Ag."
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Kategori Khotib</label>
                        <select
                          value={kategoriKhotib}
                          onChange={(e) =>
                            setKategoriKhotib(e.target.value as "Khotib Jum'at" | 'Khotib & Imam')
                          }
                        >
                          <option value="Khotib Jum'at">
                            Khotib Jum&apos;at (Dengan Imam Terpisah)
                          </option>
                          <option value="Khotib & Imam">Khotib &amp; Imam (Merangkap Imam)</option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.twoCols}>
                      <div
                        className={styles.formGroup}
                        style={{ display: kategoriKhotib === "Khotib Jum'at" ? 'flex' : 'none' }}
                      >
                        <label>Nama Imam</label>
                        <input
                          type="text"
                          value={namaImamPoster}
                          onChange={(e) => setNamaImamPoster(e.target.value)}
                          placeholder="Contoh: Ust. Muhammad Ridwan"
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Nama Bilal</label>
                        <input
                          type="text"
                          value={namaBilalPoster}
                          onChange={(e) => setNamaBilalPoster(e.target.value)}
                          placeholder="Contoh: Ust. Ibrahim Khalil"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label>{jenisPoster === 'Kajian' ? 'Tema Kajian' : 'Tema Khutbah'}</label>
                  <textarea
                    rows={2}
                    value={useDefaultTemaOtomatis ? autoTemaText : temaPoster}
                    disabled={useDefaultTemaOtomatis}
                    onChange={(e) => setTemaPoster(e.target.value)}
                    placeholder="Masukkan tema khutbah/kajian, atau centang opsi di bawah jika tema kosong..."
                  />
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '8px',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: '#14532d',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={useDefaultTemaOtomatis}
                      onChange={(e) => setUseDefaultTemaOtomatis(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#15803d', cursor: 'pointer' }}
                    />
                    Centang jika tema kosong
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label>Upload Foto Khatib (AI Remove Background Otomatis)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      handleUploadKhatibWithAI(file)
                    }}
                  />
                  <span
                    className={styles.itemMeta}
                    style={{
                      display: aiProgressText ? 'block' : 'none',
                      color: aiProcessing ? '#b45309' : '#15803d',
                      fontWeight: 700,
                      marginTop: '4px',
                    }}
                  >
                    {aiProgressText}
                  </span>
                </div>

                <button type="button" className={styles.submitBtn} onClick={handleDownloadPoster}>
                  Download Poster
                </button>
              </div>

              <div className={styles.panelCard}>
                <h2 className={styles.panelTitle}>Pratinjau Live Poster Al-Jihad</h2>
                <div className={styles.posterPreviewBox}>
                  <canvas ref={posterCanvasRef} className={styles.posterCanvas} />
                </div>

                {(() => {
                  const formattedDateWa = tanggalPoster
                    ? new Date(`${tanggalPoster}T12:00:00`).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                    : '-'
                  const effectiveTemaWa = useDefaultTemaOtomatis ? autoTemaText : temaPoster.trim()
                  const waText =
                    jenisPoster === 'Khutbah Jumat'
                      ? [
                        "*Assalamu'alaikum Warahmatullahi Wabarakatuh*",
                        '',
                        'Yth. Bapak/Ibu Jamaah Masjid Al-Jihad Karawang,',
                        "Dengan hormat, kami mengundang Bapak/Ibu/Saudara sekalian untuk menunaikan Sholat Jum'at berjamaah di Masjid Al-Jihad Karawang pada:",
                        '',
                        `- Hari/Tanggal : ${formattedDateWa}`,
                        `- Tanggal Hijriah : ${hijriOtomatis}`,
                        `- Waktu : ${waktuOtomatis}`,
                        '- Tempat : Masjid Al-Jihad (Islamic Center Karawang)',
                        '',
                        "*Petugas Sholat Jum'at:*",
                        `- Khatib : ${namaKhatibPoster.trim() || '-'}`,
                        ...(kategoriKhotib === "Khotib Jum'at"
                          ? [`- Imam : ${namaImamPoster.trim() || '-'}`]
                          : []),
                        `- Bilal : ${namaBilalPoster.trim() || '-'}`,
                        ...(effectiveTemaWa && !useDefaultTemaOtomatis
                          ? [`- Tema Khutbah : ${effectiveTemaWa}`]
                          : []),
                        '',
                        'Mari kita makmurkan rumah Allah serta raih keberkahan ibadah berjamaah.',
                        '',
                        "*Wassalamu'alaikum Warahmatullahi Wabarakatuh*",
                        '_DKM Masjid Al-Jihad Karawang_',
                      ].join('\n')
                      : [
                        "*Assalamu'alaikum Warahmatullahi Wabarakatuh*",
                        '',
                        'Yth. Bapak/Ibu Jamaah Masjid Al-Jihad Karawang,',
                        'Dengan hormat, kami mengundang kehadiran Bapak/Ibu/Saudara sekalian dalam majelis ilmu Kajian Masjid Al-Jihad Karawang yang insyaAllah akan dilaksanakan pada:',
                        '',
                        `- Hari/Tanggal : ${formattedDateWa}`,
                        `- Tanggal Hijriah : ${hijriOtomatis}`,
                        `- Pukul : ${waktuOtomatis} - Selesai`,
                        '- Tempat : Masjid Al-Jihad (Islamic Center Karawang)',
                        '',
                        `- Pemateri : ${namaKhatibPoster.trim() || '-'}`,
                        ...(effectiveTemaWa ? [`- Tema Kajian : ${effectiveTemaWa}`] : []),
                        '',
                        'Terbuka untuk umum. Semoga Allah memudahkan langkah kita dalam menuntut ilmu yang bermanfaat.',
                        '',
                        "*Wassalamu'alaikum Warahmatullahi Wabarakatuh*",
                        '_DKM Masjid Al-Jihad Karawang_',
                      ].join('\n')

                  return (
                    <div
                      style={{
                        marginTop: '20px',
                        padding: '16px',
                        borderRadius: '14px',
                        background: '#f6faf7',
                        border: '1px solid rgba(27, 107, 69, 0.2)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          marginBottom: '10px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <strong style={{ color: '#0f4a2a', fontSize: '0.92rem' }}>
                          {`Template Chat WhatsApp (${jenisPoster === 'Khutbah Jumat' ? "Khutbah Jum'at" : 'Kajian'
                            })`}
                        </strong>
                        <button
                          type="button"
                          className={styles.switchBtn}
                          style={{
                            background: 'linear-gradient(135deg, #1b6b45, #145235)',
                            color: '#ffffff',
                            padding: '8px 16px',
                          }}
                          onClick={async () => {
                            const canvas = posterCanvasRef.current
                            if (!canvas) {
                              window.open(
                                `https://wa.me/?text=${encodeURIComponent(waText)}`,
                                '_blank',
                                'noopener,noreferrer'
                              )
                              return
                            }
                            const blob = await new Promise<Blob | null>((resolve) =>
                              canvas.toBlob((b) => resolve(b), 'image/png')
                            )
                            const fileName = `Poster-${jenisPoster.replace(/\s+/g, '-')}-${tanggalPoster}.png`
                            if (blob) {
                              const file = new File([blob], fileName, { type: 'image/png' })
                              if (
                                typeof navigator !== 'undefined' &&
                                navigator.canShare &&
                                navigator.canShare({ files: [file] })
                              ) {
                                try {
                                  await navigator.share({
                                    files: [file],
                                    title:
                                      jenisPoster === 'Khutbah Jumat'
                                        ? "Poster Khutbah Jum'at Masjid Al-Jihad"
                                        : 'Poster Kajian Masjid Al-Jihad',
                                    text: waText,
                                  })
                                  return
                                } catch {
                                  // user cancelled or share unavailable -> fallback below
                                }
                              }
                              try {
                                if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
                                  await navigator.clipboard.write([
                                    new ClipboardItem({ 'image/png': blob }),
                                  ])
                                }
                              } catch {
                                // ignore clipboard image fallback error
                              }
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = fileName
                              a.click()
                              URL.revokeObjectURL(url)
                            }
                            window.open(
                              `https://wa.me/?text=${encodeURIComponent(waText)}`,
                              '_blank',
                              'noopener,noreferrer'
                            )
                          }}
                        >
                          Share ke WhatsApp
                        </button>
                      </div>
                      <textarea
                        readOnly
                        rows={10}
                        value={waText}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: '1px solid rgba(27, 107, 69, 0.18)',
                          background: '#ffffff',
                          color: '#1e293b',
                          fontSize: '0.82rem',
                          lineHeight: 1.55,
                          fontFamily: 'inherit',
                          resize: 'vertical',
                        }}
                      />
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* POPUP ANIMASI PROSES AI REMOVE BACKGROUND */}
            <div
              className={styles.aiPopupBackdrop}
              style={{ display: aiProcessing ? 'flex' : 'none' }}
              aria-hidden={!aiProcessing}
            >
              <div className={styles.aiPopupCard}>
                <div className={styles.aiOrbitLoader}>
                  <span className={styles.aiRingOuter} />
                  <span className={styles.aiRingInner} />
                  <Image
                    src={logoMasjidWarna}
                    alt="Logo Masjid Al-Jihad"
                    className={styles.aiLogoPulse}
                  />
                </div>
                <h3 className={styles.aiPopupTitle}>Menghapus Background Foto</h3>
                <p
                  className={styles.aiPopupDesc}
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: '#15803d',
                    marginBottom: '12px',
                  }}
                >
                  {`${aiProgressPct}%`}
                </p>
                <div className={styles.aiProgressTrack}>
                  <div
                    className={styles.aiProgressBar}
                    style={{
                      width: `${aiProgressPct}%`,
                      animation: 'none',
                      transition: 'width 0.25s ease',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* MENU 7: SURAT UNDANGAN RESMI DKM */}
            <div
              className={styles.dashGrid}
              style={{ display: activeTab === 'surat_undangan' ? 'grid' : 'none' }}
            >
              <div className={styles.panelCard}>
                <h2 className={styles.panelTitle}>Pembuat Surat Undangan Resmi DKM</h2>

                <div className={styles.formGroup}>
                  <label>Jenis Surat Undangan</label>
                  <div className={styles.switchGroup}>
                    <button
                      type="button"
                      className={`${styles.switchBtn} ${
                        jenisSurat === 'Khutbah Jumat' ? styles.switchBtnActive : ''
                      }`}
                      onClick={() => {
                        setJenisSurat('Khutbah Jumat')
                        if (perihalKhutbahOpsi !== 'Manual') {
                          const preset = PERIHAL_KHUTBAH_MAP[perihalKhutbahOpsi]
                          setPerihalSurat(preset.perihal)
                          setAgendaSurat(preset.agenda)
                        }
                        if (tanggalSuratAcara) {
                          const d = new Date(`${tanggalSuratAcara}T12:00:00`)
                          if (d.getDay() !== 5) {
                            const diff = (5 - d.getDay() + 7) % 7
                            d.setDate(d.getDate() + diff)
                            setTanggalSuratAcara(d.toISOString().slice(0, 10))
                          }
                        }
                      }}
                    >
                      Khutbah Jum&apos;at
                    </button>
                    <button
                      type="button"
                      className={`${styles.switchBtn} ${
                        jenisSurat === 'Umum' ? styles.switchBtnActive : ''
                      }`}
                      onClick={() => {
                        setJenisSurat('Umum')
                        setPerihalSurat('')
                        setAgendaSurat('')
                      }}
                    >
                      Umum
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Nomor Surat</label>
                  <input
                    type="text"
                    value={noSurat}
                    onChange={(e) => setNoSurat(e.target.value)}
                  />
                  <span
                    className={styles.itemMeta}
                    style={{ color: '#166534', fontWeight: 600, marginTop: '4px' }}
                  >
                    {lastUsedNoSurat
                      ? `Terakhir digunakan: ${lastUsedNoSurat.nomor} (${lastUsedNoSurat.waktu})`
                      : 'Belum ada riwayat nomor surat yang digunakan'}
                  </span>
                </div>
                {jenisSurat === 'Khutbah Jumat' ? (
                  <div key="surat-khutbah-perihal" className={styles.formGroup}>
                    <label>Perihal Undangan</label>
                    <select
                      value={perihalKhutbahOpsi}
                      onChange={(e) =>
                        handleSelectPerihalKhutbah(
                          e.target.value as
                            | 'Khotib & Imam'
                            | 'Khotib Jumat'
                            | 'Imam Jumat'
                            | 'Bilal'
                            | 'Manual'
                        )
                      }
                    >
                      <option value="Khotib & Imam">Khotib &amp; Imam</option>
                      <option value="Khotib Jumat">Khotib Jum&apos;at</option>
                      <option value="Imam Jumat">Imam Jum&apos;at</option>
                      <option value="Bilal">Bilal</option>
                      <option value="Manual">Manual (Ketik Sendiri)</option>
                    </select>
                    {perihalKhutbahOpsi === 'Manual' && (
                      <input
                        type="text"
                        value={perihalSurat}
                        onChange={(e) => setPerihalSurat(e.target.value)}
                        placeholder="Ketik perihal surat undangan..."
                        style={{ marginTop: '8px' }}
                      />
                    )}
                  </div>
                ) : (
                  <div key="surat-umum-perihal" className={styles.formGroup}>
                    <label>Perihal Undangan</label>
                    <input
                      type="text"
                      value={perihalSurat}
                      onChange={(e) => setPerihalSurat(e.target.value)}
                      placeholder="Ketik perihal surat undangan umum..."
                    />
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label>
                    {jenisSurat === 'Khutbah Jumat'
                      ? perihalKhutbahOpsi === 'Khotib & Imam'
                        ? 'Kepada Yth. (Nama Khotib & Imam)'
                        : perihalKhutbahOpsi === 'Khotib Jumat'
                          ? "Kepada Yth. (Nama Khotib Jum'at)"
                          : perihalKhutbahOpsi === 'Imam Jumat'
                            ? "Kepada Yth. (Nama Imam Jum'at)"
                            : perihalKhutbahOpsi === 'Bilal'
                              ? 'Kepada Yth. (Nama Bilal)'
                              : 'Kepada Yth. (Nama Penerima / Tamu)'
                      : 'Kepada Yth. (Nama Penerima / Instansi / Tamu)'}
                  </label>
                  <input
                    type="text"
                    value={kepadaSurat}
                    onChange={(e) => setKepadaSurat(e.target.value)}
                    placeholder={
                      jenisSurat === 'Khutbah Jumat'
                        ? perihalKhutbahOpsi === 'Bilal'
                          ? 'Contoh: Ust. Ibrahim Khalil'
                          : perihalKhutbahOpsi === 'Imam Jumat'
                            ? 'Contoh: Ust. Muhammad Ridwan'
                            : 'Contoh: Al-Mukarram KH. Ahmad Fauzan, S.Ag.'
                        : 'Contoh: Bapak/Ibu Pengurus / Jamaah / Tamu Undangan'
                    }
                  />
                </div>
                <div className={styles.twoCols}>
                  <div className={styles.formGroup}>
                    <label>Tanggal Kegiatan</label>
                    <input
                      type="date"
                      value={tanggalSuratAcara}
                      min={jenisSurat === 'Khutbah Jumat' ? '2020-01-03' : undefined}
                      step={jenisSurat === 'Khutbah Jumat' ? 7 : undefined}
                      onChange={(e) => {
                        const val = e.target.value
                        if (!val) {
                          setTanggalSuratAcara('')
                          return
                        }
                        if (jenisSurat === 'Khutbah Jumat') {
                          const d = new Date(`${val}T12:00:00`)
                          if (d.getDay() !== 5) {
                            const diff = (5 - d.getDay() + 7) % 7
                            d.setDate(d.getDate() + diff)
                            setTanggalSuratAcara(d.toISOString().slice(0, 10))
                            return
                          }
                        }
                        setTanggalSuratAcara(val)
                      }}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Waktu (Menyesuaikan Otomatis)</label>
                    <input
                      type="text"
                      value={waktuSuratAcara}
                      onChange={(e) => setWaktuSuratAcara(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Tempat</label>
                  <input
                    type="text"
                    value={tempatSuratAcara}
                    onChange={(e) => setTempatSuratAcara(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Agenda / Pokok Acara</label>
                  <textarea
                    rows={2}
                    value={agendaSurat}
                    onChange={(e) => setAgendaSurat(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    onClick={async () => {
                      recordLastUsedNoSurat(noSurat)
                      const pdfBlob = await buildSuratPdfBlob()
                      const url = URL.createObjectURL(pdfBlob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `Surat-Undangan-DKM-${tanggalSuratAcara || 'Resmi'}.pdf`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    Download PDF
                  </button>
                  <button
                    type="button"
                    className={styles.switchBtn}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #25D366, #128C7E)',
                      color: '#ffffff',
                      padding: '11px 16px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      boxShadow: '0 6px 16px rgba(18, 140, 126, 0.25)',
                    }}
                    onClick={async () => {
                      recordLastUsedNoSurat(noSurat)
                      const waSuratText = getSuratWaText()
                      const imgBlob = await buildSuratImageBlob()
                      const fileName = `Surat-Undangan-DKM-${tanggalSuratAcara || 'Resmi'}.png`
                      const imgFile = new File([imgBlob], fileName, { type: 'image/png' })

                      if (
                        typeof navigator !== 'undefined' &&
                        navigator.canShare &&
                        navigator.canShare({ files: [imgFile] })
                      ) {
                        try {
                          await navigator.share({
                            files: [imgFile],
                            title: perihalSurat || 'Surat Undangan Resmi DKM Masjid Al-Jihad',
                            text: waSuratText,
                          })
                          setWaShareHint('Foto surat & teks pengantar berhasil dibagikan.')
                          return
                        } catch (err) {
                          if (err instanceof Error && err.name === 'AbortError') {
                            return
                          }
                        }
                      }

                      try {
                        if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
                          await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': imgBlob }),
                          ])
                        }
                      } catch {
                        // ignore clipboard image fallback error
                      }

                      const url = URL.createObjectURL(imgBlob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = fileName
                      a.click()
                      URL.revokeObjectURL(url)

                      setWaShareHint(
                        'Gambar surat (.PNG) sudah disalin ke clipboard & diunduh. Di WhatsApp Web, tekan Ctrl+V di chat untuk menempelkan gambarnya.'
                      )
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(waSuratText)}`,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }}
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.77 14.02c-.24.68-1.41 1.3-1.95 1.38-.5.07-1.13.1-1.82-.12-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.8-4.17-4.95-4.36-.14-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.01-2.42.27-.29.58-.36.77-.36.2 0 .39.01.56.01.18 0 .42-.07.66.5.24.58.83 2.02.9 2.17.07.14.12.31.02.5-.1.2-.14.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.3-.13.59.17.29.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.3 1.42.29.14.46.12.63-.07.17-.2.72-.84.91-1.13.2-.29.39-.24.65-.14.27.1 1.7.8 1.99.95.29.14.48.22.55.34.07.12.07.7-.17 1.38z" />
                    </svg>
                    <span>Bagikan</span>
                  </button>
                  {waShareHint && (
                    <span
                      className={styles.itemMeta}
                      style={{ color: '#166534', fontWeight: 600, lineHeight: 1.45 }}
                    >
                      {waShareHint}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.panelCard}>
                <h2 className={styles.panelTitle}>Pratinjau Kertas Surat Undangan DKM</h2>
                <div className={styles.suratPaper}>
                  <div
                    className={styles.kopSurat}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '18px',
                      textAlign: 'center',
                    }}
                  >
                    <Image
                      src={logoMasjidWarna}
                      alt="Logo Masjid Al-Jihad"
                      width={logoMasjidWarna.width}
                      height={logoMasjidWarna.height}
                      style={{
                        width: '62px',
                        height: 'auto',
                        objectFit: 'contain',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, lineHeight: 1.35 }}>
                      <h3>DEWAN KEMAKMURAN MASJID (DKM)</h3>
                      <h4>MASJID AL-JIHAD ISLAMIC CENTRE KARAWANG</h4>
                      <p>
                        Jl. Jenderal Ahmad Yani, Kel. Karangpawitan, Kab. Karawang, Jawa Barat
                      </p>
                      <p>
                        Telp/Wa : 0851-1155-6563 &nbsp;•&nbsp; Email: masjidaljihadkarawang@gmail.com
                      </p>
                    </div>
                  </div>

                  <div className={styles.suratMetaTable}>
                    <div>
                      <strong>Nomor</strong> : {noSurat}
                    </div>
                    <div>
                      <strong>Lampiran</strong> : -
                    </div>
                    <div>
                      <strong>Perihal</strong> : <strong>{perihalSurat}</strong>
                    </div>
                  </div>

                  <div className={styles.suratBody}>
                    <p>
                      Kepada Yth.
                      <br />
                      <strong>{kepadaSurat}</strong>
                      <br />
                      di Tempat
                    </p>
                    <p>
                      <em>Assalamu&apos;alaikum Warahmatullahi Wabarakatuh,</em>
                    </p>
                    <p>
                      {jenisSurat === 'Khutbah Jumat'
                        ? `Sehubungan dengan pelaksanaan kegiatan ibadah Jumat di Masjid Raya Al-Jihad Karawang, kami memohon kesediaan Bapak/Ustadz untuk menjadi ${
                            perihalKhutbahOpsi === 'Khotib & Imam'
                              ? 'Khotib & Imam'
                              : perihalKhutbahOpsi === 'Khotib Jumat'
                                ? 'Khotib'
                                : perihalKhutbahOpsi === 'Imam Jumat'
                                  ? 'Imam'
                                  : perihalKhutbahOpsi === 'Bilal'
                                    ? 'Bilal'
                                    : 'Petugas Ibadah Jumat'
                          } pada:`
                        : 'Sehubungan dengan pelaksanaan kegiatan di Masjid Raya Al-Jihad Karawang, bersama surat ini kami memohon kesediaan Bapak/Ibu/Ustadz untuk hadir pada:'}
                    </p>

                    <div className={styles.suratScheduleTable}>
                      <div>
                        <strong>Hari / Tanggal</strong> :{' '}
                        {tanggalSuratAcara
                          ? new Date(`${tanggalSuratAcara}T12:00:00`).toLocaleDateString(
                              'id-ID',
                              {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              }
                            )
                          : '-'}
                      </div>
                      <div>
                        <strong>{jenisSurat === 'Khutbah Jumat' ? 'Waktu Jumat' : 'Waktu'}</strong>{' '}
                        : {waktuSuratAcara}
                      </div>
                      <div>
                        <strong>Tempat</strong> : {tempatSuratAcara}
                      </div>
                      <div>
                        <strong>Agenda</strong> : {agendaSurat}
                      </div>
                    </div>

                    <p>
                      Demikian surat permohonan ini kami sampaikan. Atas perhatian dan kehadiran
                      Bapak/Ustadz, kami ucapkan <em>Jazakumullahu Khairan Katsiran</em>.
                    </p>
                    <p>
                      <em>Wassalamu&apos;alaikum Warahmatullahi Wabarakatuh.</em>
                    </p>

                    <div className={styles.suratSignRow}>
                      <div>
                        <span>
                          Karawang,{' '}
                          {new Date().toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        <br />
                        <strong>Ketua DKM Masjid Al-Jihad Karawang</strong>
                        <div
                          style={{
                            position: 'relative',
                            marginTop: '-10px',
                            marginBottom: '-24px',
                            zIndex: 2,
                            pointerEvents: 'none',
                          }}
                        >
                          <Image
                            src={ttdDkm}
                            alt="TTD Ketua DKM Masjid Al-Jihad"
                            width={ttdDkm.width}
                            height={ttdDkm.height}
                            style={{
                              width: '185px',
                              height: 'auto',
                              margin: '0 auto',
                              objectFit: 'contain',
                            }}
                          />
                        </div>
                        <strong style={{ position: 'relative', zIndex: 1 }}>
                          <u>Drs. H. Acep Kusnadi, M.Pd., C.Med.</u>
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '18px',
                    padding: '14px',
                    borderRadius: '12px',
                    background: '#f6faf7',
                    border: '1px solid rgba(27, 107, 69, 0.2)',
                  }}
                >
                  <strong
                    style={{
                      display: 'block',
                      color: '#0f4a2a',
                      fontSize: '0.88rem',
                      marginBottom: '8px',
                    }}
                  >
                    Template Pesan Pengantar WhatsApp (Simple &amp; Formal)
                  </strong>
                  <textarea
                    readOnly
                    rows={8}
                    value={getSuratWaText()}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(27, 107, 69, 0.18)',
                      background: '#ffffff',
                      color: '#1e293b',
                      fontSize: '0.8rem',
                      lineHeight: 1.5,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* MENU 8: UPLOAD KITAB EL JIHAD */}
            <div
              className={styles.panelCard}
              style={{ display: activeTab === 'kitab_eljihad' ? 'block' : 'none' }}
            >
              <h2 className={styles.panelTitle}>Upload Kitab Digital (Menu El Jihad)</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (getActiveSupabaseConfig().isConfigured) {
                    await getSupabaseClient().from('kitab_eljihad').insert({
                      judul_kitab: judulKitab,
                      penulis_ulama: penulisKitab,
                      kategori_kitab: kategoriKitab,
                      file_pdf_url: filePdfUrl,
                      aktif: true,
                    })
                  }
                  setSuccessMsg(`Kitab "${judulKitab}" berhasil disimpan ke koleksi El Jihad!`)
                  setJudulKitab('')
                  setPenulisKitab('')
                  setFilePdfUrl('')
                }}
              >
                <div className={styles.twoCols}>
                  <div className={styles.formGroup}>
                    <label>Judul Kitab Kajian</label>
                    <input
                      type="text"
                      required
                      value={judulKitab}
                      onChange={(e) => setJudulKitab(e.target.value)}
                      placeholder="Contoh: Kitab Bulughul Maram"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Penulis / Ulama</label>
                    <input
                      type="text"
                      value={penulisKitab}
                      onChange={(e) => setPenulisKitab(e.target.value)}
                      placeholder="Contoh: Ibnu Hajar Al-Asqalani"
                    />
                  </div>
                </div>
                <div className={styles.twoCols}>
                  <div className={styles.formGroup}>
                    <label>Kategori Kitab</label>
                    <select
                      value={kategoriKitab}
                      onChange={(e) => setKategoriKitab(e.target.value)}
                    >
                      <option value="Fiqih & Ibadah">Fiqih &amp; Ibadah</option>
                      <option value="Hadits & Sunnah">Hadits &amp; Sunnah</option>
                      <option value="Tafsir Al-Quran">Tafsir Al-Quran</option>
                      <option value="Akhlak & Tasawuf">Akhlak &amp; Tasawuf</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>URL File PDF Kitab (atau Upload ke Cloudinary)</label>
                    <input
                      type="url"
                      required
                      value={filePdfUrl}
                      onChange={(e) => setFilePdfUrl(e.target.value)}
                      placeholder="https://.../kitab.pdf"
                    />
                    <input
                      type="file"
                      accept="application/pdf"
                      disabled={cloudinaryUploading === 'kitab'}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const url = await uploadFileToCloudinary(
                          file,
                          'masjid-aljihad/kitab',
                          'raw',
                          'kitab'
                        )
                        if (url) setFilePdfUrl(url)
                      }}
                      style={{ marginTop: '6px' }}
                    />
                    {cloudinaryUploading === 'kitab' && (
                      <span className={styles.itemMeta} style={{ color: '#b45309' }}>
                        Mengunggah PDF Kitab ke Cloudinary...
                      </span>
                    )}
                  </div>
                </div>
                <button type="submit" className={styles.submitBtn}>
                  Simpan Kitab ke El Jihad
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

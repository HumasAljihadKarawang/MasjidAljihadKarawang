import type { LaporanKeuanganItem } from './masjidStore'

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

const NAMA_HARI = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function formatRupiah(nominal: number): string {
  const n = Number.isFinite(nominal) ? Math.max(0, Math.round(nominal)) : 0
  return 'Rp ' + n.toLocaleString('id-ID')
}

export function formatTanggalIndo(isoDate: string): string {
  const clean = (isoDate || '').slice(0, 10)
  const parts = clean.split('-')
  if (parts.length !== 3) return clean || '-'
  const y = Number(parts[0])
  const m = Number(parts[1]) - 1
  const d = Number(parts[2])
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d) || !NAMA_BULAN[m]) return clean
  return `${d} ${NAMA_BULAN[m]} ${y}`
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || ''
  const binStr = window.atob(base64)
  const len = binStr.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binStr.charCodeAt(i)
  }
  return bytes
}

/**
 * Membungkus kumpulan halaman Canvas (JPEG) menjadi file PDF-1.4 A4 standar yang langsung bisa diunduh.
 */
function buildPdfFromCanvasPages(
  pages: Array<{ jpegBytes: Uint8Array; widthPx: number; heightPx: number }>
): Blob {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const offsets: number[] = [0] // index 0 reserved for free object
  let currentLength = 0

  const pushStr = (s: string) => {
    const arr = encoder.encode(s)
    chunks.push(arr)
    currentLength += arr.length
  }

  const pushBytes = (arr: Uint8Array) => {
    chunks.push(arr)
    currentLength += arr.length
  }

  const startObj = (objNum: number) => {
    offsets[objNum] = currentLength
    pushStr(`${objNum} 0 obj\n`)
  }

  const endObj = () => {
    pushStr('\nendobj\n')
  }

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n')

  // Object 1: Catalog
  startObj(1)
  pushStr('<< /Type /Catalog /Pages 2 0 R >>')
  endObj()

  // Each page uses 3 objects: Page (3 + i*3), Content (4 + i*3), Image XObject (5 + i*3)
  const pageObjIds = pages.map((_, idx) => 3 + idx * 3)

  // Object 2: Pages
  startObj(2)
  pushStr(
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${
      pages.length
    } >>`
  )
  endObj()

  const pageWidthPt = 595.28
  const pageHeightPt = 841.89

  pages.forEach((pg, idx) => {
    const pageObjId = 3 + idx * 3
    const contentObjId = 4 + idx * 3
    const imgObjId = 5 + idx * 3

    // Page Object
    startObj(pageObjId)
    pushStr(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Resources << /XObject << /Im${idx} ${imgObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>`
    )
    endObj()

    // Content Stream
    const contentStream = `q\n${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm\n/Im${idx} Do\nQ\n`
    const contentBytes = encoder.encode(contentStream)
    startObj(contentObjId)
    pushStr(`<< /Length ${contentBytes.length} >>\nstream\n`)
    pushBytes(contentBytes)
    pushStr('\nendstream')
    endObj()

    // Image XObject (DCTDecode = standard JPEG)
    startObj(imgObjId)
    pushStr(
      `<< /Type /XObject /Subtype /Image /Width ${pg.widthPx} /Height ${pg.heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpegBytes.length} >>\nstream\n`
    )
    pushBytes(pg.jpegBytes)
    pushStr('\nendstream')
    endObj()
  })

  const totalObjs = 2 + pages.length * 3
  const xrefOffset = currentLength

  pushStr(`xref\n0 ${totalObjs + 1}\n`)
  pushStr('0000000000 65535 f \n')
  for (let i = 1; i <= totalObjs; i++) {
    const off = String(offsets[i] || 0).padStart(10, '0')
    pushStr(`${off} 00000 n \n`)
  }

  pushStr(
    `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  )

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' })
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function drawKopSurat(
  ctx: CanvasRenderingContext2D,
  width: number,
  judulLaporan: string,
  subJudulPeriode: string
): number {
  // Background putih bersih
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, 1754)

  // Pita atas hijau zamrud & aksen emas
  ctx.fillStyle = '#0f4a2a'
  ctx.fillRect(0, 0, width, 18)
  ctx.fillStyle = '#d4a843'
  ctx.fillRect(0, 18, width, 5)

  // Header Kop DKM
  ctx.fillStyle = '#0f4a2a'
  ctx.font = 'bold 28px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('DEWAN KEMAKMURAN MASJID (DKM)', width / 2, 70)

  ctx.fillStyle = '#14532d'
  ctx.font = 'bold 34px Arial, sans-serif'
  ctx.fillText('MASJID RAYA AL-JIHAD KARAWANG', width / 2, 112)

  ctx.fillStyle = '#4b5563'
  ctx.font = '18px Arial, sans-serif'
  ctx.fillText(
    'Jl. Jend. Ahmad Yani (Islamic Center), Kabupaten Karawang, Jawa Barat',
    width / 2,
    144
  )

  // Garis ganda bawah kop
  ctx.strokeStyle = '#0f4a2a'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(70, 166)
  ctx.lineTo(width - 70, 166)
  ctx.stroke()

  ctx.strokeStyle = '#d4a843'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(70, 172)
  ctx.lineTo(width - 70, 172)
  ctx.stroke()

  // Judul Laporan
  ctx.fillStyle = '#111827'
  ctx.font = 'bold 26px Arial, sans-serif'
  ctx.fillText(judulLaporan.toUpperCase(), width / 2, 218)

  ctx.fillStyle = '#166534'
  ctx.font = 'bold 19px Arial, sans-serif'
  ctx.fillText(subJudulPeriode, width / 2, 248)

  ctx.textAlign = 'left'
  return 276
}

function truncateTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  const clean = (text || '').trim()
  if (ctx.measureText(clean).width <= maxWidth) return clean
  let low = 0
  let high = clean.length
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    const candidate = clean.slice(0, mid) + '...'
    if (ctx.measureText(candidate).width <= maxWidth) {
      low = mid
    } else {
      high = mid - 1
    }
  }
  return clean.slice(0, Math.max(1, low)) + '...'
}

function drawSignatureFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  startY: number
) {
  const now = new Date()
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`

  const y = Math.min(startY + 34, 1520)
  ctx.fillStyle = '#374151'
  ctx.font = '17px Arial, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`Dicetak di Karawang, ${formatTanggalIndo(todayIso)}`, width - 75, y)

  const colLeftX = 240
  const colRightX = width - 240
  ctx.textAlign = 'center'
  ctx.fillStyle = '#111827'
  ctx.font = 'bold 18px Arial, sans-serif'
  ctx.fillText('Mengetahui,', colLeftX, y + 36)
  ctx.fillText('Ketua DKM Masjid Al-Jihad', colLeftX, y + 60)

  ctx.fillText('Dibuat Oleh,', colRightX, y + 36)
  ctx.fillText('Bendahara DKM Masjid Al-Jihad', colRightX, y + 60)

  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(colLeftX - 120, y + 165)
  ctx.lineTo(colLeftX + 120, y + 165)
  ctx.moveTo(colRightX - 120, y + 165)
  ctx.lineTo(colRightX + 120, y + 165)
  ctx.stroke()

  ctx.fillStyle = '#6b7280'
  ctx.font = '15px Arial, sans-serif'
  ctx.fillText('( Tanda Tangan & Stempel )', colLeftX, y + 188)
  ctx.fillText('( Tanda Tangan & Stempel )', colRightX, y + 188)
  ctx.textAlign = 'left'
}

/**
 * Ekspor PDF Laporan Mingguan Pengeluaran Masjid Al-Jihad Karawang.
 * Menampilkan tabel 7 hari (termasuk baris hari yang kosong) dan tabel rincian per pengeluaran.
 */
export function exportLaporanMingguanPdf(options: {
  startDateIso: string
  endDateIso: string
  items: LaporanKeuanganItem[]
}) {
  const W = 1240
  const H = 1754
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const sorted = [...options.items].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  const totalPengeluaran = sorted.reduce((acc, it) => acc + (Number(it.nominal) || 0), 0)

  let y = drawKopSurat(
    ctx,
    W,
    'Laporan Keuangan Mingguan Masjid',
    `Periode Minggu: ${formatTanggalIndo(options.startDateIso)} s/d ${formatTanggalIndo(
      options.endDateIso
    )}`
  )

  // Kotak Ringkasan Mingguan
  ctx.fillStyle = '#f0fdf4'
  ctx.strokeStyle = '#15803d'
  ctx.lineWidth = 1.8
  ctx.fillRect(70, y, W - 140, 74)
  ctx.strokeRect(70, y, W - 140, 74)

  ctx.fillStyle = '#14532d'
  ctx.font = 'bold 19px Arial, sans-serif'
  ctx.fillText(`Jumlah Transaksi Pengeluaran: ${sorted.length} Transaksi`, 94, y + 30)
  ctx.fillStyle = '#4b5563'
  ctx.font = '16px Arial, sans-serif'
  ctx.fillText(
    'Rekapitulasi pengeluaran operasional & kegiatan Masjid Al-Jihad Karawang.',
    94,
    y + 55
  )

  ctx.textAlign = 'right'
  ctx.fillStyle = '#991b1b'
  ctx.font = 'bold 24px Arial, sans-serif'
  ctx.fillText(`Total Pengeluaran: ${formatRupiah(totalPengeluaran)}`, W - 94, y + 45)
  ctx.textAlign = 'left'

  y += 98

  // TABEL 1: REKAPITULASI HARIAN (7 HARI DALAM MINGGU TERSEBUT — HARI KOSONG TETAP TAMPIL)
  ctx.fillStyle = '#0f4a2a'
  ctx.font = 'bold 20px Arial, sans-serif'
  ctx.fillText('A. Tabel Rekapitulasi Harian (7 Hari)', 70, y)
  y += 14

  const dayCols = [
    { label: 'No', w: 60 },
    { label: 'Hari & Tanggal', w: 280 },
    { label: 'Jumlah Item', w: 160 },
    { label: 'Ringkasan Keperluan / Kategori', w: 400 },
    { label: 'Subtotal Pengeluaran', w: 200 },
  ]

  // Header Tabel Harian
  ctx.fillStyle = '#0f4a2a'
  ctx.fillRect(70, y, W - 140, 38)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px Arial, sans-serif'
  let curX = 70
  for (const col of dayCols) {
    ctx.fillText(col.label, curX + 10, y + 25)
    curX += col.w
  }
  y += 38

  const startDt = new Date(options.startDateIso + 'T00:00:00')
  for (let dIdx = 0; dIdx < 7; dIdx++) {
    const dt = new Date(startDt)
    dt.setDate(startDt.getDate() + dIdx)
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
      dt.getDate()
    ).padStart(2, '0')}`
    const dayName = NAMA_HARI[dt.getDay()] || ''
    const dayItems = sorted.filter((it) => it.tanggal === iso)
    const daySubtotal = dayItems.reduce((acc, it) => acc + (Number(it.nominal) || 0), 0)
    const summaryText =
      dayItems.length > 0
        ? dayItems.map((it) => it.uraian).join(', ')
        : '-'

    ctx.fillStyle = dIdx % 2 === 0 ? '#ffffff' : '#f9fafb'
    ctx.fillRect(70, y, W - 140, 34)
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    ctx.strokeRect(70, y, W - 140, 34)

    ctx.fillStyle = dayItems.length > 0 ? '#111827' : '#6b7280'
    ctx.font = dayItems.length > 0 ? 'bold 15px Arial, sans-serif' : '15px Arial, sans-serif'

    let cx = 70
    ctx.fillText(String(dIdx + 1), cx + 12, y + 22)
    cx += dayCols[0].w
    ctx.fillText(`${dayName}, ${formatTanggalIndo(iso)}`, cx + 10, y + 22)
    cx += dayCols[1].w
    ctx.fillText(dayItems.length > 0 ? `${dayItems.length} pengeluaran` : '-', cx + 10, y + 22)
    cx += dayCols[2].w
    ctx.font = '15px Arial, sans-serif'
    ctx.fillText(truncateTextToWidth(ctx, summaryText, dayCols[3].w - 20), cx + 10, y + 22)
    cx += dayCols[3].w
    ctx.font = dayItems.length > 0 ? 'bold 15px Arial, sans-serif' : '15px Arial, sans-serif'
    ctx.fillText(daySubtotal > 0 ? formatRupiah(daySubtotal) : '-', cx + 10, y + 22)

    y += 34
  }

  y += 34

  // TABEL 2: RINCIAN PER PENGELUARAN MINGGUAN
  ctx.fillStyle = '#0f4a2a'
  ctx.font = 'bold 20px Arial, sans-serif'
  ctx.fillText('B. Rincian Pencatatan Per Pengeluaran', 70, y)
  y += 14

  const detailCols = [
    { label: 'No', w: 55 },
    { label: 'Tanggal', w: 145 },
    { label: 'Kategori', w: 215 },
    { label: 'Uraian Pengeluaran', w: 345 },
    { label: 'PJ / Penerima', w: 150 },
    { label: 'Nominal (Rp)', w: 190 },
  ]

  ctx.fillStyle = '#0f4a2a'
  ctx.fillRect(70, y, W - 140, 38)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px Arial, sans-serif'
  curX = 70
  for (const col of detailCols) {
    ctx.fillText(col.label, curX + 10, y + 25)
    curX += col.w
  }
  y += 38

  const minRows = Math.max(sorted.length, 8)
  const maxRowsPage1 = Math.min(minRows, 16)

  for (let r = 0; r < maxRowsPage1; r++) {
    const item = sorted[r]
    ctx.fillStyle = r % 2 === 0 ? '#ffffff' : '#f9fafb'
    ctx.fillRect(70, y, W - 140, 34)
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    ctx.strokeRect(70, y, W - 140, 34)

    let cx = 70
    if (item) {
      ctx.fillStyle = '#111827'
      ctx.font = '15px Arial, sans-serif'
      ctx.fillText(String(r + 1), cx + 10, y + 22)
      cx += detailCols[0].w
      ctx.fillText(item.tanggal, cx + 10, y + 22)
      cx += detailCols[1].w
      ctx.fillText(truncateTextToWidth(ctx, item.kategori, detailCols[2].w - 16), cx + 10, y + 22)
      cx += detailCols[2].w
      ctx.fillText(truncateTextToWidth(ctx, item.uraian, detailCols[3].w - 16), cx + 10, y + 22)
      cx += detailCols[3].w
      ctx.fillText(
        truncateTextToWidth(ctx, item.penanggungJawab || 'DKM', detailCols[4].w - 16),
        cx + 10,
        y + 22
      )
      cx += detailCols[4].w
      ctx.font = 'bold 15px Arial, sans-serif'
      ctx.fillText(formatRupiah(item.nominal), cx + 10, y + 22)
    } else {
      // Baris tabel kosong tetap digambar rapi
      ctx.fillStyle = '#9ca3af'
      ctx.font = '15px Arial, sans-serif'
      ctx.fillText(String(r + 1), cx + 10, y + 22)
      cx += detailCols[0].w
      ctx.fillText('-', cx + 10, y + 22)
      cx += detailCols[1].w
      ctx.fillText('-', cx + 10, y + 22)
      cx += detailCols[2].w
      ctx.fillText('-', cx + 10, y + 22)
      cx += detailCols[3].w
      ctx.fillText('-', cx + 10, y + 22)
      cx += detailCols[4].w
      ctx.fillText('-', cx + 10, y + 22)
    }
    y += 34
  }

  // Baris Total
  ctx.fillStyle = '#dcfce7'
  ctx.fillRect(70, y, W - 140, 40)
  ctx.strokeStyle = '#15803d'
  ctx.lineWidth = 1.5
  ctx.strokeRect(70, y, W - 140, 40)

  ctx.fillStyle = '#0f4a2a'
  ctx.font = 'bold 17px Arial, sans-serif'
  ctx.fillText('TOTAL PENGELUARAN MINGGUAN', 84, y + 26)
  ctx.textAlign = 'right'
  ctx.fillText(formatRupiah(totalPengeluaran), W - 84, y + 26)
  ctx.textAlign = 'left'

  y += 40
  drawSignatureFooter(ctx, W, y)

  const jpegBytes = dataUrlToUint8Array(canvas.toDataURL('image/jpeg', 0.94))
  const pdfBlob = buildPdfFromCanvasPages([{ jpegBytes, widthPx: W, heightPx: H }])
  triggerBlobDownload(
    pdfBlob,
    `Laporan-Keuangan-Mingguan-Al-Jihad-${options.startDateIso}-sd-${options.endDateIso}.pdf`
  )
}

/**
 * Ekspor PDF Laporan Bulanan Pengeluaran Masjid Al-Jihad Karawang.
 * Dapat diekspor kapan saja walau belum akhir bulan (minggu/baris yang belum terisi tetap tampil sebagai tabel kosong).
 */
export function exportLaporanBulananPdf(options: {
  year: number
  monthIndex: number // 0-11
  items: LaporanKeuanganItem[]
}) {
  const W = 1240
  const H = 1754
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const monthName = NAMA_BULAN[options.monthIndex] || 'Bulan'
  const daysInMonth = new Date(options.year, options.monthIndex + 1, 0).getDate()
  const monthPrefix = `${options.year}-${String(options.monthIndex + 1).padStart(2, '0')}`

  const sorted = [...options.items]
    .filter((it) => it.tanggal.startsWith(monthPrefix))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))

  const totalPengeluaran = sorted.reduce((acc, it) => acc + (Number(it.nominal) || 0), 0)

  const now = new Date()
  const isCurrentOrFutureMonth =
    options.year > now.getFullYear() ||
    (options.year === now.getFullYear() &&
      (options.monthIndex > now.getMonth() ||
        (options.monthIndex === now.getMonth() && now.getDate() < daysInMonth)))

  const statusPeriodeText = isCurrentOrFutureMonth
    ? `Bulan ${monthName} ${options.year} (Rekap Berjalan s/d Tanggal Cetak — Termasuk Slot Minggu Kosong)`
    : `Bulan ${monthName} ${options.year} (Rekapitulasi Bulan Penuh 1–${daysInMonth} ${monthName})`

  let y = drawKopSurat(
    ctx,
    W,
    'Laporan Keuangan Bulanan Masjid',
    statusPeriodeText
  )

  // Kotak Ringkasan Bulanan
  ctx.fillStyle = '#f0fdf4'
  ctx.strokeStyle = '#15803d'
  ctx.lineWidth = 1.8
  ctx.fillRect(70, y, W - 140, 74)
  ctx.strokeRect(70, y, W - 140, 74)

  ctx.fillStyle = '#14532d'
  ctx.font = 'bold 19px Arial, sans-serif'
  ctx.fillText(
    `Total Catatan Pengeluaran Bulan ${monthName}: ${sorted.length} Transaksi`,
    94,
    y + 30
  )
  ctx.fillStyle = '#4b5563'
  ctx.font = '16px Arial, sans-serif'
  ctx.fillText(
    isCurrentOrFutureMonth
      ? 'Diekspor sebelum akhir bulan; minggu/tanggal yang belum berjalan tetap ditampilkan pada tabel.'
      : 'Laporan rekapitulasi pengeluaran bulanan resmi DKM Masjid Al-Jihad Karawang.',
    94,
    y + 55
  )

  ctx.textAlign = 'right'
  ctx.fillStyle = '#991b1b'
  ctx.font = 'bold 24px Arial, sans-serif'
  ctx.fillText(`Total Pengeluaran: ${formatRupiah(totalPengeluaran)}`, W - 94, y + 45)
  ctx.textAlign = 'left'

  y += 98

  // TABEL 1: REKAPITULASI PER MINGGU DALAM 1 BULAN (MINGGU 1 S/D MINGGU 5 — MINGGU KOSONG TETAP TAMPIL)
  ctx.fillStyle = '#0f4a2a'
  ctx.font = 'bold 20px Arial, sans-serif'
  ctx.fillText(
    `A. Tabel Rekapitulasi Mingguan Bulan ${monthName} ${options.year} (Minggu 1 – Minggu 5)`,
    70,
    y
  )
  y += 14

  const weekRanges = [
    { label: 'Minggu Ke-1', startDay: 1, endDay: 7 },
    { label: 'Minggu Ke-2', startDay: 8, endDay: 14 },
    { label: 'Minggu Ke-3', startDay: 15, endDay: 21 },
    { label: 'Minggu Ke-4', startDay: 22, endDay: 28 },
    { label: 'Minggu Ke-5', startDay: 29, endDay: daysInMonth },
  ]

  const weekCols = [
    { label: 'Minggu', w: 150 },
    { label: 'Rentang Tanggal', w: 230 },
    { label: 'Jumlah Transaksi', w: 170 },
    { label: 'Keterangan / Status Pencatatan', w: 340 },
    { label: 'Subtotal Pengeluaran', w: 210 },
  ]

  ctx.fillStyle = '#0f4a2a'
  ctx.fillRect(70, y, W - 140, 38)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px Arial, sans-serif'
  let curX = 70
  for (const col of weekCols) {
    ctx.fillText(col.label, curX + 10, y + 25)
    curX += col.w
  }
  y += 38

  weekRanges.forEach((wk, wIdx) => {
    const validRange = wk.startDay <= wk.endDay
    const wkItems = validRange
      ? sorted.filter((it) => {
          const dayNum = Number(it.tanggal.slice(8, 10))
          return dayNum >= wk.startDay && dayNum <= wk.endDay
        })
      : []
    const wkTotal = wkItems.reduce((acc, it) => acc + (Number(it.nominal) || 0), 0)

    ctx.fillStyle = wIdx % 2 === 0 ? '#ffffff' : '#f9fafb'
    ctx.fillRect(70, y, W - 140, 36)
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    ctx.strokeRect(70, y, W - 140, 36)

    let cx = 70
    ctx.fillStyle = wkItems.length > 0 ? '#111827' : '#6b7280'
    ctx.font = 'bold 15px Arial, sans-serif'
    ctx.fillText(wk.label, cx + 10, y + 23)
    cx += weekCols[0].w

    ctx.font = '15px Arial, sans-serif'
    ctx.fillText(
      validRange ? `${wk.startDay} – ${wk.endDay} ${monthName} ${options.year}` : '-',
      cx + 10,
      y + 23
    )
    cx += weekCols[1].w

    ctx.fillText(
      wkItems.length > 0 ? `${wkItems.length} Pengeluaran` : '0 (Kosong)',
      cx + 10,
      y + 23
    )
    cx += weekCols[2].w

    const statusNote =
      wkItems.length > 0
        ? truncateTextToWidth(
            ctx,
            wkItems.map((i) => i.uraian).join(', '),
            weekCols[3].w - 18
          )
        : 'Belum ada catatan pengeluaran / Minggu belum berjalan'
    ctx.fillText(statusNote, cx + 10, y + 23)
    cx += weekCols[3].w

    ctx.font = wkItems.length > 0 ? 'bold 15px Arial, sans-serif' : '15px Arial, sans-serif'
    ctx.fillText(wkTotal > 0 ? formatRupiah(wkTotal) : '-', cx + 10, y + 23)

    y += 36
  })

  y += 32

  // TABEL 2: RINCIAN PENCATATAN PER PENGELUARAN BULANAN (TERMASUK BARIS KOSONG JIKA BELUM AKHIR BULAN)
  ctx.fillStyle = '#0f4a2a'
  ctx.font = 'bold 20px Arial, sans-serif'
  ctx.fillText(
    `B. Tabel Rincian Pencatatan Per Pengeluaran Bulan ${monthName} ${options.year}`,
    70,
    y
  )
  y += 14

  const detailCols = [
    { label: 'No', w: 55 },
    { label: 'Tanggal', w: 145 },
    { label: 'Kategori', w: 215 },
    { label: 'Uraian Pengeluaran', w: 345 },
    { label: 'PJ / Penerima', w: 150 },
    { label: 'Nominal (Rp)', w: 190 },
  ]

  ctx.fillStyle = '#0f4a2a'
  ctx.fillRect(70, y, W - 140, 38)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px Arial, sans-serif'
  curX = 70
  for (const col of detailCols) {
    ctx.fillText(col.label, curX + 10, y + 25)
    curX += col.w
  }
  y += 38

  // Selalu tampilkan minimal 12 baris tabel agar walaupun belum akhir bulan / masih kosong tetap berbentuk tabel lengkap
  const totalTableRows = Math.min(Math.max(sorted.length + 3, 12), 17)

  for (let r = 0; r < totalTableRows; r++) {
    const item = sorted[r]
    ctx.fillStyle = r % 2 === 0 ? '#ffffff' : '#f9fafb'
    ctx.fillRect(70, y, W - 140, 33)
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    ctx.strokeRect(70, y, W - 140, 33)

    let cx = 70
    if (item) {
      ctx.fillStyle = '#111827'
      ctx.font = '15px Arial, sans-serif'
      ctx.fillText(String(r + 1), cx + 10, y + 22)
      cx += detailCols[0].w
      ctx.fillText(item.tanggal, cx + 10, y + 22)
      cx += detailCols[1].w
      ctx.fillText(truncateTextToWidth(ctx, item.kategori, detailCols[2].w - 16), cx + 10, y + 22)
      cx += detailCols[2].w
      ctx.fillText(truncateTextToWidth(ctx, item.uraian, detailCols[3].w - 16), cx + 10, y + 22)
      cx += detailCols[3].w
      ctx.fillText(
        truncateTextToWidth(ctx, item.penanggungJawab || 'DKM', detailCols[4].w - 16),
        cx + 10,
        y + 22
      )
      cx += detailCols[4].w
      ctx.font = 'bold 15px Arial, sans-serif'
      ctx.fillText(formatRupiah(item.nominal), cx + 10, y + 22)
    } else {
      // Baris kosong pada tabel bulanan
      ctx.fillStyle = '#9ca3af'
      ctx.font = '15px Arial, sans-serif'
      ctx.fillText(String(r + 1), cx + 10, y + 22)
      cx += detailCols[0].w
      ctx.fillText('', cx + 10, y + 22)
      cx += detailCols[1].w
      ctx.fillText('', cx + 10, y + 22)
      cx += detailCols[2].w
      ctx.fillText('', cx + 10, y + 22)
      cx += detailCols[3].w
      ctx.fillText('', cx + 10, y + 22)
      cx += detailCols[4].w
      ctx.fillText('', cx + 10, y + 22)
    }

    // Garis pemisah kolom vertikal agar tabel kosong terlihat jelas kotak-kotaknya
    let vX = 70
    ctx.strokeStyle = '#e5e7eb'
    for (let c = 0; c < detailCols.length - 1; c++) {
      vX += detailCols[c].w
      ctx.beginPath()
      ctx.moveTo(vX, y)
      ctx.lineTo(vX, y + 33)
      ctx.stroke()
    }

    y += 33
  }

  // Baris Total Bulanan
  ctx.fillStyle = '#dcfce7'
  ctx.fillRect(70, y, W - 140, 40)
  ctx.strokeStyle = '#15803d'
  ctx.lineWidth = 1.5
  ctx.strokeRect(70, y, W - 140, 40)

  ctx.fillStyle = '#0f4a2a'
  ctx.font = 'bold 17px Arial, sans-serif'
  ctx.fillText(
    `TOTAL PENGELUARAN BULAN ${monthName.toUpperCase()} ${options.year}`,
    84,
    y + 26
  )
  ctx.textAlign = 'right'
  ctx.fillText(formatRupiah(totalPengeluaran), W - 84, y + 26)
  ctx.textAlign = 'left'

  y += 40
  drawSignatureFooter(ctx, W, y)

  const jpegBytes = dataUrlToUint8Array(canvas.toDataURL('image/jpeg', 0.94))
  const pdfBlob = buildPdfFromCanvasPages([{ jpegBytes, widthPx: W, heightPx: H }])
  triggerBlobDownload(
    pdfBlob,
    `Laporan-Keuangan-Bulanan-Al-Jihad-${monthName}-${options.year}.pdf`
  )
}

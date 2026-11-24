import type { LaporanKeuanganItem } from './masjidStore'

export const NAMA_BULAN_BKU = [
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

export interface BkuPairedRow {
  rowNo: number
  tglMasuk: string
  uraianMasuk: string
  jumlahMasuk: number | null
  itemMasuk?: LaporanKeuanganItem
  tglKeluar: string
  uraianKeluar: string
  jumlahKeluar: number | null
  itemKeluar?: LaporanKeuanganItem
  isBlankRow?: boolean
}

export function formatRupiah(nominal: number): string {
  const n = Number.isFinite(nominal) ? Math.round(nominal) : 0
  if (n < 0) {
    return '-Rp ' + Math.abs(n).toLocaleString('id-ID')
  }
  return 'Rp ' + n.toLocaleString('id-ID')
}

export function formatAngkaTitik(nominal: number): string {
  const n = Number.isFinite(nominal) ? Math.round(Math.abs(nominal)) : 0
  return n.toLocaleString('id-ID')
}

export function formatTanggalSlash(isoDate: string): string {
  const clean = (isoDate || '').slice(0, 10)
  const parts = clean.split('-')
  if (parts.length !== 3) return clean
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export function formatTanggalIndo(isoDate: string): string {
  const clean = (isoDate || '').slice(0, 10)
  const parts = clean.split('-')
  if (parts.length !== 3) return clean || '-'
  const y = Number(parts[0])
  const m = Number(parts[1]) - 1
  const d = Number(parts[2])
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d) || !NAMA_BULAN_BKU[m]) return clean
  return `${d} ${NAMA_BULAN_BKU[m]} ${y}`
}

/**
 * Menyusun data transaksi menjadi baris berdampingan BKU (PEMASUKAN di kiri, PENGELUARAN di kanan)
 * dikelompokkan per tanggal sesuai format asli BKU Masjid Al-Jihad Karawang,
 * serta menambahkan baris kosong jika belum akhir bulan / data sedikit.
 */
export function buildBkuPairedRows(
  items: LaporanKeuanganItem[],
  minTotalRows = 16
): BkuPairedRow[] {
  const sorted = [...items].sort(
    (a, b) => a.tanggal.localeCompare(b.tanggal) || a.createdAt.localeCompare(b.createdAt)
  )

  const uniqueDates = Array.from(new Set(sorted.map((it) => it.tanggal))).sort()
  const rows: BkuPairedRow[] = []
  let counter = 1

  for (const dateIso of uniqueDates) {
    const masukList = sorted.filter(
      (it) => it.tanggal === dateIso && it.jenis === 'Pemasukan'
    )
    const keluarList = sorted.filter(
      (it) => it.tanggal === dateIso && it.jenis !== 'Pemasukan'
    )
    const maxLen = Math.max(masukList.length, keluarList.length)
    const dateSlash = formatTanggalSlash(dateIso)

    for (let i = 0; i < maxLen; i++) {
      const m = masukList[i]
      const k = keluarList[i]
      rows.push({
        rowNo: counter++,
        tglMasuk: i === 0 && masukList.length > 0 ? dateSlash : '',
        uraianMasuk: m ? m.uraian : '',
        jumlahMasuk: m ? m.nominal : null,
        itemMasuk: m,
        tglKeluar: i === 0 && keluarList.length > 0 ? dateSlash : '',
        uraianKeluar: k ? k.uraian : '',
        jumlahKeluar: k ? k.nominal : null,
        itemKeluar: k,
      })
    }
  }

  // Tambahkan baris kosong agar walau belum akhir bulan / tabel belum penuh tetap tercetak rapi
  const targetRows = Math.max(minTotalRows, rows.length + 2)
  while (rows.length < targetRows) {
    rows.push({
      rowNo: counter++,
      tglMasuk: '',
      uraianMasuk: '',
      jumlahMasuk: null,
      tglKeluar: '',
      uraianKeluar: '',
      jumlahKeluar: null,
      isBlankRow: true,
    })
  }

  return rows
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
 * Membungkus kumpulan halaman Canvas menjadi file PDF-1.4 ukuran kertas A4 standar (595.28 x 841.89 pt).
 */
function buildPdfFromCanvasPages(
  pages: Array<{ jpegBytes: Uint8Array; widthPx: number; heightPx: number }>
): Blob {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const offsets: number[] = [0]
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

  startObj(1)
  pushStr('<< /Type /Catalog /Pages 2 0 R >>')
  endObj()

  const pageObjIds = pages.map((_, idx) => 3 + idx * 3)

  startObj(2)
  pushStr(
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${
      pages.length
    } >>`
  )
  endObj()

  // Ukuran Kertas A4 (595.28 x 841.89 pt)
  const pageWidthPt = 595.28
  const pageHeightPt = 841.89

  pages.forEach((pg, idx) => {
    const pageObjId = 3 + idx * 3
    const contentObjId = 4 + idx * 3
    const imgObjId = 5 + idx * 3

    startObj(pageObjId)
    pushStr(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Resources << /XObject << /Im${idx} ${imgObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>`
    )
    endObj()

    const contentStream = `q\n${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm\n/Im${idx} Do\nQ\n`
    const contentBytes = encoder.encode(contentStream)
    startObj(contentObjId)
    pushStr(`<< /Length ${contentBytes.length} >>\nstream\n`)
    pushBytes(contentBytes)
    pushStr('\nendstream')
    endObj()

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

function loadOptionalImage(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/**
 * Menggambar KOP Surat Resmi DKM Masjid Raya Al-Jihad Karawang pada halaman pertama A4
 */
function drawKopBkuA4(
  ctx: CanvasRenderingContext2D,
  width: number,
  logoImg: HTMLImageElement | null
): number {
  const marginX = 56

  // Pita aksen atas
  ctx.fillStyle = '#0f4a2a'
  ctx.fillRect(0, 0, width, 14)
  ctx.fillStyle = '#d4a843'
  ctx.fillRect(0, 14, width, 4)

  // Logo Masjid di sisi kiri KOP (jika tersedia)
  if (logoImg) {
    const targetH = 88
    const ratio = (logoImg.width || 1) / (logoImg.height || 1)
    const targetW = Math.min(130, targetH * ratio)
    ctx.drawImage(logoImg, marginX + 10, 34, targetW, targetH)
  }

  const textCenterX = logoImg ? width / 2 + 28 : width / 2
  ctx.textAlign = 'center'

  ctx.fillStyle = '#0f4a2a'
  ctx.font = 'bold 22px Arial, sans-serif'
  ctx.fillText('DEWAN KEMAKMURAN MASJID (DKM)', textCenterX, 56)

  ctx.fillStyle = '#111827'
  ctx.font = 'bold 30px Arial, sans-serif'
  ctx.fillText('MASJID RAYA AL-JIHAD KARAWANG', textCenterX, 92)

  ctx.fillStyle = '#374151'
  ctx.font = '15px Arial, sans-serif'
  ctx.fillText(
    'Jl. Jend. Ahmad Yani (Islamic Center), Kabupaten Karawang, Jawa Barat • Telp/WA: 0851-1155-6563',
    textCenterX,
    118
  )

  // Garis Kop Ganda
  ctx.strokeStyle = '#0f4a2a'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(marginX, 134)
  ctx.lineTo(width - marginX, 134)
  ctx.stroke()

  ctx.strokeStyle = '#d4a843'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(marginX, 139)
  ctx.lineTo(width - marginX, 139)
  ctx.stroke()

  ctx.textAlign = 'left'
  return 154
}

/**
 * Menggambar Header Tabel BKU (Judul BKU + Header PEMASUKAN | PENGELUARAN + Sub-kolom)
 */
function drawBkuTableHeader(
  ctx: CanvasRenderingContext2D,
  marginX: number,
  tableW: number,
  startY: number,
  judulBkuLine1: string,
  judulBkuLine2: string,
  includeTitleBox: boolean,
  cols: {
    no: number
    tglMasuk: number
    uraianMasuk: number
    jmlMasuk: number
    tglKeluar: number
    uraianKeluar: number
    jmlKeluar: number
  }
): number {
  let y = startY

  if (includeTitleBox) {
    const titleBoxH = 82
    ctx.fillStyle = '#f8faf8'
    ctx.fillRect(marginX, y, tableW, titleBoxH)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 2.4
    ctx.strokeRect(marginX, y, tableW, titleBoxH)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 23px Arial, sans-serif'
    ctx.fillText(judulBkuLine1.toUpperCase(), marginX + tableW / 2, y + 34)

    ctx.fillStyle = '#0f4a2a'
    ctx.font = 'bold 21px Arial, sans-serif'
    ctx.fillText(judulBkuLine2.toUpperCase(), marginX + tableW / 2, y + 64)
    ctx.textAlign = 'left'
    y += titleBoxH
  }

  const leftGroupW = cols.no + cols.tglMasuk + cols.uraianMasuk + cols.jmlMasuk
  const rightGroupW = cols.tglKeluar + cols.uraianKeluar + cols.jmlKeluar

  // Baris Header 1: PEMASUKAN | PENGELUARAN
  const groupHeaderH = 34
  ctx.fillStyle = '#0f4a2a'
  ctx.fillRect(marginX, y, leftGroupW, groupHeaderH)
  ctx.fillStyle = '#14532d'
  ctx.fillRect(marginX + leftGroupW, y, rightGroupW, groupHeaderH)

  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 2
  ctx.strokeRect(marginX, y, leftGroupW, groupHeaderH)
  ctx.strokeRect(marginX + leftGroupW, y, rightGroupW, groupHeaderH)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 17px Arial, sans-serif'
  ctx.fillText('PEMASUKAN', marginX + leftGroupW / 2, y + 23)
  ctx.fillText('PENGELUARAN', marginX + leftGroupW + rightGroupW / 2, y + 23)

  y += groupHeaderH

  // Baris Header 2: NO | TANGGAL | URAIAN PEMASUKAN | JUMLAH | TANGGAL | URAIAN PENGELUARAN | JUMLAH
  const colHeaderH = 38
  ctx.fillStyle = '#ecfdf5'
  ctx.fillRect(marginX, y, tableW, colHeaderH)
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 1.8
  ctx.strokeRect(marginX, y, tableW, colHeaderH)

  const colDefs = [
    { label: 'NO', w: cols.no },
    { label: 'TANGGAL', w: cols.tglMasuk },
    { label: 'URAIAN PEMASUKAN', w: cols.uraianMasuk },
    { label: 'JUMLAH', w: cols.jmlMasuk },
    { label: 'TANGGAL', w: cols.tglKeluar },
    { label: 'URAIAN PENGELUARAN', w: cols.uraianKeluar },
    { label: 'JUMLAH', w: cols.jmlKeluar },
  ]

  let cx = marginX
  ctx.fillStyle = '#0f4a2a'
  ctx.font = 'bold 14px Arial, sans-serif'
  colDefs.forEach((c, idx) => {
    if (idx > 0) {
      ctx.beginPath()
      ctx.lineWidth = idx === 4 ? 2 : 1.2
      ctx.moveTo(cx, y)
      ctx.lineTo(cx, y + colHeaderH)
      ctx.stroke()
    }
    ctx.fillText(c.label, cx + c.w / 2, y + 24)
    cx += c.w
  })

  ctx.textAlign = 'left'
  return y + colHeaderH
}

function drawNominalCell(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellW: number,
  nominal: number | null,
  isBold = false
) {
  if (nominal === null || nominal === undefined) return
  ctx.font = isBold ? 'bold 14px Arial, sans-serif' : '14px Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('Rp', cellX + 8, cellY + 20)
  ctx.textAlign = 'right'
  ctx.fillText(formatAngkaTitik(nominal), cellX + cellW - 8, cellY + 20)
  ctx.textAlign = 'left'
}

/**
 * Generator utama PDF Laporan BKU Keuangan Masjid Al-Jihad Karawang (Ukuran Kertas A4 Multi-Halaman)
 */
async function renderAndDownloadBkuPdf(params: {
  filename: string
  judulLine1: string
  judulLine2: string
  items: LaporanKeuanganItem[]
  minRows: number
  labelTotalPeriode: string
  labelSaldoSebelumnya?: string
  saldoSebelumnya?: number
  logoSrc?: string
}) {
  // Ukuran A4 proporsional tajam (1240 x 1754 px)
  const W = 1240
  const H = 1754
  const marginX = 56
  const tableW = W - marginX * 2 // 1128 px

  const cols = {
    no: 46,
    tglMasuk: 108,
    uraianMasuk: 274,
    jmlMasuk: 158,
    tglKeluar: 108,
    uraianKeluar: 276,
    jmlKeluar: 158,
  }
  const rowH = 30

  const logoImg = await loadOptionalImage(params.logoSrc)
  const pairedRows = buildBkuPairedRows(params.items, params.minRows)

  const totalPemasukan = params.items
    .filter((i) => i.jenis === 'Pemasukan')
    .reduce((acc, i) => acc + (Number(i.nominal) || 0), 0)
  const totalPengeluaran = params.items
    .filter((i) => i.jenis !== 'Pemasukan')
    .reduce((acc, i) => acc + (Number(i.nominal) || 0), 0)
  const selisihPeriode = totalPemasukan - totalPengeluaran
  const saldoPrev = Number(params.saldoSebelumnya || 0)
  const saldoAkhir = saldoPrev + selisihPeriode

  // Hitung kapasitas baris per halaman A4
  const page1RowsCapacity = 36
  const nextPagesRowsCapacity = 44

  const rowChunks: BkuPairedRow[][] = []
  let cursor = 0
  if (pairedRows.length <= page1RowsCapacity) {
    rowChunks.push(pairedRows)
  } else {
    rowChunks.push(pairedRows.slice(0, page1RowsCapacity))
    cursor = page1RowsCapacity
    while (cursor < pairedRows.length) {
      rowChunks.push(pairedRows.slice(cursor, cursor + nextPagesRowsCapacity))
      cursor += nextPagesRowsCapacity
    }
  }

  const canvasPages: Array<{ jpegBytes: Uint8Array; widthPx: number; heightPx: number }> = []

  rowChunks.forEach((chunk, pageIdx) => {
    const isFirstPage = pageIdx === 0
    const isLastPage = pageIdx === rowChunks.length - 1

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    let y = 48
    if (isFirstPage) {
      y = drawKopBkuA4(ctx, W, logoImg)
    } else {
      // Pita atas halaman lanjutan
      ctx.fillStyle = '#0f4a2a'
      ctx.fillRect(0, 0, W, 12)
      ctx.fillStyle = '#d4a843'
      ctx.fillRect(0, 12, W, 3)
      y = 42
    }

    const tableStartY = y
    y = drawBkuTableHeader(
      ctx,
      marginX,
      tableW,
      y,
      params.judulLine1,
      params.judulLine2,
      isFirstPage,
      cols
    )

    // Gambar baris-baris BKU
    chunk.forEach((row, rIdx) => {
      ctx.fillStyle = rIdx % 2 === 0 ? '#ffffff' : '#f9fbf9'
      ctx.fillRect(marginX, y, tableW, rowH)

      ctx.strokeStyle = '#374151'
      ctx.lineWidth = 1
      ctx.strokeRect(marginX, y, tableW, rowH)

      const colWidths = [
        cols.no,
        cols.tglMasuk,
        cols.uraianMasuk,
        cols.jmlMasuk,
        cols.tglKeluar,
        cols.uraianKeluar,
        cols.jmlKeluar,
      ]

      // Garis vertikal antar kolom
      let vx = marginX
      for (let c = 0; c < colWidths.length - 1; c++) {
        vx += colWidths[c]
        ctx.beginPath()
        ctx.strokeStyle = c === 3 ? '#111827' : '#4b5563'
        ctx.lineWidth = c === 3 ? 2 : 1
        ctx.moveTo(vx, y)
        ctx.lineTo(vx, y + rowH)
        ctx.stroke()
      }

      // Isi teks tiap sel
      let cx = marginX
      ctx.fillStyle = '#6b7280'
      ctx.font = '13px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(String(row.rowNo), cx + cols.no / 2, y + 20)
      cx += cols.no

      // Tanggal Pemasukan
      ctx.fillStyle = '#111827'
      ctx.font = '13.5px Arial, sans-serif'
      if (row.tglMasuk) {
        ctx.fillText(row.tglMasuk, cx + cols.tglMasuk / 2, y + 20)
      }
      cx += cols.tglMasuk

      // Uraian Pemasukan
      ctx.textAlign = 'left'
      if (row.uraianMasuk) {
        ctx.fillText(
          truncateTextToWidth(ctx, row.uraianMasuk, cols.uraianMasuk - 14),
          cx + 7,
          y + 20
        )
      }
      cx += cols.uraianMasuk

      // Jumlah Pemasukan
      drawNominalCell(ctx, cx, y, cols.jmlMasuk, row.jumlahMasuk, false)
      cx += cols.jmlMasuk

      // Tanggal Pengeluaran
      ctx.textAlign = 'center'
      if (row.tglKeluar) {
        ctx.fillText(row.tglKeluar, cx + cols.tglKeluar / 2, y + 20)
      }
      cx += cols.tglKeluar

      // Uraian Pengeluaran
      ctx.textAlign = 'left'
      if (row.uraianKeluar) {
        ctx.fillText(
          truncateTextToWidth(ctx, row.uraianKeluar, cols.uraianKeluar - 14),
          cx + 7,
          y + 20
        )
      }
      cx += cols.uraianKeluar

      // Jumlah Pengeluaran
      drawNominalCell(ctx, cx, y, cols.jmlKeluar, row.jumlahKeluar, false)

      y += rowH
    })

    // Jika halaman terakhir, gambar blok rekapitulasi JUMLAH / TOTAL BULAN / SALDO SEBELUMNYA / SALDO AKHIR
    if (isLastPage) {
      const leftGroupW = cols.no + cols.tglMasuk + cols.uraianMasuk + cols.jmlMasuk
      const labelStartX = marginX + cols.no + cols.tglMasuk + 8
      const jmlMasukX = marginX + cols.no + cols.tglMasuk + cols.uraianMasuk
      const jmlKeluarX = marginX + tableW - cols.jmlKeluar

      // 1. Baris JUMLAH (Total Pemasukan & Total Pengeluaran)
      const sumRowH = 34
      ctx.fillStyle = '#ecfdf5'
      ctx.fillRect(marginX, y, tableW, sumRowH)
      ctx.strokeStyle = '#111827'
      ctx.lineWidth = 1.8
      ctx.strokeRect(marginX, y, tableW, sumRowH)

      // Garis vertikal untuk baris JUMLAH
      let vx = marginX
      const colWidths = [
        cols.no,
        cols.tglMasuk,
        cols.uraianMasuk,
        cols.jmlMasuk,
        cols.tglKeluar,
        cols.uraianKeluar,
        cols.jmlKeluar,
      ]
      for (let c = 0; c < colWidths.length - 1; c++) {
        vx += colWidths[c]
        ctx.beginPath()
        ctx.lineWidth = c === 3 ? 2 : 1.2
        ctx.moveTo(vx, y)
        ctx.lineTo(vx, y + sumRowH)
        ctx.stroke()
      }

      ctx.fillStyle = '#0f4a2a'
      ctx.font = 'bold 15px Arial, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('JUMLAH', labelStartX, y + 22)
      drawNominalCell(ctx, jmlMasukX, y + 2, cols.jmlMasuk, totalPemasukan, true)
      drawNominalCell(ctx, jmlKeluarX, y + 2, cols.jmlKeluar, totalPengeluaran, true)
      y += sumRowH

      // 2. Blok 3 Baris Bawah: TOTAL BULAN, SALDO BULAN SEBELUMNYA, SALDO AKHIR
      const footerRows: Array<{ label: string; value: number; highlight?: boolean }> = [
        { label: params.labelTotalPeriode.toUpperCase(), value: selisihPeriode },
      ]
      if (params.labelSaldoSebelumnya) {
        footerRows.push({
          label: params.labelSaldoSebelumnya.toUpperCase(),
          value: saldoPrev,
        })
        footerRows.push({
          label: 'SALDO AKHIR',
          value: saldoAkhir,
          highlight: true,
        })
      }

      const footerTotalH = footerRows.length * 34
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(marginX, y, tableW, footerTotalH)
      ctx.strokeStyle = '#111827'
      ctx.lineWidth = 2
      ctx.strokeRect(marginX, y, tableW, footerTotalH)

      // Garis pemisah vertikal di tengah (batas grup kiri) dan batas kolom jumlah kanan
      ctx.beginPath()
      ctx.moveTo(marginX + leftGroupW, y)
      ctx.lineTo(marginX + leftGroupW, y + footerTotalH)
      ctx.moveTo(jmlKeluarX, y)
      ctx.lineTo(jmlKeluarX, y + footerTotalH)
      ctx.stroke()

      footerRows.forEach((fr, idx) => {
        const fy = y + idx * 34
        if (fr.highlight) {
          ctx.fillStyle = '#dcfce7'
          ctx.fillRect(jmlKeluarX + 1, fy + 1, cols.jmlKeluar - 2, 32)
        }
        // Garis horizontal pada kolom jumlah kanan
        if (idx > 0) {
          ctx.beginPath()
          ctx.strokeStyle = '#111827'
          ctx.lineWidth = 1.2
          ctx.moveTo(jmlKeluarX, fy)
          ctx.lineTo(marginX + tableW, fy)
          ctx.stroke()
        }

        ctx.fillStyle = fr.highlight ? '#0f4a2a' : '#111827'
        ctx.font = fr.highlight ? 'bold 15.5px Arial, sans-serif' : 'bold 14.5px Arial, sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(fr.label, labelStartX, fy + 22)

        drawNominalCell(ctx, jmlKeluarX, fy + 2, cols.jmlKeluar, fr.value, true)
      })

      y += footerTotalH

      // Bingkai tebal luar seluruh tabel BKU pada halaman ini
      ctx.strokeStyle = '#111827'
      ctx.lineWidth = 2.4
      ctx.strokeRect(marginX, tableStartY, tableW, y - tableStartY)

      // Tanda tangan Ketua DKM & Bendahara DKM di halaman terakhir (lengkap dengan tanda tangan & nama pejabat DKM)
      if (y + 185 < H - 25) {
        const now = new Date()
        const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(now.getDate()).padStart(2, '0')}`
        const sigY = y + 32

        ctx.fillStyle = '#374151'
        ctx.font = '15px Arial, sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(`Karawang, ${formatTanggalIndo(todayIso)}`, W - marginX - 10, sigY)

        const leftSigX = marginX + 215
        const rightSigX = W - marginX - 215
        ctx.textAlign = 'center'
        ctx.fillStyle = '#111827'
        ctx.font = 'bold 16px Arial, sans-serif'
        ctx.fillText('Mengetahui,', leftSigX, sigY + 24)
        ctx.fillText('Ketua DKM', leftSigX, sigY + 46)

        ctx.fillText('Dibuat Oleh,', rightSigX, sigY + 24)
        ctx.fillText('Bendahara', rightSigX, sigY + 46)

        // Goresan tanda tangan Ketua DKM
        ctx.save()
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 2.2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(leftSigX - 58, sigY + 108)
        ctx.quadraticCurveTo(leftSigX - 38, sigY + 55, leftSigX - 24, sigY + 106)
        ctx.quadraticCurveTo(leftSigX - 12, sigY + 78, leftSigX - 2, sigY + 104)
        ctx.quadraticCurveTo(leftSigX + 10, sigY + 72, leftSigX + 22, sigY + 102)
        ctx.quadraticCurveTo(leftSigX + 44, sigY + 95, leftSigX + 76, sigY + 90)
        ctx.stroke()

        // Goresan tanda tangan Bendahara (Dr.K.H Asep Khareul Faizin,MM)
        ctx.strokeStyle = '#0f172a'
        ctx.lineWidth = 3.2
        ctx.beginPath()
        ctx.moveTo(rightSigX - 32, sigY + 94)
        ctx.quadraticCurveTo(rightSigX - 16, sigY + 42, rightSigX - 6, sigY + 126)
        ctx.quadraticCurveTo(rightSigX - 14, sigY + 76, rightSigX + 14, sigY + 86)
        ctx.quadraticCurveTo(rightSigX + 38, sigY + 92, rightSigX + 72, sigY + 88)
        ctx.stroke()
        ctx.restore()

        ctx.fillStyle = '#111827'
        ctx.font = 'bold 15px Arial, sans-serif'
        ctx.fillText('Drs.H.Acep Kusnadi,M.Pd.C.Med', leftSigX, sigY + 136)
        ctx.fillText('Dr.K.H Asep Khareul Faizin,MM', rightSigX, sigY + 136)

        ctx.strokeStyle = '#374151'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(leftSigX - 125, sigY + 142)
        ctx.lineTo(leftSigX + 125, sigY + 142)
        ctx.moveTo(rightSigX - 125, sigY + 142)
        ctx.lineTo(rightSigX + 125, sigY + 142)
        ctx.stroke()
        ctx.textAlign = 'left'
      }
    } else {
      // Bingkai tebal luar tabel untuk halaman yang bersambung ke halaman berikutnya
      ctx.strokeStyle = '#111827'
      ctx.lineWidth = 2.4
      ctx.strokeRect(marginX, tableStartY, tableW, y - tableStartY)
    }

    // Nomor halaman di pojok kanan bawah kertas A4
    ctx.fillStyle = '#6b7280'
    ctx.font = '13px Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(
      `Halaman ${pageIdx + 1} dari ${rowChunks.length} • Ukuran Kertas A4`,
      W - marginX,
      H - 22
    )
    ctx.textAlign = 'left'

    const jpegBytes = dataUrlToUint8Array(canvas.toDataURL('image/jpeg', 0.94))
    canvasPages.push({ jpegBytes, widthPx: W, heightPx: H })
  })

  const pdfBlob = buildPdfFromCanvasPages(canvasPages)
  triggerBlobDownload(pdfBlob, params.filename)
}

/**
 * Ekspor PDF Laporan BKU Mingguan Masjid Al-Jihad Karawang (Kertas A4 + KOP Resmi + Tanda Tangan Bendahara)
 */
export async function exportLaporanMingguanPdf(options: {
  startDateIso: string
  endDateIso: string
  mingguLabel?: string
  bulanLabel?: string
  items: LaporanKeuanganItem[]
  saldoAwalMinggu?: number
  logoSrc?: string
}) {
  const periodeTitle = options.mingguLabel
    ? `${options.mingguLabel} / ${formatTanggalSlash(options.startDateIso)} - ${formatTanggalSlash(
        options.endDateIso
      )}`
    : `MINGGU / ${formatTanggalSlash(options.startDateIso)} - ${formatTanggalSlash(
        options.endDateIso
      )}`

  await renderAndDownloadBkuPdf({
    filename: `Laporan-BKU-Mingguan-Al-Jihad-${options.startDateIso}-sd-${options.endDateIso}.pdf`,
    judulLine1: 'LAPORAN BKU KEUANGAN AL JIHAD KARAWANG',
    judulLine2: periodeTitle,
    items: options.items,
    minRows: 14,
    labelTotalPeriode: `TOTAL ${options.mingguLabel || 'MINGGU INI'}`,
    labelSaldoSebelumnya: 'SALDO AWAL MINGGU',
    saldoSebelumnya: options.saldoAwalMinggu ?? 0,
    logoSrc: options.logoSrc,
  })
}

/**
 * Ekspor PDF Laporan BKU Harian Masjid Al-Jihad Karawang (Kertas A4 + KOP Resmi + Tanda Tangan Bendahara)
 */
export async function exportLaporanHarianPdf(options: {
  dateIso: string
  items: LaporanKeuanganItem[]
  saldoAwalHari?: number
  logoSrc?: string
}) {
  const dayItems = options.items.filter((it) => it.tanggal === options.dateIso)

  await renderAndDownloadBkuPdf({
    filename: `Laporan-BKU-Harian-Al-Jihad-${options.dateIso}.pdf`,
    judulLine1: 'LAPORAN BKU KEUANGAN AL JIHAD KARAWANG',
    judulLine2: `LAPORAN HARIAN / ${formatTanggalIndo(options.dateIso).toUpperCase()}`,
    items: dayItems,
    minRows: 12,
    labelTotalPeriode: `TOTAL HARIAN / ${formatTanggalSlash(options.dateIso)}`,
    labelSaldoSebelumnya: 'SALDO AWAL HARI',
    saldoSebelumnya: options.saldoAwalHari ?? 0,
    logoSrc: options.logoSrc,
  })
}

/**
 * Ekspor PDF Laporan BKU Bulanan Masjid Al-Jihad Karawang (Kertas A4 + KOP Resmi)
 * Tetap bisa diekspor walau belum akhir bulan (baris tabel yang kosong tetap tercetak rapi).
 */
export async function exportLaporanBulananPdf(options: {
  year: number
  monthIndex: number // 0-11
  items: LaporanKeuanganItem[]
  saldoBulanSebelumnya?: number
  logoSrc?: string
}) {
  const monthName = NAMA_BULAN_BKU[options.monthIndex] || 'Bulan'
  const prevMonthIndex = options.monthIndex === 0 ? 11 : options.monthIndex - 1
  const prevMonthName = NAMA_BULAN_BKU[prevMonthIndex] || 'Bulan Sebelumnya'
  const monthPrefix = `${options.year}-${String(options.monthIndex + 1).padStart(2, '0')}`

  const monthItems = options.items.filter((it) => it.tanggal.startsWith(monthPrefix))

  await renderAndDownloadBkuPdf({
    filename: `Laporan-BKU-Bulanan-Al-Jihad-${monthName}-${options.year}.pdf`,
    judulLine1: 'LAPORAN BKU KEUANGAN AL JIHAD KARAWANG',
    judulLine2: `BULAN ${monthName.toUpperCase()} ${options.year}`,
    items: monthItems,
    minRows: 20,
    labelTotalPeriode: `TOTAL BULAN ${monthName.toUpperCase()}`,
    labelSaldoSebelumnya: `SALDO BULAN ${prevMonthName.toUpperCase()}`,
    saldoSebelumnya: options.saldoBulanSebelumnya ?? 0,
    logoSrc: options.logoSrc,
  })
}

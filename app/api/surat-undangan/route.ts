import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

interface ZipEntry {
  nameBytes: Buffer
  compressionMethod: number
  dosTime: number
  dosDate: number
  crc32: number
  compressedData: Buffer
  uncompressedSize: number
  externalAttributes: number
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

function computeCrc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function parseZipEntries(zipBuf: Buffer): ZipEntry[] {
  let eocdOffset = -1
  for (let i = zipBuf.length - 22; i >= Math.max(0, zipBuf.length - 65557); i--) {
    if (zipBuf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP: EOCD not found')
  }

  const totalEntries = zipBuf.readUInt16LE(eocdOffset + 10)
  let cdOffset = zipBuf.readUInt32LE(eocdOffset + 16)
  const entries: ZipEntry[] = []

  for (let idx = 0; idx < totalEntries; idx++) {
    if (zipBuf.readUInt32LE(cdOffset) !== 0x02014b50) {
      throw new Error('Invalid ZIP central directory header')
    }
    const compressionMethod = zipBuf.readUInt16LE(cdOffset + 10)
    const dosTime = zipBuf.readUInt16LE(cdOffset + 12)
    const dosDate = zipBuf.readUInt16LE(cdOffset + 14)
    const crc32 = zipBuf.readUInt32LE(cdOffset + 16)
    const compressedSize = zipBuf.readUInt32LE(cdOffset + 20)
    const uncompressedSize = zipBuf.readUInt32LE(cdOffset + 24)
    const nameLen = zipBuf.readUInt16LE(cdOffset + 28)
    const extraLen = zipBuf.readUInt16LE(cdOffset + 30)
    const commentLen = zipBuf.readUInt16LE(cdOffset + 32)
    const externalAttributes = zipBuf.readUInt32LE(cdOffset + 38)
    const localHeaderOffset = zipBuf.readUInt32LE(cdOffset + 42)
    const nameBytes = zipBuf.subarray(cdOffset + 46, cdOffset + 46 + nameLen)

    const localNameLen = zipBuf.readUInt16LE(localHeaderOffset + 26)
    const localExtraLen = zipBuf.readUInt16LE(localHeaderOffset + 28)
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen
    const compressedData = zipBuf.subarray(dataStart, dataStart + compressedSize)

    entries.push({
      nameBytes: Buffer.from(nameBytes),
      compressionMethod,
      dosTime,
      dosDate,
      crc32,
      compressedData: Buffer.from(compressedData),
      uncompressedSize,
      externalAttributes,
    })

    cdOffset += 46 + nameLen + extraLen + commentLen
  }

  return entries
}

function buildZipBuffer(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = []
  const cdParts: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0x0800, 6)
    localHeader.writeUInt16LE(entry.compressionMethod, 8)
    localHeader.writeUInt16LE(entry.dosTime, 10)
    localHeader.writeUInt16LE(entry.dosDate, 12)
    localHeader.writeUInt32LE(entry.crc32, 14)
    localHeader.writeUInt32LE(entry.compressedData.length, 18)
    localHeader.writeUInt32LE(entry.uncompressedSize, 22)
    localHeader.writeUInt16LE(entry.nameBytes.length, 26)
    localHeader.writeUInt16LE(0, 28)

    localParts.push(localHeader, entry.nameBytes, entry.compressedData)

    const cdHeader = Buffer.alloc(46)
    cdHeader.writeUInt32LE(0x02014b50, 0)
    cdHeader.writeUInt16LE(20, 4)
    cdHeader.writeUInt16LE(20, 6)
    cdHeader.writeUInt16LE(0x0800, 8)
    cdHeader.writeUInt16LE(entry.compressionMethod, 10)
    cdHeader.writeUInt16LE(entry.dosTime, 12)
    cdHeader.writeUInt16LE(entry.dosDate, 14)
    cdHeader.writeUInt32LE(entry.crc32, 16)
    cdHeader.writeUInt32LE(entry.compressedData.length, 20)
    cdHeader.writeUInt32LE(entry.uncompressedSize, 24)
    cdHeader.writeUInt16LE(entry.nameBytes.length, 28)
    cdHeader.writeUInt16LE(0, 30)
    cdHeader.writeUInt16LE(0, 32)
    cdHeader.writeUInt16LE(0, 34)
    cdHeader.writeUInt16LE(0, 36)
    cdHeader.writeUInt32LE(entry.externalAttributes, 38)
    cdHeader.writeUInt32LE(offset, 42)

    cdParts.push(cdHeader, entry.nameBytes)
    offset += localHeader.length + entry.nameBytes.length + entry.compressedData.length
  }

  const cdBuffer = Buffer.concat(cdParts)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cdBuffer.length, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, cdBuffer, eocd])
}

function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function readEntryText(entry: ZipEntry): string {
  return (
    entry.compressionMethod === 8
      ? zlib.inflateRawSync(entry.compressedData)
      : entry.compressedData
  ).toString('utf8')
}

function writeEntryText(entry: ZipEntry, text: string) {
  const raw = Buffer.from(text, 'utf8')
  entry.compressionMethod = 8
  entry.compressedData = zlib.deflateRawSync(raw)
  entry.uncompressedSize = raw.length
  entry.crc32 = computeCrc32(raw)
}

function makeParagraph(
  runs: Array<{ text: string; bold?: boolean; italic?: boolean; underline?: boolean; size?: number }>,
  options?: {
    align?: 'left' | 'center' | 'right' | 'both'
    spaceAfter?: number
    spaceBefore?: number
    leftIndent?: number
    tabs?: number[]
  }
): string {
  const alignXml = options?.align ? `<w:jc w:val="${options.align}"/>` : ''
  const spacingXml = `<w:spacing w:before="${options?.spaceBefore ?? 0}" w:after="${options?.spaceAfter ?? 120}" w:line="276" w:lineRule="auto"/>`
  const indentXml = options?.leftIndent ? `<w:ind w:left="${options.leftIndent}"/>` : ''
  const tabsXml = options?.tabs?.length
    ? `<w:tabs>${options.tabs.map((pos) => `<w:tab w:val="left" w:pos="${pos}"/>`).join('')}</w:tabs>`
    : ''

  const runsXml = runs
    .map((r) => {
      if (r.text === '\t') {
        return '<w:r><w:tab/></w:r>'
      }
      const sz = r.size ?? 24
      const rPr = [
        '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>',
        r.bold ? '<w:b/>' : '',
        r.italic ? '<w:i/>' : '',
        r.underline ? '<w:u w:val="single"/>' : '',
        `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`,
      ].join('')
      return `<w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${escapeXml(r.text)}</w:t></w:r>`
    })
    .join('')

  return `<w:p><w:pPr>${spacingXml}${indentXml}${tabsXml}${alignXml}</w:pPr>${runsXml}</w:p>`
}

function makeSignatureImageParagraph(relId: string): string {
  const cx = 2250000 // ~6.25cm
  const cy = 1100000 // ~3.05cm
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="620"/><w:jc w:val="right"/></w:pPr><w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="margin"><wp:align>right</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>-90000</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="77" name="TTD Ketua DKM"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="77" name="ttd_dkm.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const jenisSurat = body.jenisSurat === 'Umum' ? 'Umum' : 'Khutbah Jumat'
    const perihalKhutbahOpsi = String(body.perihalKhutbahOpsi || 'Khotib & Imam')
    const noSurat = String(body.noSurat || '-')
    const perihalSurat = String(body.perihalSurat || '-')
    const kepadaSurat = String(body.kepadaSurat || '-')
    const tanggalSuratAcara = String(body.tanggalSuratAcara || '')
    const waktuSuratAcara = String(body.waktuSuratAcara || '-')
    const tempatSuratAcara = String(body.tempatSuratAcara || '-')
    const agendaSurat = String(body.agendaSurat || '-')

    const hariTanggalFormatted = tanggalSuratAcara
      ? new Date(`${tanggalSuratAcara}T12:00:00`).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '-'

    const tanggalSekarang = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

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

    const openingText =
      jenisSurat === 'Khutbah Jumat'
        ? `Sehubungan dengan pelaksanaan kegiatan ibadah Jumat di Masjid Raya Al-Jihad Karawang, kami memohon kesediaan Bapak/Ustadz untuk menjadi ${roleText} pada:`
        : 'Sehubungan dengan pelaksanaan kegiatan di Masjid Raya Al-Jihad Karawang, bersama surat ini kami memohon kesediaan Bapak/Ibu/Ustadz untuk hadir pada:'

    const waktuLabel = jenisSurat === 'Khutbah Jumat' ? 'Waktu Jumat' : 'Waktu'

    const kopPath = path.join(process.cwd(), 'logo', 'KOP SURAT DKM.docx')
    const ttdPath = path.join(process.cwd(), 'logo', 'TTD DKM MASJID AL JIHAD.png')
    const zipBuffer = fs.readFileSync(kopPath)
    const entries = parseZipEntries(zipBuffer)

    const docEntry = entries.find((e) => e.nameBytes.toString('utf8') === 'word/document.xml')
    if (!docEntry) {
      return NextResponse.json({ error: 'word/document.xml tidak ditemukan' }, { status: 500 })
    }

    // Embed tanda tangan PNG transparan Ketua DKM jika tersedia di folder logo
    let hasTtd = false
    if (fs.existsSync(ttdPath)) {
      const ttdBuffer = fs.readFileSync(ttdPath)
      const relsEntry = entries.find(
        (e) => e.nameBytes.toString('utf8') === 'word/_rels/document.xml.rels'
      )

      if (relsEntry) {
        const relsXml = readEntryText(relsEntry)
        if (!relsXml.includes('Id="rId14"')) {
          writeEntryText(
            relsEntry,
            relsXml.replace(
              '</Relationships>',
              '<Relationship Id="rId14" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/ttd_dkm.png"/></Relationships>'
            )
          )
        }
        entries.push({
          nameBytes: Buffer.from('word/media/ttd_dkm.png', 'utf8'),
          compressionMethod: 8,
          dosTime: docEntry.dosTime,
          dosDate: docEntry.dosDate,
          crc32: computeCrc32(ttdBuffer),
          compressedData: zlib.deflateRawSync(ttdBuffer),
          uncompressedSize: ttdBuffer.length,
          externalAttributes: 0,
        })
        hasTtd = true
      }
    }

    const originalDocXml = readEntryText(docEntry)

    const bodyParagraphs = [
      makeParagraph([{ text: 'Nomor' }, { text: '\t' }, { text: `: ${noSurat}` }], {
        spaceAfter: 60,
        tabs: [1600],
      }),
      makeParagraph([{ text: 'Lampiran' }, { text: '\t' }, { text: ': -' }], {
        spaceAfter: 60,
        tabs: [1600],
      }),
      makeParagraph(
        [{ text: 'Perihal' }, { text: '\t' }, { text: ': ' }, { text: perihalSurat, bold: true }],
        { spaceAfter: 240, tabs: [1600] }
      ),
      makeParagraph([{ text: 'Kepada Yth.' }], { spaceAfter: 40 }),
      makeParagraph([{ text: kepadaSurat, bold: true }], { spaceAfter: 40 }),
      makeParagraph([{ text: 'di Tempat' }], { spaceAfter: 220 }),
      makeParagraph([{ text: "Assalamu'alaikum Warahmatullahi Wabarakatuh,", italic: true }], {
        spaceAfter: 140,
      }),
      makeParagraph([{ text: openingText }], { align: 'both', spaceAfter: 160 }),
      makeParagraph(
        [{ text: 'Hari / Tanggal', bold: true }, { text: '\t' }, { text: `: ${hariTanggalFormatted}` }],
        { leftIndent: 420, spaceAfter: 60, tabs: [2200] }
      ),
      makeParagraph(
        [{ text: waktuLabel, bold: true }, { text: '\t' }, { text: `: ${waktuSuratAcara}` }],
        { leftIndent: 420, spaceAfter: 60, tabs: [2200] }
      ),
      makeParagraph(
        [{ text: 'Tempat', bold: true }, { text: '\t' }, { text: `: ${tempatSuratAcara}` }],
        { leftIndent: 420, spaceAfter: 60, tabs: [2200] }
      ),
      makeParagraph(
        [{ text: 'Agenda', bold: true }, { text: '\t' }, { text: `: ${agendaSurat}` }],
        { leftIndent: 420, spaceAfter: 200, tabs: [2200] }
      ),
      makeParagraph(
        [
          {
            text: 'Demikian surat permohonan ini kami sampaikan. Atas perhatian dan kehadiran Bapak/Ustadz, kami ucapkan ',
          },
          { text: 'Jazakumullahu Khairan Katsiran.', italic: true },
        ],
        { align: 'both', spaceAfter: 140 }
      ),
      makeParagraph([{ text: "Wassalamu'alaikum Warahmatullahi Wabarakatuh.", italic: true }], {
        spaceAfter: 320,
      }),
      makeParagraph([{ text: `Karawang, ${tanggalSekarang}` }], { align: 'right', spaceAfter: 40 }),
      makeParagraph([{ text: 'Ketua DKM Masjid Al-Jihad Karawang', bold: true }], {
        align: 'right',
        spaceAfter: hasTtd ? 40 : 720,
      }),
      ...(hasTtd ? [makeSignatureImageParagraph('rId14')] : []),
      makeParagraph([{ text: 'Drs. H. Acep Kusnadi, M.Pd., C.Med.', bold: true, underline: true }], {
        align: 'right',
        spaceAfter: 120,
      }),
    ].join('')

    const sectPrIndex = originalDocXml.indexOf('<w:sectPr')
    if (sectPrIndex === -1) {
      return NextResponse.json({ error: 'Struktur w:sectPr tidak valid' }, { status: 500 })
    }

    const updatedDocXml =
      originalDocXml.slice(0, sectPrIndex) + bodyParagraphs + originalDocXml.slice(sectPrIndex)
    writeEntryText(docEntry, updatedDocXml)

    const outBuffer = buildZipBuffer(entries)

    return new NextResponse(new Uint8Array(outBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Surat-Undangan-DKM-${tanggalSuratAcara || 'Resmi'}.docx"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal membuat file Word' },
      { status: 500 }
    )
  }
}

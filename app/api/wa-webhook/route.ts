import { NextRequest, NextResponse } from 'next/server'
import { sendFonnteMessage, sendFonntePdf } from '@/lib/fonnte'

interface FonnteWebhookPayload {
  device?: string
  sender?: string
  pengirim?: string
  name?: string
  message?: string
  pesan?: string
  url?: string
  filename?: string
  extension?: string
  isgroup?: boolean
  isGroup?: boolean
}

const MENU_TEXT = [
  'Assalamualaikum warahmatullahi wabarakatuh.',
  'Selamat datang di *Layanan Otomatis Masjid Al-Jihad Karawang*.',
  '',
  'Silakan balas dengan angka atau kata kunci berikut:',
  '1. *Jadwal* — Informasi jadwal kegiatan & pengajuan jadwal',
  '2. *PDF* — Kirim otomatis dokumen panduan/proposal PDF',
  '3. *Kontak* — Informasi kontak DKM & lokasi masjid',
  '',
  'Ketik *menu* kapan saja untuk menampilkan daftar ini kembali.',
].join('\n')

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'Masjid Al-Jihad Karawang - Fonnte WhatsApp Webhook',
    configured: Boolean(process.env.FONNTE_TOKEN?.trim()),
  })
}

export async function POST(req: NextRequest) {
  const configuredSecret = process.env.FONNTE_WEBHOOK_SECRET?.trim()
  if (configuredSecret) {
    const querySecret = req.nextUrl.searchParams.get('secret')
    const headerSecret = req.headers.get('x-webhook-secret')
    if (querySecret !== configuredSecret && headerSecret !== configuredSecret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: FonnteWebhookPayload
  try {
    body = (await req.json()) as FonnteWebhookPayload
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 })
  }

  const sender = (body.sender || body.pengirim || '').trim()
  const rawMessage = (body.message || body.pesan || '').trim()
  const isGroup = Boolean(body.isgroup || body.isGroup || sender.endsWith('@g.us'))

  if (!sender || isGroup) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const command = rawMessage.toLowerCase()
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://masjid-al-jihad-karawang.vercel.app').replace(/\/$/, '')
  const panduanPdfUrl = process.env.FONNTE_PANDUAN_PDF_URL?.trim()

  if (body.url && body.extension?.toLowerCase() === 'pdf') {
    await sendFonnteMessage({
      target: sender,
      message: `Terima kasih${body.name ? `, ${body.name}` : ''}. File PDF *${body.filename || 'dokumen.pdf'}* sudah diterima oleh sistem Masjid Al-Jihad Karawang.`,
    })
    return NextResponse.json({ ok: true, handled: 'incoming_pdf' })
  }

  if (
    !command ||
    command === 'menu' ||
    command === 'help' ||
    command === 'start' ||
    command === 'halo' ||
    command === 'hai' ||
    command.includes('assalam')
  ) {
    await sendFonnteMessage({
      target: sender,
      message: MENU_TEXT,
    })
    return NextResponse.json({ ok: true, handled: 'menu' })
  }

  if (command === '1' || command.includes('jadwal') || command.includes('kegiatan')) {
    await sendFonnteMessage({
      target: sender,
      message: [
        '*Jadwal & Pengajuan Kegiatan Masjid Al-Jihad Karawang*',
        `Lihat kalender kegiatan & ajukan jadwal secara online melalui:\n${siteUrl}`,
        '',
        'Ketik *PDF* jika ingin menerima dokumen panduan dalam format PDF.',
      ].join('\n'),
    })
    return NextResponse.json({ ok: true, handled: 'jadwal' })
  }

  if (command === '2' || command === 'pdf' || command.includes('panduan') || command.includes('dokumen') || command.includes('proposal')) {
    if (!panduanPdfUrl) {
      await sendFonnteMessage({
        target: sender,
        message: 'Dokumen PDF belum dikonfigurasi oleh admin (`FONNTE_PANDUAN_PDF_URL` belum diisi). Silakan hubungi DKM atau coba lagi nanti.',
      })
      return NextResponse.json({ ok: true, handled: 'pdf_unconfigured' })
    }

    const pdfResult = await sendFonntePdf(
      sender,
      panduanPdfUrl,
      'Panduan-Kegiatan-Masjid-Al-Jihad.pdf',
      'Berikut dokumen panduan resmi dari *Masjid Al-Jihad Karawang*. Semoga bermanfaat!'
    )
    return NextResponse.json({ ok: pdfResult.ok, handled: 'pdf', detail: pdfResult.error })
  }

  if (command === '3' || command.includes('kontak') || command.includes('alamat') || command.includes('donasi')) {
    await sendFonnteMessage({
      target: sender,
      message: [
        '*Kontak & Informasi Masjid Al-Jihad Karawang*',
        `Website resmi: ${siteUrl}`,
        `Halaman kontak: ${siteUrl}/kontak`,
        '',
        'Ketik *menu* untuk kembali ke menu utama.',
      ].join('\n'),
    })
    return NextResponse.json({ ok: true, handled: 'kontak' })
  }

  await sendFonnteMessage({
    target: sender,
    message: `Maaf, perintah "${rawMessage}" belum dikenali.\n\n${MENU_TEXT}`,
  })
  return NextResponse.json({ ok: true, handled: 'fallback' })
}

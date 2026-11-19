export interface FonnteSendOptions {
  target: string
  message?: string
  url?: string
  filename?: string
  delay?: string
}

export interface FonnteSendResult {
  ok: boolean
  data?: unknown
  error?: string
}

const FONNTE_SEND_ENDPOINT = 'https://api.fonnte.com/send'

/**
 * Mengirim pesan WhatsApp (teks, gambar, atau dokumen PDF via URL publik) melalui API Fonnte.
 */
export async function sendFonnteMessage(options: FonnteSendOptions): Promise<FonnteSendResult> {
  const token = process.env.FONNTE_TOKEN?.trim()
  if (!token) {
    return { ok: false, error: 'FONNTE_TOKEN belum dikonfigurasi di environment variables.' }
  }

  const formData = new FormData()
  formData.append('target', options.target)
  formData.append('countryCode', '62')

  if (options.message) {
    formData.append('message', options.message)
  }
  if (options.url) {
    formData.append('url', options.url)
  }
  if (options.filename) {
    formData.append('filename', options.filename)
  }
  if (options.delay) {
    formData.append('delay', options.delay)
  }

  try {
    const response = await fetch(FONNTE_SEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      body: formData,
    })

    const data = await response.json().catch(() => null)
    if (!response.ok || (data && data.status === false)) {
      return {
        ok: false,
        data,
        error: (data && (data.reason || data.detail)) || `HTTP ${response.status}`,
      }
    }

    return { ok: true, data }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Gagal menghubungi server Fonnte.',
    }
  }
}

/**
 * Helper khusus untuk mengirim file PDF ke WhatsApp melalui URL publik (Cloudinary / Supabase / URL web).
 */
export async function sendFonntePdf(
  target: string,
  pdfUrl: string,
  filename = 'Dokumen-Masjid-Al-Jihad.pdf',
  caption?: string
): Promise<FonnteSendResult> {
  return sendFonnteMessage({
    target,
    url: pdfUrl,
    filename,
    message: caption,
  })
}

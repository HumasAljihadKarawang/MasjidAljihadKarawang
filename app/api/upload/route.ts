import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

function ensureCloudinaryConfigured() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return false
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })
  return true
}

export async function POST(req: NextRequest) {
  try {
    if (!ensureCloudinaryConfigured()) {
      return NextResponse.json(
        {
          error:
            'Kredensial Cloudinary belum lengkap. Pastikan NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET sudah diisi.',
        },
        { status: 500 }
      )
    }

    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file')
      const folder = String(formData.get('folder') || 'masjid-aljihad')
      const resourceType = String(formData.get('resourceType') || 'auto') as
        | 'auto'
        | 'image'
        | 'video'
        | 'raw'

      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const result = await new Promise<{
        secure_url: string
        public_id: string
        resource_type: string
      }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: resourceType,
          },
          (err, res) => {
            if (err || !res) {
              reject(err || new Error('Upload Cloudinary gagal'))
              return
            }
            resolve({
              secure_url: res.secure_url,
              public_id: res.public_id,
              resource_type: res.resource_type,
            })
          }
        )
        stream.end(buffer)
      })

      return NextResponse.json({
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
      })
    }

    const body = await req.json()
    const dataUrl = String(body.dataUrl || '')
    const folder = String(body.folder || 'masjid-aljihad')
    const resourceType = String(body.resourceType || 'auto') as
      | 'auto'
      | 'image'
      | 'video'
      | 'raw'

    if (!dataUrl) {
      return NextResponse.json({ error: 'Data file kosong' }, { status: 400 })
    }

    const res = await cloudinary.uploader.upload(dataUrl, {
      folder,
      resource_type: resourceType,
    })

    return NextResponse.json({
      url: res.secure_url,
      publicId: res.public_id,
      resourceType: res.resource_type,
    })
  } catch (error: unknown) {
    const errObj = error as { message?: string; error?: { message?: string } }
    const message =
      errObj?.message || errObj?.error?.message || 'Gagal mengunggah ke Cloudinary'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import type { Metadata, Viewport } from 'next'
import PageLoader from '@/components/PageLoader/PageLoader'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: 'Masjid Al-Jihad Karawang',
    template: '%s | Masjid Al-Jihad Karawang',
  },
  description: 'Website resmi Masjid Al-Jihad Karawang. Informasi waktu sholat, program masjid, berita keislaman, galeri, dan donasi.',
  keywords: ['masjid', 'al-jihad', 'karawang', 'waktu sholat', 'jadwal sholat', 'masjid karawang'],
  authors: [{ name: 'Masjid Al-Jihad Karawang' }],
  creator: 'Masjid Al-Jihad Karawang',
  icons: {
    icon: '/favicon.ico',
  },
  other: {
    google: 'notranslate',
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'Masjid Al-Jihad Karawang',
    title: 'Masjid Al-Jihad Karawang',
    description: 'Website resmi Masjid Al-Jihad Karawang',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" translate="no" className="notranslate" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <PageLoader />
        {children}
      </body>
    </html>
  )
}

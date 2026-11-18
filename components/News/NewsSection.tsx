'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './NewsSection.module.css'
import { masjidStore, type BeritaItem } from '@/lib/masjidStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

export default function NewsSection() {
  const [news, setNews] = useState<BeritaItem[]>(masjidStore.getBerita())
  const [selectedArticle, setSelectedArticle] = useState<BeritaItem | null>(null)

  const syncBerita = useCallback(() => {
    setNews(masjidStore.getBerita().filter((b) => b.published))
  }, [])

  useEffect(() => {
    syncBerita()
    window.addEventListener('aljihad-store-updated', syncBerita)
    return () => window.removeEventListener('aljihad-store-updated', syncBerita)
  }, [syncBerita])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase
      .from('berita')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(7)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const mapped: BeritaItem[] = data.map((d) => ({
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
            published: true,
          }))
          setNews(mapped)
        }
      })
  }, [])

  const topTwo = news.slice(0, 2)
  const bottomFive = news.slice(2, 7)

  const formatDateStr = (iso: string) => {
    try {
      return format(new Date(iso), 'd MMMM yyyy', { locale: idLocale })
    } catch {
      return iso
    }
  }

  return (
    <section className={styles.section}>
      <div className="container">
        <div className="section-header">
          <div className={styles.headerRow}>
            <div>
              <h2 className="section-title">
                Berita & <span>Informasi</span> Masjid
              </h2>
              <p className="section-subtitle">
                Kabar kegiatan, syiar dakwah, dan informasi terkini dari Masjid Al-Jihad & Islamic
                Center Karawang
              </p>
            </div>
            <Link href="/berita" className="btn btn-outline">
              Semua Berita →
            </Link>
          </div>
        </div>

        {/* MOSAIC MAGAZINE GRID: 2 BESAR DI ATAS + 5 BERJAJAR DI BAWAH */}
        <div className={styles.mosaicWrap}>
          {/* Baris Atas: 2 Berita Utama */}
          <div className={styles.topRowGrid}>
            {topTwo.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={styles.topCard}
                onClick={() => setSelectedArticle(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSelectedArticle(item)
                }}
              >
                <Image
                  src={
                    item.thumbnail_url ||
                    'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1000&q=80'
                  }
                  alt={item.judul}
                  fill
                  unoptimized
                  className={styles.cardBgImg}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className={styles.cardOverlay} />
                <div className={styles.topCardContent}>
                  <span className={styles.catTag}>{item.kategori || 'ISLAM KARAWANG'}</span>
                  <h3 className={styles.topTitle}>{item.judul}</h3>
                  <span className={styles.dateText}>{formatDateStr(item.created_at)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Baris Bawah: 5 Berita */}
          <div className={styles.bottomRowGrid}>
            {bottomFive.map((item, idx) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={styles.bottomCard}
                onClick={() => setSelectedArticle(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSelectedArticle(item)
                }}
              >
                <Image
                  src={
                    item.thumbnail_url ||
                    'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=600&q=80'
                  }
                  alt={item.judul}
                  fill
                  unoptimized
                  className={styles.cardBgImg}
                  sizes="(max-width: 768px) 50vw, 20vw"
                />
                <div className={styles.cardOverlay} />
                <div className={styles.bottomCardContent}>
                  <span
                    className={`${styles.catTag} ${idx % 2 === 1 ? styles.catTagAccent : ''}`}
                  >
                    {item.kategori || 'KEGIATAN'}
                  </span>
                  <h4 className={styles.bottomTitle}>{item.judul}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Baca Detail Berita */}
        <div
          className={styles.modalBackdrop}
          style={{ display: selectedArticle ? 'flex' : 'none' }}
          onClick={() => setSelectedArticle(null)}
        >
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHero}>
              {selectedArticle && (
                <Image
                  src={selectedArticle.thumbnail_url}
                  alt={selectedArticle.judul}
                  fill
                  unoptimized
                  className={styles.cardBgImg}
                />
              )}
            </div>
            <div className={styles.modalBody}>
              <span className={styles.catTag}>{selectedArticle?.kategori}</span>
              <h3 className={styles.modalTitle}>{selectedArticle?.judul}</h3>
              <span className={styles.modalDate}>
                {selectedArticle ? formatDateStr(selectedArticle.created_at) : ''}
              </span>
              <p className={styles.modalText}>
                {selectedArticle?.konten || selectedArticle?.ringkasan}
              </p>
              <button
                type="button"
                className={`btn btn-primary ${styles.modalCloseBtn}`}
                onClick={() => setSelectedArticle(null)}
              >
                Tutup Berita
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

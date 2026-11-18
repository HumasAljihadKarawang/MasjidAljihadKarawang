'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './ProgramSection.module.css'
import { masjidStore, type KegiatanUnggulanItem } from '@/lib/masjidStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const KATEGORI_COLOR: Record<string, string> = {
  Pendidikan: '#1B6B45',
  Ibadah: '#0D9488',
  Sosial: '#DC2626',
  Ekonomi: '#D97706',
}

export default function ProgramSection() {
  const [programs, setPrograms] = useState<KegiatanUnggulanItem[]>(
    masjidStore.getKegiatan().filter((k) => k.aktif && k.tampilDiBeranda)
  )

  const syncPrograms = useCallback(() => {
    setPrograms(masjidStore.getKegiatan().filter((k) => k.aktif && k.tampilDiBeranda))
  }, [])

  useEffect(() => {
    syncPrograms()
    window.addEventListener('aljihad-store-updated', syncPrograms)
    return () => window.removeEventListener('aljihad-store-updated', syncPrograms)
  }, [syncPrograms])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase
      .from('program')
      .select('*')
      .eq('aktif', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPrograms(
            data.map((item) => ({
              id: item.id,
              nama: item.nama,
              deskripsi: item.deskripsi || '',
              kategori: item.kategori || 'Ibadah',
              ikon: item.ikon || '🕌',
              jadwal: item.jadwal || 'Rutin Mingguan',
              lokasi: item.lokasi || 'Masjid Al-Jihad Karawang',
              badgeCustom: 'Aktif',
              warnaCustom: KATEGORI_COLOR[item.kategori || 'Ibadah'] || '#1B6B45',
              tampilDiBeranda: true,
              aktif: true,
            }))
          )
        }
      })
  }, [])

  return (
    <section className={styles.section}>
      <div className={styles.topBorder} />

      <div className="container">
        <div className="section-header">
          <div className={styles.headerRow}>
            <div>
              <h2 className="section-title">
                Kegiatan & Layanan <span>Unggulan</span>
              </h2>
              <p className="section-subtitle">
                Berbagai kegiatan pembinaan umat yang telah terdaftar dan dikelola oleh DKM Masjid
                Al-Jihad Karawang
              </p>
            </div>
            <Link href="/kegiatan" className="btn btn-outline">
              Lihat Semua & Kalender →
            </Link>
          </div>
        </div>

        {programs.length === 0 ? (
          <div
            style={{
              padding: '44px 24px',
              textAlign: 'center',
              background: '#f8faf8',
              borderRadius: '18px',
              border: '1px dashed rgba(27, 107, 69, 0.25)',
              color: '#4a6355',
              fontSize: '0.98rem',
              fontWeight: 600,
              marginBottom: '28px',
            }}
          >
            Belum ada program yang ditambahkan
          </div>
        ) : (
          <div className={styles.grid}>
            {programs.map((program, idx) => {
              const color =
                program.warnaCustom || KATEGORI_COLOR[program.kategori || ''] || '#1B6B45'
              return (
                <div
                  key={program.id}
                  className={styles.card}
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.iconWrap} style={{ background: `${color}15` }}>
                      <span className={styles.icon}>{program.ikon}</span>
                    </div>
                    <span className={styles.kategori} style={{ color }}>
                      {program.kategori}
                    </span>
                  </div>
                  <h3 className={styles.nama}>{program.nama}</h3>
                  <p className={styles.deskripsi}>{program.deskripsi}</p>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#1b6b45',
                      marginBottom: '12px',
                    }}
                  >
                    {`Jadwal: ${program.jadwal || 'Rutin'}`}
                  </div>
                  <div className={styles.cardFoot}>
                    <span className={styles.status}>
                      <span className={styles.statusDot} style={{ background: color }} />
                      {program.badgeCustom || 'Aktif'}
                    </span>
                    <Link href="/kegiatan" className={styles.detailLink}>
                      Detail →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className={styles.ctaBanner}>
          <div className={styles.ctaLeft}>
            <div>
              <h3 className={styles.ctaTitle}>Cek Kalender Penggunaan Ruang & Jadwal Masjid</h3>
              <p className={styles.ctaDesc}>
                Lihat jadwal kegiatan harian dan ketersediaan ruangan agar tidak terjadi bentrok
                acara
              </p>
            </div>
          </div>
          <Link href="/kegiatan#kalender-masjid" className="btn btn-gold">
            Buka Kalender Kegiatan
          </Link>
        </div>
      </div>
    </section>
  )
}

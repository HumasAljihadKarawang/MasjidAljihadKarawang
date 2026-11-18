'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import styles from './ReelsSection.module.css'
import { masjidStore, type VideoKegiatanItem } from '@/lib/masjidStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export default function ReelsSection() {
  const [reels, setReels] = useState<VideoKegiatanItem[]>(masjidStore.getVideo())
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [playingIdx, setPlayingIdx] = useState<number | null>(null)
  const [mutedStates, setMutedStates] = useState<boolean[]>(reels.map(() => true))

  const syncReels = useCallback(() => {
    const localList = masjidStore.getVideo().filter((v) => v.aktif)
    setReels(localList)
    setMutedStates(localList.map(() => true))
  }, [])

  useEffect(() => {
    syncReels()
    window.addEventListener('aljihad-store-updated', syncReels)
    return () => window.removeEventListener('aljihad-store-updated', syncReels)
  }, [syncReels])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase
      .from('reels')
      .select('*')
      .eq('aktif', true)
      .order('urutan', { ascending: true })
      .limit(8)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const mapped: VideoKegiatanItem[] = data.map((d, i) => ({
            id: d.id,
            judul: d.judul || 'Video Kegiatan Masjid Al-Jihad',
            url_video: d.url_video,
            thumbnail_url:
              d.thumbnail_url ||
              'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600&q=80',
            kategori: 'Dokumentasi Masjid',
            durasi: '01:00',
            urutan: d.urutan || i + 1,
            aktif: true,
          }))
          setReels(mapped)
          setMutedStates(mapped.map(() => true))
        }
      })
  }, [])

  const handleTogglePlay = (idx: number) => {
    const targetVideo = videoRefs.current[idx]
    if (!targetVideo) return

    if (playingIdx === idx) {
      targetVideo.pause()
      setPlayingIdx(null)
    } else {
      videoRefs.current.forEach((v, i) => {
        if (v && i !== idx) {
          v.pause()
          v.currentTime = 0
        }
      })
      targetVideo.play().catch(() => {})
      setPlayingIdx(idx)
    }
  }

  const toggleMute = (e: React.MouseEvent, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    const newMuted = [...mutedStates]
    newMuted[idx] = !newMuted[idx]
    setMutedStates(newMuted)
    if (videoRefs.current[idx]) {
      videoRefs.current[idx]!.muted = newMuted[idx]
    }
  }

  return (
    <section className={styles.section}>
      <div className="container">
        <div className="section-header center">
          <h2 className="section-title light">
            Video <span>Kegiatan</span> Masjid
          </h2>
          <p className="section-subtitle light">
            Dokumentasi kegiatan ibadah, kajian keislaman, pendidikan, dan aktivitas jamaah Masjid
            Al-Jihad Karawang
          </p>
        </div>

        <div className={styles.reelsGrid}>
          {reels.map((reel, idx) => {
            const isPlaying = playingIdx === idx
            return (
              <div
                key={reel.id}
                className={`${styles.reelCard} ${isPlaying ? styles.playing : ''}`}
                onClick={() => handleTogglePlay(idx)}
                onMouseEnter={() => {
                  if (playingIdx === null) {
                    setPlayingIdx(idx)
                    videoRefs.current[idx]?.play().catch(() => {})
                  }
                }}
                onMouseLeave={() => {
                  if (playingIdx === idx) {
                    videoRefs.current[idx]?.pause()
                    if (videoRefs.current[idx]) videoRefs.current[idx]!.currentTime = 0
                    setPlayingIdx(null)
                  }
                }}
              >
                {/* Thumbnail */}
                <div
                  className={styles.thumbnail}
                  style={{
                    backgroundImage: reel.thumbnail_url ? `url(${reel.thumbnail_url})` : undefined,
                    display: reel.thumbnail_url && !isPlaying ? 'block' : 'none',
                  }}
                />

                {/* Video */}
                <video
                  ref={(el) => {
                    videoRefs.current[idx] = el
                  }}
                  src={reel.url_video}
                  className={styles.video}
                  muted={mutedStates[idx]}
                  loop
                  playsInline
                  preload="metadata"
                />

                {/* Overlay */}
                <div className={styles.overlay}>
                  <div className={styles.cardTopBar}>
                    <span className={styles.kategoriTag}>
                      {reel.kategori || 'Kegiatan Masjid'}
                    </span>
                    <div className={styles.controls}>
                      <span className={styles.durasiBadge}>{reel.durasi || 'HD'}</span>
                      <button
                        type="button"
                        className={styles.muteBtn}
                        onClick={(e) => toggleMute(e, idx)}
                        aria-label={mutedStates[idx] ? 'Unmute' : 'Mute'}
                      >
                        {mutedStates[idx] ? '🔇' : '🔊'}
                      </button>
                    </div>
                  </div>

                  {/* Play indicator */}
                  <div
                    className={styles.playBtn}
                    style={{ display: !isPlaying ? 'flex' : 'none' }}
                  >
                    <span>▶</span>
                  </div>

                  {/* Reel info */}
                  <div className={styles.reelInfo}>
                    <span className={styles.liveStatus}>
                      <span className={styles.liveDot} />
                      {isPlaying ? 'Sedang Diputar' : 'Dokumentasi Al-Jihad'}
                    </span>
                    <p className={styles.reelTitle}>{reel.judul}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className={styles.instagramCta}>
          <a
            href="https://instagram.com/masjidaljihad.karawang"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-white btn-lg"
          >
            Follow @masjidaljihad.karawang
          </a>
        </div>
      </div>
    </section>
  )
}

'use client'

import { useState } from 'react'
import { masjidStore, type KritikSaranItem } from '@/lib/masjidStore'
import { getActiveSupabaseConfig, getSupabaseClient } from '@/lib/supabase'
import styles from './KritikSaranSection.module.css'

export default function KritikSaranSection() {
  const [nama, setNama] = useState('')
  const [kontak, setKontak] = useState('')
  const [kategori, setKategori] = useState('Fasilitas & Kebersihan')
  const [pesan, setPesan] = useState('')
  const [sent, setSent] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const hasUnsavedInput = Boolean(nama.trim() || kontak.trim() || pesan.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const current = masjidStore.getKritik()
    const newItem: KritikSaranItem = {
      id: 'ks-' + Date.now(),
      nama: nama.trim() || 'Jamaah Hamba Allah',
      kontak: kontak.trim() || '-',
      kategori,
      pesan: pesan.trim(),
      tanggal: new Date().toISOString().slice(0, 10),
      status: 'Baru',
    }
    masjidStore.saveKritik([newItem, ...current])

    // Simpan juga ke tabel kritik_saran di Supabase bila sudah terhubung
    const cfg = getActiveSupabaseConfig()
    if (cfg.isConfigured) {
      const sb = getSupabaseClient()
      await sb.from('kritik_saran').insert({
        nama: newItem.nama,
        kontak: newItem.kontak,
        kategori: newItem.kategori,
        pesan: newItem.pesan,
        tanggal: newItem.tanggal,
        status: 'Baru',
      })
    }

    setNama('')
    setKontak('')
    setPesan('')
    setSent(true)
    setTimeout(() => setSent(false), 5000)
  }

  return (
    <section id="kritik-saran" className={styles.section}>
      <div className="container">
        <div className={styles.boxGrid}>
          <div className={styles.infoCol}>
            <h2>Kotak Kritik &amp; Saran Jamaah</h2>
            <p>
              Masukan, aspirasi, dan saran Anda sangat berharga bagi peningkatan kualitas pelayanan
              ibadah, kebersihan, serta kegiatan dakwah di Masjid Al-Jihad Karawang.
            </p>
            <div className={styles.moderationNote}>
              Setiap pesan yang dikirimkan akan masuk secara privat ke ruang tinjau{' '}
              <strong>Menu Admin DKM Al-Jihad</strong> terlebih dahulu untuk ditindaklanjuti oleh
              pengurus bidang terkait.
            </div>
          </div>

          <form className={styles.formCol} onSubmit={handleSubmit}>
            <div
              className={styles.toastSuccess}
              style={{ display: sent ? 'block' : 'none' }}
            >
              Alhamdulillah, kritik &amp; saran Anda telah berhasil dikirim ke Kotak Masuk Admin DKM
              Al-Jihad. Terima kasih atas kepedulian Anda!
            </div>

            <div className={styles.rowTwo}>
              <div className={styles.field}>
                <label>Nama Lengkap (Boleh Anonim)</label>
                <input
                  type="text"
                  placeholder="Contoh: Ahmad / Jamaah"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label>No. WhatsApp / Kontak (Opsional)</label>
                <input
                  type="text"
                  placeholder="0812xxxx"
                  value={kontak}
                  onChange={(e) => setKontak(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Kategori Masukan</label>
              <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
                <option value="Fasilitas & Kebersihan">Fasilitas &amp; Kebersihan Masjid</option>
                <option value="Ibadah & Kajian">Pelaksanaan Ibadah &amp; Kajian</option>
                <option value="Pelayanan DKM">Pelayanan Sekretariat DKM</option>
                <option value="Keamanan & Parkir">Keamanan &amp; Area Parkir</option>
                <option value="Usulan Kegiatan">Usulan Program / Kegiatan Baru</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>Isi Kritik / Saran</label>
              <textarea
                rows={3}
                required
                placeholder="Tuliskan saran atau masukan Anda untuk kemakmuran Masjid Al-Jihad..."
                value={pesan}
                onChange={(e) => setPesan(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Kirim Kritik &amp; Saran ke Admin DKM →
              </button>
              {hasUnsavedInput && (
                <button
                  type="button"
                  onClick={() => setShowUnsavedModal(true)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid #d1d5db',
                    background: '#f9fafb',
                    color: '#374151',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                  }}
                >
                  Batalkan Input
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* POP-UP ALA WEB: NOTIFIKASI PERUBAHAN TIDAK AKAN DISIMPAN */}
      {showUnsavedModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            zIndex: 10050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowUnsavedModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.34)',
              position: 'relative',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Tutup"
              onClick={() => setShowUnsavedModal(false)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                border: 'none',
                background: '#f3f4f6',
                borderRadius: '8px',
                width: '30px',
                height: '30px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '999px',
                background: '#fef3c7',
                border: '2px solid #f59e0b',
                color: '#b45309',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 900,
                marginBottom: '12px',
              }}
            >
              !
            </div>

            <h3 style={{ margin: '0 0 8px', color: '#0f4a2a', fontSize: '1.12rem', fontWeight: 800 }}>
              Perubahan Tidak Akan Disimpan
            </h3>

            <p
              style={{
                margin: '0 0 18px',
                fontSize: '0.86rem',
                color: '#374151',
                lineHeight: 1.55,
              }}
            >
              Data kritik &amp; saran yang sedang Anda isi belum dikirim. Jika dibatalkan sekarang,
              perubahan tidak akan disimpan.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowUnsavedModal(false)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
                  color: '#1f2937',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Lanjut Mengisi
              </button>
              <button
                type="button"
                onClick={() => {
                  setNama('')
                  setKontak('')
                  setPesan('')
                  setShowUnsavedModal(false)
                }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Keluar (Jangan Simpan)
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

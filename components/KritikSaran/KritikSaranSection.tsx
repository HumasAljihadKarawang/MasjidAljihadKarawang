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

            <button type="submit" className="btn btn-primary">
              Kirim Kritik &amp; Saran ke Admin DKM →
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

-- ==========================================================
-- SUPABASE SQL SCHEMA LENGKAP - MASJID AL-JIHAD KARAWANG
-- Salin & Jalankan seluruh script ini di menu "SQL Editor" Supabase
-- ==========================================================

-- 1. Tabel Berita Masjid
CREATE TABLE IF NOT EXISTS berita (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  ringkasan TEXT,
  konten TEXT NOT NULL,
  thumbnail_url TEXT,
  kategori TEXT DEFAULT 'KEGIATAN MASJID',
  penulis TEXT DEFAULT 'Admin DKM',
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabel Master Kegiatan & Custom Layanan Unggulan
CREATE TABLE IF NOT EXISTS program (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  jadwal TEXT DEFAULT 'Rutin Mingguan',
  lokasi TEXT DEFAULT 'Masjid Al-Jihad Karawang',
  ikon TEXT DEFAULT '🕌',
  kategori TEXT DEFAULT 'Ibadah',
  badge_custom TEXT DEFAULT 'Aktif',
  warna_custom TEXT DEFAULT '#1B6B45',
  tampil_beranda BOOLEAN DEFAULT true,
  aktif BOOLEAN DEFAULT true,
  urutan INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabel Kalender Kegiatan & Anti-Bentrok Jadwal
CREATE TABLE IF NOT EXISTS jadwal_terdekat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_acara TEXT NOT NULL,
  pemateri TEXT DEFAULT 'DKM Al-Jihad',
  tanggal DATE NOT NULL,
  jam_mulai TEXT NOT NULL DEFAULT '18:30',
  jam_selesai TEXT NOT NULL DEFAULT '20:00',
  waktu TEXT,
  lokasi TEXT DEFAULT 'Ruang Sholat Utama Lantai 1',
  kategori TEXT DEFAULT 'Kajian',
  keterangan TEXT,
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabel Jadwal Khatib Khutbah Jumat
CREATE TABLE IF NOT EXISTS jadwal_khatib (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal_jumat DATE NOT NULL,
  tanggal_hijriah TEXT,
  nama_khatib TEXT NOT NULL,
  nama_imam TEXT,
  tema_khutbah TEXT,
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabel Kitab Digital (Menu El Jihad)
CREATE TABLE IF NOT EXISTS kitab_eljihad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul_kitab TEXT NOT NULL,
  penulis_ulama TEXT,
  kategori_kitab TEXT DEFAULT 'Fiqih & Ibadah',
  deskripsi TEXT,
  file_pdf_url TEXT NOT NULL,
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabel Video Kegiatan Masjid
CREATE TABLE IF NOT EXISTS reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL,
  url_video TEXT NOT NULL,
  thumbnail_url TEXT,
  kategori TEXT DEFAULT 'Kegiatan Masjid',
  durasi TEXT DEFAULT '01:15',
  urutan INT DEFAULT 0,
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Tabel Kotak Masuk Kritik & Saran Jamaah
CREATE TABLE IF NOT EXISTS kritik_saran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT DEFAULT 'Jamaah Hamba Allah',
  kontak TEXT DEFAULT '-',
  kategori TEXT DEFAULT 'Fasilitas & Kebersihan',
  pesan TEXT NOT NULL,
  tanggal DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Baru',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE berita ENABLE ROW LEVEL SECURITY;
ALTER TABLE program ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_terdekat ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_khatib ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitab_eljihad ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE kritik_saran ENABLE ROW LEVEL SECURITY;

-- Policy Baca & Tulis agar Web dan Admin dapat langsung mengelola data
DROP POLICY IF EXISTS "Public Access Berita" ON berita;
CREATE POLICY "Public Access Berita" ON berita FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Program" ON program;
CREATE POLICY "Public Access Program" ON program FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Jadwal" ON jadwal_terdekat;
CREATE POLICY "Public Access Jadwal" ON jadwal_terdekat FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Khatib" ON jadwal_khatib;
CREATE POLICY "Public Access Khatib" ON jadwal_khatib FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Kitab" ON kitab_eljihad;
CREATE POLICY "Public Access Kitab" ON kitab_eljihad FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Reels" ON reels;
CREATE POLICY "Public Access Reels" ON reels FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access KritikSaran" ON kritik_saran;
CREATE POLICY "Public Access KritikSaran" ON kritik_saran FOR ALL USING (true) WITH CHECK (true);

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const { Boom } = require('@hapi/boom');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const PORT = 3099;
const AUTH_DIR = path.join(__dirname, 'auth_info');

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

const app = express();

// Allow requests from both localhost and HTTPS Vercel origin + Chrome Private Network Access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(cors({ origin: true }));
app.use(express.json({ limit: '25mb' }));

let sock = null;
let isStarting = false;
let connectionState = {
  connected: false,
  qr: null,
  qrDataUrl: null,
  phone: null,
  name: null,
  statusText: 'Menghubungkan ke WhatsApp...',
};

function formatJid(rawPhone) {
  let digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1);
  } else if (digits.startsWith('8')) {
    digits = '62' + digits;
  }
  return `${digits}@s.whatsapp.net`;
}

async function startWhatsApp() {
  if (isStarting) return;
  isStarting = true;
  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3000, 1015901307],
    }));

    sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: ['DKM Al-Jihad WA Sender', 'Chrome', '1.0.0'],
      printQRInTerminal: false,
      syncFullHistory: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        let qrDataUrl = null;
        try {
          qrDataUrl = await qrcode.toDataURL(qr, { width: 280, margin: 2 });
        } catch {
          qrDataUrl = null;
        }
        connectionState.connected = false;
        connectionState.qr = qr;
        connectionState.qrDataUrl = qrDataUrl;
        connectionState.statusText = 'Silakan scan QR code WhatsApp (bisa langsung dari Web Admin).';
        console.log('\n======================================================');
        console.log('SCAN QR CODE WHATSAPP INI DARI HP ANDA:');
        console.log('Buka WhatsApp > Perangkat Tertaut > Tautkan Perangkat');
        console.log('======================================================');
        qrcodeTerminal.generate(qr, { small: true });
      }

      if (connection === 'open') {
        const userId = sock?.user?.id || '';
        const phone = userId.split(':')[0] || userId.split('@')[0] || '';
        connectionState = {
          connected: true,
          qr: null,
          qrDataUrl: null,
          phone,
          name: sock?.user?.name || 'WhatsApp DKM',
          statusText: 'Terhubung',
        };
        console.log(`\n[OK] WhatsApp Terhubung! Nomor: +${phone} (${connectionState.name})`);
        console.log(`[READY] Siap menerima perintah kirim dari Web Admin DKM di http://127.0.0.1:${PORT}\n`);
      }

      if (connection === 'close') {
        const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        connectionState.connected = false;
        connectionState.qr = null;
        connectionState.qrDataUrl = null;
        connectionState.statusText = shouldReconnect
          ? 'Koneksi terputus, mencoba menghubungkan ulang...'
          : 'Sesi WhatsApp logout. Menyiapkan QR baru...';

        console.log(`[INFO] Koneksi WA tertutup (code: ${statusCode}). Reconnect: ${shouldReconnect}`);
        if (shouldReconnect) {
          setTimeout(() => {
            startWhatsApp().catch(() => {});
          }, 3000);
        } else {
          // Hapus auth lama dan buat sesi QR baru otomatis agar web langsung dapat QR baru
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {
            // ignore
          }
          setTimeout(() => {
            startWhatsApp().catch(() => {});
          }, 1500);
        }
      }
    });
  } finally {
    isStarting = false;
  }
}

app.get('/status', (_req, res) => {
  res.json({
    ok: true,
    ...connectionState,
  });
});

app.post('/logout', async (_req, res) => {
  try {
    if (sock) {
      try {
        await sock.logout();
      } catch {
        // ignore if already closed
      }
      sock = null;
    }
    try {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
    connectionState = {
      connected: false,
      qr: null,
      qrDataUrl: null,
      phone: null,
      name: null,
      statusText: 'Memuat QR Code baru...',
    };
    setTimeout(() => {
      startWhatsApp().catch(() => {});
    }, 800);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Gagal logout WA' });
  }
});

app.post('/send-media', async (req, res) => {
  try {
    // Jika Baileys sedang reconnect sesaat, tunggu maksimal 6 detik agar tidak gagal di tengah kirim massal
    if (!sock || !connectionState.connected) {
      for (let w = 0; w < 12; w += 1) {
        if (sock && connectionState.connected) break;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (!sock || !connectionState.connected) {
      return res.status(503).json({
        ok: false,
        error: 'WhatsApp belum terhubung. Pastikan sudah scan QR dari Web Admin atau terminal.',
      });
    }

    const { phone, caption, imageBase64, fileName } = req.body || {};
    const jid = formatJid(phone);
    if (!jid) {
      return res.status(400).json({
        ok: false,
        error: 'Nomor WhatsApp tujuan tidak valid atau kosong.',
      });
    }

    const cleanBase64 = String(imageBase64 || '').replace(/^data:image\/\w+;base64,/, '');
    if (!cleanBase64) {
      await sock.sendMessage(jid, { text: String(caption || '') });
      console.log(`[TERKIRIM TEKS] -> ${jid}`);
      return res.json({ ok: true, jid, mode: 'text' });
    }

    const imgBuffer = Buffer.from(cleanBase64, 'base64');
    await sock.sendMessage(jid, {
      image: imgBuffer,
      caption: String(caption || ''),
      mimetype: 'image/png',
      fileName: fileName || 'Surat-Undangan.png',
    });

    console.log(`[TERKIRIM GAMBAR + TEKS] -> ${jid} (${fileName || 'Surat-Undangan.png'})`);
    return res.json({ ok: true, jid, mode: 'image' });
  } catch (err) {
    console.error('[ERROR KIRIM WA]', err);
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Gagal mengirim pesan WhatsApp.',
    });
  }
});

const SCHEDULE_FILE = path.join(__dirname, 'scheduled_jobs.json');

function loadScheduledJobs() {
  try {
    if (!fs.existsSync(SCHEDULE_FILE)) return [];
    const raw = fs.readFileSync(SCHEDULE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveScheduledJobs(jobs) {
  try {
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(jobs, null, 2), 'utf8');
  } catch (err) {
    console.error('[ERROR SAVE SCHEDULE]', err);
  }
}

app.get('/scheduled', (_req, res) => {
  const jobs = loadScheduledJobs().map((j) => ({
    id: j.id,
    phone: j.phone,
    scheduledAt: j.scheduledAt,
    sent: Boolean(j.sent),
    sentAt: j.sentAt || null,
    error: j.error || null,
  }));
  res.json({ ok: true, jobs });
});

app.post('/schedule-send', (req, res) => {
  try {
    const { id, phone, caption, imageBase64, fileName, scheduledAt } = req.body || {};
    const jid = formatJid(phone);
    if (!jid) {
      return res.status(400).json({ ok: false, error: 'Nomor WhatsApp tujuan tidak valid.' });
    }
    const targetTime = new Date(scheduledAt).getTime();
    if (!scheduledAt || Number.isNaN(targetTime)) {
      return res.status(400).json({ ok: false, error: 'Waktu jadwal tidak valid.' });
    }
    const jobs = loadScheduledJobs().filter((j) => j.id !== String(id));
    jobs.push({
      id: String(id || Date.now()),
      phone: String(phone),
      caption: String(caption || ''),
      imageBase64: String(imageBase64 || ''),
      fileName: fileName || 'Surat-Undangan.png',
      scheduledAt: new Date(targetTime).toISOString(),
      sent: false,
      sentAt: null,
      error: null,
    });
    saveScheduledJobs(jobs);
    console.log(`[JADWAL TERSIMPAN] id=${id} -> ${jid} pada ${new Date(targetTime).toLocaleString('id-ID')}`);
    return res.json({ ok: true, scheduledAt: new Date(targetTime).toISOString() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Gagal menjadwalkan.' });
  }
});

let isProcessingSchedule = false;
setInterval(async () => {
  if (isProcessingSchedule || !sock || !connectionState.connected) return;
  const jobs = loadScheduledJobs();
  const now = Date.now();
  const dueJobs = jobs.filter((j) => !j.sent && new Date(j.scheduledAt).getTime() <= now);
  if (dueJobs.length === 0) return;

  isProcessingSchedule = true;
  try {
    let changed = false;
    for (const job of dueJobs) {
      try {
        const jid = formatJid(job.phone);
        if (!jid) {
          job.error = 'Nomor tidak valid';
          changed = true;
          continue;
        }
        const cleanBase64 = String(job.imageBase64 || '').replace(/^data:image\/\w+;base64,/, '');
        if (cleanBase64) {
          await sock.sendMessage(jid, {
            image: Buffer.from(cleanBase64, 'base64'),
            caption: String(job.caption || ''),
            mimetype: 'image/png',
            fileName: job.fileName || 'Surat-Undangan.png',
          });
        } else {
          await sock.sendMessage(jid, { text: String(job.caption || '') });
        }
        job.sent = true;
        job.sentAt = new Date().toISOString();
        job.error = null;
        changed = true;
        console.log(`[JADWAL TERKIRIM OTOMATIS] -> ${jid} (${job.fileName})`);
      } catch (err) {
        job.error = err?.message || 'Gagal kirim terjadwal';
        changed = true;
        console.error('[ERROR JADWAL]', err);
      }
    }
    if (changed) {
      saveScheduledJobs(jobs);
    }
  } finally {
    isProcessingSchedule = false;
  }
}, 10000);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('======================================================');
  console.log('  WA SENDER LOKAL - MASJID AL-JIHAD KARAWANG');
  console.log(`  Server aktif di http://127.0.0.1:${PORT}`);
  console.log('  QR Code juga tampil otomatis di Web Admin.');
  console.log('======================================================\n');
  startWhatsApp().catch((err) => {
    console.error('Gagal memulai WhatsApp socket:', err);
  });
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.log(`[INFO] Port ${PORT} sudah dipakai proses lain. Menutup duplikat...`);
    process.exit(0);
  }
  console.error('[SERVER ERROR]', err);
});

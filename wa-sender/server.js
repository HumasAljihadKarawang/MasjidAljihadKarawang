const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
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
let connectionState = {
  connected: false,
  qr: null,
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

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      connectionState.connected = false;
      connectionState.qr = qr;
      connectionState.statusText = 'Silakan scan QR code WhatsApp di terminal ini.';
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
      connectionState.statusText = shouldReconnect
        ? 'Koneksi terputus, mencoba menghubungkan ulang...'
        : 'Sesi WhatsApp logout. Hapus folder auth_info lalu jalankan ulang untuk scan QR.';

      console.log(`[INFO] Koneksi WA tertutup (code: ${statusCode}). Reconnect: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(startWhatsApp, 3000);
      }
    }
  });
}

app.get('/status', (_req, res) => {
  res.json({
    ok: true,
    ...connectionState,
  });
});

app.post('/send-media', async (req, res) => {
  try {
    if (!sock || !connectionState.connected) {
      return res.status(503).json({
        ok: false,
        error: 'WhatsApp belum terhubung. Pastikan sudah scan QR di terminal WA Sender.',
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
      // Fallback kirim teks saja jika tidak ada gambar
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

app.listen(PORT, '127.0.0.1', () => {
  console.log('======================================================');
  console.log('  WA SENDER LOKAL - MASJID AL-JIHAD KARAWANG');
  console.log(`  Server aktif di http://127.0.0.1:${PORT}`);
  console.log('  Jangan tutup jendela ini selama mengirim surat.');
  console.log('======================================================\n');
  startWhatsApp().catch((err) => {
    console.error('Gagal memulai WhatsApp socket:', err);
  });
});

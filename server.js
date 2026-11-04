// Claimora — Express backend (ESM)
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { randomBytes } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { verifyMessage } from 'viem';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// CONFIG — replace before deploying
// ---------------------------------------------------------------------------
// Add your admin wallet addresses here (lowercase, checksummed NOT required).
const ADMIN_WALLETS = (process.env.ADMIN_WALLETS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
// Your Render domain (optional, the CORS fn already allows *.onrender.com)
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || '';

const PORT = process.env.PORT || 4000;
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const COOKIE_SECURE = process.env.NODE_ENV === 'production';

const nonceStore = new Map(); // address(lowercase) -> { nonce, expiresAt }

// ---------------------------------------------------------------------------
// MIDDLEWARE
// ---------------------------------------------------------------------------
app.set('trust proxy', 1);
app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // same-origin / curl
      if (origin === RENDER_URL) return cb(null, true);
      if (origin === 'http://localhost:3000') return cb(null, true);
      if (origin === 'http://localhost:4000') return cb(null, true);
      if (origin.endsWith('.onrender.com')) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
const isAddress = (a) => typeof a === 'string' && /^0x[a-fA-F0-9]{40}$/.test(a);

function cleanExpiredNonces() {
  const now = Date.now();
  for (const [key, entry] of nonceStore.entries()) {
    if (entry.expiresAt <= now) nonceStore.delete(key);
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: COOKIE_SECURE,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

// ---------------------------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/nonce', (req, res) => {
  const address = String(req.query.address || '');
  if (!isAddress(address)) {
    return res.status(400).json({ error: 'Valid address required' });
  }
  cleanExpiredNonces();
  const nonce = randomBytes(16).toString('hex');
  nonceStore.set(address.toLowerCase(), {
    nonce,
    expiresAt: Date.now() + NONCE_TTL_MS,
  });
  res.json({ nonce, expiresInMs: NONCE_TTL_MS });
});

app.post('/api/verify', async (req, res) => {
  try {
    const { address, message, signature } = req.body || {};
    if (!isAddress(address) || !message || !signature) {
      return res.status(400).json({ error: 'Missing or invalid fields' });
    }
    const key = address.toLowerCase();
    const entry = nonceStore.get(key);

    if (!entry) {
      return res.status(400).json({ error: 'Nonce not found. Request a new one.' });
    }
    if (Date.now() > entry.expiresAt) {
      nonceStore.delete(key);
      return res.status(400).json({ error: 'Nonce expired' });
    }
    if (!String(message).includes(entry.nonce)) {
      return res.status(400).json({ error: 'Nonce missing from message' });
    }

    let valid = false;
    try {
      valid = await verifyMessage({ address, message, signature });
    } catch (_e) {
      valid = false;
    }
    if (!valid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    nonceStore.delete(key);

    await prisma.user.upsert({
      where: { walletAddress: key },
      update: { lastLoginAt: new Date() },
      create: { walletAddress: key },
    });

    const isAdmin = ADMIN_WALLETS.includes(key);

    res.cookie('claimora_session', key, cookieOptions);
    return res.json({ ok: true, address: key, isAdmin });
  } catch (err) {
    console.error('[verify] error', err);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

app.get('/api/session', (req, res) => {
  const addr = req.cookies?.claimora_session;
  if (!addr) return res.json({ authenticated: false });
  const key = String(addr).toLowerCase();
  res.json({
    authenticated: true,
    address: key,
    isAdmin: ADMIN_WALLETS.includes(key),
  });
});

app.get('/api/admin/users', async (req, res) => {
  const addr = req.cookies?.claimora_session;
  if (!addr) return res.status(401).json({ error: 'Not signed in' });
  const key = String(addr).toLowerCase();
  if (!ADMIN_WALLETS.includes(key)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (err) {
    console.error('[admin/users] error', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('claimora_session', { path: '/' });
  res.json({ ok: true });
});

// Public frontend configuration. Only publish values that are safe to expose in a browser.
app.get('/config.js', (_req, res) => {
  res.type('application/javascript').set('Cache-Control', 'no-store').send(
    `window.CLAIMORA_CONFIG = ${JSON.stringify({
      reownProjectId: process.env.REOWN_PROJECT_ID || '',
      adminWallets: ADMIN_WALLETS,
    })};`
  );
});

// ---------------------------------------------------------------------------
// STATIC + CATCH-ALL
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------------------------------------------------------------------
// BOOT
// ---------------------------------------------------------------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Claimora running on http://0.0.0.0:${PORT}`);
});

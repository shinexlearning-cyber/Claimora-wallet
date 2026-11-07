import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.js';
import { walletRouter } from './routes/wallets.js';
import { adminRouter } from './routes/admin.js';
import { webhookRouter } from './routes/webhooks.js';
import { publicRouter } from './routes/public.js';
import { redeemRouter } from './routes/redeem.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'velmora-api', time: new Date().toISOString() });
});

app.use('/api/public', publicRouter);
app.use('/api/auth', authRouter);
app.use('/api/wallets', requireAuth, walletRouter);
app.use('/api/redeem', redeemRouter);
app.use('/api/admin', requireAuth, adminRouter);
app.use('/api/webhooks', webhookRouter); // signature verified inside

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Velmora API listening on http://localhost:${PORT}`);
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change-me')) {
    console.warn('WARNING: JWT_SECRET is not set to a secure value');
  }
  if (!process.env.XELLAR_APP_ID || !process.env.XELLAR_CLIENT_SECRET) {
    console.warn('WARNING: Xellar credentials missing — custodial features will return config errors');
  }
});

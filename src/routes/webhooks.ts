import { Router } from 'express';
// Xellar / provider webhooks must verify signatures before any balance credit.

export const webhookRouter = Router();

webhookRouter.post('/xellar', async (req, res) => {
  // 1. Verify Xellar signature / secret (implement from their docs)
  // 2. Check idempotency key / requestId already processed
  // 3. Only then credit ledger (never on pending)
  // 4. Respond 200 quickly
  console.log('[webhook/xellar] received (signature verification not yet implemented)');
  res.status(200).send('ok');
});

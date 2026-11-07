import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { createCustodialWallet, isXellarConfigured } from '../services/xellar.js';
import { requireAuth } from '../middleware/auth.js';

export const walletRouter = Router();

walletRouter.get('/', async (req, res, next) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId: req.user!.id },
      include: { balances: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ wallets, xellarConfigured: isXellarConfigured() });
  } catch (err) {
    next(err);
  }
});

walletRouter.post('/custodial', async (req, res, next) => {
  try {
    if (!isXellarConfigured()) {
      return res.status(503).json({
        error: 'Custodial wallets require Xellar configuration',
        code: 'XELLAR_NOT_CONFIGURED',
      });
    }
    // One custodial wallet per user for simplicity (extendable)
    const existing = await prisma.wallet.findFirst({
      where: { userId: req.user!.id, type: 'CUSTODIAL' },
    });
    if (existing) {
      return res.status(409).json({ error: 'Custodial wallet already exists', wallet: existing });
    }
    const result = await createCustodialWallet(req.user!.id);
    const wallet = await prisma.wallet.create({
      data: {
        userId: req.user!.id,
        type: 'CUSTODIAL',
        xellarSubId: req.user!.id,
        network: 'ethereum',
        label: 'Velmora Custodial',
        isPrimary: true,
        // address & xellarWalletId filled after live Xellar response
      },
    });
    res.status(201).json({ wallet, xellar: result });
  } catch (err) {
    next(err);
  }
});

walletRouter.post('/connected', async (req, res, next) => {
  try {
    const schema = z.object({
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      provider: z.string().max(50).default('metamask'),
      label: z.string().max(80).optional(),
    });
    const body = schema.parse(req.body);
    const wallet = await prisma.wallet.create({
      data: {
        userId: req.user!.id,
        type: 'CONNECTED',
        connectedAddress: body.address.toLowerCase(),
        provider: body.provider,
        label: body.label || 'Connected Wallet',
        network: 'ethereum',
      },
    });
    res.status(201).json({ wallet });
  } catch (err) {
    next(err);
  }
});

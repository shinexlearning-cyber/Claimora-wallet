import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireOwner, requireRole } from '../middleware/auth.js';

export const redeemRouter = Router();

function generateCode(): string {
  const raw = randomBytes(6).toString('hex').toUpperCase();
  // VELM-XXXX-XXXX style
  return `VELM-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

/** User: redeem a code into custodial balance (ledger) */
redeemRouter.post('/redeem', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      code: z.string().min(6).max(64),
    });
    const { code } = schema.parse(req.body);
    const normalized = code.trim().toUpperCase().replace(/\s+/g, '');

    const result = await prisma.$transaction(async (tx) => {
      const card = await tx.redeemCode.findUnique({ where: { code: normalized } });
      if (!card) {
        const err: any = new Error('Invalid redeem code');
        err.status = 404;
        throw err;
      }
      if (card.status !== 'active') {
        const err: any = new Error(`Code is ${card.status}`);
        err.status = 400;
        throw err;
      }
      if (card.expiresAt && card.expiresAt < new Date()) {
        await tx.redeemCode.update({
          where: { id: card.id },
          data: { status: 'expired' },
        });
        const err: any = new Error('Code has expired');
        err.status = 400;
        throw err;
      }

      const user = await tx.user.findUnique({ where: { id: req.user!.id } });
      if (!user || !user.isActive || user.isSuspended) {
        const err: any = new Error('Account cannot redeem codes');
        err.status = 403;
        throw err;
      }

      // Prefer custodial wallet
      let wallet = await tx.wallet.findFirst({
        where: { userId: user.id, type: 'CUSTODIAL' },
      });
      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: user.id,
            type: 'CUSTODIAL',
            network: card.network || 'ethereum',
            label: 'Velmora Custodial',
            isPrimary: true,
          },
        });
      }

      let balance = await tx.balance.findFirst({
        where: {
          walletId: wallet.id,
          asset: card.asset,
          network: card.network || 'ethereum',
        },
      });
      if (!balance) {
        balance = await tx.balance.create({
          data: {
            walletId: wallet.id,
            asset: card.asset,
            network: card.network || 'ethereum',
            available: '0',
            pending: '0',
            reserved: '0',
          },
        });
      }

      const prev = parseFloat(balance.available || '0');
      const add = parseFloat(card.amount);
      if (isNaN(add) || add <= 0) {
        const err: any = new Error('Invalid card amount');
        err.status = 400;
        throw err;
      }
      const next = (prev + add).toFixed(8);

      await tx.balance.update({
        where: { id: balance.id },
        data: { available: next },
      });

      await tx.redeemCode.update({
        where: { id: card.id },
        data: {
          status: 'redeemed',
          redeemedAt: new Date(),
          redeemedById: user.id,
        },
      });

      const reference = `RDM-${Date.now()}-${randomBytes(3).toString('hex')}`;
      const transaction = await tx.transaction.create({
        data: {
          reference,
          userId: user.id,
          walletId: wallet.id,
          type: 'DEPOSIT',
          status: 'COMPLETED',
          asset: card.asset,
          network: card.network || 'ethereum',
          amount: card.amount,
          fee: '0',
          metadata: JSON.stringify({ source: 'redeem_code', code: normalized }),
          completedAt: new Date(),
        },
      });

      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          userId: user.id,
          walletId: wallet.id,
          account: `user:available:${card.asset}`,
          direction: 'CREDIT',
          amount: card.amount,
          asset: card.asset,
          balanceAfter: next,
          note: `Redeem code ${normalized}`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          actorEmail: user.email,
          action: 'REDEEM_CODE',
          resource: 'RedeemCode',
          resourceId: card.id,
          details: JSON.stringify({ amount: card.amount, asset: card.asset }),
        },
      });

      return {
        amount: card.amount,
        asset: card.asset,
        network: card.network,
        newBalance: next,
        reference,
      };
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/** Admin: list codes */
redeemRouter.get('/codes', requireAuth, requireRole('OWNER', 'SUPPORT'), async (req, res, next) => {
  try {
    const codes = await prisma.redeemCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        redeemedBy: { select: { email: true } },
      },
    });
    res.json({ codes });
  } catch (err) {
    next(err);
  }
});

/** Owner: create one or batch codes */
redeemRouter.post('/codes', requireAuth, requireOwner, async (req, res, next) => {
  try {
    const schema = z.object({
      amount: z.string().min(1),
      asset: z.string().min(1).max(20),
      network: z.string().default('ethereum'),
      count: z.number().int().min(1).max(100).default(1),
      expiresInDays: z.number().int().min(0).max(365).optional(),
      note: z.string().max(200).optional(),
    });
    const body = schema.parse(req.body);
    const amt = parseFloat(body.amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const batchId = randomBytes(4).toString('hex');
    const expiresAt =
      body.expiresInDays && body.expiresInDays > 0
        ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    const created = [];
    for (let i = 0; i < body.count; i++) {
      let code = generateCode();
      // ensure unique
      for (let t = 0; t < 5; t++) {
        const exists = await prisma.redeemCode.findUnique({ where: { code } });
        if (!exists) break;
        code = generateCode();
      }
      const row = await prisma.redeemCode.create({
        data: {
          code,
          amount: String(body.amount),
          asset: body.asset.toUpperCase(),
          network: body.network,
          status: 'active',
          expiresAt,
          batchId,
          note: body.note,
          createdById: req.user!.id,
        },
      });
      created.push(row);
    }

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        action: 'REDEEM_CODES_CREATED',
        resource: 'RedeemCode',
        details: JSON.stringify({
          count: body.count,
          amount: body.amount,
          asset: body.asset,
          batchId,
        }),
      },
    });

    res.status(201).json({ codes: created, batchId });
  } catch (err) {
    next(err);
  }
});

/** Owner: disable a code */
redeemRouter.post('/codes/:id/disable', requireAuth, requireOwner, async (req, res, next) => {
  try {
    const card = await prisma.redeemCode.update({
      where: { id: req.params.id },
      data: { status: 'disabled' },
    });
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        action: 'REDEEM_CODE_DISABLED',
        resource: 'RedeemCode',
        resourceId: card.id,
      },
    });
    res.json({ code: card });
  } catch (err) {
    next(err);
  }
});

/**
 * Cross-app validation (read-only check).
 * Other apps can call this with the code to see if it is valid
 * BEFORE asking the user to redeem inside Velmora.
 * Actual credit only happens via POST /redeem while logged into Velmora
 * (or a future partner OAuth flow).
 */
redeemRouter.get('/validate/:code', async (req, res, next) => {
  try {
    const normalized = String(req.params.code || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
    const card = await prisma.redeemCode.findUnique({ where: { code: normalized } });
    if (!card) {
      return res.json({ valid: false, reason: 'not_found' });
    }
    if (card.status !== 'active') {
      return res.json({ valid: false, reason: card.status });
    }
    if (card.expiresAt && card.expiresAt < new Date()) {
      return res.json({ valid: false, reason: 'expired' });
    }
    res.json({
      valid: true,
      asset: card.asset,
      amount: card.amount,
      network: card.network,
      expiresAt: card.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

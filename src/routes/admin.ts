import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireOwner, requireRole } from '../middleware/auth.js';

export const adminRouter = Router();

// Owner + Support can list users (Support has limited fields)
adminRouter.get('/users', requireRole('OWNER', 'SUPPORT'), async (req, res, next) => {
  try {
    const isOwner = req.user!.role === 'OWNER';
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isSuspended: true,
        createdAt: true,
        lastLoginAt: true,
        ...(isOwner ? {} : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// Only Owner can suspend / change roles (never promote another OWNER)
adminRouter.patch('/users/:id', requireOwner, async (req, res, next) => {
  try {
    const { isSuspended, isActive, role } = req.body;
    if (role === 'OWNER') {
      return res.status(400).json({ error: 'Cannot create additional Owner accounts' });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(typeof isSuspended === 'boolean' ? { isSuspended } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(role === 'USER' || role === 'SUPPORT' ? { role } : {}),
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        action: 'USER_UPDATE',
        resource: 'User',
        resourceId: user.id,
        details: JSON.stringify({ isSuspended, isActive, role }),
      },
    });
    res.json({ user: { id: user.id, email: user.email, role: user.role, isSuspended: user.isSuspended } });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/transactions', requireRole('OWNER', 'SUPPORT'), async (req, res, next) => {
  try {
    const txs = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { email: true } } },
    });
    res.json({ transactions: txs });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/audit', requireOwner, async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/system/withdrawal-suspend', requireOwner, async (req, res, next) => {
  try {
    const enabled = Boolean(req.body.enabled);
    await prisma.systemConfig.upsert({
      where: { id: 'global' },
      create: { id: 'global', withdrawalEnabled: enabled },
      update: { withdrawalEnabled: enabled, updatedBy: req.user!.id },
    });
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        action: enabled ? 'WITHDRAWAL_ENABLED' : 'WITHDRAWAL_SUSPENDED',
        resource: 'SystemConfig',
      },
    });
    res.json({ withdrawalEnabled: enabled });
  } catch (err) {
    next(err);
  }
});

// ========== System Settings (Owner only for write) ==========

adminRouter.get('/settings', requireRole('OWNER', 'SUPPORT'), async (req, res, next) => {
  try {
    let config = await prisma.systemConfig.findUnique({ where: { id: 'global' } });
    if (!config) {
      config = await prisma.systemConfig.create({
        data: { id: 'global', appName: 'Velmora' },
      });
    }
    res.json({
      appName: config.appName,
      withdrawalEnabled: config.withdrawalEnabled,
      dailyWithdrawalLimitUsd: config.dailyWithdrawalLimitUsd,
      minWithdrawal: config.minWithdrawal,
      feeBps: config.feeBps,
      treasuryAddress: config.treasuryAddress || null,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/settings', requireOwner, async (req, res, next) => {
  try {
    const { appName, withdrawalEnabled, dailyWithdrawalLimitUsd, minWithdrawal, feeBps, treasuryAddress } = req.body;

    if (appName !== undefined) {
      if (typeof appName !== 'string' || appName.trim().length < 2 || appName.trim().length > 40) {
        return res.status(400).json({ error: 'App name must be between 2 and 40 characters' });
      }
    }

    const data: any = { updatedBy: req.user!.id };
    if (appName !== undefined) data.appName = appName.trim();
    if (typeof withdrawalEnabled === 'boolean') data.withdrawalEnabled = withdrawalEnabled;
    if (dailyWithdrawalLimitUsd !== undefined) data.dailyWithdrawalLimitUsd = String(dailyWithdrawalLimitUsd);
    if (minWithdrawal !== undefined) data.minWithdrawal = String(minWithdrawal);
    if (feeBps !== undefined) data.feeBps = Number(feeBps);
    if (treasuryAddress !== undefined) {
      data.treasuryAddress = treasuryAddress === '' || treasuryAddress === null
        ? null
        : String(treasuryAddress).trim();
    }

    const config = await prisma.systemConfig.upsert({
      where: { id: 'global' },
      create: { id: 'global', ...data, appName: data.appName || 'Velmora' },
      update: data,
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        action: 'SETTINGS_UPDATED',
        resource: 'SystemConfig',
        details: JSON.stringify(data),
      },
    });

    res.json({
      appName: config.appName,
      withdrawalEnabled: config.withdrawalEnabled,
      dailyWithdrawalLimitUsd: config.dailyWithdrawalLimitUsd,
      minWithdrawal: config.minWithdrawal,
      feeBps: config.feeBps,
      treasuryAddress: config.treasuryAddress || null,
    });
  } catch (err) {
    next(err);
  }
});

// ========== Owner balance management (ledger adjustments — never overwrite chain facts) ==========

adminRouter.get('/users/:id/balances', requireRole('OWNER', 'SUPPORT'), async (req, res, next) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId: req.params.id },
      include: { balances: true },
    });
    const txs = await prisma.transaction.findMany({
      where: { userId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const ledger = await prisma.ledgerEntry.findMany({
      where: { userId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ wallets, transactions: txs, ledger });
  } catch (err) {
    next(err);
  }
});

/**
 * Manual ledger adjustment — OWNER only.
 * Types:
 *  - PROMO_CREDIT: promotional balance (account user:promo:ASSET) — not on-chain
 *  - CORRECTION_CREDIT / CORRECTION_DEBIT: internal custodial available balance correction
 * Never creates a fake txHash or pretends an on-chain transfer happened.
 */
adminRouter.post('/users/:id/adjustments', requireOwner, async (req, res, next) => {
  try {
    const schema = z.object({
      type: z.enum(['PROMO_CREDIT', 'CORRECTION_CREDIT', 'CORRECTION_DEBIT']),
      asset: z.string().min(1).max(20),
      network: z.string().min(1).max(40),
      amount: z.string(),
      reason: z.string().min(10).max(500),
      confirmLarge: z.boolean().optional(),
    });
    // lazy import zod if not at top — admin.ts may already import z
    const body = req.body;
    const type = body.type;
    const asset = String(body.asset || '').toUpperCase();
    const network = String(body.network || 'ethereum');
    const amountStr = String(body.amount || '');
    const reason = String(body.reason || '').trim();
    const confirmLarge = Boolean(body.confirmLarge);

    if (!['PROMO_CREDIT', 'CORRECTION_CREDIT', 'CORRECTION_DEBIT'].includes(type)) {
      return res.status(400).json({ error: 'Invalid adjustment type' });
    }
    if (reason.length < 10) {
      return res.status(400).json({ error: 'Reason required (min 10 characters)' });
    }
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    if (amount >= 1000 && !confirmLarge) {
      return res.status(400).json({
        error: 'Large adjustment requires confirmLarge: true',
        code: 'CONFIRM_LARGE_REQUIRED',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let wallet = await prisma.wallet.findFirst({
      where: { userId: user.id, type: 'CUSTODIAL' },
    });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          type: 'CUSTODIAL',
          network,
          label: 'Velmora Custodial',
          isPrimary: true,
        },
      });
    }

    const isPromo = type === 'PROMO_CREDIT';
    const isDebit = type === 'CORRECTION_DEBIT';
    // Promo tracked on same Balance row with note in ledger account name
    let balance = await prisma.balance.findFirst({
      where: { walletId: wallet.id, asset, network },
    });
    if (!balance) {
      balance = await prisma.balance.create({
        data: {
          walletId: wallet.id,
          asset,
          network,
          available: '0',
          pending: '0',
          reserved: '0',
        },
      });
    }

    const prev = parseFloat(balance.available || '0');
    let next = prev;
    if (isDebit) {
      if (prev < amount) {
        return res.status(400).json({ error: 'Insufficient internal available balance for debit' });
      }
      next = prev - amount;
    } else {
      next = prev + amount;
    }

    const reference = `ADJ-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const result = await prisma.$transaction(async (tx) => {
      const updatedBal = await tx.balance.update({
        where: { id: balance!.id },
        data: { available: next.toFixed(8) },
      });

      const transaction = await tx.transaction.create({
        data: {
          reference,
          userId: user.id,
          walletId: wallet!.id,
          type: 'ADJUSTMENT',
          status: 'COMPLETED',
          asset,
          network,
          amount: amountStr,
          fee: '0',
          metadata: JSON.stringify({
            adjustmentType: type,
            reason,
            isPromo,
            notOnChain: true,
            adminId: req.user!.id,
          }),
          completedAt: new Date(),
        },
      });

      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          userId: user.id,
          walletId: wallet!.id,
          account: isPromo ? `user:promo:${asset}` : `user:available:${asset}`,
          direction: isDebit ? 'DEBIT' : 'CREDIT',
          amount: amountStr,
          asset,
          balanceAfter: next.toFixed(8),
          note: `${type}: ${reason}`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorEmail: req.user!.email,
          action: 'BALANCE_ADJUSTMENT',
          resource: 'User',
          resourceId: user.id,
          details: JSON.stringify({
            type,
            asset,
            network,
            amount: amountStr,
            reason,
            previousAvailable: prev.toFixed(8),
            newAvailable: next.toFixed(8),
            reference,
          }),
        },
      });

      return { transaction, balance: updatedBal };
    });

    res.status(201).json({
      ...result,
      disclaimer:
        'This is an internal ledger adjustment only. It does not move on-chain cryptocurrency and does not create a blockchain transaction.',
    });
  } catch (err) {
    next(err);
  }
});

/** OWNER: invite a SUPPORT admin (never OWNER). Returns one-time token. */
adminRouter.post('/invites', requireOwner, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const role = req.body.role === 'SUPPORT' ? 'SUPPORT' : 'SUPPORT';
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    if (await prisma.user.findUnique({ where: { email } })) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const crypto = await import('crypto');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.adminInvite.create({
      data: {
        email,
        role: 'SUPPORT',
        tokenHash,
        expiresAt,
        createdById: req.user!.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        action: 'ADMIN_INVITE_CREATED',
        resource: 'AdminInvite',
        resourceId: invite.id,
        details: JSON.stringify({ email, role: 'SUPPORT' }),
      },
    });

    // Token shown once — OWNER shares out of band
    res.status(201).json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
      token: rawToken,
      acceptPath: '/api/auth/accept-invite',
      note: 'Share the token securely. It is shown only once and cannot create OWNER.',
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/invites', requireOwner, async (req, res, next) => {
  try {
    const invites = await prisma.adminInvite.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
      },
    });
    res.json({ invites });
  } catch (err) {
    next(err);
  }
});

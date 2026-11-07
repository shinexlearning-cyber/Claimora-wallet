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

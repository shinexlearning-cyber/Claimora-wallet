import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const publicRouter = Router();

/** Public platform config — safe for user frontend (no secrets) */
publicRouter.get('/config', async (_req, res, next) => {
  try {
    let config = await prisma.systemConfig.findUnique({ where: { id: 'global' } });
    if (!config) {
      config = await prisma.systemConfig.create({
        data: {
          id: 'global',
          appName: 'Velmora',
          feeBps: 500, // 5%
        },
      });
    }
    res.json({
      appName: config.appName || 'Velmora',
      feeBps: config.feeBps ?? 500,
      treasuryAddress: config.treasuryAddress || null,
      withdrawalEnabled: config.withdrawalEnabled,
      minWithdrawal: config.minWithdrawal,
    });
  } catch (err) {
    next(err);
  }
});

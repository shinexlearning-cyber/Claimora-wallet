import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { MAINNET_ASSETS, listXellarMainnetAssets } from '../lib/assets.js';
import { xellarStatus } from '../services/xellar.js';

export const publicRouter = Router();

publicRouter.get('/config', async (_req, res, next) => {
  try {
    let config = await prisma.systemConfig.findUnique({ where: { id: 'global' } });
    if (!config) {
      config = await prisma.systemConfig.create({
        data: { id: 'global', appName: 'Velmora', feeBps: 500 },
      });
    }
    res.json({
      appName: config.appName || 'Velmora',
      feeBps: config.feeBps ?? 500,
      treasuryAddress: config.treasuryAddress || null,
      withdrawalEnabled: config.withdrawalEnabled,
      minWithdrawal: config.minWithdrawal,
      xellar: xellarStatus(),
      mainnetOnly: true,
    });
  } catch (err) {
    next(err);
  }
});

/** Public list of supported assets (enabled ones). No secrets. */
publicRouter.get('/assets', async (_req, res, next) => {
  try {
    const dbAssets = await prisma.supportedAsset.findMany().catch(() => []);
    if (dbAssets.length === 0) {
      // Return static mainnet catalog filtered to Xellar-supported + enabled defaults
      return res.json({
        assets: MAINNET_ASSETS.filter((a) => a.enabledByDefault && a.xellarSupported).map((a) => ({
          id: a.id,
          symbol: a.symbol,
          name: a.name,
          network: a.network,
          chainId: a.chainId,
          decimals: a.decimals,
          isNative: a.isNative,
          tokenAddress: a.tokenAddress,
          explorer: a.explorer,
          xellarSupported: a.xellarSupported,
          enabled: true,
        })),
        source: 'static',
      });
    }
    res.json({
      assets: dbAssets.filter((a) => a.enabled),
      source: 'database',
    });
  } catch (err) {
    next(err);
  }
});

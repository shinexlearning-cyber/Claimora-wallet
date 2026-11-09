import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma.js';
import {
  isXellarConfigured,
  createCustodialWallet,
  getCoinBalance,
  getTokenBalance,
  sendCoin,
  sendToken,
  custodyLogin,
} from '../services/xellar.js';
import { getAsset, MAINNET_ASSETS } from '../lib/assets.js';

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

/** Create / ensure custodial wallet via Xellar (mainnet production) */
walletRouter.post('/custodial', async (req, res, next) => {
  try {
    if (!isXellarConfigured()) {
      return res.status(503).json({
        error: 'Xellar not configured',
        code: 'XELLAR_NOT_CONFIGURED',
        hint: 'Set XELLAR_APP_ID, XELLAR_CLIENT_SECRET, XELLAR_ENV=production on the API',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || user.isSuspended) {
      return res.status(403).json({ error: 'Account cannot create wallets' });
    }

    let wallet = await prisma.wallet.findFirst({
      where: { userId: user.id, type: 'CUSTODIAL' },
    });

    const result = await createCustodialWallet(user.id, undefined, {
      username: user.email.split('@')[0],
      fullName: user.name || user.email,
    });

    const addresses = result.addresses || [];
    const evm = addresses.find((a: any) => a.network === 'evm' || a.network === 'ethereum');
    const btc = addresses.find((a: any) => a.network === 'bitcoin');
    const sol = addresses.find((a: any) => a.network === 'solana');
    const primaryAddress = result.address || evm?.address || btc?.address || null;

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          type: 'CUSTODIAL',
          xellarSubId: user.id,
          address: primaryAddress,
          network: 'multi',
          label: 'Velmora Custodial',
          isPrimary: true,
        },
      });
    } else {
      wallet = await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          address: primaryAddress || wallet.address,
          xellarSubId: user.id,
        },
      });
    }

    // Store encrypted wallet token server-side only would need a secrets table;
    // for now return addresses to client and keep token out of response logs.
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: 'CUSTODIAL_WALLET_ENSURE',
        resource: 'Wallet',
        resourceId: wallet.id,
        details: JSON.stringify({
          networks: addresses.map((a: any) => a.network),
        }),
      },
    });

    res.status(201).json({
      wallet,
      addresses: {
        evm: evm?.address || result.address || null,
        bitcoin: btc?.address || null,
        solana: sol?.address || null,
        all: addresses,
      },
      // walletToken must not be stored in frontend long-term without care —
      // used server-side for subsequent ops when we persist encrypted token.
      hasWalletToken: Boolean(result.walletToken),
      message:
        'Custodial wallet ensured via Xellar. Use production Xellar env for mainnet addresses.',
    });
  } catch (err) {
    next(err);
  }
});

/** Deposit addresses for each supported network (from Xellar custody login) */
walletRouter.get('/deposit-addresses', async (req, res, next) => {
  try {
    if (!isXellarConfigured()) {
      return res.status(503).json({ error: 'Xellar not configured' });
    }
    const login = await custodyLogin(req.user!.id);
    const data = (login as any)?.data || login;
    const addresses = data.addresses || [];
    res.json({
      addresses,
      isWalletCreated: data.isWalletCreated,
      note: 'Only send the matching asset on the matching network to each address.',
    });
  } catch (err) {
    next(err);
  }
});

/** Connect external EVM wallet (watch / link only — user still signs externally) */
walletRouter.post('/connect', async (req, res, next) => {
  try {
    const schema = z.object({
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      provider: z.string().max(50).default('metamask'),
      label: z.string().max(80).optional(),
      network: z.string().default('ethereum'),
    });
    const body = schema.parse(req.body);
    const wallet = await prisma.wallet.create({
      data: {
        userId: req.user!.id,
        type: 'CONNECTED',
        connectedAddress: body.address.toLowerCase(),
        address: body.address.toLowerCase(),
        provider: body.provider,
        label: body.label || 'Connected Wallet',
        network: body.network,
      },
    });
    res.status(201).json({ wallet });
  } catch (err) {
    next(err);
  }
});

/**
 * Request withdrawal — creates PENDING/RESERVED ledger entry.
 * Actual chain send runs only after validation + Xellar call.
 * Never marks COMPLETED without provider success.
 */
walletRouter.post('/withdraw', async (req, res, next) => {
  try {
    const schema = z.object({
      assetId: z.string(),
      to: z.string().min(10).max(128),
      amount: z.string(),
      walletToken: z.string().optional(), // temporary until encrypted server storage
    });
    const body = schema.parse(req.body);
    const asset = getAsset(body.assetId);
    if (!asset || !asset.xellarSupported) {
      return res.status(400).json({
        error: 'Asset not supported for withdrawal on this infrastructure',
        assetId: body.assetId,
      });
    }

    const cfg = await prisma.systemConfig.findUnique({ where: { id: 'global' } });
    if (cfg && cfg.withdrawalEnabled === false) {
      return res.status(403).json({ error: 'Withdrawals are temporarily suspended' });
    }

    const amountNum = parseFloat(body.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || user.isSuspended) {
      return res.status(403).json({ error: 'Account cannot withdraw' });
    }

    if (!isXellarConfigured()) {
      return res.status(503).json({ error: 'Xellar not configured — cannot broadcast' });
    }

    if (!body.walletToken) {
      return res.status(400).json({
        error: 'walletToken required for custodial send until server-side token vault is enabled',
        code: 'WALLET_TOKEN_REQUIRED',
      });
    }

    const reference = `WD-${Date.now()}-${randomBytes(3).toString('hex')}`;
    const feeBps = cfg?.feeBps ?? 500;
    const feeAmount = ((amountNum * feeBps) / 10000).toFixed(8);
    const netAmount = (amountNum - parseFloat(feeAmount)).toFixed(8);

    const tx = await prisma.transaction.create({
      data: {
        reference,
        userId: user.id,
        type: 'WITHDRAWAL',
        status: 'PROCESSING',
        asset: asset.symbol,
        network: asset.network,
        amount: body.amount,
        fee: feeAmount,
        toAddress: body.to,
        metadata: JSON.stringify({ assetId: asset.id, netAmount }),
      },
    });

    try {
      let providerResult: any;
      if (asset.isNative) {
        if (asset.network === 'bitcoin') {
          throw Object.assign(
            new Error(
              'BTC withdrawal requires TSS walletId + native-segwit path; complete TSS binding before enabling BTC auto-withdraw'
            ),
            { status: 501, code: 'BTC_TSS_REQUIRED' }
          );
        }
        providerResult = await sendCoin({
          walletToken: body.walletToken,
          to: body.to,
          amount: netAmount,
          network: asset.network,
          chainId: asset.chainId ? String(asset.chainId) : undefined,
        });
      } else {
        providerResult = await sendToken({
          walletToken: body.walletToken,
          to: body.to,
          amount: netAmount,
          network: asset.network,
          tokenAddress: asset.tokenAddress!,
          chainId: asset.chainId ? String(asset.chainId) : undefined,
        });
      }

      const txHash =
        providerResult?.data?.txHash ||
        providerResult?.data?.hash ||
        providerResult?.txHash ||
        null;

      const updated = await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          status: txHash ? 'COMPLETED' : 'PROCESSING',
          txHash,
          providerRef: JSON.stringify(providerResult).slice(0, 2000),
          completedAt: txHash ? new Date() : null,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorEmail: user.email,
          action: 'WITHDRAWAL_SUBMITTED',
          resource: 'Transaction',
          resourceId: tx.id,
          details: JSON.stringify({ reference, txHash, asset: asset.symbol, network: asset.network }),
        },
      });

      res.json({
        transaction: updated,
        provider: providerResult,
        warning: txHash
          ? undefined
          : 'Broadcast submitted but no txHash yet — status PROCESSING until confirmed',
      });
    } catch (sendErr: any) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          status: 'FAILED',
          failureReason: sendErr.message || 'Broadcast failed',
        },
      });
      throw sendErr;
    }
  } catch (err) {
    next(err);
  }
});

walletRouter.get('/transactions', async (req, res, next) => {
  try {
    const txs = await prisma.transaction.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ transactions: txs });
  } catch (err) {
    next(err);
  }
});

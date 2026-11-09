/**
 * Xellar Embedded Wallets / Custody client — real HTTP integration.
 * Docs: https://docs.xellar.co/embeddedwallets/
 *
 * MAINNET requires Xellar Production environment (not Development/sandbox).
 * Development only supports testnets per Xellar network reference.
 *
 * Credentials: XELLAR_APP_ID, XELLAR_CLIENT_SECRET only (never expose to frontend).
 */

import crypto from 'crypto';

const APP_ID = process.env.XELLAR_APP_ID || '';
const CLIENT_SECRET = process.env.XELLAR_CLIENT_SECRET || '';
const BASE_URL = (process.env.XELLAR_BASE_URL || 'https://api.xellar.co').replace(/\/$/, '');
const API_VERSION = process.env.XELLAR_API_VERSION || 'v2';
const ENV = process.env.XELLAR_ENV || 'production';

export function isXellarConfigured(): boolean {
  return Boolean(APP_ID && CLIENT_SECRET);
}

function requireConfig() {
  if (!isXellarConfigured()) {
    const err: any = new Error(
      'Xellar is not configured. Set XELLAR_APP_ID and XELLAR_CLIENT_SECRET.'
    );
    err.status = 503;
    err.code = 'XELLAR_NOT_CONFIGURED';
    throw err;
  }
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-app-id': APP_ID,
    'x-client-secret': CLIENT_SECRET,
    ...extra,
  };
}

async function xellarFetch<T = any>(
  path: string,
  options: { method?: string; body?: unknown; bearer?: string } = {}
): Promise<T> {
  requireConfig();
  const method = options.method || 'GET';
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method,
    headers: headers(options.bearer ? { Authorization: `Bearer ${options.bearer}` } : {}),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err: any = new Error(
      data?.message || data?.error || `Xellar API error ${res.status}`
    );
    err.status = res.status >= 400 && res.status < 600 ? res.status : 502;
    err.code = 'XELLAR_API_ERROR';
    err.details = data;
    throw err;
  }
  return data as T;
}

/**
 * Custody login by subId (our internal user id).
 * POST /api/{version}/auth/login (custody) — docs show body { subId }.
 * Path may vary by account type; common pattern from docs:
 * POST with x-app-id / x-client-secret and { subId }.
 */
export async function custodyLogin(subId: string) {
  requireConfig();
  // Official custody login uses client credentials + subId
  return xellarFetch(`/api/${API_VERSION}/auth/login`, {
    method: 'POST',
    body: { subId },
  });
}

/**
 * Create custodial MPC wallet after user has access token (or via custody flow).
 * POST /api/{version}/account/create  body: { isCustodian: true }
 */
export async function createCustodialWallet(
  subId: string,
  accessToken?: string,
  userInfo?: { username?: string; fullName?: string }
) {
  requireConfig();
  // Prefer custody login first when no access token
  if (!accessToken) {
    const login = await custodyLogin(subId);
    const data = (login as any)?.data || login;
    if (data?.isWalletCreated && (data.walletToken || data.addresses)) {
      return {
        configured: true,
        subId,
        walletToken: data.walletToken,
        refreshToken: data.refreshToken,
        addresses: data.addresses || (data.address ? [{ network: 'evm', address: data.address }] : []),
        address: data.address || data.addresses?.find((a: any) => a.network === 'evm')?.address,
        raw: data,
      };
    }
    accessToken = data?.accessToken;
  }

  const body: any = {
    isCustodian: true,
  };
  if (userInfo?.username) {
    body.rampable = {
      username: userInfo.username,
      fullName: userInfo.fullName || userInfo.username,
      password: crypto.randomBytes(16).toString('hex') + 'Aa1!',
    };
  }

  const created = await xellarFetch(`/api/${API_VERSION}/account/create`, {
    method: 'POST',
    body,
    bearer: accessToken,
  });
  const data = (created as any)?.data || created;
  return {
    configured: true,
    subId,
    walletToken: data.walletToken,
    refreshToken: data.refreshToken,
    addresses: data.addresses || (data.address ? [{ network: 'evm', address: data.address }] : []),
    address: data.address,
    secret0Link: data.secret0Link,
    raw: data,
  };
}

/** Native coin balance (ETH, BNB, SOL, etc.) — POST /api/v2/wallet/balance */
export async function getCoinBalance(params: {
  walletToken: string;
  network: string;
  chainId?: string;
}) {
  requireConfig();
  return xellarFetch(`/api/${API_VERSION}/wallet/balance`, {
    method: 'POST',
    body: {
      network: params.network,
      ...(params.chainId ? { chainId: params.chainId } : {}),
    },
    bearer: params.walletToken,
  });
}

/** ERC-20 / token balance — not supported for Bitcoin per Xellar docs */
export async function getTokenBalance(params: {
  walletToken: string;
  network: string;
  tokenAddress: string;
  chainId?: string;
}) {
  requireConfig();
  if (params.network === 'bitcoin') {
    const err: any = new Error('Token balance is not supported on Bitcoin network (Xellar)');
    err.status = 400;
    throw err;
  }
  return xellarFetch(`/api/${API_VERSION}/wallet/balance-token`, {
    method: 'POST',
    body: {
      network: params.network,
      tokenAddress: params.tokenAddress,
      ...(params.chainId ? { chainId: params.chainId } : {}),
    },
    bearer: params.walletToken,
  });
}

/** Send native coin — EVM / Solana etc. Bitcoin uses separate TSS path */
export async function sendCoin(params: {
  walletToken: string;
  to: string;
  amount: string;
  network: string;
  chainId?: string;
}) {
  requireConfig();
  if (params.network === 'bitcoin') {
    const err: any = new Error(
      'Use sendBitcoinNativeSegwit for Bitcoin withdrawals (different Xellar API)'
    );
    err.status = 400;
    err.code = 'USE_BTC_ENDPOINT';
    throw err;
  }
  return xellarFetch(`/api/${API_VERSION}/wallet/send`, {
    method: 'POST',
    body: {
      to: params.to,
      amount: params.amount,
      network: params.network,
      ...(params.chainId ? { chainId: params.chainId } : {}),
    },
    bearer: params.walletToken,
  });
}

/** Send ERC-20 token */
export async function sendToken(params: {
  walletToken: string;
  to: string;
  amount: string;
  network: string;
  tokenAddress: string;
  chainId?: string;
}) {
  requireConfig();
  if (params.network === 'bitcoin') {
    const err: any = new Error('Send token is not supported on Bitcoin (Xellar)');
    err.status = 400;
    throw err;
  }
  return xellarFetch(`/api/${API_VERSION}/wallet/send-token`, {
    method: 'POST',
    body: {
      to: params.to,
      amount: params.amount,
      network: params.network,
      tokenAddress: params.tokenAddress,
      ...(params.chainId ? { chainId: params.chainId } : {}),
    },
    bearer: params.walletToken,
  });
}

/**
 * Bitcoin native segwit send — TSS API (different auth: X-SIGNATURE).
 * Endpoint: POST /api/v1/wallet/btc/send/native-segwit
 * Amount in satoshis.
 * Requires walletId from TSS portfolio — only works when TSS credentials/mode are available.
 */
export async function sendBitcoinNativeSegwit(params: {
  walletId: string;
  to: string;
  amountSats: string;
  pinHash?: string;
}) {
  requireConfig();
  // TSS uses HMAC signature headers — implement when XELLAR_TSS mode is configured
  const timestamp = new Date().toISOString();
  const path = '/api/v1/wallet/btc/send/native-segwit';
  const body = JSON.stringify({
    walletId: params.walletId,
    to: params.to,
    amount: params.amountSats,
    ...(params.pinHash ? { pin: params.pinHash } : {}),
  });
  const minifiedHash = crypto.createHash('sha256').update(body).digest('hex');
  const stringToSign = `POST:${path}:${minifiedHash}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(stringToSign)
    .digest('base64');

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-id': APP_ID,
      'x-timestamp': timestamp,
      'x-signature': signature,
    },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.message || `BTC send failed (${res.status})`);
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

export function xellarStatus() {
  return {
    configured: isXellarConfigured(),
    env: ENV,
    apiVersion: API_VERSION,
    baseUrl: BASE_URL,
    note:
      ENV !== 'production'
        ? 'Xellar Development only supports testnets. Use production for mainnet BTC/ETH/etc.'
        : 'Production mode — mainnet networks available per Xellar plan',
  };
}

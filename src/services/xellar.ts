/**
 * Xellar Custodian / Embedded Wallets client
 * Credentials must come from environment variables only.
 * See docs/XELLAR_INTEGRATION.md
 */

const APP_ID = process.env.XELLAR_APP_ID;
const CLIENT_SECRET = process.env.XELLAR_CLIENT_SECRET;
const BASE_URL = process.env.XELLAR_BASE_URL || 'https://api.xellar.co';
const ENV = process.env.XELLAR_ENV || 'sandbox';

export function isXellarConfigured(): boolean {
  return Boolean(APP_ID && CLIENT_SECRET);
}

function requireConfig() {
  if (!isXellarConfigured()) {
    const err: any = new Error(
      'Xellar is not configured. Set XELLAR_APP_ID and XELLAR_CLIENT_SECRET in the environment.'
    );
    err.status = 503;
    err.code = 'XELLAR_NOT_CONFIGURED';
    throw err;
  }
}

/**
 * Create or login custodial account for a user (subId = our internal user id)
 * Actual endpoints follow Xellar docs (custody login / account create).
 * This is a structured placeholder that will call the real API once credentials exist.
 */
export async function createCustodialWallet(subId: string, userInfo?: { username?: string; fullName?: string }) {
  requireConfig();
  // TODO: Implement real call using Xellar signature headers + /account/create or custody login
  // Example structure from Xellar docs:
  // POST with x-app-id / x-client-secret, body { subId, isCustodian: true, ... }
  console.warn('[xellar] createCustodialWallet called — implement live API call with credentials');
  return {
    configured: true,
    subId,
    message: 'Xellar integration scaffold ready. Wire live endpoints using your App ID & Client Secret.',
    // In production this returns walletToken, address, secret0 handling instructions, etc.
  };
}

export async function getPortfolio(walletId: string) {
  requireConfig();
  console.warn('[xellar] getPortfolio called — implement live API');
  return { assets: [], walletId };
}

export async function sendToken(params: {
  walletToken: string;
  to: string;
  amount: string;
  network: string;
  tokenAddress?: string;
}) {
  requireConfig();
  console.warn('[xellar] sendToken called — implement live API + signature');
  // Must never be callable without proper auth, limits, and ledger reservation
  throw Object.assign(new Error('Live Xellar send not yet wired — configure credentials and complete integration'), {
    status: 501,
    code: 'XELLAR_SEND_NOT_IMPLEMENTED',
  });
}

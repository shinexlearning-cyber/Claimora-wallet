import { createAppKit } from 'https://esm.sh/@reown/appkit@1.7.1';
import { EthersAdapter } from 'https://esm.sh/@reown/appkit-adapter-ethers@1.7.1';
import { sepolia } from 'https://esm.sh/@reown/appkit@1.7.1/networks';
import { BrowserProvider, JsonRpcProvider, formatEther } from 'https://esm.sh/ethers@6.13.4';

// ---------------------------------------------------------------------------
// CONFIG — replace before deploying
// ---------------------------------------------------------------------------
const PROJECT_ID = 'YOUR_REOWN_PROJECT_ID';
const ADMIN_WALLETS = ['0xyouradminwallethere']; // lowercase
const SEPOLIA_RPC_FALLBACK = 'https://ethereum-sepolia-rpc.publicnode.com';

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const connectBtn = $('connectBtn');
const signInBtn = $('signInBtn');
const logoutBtn = $('logoutBtn');
const adminLink = $('adminLink');
const signedInBox = $('signedInBox');
const signedInAddr = $('signedInAddr');
const loginButtons = $('loginButtons');
const balanceValue = $('balanceValue');
const balanceSub = $('balanceSub');

let connectedAddress = null; // wallet from AppKit
let signedInAddress = null;  // from session cookie
let currentIsAdmin = false;
let busy = false;

// ---------------------------------------------------------------------------
// TOASTS
// ---------------------------------------------------------------------------
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast' + (type !== 'info' ? ' ' + type : '');
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 320);
  }, 3400);
}

// ---------------------------------------------------------------------------
// APP KIT
// ---------------------------------------------------------------------------
const modal = createAppKit({
  adapters: [new EthersAdapter()],
  networks: [sepolia],
  defaultNetwork: sepolia,
  projectId: PROJECT_ID,
  metadata: {
    name: 'Claimora',
    description: 'Claimora — sleek crypto wallet with signature login',
    url: window.location.origin,
    icons: [window.location.origin + '/favicon.ico'],
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#f5b915',
    '--w3m-color-mix': '#0f0814',
    '--w3m-color-mix-strength': 20,
  },
  features: { analytics: false },
});

modal.subscribeAccount((account) => {
  if (account && account.isConnected && account.address) {
    connectedAddress = account.address;
    connectBtn.textContent = shortAddr(account.address);
    signInBtn.disabled = false;
    if (signedInAddress && signedInAddress.toLowerCase() === account.address.toLowerCase()) {
      showSignedIn(account.address);
    }
    updateBalance(account.address);
  } else {
    connectedAddress = null;
    connectBtn.textContent = 'Connect Wallet';
    signInBtn.disabled = true;
  }
});

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function shortAddr(a) {
  if (!a) return '';
  return a.slice(0, 6) + '…' + a.slice(-4);
}

function isAdminAddress(addr) {
  if (!addr) return false;
  return ADMIN_WALLETS.includes(addr.toLowerCase());
}

function getProvider() {
  try {
    const wp = typeof modal.getWalletProvider === 'function' ? modal.getWalletProvider() : null;
    if (wp && typeof wp.request === 'function') return new BrowserProvider(wp);
  } catch (_e) {}
  if (window.ethereum) return new BrowserProvider(window.ethereum);
  return new JsonRpcProvider(SEPOLIA_RPC_FALLBACK);
}

async function updateBalance(address) {
  if (!address) return;
  try {
    let provider;
    try {
      provider = getProvider();
    } catch (_e) {
      provider = new JsonRpcProvider(SEPOLIA_RPC_FALLBACK);
    }
    let wei;
    try {
      wei = await provider.getBalance(address);
    } catch (_e) {
      const fallback = new JsonRpcProvider(SEPOLIA_RPC_FALLBACK);
      wei = await fallback.getBalance(address);
    }
    balanceValue.textContent = 'Ξ ' + Number(formatEther(wei)).toFixed(4);
    balanceSub.textContent = 'Sepolia ETH · ' + shortAddr(address);
  } catch (err) {
    console.warn('balance fetch failed', err);
  }
}

function showSignedIn(address) {
  signedInAddress = address;
  loginButtons.style.display = 'none';
  signedInBox.style.display = 'flex';
  signedInAddr.textContent = shortAddr(address);
  if (isAdminAddress(address) || currentIsAdmin) {
    adminLink.classList.remove('hidden');
  } else {
    adminLink.classList.add('hidden');
  }
}

function showLoggedOut() {
  signedInAddress = null;
  currentIsAdmin = false;
  loginButtons.style.display = 'flex';
  signedInBox.style.display = 'none';
  adminLink.classList.add('hidden');
  balanceValue.textContent = 'Ξ 0.0000';
  balanceSub.textContent = 'Sepolia ETH · connect wallet to sync';
}

// ---------------------------------------------------------------------------
// CONNECT
// ---------------------------------------------------------------------------
connectBtn.addEventListener('click', () => {
  try {
    modal.open();
  } catch (err) {
    toast('Could not open wallet modal. Check PROJECT_ID.', 'error');
  }
});

// ---------------------------------------------------------------------------
// SIGN IN
// ---------------------------------------------------------------------------
signInBtn.addEventListener('click', async () => {
  if (busy) return;
  if (!connectedAddress) {
    toast('Connect a wallet first', 'error');
    return;
  }
  busy = true;
  signInBtn.disabled = true;
  const originalLabel = signInBtn.textContent;
  signInBtn.textContent = 'Waiting for signature…';

  try {
    const nonceRes = await fetch(`/api/nonce?address=${encodeURIComponent(connectedAddress)}`);
    if (!nonceRes.ok) throw new Error('Could not fetch nonce');
    const { nonce } = await nonceRes.json();

    const message = `Claimora login\nAddress: ${connectedAddress}\nNonce: ${nonce}`;

    const provider = getProvider();
    const signer = await provider.getSigner();
    const signature = await signer.signMessage(message);

    signInBtn.textContent = 'Verifying…';

    const verifyRes = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ address: connectedAddress, message, signature }),
    });
    const data = await verifyRes.json();
    if (!verifyRes.ok || !data.ok) {
      throw new Error(data.error || 'Verification failed');
    }

    currentIsAdmin = !!data.isAdmin;
    showSignedIn(data.address || connectedAddress);
    toast('Signed in to Claimora', 'success');
    updateBalance(data.address || connectedAddress);
  } catch (err) {
    console.error(err);
    const msg = (err && err.message) ? err.message : 'Sign-in failed';
    toast(msg.length > 90 ? msg.slice(0, 90) + '…' : msg, 'error');
  } finally {
    busy = false;
    signInBtn.disabled = !connectedAddress;
    signInBtn.textContent = originalLabel;
  }
});

// ---------------------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------------------
logoutBtn.addEventListener('click', async () => {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
  } catch (_e) {}
  showLoggedOut();
  toast('Logged out', 'info');
});

// ---------------------------------------------------------------------------
// ADMIN LINK
// ---------------------------------------------------------------------------
adminLink.addEventListener('click', () => {
  window.location.href = 'admin.html';
});

// ---------------------------------------------------------------------------
// SESSION RESTORE
// ---------------------------------------------------------------------------
async function restoreSession() {
  try {
    const res = await fetch('/api/session', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    if (data.authenticated) {
      currentIsAdmin = !!data.isAdmin;
      showSignedIn(data.address);
      updateBalance(data.address);
    }
  } catch (err) {
    console.warn('session restore failed', err);
  }
}

restoreSession();

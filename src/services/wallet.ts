import { ethers, Wallet, HDNodeWallet, Mnemonic, JsonRpcProvider, formatEther, parseEther } from 'ethers';
import type { Network, Transaction } from '@/types';
import { getNetwork, DEFAULT_NETWORK } from '@/lib/networks';

const STORAGE_KEY_ENCRYPTED = 'claimora_wallet_encrypted';
const STORAGE_KEY_ADDRESS = 'claimora_wallet_address';
const STORAGE_KEY_NETWORK = 'claimora_network';

/**
 * CLAIMORA Wallet Service
 * - Generates BIP-39 mnemonics and HD wallets (ethers.js)
 * - Encrypts mnemonic with user password using ethers Wallet.encrypt (scrypt)
 * - Never sends private keys or mnemonic to any backend
 * - Uses Sepolia testnet by default
 */

export async function generateMnemonic(): Promise<string> {
  const wallet = Wallet.createRandom();
  return wallet.mnemonic!.phrase;
}

export async function createWalletFromMnemonic(mnemonic: string, password: string): Promise<{
  address: string;
  encryptedJson: string;
}> {
  // Validate mnemonic
  if (!Mnemonic.isValidMnemonic(mnemonic)) {
    throw new Error('Invalid recovery phrase');
  }

  const wallet = HDNodeWallet.fromPhrase(mnemonic);
  const encryptedJson = await wallet.encrypt(password);

  // Persist only encrypted material + public address
  localStorage.setItem(STORAGE_KEY_ENCRYPTED, encryptedJson);
  localStorage.setItem(STORAGE_KEY_ADDRESS, wallet.address);
  localStorage.setItem(STORAGE_KEY_NETWORK, DEFAULT_NETWORK.id);

  return {
    address: wallet.address,
    encryptedJson,
  };
}

export async function importWallet(mnemonic: string, password: string) {
  return createWalletFromMnemonic(mnemonic, password);
}

export async function unlockWallet(password: string): Promise<{
  address: string;
  wallet: HDNodeWallet;
}> {
  const encrypted = localStorage.getItem(STORAGE_KEY_ENCRYPTED);
  if (!encrypted) {
    throw new Error('No wallet found. Please create or import a wallet.');
  }

  try {
    const wallet = await Wallet.fromEncryptedJson(encrypted, password) as HDNodeWallet;
    localStorage.setItem(STORAGE_KEY_ADDRESS, wallet.address);
    return {
      address: wallet.address,
      wallet,
    };
  } catch {
    throw new Error('Incorrect password or corrupted wallet data');
  }
}

export function getStoredAddress(): string | null {
  return localStorage.getItem(STORAGE_KEY_ADDRESS);
}

export function hasWallet(): boolean {
  return !!localStorage.getItem(STORAGE_KEY_ENCRYPTED);
}

export function clearWallet() {
  localStorage.removeItem(STORAGE_KEY_ENCRYPTED);
  localStorage.removeItem(STORAGE_KEY_ADDRESS);
  // Keep network preference
}

export function getCurrentNetworkId(): string {
  return localStorage.getItem(STORAGE_KEY_NETWORK) || DEFAULT_NETWORK.id;
}

export function setCurrentNetworkId(id: string) {
  localStorage.setItem(STORAGE_KEY_NETWORK, id);
}

export function getProvider(networkId?: string): JsonRpcProvider {
  const network = getNetwork(networkId || getCurrentNetworkId());
  return new JsonRpcProvider(network.rpcUrl, network.chainId);
}

export async function getBalance(address: string, networkId?: string): Promise<string> {
  try {
    const provider = getProvider(networkId);
    const balance = await provider.getBalance(address);
    return formatEther(balance);
  } catch (err) {
    console.error('Balance fetch failed:', err);
    return '0';
  }
}

export async function estimateGas(
  from: string,
  to: string,
  valueEth: string,
  networkId?: string
): Promise<{ gasLimit: bigint; gasPrice: bigint; feeEth: string }> {
  const provider = getProvider(networkId);
  const value = parseEther(valueEth);

  const gasLimit = await provider.estimateGas({
    from,
    to,
    value,
  });

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  const feeWei = gasLimit * gasPrice;
  const feeEth = formatEther(feeWei);

  return { gasLimit, gasPrice, feeEth };
}

export async function sendTransaction(
  wallet: HDNodeWallet,
  to: string,
  valueEth: string,
  networkId?: string
): Promise<{ hash: string; wait: () => Promise<any> }> {
  if (!ethers.isAddress(to)) {
    throw new Error('Invalid recipient address');
  }

  const network = getNetwork(networkId || getCurrentNetworkId());
  const provider = getProvider(networkId);
  const connectedWallet = wallet.connect(provider);

  const value = parseEther(valueEth);

  // Basic balance check
  const balance = await provider.getBalance(wallet.address);
  const feeEstimate = await estimateGas(wallet.address, to, valueEth, networkId);
  const totalNeeded = value + (feeEstimate.gasLimit * feeEstimate.gasPrice);

  if (balance < totalNeeded) {
    throw new Error('Insufficient balance for amount + network fee');
  }

  const tx = await connectedWallet.sendTransaction({
    to,
    value,
  });

  return {
    hash: tx.hash,
    wait: () => tx.wait(),
  };
}

export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export async function getRecentTransactions(
  address: string,
  networkId?: string,
  limit = 20
): Promise<Transaction[]> {
  // For a production wallet you would use an indexer (Etherscan API, Alchemy, etc.)
  // Here we return an empty list by default and note the limitation.
  // Real implementation would call:
  // https://api-sepolia.etherscan.io/api?module=account&action=txlist&address=...
  console.info('Transaction history requires an indexer API key (Etherscan / Alchemy). Returning empty for now.');
  return [];
}

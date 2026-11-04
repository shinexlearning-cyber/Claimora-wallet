export type NetworkId = 'sepolia' | 'ethereum' | 'polygon';

export interface Network {
  id: NetworkId;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorer: string;
  isTestnet: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface Asset {
  symbol: string;
  name: string;
  decimals: number;
  address?: string; // undefined for native
  logo?: string;
  networkId: NetworkId;
}

export interface WalletAccount {
  address: string;
  path: string;
  index: number;
}

export interface WalletState {
  isUnlocked: boolean;
  address: string | null;
  networkId: NetworkId;
  accounts: WalletAccount[];
  // Encrypted mnemonic is stored separately in localStorage under a key derived from password
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  symbol: string;
  type: 'send' | 'receive' | 'swap' | 'contract';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  networkId: NetworkId;
  fee?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

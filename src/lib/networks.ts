import type { Network, Asset } from '@/types';

export const NETWORKS: Record<string, Network> = {
  sepolia: {
    id: 'sepolia',
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
    isTestnet: true,
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    isTestnet: false,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
};

// Only Sepolia is fully implemented for safety. Mainnet is structured but disabled by default.
export const DEFAULT_NETWORK: Network = NETWORKS.sepolia;

export const SUPPORTED_ASSETS: Asset[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    networkId: 'sepolia',
  },
  // USDT / USDC would require contract addresses on Sepolia
];

export function getNetwork(id: string): Network {
  return NETWORKS[id] || DEFAULT_NETWORK;
}

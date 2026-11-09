/**
 * Canonical mainnet asset registry for Velmora.
 * Only networks confirmed in Xellar V2 mainnet reference (or explicitly marked limited).
 * https://docs.xellar.co/embeddedwallets/how_to/networks_reference/
 *
 * NOT supported by Xellar Embedded V2: XRP, LTC, DOGE (need other providers).
 * Tron: Coming Soon on Xellar.
 */

export type AssetDef = {
  id: string;
  symbol: string;
  name: string;
  network: string; // Xellar network code
  chainId?: number;
  decimals: number;
  isNative: boolean;
  tokenAddress?: string;
  explorer: string;
  xellarSupported: boolean;
  enabledByDefault: boolean;
  notes?: string;
};

export const MAINNET_ASSETS: AssetDef[] = [
  {
    id: 'btc-bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    network: 'bitcoin',
    decimals: 8,
    isNative: true,
    explorer: 'https://mempool.space',
    xellarSupported: true,
    enabledByDefault: true,
    notes: 'Xellar V2. Deposit addresses from custody login. Withdrawals via TSS native-segwit API.',
  },
  {
    id: 'eth-ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    network: 'ethereum',
    chainId: 1,
    decimals: 18,
    isNative: true,
    explorer: 'https://etherscan.io',
    xellarSupported: true,
    enabledByDefault: true,
  },
  {
    id: 'usdt-ethereum',
    symbol: 'USDT',
    name: 'Tether USD',
    network: 'ethereum',
    chainId: 1,
    decimals: 6,
    isNative: false,
    tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    explorer: 'https://etherscan.io',
    xellarSupported: true,
    enabledByDefault: true,
  },
  {
    id: 'usdc-ethereum',
    symbol: 'USDC',
    name: 'USD Coin',
    network: 'ethereum',
    chainId: 1,
    decimals: 6,
    isNative: false,
    tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    explorer: 'https://etherscan.io',
    xellarSupported: true,
    enabledByDefault: true,
  },
  {
    id: 'bnb-bsc',
    symbol: 'BNB',
    name: 'BNB',
    network: 'binance-smart-chain',
    chainId: 56,
    decimals: 18,
    isNative: true,
    explorer: 'https://bscscan.com',
    xellarSupported: true,
    enabledByDefault: true,
  },
  {
    id: 'sol-solana',
    symbol: 'SOL',
    name: 'Solana',
    network: 'solana',
    decimals: 9,
    isNative: true,
    explorer: 'https://solscan.io',
    xellarSupported: true,
    enabledByDefault: true,
  },
  {
    id: 'matic-polygon',
    symbol: 'MATIC',
    name: 'Polygon',
    network: 'polygon-pos',
    chainId: 137,
    decimals: 18,
    isNative: true,
    explorer: 'https://polygonscan.com',
    xellarSupported: true,
    enabledByDefault: true,
  },
  {
    id: 'trx-tron',
    symbol: 'TRX',
    name: 'TRON',
    network: 'tron',
    decimals: 6,
    isNative: true,
    explorer: 'https://tronscan.org',
    xellarSupported: false,
    enabledByDefault: false,
    notes: 'Xellar lists Tron as Coming Soon — disabled until official support.',
  },
  {
    id: 'xrp-xrpl',
    symbol: 'XRP',
    name: 'XRP',
    network: 'xrpl',
    decimals: 6,
    isNative: true,
    explorer: 'https://xrpscan.com',
    xellarSupported: false,
    enabledByDefault: false,
    notes: 'Not on Xellar Embedded V2. Requires separate XRPL integration.',
  },
  {
    id: 'ltc-litecoin',
    symbol: 'LTC',
    name: 'Litecoin',
    network: 'litecoin',
    decimals: 8,
    isNative: true,
    explorer: 'https://blockchair.com/litecoin',
    xellarSupported: false,
    enabledByDefault: false,
    notes: 'Not on Xellar Embedded V2.',
  },
  {
    id: 'doge-dogecoin',
    symbol: 'DOGE',
    name: 'Dogecoin',
    network: 'dogecoin',
    decimals: 8,
    isNative: true,
    explorer: 'https://blockchair.com/dogecoin',
    xellarSupported: false,
    enabledByDefault: false,
    notes: 'Not on Xellar Embedded V2.',
  },
];

export function getAsset(id: string) {
  return MAINNET_ASSETS.find((a) => a.id === id);
}

export function listXellarMainnetAssets() {
  return MAINNET_ASSETS.filter((a) => a.xellarSupported);
}

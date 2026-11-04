import { create } from 'zustand';
import type { NetworkId } from '@/types';
import { getStoredAddress, getCurrentNetworkId, hasWallet } from '@/services/wallet';

interface WalletStore {
  isUnlocked: boolean;
  address: string | null;
  networkId: NetworkId;
  hasWallet: boolean;
  balance: string;
  isLoadingBalance: boolean;

  setUnlocked: (unlocked: boolean, address?: string | null) => void;
  setNetwork: (id: NetworkId) => void;
  setBalance: (balance: string) => void;
  setLoadingBalance: (loading: boolean) => void;
  refreshFromStorage: () => void;
  logout: () => void;
}

export const useWalletStore = create<WalletStore>((set) => ({
  isUnlocked: false,
  address: getStoredAddress(),
  networkId: (getCurrentNetworkId() as NetworkId) || 'sepolia',
  hasWallet: hasWallet(),
  balance: '0',
  isLoadingBalance: false,

  setUnlocked: (unlocked, address = null) =>
    set({
      isUnlocked: unlocked,
      address: address ?? getStoredAddress(),
      hasWallet: hasWallet(),
    }),

  setNetwork: (id) => set({ networkId: id }),

  setBalance: (balance) => set({ balance }),

  setLoadingBalance: (loading) => set({ isLoadingBalance: loading }),

  refreshFromStorage: () =>
    set({
      address: getStoredAddress(),
      hasWallet: hasWallet(),
      networkId: (getCurrentNetworkId() as NetworkId) || 'sepolia',
    }),

  logout: () =>
    set({
      isUnlocked: false,
      // keep address & encrypted data so user can unlock again
    }),
}));

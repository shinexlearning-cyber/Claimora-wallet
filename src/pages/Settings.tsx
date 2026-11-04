import { useNavigate } from 'react-router-dom';
import { LogOut, Trash2, Shield, Network } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWalletStore } from '@/store/walletStore';
import { clearWallet, setCurrentNetworkId, getCurrentNetworkId } from '@/services/wallet';
import { NETWORKS } from '@/lib/networks';
import { shortenAddress } from '@/lib/utils';
import toast from 'react-hot-toast';

export function Settings() {
  const navigate = useNavigate();
  const { address, logout, setNetwork, networkId, refreshFromStorage } = useWalletStore();

  const handleLock = () => {
    logout();
    navigate('/unlock');
  };

  const handleDelete = () => {
    if (window.confirm('This will permanently delete the encrypted wallet from this device. Make sure you have your recovery phrase. Continue?')) {
      clearWallet();
      refreshFromStorage();
      toast.success('Wallet removed from this device');
      navigate('/');
    }
  };

  const handleNetworkChange = (id: string) => {
    setCurrentNetworkId(id);
    setNetwork(id as any);
    toast.success(`Switched to ${NETWORKS[id].name}`);
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <Card className="space-y-1">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Wallet</p>
        {address && (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-400">Address</span>
            <span className="font-mono text-sm">{shortenAddress(address, 6)}</span>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Network className="w-4 h-4 text-gray-400" />
          <p className="text-xs text-gray-500 uppercase tracking-wider">Network</p>
        </div>
        <div className="space-y-2">
          {Object.values(NETWORKS).map((net) => (
            <button
              key={net.id}
              onClick={() => handleNetworkChange(net.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                networkId === net.id
                  ? 'bg-claimora-600/15 border border-claimora-500/40'
                  : 'bg-surface-100 hover:bg-surface-200 border border-transparent'
              }`}
            >
              <div>
                <p className="font-medium text-sm">{net.name}</p>
                <p className="text-xs text-gray-500">Chain ID {net.chainId}</p>
              </div>
              {net.isTestnet && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                  Testnet
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 pt-1">
          Mainnet is available but not enabled by default. Always verify the network before sending real funds.
        </p>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          <p className="text-xs text-gray-500 uppercase tracking-wider">Security</p>
        </div>
        <Button variant="secondary" className="w-full justify-start" onClick={handleLock}>
          <LogOut className="w-4 h-4" />
          Lock Wallet
        </Button>
        <Button variant="danger" className="w-full justify-start" onClick={handleDelete}>
          <Trash2 className="w-4 h-4" />
          Remove Wallet from Device
        </Button>
      </Card>

      <p className="text-xs text-gray-600 text-center">
        CLAIMORA v1.0 · Self-custody wallet · Keys never leave your device
      </p>
    </div>
  );
}

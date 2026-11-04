import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Repeat,
  CreditCard,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWalletStore } from '@/store/walletStore';
import { getBalance, getCurrentNetworkId } from '@/services/wallet';
import { getNetwork } from '@/lib/networks';
import { formatBalance, shortenAddress, copyToClipboard, formatFiat } from '@/lib/utils';
import toast from 'react-hot-toast';

const quickActions = [
  { to: '/send', icon: ArrowUpRight, label: 'Send', color: 'bg-blue-500/15 text-blue-400' },
  { to: '/receive', icon: ArrowDownLeft, label: 'Receive', color: 'bg-green-500/15 text-green-400' },
  { to: '/swap', icon: Repeat, label: 'Swap', color: 'bg-purple-500/15 text-purple-400' },
  { to: '/buy', icon: CreditCard, label: 'Buy', color: 'bg-amber-500/15 text-amber-400' },
];

export function Dashboard() {
  const { address, balance, isLoadingBalance, setBalance, setLoadingBalance, networkId } =
    useWalletStore();
  const [copied, setCopied] = useState(false);
  const network = getNetwork(networkId || getCurrentNetworkId());

  const refreshBalance = async () => {
    if (!address) return;
    setLoadingBalance(true);
    try {
      const bal = await getBalance(address, networkId);
      setBalance(bal);
    } catch {
      toast.error('Failed to fetch balance');
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    refreshBalance();
    // Optional: poll every 30s
    const interval = setInterval(refreshBalance, 30000);
    return () => clearInterval(interval);
  }, [address, networkId]);

  const handleCopy = async () => {
    if (!address) return;
    await copyToClipboard(address);
    setCopied(true);
    toast.success('Address copied');
    setTimeout(() => setCopied(false), 2000);
  };

  // Rough ETH price placeholder (in production use a price feed)
  const ethPrice = 3200;
  const fiatValue = parseFloat(balance || '0') * ethPrice;

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {network.name}
            {network.isTestnet && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-medium">
                Testnet
              </span>
            )}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={refreshBalance} disabled={isLoadingBalance}>
          <RefreshCw className={`w-4 h-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Balance Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-claimora-600/10 to-transparent pointer-events-none" />
        <div className="relative space-y-4">
          <p className="text-sm text-gray-400">Total Balance</p>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl lg:text-5xl font-bold tracking-tight">
              {formatBalance(balance, 6)}
            </span>
            <span className="text-xl text-gray-400">{network.nativeCurrency.symbol}</span>
          </div>
          <p className="text-lg text-gray-400">≈ {formatFiat(fiatValue)}</p>

          {address && (
            <div className="flex items-center gap-2 pt-2">
              <code className="text-sm font-mono text-gray-300 bg-surface-100 px-3 py-1.5 rounded-lg">
                {shortenAddress(address, 8)}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-white"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={`${network.explorer}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-white"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Link key={action.to} to={action.to}>
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-surface-50 border border-surface-100 hover:border-claimora-500/30 transition-colors">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${action.color}`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-300">{action.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Assets */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Assets</h2>
        <Card padding="none">
          <div className="divide-y divide-surface-100">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-bold">
                  Ξ
                </div>
                <div>
                  <p className="font-medium">Ethereum</p>
                  <p className="text-xs text-gray-500">{network.nativeCurrency.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatBalance(balance, 6)}</p>
                <p className="text-xs text-gray-500">{formatFiat(fiatValue)}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent activity placeholder */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <Link to="/history" className="text-sm text-claimora-400 hover:text-claimora-300">
            See all
          </Link>
        </div>
        <Card>
          <p className="text-sm text-gray-500 text-center py-6">
            No recent transactions. Send or receive to get started.
          </p>
        </Card>
      </div>
    </div>
  );
}

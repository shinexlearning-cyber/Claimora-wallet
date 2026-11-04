import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Share2, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWalletStore } from '@/store/walletStore';
import { getNetwork } from '@/lib/networks';
import { copyToClipboard, shortenAddress } from '@/lib/utils';
import toast from 'react-hot-toast';

export function Receive() {
  const { address, networkId } = useWalletStore();
  const network = getNetwork(networkId);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    await copyToClipboard(address);
    setCopied(true);
    toast.success('Address copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!address) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My CLAIMORA Wallet Address',
          text: address,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  if (!address) {
    return (
      <div className="p-8 text-center text-gray-400">
        No wallet address found. Please unlock or create a wallet.
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Receive</h1>
        <p className="text-sm text-gray-400 mt-0.5">{network.name}</p>
      </div>

      <Card className="flex flex-col items-center gap-5">
        <div className="p-4 bg-white rounded-2xl">
          <QRCodeSVG value={address} size={180} level="M" includeMargin={false} />
        </div>

        <div className="w-full space-y-2 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Your Address</p>
          <p className="font-mono text-sm break-all px-2">{address}</p>
        </div>

        <div className="flex gap-3 w-full">
          <Button variant="secondary" className="flex-1" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>
      </Card>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-100 text-sm">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
        <div>
          <p className="font-medium text-amber-200">Only send {network.nativeCurrency.symbol} on {network.name}</p>
          <p className="text-xs text-amber-200/70 mt-1">
            Sending assets from a different network or token type may result in permanent loss.
          </p>
        </div>
      </div>
    </div>
  );
}

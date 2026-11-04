import { Link } from 'react-router-dom';
import { Wallet, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Welcome() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[#0a0e14]">
      <div className="w-full max-w-md space-y-10 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-claimora-500 to-claimora-700 flex items-center justify-center shadow-card">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CLAIMORA</h1>
            <p className="text-gray-400 mt-1">Premium Crypto Wallet</p>
          </div>
        </div>

        {/* Features */}
        <div className="grid gap-4 text-left">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-surface-50 border border-surface-100">
            <Shield className="w-5 h-5 text-claimora-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Self-custody</p>
              <p className="text-xs text-gray-500 mt-0.5">Your keys never leave your device. Encrypted locally.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-surface-50 border border-surface-100">
            <Zap className="w-5 h-5 text-claimora-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Sepolia Testnet ready</p>
              <p className="text-xs text-gray-500 mt-0.5">Real on-chain transactions on Ethereum Sepolia.</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link to="/create" className="block">
            <Button className="w-full" size="lg">
              Create New Wallet
            </Button>
          </Link>
          <Link to="/import" className="block">
            <Button variant="outline" className="w-full" size="lg">
              Import Existing Wallet
            </Button>
          </Link>
          <Link to="/unlock" className="block">
            <Button variant="ghost" className="w-full">
              I already have a wallet
            </Button>
          </Link>
        </div>

        <p className="text-xs text-gray-600">
          By continuing you agree that you understand self-custody risks.
        </p>
      </div>
    </div>
  );
}

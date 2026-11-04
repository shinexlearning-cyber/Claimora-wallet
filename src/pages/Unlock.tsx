import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Wallet, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { unlockWallet, hasWallet, getStoredAddress } from '@/services/wallet';
import { useWalletStore } from '@/store/walletStore';
import { shortenAddress } from '@/lib/utils';
import toast from 'react-hot-toast';

export function Unlock() {
  const navigate = useNavigate();
  const { setUnlocked } = useWalletStore();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!hasWallet()) {
      navigate('/');
      return;
    }
    setAddress(getStoredAddress());
  }, [navigate]);

  const handleUnlock = async () => {
    if (!password) {
      toast.error('Enter your password');
      return;
    }

    setLoading(true);
    try {
      const { address: unlockedAddress } = await unlockWallet(password);
      setUnlocked(true, unlockedAddress);
      toast.success('Wallet unlocked');
      navigate('/dashboard');
    } catch (e: any) {
      toast.error(e.message || 'Incorrect password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#0a0e14]">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-claimora-500 to-claimora-700 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            {address && (
              <p className="text-sm text-gray-400 mt-1 font-mono">{shortenAddress(address, 6)}</p>
            )}
          </div>
        </div>

        <div className="space-y-4 text-left">
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Button className="w-full" size="lg" onClick={handleUnlock} loading={loading}>
            Unlock
          </Button>
        </div>

        <div className="pt-4 space-y-2">
          <Link to="/import" className="block text-sm text-claimora-400 hover:text-claimora-300">
            Import a different wallet
          </Link>
          <Link to="/" className="block text-sm text-gray-500 hover:text-gray-400">
            Create new wallet
          </Link>
        </div>
      </div>
    </div>
  );
}

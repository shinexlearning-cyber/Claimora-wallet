import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { importWallet } from '@/services/wallet';
import { useWalletStore } from '@/store/walletStore';
import toast from 'react-hot-toast';

export function ImportWallet() {
  const navigate = useNavigate();
  const { setUnlocked } = useWalletStore();

  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    const cleaned = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
    const wordCount = cleaned.split(' ').length;

    if (wordCount !== 12 && wordCount !== 24) {
      toast.error('Recovery phrase must be 12 or 24 words');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { address } = await importWallet(cleaned, password);
      setUnlocked(true, address);
      toast.success('Wallet imported');
      navigate('/dashboard');
    } catch (e: any) {
      toast.error(e.message || 'Invalid recovery phrase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e14]">
      <header className="flex items-center gap-3 px-4 h-14 border-b border-surface-100">
        <Link to="/" className="p-2 -ml-2 rounded-lg hover:bg-surface-50">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold">Import Wallet</h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Import with Recovery Phrase</h2>
            <p className="text-sm text-gray-400">
              Enter your 12 or 24 word recovery phrase. It will be encrypted locally with your password.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Recovery Phrase</label>
              <textarea
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                placeholder="word1 word2 word3 ..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-surface-50 border border-surface-200 text-white placeholder:text-gray-500 focus:outline-none focus:border-claimora-500 focus:ring-1 focus:ring-claimora-500/50 font-mono text-sm resize-none"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="relative">
              <Input
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Input
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
            />
          </div>

          <Button className="w-full" size="lg" onClick={handleImport} loading={loading}>
            Import Wallet
          </Button>
        </div>
      </div>
    </div>
  );
}

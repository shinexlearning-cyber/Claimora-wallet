import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { generateMnemonic, createWalletFromMnemonic } from '@/services/wallet';
import { useWalletStore } from '@/store/walletStore';
import { copyToClipboard } from '@/lib/utils';
import toast from 'react-hot-toast';

type Step = 'password' | 'mnemonic' | 'confirm' | 'done';

export function CreateWallet() {
  const navigate = useNavigate();
  const { setUnlocked } = useWalletStore();

  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [userConfirmWords, setUserConfirmWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
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
      const phrase = await generateMnemonic();
      setMnemonic(phrase);
      setWords(phrase.split(' '));
      setStep('mnemonic');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await copyToClipboard(mnemonic);
    setCopied(true);
    toast.success('Recovery phrase copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const startConfirm = () => {
    // Pick 3 random indices for confirmation
    const indices: number[] = [];
    while (indices.length < 3) {
      const i = Math.floor(Math.random() * 12);
      if (!indices.includes(i)) indices.push(i);
    }
    indices.sort((a, b) => a - b);
    setSelectedIndices(indices);
    setUserConfirmWords(['', '', '']);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    const expected = selectedIndices.map((i) => words[i]);
    const match = expected.every((w, i) => w === userConfirmWords[i]?.toLowerCase().trim());

    if (!match) {
      toast.error('Words do not match. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const { address } = await createWalletFromMnemonic(mnemonic, password);
      setUnlocked(true, address);
      toast.success('Wallet created successfully');
      setStep('done');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create wallet');
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
        <h1 className="font-semibold">Create Wallet</h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          {step === 'password' && (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Secure your wallet</h2>
                <p className="text-sm text-gray-400">
                  This password encrypts your recovery phrase on this device. It is never sent anywhere.
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
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
                  autoComplete="new-password"
                />
              </div>

              <Button className="w-full" size="lg" onClick={handleGenerate} loading={loading}>
                Continue
              </Button>
            </>
          )}

          {step === 'mnemonic' && (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Recovery Phrase</h2>
                <p className="text-sm text-gray-400">
                  Write these 12 words down and store them offline. This is the only way to recover your wallet.
                </p>
              </div>

              <Card className="relative">
                <div className="grid grid-cols-3 gap-2">
                  {words.map((word, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface-100 text-sm font-mono"
                    >
                      <span className="text-gray-500 text-xs w-4">{i + 1}.</span>
                      {word}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleCopy}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-surface-100 hover:bg-surface-200 text-gray-400 hover:text-white"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </Card>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Never share your recovery phrase. CLAIMORA support will never ask for it. Anyone with these words can control your funds.
                </p>
              </div>

              <Button className="w-full" size="lg" onClick={startConfirm}>
                I have saved my phrase
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Confirm Recovery Phrase</h2>
                <p className="text-sm text-gray-400">
                  Enter the requested words to verify you saved them correctly.
                </p>
              </div>

              <div className="space-y-4">
                {selectedIndices.map((wordIndex, i) => (
                  <Input
                    key={wordIndex}
                    label={`Word #${wordIndex + 1}`}
                    value={userConfirmWords[i] || ''}
                    onChange={(e) => {
                      const next = [...userConfirmWords];
                      next[i] = e.target.value;
                      setUserConfirmWords(next);
                    }}
                    placeholder="Enter word"
                    autoComplete="off"
                  />
                ))}
              </div>

              <Button className="w-full" size="lg" onClick={handleConfirm} loading={loading}>
                Create Wallet
              </Button>
            </>
          )}

          {step === 'done' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold">Wallet Created</h2>
              <p className="text-sm text-gray-400">Redirecting to dashboard…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

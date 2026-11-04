import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useWalletStore } from '@/store/walletStore';
import {
  isValidAddress,
  estimateGas,
  sendTransaction,
  unlockWallet,
  getBalance,
} from '@/services/wallet';
import { getNetwork } from '@/lib/networks';
import { formatBalance } from '@/lib/utils';
import toast from 'react-hot-toast';

export function Send() {
  const navigate = useNavigate();
  const { address, balance, networkId, setBalance } = useWalletStore();
  const network = getNetwork(networkId);

  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'sending' | 'success'>('form');
  const [fee, setFee] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (address) {
      getBalance(address, networkId).then(setBalance);
    }
  }, [address, networkId]);

  const validateForm = () => {
    setError('');
    if (!isValidAddress(to)) {
      setError('Invalid recipient address');
      return false;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount');
      return false;
    }
    if (amt > parseFloat(balance || '0')) {
      setError('Insufficient balance');
      return false;
    }
    return true;
  };

  const handleContinue = async () => {
    if (!validateForm() || !address) return;

    setLoading(true);
    try {
      const { feeEth } = await estimateGas(address, to, amount, networkId);
      setFee(feeEth);
      setStep('confirm');
    } catch (e: any) {
      setError(e.message || 'Failed to estimate gas');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!password) {
      toast.error('Enter your password to sign the transaction');
      return;
    }

    setLoading(true);
    setStep('sending');
    try {
      const { wallet } = await unlockWallet(password);
      const { hash, wait } = await sendTransaction(wallet, to, amount, networkId);
      setTxHash(hash);

      // Wait for confirmation (optional)
      try {
        await wait();
        toast.success('Transaction confirmed');
      } catch {
        toast('Transaction submitted – confirmation pending', { icon: '⏳' });
      }

      setStep('success');
      // Refresh balance
      if (address) {
        const bal = await getBalance(address, networkId);
        setBalance(bal);
      }
    } catch (e: any) {
      toast.error(e.message || 'Transaction failed');
      setStep('confirm');
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => (step === 'form' ? navigate(-1) : setStep('form'))} className="p-2 -ml-2 rounded-lg hover:bg-surface-50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Send {network.nativeCurrency.symbol}</h1>
      </div>

      {step === 'form' && (
        <div className="space-y-5">
          <Input
            label="Recipient Address"
            value={to}
            onChange={(e) => setTo(e.target.value.trim())}
            placeholder="0x..."
            autoComplete="off"
            spellCheck={false}
          />

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-300">Amount</label>
              <button
                type="button"
                className="text-xs text-claimora-400"
                onClick={() => setAmount(balance || '0')}
              >
                Max: {formatBalance(balance, 6)}
              </button>
            </div>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              type="text"
              inputMode="decimal"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <Button className="w-full" size="lg" onClick={handleContinue} loading={loading}>
            Continue
          </Button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-5">
          <Card className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">To</span>
              <span className="font-mono text-right break-all max-w-[220px]">{to}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Amount</span>
              <span className="font-medium">
                {amount} {network.nativeCurrency.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Est. Network Fee</span>
              <span>
                ~{fee ? formatBalance(fee, 6) : '…'} {network.nativeCurrency.symbol}
              </span>
            </div>
            <div className="border-t border-surface-100 pt-3 flex justify-between">
              <span className="text-gray-400">Network</span>
              <span>{network.name}</span>
            </div>
          </Card>

          <Input
            label="Password (to sign)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter wallet password"
          />

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep('form')}>
              Back
            </Button>
            <Button className="flex-1" onClick={handleSend} loading={loading}>
              Confirm & Send
            </Button>
          </div>
        </div>
      )}

      {step === 'sending' && (
        <div className="text-center py-12 space-y-4">
          <div className="w-12 h-12 mx-auto border-2 border-claimora-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Submitting transaction…</p>
        </div>
      )}

      {step === 'success' && (
        <div className="text-center space-y-6 py-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Transaction Sent</h2>
            {txHash && (
              <a
                href={`${network.explorer}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-claimora-400 hover:underline mt-2 inline-block break-all"
              >
                View on explorer
              </a>
            )}
          </div>
          <Button className="w-full" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}

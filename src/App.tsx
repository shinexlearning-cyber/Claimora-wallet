import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { Welcome } from '@/pages/Welcome';
import { CreateWallet } from '@/pages/CreateWallet';
import { ImportWallet } from '@/pages/ImportWallet';
import { Unlock } from '@/pages/Unlock';
import { Dashboard } from '@/pages/Dashboard';
import { Send } from '@/pages/Send';
import { Receive } from '@/pages/Receive';
import { History } from '@/pages/History';
import { Settings } from '@/pages/Settings';
import { Swap } from '@/pages/Swap';
import { Buy } from '@/pages/Buy';
import { useWalletStore } from '@/store/walletStore';
import { hasWallet } from '@/services/wallet';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isUnlocked } = useWalletStore();

  if (!hasWallet()) {
    return <Navigate to="/" replace />;
  }
  if (!isUnlocked) {
    return <Navigate to="/unlock" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1a2332',
            color: '#e8edf5',
            border: '1px solid #2e3a4a',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/create" element={<CreateWallet />} />
        <Route path="/import" element={<ImportWallet />} />
        <Route path="/unlock" element={<Unlock />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/send" element={<Send />} />
          <Route path="/receive" element={<Receive />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/swap" element={<Swap />} />
          <Route path="/buy" element={<Buy />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Settings,
  Repeat,
  CreditCard,
  LogOut,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWalletStore } from '@/store/walletStore';
import { shortenAddress } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/send', icon: ArrowUpRight, label: 'Send' },
  { to: '/receive', icon: ArrowDownLeft, label: 'Receive' },
  { to: '/swap', icon: Repeat, label: 'Swap' },
  { to: '/buy', icon: CreditCard, label: 'Buy' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { address, logout } = useWalletStore();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-full bg-surface border-r border-surface-100">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-surface-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-claimora-500 to-claimora-700 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight">CLAIMORA</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-claimora-600/15 text-claimora-400'
                  : 'text-gray-400 hover:text-white hover:bg-surface-50'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-surface-100 space-y-3">
        {address && (
          <div className="px-3 py-2 rounded-xl bg-surface-50 text-xs text-gray-400 font-mono">
            {shortenAddress(address, 6)}
          </div>
        )}
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Lock Wallet
        </button>
      </div>
    </aside>
  );
}

# CLAIMORA — Cryptocurrency Wallet

A modern, self-custody cryptocurrency wallet focused on security, clean design, and real blockchain connectivity (Ethereum Sepolia testnet first).

## Features Implemented

- **Wallet Creation & Import**
  - BIP-39 12-word recovery phrase generation (ethers.js)
  - HD wallet derivation
  - Local encryption of the mnemonic with user password (scrypt via ethers)
  - Recovery phrase confirmation step
  - Import existing wallets

- **Security**
  - Private keys / mnemonic never leave the device
  - Never sent to any backend
  - Encrypted at rest with user password
  - Password required to sign transactions

- **Dashboard**
  - Real balance fetch from Sepolia RPC
  - Address display + copy + explorer link
  - Quick actions (Send / Receive / Swap / Buy)
  - Responsive desktop sidebar + mobile bottom nav

- **Send**
  - Address validation
  - Balance check
  - Gas estimation
  - Password confirmation
  - Real transaction submission on Sepolia
  - Explorer link on success

- **Receive**
  - Real address QR code
  - Copy / Share
  - Network warning

- **Settings**
  - Network switcher (Sepolia + Mainnet structure)
  - Lock / Remove wallet

- **Placeholder (clearly marked)**
  - Transaction history (needs indexer API)
  - Swap (needs DEX aggregator)
  - Buy (needs fiat on-ramp)

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- ethers.js v6 (wallet + provider + transactions)
- Zustand (state)
- React Router
- qrcode.react
- Lucide icons

## Getting Started

```bash
cd claimora
npm install
npm run dev
```

Open http://localhost:5173

### Create a wallet
1. Click **Create New Wallet**
2. Set a strong password (encrypts the seed locally)
3. Write down the 12-word recovery phrase
4. Confirm the words
5. You are taken to the dashboard

### Get Sepolia ETH for testing
Use a public faucet:
- https://sepoliafaucet.com
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://faucet.quicknode.com/ethereum/sepolia

Paste your CLAIMORA address and request test ETH.

### Send a real testnet transaction
1. Go to **Send**
2. Enter a valid Sepolia address
3. Enter amount
4. Review fee
5. Enter password to sign
6. Transaction is broadcast to the network

## Important Notes

- **Testnet only by default.** Mainnet is present in the network list but you should only enable real funds after thorough auditing.
- No backend is required for core wallet functionality (create / import / send / receive / balance).
- Transaction history, price feeds, Swap and Buy need external provider keys.
- Never share your recovery phrase. CLAIMORA support will never ask for it.

## Project Structure

```
src/
  components/
    layout/     # Sidebar, MobileNav, AppLayout
    ui/         # Button, Input, Card
  pages/        # All screens
  services/     # wallet.ts (core crypto + RPC)
  store/        # Zustand store
  lib/          # utils, networks
  types/
```

## Security Design

1. Mnemonic generated client-side with Wallet.createRandom()
2. Encrypted with wallet.encrypt(password) (ethers scrypt)
3. Only the encrypted JSON + public address stored in localStorage
4. Unlocking decrypts in memory only for the session
5. Sending requires re-entering password to obtain the signer
6. No private key or mnemonic is ever logged or transmitted

## License

MIT

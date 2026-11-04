# Claimora Wallet — Sepolia testnet prototype

Claimora is a non-custodial cryptocurrency wallet application (not a portfolio site or generic dashboard). Users can:

1. **Create a Claimora wallet** — generates an Ethereum wallet in the browser. The encrypted JSON keystore is stored only in this browser’s local storage and unlocked with a password the user chooses. The recovery phrase is shown once at creation. Claimora’s server never receives the private key or recovery phrase.
2. **Connect an existing wallet** — uses an injected browser wallet (MetaMask, Trust Wallet, etc.) or Reown AppKit / WalletConnect when a Reown Project ID is configured.

## Completed features

- Create, encrypt, unlock and use a Claimora wallet on the current browser/device
- Connect external wallets (injected + optional WalletConnect via Reown)
- Live ETH balance on **Ethereum Sepolia testnet**
- Receive: show address + QR code (real address, not a sample)
- Send Sepolia test ETH with validation, review screen, confirmation, and explorer link
- Recent transaction history stored on-device (sent transactions from this app)
- Copy address, refresh balance, disconnect
- Desktop layout that uses available width (multi-column) and a clean mobile layout
- Original Claimora dark purple / black + gold visual identity preserved
- Clear testnet warnings and honest empty states (no fake balances or fake swaps)
- Server-side wallet-signature login and admin users endpoint retained
- Swap button present but clearly marked unavailable (no fake rates or simulated trades)

## Important limitations — read before using

- **This is a testnet prototype, not a production-ready wallet for real funds.** Do not deposit real cryptocurrency or use a recovery phrase that holds real funds.
- The only supported chain for balance and sending in this build is Ethereum Sepolia. Sepolia ETH is test currency with no monetary value.
- Swap is intentionally disabled; no swap transaction is simulated.
- This build does not yet provide email/password registration, cloud wallet recovery, Bitcoin support, ERC-20 token balances, fiat on/off-ramp, or audited key management.
- The locally created wallet is only saved in the browser profile that created it. Clearing browser data, losing the device, or losing the password can permanently lose access unless the user has safely backed up the recovery phrase. Never send that phrase to support or enter it into a website.
- Local browser encryption is not a substitute for a professional security audit. Before mainnet launch, commission an independent wallet/security audit and threat model.
- SQLite on Render’s ephemeral filesystem is not durable. For production, use managed PostgreSQL and migrate the Prisma datasource before launch.
- Transaction history currently records sends initiated from this app on this device. Full chain history would require an indexer or explorer API.

## Run locally

1. Install Node.js 20 or newer.
2. Extract this ZIP and open a terminal in the project folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and set `REOWN_PROJECT_ID` (optional) and `ADMIN_WALLETS` (public addresses only).
5. Run `npx prisma generate` then `npx prisma db push`.
6. Run `npm start` and open `http://localhost:4000`.

Without a Reown Project ID, the Connect Existing Wallet button works with a browser-injected wallet such as MetaMask. Add a Reown Project ID to enable AppKit/WalletConnect support. A Reown Project ID is public app configuration, not a wallet private key.

## Environment variables

See `.env.example`.

- `REOWN_PROJECT_ID` — Reown project ID (public).
- `ADMIN_WALLETS` — comma-separated admin **public** wallet addresses; never put private keys here.
- `DATABASE_URL` — database connection. The included SQLite setting is for local development only; configure PostgreSQL for durable production storage and update `prisma/schema.prisma` accordingly.
- `NODE_ENV=production` for production.

## Security

- Never ask users for their MetaMask / Trust Wallet private keys or seed phrases.
- External wallet users approve connection and transactions in their own wallet app.
- Claimora-created wallet recovery phrases belong only to the user. Do not log, transmit, or store plaintext recovery phrases or private keys.
- Do not claim the application is fully secure without a proper security audit.

## Features that still require external work

- Real swap integration (DEX router / aggregator)
- Multi-chain and ERC-20 token balances
- Full on-chain transaction history via indexer or explorer API
- Production database (PostgreSQL) and durable session storage
- Independent security audit before any mainnet use
- Optional cloud backup / social recovery (out of scope for this non-custodial prototype)

## Project structure

```
Claimora-wallet-main/
├── public/
│   ├── index.html      # Main wallet UI
│   ├── app.js          # Wallet logic (create, connect, send, receive)
│   ├── styles.css      # Claimora design (mobile + desktop)
│   ├── admin.html      # Admin users list
│   ├── admin.js
│   └── admin.css
├── prisma/schema.prisma
├── server.js           # Express + signature auth + config.js
├── package.json
├── .env.example
└── README.md
```

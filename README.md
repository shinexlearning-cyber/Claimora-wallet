# Claimora Wallet — testnet prototype

Claimora currently provides two ways to use a wallet:

1. **Create Claimora wallet** — creates an Ethereum wallet in the browser. The encrypted JSON keystore is stored in this browser's local storage and unlocked with the password the user chooses. The recovery phrase is shown once at creation. Claimora's server does not receive the private key or recovery phrase.
2. **Connect existing wallet** — uses an injected browser wallet (for example MetaMask) or Reown AppKit/WalletConnect when a Reown Project ID is configured.

## Current functionality

- Create, encrypt, unlock and use a Claimora wallet on the current browser/device.
- Connect an external wallet.
- Read live ETH balance on **Ethereum Sepolia testnet**.
- Show a receive address and QR code.
- Send Sepolia test ETH with confirmation in the wallet signer.
- Wallet address copy, refresh, disconnect, basic notifications panel.
- Existing server-side wallet-signature login and admin user endpoint are retained.

## Important limitations — read before using

- **This is a testnet prototype, not a production-ready wallet for real funds.** Do not deposit real cryptocurrency or use a recovery phrase holding real funds.
- The only supported chain for balance and sending in this build is Ethereum Sepolia. Sepolia ETH is test currency with no monetary value.
- Swap is intentionally disabled; no swap transaction is simulated.
- This build does not yet provide email/password registration, cloud wallet recovery, Bitcoin support, ERC-20 token balances, fiat on/off-ramp, or audited key management.
- The locally created wallet is only saved in the browser profile that created it. Clearing browser data, losing the device, or losing the password can permanently lose access unless the user has safely backed up the recovery phrase. Never send that phrase to support or enter it into a website.
- Local browser encryption is not a substitute for a professional security audit. Before mainnet launch, commission an independent wallet/security audit and threat model.
- SQLite on Render's ephemeral filesystem is not durable. For production, use managed PostgreSQL and migrate the Prisma datasource before launch.

## Run locally

1. Install Node.js 20 or newer.
2. Extract this ZIP and open a terminal in the project folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and set `REOWN_PROJECT_ID` and `ADMIN_WALLETS` (public addresses only).
5. Run `npx prisma generate` then `npx prisma db push`.
6. Run `npm start` and open `http://localhost:4000`.

Without a Reown Project ID, the Connect Existing Wallet button works with a browser-injected wallet such as MetaMask. Add a Reown Project ID to enable AppKit/WalletConnect support. A Reown Project ID is public app configuration, not a wallet private key.

## Render environment variables

- `REOWN_PROJECT_ID`: Reown project ID (public project identifier).
- `ADMIN_WALLETS`: comma-separated admin public wallet addresses; never put private keys here.
- `DATABASE_URL`: database connection. The included SQLite setting is for local development only; configure PostgreSQL for durable production storage and update `prisma/schema.prisma` accordingly.
- `NODE_ENV=production`.

## Security

Never ask users for their MetaMask/Trust Wallet private keys or seed phrases. External wallet users approve connection and transactions in their own wallet app. Claimora-created wallet recovery phrases belong only to the user. Do not log, transmit, or store plaintext recovery phrases or private keys.

# Onchain POAPs

A decentralized protocol and web application for creating, managing, and minting Proof-of-Attendance (POAP) tokens on Base Sepolia.

## Live Demo

- **Live Application**: [https://onchain-poaps-nu.vercel.app](https://onchain-poaps-nu.vercel.app)

## Features

- **Event Creation & Registration**: Deploy customized POAP events with custom SVG badges, event location, timestamp, external links, and minting rules (public, soulbound, capped supply).
- **Flexible Minting Modes**:
  - **Public Open Minting**: Direct onchain claim for open events.
  - **Merkle Tree Allowlist**: Cryptographically verify attendee wallet addresses using Merkle proofs (`merkletreejs` & `keccak256`) with creator timelock security.
  - **EIP-712 / ECDSA Signature Minting**: Issue and verify offline cryptographic organizer signatures for gated attendance.
- **Allowlist Studio**: Build, validate, and publish Merkle roots from CSV or text inputs, complete with proof generation and copyable attendee proofs.
- **Signature Studio**: Authorize individual attendees with cryptographic ECDSA signatures, batch signature generation, QR code sharing, and one-click mint links.
- **Interactive Gallery & Explorer**: Filter, search, and view all registered POAP events, active mints, and token collector holdings on Base Sepolia.
- **Collector Gallery**: Inspect individual wallet POAP collections with onchain token validation and BaseScan explorer links.
- **Farcaster Mini App & Standalone Web**: Seamlessly works both as a standalone responsive web application and inside Farcaster / Warpcast client frames with auto-wallet connection.
- **Interactive Protocol Documentation**: Built-in interactive developer documentation with smart contract architecture, interface definitions, and security specs.

## Tech Stack

- **Framework & Build Tool**: [Vite](https://vitejs.dev/) + [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Web3 & Wallet Connectivity**:
  - [wagmi v2](https://wagmi.sh/)
  - [viem v2](https://viem.sh/)
  - [RainbowKit v2](https://www.rainbowkit.com/)
- **Farcaster Integration**:
  - `@farcaster/miniapp-sdk`
  - `@farcaster/miniapp-wagmi-connector`
- **Cryptography & Proofs**: `merkletreejs`, `keccak256`
- **State & Data Fetching**: [@tanstack/react-query v5](https://tanstack.com/query)
- **Icons & UI Effects**: `lucide-react`, `canvas-confetti`, `qrcode.react`, `motion`

## Prerequisites

Before you begin, ensure you have the following installed and set up:

- **Node.js**: Version 18.0.0 or higher (`node -v`)
- **Package Manager**: `npm` (v9+) or `pnpm` (v8+)
- **WalletConnect Cloud Account**: Obtain a free Project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com)
- **Web3 Wallet**: MetaMask, Coinbase Wallet, Rainbow, or any EVM-compatible wallet configured with Base Sepolia testnet ETH

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/EmcyZany/onchain-poaps.git
   cd onchain-poaps
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file from the provided `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set your `VITE_WALLETCONNECT_PROJECT_ID`:
   ```env
   VITE_WALLETCONNECT_PROJECT_ID=your_actual_walletconnect_project_id
   ```

## Running Locally

Start the local development server with Hot Module Replacement:
```bash
npm run dev
```

The application will be accessible at `http://localhost:3000` (or the port indicated in your console).

## Building for Production

Compile TypeScript and bundle assets for production:
```bash
npm run build
```

The optimized production build will be generated in the `dist/` directory.

To preview the production build locally:
```bash
npm run preview
```

## Deployment

### Deploying to Vercel

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your repository.
4. Configure the Project Settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. In **Environment Variables**, add:
   - `VITE_WALLETCONNECT_PROJECT_ID`: Your WalletConnect Cloud Project ID
   - `APP_URL` (optional): Your production URL (`https://onchain-poaps-nu.vercel.app`)
6. Click **Deploy**.

## Environment Variables

The following environment variables can be configured:

| Variable | Required | Description | Default |
| :--- | :--- | :--- | :--- |
| `VITE_WALLETCONNECT_PROJECT_ID` | Optional / Recommended | WalletConnect / Reown Cloud Project ID for wallet modal connectivity | Built-in development ID |
| `GEMINI_API_KEY` | Optional | Google Gemini API Key for AI badge generation and smart metadata | `""` |
| `APP_URL` | Optional | Canonical URL of the deployed application for Farcaster Mini App frames and social previews | `https://onchain-poaps-nu.vercel.app` |

## Farcaster Mini App Setup

This application is fully compatible with the Farcaster Mini App / Frame v2 specification:

- **SDK Integration**: Utilizes `@farcaster/miniapp-sdk` and `@farcaster/miniapp-wagmi-connector` for seamless embedded wallet connection inside Warpcast.
- **Splash Screen Handling**: Automatically triggers `sdk.actions.ready()` once the UI is loaded to dismiss native loading screens.
- **Environment Detection**: Automatically detects when running inside a Farcaster mobile WebView or desktop iframe and connects the user's Farcaster custody/connected address.
- **Standalone Compatibility**: Gracefully falls back to RainbowKit and standard browser providers when accessed directly in a regular web browser.
- **Manifest Configuration**: Point your Farcaster frame manifest to `https://onchain-poaps-nu.vercel.app` or your production domain.

## Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure your code passes type checks and linter rules before submitting:
```bash
npm run lint
```

## License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for full details.

Copyright (c) 2026 EmcyZany.

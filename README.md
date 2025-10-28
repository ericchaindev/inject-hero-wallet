# 🦸 Hero Wallet - Multi-Chain Web3 Wallet Extension

A production-ready, multi-chain cryptocurrency wallet browser extension built with TypeScript, React, and Vite.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)

[فارسی](./README-FA.md) | **English**

---

## ✨ Features

### 🔐 Security First

- **AES-256-GCM** encryption for all sensitive data
- **PBKDF2** key derivation with 200,000 iterations
- **BIP39** mnemonic phrase generation & **BIP44** HD wallet
- Encrypted PIN memory with device-specific secrets
- Auto-lock after 5 minutes of inactivity

### 🌐 Multi-Chain Support

Ethereum • Polygon • BSC • Bitcoin • Solana • Sui • TON • Hedera

### 🚀 Full dApp Integration

- Complete **EIP-1193** provider + **EIP-6963** multi-wallet support
- MetaMask-compatible API with 15+ RPC methods
- Transaction approval flow with detailed information
- Origin-based permission management

---

## 🚀 Quick Start

### Build

Requirements: **Node.js 18+**

```bash
npm install
npm run build
```

### Load in Browser

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

### First Time Setup

1. Click the Hero Wallet extension icon 🦸
2. **Create New Wallet** or **Restore Wallet**
3. **Write down your 12-word mnemonic phrase** 📝
4. Set a PIN (4-8 digits)
5. ✅ Ready to use!

---

## 🧪 Testing

### Test Page

Open `test-hero-wallet.html` in your browser for:

- Wallet connection testing
- Message signing & verification
- Transaction sending (use Sepolia!)
- Network switching
- Activity logging

### Real dApps

Compatible with: **Uniswap** • **OpenSea** • **MetaMask Test Dapp**

⚠️ **Use Sepolia Testnet for testing!** Get free test ETH: [sepoliafaucet.com](https://sepoliafaucet.com/)

---

## 📚 Documentation

- **[Testing Guide (فارسی)](./TESTING-GUIDE.md)** - Complete testing instructions
- **[Troubleshooting (فارسی)](./TROUBLESHOOTING.md)** - Common issues & solutions
- **[Persian README](./README-FA.md)** - Full documentation in Persian

---

## 🏗️ Development

### Project Structure

```
src/
├── background.ts          # Service worker (RPC handler)
├── contentScript.ts       # Bridge layer
├── inpage.ts              # Injected provider (EIP-1193)
├── popup/                 # Main wallet UI
├── ui/                    # Approval & settings pages
├── utils/                 # Keystore, crypto, networks
└── adapters/              # Chain-specific implementations
```

### Watch Mode

```bash
npm run dev  # Auto-rebuild on changes
```

---

## 🔐 Security

- AES-256-GCM encryption
- PBKDF2 (200k iterations)
- Secure session management
- Origin-based permissions
- Auto-lock & secure memory wiping

---

## 🛣️ Roadmap

**Current** ✅

- Multi-chain support
- PIN memory
- Full dApp integration
- Permission management

**Planned** 🎯

- Balance display
- Transaction history
- Token & NFT support
- Multiple accounts UI

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit Pull Request

---

## ⚠️ Disclaimer

**Educational & development purposes only.**

- Always backup your mnemonic phrase
- Test with small amounts first
- Use testnet for development
- Never share private keys

---

## 📞 Support

- [GitHub Issues](https://github.com/ericdevteam-ops/inject-hero-wallet/issues)
- [Discussions](https://github.com/ericdevteam-ops/inject-hero-wallet/discussions)

---

## License

MIT - See [LICENSE](LICENSE) file

---

**Made with ❤️ by Eric Dev Team**

⭐ Star us on GitHub if you find this useful!

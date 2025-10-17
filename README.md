# Hero Wallet (Inject)

Secure multi-chain browser extension wallet with inpage provider injection and approval flow.

## Build

- Requirements: Node.js 20+
- Install deps and build:

  npm install
  npm run build

Artifacts go to dist/.

## Load in Chrome

1. Open chrome://extensions
2. Enable Developer mode
3. Click "Load unpacked" and select the dist/ folder

## Development

- Watch build (MV3-friendly):

  npm run dev

- Popup: src/popup/index.html
- Settings: src/ui/settings.html
- Approval: src/ui/approval.html
- Background: src/background.ts
- Content script: src/contentScript.ts
- Inpage provider: src/inpage.ts

## CI

GitHub Actions builds on each push/PR and uploads the dist artifact.

## License

MIT

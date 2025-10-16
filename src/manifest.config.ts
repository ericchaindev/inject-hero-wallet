// Enhanced Manifest V3 Configuration with Security and Performance Optimizations

export default {
  manifest_version: 3,
  name: 'Ghahreman (Hero) Wallet',
  version: '0.9.0',
  description:
    'Secure multi-chain crypto wallet with advanced dApp integration and approval system.',

  // Enhanced action configuration
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Hero Wallet',
  },

  // Enhanced background service worker configuration
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },

  // Optimized permissions - requesting only what's needed
  permissions: [
    'storage', // Essential: Store wallet state and settings
    'tabs', // Essential: Communicate with web pages
    'scripting', // Essential: Inject content scripts
    'clipboardWrite', // Useful: Copy addresses/hashes to clipboard
    'clipboardRead', // Useful: Read addresses from clipboard
    'activeTab', // Security: Only access currently active tab
  ],

  // Host permissions with more granular control
  host_permissions: [
    '<all_urls>', // Required for multi-chain dApp compatibility
  ],

  // Enhanced Content Security Policy for maximum security
  content_security_policy: {
    extension_pages: [
      "script-src 'self'",
      "object-src 'self'",
      "style-src 'self' 'unsafe-inline'", // Allow inline styles for React
      "img-src 'self' data: https:", // Allow data URLs and HTTPS images
      "font-src 'self' data:", // Allow data URL fonts
      "connect-src 'self' https: wss:", // Allow HTTPS and WSS connections for RPC
    ].join('; '),
  },

  // Enhanced content script configuration
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/contentScript.ts'],
      run_at: 'document_start',
      all_frames: false, // Only inject into main frame for security
      world: 'ISOLATED', // Manifest V3 isolated world
    },
  ],

  // Enhanced web accessible resources with better security
  web_accessible_resources: [
    {
      resources: ['inpage.js', 'src/ui/approval.html', 'src/ui/settings.html'],
      matches: ['<all_urls>'],
    },
  ],

  // Icons will be added later
  // icons: {
  //   '16': 'icons/icon-16.png',
  //   '32': 'icons/icon-32.png',
  //   '48': 'icons/icon-48.png',
  //   '128': 'icons/icon-128.png'
  // },

  // Security and privacy enhancements
  minimum_chrome_version: '102', // Ensure modern Chrome features

  // Optional permissions for future features
  optional_permissions: [
    'notifications', // Future: Transaction notifications
    'contextMenus', // Future: Right-click menu integration
    'offscreen', // Future: Background cryptographic operations
  ],

  // Commands for keyboard shortcuts
  commands: {
    _execute_action: {
      suggested_key: {
        default: 'Ctrl+Shift+H',
        mac: 'Command+Shift+H',
      },
      description: 'Open Hero Wallet',
    },
    lock_wallet: {
      suggested_key: {
        default: 'Ctrl+Shift+L',
        mac: 'Command+Shift+L',
      },
      description: 'Lock wallet',
    },
  },

  // Enhanced author and homepage information
  author: { email: 'team@herowallet.example.com' },
  homepage_url: 'https://herowallet.example.com',

  // Update URL for automatic updates (when published)
  // update_url: 'https://clients2.google.com/service/update2/crx',

  // Incognito mode behavior
  incognito: 'spanning', // Allow wallet to work across regular and incognito windows

  // Future: Storage and network request configuration can be added later
  // storage: {
  //   managed_schema: 'storage-schema.json'
  // },
  //
  // declarative_net_request: {
  //   rule_resources: []
  // }
} satisfies chrome.runtime.ManifestV3;

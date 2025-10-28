import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import manifest from './src/manifest.config';

export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  const isDevelopment = command === 'serve';
  const isProduction = mode === 'production';

  const config: UserConfig = {
    // Use relative paths for Chrome extension compatibility
    base: './',

    // Enhanced plugin configuration
    plugins: [
      // React with SWC for fast compilation
      react(),

      // WebAssembly support for crypto operations
      wasm(),

      // Chrome Extension plugin with enhanced configuration
      crx({
        manifest,
        contentScripts: {
          injectCss: true,
          // Enhanced CSS injection for better performance
          preambleCode: `
            // Ensure content script runs in correct context
            if (typeof window !== 'undefined' && window.location) {
              console.log('Hero Wallet content script initializing...');
            }
          `,
        },
      }),
    ],

    // Enhanced development server configuration
    server: {
      port: 3000,
      host: 'localhost',
      strictPort: true,
      // Enable CORS for development
      cors: true,
      // Watch file changes more efficiently
      watch: {
        usePolling: false,
        interval: 100,
      },
    },

    // Enhanced build configuration
    build: {
      // Enable source maps in development, disable in production for security
      sourcemap: isDevelopment ? 'inline' : false,

      // Build target for modern browsers (Chrome extensions)
      target: 'esnext',

      // Minification settings
      minify: isProduction ? 'terser' : false,

      // Rollup configuration with enhanced options
      rollupOptions: {
        // Entry points for all extension components
        input: {
          // Core extension scripts
          inpage: resolve(__dirname, 'src/inpage.ts'),
          'inpage-solana': resolve(__dirname, 'src/inpage-solana.ts'),
          background: resolve(__dirname, 'src/background.ts'),
          contentScript: resolve(__dirname, 'src/contentScript.ts'),

          // UI entry points
          popup: resolve(__dirname, 'src/popup/index.html'),
          settings: resolve(__dirname, 'src/ui/settings.html'),
          approval: resolve(__dirname, 'src/ui/approval.html'),
        },

        output: {
          // Enhanced file naming strategy
          entryFileNames: (chunkInfo) => {
            // Critical extension files at root level
            if (
              [
                'inpage',
                'inpage-solana',
                'background',
                'contentScript',
              ].includes(chunkInfo.name)
            ) {
              return `${chunkInfo.name}.js`;
            }
            // UI components in organized structure
            return `assets/[name]-[hash].js`;
          },

          // Asset naming with better organization
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name || '';

            // HTML files in src/ui directory structure
            if (info.endsWith('.html')) {
              if (info.includes('popup')) return 'src/popup/index.html';
              if (info.includes('settings')) return 'src/ui/settings.html';
              if (info.includes('approval')) return 'src/ui/approval.html';
              return info;
            }

            // CSS files in assets
            if (info.endsWith('.css')) {
              return 'assets/[name]-[hash][extname]';
            }

            // Images and icons
            if (/\.(png|jpg|jpeg|gif|svg|ico)$/.test(info)) {
              return 'icons/[name][extname]';
            }

            // Other assets
            return 'assets/[name]-[hash][extname]';
          },

          // Enhanced chunk splitting for better performance
          manualChunks: (id) => {
            // Don't create chunks for inpage scripts to avoid scope conflicts
            if (id.includes('src/inpage')) {
              return undefined;
            }

            // React ecosystem
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/@types/react')
            ) {
              return 'vendor-react';
            }

            // Cryptographic libraries
            if (
              id.includes('tweetnacl') ||
              id.includes('bip39') ||
              id.includes('tiny-secp256k1')
            ) {
              return 'vendor-crypto';
            }

            // Blockchain libraries
            if (
              id.includes('ethers') ||
              id.includes('@solana/web3.js') ||
              id.includes('bitcoinjs-lib')
            ) {
              return 'vendor-chain';
            }

            // Sui and TON libraries
            if (id.includes('@mysten/sui.js') || id.includes('ton')) {
              return 'vendor-chain-alt';
            }

            // UI libraries
            if (
              id.includes('node_modules') &&
              (id.includes('emotion') || id.includes('styled'))
            ) {
              return 'vendor-ui';
            }

            // Utilities
            if (
              id.includes('node_modules') &&
              (id.includes('lodash') || id.includes('ramda'))
            ) {
              return 'vendor-utils';
            }
          },

          // Module format optimized for Chrome extensions
          format: 'es',

          // Enhanced globals for better compatibility
          globals: {
            chrome: 'chrome',
            browser: 'browser',
          },
        },

        // External dependencies (not bundled)
        external: ['chrome'],
      },

      // Chunk size warnings
      chunkSizeWarningLimit: 1000,

      // Enhanced output directory
      outDir: 'dist',
      emptyOutDir: true,

      // Asset handling
      assetsDir: 'assets',

      // Copy public files
      copyPublicDir: true,
    },

    // Enhanced resolve configuration
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@adapters': resolve(__dirname, 'src/adapters'),
        '@ui': resolve(__dirname, 'src/ui'),
        '@popup': resolve(__dirname, 'src/popup'),
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },

    // Enhanced CSS configuration
    css: {
      // CSS preprocessing
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`,
        },
      },

      // CSS modules configuration
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: isDevelopment
          ? '[name]__[local]___[hash:base64:5]'
          : '[hash:base64:8]',
      },

      // PostCSS configuration
      postcss: {
        plugins: [
          // Add PostCSS plugins as needed
        ],
      },
    },

    // Enhanced optimizations
    optimizeDeps: {
      // Include commonly used dependencies
      include: ['react', 'react-dom', 'react-dom/client'],

      // Exclude problematic dependencies
      exclude: [
        'tiny-secp256k1', // WASM module
      ],
    },

    // Environment variables
    define: {
      __DEV__: isDevelopment,
      __PROD__: isProduction,
      __VERSION__: JSON.stringify(manifest.version),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },

    // Enhanced logging
    logLevel: isDevelopment ? 'info' : 'warn',

    // Clear screen on rebuild in development
    clearScreen: false,
  };

  return config;
});

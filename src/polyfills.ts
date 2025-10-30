/**
 * Browser Polyfills for Node.js APIs
 * 
 * This file provides polyfills for Node.js-specific APIs that are used by
 * blockchain libraries (like ethers.js, @solana/web3.js, etc.) but are not
 * available in the browser environment.
 */

import { Buffer } from 'buffer';

// Make Buffer available globally
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}

// Make process available globally with minimal implementation
if (typeof globalThis.process === 'undefined') {
  (globalThis as any).process = {
    env: {},
    version: '',
    versions: {},
    browser: true,
  };
}

// Ensure process.env exists
if (!globalThis.process.env) {
  globalThis.process.env = {};
}

// Set NODE_ENV if not set
if (!globalThis.process.env.NODE_ENV) {
  globalThis.process.env.NODE_ENV = 'production';
}

// Export for direct imports if needed
export { Buffer };

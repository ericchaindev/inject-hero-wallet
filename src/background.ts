// Minimal Background Service Worker for Testing

console.log(
  '🚀 Minimal Hero Wallet background script loaded at:',
  new Date().toISOString()
);

// Simple message listener
chrome.runtime.onMessage.addListener(
  (message: any, sender: any, sendResponse: any) => {
    console.log('📨 Minimal background received message:', message);

    if (message?.kind === 'PAGE_REQUEST') {
      console.log('📋 Processing PAGE_REQUEST:', message.request?.method);

      // Simple ping response
      if (message.request?.method === 'herowallet_ping') {
        console.log('🏓 Responding to ping');
        sendResponse({
          target: 'herowallet:cs->inpage',
          ok: true,
          id: message.request.id,
          result: { pong: true, timestamp: Date.now() },
        });
        return true;
      }

      // Simple eth_accounts response
      if (message.request?.method === 'eth_accounts') {
        console.log('📋 Responding to eth_accounts');
        sendResponse({
          target: 'herowallet:cs->inpage',
          ok: true,
          id: message.request.id,
          result: [],
        });
        return true;
      }

      // Simple eth_chainId response
      if (message.request?.method === 'eth_chainId') {
        console.log('🔗 Responding to eth_chainId');
        sendResponse({
          target: 'herowallet:cs->inpage',
          ok: true,
          id: message.request.id,
          result: '0x1',
        });
        return true;
      }

      // Default response
      sendResponse({
        target: 'herowallet:cs->inpage',
        ok: false,
        id: message.request?.id,
        error: {
          code: -32601,
          message: `Method not implemented: ${message.request?.method}`,
        },
      });
    } else {
      sendResponse({
        target: 'herowallet:cs->inpage',
        ok: false,
        error: { code: -32600, message: 'Invalid request format' },
      });
    }

    return true;
  }
);

chrome.runtime.onStartup.addListener(() => {
  console.log('Hero Wallet minimal service worker started');
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log(
    'Hero Wallet minimal extension installed/updated:',
    details.reason
  );
});

// Keep alive mechanism
setInterval(() => {
  console.log(
    '🔄 Minimal service worker keepalive ping:',
    new Date().toISOString()
  );
  chrome.storage.local.get(['keepalive'], () => {
    if (chrome.runtime.lastError) {
      console.log(
        '🔄 Keepalive completed with error:',
        chrome.runtime.lastError.message
      );
    } else {
      console.log('🔄 Keepalive completed successfully');
    }
  });
}, 25000);

console.log('✅ Minimal Hero Wallet background script ready');

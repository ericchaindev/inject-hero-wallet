export {};

// Polyfill for ethers.js in service worker context
// ethers.js expects window object but it doesn't exist in service workers
if (typeof window === 'undefined') {
  (globalThis as any).window = globalThis;
  (globalThis as any).document = {};
}

// DO NOT import from 'ethers' at top level - causes "window is not defined" in service worker
// import type { TransactionRequest } from 'ethers';
import {
  handleApprovedConnection,
  handleApprovedSignMessage,
  handleApprovedSignTypedData,
  handleApprovedTransaction,
} from './utils/approvalHandler';
import {
  getRememberedPin,
  isUnlocked,
  loadState,
  saveState,
  type StoredAccount,
  unlockWithPin,
} from './utils/keystore';

// Enhanced Background Service Worker for Production

console.log(
  '🚀 Hero Wallet background script loaded at:',
  new Date().toISOString()
);

type PageRequest = {
  kind: 'PAGE_REQUEST';
  request?: {
    id?: string | number;
    method?: string;
    params?: unknown;
  };
  origin?: string;
};

type ApprovalResponse = {
  kind: 'APPROVAL_RESPONSE';
  requestId: string | number;
  approved: boolean;
  result?: unknown;
  error?: { code: number; message: string };
};

type UnlockNotification = {
  kind: 'WALLET_UNLOCKED';
};

type BackgroundMessage = PageRequest | ApprovalResponse | UnlockNotification;

type BackgroundResponse = {
  target: 'herowallet:cs->inpage';
  ok: boolean;
  id?: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

interface PendingRequest {
  id: string | number;
  method: string;
  params: unknown;
  origin: string;
  resolve: (value: any) => void;
  reject: (error: { code: number; message: string }) => void;
}

const PORT_NAME = 'herowallet:page-bridge';
const pendingRequests = new Map<string | number, PendingRequest>();
const pendingUnlockRequests = new Map<
  string | number,
  { origin: string; method: string; params: unknown }
>();

// Auto-unlock wallet on service worker start if PIN is remembered
async function attemptAutoUnlock(): Promise<void> {
  try {
    if (isUnlocked()) {
      console.log('✅ Wallet already unlocked');
      return;
    }

    const rememberedPin = await getRememberedPin();
    if (rememberedPin) {
      console.log('🔑 Found remembered PIN, auto-unlocking wallet...');
      await unlockWithPin(rememberedPin, 30 * 60 * 1000); // 30 minutes
      console.log('✅ Wallet auto-unlocked successfully');
    } else {
      console.log('ℹ️  No remembered PIN found, wallet remains locked');
    }
  } catch (error) {
    console.error('❌ Auto-unlock failed:', error);
    // Don't throw - just log the error and let wallet stay locked
  }
}

// Network configurations
const NETWORKS: Record<string, { chainId: string; rpc: string; name: string }> =
  {
    '0x1': {
      chainId: '0x1',
      rpc: 'https://eth.llamarpc.com',
      name: 'Ethereum Mainnet',
    },
    '0x89': {
      chainId: '0x89',
      rpc: 'https://polygon-rpc.com',
      name: 'Polygon',
    },
    '0x38': {
      chainId: '0x38',
      rpc: 'https://bsc-dataseed.binance.org',
      name: 'BSC',
    },
    '0xaa36a7': {
      chainId: '0xaa36a7',
      rpc: 'https://rpc.sepolia.org',
      name: 'Sepolia Testnet',
    },
    '0x5': {
      chainId: '0x5',
      rpc: 'https://rpc.goerli.eth.gateway.fm',
      name: 'Goerli Testnet',
    },
    '0xa': {
      chainId: '0xa',
      rpc: 'https://mainnet.optimism.io',
      name: 'Optimism',
    },
    '0xa4b1': {
      chainId: '0xa4b1',
      rpc: 'https://arb1.arbitrum.io/rpc',
      name: 'Arbitrum One',
    },
    '0x539': {
      chainId: '0x539',
      rpc: 'http://127.0.0.1:8545',
      name: 'Localhost 8545',
    },
    '0x7a69': {
      chainId: '0x7a69',
      rpc: 'http://127.0.0.1:8545',
      name: 'Localhost 31337',
    },
  };

let currentChainId = '0x1'; // Default to Ethereum Mainnet

function buildError(
  id: string | number | undefined,
  code: number,
  message: string
): BackgroundResponse {
  return {
    target: 'herowallet:cs->inpage',
    ok: false,
    id,
    error: { code, message },
  };
}

function buildResult(
  id: string | number | undefined,
  result: unknown
): BackgroundResponse {
  return {
    target: 'herowallet:cs->inpage',
    ok: true,
    id,
    result,
  };
}

async function getConnectedAccount(
  origin: string
): Promise<StoredAccount | null> {
  try {
    const state = await loadState();
    if (!state) return null;

    const permission = state.origins[origin];
    if (!permission?.allowed || !permission.selectedAccountId) {
      return null;
    }

    const account = state.accounts.find(
      (acc) => acc.id === permission.selectedAccountId && acc.chain === 'evm'
    );
    return account || null;
  } catch (error) {
    console.error('Failed to get connected account:', error);
    return null;
  }
}

async function openApprovalWindow(
  requestId: string | number,
  method: string,
  params: unknown,
  origin: string
): Promise<void> {
  const approvalUrl = chrome.runtime.getURL(
    `src/ui/approval.html?method=${encodeURIComponent(
      method
    )}&origin=${encodeURIComponent(origin)}&id=${encodeURIComponent(
      String(requestId)
    )}`
  );

  console.log('🪟 Opening approval window:', { requestId, method, origin });

  try {
    const window = await chrome.windows.create({
      url: approvalUrl,
      type: 'popup',
      width: 400,
      height: 600,
    });
    console.log('✅ Approval window created:', window?.id);
  } catch (error) {
    console.error('❌ Failed to create approval window:', error);
    throw error;
  }
}

async function handleEthRequestAccounts(
  origin: string,
  id: string | number
): Promise<string[]> {
  console.log('🔍 handleEthRequestAccounts called for origin:', origin);
  const state = await loadState();
  console.log('🔍 Wallet state loaded:', state ? 'exists' : 'null');

  if (!state) {
    // Wallet not created yet - open popup to create/restore wallet
    console.log('⚠️  Wallet not initialized. Opening popup window...');
    try {
      const popupWindow = await chrome.windows.create({
        url: chrome.runtime.getURL('src/popup/index.html'),
        type: 'popup',
        width: 400,
        height: 600,
      });
      console.log('✅ Popup window opened:', popupWindow?.id);
    } catch (error) {
      console.error('❌ Failed to open popup window:', error);
    }
    throw {
      code: 4100,
      message:
        'Please create or restore your wallet first. Click the Hero Wallet extension icon to get started.',
    };
  }

  // Check if wallet is locked
  const unlocked = isUnlocked();
  console.log('🔍 Wallet unlocked status:', unlocked);

  if (!unlocked) {
    // Store this request to be retried after unlock
    pendingUnlockRequests.set(id, {
      origin,
      method: 'eth_requestAccounts',
      params: {},
    });
    
    // Open popup to unlock
    console.log('⚠️  Wallet is locked. Opening popup window...');
    console.log('📌 Request stored for retry after unlock:', id);
    
    try {
      const popupWindow = await chrome.windows.create({
        url: chrome.runtime.getURL('src/popup/index.html'),
        type: 'popup',
        width: 400,
        height: 600,
      });
      console.log('✅ Popup window opened for unlock:', popupWindow?.id);
    } catch (error) {
      console.error('❌ Failed to open popup window:', error);
    }
    
    // Return a promise that will be resolved when wallet unlocks
    return new Promise<string[]>((resolve, reject) => {
      pendingRequests.set(id, {
        id,
        method: 'eth_requestAccounts',
        params: {},
        origin,
        resolve,
        reject,
      });
      
      // Timeout after 5 minutes
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          pendingUnlockRequests.delete(id);
          reject({
            code: 4100,
            message: 'Request timed out. Please try again.',
          });
        }
      }, 5 * 60 * 1000);
    });
  }

  // Check if already connected
  const permission = state.origins[origin];
  if (permission?.allowed && permission.selectedAccountId) {
    const account = state.accounts.find(
      (acc) => acc.id === permission.selectedAccountId && acc.chain === 'evm'
    );
    if (account) {
      return [account.address];
    }
  }

  // Open approval window and wait for user response
  await openApprovalWindow(id, 'eth_requestAccounts', {}, origin);

  // Create a promise that will be resolved when user approves/rejects
  return new Promise<string[]>((resolve, reject) => {
    pendingRequests.set(id, {
      id,
      method: 'eth_requestAccounts',
      params: {},
      origin,
      resolve,
      reject,
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject({ code: 4001, message: 'User rejected the request' });
      }
    }, 5 * 60 * 1000);
  });
}

async function handleEthAccounts(origin: string): Promise<string[]> {
  const account = await getConnectedAccount(origin);
  return account ? [account.address] : [];
}

async function handlePersonalSign(
  origin: string,
  params: unknown[],
  id: string | number
): Promise<string> {
  if (!isUnlocked()) {
    throw { code: 4100, message: 'Wallet is locked' };
  }

  const account = await getConnectedAccount(origin);
  if (!account) {
    throw { code: 4100, message: 'Not connected to this site' };
  }

  // personal_sign: params are [message, address] according to EIP-1193
  // Some old dApps might send [address, message]
  let message: string;
  let address: string;

  if (
    typeof params[0] === 'string' &&
    params[0].toLowerCase().startsWith('0x') &&
    params[0].length === 42
  ) {
    // First param looks like address: [address, message] order (old format)
    address = params[0] as string;
    message = params[1] as string;
  } else {
    // Standard order: [message, address]
    message = params[0] as string;
    address = params[1] as string;
  }

  if (!message) {
    throw { code: -32602, message: 'Invalid params: message required' };
  }

  // Verify address matches connected account
  if (address && address.toLowerCase() !== account.address.toLowerCase()) {
    throw { code: -32602, message: 'Address does not match connected account' };
  }

  console.log('📝 personal_sign received:', {
    messagePreview: message.substring(0, 100),
    messageLength: message.length,
    isHex: message.startsWith('0x'),
    accountAddress: account.address,
    origin,
  });

  // Open approval window
  await openApprovalWindow(
    id,
    'personal_sign',
    { message, account: account.address },
    origin
  );

  return new Promise<string>((resolve, reject) => {
    pendingRequests.set(id, {
      id,
      method: 'personal_sign',
      params: { message, account },
      origin,
      resolve,
      reject,
    });

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject({ code: 4001, message: 'User rejected the request' });
      }
    }, 5 * 60 * 1000);
  });
}

async function handleSignTypedData(
  origin: string,
  params: unknown[],
  id: string | number,
  method: string
): Promise<string> {
  if (!isUnlocked()) {
    throw { code: 4100, message: 'Wallet is locked' };
  }

  const account = await getConnectedAccount(origin);
  if (!account) {
    throw { code: 4100, message: 'Not connected to this site' };
  }

  // eth_signTypedData has different parameter orders in different versions
  // v1: [address, typedData]
  // v3/v4: [address, typedData] or [typedData, address]
  let typedData: string;
  let address: string;

  if (
    method === 'eth_signTypedData' ||
    method === 'eth_signTypedData_v3' ||
    method === 'eth_signTypedData_v4'
  ) {
    // Try both parameter orders
    if (typeof params[0] === 'string' && params[0].startsWith('0x')) {
      address = params[0] as string;
      typedData =
        typeof params[1] === 'string' ? params[1] : JSON.stringify(params[1]);
    } else {
      typedData =
        typeof params[0] === 'string' ? params[0] : JSON.stringify(params[0]);
      address = params[1] as string;
    }
  } else {
    throw { code: -32601, message: 'Method not found' };
  }

  // Verify address matches
  if (address.toLowerCase() !== account.address.toLowerCase()) {
    throw { code: -32602, message: 'Address does not match connected account' };
  }

  console.log('📝 Sign typed data request:', {
    method,
    address,
    typedDataPreview: typedData.substring(0, 100),
  });

  // Open approval window
  await openApprovalWindow(
    id,
    method,
    { typedData, account: account.address, method },
    origin
  );

  return new Promise<string>((resolve, reject) => {
    pendingRequests.set(id, {
      id,
      method,
      params: { typedData, account, method },
      origin,
      resolve,
      reject,
    });

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject({ code: 4001, message: 'User rejected the request' });
      }
    }, 5 * 60 * 1000);
  });
}

async function handleGetEncryptionPublicKey(
  origin: string,
  params: unknown[],
  id: string | number
): Promise<string> {
  if (!isUnlocked()) {
    throw { code: 4100, message: 'Wallet is locked' };
  }

  const account = await getConnectedAccount(origin);
  if (!account) {
    throw { code: 4100, message: 'Not connected to this site' };
  }

  const address = (params[0] as string) || account.address;

  // Verify address matches
  if (address.toLowerCase() !== account.address.toLowerCase()) {
    throw { code: -32602, message: 'Address does not match connected account' };
  }

  console.log('🔑 Get encryption public key request:', address);

  // Open approval window to confirm
  await openApprovalWindow(
    id,
    'eth_getEncryptionPublicKey',
    { account: account.address },
    origin
  );

  return new Promise<string>((resolve, reject) => {
    pendingRequests.set(id, {
      id,
      method: 'eth_getEncryptionPublicKey',
      params: { account },
      origin,
      resolve,
      reject,
    });

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject({ code: 4001, message: 'User rejected the request' });
      }
    }, 5 * 60 * 1000);
  });
}

async function handleDecrypt(
  origin: string,
  params: unknown[],
  id: string | number
): Promise<string> {
  if (!isUnlocked()) {
    throw { code: 4100, message: 'Wallet is locked' };
  }

  const account = await getConnectedAccount(origin);
  if (!account) {
    throw { code: 4100, message: 'Not connected to this site' };
  }

  const encryptedData = params[0] as string;
  const address = params[1] as string;

  // Verify address matches
  if (address && address.toLowerCase() !== account.address.toLowerCase()) {
    throw { code: -32602, message: 'Address does not match connected account' };
  }

  console.log('🔓 Decrypt request:', {
    address,
    encryptedDataPreview: encryptedData.substring(0, 50),
  });

  // Open approval window
  await openApprovalWindow(
    id,
    'eth_decrypt',
    { encryptedData, account: account.address },
    origin
  );

  return new Promise<string>((resolve, reject) => {
    pendingRequests.set(id, {
      id,
      method: 'eth_decrypt',
      params: { encryptedData, account },
      origin,
      resolve,
      reject,
    });

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject({ code: 4001, message: 'User rejected the request' });
      }
    }, 5 * 60 * 1000);
  });
}

async function handleWatchAsset(
  origin: string,
  params: unknown[],
  id: string | number
): Promise<boolean> {
  const options = (params[0] as any)?.options || params[0];

  if (!options || !options.address) {
    throw { code: -32602, message: 'Invalid params: token address required' };
  }

  console.log('👁️ Watch asset request:', options);

  // Open approval window to add token
  await openApprovalWindow(
    id,
    'wallet_watchAsset',
    {
      type: (params[0] as any)?.type || 'ERC20',
      options: {
        address: options.address,
        symbol: options.symbol || 'TOKEN',
        decimals: options.decimals || 18,
        image: options.image || '',
      },
    },
    origin
  );

  return new Promise<boolean>((resolve, reject) => {
    pendingRequests.set(id, {
      id,
      method: 'wallet_watchAsset',
      params: { options },
      origin,
      resolve,
      reject,
    });

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject({ code: 4001, message: 'User rejected the request' });
      }
    }, 5 * 60 * 1000);
  });
}

async function handleSendTransaction(
  origin: string,
  params: unknown[],
  id: string | number
): Promise<string> {
  if (!isUnlocked()) {
    throw { code: 4100, message: 'Wallet is locked' };
  }

  const account = await getConnectedAccount(origin);
  if (!account) {
    throw { code: 4100, message: 'Not connected to this site' };
  }

  const txParams = params[0] as any; // Avoid importing TransactionRequest from ethers
  if (!txParams) {
    throw { code: -32602, message: 'Invalid params: transaction required' };
  }

  // Debug: Log transaction data field
  if (txParams.data) {
    console.log('📦 Transaction data:', txParams.data);
    console.log('📦 Data type:', typeof txParams.data);
    console.log('📦 Data length:', txParams.data.length);
  }

  // Open approval window
  await openApprovalWindow(
    id,
    'eth_sendTransaction',
    { transaction: txParams, account: account.address },
    origin
  );

  return new Promise<string>((resolve, reject) => {
    pendingRequests.set(id, {
      id,
      method: 'eth_sendTransaction',
      params: { transaction: txParams, account },
      origin,
      resolve,
      reject,
    });

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject({ code: 4001, message: 'User rejected the request' });
      }
    }, 5 * 60 * 1000);
  });
}

// Handle approval responses from approval.html
chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, sender, sendResponse) => {
    // Handle wallet unlock notification
    if (message.kind === 'WALLET_UNLOCKED') {
      console.log('🔓 Wallet unlocked! Processing pending requests...');
      
      // Process all pending unlock requests
      const unlockRequests = Array.from(pendingUnlockRequests.entries());
      console.log(`📋 Found ${unlockRequests.length} pending unlock requests`);
      
      for (const [requestId, { origin, method, params }] of unlockRequests) {
        console.log(`🔄 Retrying request ${requestId}: ${method}`);
        
        // Process the request now that wallet is unlocked
        (async () => {
          try {
            let result: any;
            
            if (method === 'eth_requestAccounts') {
              // Retry eth_requestAccounts
              result = await handleEthRequestAccounts(origin, requestId);
            }
            // Add other methods if needed
            
            const pending = pendingRequests.get(requestId);
            if (pending) {
              pending.resolve(result);
              pendingRequests.delete(requestId);
            }
          } catch (error: any) {
            console.error(`❌ Failed to retry request ${requestId}:`, error);
            const pending = pendingRequests.get(requestId);
            if (pending) {
              pending.reject(error);
              pendingRequests.delete(requestId);
            }
          } finally {
            pendingUnlockRequests.delete(requestId);
          }
        })();
      }
      
      sendResponse({ ok: true });
      return true;
    }
    
    if (message.kind === 'APPROVAL_RESPONSE') {
      const { requestId, approved, result, error } = message;
      console.log('📨 Received APPROVAL_RESPONSE:', {
        requestId,
        approved,
        hasResult: !!result,
        hasError: !!error,
      });

      // Try to find pending request with both string and number versions of requestId
      let pending = pendingRequests.get(requestId);

      // If not found and requestId is a string that looks like a number, try as number
      if (
        !pending &&
        typeof requestId === 'string' &&
        !isNaN(Number(requestId))
      ) {
        pending = pendingRequests.get(Number(requestId));
      }

      // If not found and requestId is a number, try as string
      if (!pending && typeof requestId === 'number') {
        pending = pendingRequests.get(String(requestId));
      }

      if (!pending) {
        console.error('❌ No pending request found for ID:', requestId);
        sendResponse({ ok: false, error: 'Request not found' });
        return true;
      }

      console.log('✅ Found pending request:', pending.method);

      if (pending) {
        // Delete using the actual key stored in the map
        pendingRequests.delete(pending.id);

        if (approved) {
          // Process approved request asynchronously
          (async () => {
            try {
              let finalResult: any = result;

              // Handle different request types
              if (pending.method === 'eth_requestAccounts') {
                finalResult = await handleApprovedConnection(
                  pending.origin,
                  requestId
                );
              } else if (pending.method === 'solana_connect') {
                // Handle Solana connection approval
                const { account } = pending.params as any;
                const state = await loadState();
                if (state) {
                  state.origins[pending.origin] = {
                    allowed: true,
                    selectedAccountId: account.id,
                    chainOverride: 'sol',
                    connectedAt: Date.now(),
                    lastUsed: Date.now(),
                  };
                  await saveState(state);
                }
                finalResult = account.address; // Return publicKey
              } else if (
                pending.method === 'personal_sign' ||
                pending.method === 'eth_sign'
              ) {
                const { message: msg, account } = pending.params as any;
                finalResult = await handleApprovedSignMessage(
                  pending.origin,
                  msg,
                  account.id
                );
              } else if (
                pending.method === 'eth_signTypedData_v3' ||
                pending.method === 'eth_signTypedData_v4'
              ) {
                const { typedData, account, method } = pending.params as any;
                finalResult = await handleApprovedSignTypedData(
                  pending.origin,
                  typedData,
                  account.id,
                  method
                );
              } else if (pending.method === 'eth_sendTransaction') {
                const { transaction, account } = pending.params as any;
                finalResult = await handleApprovedTransaction(
                  pending.origin,
                  transaction,
                  account.id,
                  currentChainId // Pass current chain ID
                );
              } else if (pending.method === 'solana_signAndSendTransaction') {
                // Handle Solana transaction approval
                const { transaction, account } = pending.params as any;
                // TODO: Implement actual Solana transaction signing
                finalResult = { signature: 'solana_signature_placeholder' };
              } else if (pending.method === 'solana_signMessage') {
                // Handle Solana message signing
                const { message, account } = pending.params as any;
                // TODO: Implement actual Solana message signing
                finalResult = { signature: new Uint8Array(64) };
              }

              pending.resolve(finalResult);
            } catch (err: any) {
              console.error('Error processing approved request:', err);
              pending.reject({
                code: -32603,
                message: err.message || 'Internal error',
              });
            }
          })();
        } else {
          pending.reject(
            error || { code: 4001, message: 'User rejected the request' }
          );
        }
      }

      sendResponse({ ok: true });
      return true;
    }

    // Handle other message types
    return false;
  }
);

// ==================== SOLANA HANDLERS ====================

async function handleSolanaConnect(
  origin: string,
  params: unknown[],
  id: string | number
): Promise<{ publicKey: string }> {
  console.log('🟣 Solana connect requested from:', origin);

  const state = await loadState();
  if (!state) {
    throw { code: 4100, message: 'Wallet not initialized' };
  }

  if (!isUnlocked()) {
    throw { code: 4100, message: 'Wallet is locked' };
  }

  // Find Solana account
  const solAccount = state.accounts.find((acc) => acc.chain === 'sol');
  if (!solAccount) {
    throw { code: 4100, message: 'No Solana account found' };
  }

  // Check if already connected
  const perm = state.origins[origin];
  if (perm?.allowed && perm?.selectedAccountId === solAccount.id) {
    console.log('🟣 Already connected to', origin);
    return { publicKey: solAccount.address };
  }

  // Open approval window for connection
  await openApprovalWindow(
    id,
    'solana_connect',
    { account: solAccount },
    origin
  );

  return new Promise<{ publicKey: string }>((resolve, reject) => {
    pendingRequests.set(id, {
      id,
      method: 'solana_connect',
      params: { account: solAccount },
      origin,
      resolve: (result) => resolve({ publicKey: result }),
      reject,
    });

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject({ code: 4001, message: 'User rejected the request' });
      }
    }, 5 * 60 * 1000);
  });
}

async function handleSolanaDisconnect(origin: string): Promise<void> {
  console.log('🟣 Solana disconnect requested from:', origin);

  const state = await loadState();
  if (!state) return;

  // Remove permissions
  if (state.origins[origin]) {
    delete state.origins[origin];
    await saveState(state);
  }
}

async function handleSolanaSignAndSendTransaction(
  origin: string,
  params: unknown[],
  id: string | number
): Promise<{ signature: string }> {
  console.log('🟣 Solana signAndSendTransaction requested');

  if (!isUnlocked()) {
    throw { code: 4100, message: 'Wallet is locked' };
  }

  const state = await loadState();
  if (!state) {
    throw { code: 4100, message: 'Wallet not initialized' };
  }

  // Get connected Solana account
  const perm = state.origins[origin];
  if (!perm?.allowed) {
    throw { code: 4100, message: 'Not connected to this site' };
  }

  const account = state.accounts.find(
    (acc) => acc.id === perm.selectedAccountId
  );
  if (!account || account.chain !== 'sol') {
    throw { code: 4100, message: 'No Solana account connected' };
  }

  const transactionData = params[0];

  // Open approval window
  await openApprovalWindow(
    id,
    'solana_signAndSendTransaction',
    { transaction: transactionData, account },
    origin
  );

  return new Promise<{ signature: string }>((resolve, reject) => {
    pendingRequests.set(id, {
      id,
      method: 'solana_signAndSendTransaction',
      params: { transaction: transactionData, account },
      origin,
      resolve,
      reject,
    });

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject({ code: 4001, message: 'User rejected the request' });
      }
    }, 5 * 60 * 1000);
  });
}

async function handleSolanaSignMessage(
  origin: string,
  params: unknown[],
  id: string | number
): Promise<{ signature: Uint8Array }> {
  console.log('🟣 Solana signMessage requested');

  if (!isUnlocked()) {
    throw { code: 4100, message: 'Wallet is locked' };
  }

  const state = await loadState();
  if (!state) {
    throw { code: 4100, message: 'Wallet not initialized' };
  }

  const perm = state.origins[origin];
  if (!perm?.allowed) {
    throw { code: 4100, message: 'Not connected to this site' };
  }

  const account = state.accounts.find(
    (acc) => acc.id === perm.selectedAccountId
  );
  if (!account || account.chain !== 'sol') {
    throw { code: 4100, message: 'No Solana account connected' };
  }

  const messageData = params[0];

  // Open approval window
  await openApprovalWindow(
    id,
    'solana_signMessage',
    { message: messageData, account },
    origin
  );

  return new Promise<{ signature: Uint8Array }>((resolve, reject) => {
    pendingRequests.set(id, {
      id,
      method: 'solana_signMessage',
      params: { message: messageData, account },
      origin,
      resolve,
      reject,
    });

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject({ code: 4001, message: 'User rejected the request' });
      }
    }, 5 * 60 * 1000);
  });
}

// ==================== END SOLANA HANDLERS ====================

async function processPageRequest(
  message: PageRequest | undefined,
  respond: (res: BackgroundResponse) => void
): Promise<void> {
  if (!message || message.kind !== 'PAGE_REQUEST') {
    respond(buildError(undefined, -32600, 'Invalid request format'));
    return;
  }

  const method = message.request?.method;
  const id = message.request?.id;
  const params = message.request?.params as unknown[];
  const origin = message.origin || 'unknown';

  console.log(
    '📋 Processing PAGE_REQUEST via background:',
    method,
    'from',
    origin
  );

  try {
    switch (method) {
      case 'herowallet_ping': {
        console.log('🏓 Responding to ping');
        respond(
          buildResult(id, {
            pong: true,
            timestamp: Date.now(),
          })
        );
        return;
      }

      case 'eth_requestAccounts': {
        const accounts = await handleEthRequestAccounts(origin, id!);
        respond(buildResult(id, accounts));
        return;
      }

      case 'eth_accounts': {
        const accounts = await handleEthAccounts(origin);
        respond(buildResult(id, accounts));
        return;
      }

      case 'eth_chainId': {
        respond(buildResult(id, currentChainId));
        return;
      }

      case 'personal_sign': {
        const signature = await handlePersonalSign(origin, params || [], id!);
        respond(buildResult(id, signature));
        return;
      }

      case 'eth_sendTransaction': {
        const txHash = await handleSendTransaction(origin, params || [], id!);
        respond(buildResult(id, txHash));
        return;
      }

      case 'eth_sign': {
        // Similar to personal_sign but with different parameter order
        const signature = await handlePersonalSign(
          origin,
          [params?.[1], params?.[0]],
          id!
        );
        respond(buildResult(id, signature));
        return;
      }

      case 'eth_signTypedData':
      case 'eth_signTypedData_v3':
      case 'eth_signTypedData_v4': {
        // Handle typed data signing (EIP-712)
        console.log(`📡 ${method} called from:`, origin);
        try {
          const signature = await handleSignTypedData(
            origin,
            params,
            id!,
            method
          );
          console.log('✅ Signature created:', signature);
          console.log('📦 Signature length:', signature.length);
          respond(buildResult(id, signature));
        } catch (error: any) {
          console.error(`❌ ${method} error:`, error);
          if (error && typeof error === 'object' && 'code' in error) {
            respond(buildError(id, error.code, error.message));
          } else {
            respond(
              buildError(
                id,
                -32603,
                `Failed to sign typed data: ${error?.message || String(error)}`
              )
            );
          }
        }
        return;
      }

      case 'eth_getEncryptionPublicKey': {
        // Get encryption public key for eth_decrypt
        console.log('📡 eth_getEncryptionPublicKey called from:', origin);
        try {
          const publicKey = await handleGetEncryptionPublicKey(
            origin,
            params,
            id!
          );
          respond(buildResult(id, publicKey));
        } catch (error: any) {
          console.error('❌ eth_getEncryptionPublicKey error:', error);
          if (error && typeof error === 'object' && 'code' in error) {
            respond(buildError(id, error.code, error.message));
          } else {
            respond(
              buildError(
                id,
                -32603,
                `Failed to get encryption key: ${
                  error?.message || String(error)
                }`
              )
            );
          }
        }
        return;
      }

      case 'eth_decrypt': {
        // Decrypt encrypted message
        console.log('📡 eth_decrypt called from:', origin);
        try {
          const decrypted = await handleDecrypt(origin, params, id!);
          respond(buildResult(id, decrypted));
        } catch (error: any) {
          console.error('❌ eth_decrypt error:', error);
          if (error && typeof error === 'object' && 'code' in error) {
            respond(buildError(id, error.code, error.message));
          } else {
            respond(
              buildError(
                id,
                -32603,
                `Failed to decrypt: ${error?.message || String(error)}`
              )
            );
          }
        }
        return;
      }

      case 'wallet_watchAsset': {
        // Add token to wallet (EIP-747)
        console.log('📡 wallet_watchAsset called from:', origin);
        console.log('📦 Token params:', params);
        try {
          const success = await handleWatchAsset(origin, params, id!);
          respond(buildResult(id, success));
        } catch (error: any) {
          console.error('❌ wallet_watchAsset error:', error);
          if (error && typeof error === 'object' && 'code' in error) {
            respond(buildError(id, error.code, error.message));
          } else {
            respond(
              buildError(
                id,
                -32603,
                `Failed to watch asset: ${error?.message || String(error)}`
              )
            );
          }
        }
        return;
      }

      case 'wallet_switchEthereumChain': {
        const chainId = (params?.[0] as any)?.chainId;
        console.log('🔄 wallet_switchEthereumChain called:', {
          chainId,
          currentChainId,
        });
        console.log('📋 Available networks:', Object.keys(NETWORKS));

        if (NETWORKS[chainId]) {
          currentChainId = chainId;
          console.log(
            `✅ Switched to network: ${NETWORKS[chainId].name} (${chainId})`
          );
          respond(buildResult(id, null));
        } else {
          console.error(`❌ Unrecognized chain ID: ${chainId}`);
          respond(
            buildError(
              id,
              4902,
              `Unrecognized chain ID: ${chainId}. Available: ${Object.keys(
                NETWORKS
              ).join(', ')}`
            )
          );
        }
        return;
      }

      case 'wallet_addEthereumChain': {
        // Accept and log the network being added
        const chainParams = params?.[0] as any;
        console.log('➕ wallet_addEthereumChain called:', chainParams);

        if (chainParams?.chainId && chainParams?.rpcUrls?.[0]) {
          // Add to NETWORKS temporarily (will be lost on reload, but works for session)
          NETWORKS[chainParams.chainId] = {
            chainId: chainParams.chainId,
            rpc: chainParams.rpcUrls[0],
            name: chainParams.chainName || `Chain ${chainParams.chainId}`,
          };
          console.log(
            `✅ Added network: ${chainParams.chainName || chainParams.chainId}`
          );
        }

        respond(buildResult(id, null));
        return;
      }

      case 'wallet_requestPermissions': {
        // Request permissions - for now, delegate to eth_requestAccounts
        console.log('📡 wallet_requestPermissions called from:', origin);
        console.log('📦 Request params:', params);

        try {
          const accounts = await handleEthRequestAccounts(origin, id!);
          console.log('✅ Accounts obtained:', accounts);

          const response = [
            {
              id: `${Date.now()}`,
              parentCapability: 'eth_accounts',
              invoker: origin,
              caveats: [
                {
                  type: 'restrictReturnedAccounts',
                  value: accounts,
                },
              ],
              date: Date.now(),
            },
          ];

          console.log('✅ wallet_requestPermissions response:', response);
          respond(buildResult(id, response));
        } catch (error: any) {
          console.error('❌ wallet_requestPermissions error:', error);
          // If it's a wallet error with code and message, use those
          if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            'message' in error
          ) {
            respond(buildError(id, error.code, error.message));
          } else {
            respond(
              buildError(
                id,
                -32603,
                `Failed to request permissions: ${
                  error?.message || String(error)
                }`
              )
            );
          }
        }
        return;
      }

      case 'wallet_getPermissions': {
        // Get current permissions
        console.log('📡 wallet_getPermissions called from:', origin);

        try {
          const state = await loadState();
          const hasPermission = state?.origins?.[origin];

          console.log('🔍 Has permission:', hasPermission);

          if (hasPermission) {
            const account = await getConnectedAccount(origin);
            console.log('🔍 Connected account:', account);

            const response = [
              {
                id: `${Date.now()}`,
                parentCapability: 'eth_accounts',
                invoker: origin,
                caveats: [
                  {
                    type: 'restrictReturnedAccounts',
                    value: account ? [account.address] : [],
                  },
                ],
                date: Date.now(),
              },
            ];

            console.log('✅ wallet_getPermissions response:', response);
            respond(buildResult(id, response));
          } else {
            console.log('⚠️ No permissions found for origin');
            respond(buildResult(id, []));
          }
        } catch (error: any) {
          console.error('❌ wallet_getPermissions error:', error);
          respond(
            buildError(
              id,
              -32603,
              `Failed to get permissions: ${error?.message || String(error)}`
            )
          );
        }
        return;
      }

      case 'wallet_revokePermissions': {
        // Revoke permissions
        console.log('📡 wallet_revokePermissions called from:', origin);
        console.log('📦 Request params:', params);

        try {
          const permissionsToRevoke = (params?.[0] as any)?.eth_accounts;

          if (permissionsToRevoke !== undefined) {
            const state = await loadState();
            if (state?.origins?.[origin]) {
              delete state.origins[origin];
              await saveState(state);
              console.log(`✅ Revoked permissions for ${origin}`);
            } else {
              console.log(`⚠️ No permissions found for ${origin}`);
            }
          } else {
            console.log('⚠️ No eth_accounts in revoke request');
          }

          respond(buildResult(id, null));
        } catch (error: any) {
          console.error('❌ wallet_revokePermissions error:', error);
          respond(
            buildError(
              id,
              -32603,
              `Failed to revoke permissions: ${error?.message || String(error)}`
            )
          );
        }
        return;
      }

      case 'net_version': {
        respond(buildResult(id, parseInt(currentChainId, 16).toString()));
        return;
      }

      case 'eth_getBalance':
      case 'eth_call':
      case 'eth_estimateGas':
      case 'eth_getTransactionByHash':
      case 'eth_getTransactionReceipt':
      case 'eth_getTransactionCount':
      case 'eth_blockNumber':
      case 'eth_getBlockByNumber':
      case 'eth_getBlockByHash':
      case 'eth_getCode':
      case 'eth_getLogs':
      case 'eth_gasPrice':
      case 'eth_maxPriorityFeePerGas':
      case 'eth_feeHistory':
      case 'eth_getFilterLogs':
      case 'eth_getFilterChanges':
      case 'eth_newFilter':
      case 'eth_newBlockFilter':
      case 'eth_newPendingTransactionFilter':
      case 'eth_uninstallFilter':
      case 'web3_clientVersion':
      case 'net_listening':
      case 'net_peerCount': {
        // Forward read-only requests to RPC
        const network = NETWORKS[currentChainId];
        if (!network) {
          respond(buildError(id, -32603, 'Network not configured'));
          return;
        }

        try {
          const response = await fetch(network.rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method,
              params: params || [],
            }),
          });

          const data = await response.json();
          if (data.error) {
            respond(buildError(id, data.error.code, data.error.message));
          } else {
            respond(buildResult(id, data.result));
          }
        } catch (error: any) {
          respond(
            buildError(id, -32603, error.message || 'RPC request failed')
          );
        }
        return;
      }

      // ==================== SOLANA METHODS ====================

      case 'connect': {
        // Solana connect method
        console.log('🟣 Processing Solana connect');
        const result = await handleSolanaConnect(origin, params || [], id!);
        respond(buildResult(id, result));
        return;
      }

      case 'disconnect': {
        // Solana disconnect method
        console.log('🟣 Processing Solana disconnect');
        await handleSolanaDisconnect(origin);
        respond(buildResult(id, {}));
        return;
      }

      case 'signAndSendTransaction': {
        // Solana signAndSendTransaction
        console.log('🟣 Processing Solana signAndSendTransaction');
        const result = await handleSolanaSignAndSendTransaction(
          origin,
          params || [],
          id!
        );
        respond(buildResult(id, result));
        return;
      }

      case 'signTransaction': {
        // Solana signTransaction (just sign, don't send)
        console.log('🟣 Processing Solana signTransaction');
        // TODO: Implement signTransaction handler
        respond(buildError(id, -32601, 'signTransaction not yet implemented'));
        return;
      }

      case 'signAllTransactions': {
        // Solana signAllTransactions
        console.log('🟣 Processing Solana signAllTransactions');
        // TODO: Implement signAllTransactions handler
        respond(
          buildError(id, -32601, 'signAllTransactions not yet implemented')
        );
        return;
      }

      case 'signMessage': {
        // Solana signMessage
        console.log('🟣 Processing Solana signMessage');
        const result = await handleSolanaSignMessage(origin, params || [], id!);
        respond(buildResult(id, result));
        return;
      }

      // ==================== END SOLANA METHODS ====================

      default: {
        const messageText = method
          ? `Method not implemented: ${method}`
          : 'Missing method';
        respond(buildError(id, -32601, messageText));
        return;
      }
    }
  } catch (error: any) {
    console.error('Error processing request:', error);
    respond(
      buildError(id, error.code || -32603, error.message || 'Internal error')
    );
  }
}

// Handle long-lived port connections from the content script
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAME) {
    console.warn('Hero Wallet: unknown port connection rejected:', port.name);
    port.disconnect();
    return;
  }

  console.log('🔗 Hero Wallet: Port connected');

  port.onMessage.addListener((message: PageRequest) => {
    processPageRequest(message, (response) => {
      try {
        port.postMessage(response);
      } catch (error) {
        console.error('Hero Wallet: Failed to post port response:', error);
      }
    }).catch((error) => {
      console.error('Hero Wallet: Error handling port message:', error);
      port.postMessage(
        buildError(message?.request?.id, -32603, 'Internal error')
      );
    });
  });

  port.onDisconnect.addListener(() => {
    console.warn('🔌 Hero Wallet: Port disconnected');
  });
});

// Simple message listener for one-off requests
chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, _sender, sendResponse) => {
    if (message.kind === 'APPROVAL_RESPONSE') {
      // Already handled above
      return false;
    }

    processPageRequest(message as PageRequest, sendResponse).catch((error) => {
      console.error('Hero Wallet: Error handling message:', error);
      sendResponse(
        buildError(
          (message as PageRequest)?.request?.id,
          -32603,
          'Internal error'
        )
      );
    });

    // Keep the service worker alive until sendResponse runs
    return true;
  }
);

chrome.runtime.onStartup.addListener(() => {
  console.log('Hero Wallet service worker started');
  attemptAutoUnlock();
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Hero Wallet extension installed/updated:', details.reason);
  attemptAutoUnlock();
});

// Keep alive mechanism
setInterval(() => {
  console.log('🔄 Service worker keepalive ping:', new Date().toISOString());
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

console.log('✅ Hero Wallet background script ready');

// Attempt auto-unlock on script load
attemptAutoUnlock().catch((err) => {
  console.error('Failed to auto-unlock on startup:', err);
});

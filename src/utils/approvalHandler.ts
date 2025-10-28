/**
 * Approval Handler - Processes user-approved requests
 */

import { EvmAdapter } from '../adapters/evm';
import {
  decryptAccount,
  loadState,
  saveState,
  type WalletState,
} from './keystore';
import { NetworkManager } from './networks';

export async function handleApprovedConnection(
  origin: string,
  requestId: string | number
): Promise<string[]> {
  const state = await loadState();
  if (!state) {
    throw new Error('Wallet not initialized');
  }

  // Find the first EVM account
  const evmAccount = state.accounts.find((acc) => acc.chain === 'evm');
  if (!evmAccount) {
    throw new Error('No EVM account found');
  }

  // Update permissions
  const updatedState: WalletState = {
    ...state,
    origins: {
      ...state.origins,
      [origin]: {
        allowed: true,
        selectedAccountId: evmAccount.id,
        connectedAt: Date.now(),
        lastUsed: Date.now(),
      },
    },
  };

  await saveState(updatedState);

  return [evmAccount.address];
}

export async function handleApprovedSignMessage(
  origin: string,
  message: string,
  accountId: string
): Promise<string> {
  const state = await loadState();
  if (!state) {
    throw new Error('Wallet not initialized');
  }

  const account = state.accounts.find(
    (acc) => acc.id === accountId && acc.chain === 'evm'
  );
  if (!account) {
    throw new Error('Account not found');
  }

  // Decrypt account
  const decrypted = await decryptAccount<{ privateKeyHex: string }>(account);

  console.log('📝 Signing message:', {
    messagePreview: message.substring(0, 100),
    messageLength: message.length,
    isHex: message.startsWith('0x'),
    accountAddress: account.address,
  });

  // Sign message using EVM adapter
  const signature = await EvmAdapter.signMessage(
    {
      privateKeyHex: decrypted.privateKeyHex,
      chainRpc: 'https://eth.llamarpc.com', // We don't need RPC for signing
    },
    {
      message,
      messageType: 'personal',
    }
  );

  console.log('✅ Message signed:', {
    signaturePreview: signature.substring(0, 20) + '...',
    signatureLength: signature.length,
  });

  return signature;
}

export async function handleApprovedSignTypedData(
  origin: string,
  typedData: string,
  accountId: string,
  method: string
): Promise<string> {
  const state = await loadState();
  if (!state) {
    throw new Error('Wallet not initialized');
  }

  const account = state.accounts.find(
    (acc) => acc.id === accountId && acc.chain === 'evm'
  );
  if (!account) {
    throw new Error('Account not found');
  }

  // Decrypt account
  const decrypted = await decryptAccount<{ privateKeyHex: string }>(account);

  // Parse typed data
  const parsedTypedData = JSON.parse(typedData);

  // ethers.js doesn't want EIP712Domain in types - it's only in domain
  // Remove it to avoid "ambiguous primary types" error
  if (parsedTypedData.types && parsedTypedData.types.EIP712Domain) {
    const { EIP712Domain, ...otherTypes } = parsedTypedData.types;
    parsedTypedData.types = otherTypes;
  }

  // Sign typed data using EVM adapter
  const signature = await EvmAdapter.signMessage(
    {
      privateKeyHex: decrypted.privateKeyHex,
      chainRpc: 'https://eth.llamarpc.com', // We don't need RPC for signing
    },
    {
      message: '',
      messageType: 'typed',
      typedData: parsedTypedData,
    }
  );

  return signature;
}

export async function handleApprovedTransaction(
  origin: string,
  txParams: any,
  accountId: string,
  currentChainId?: string // Add optional current chain ID
): Promise<string> {
  const state = await loadState();
  if (!state) {
    throw new Error('Wallet not initialized');
  }

  const account = state.accounts.find(
    (acc) => acc.id === accountId && acc.chain === 'evm'
  );
  if (!account) {
    throw new Error('Account not found');
  }

  // Decrypt account
  const decrypted = await decryptAccount<{ privateKeyHex: string }>(account);

  // Determine chain ID from transaction params or current chain
  const chainId = txParams.chainId
    ? typeof txParams.chainId === 'string'
      ? parseInt(txParams.chainId, 16)
      : Number(txParams.chainId)
    : currentChainId
    ? parseInt(currentChainId, 16)
    : 1;

  console.log(
    '📡 Transaction chain ID:',
    chainId,
    'hex:',
    `0x${chainId.toString(16)}`
  );
  console.log(
    '📡 txParams.chainId:',
    txParams.chainId,
    'currentChainId:',
    currentChainId
  );

  // Get network config based on chain ID
  const network = NetworkManager.getEvmNetwork(chainId);

  if (!network) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  console.log('🌐 Using network:', network.displayName);
  console.log('🔗 RPC endpoints:', network.rpc);

  // Use first RPC endpoint (fastest, with fallback in adapter)
  const rpc = network.rpc[0];
  console.log('✅ Selected RPC:', rpc);

  // Send transaction using EVM adapter
  let result;
  try {
    console.log('🚀 Calling EvmAdapter.sendTransaction...');
    result = await EvmAdapter.sendTransaction(
      {
        privateKeyHex: decrypted.privateKeyHex,
        chainRpc: rpc,
        chainId: chainId,
      },
      txParams
    );
    console.log('✅ EvmAdapter.sendTransaction completed');
  } catch (error: any) {
    console.error('❌ EvmAdapter.sendTransaction failed:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }

  console.log('✅ Transaction sent:', result.hash);
  console.log(
    '🔍 Explorer:',
    NetworkManager.getExplorerTxUrl('evm', result.hash, network.name)
  );

  return result.hash;
}

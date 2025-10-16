import type { Chain } from './keystore';

// Enhanced network configuration with comprehensive metadata
export interface NetworkConfig {
  readonly chainIdHex: string;
  readonly chainId: number;
  readonly name: string;
  readonly displayName: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly rpc: readonly string[];
  readonly explorer: string;
  readonly icon?: string;
  readonly testnet?: boolean;
}

export interface NonEvmNetworkConfig {
  readonly name: string;
  readonly displayName: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly rpc: readonly string[];
  readonly explorer: string;
  readonly icon?: string;
  readonly testnet?: boolean;
}

// EVM Networks with multiple RPC endpoints and fallbacks
export const EVM_NETWORKS = {
  mainnet: {
    chainIdHex: '0x1',
    chainId: 1,
    name: 'ethereum',
    displayName: 'Ethereum Mainnet',
    symbol: 'ETH',
    decimals: 18,
    rpc: [
      'https://ethereum.publicnode.com',
      'https://rpc.ankr.com/eth',
      'https://eth.llamarpc.com',
      'https://ethereum.blockpi.network/v1/rpc/public',
    ],
    explorer: 'https://etherscan.io',
    icon: 'ethereum',
  },
  sepolia: {
    chainIdHex: '0xaa36a7',
    chainId: 11155111,
    name: 'sepolia',
    displayName: 'Ethereum Sepolia',
    symbol: 'ETH',
    decimals: 18,
    rpc: [
      'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      'https://rpc.sepolia.org',
      'https://ethereum-sepolia.blockpi.network/v1/rpc/public',
    ],
    explorer: 'https://sepolia.etherscan.io',
    icon: 'ethereum',
    testnet: true,
  },
  bsc: {
    chainIdHex: '0x38',
    chainId: 56,
    name: 'bsc',
    displayName: 'BNB Smart Chain',
    symbol: 'BNB',
    decimals: 18,
    rpc: [
      'https://bsc-dataseed.binance.org',
      'https://bsc.publicnode.com',
      'https://rpc.ankr.com/bsc',
      'https://bsc.blockpi.network/v1/rpc/public',
    ],
    explorer: 'https://bscscan.com',
    icon: 'bnb',
  },
  base: {
    chainIdHex: '0x2105',
    chainId: 8453,
    name: 'base',
    displayName: 'Base',
    symbol: 'ETH',
    decimals: 18,
    rpc: [
      'https://mainnet.base.org',
      'https://base.publicnode.com',
      'https://rpc.ankr.com/base',
      'https://base.blockpi.network/v1/rpc/public',
    ],
    explorer: 'https://basescan.org',
    icon: 'base',
  },
  polygon: {
    chainIdHex: '0x89',
    chainId: 137,
    name: 'polygon',
    displayName: 'Polygon',
    symbol: 'MATIC',
    decimals: 18,
    rpc: [
      'https://polygon-rpc.com',
      'https://polygon.publicnode.com',
      'https://rpc.ankr.com/polygon',
      'https://polygon.blockpi.network/v1/rpc/public',
    ],
    explorer: 'https://polygonscan.com',
    icon: 'polygon',
  },
  arbitrum: {
    chainIdHex: '0xa4b1',
    chainId: 42161,
    name: 'arbitrum',
    displayName: 'Arbitrum One',
    symbol: 'ETH',
    decimals: 18,
    rpc: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.publicnode.com',
      'https://rpc.ankr.com/arbitrum',
      'https://arbitrum.blockpi.network/v1/rpc/public',
    ],
    explorer: 'https://arbiscan.io',
    icon: 'arbitrum',
  },
  optimism: {
    chainIdHex: '0xa',
    chainId: 10,
    name: 'optimism',
    displayName: 'Optimism',
    symbol: 'ETH',
    decimals: 18,
    rpc: [
      'https://mainnet.optimism.io',
      'https://optimism.publicnode.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism.blockpi.network/v1/rpc/public',
    ],
    explorer: 'https://optimistic.etherscan.io',
    icon: 'optimism',
  },
  avalanche: {
    chainIdHex: '0xa86a',
    chainId: 43114,
    name: 'avalanche',
    displayName: 'Avalanche C-Chain',
    symbol: 'AVAX',
    decimals: 18,
    rpc: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche.publicnode.com',
      'https://rpc.ankr.com/avalanche',
      'https://avalanche.blockpi.network/v1/rpc/public',
    ],
    explorer: 'https://snowtrace.io',
    icon: 'avalanche',
  },
} as const satisfies Record<string, NetworkConfig>;

// Non-EVM Networks
export const SOL_NETWORK: NonEvmNetworkConfig = {
  name: 'solana',
  displayName: 'Solana Mainnet',
  symbol: 'SOL',
  decimals: 9,
  rpc: [
    'https://api.mainnet-beta.solana.com',
    'https://solana.publicnode.com',
    'https://rpc.ankr.com/solana',
  ],
  explorer: 'https://solscan.io',
  icon: 'solana',
};

export const SUI_NETWORK: NonEvmNetworkConfig = {
  name: 'sui',
  displayName: 'Sui Mainnet',
  symbol: 'SUI',
  decimals: 9,
  rpc: [
    'https://fullnode.mainnet.sui.io:443',
    'https://sui-mainnet.nodeinfra.com:443',
    'https://sui.publicnode.com',
  ],
  explorer: 'https://suivision.xyz',
  icon: 'sui',
};

export const TON_NETWORK: NonEvmNetworkConfig = {
  name: 'ton',
  displayName: 'The Open Network',
  symbol: 'TON',
  decimals: 9,
  rpc: [
    'https://toncenter.com/api/v2/jsonRPC',
    'https://mainnet.tonhubapi.com/jsonrpc',
  ],
  explorer: 'https://tonscan.org',
  icon: 'ton',
};

export const HEDERA_NETWORK: NonEvmNetworkConfig = {
  name: 'hedera',
  displayName: 'Hedera Mainnet',
  symbol: 'HBAR',
  decimals: 8,
  rpc: [
    'https://mainnet-public.mirrornode.hedera.com/api/v1',
    'https://hedera-mainnet.gateway.fm/api/v1',
  ],
  explorer: 'https://hashscan.io',
  icon: 'hedera',
};

// Testnet configurations
export const TESTNET_NETWORKS = {
  // Solana Devnet
  solanaDevnet: {
    name: 'solana-devnet',
    displayName: 'Solana Devnet',
    symbol: 'SOL',
    decimals: 9,
    rpc: [
      'https://api.devnet.solana.com',
      'https://solana-devnet.g.alchemy.com/v2/demo',
    ],
    explorer: 'https://solscan.io/?cluster=devnet',
    icon: 'solana',
    testnet: true,
  },
  // Sui Testnet
  suiTestnet: {
    name: 'sui-testnet',
    displayName: 'Sui Testnet',
    symbol: 'SUI',
    decimals: 9,
    rpc: ['https://fullnode.testnet.sui.io:443'],
    explorer: 'https://testnet.suivision.xyz',
    icon: 'sui',
    testnet: true,
  },
} as const satisfies Record<string, NonEvmNetworkConfig>;

// Network utilities
export class NetworkManager {
  /**
   * Get EVM network configuration by name or chain ID
   */
  static getEvmNetwork(identifier: string | number): NetworkConfig | undefined {
    if (typeof identifier === 'string') {
      return EVM_NETWORKS[identifier as keyof typeof EVM_NETWORKS];
    }

    // Search by chain ID
    return Object.values(EVM_NETWORKS).find(
      (network) => network.chainId === identifier
    );
  }

  /**
   * Get non-EVM network configuration
   */
  static getNonEvmNetwork(chain: Chain): NonEvmNetworkConfig | undefined {
    switch (chain) {
      case 'sol':
        return SOL_NETWORK;
      case 'sui':
        return SUI_NETWORK;
      case 'ton':
        return TON_NETWORK;
      case 'hedera':
        return HEDERA_NETWORK;
      default:
        return undefined;
    }
  }

  /**
   * Get all supported EVM chain IDs
   */
  static getSupportedChainIds(): number[] {
    return Object.values(EVM_NETWORKS).map((network) => network.chainId);
  }

  /**
   * Check if chain ID is supported
   */
  static isSupportedChainId(chainId: number): boolean {
    return this.getSupportedChainIds().includes(chainId);
  }

  /**
   * Get network by chain type
   */
  static getNetworkByChain(
    chain: Chain
  ): NetworkConfig | NonEvmNetworkConfig | undefined {
    if (chain === 'evm') {
      return EVM_NETWORKS.mainnet; // Default to Ethereum mainnet
    }
    return this.getNonEvmNetwork(chain);
  }

  /**
   * Format chain ID to hex string
   */
  static formatChainId(chainId: number): string {
    return `0x${chainId.toString(16)}`;
  }

  /**
   * Parse hex chain ID to number
   */
  static parseChainId(chainIdHex: string): number {
    return parseInt(chainIdHex, 16);
  }

  /**
   * Get working RPC endpoint with fallback
   */
  static async getWorkingRpc(rpcEndpoints: readonly string[]): Promise<string> {
    for (const rpc of rpcEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return rpc;
        }
      } catch (error) {
        console.warn(`RPC endpoint ${rpc} failed:`, error);
        continue;
      }
    }

    // If no RPC is working, return the first one as fallback
    return rpcEndpoints[0];
  }

  /**
   * Get explorer URL for transaction
   */
  static getExplorerTxUrl(
    chain: Chain,
    txHash: string,
    networkName?: string
  ): string {
    if (chain === 'evm') {
      const network = networkName
        ? this.getEvmNetwork(networkName)
        : EVM_NETWORKS.mainnet;
      return network
        ? `${network.explorer}/tx/${txHash}`
        : `https://etherscan.io/tx/${txHash}`;
    }

    const network = this.getNonEvmNetwork(chain);
    if (!network) return '';

    switch (chain) {
      case 'sol':
        return `${network.explorer}/tx/${txHash}`;
      case 'sui':
        return `${network.explorer}/txblock/${txHash}`;
      case 'ton':
        return `${network.explorer}/transaction/${txHash}`;
      case 'hedera':
        return `${network.explorer}/transaction/${txHash}`;
      default:
        return '';
    }
  }

  /**
   * Get explorer URL for address
   */
  static getExplorerAddressUrl(
    chain: Chain,
    address: string,
    networkName?: string
  ): string {
    if (chain === 'evm') {
      const network = networkName
        ? this.getEvmNetwork(networkName)
        : EVM_NETWORKS.mainnet;
      return network
        ? `${network.explorer}/address/${address}`
        : `https://etherscan.io/address/${address}`;
    }

    const network = this.getNonEvmNetwork(chain);
    if (!network) return '';

    switch (chain) {
      case 'sol':
        return `${network.explorer}/account/${address}`;
      case 'sui':
        return `${network.explorer}/address/${address}`;
      case 'ton':
        return `${network.explorer}/address/${address}`;
      case 'hedera':
        return `${network.explorer}/account/${address}`;
      default:
        return '';
    }
  }
}

// Type exports for external use
export type EvmNetworkName = keyof typeof EVM_NETWORKS;
export type SupportedNetwork = NetworkConfig | NonEvmNetworkConfig;

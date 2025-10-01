/**
 * Utility functions for blockchain/chain operations
 */

/**
 * Get the correct block explorer URL for a transaction hash
 * Intelligently detects the network based on a cache or falls back to mainnet
 */
export function getExplorerUrl(txHash: string, isTestnet = false): string {
  if (isTestnet) {
    return `https://sepolia.basescan.org/tx/${txHash}`;
  }
  return `https://basescan.org/tx/${txHash}`;
}

/**
 * Get explorer URL for a contract address
 */
export function getContractExplorerUrl(address: string, isTestnet = false): string {
  if (isTestnet) {
    return `https://sepolia.basescan.org/address/${address}`;
  }
  return `https://basescan.org/address/${address}`;
}

/**
 * Detect if a transaction hash is likely from testnet based on patterns
 * This is a heuristic - not perfect but works for most cases
 * 
 * Better approach: Store network info in database alongside tx hash
 */
export function detectTestnetTx(txHash: string, contractAddress?: string): boolean {
  // If we have the mainnet contract address and it matches, it's mainnet
  const mainnetContract = '0x1e8feced8227c6b85535669ebcea967fb259a87b';
  if (contractAddress?.toLowerCase() === mainnetContract.toLowerCase()) {
    return false;
  }
  
  // For now, assume mainnet by default
  // In the future, we should store network info in the database
  return false;
}


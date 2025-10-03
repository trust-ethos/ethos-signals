/**
 * CoinGecko ID lookup utility
 * Automatically finds CoinGecko IDs based on contract addresses
 */

const CHAIN_MAP: Record<string, string> = {
  "ethereum": "ethereum",
  "base": "base",
  "solana": "solana",
  "bsc": "binance-smart-chain",
  "plasma": "plasma",
  "hyperliquid": "hyperliquid",
};

/**
 * Look up CoinGecko ID by contract address
 * Returns null if not found or if there's an error
 */
export async function lookupCoinGeckoId(
  contractAddress: string,
  chain: string
): Promise<string | null> {
  try {
    const cgChain = CHAIN_MAP[chain];
    if (!cgChain) {
      console.log(`Chain ${chain} not mapped to CoinGecko platform`);
      return null;
    }

    // Use the direct contract lookup endpoint - most reliable method
    const contractUrl = `https://api.coingecko.com/api/v3/coins/${cgChain}/contract/${contractAddress}`;
    const contractResponse = await fetch(contractUrl);

    if (contractResponse.ok) {
      const data = await contractResponse.json();
      if (data.id) {
        console.log(`✅ Found CoinGecko ID: ${data.id} for ${contractAddress}`);
        return data.id;
      }
    }

    // If direct lookup fails (404 or other error), log but don't spam
    if (contractResponse.status !== 404) {
      console.log(`CoinGecko API error: ${contractResponse.status}`);
    }

    console.log(`No CoinGecko ID found for ${contractAddress} on ${chain}`);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Error looking up CoinGecko ID:`, message);
    return null;
  }
}


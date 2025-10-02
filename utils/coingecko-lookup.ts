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

    // Search by contract address
    const searchUrl = `https://api.coingecko.com/api/v3/search?query=${contractAddress}`;
    const response = await fetch(searchUrl);

    if (!response.ok) {
      console.log(`CoinGecko API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Look for exact match in search results
    for (const coin of data.coins || []) {
      const platforms = coin.platforms || {};
      const platformAddress = platforms[cgChain]?.toLowerCase();

      if (platformAddress === contractAddress.toLowerCase()) {
        console.log(`✅ Found CoinGecko ID: ${coin.id} for ${contractAddress}`);
        return coin.id;
      }
    }

    // If no exact match, try fetching details for top 3 results
    for (const coin of (data.coins || []).slice(0, 3)) {
      try {
        const detailUrl = `https://api.coingecko.com/api/v3/coins/${coin.id}`;
        const detailResponse = await fetch(detailUrl);

        if (detailResponse.ok) {
          const detail = await detailResponse.json();
          const platformAddress = detail.platforms?.[cgChain]?.toLowerCase();

          if (platformAddress === contractAddress.toLowerCase()) {
            console.log(`✅ Found CoinGecko ID: ${detail.id} for ${contractAddress}`);
            return detail.id;
          }
        }

        // Small delay between detail requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(`Error fetching CoinGecko details for ${coin.id}:`, message);
      }
    }

    console.log(`No CoinGecko ID found for ${contractAddress} on ${chain}`);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Error looking up CoinGecko ID:`, message);
    return null;
  }
}


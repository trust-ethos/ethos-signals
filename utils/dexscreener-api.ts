/**
 * DexScreener API integration for newly launched tokens
 * Provides real-time and historical price data from DEX trading pairs
 * 
 * Use this as a fallback when CoinGecko/DefiLlama don't have data yet
 */

import { getCachedPrice, setCachedPrice } from "./kv-cache.ts";

const DEXSCREENER_API_BASE = "https://api.dexscreener.com/latest/dex";

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
  };
  priceChange: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
}

export interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[] | null;
}

/**
 * Get current price for a token from DexScreener
 * @param chain - solana, ethereum, base, bsc, etc.
 * @param contractAddress - Token contract address
 * @returns USD price or null
 */
export async function getDexScreenerPriceNow(
  chain: string,
  contractAddress: string
): Promise<number | null> {
  const cacheKey = `dexscreener:now:${chain}:${contractAddress}`;
  
  const cached = await getCachedPrice(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const url = `${DEXSCREENER_API_BASE}/tokens/${contractAddress}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`DexScreener API error: ${response.status}`);
      return null;
    }
    
    const data: DexScreenerResponse = await response.json();
    
    if (!data.pairs || data.pairs.length === 0) {
      return null;
    }
    
    // Get the pair with highest liquidity (most reliable price)
    const sortedPairs = data.pairs.sort((a, b) => 
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    );
    
    const bestPair = sortedPairs[0];
    const price = parseFloat(bestPair.priceUsd);
    
    if (isNaN(price) || !isFinite(price)) {
      return null;
    }
    
    // Cache for 1 minute (DexScreener updates frequently)
    await setCachedPrice(cacheKey, price, 1/60);
    
    return price;
  } catch (error) {
    console.error("DexScreener API error:", error);
    return null;
  }
}

/**
 * Get historical price data from DexScreener
 * Note: DexScreener doesn't have a historical API endpoint
 * This function would need to be called repeatedly to build history
 * 
 * For now, we'll return null and rely on CoinGecko/DefiLlama for historical data
 */
export function getDexScreenerPriceAt(
  _chain: string,
  _contractAddress: string,
  _dateISO: string
): Promise<number | null> {
  // DexScreener API doesn't support historical lookups by date
  // Would need to use their charting data or websocket for real-time tracking
  console.warn("DexScreener doesn't support historical price lookups");
  return Promise.resolve(null);
}

/**
 * Get token info from DexScreener including all trading pairs
 * Useful for displaying liquidity, volume, and DEX info
 */
export async function getDexScreenerTokenInfo(
  contractAddress: string
): Promise<DexScreenerResponse | null> {
  try {
    const url = `${DEXSCREENER_API_BASE}/tokens/${contractAddress}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("DexScreener API error:", error);
    return null;
  }
}

/**
 * Check if a token is available on DexScreener
 * Returns true if token has at least one trading pair
 */
export async function isDexScreenerAvailable(
  contractAddress: string
): Promise<boolean> {
  try {
    const data = await getDexScreenerTokenInfo(contractAddress);
    return data !== null && data.pairs !== null && data.pairs.length > 0;
  } catch {
    return false;
  }
}


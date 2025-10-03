import { getCachedPrice, setCachedPrice } from "./kv-cache.ts";
import { buildCoinGeckoUrl } from "./coingecko-api.ts";

// helper kept for future use
function _toDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function findPriceInResponse(data: { coins?: Record<string, { price?: number }> }, chain: string, address: string): number | undefined {
  const expectedKey = `${chain}:${address}`;
  // DefiLlama returns keys in original case, find matching key
  const actualKey = Object.keys(data?.coins || {}).find(k => k.toLowerCase() === expectedKey.toLowerCase());
  return actualKey ? data?.coins?.[actualKey]?.price as number | undefined : undefined;
}

export async function getDefiLlamaTokenPriceAt(
  chainOrId: "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid" | string,
  addressOrEmpty: string,
  atDateISO: string,
): Promise<number | null> {
  // Support both contract addresses and CoinGecko IDs
  const priceKey = chainOrId.includes("coingecko:") ? chainOrId : `${chainOrId}:${addressOrEmpty}`;
  const cacheKey = `llama:token:daily:${priceKey.replace(":", "_")}:${atDateISO}`;
  
  const cached = await getCachedPrice(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Try the exact date first, then nearby dates if not found
  const targetDate = new Date(atDateISO + "T00:00:00Z");
  const dayOffsets = [0, -1, 1, -2, 2, -3, 3]; // Try exact date, then ±1, ±2, ±3 days
  
  for (const offset of dayOffsets) {
    const checkDate = new Date(targetDate);
    checkDate.setDate(checkDate.getDate() + offset);
    const ts = Math.floor(checkDate.getTime() / 1000);
    const url = `https://coins.llama.fi/prices/historical/${ts}/${priceKey}`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      
      // Find price in response (handle both contract and CoinGecko ID formats)
      const actualKey = Object.keys(data?.coins || {}).find(k => k.toLowerCase() === priceKey.toLowerCase());
      const price = actualKey ? data?.coins?.[actualKey]?.price as number | undefined : undefined;
      
      if (typeof price === "number" && Number.isFinite(price)) {
        await setCachedPrice(cacheKey, price, 24); // Cache for 24 hours
        return price;
      }
    } catch (_err) {
      // Try next offset
      continue;
    }
  }
  
  return null;
}

export async function getDefiLlamaTokenPriceAtTimestamp(
  chain: "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid",
  address: string,
  timestamp: string, // ISO datetime string
): Promise<number | null> {
  const ts = Math.floor(new Date(timestamp).getTime() / 1000);
  const cacheKey = `llama:token:timestamp:${chain}:${address}:${ts}`;
  
  const cached = await getCachedPrice(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Try exact timestamp, then expand search window if not found
  const timeOffsets = [0, -3600, 3600, -86400, 86400]; // 0, ±1 hour, ±1 day
  
  for (const offset of timeOffsets) {
    const checkTs = ts + offset;
    const url = `https://coins.llama.fi/prices/historical/${checkTs}/${chain}:${address}`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const price = findPriceInResponse(data, chain, address);
      
      if (typeof price === "number" && Number.isFinite(price)) {
        await setCachedPrice(cacheKey, price, 24); // Cache for 24 hours
        return price;
      }
    } catch (_err) {
      // Try next offset
      continue;
    }
  }
  
  return null;
}

export async function getDefiLlamaTokenPriceNow(
  chainOrId: "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid" | string,
  address?: string,
): Promise<number | null> {
  // If chainOrId contains "coingecko:", it's a CoinGecko ID, otherwise it's a chain:address pair
  const priceKey = chainOrId.includes("coingecko:") ? chainOrId : `${chainOrId}:${address}`;
  const cacheKey = `llama:token:current:${priceKey.replace(":", "_")}`;
  
  // Check cache first (5 minute cache to avoid API abuse)
  const cached = await getCachedPrice(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  const url = `https://coins.llama.fi/prices/current/${priceKey}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    
    // For CoinGecko IDs, the response key will be the full ID
    const expectedKey = chainOrId.includes("coingecko:") ? chainOrId : `${chainOrId}:${address}`;
    const actualKey = Object.keys(data?.coins || {}).find(k => k.toLowerCase() === expectedKey.toLowerCase());
    
    const price = actualKey ? data?.coins?.[actualKey]?.price as number | undefined || null : null;
    
    if (typeof price === "number" && Number.isFinite(price)) {
      // Cache for 5 minutes (0.0833 hours)
      await setCachedPrice(cacheKey, price, 5 / 60);
      return price;
    }
    
    return null;
  } catch (_err) {
    return null;
  }
}

export async function getCoinGeckoPriceAtTimestamp(
  coinGeckoId: string,
  timestamp: string, // ISO datetime string
): Promise<number | null> {
  const ts = Math.floor(new Date(timestamp).getTime() / 1000);
  const cacheKey = `coingecko:timestamp:${coinGeckoId}:${ts}`;
  
  const cached = await getCachedPrice(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Try progressively larger time windows to find the nearest available price
  // Start with ±1 hour, then ±1 day, then ±3 days
  const windows = [
    3600,        // ±1 hour
    86400,       // ±1 day
    259200,      // ±3 days
  ];
  
  for (const window of windows) {
    const from = ts - window;
    const to = ts + window;
    const url = buildCoinGeckoUrl(`/coins/${coinGeckoId}/market_chart/range`, {
      vs_currency: "usd",
      from: String(from),
      to: String(to),
    });
    
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      
      if (!data?.prices || data.prices.length === 0) continue;
      
      // Find the price closest to our target timestamp
      // data.prices is an array of [timestamp_ms, price]
      let closestPrice = null;
      let closestDiff = Infinity;
      
      for (const [priceTs, price] of data.prices) {
        const diff = Math.abs(priceTs / 1000 - ts);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestPrice = price;
        }
      }
      
      if (typeof closestPrice === "number" && Number.isFinite(closestPrice)) {
        await setCachedPrice(cacheKey, closestPrice, 24); // Cache for 24 hours
        return closestPrice;
      }
    } catch (_err) {
      // Try next window
      continue;
    }
  }
  
  return null;
}
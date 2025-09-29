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
  chainOrId: "ethereum" | "base" | "solana" | "bsc" | "plasma" | string,
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

  const ts = Math.floor(new Date(atDateISO + "T00:00:00Z").getTime() / 1000);
  const url = `https://coins.llama.fi/prices/historical/${ts}/${priceKey}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    
    // Find price in response (handle both contract and CoinGecko ID formats)
    const actualKey = Object.keys(data?.coins || {}).find(k => k.toLowerCase() === priceKey.toLowerCase());
    const price = actualKey ? data?.coins?.[actualKey]?.price as number | undefined : undefined;
    
    if (typeof price === "number" && Number.isFinite(price)) {
      await setCachedPrice(cacheKey, price, 24); // Cache for 24 hours
      return price;
    }
  } catch (_err) {
    // ignore network errors, return null below
  }
  return null;
}

export async function getDefiLlamaTokenPriceAtTimestamp(
  chain: "ethereum" | "base" | "solana" | "bsc" | "plasma",
  address: string,
  timestamp: string, // ISO datetime string
): Promise<number | null> {
  const ts = Math.floor(new Date(timestamp).getTime() / 1000);
  const cacheKey = `llama:token:timestamp:${chain}:${address}:${ts}`;
  
  const cached = await getCachedPrice(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const url = `https://coins.llama.fi/prices/historical/${ts}/${chain}:${address}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const price = findPriceInResponse(data, chain, address);
    if (typeof price === "number" && Number.isFinite(price)) {
      await setCachedPrice(cacheKey, price, 24); // Cache for 24 hours
      return price;
    }
  } catch (_err) {
    // ignore network errors, return null below
  }
  return null;
}

export async function getDefiLlamaTokenPriceNow(
  chainOrId: "ethereum" | "base" | "solana" | "bsc" | "plasma" | string,
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

  // CoinGecko's market_chart/range endpoint returns 5-minute intervals
  // We'll fetch a 1-hour range around the timestamp and find the closest price
  const from = ts - 1800; // 30 minutes before
  const to = ts + 1800; // 30 minutes after
  const url = buildCoinGeckoUrl(`/coins/${coinGeckoId}/market_chart/range`, {
    vs_currency: "usd",
    from: String(from),
    to: String(to),
  });
  
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    
    if (!data?.prices || data.prices.length === 0) return null;
    
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
    // ignore network errors, return null below
  }
  return null;
}
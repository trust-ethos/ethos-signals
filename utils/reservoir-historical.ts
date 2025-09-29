import { getCachedPrice, setCachedPrice } from "./database.ts";

// Reservoir API for comprehensive NFT historical data
// Docs: https://docs.reservoir.tools/reference/getcollectionsstatshistoryv1

function getReservoirApiKey(): string {
  return Deno.env.get("RESERVOIR_API_KEY") || "";
}

export async function getReservoirHistoricalFloor(
  chain: "ethereum" | "base" | "bsc",
  contractAddress: string,
  atDateISO: string,
): Promise<number | null> {
  const apiKey = getReservoirApiKey();
  
  const cacheKey = `reservoir:historical:${chain}:${contractAddress.toLowerCase()}:${atDateISO}`;
  const cached = await getCachedPrice(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Convert date to timestamp
  const targetTimestamp = Math.floor(new Date(atDateISO + "T23:59:59Z").getTime() / 1000);
  const startTimestamp = Math.floor(new Date(atDateISO + "T00:00:00Z").getTime() / 1000);
  
  // Reservoir collection stats history endpoint
  const url = `https://api.reservoir.tools/collections/stats/history/v1?collection=${contractAddress}&startTimestamp=${startTimestamp}&endTimestamp=${targetTimestamp}&period=1d`;
  
  const headers: Record<string, string> = {
    'accept': 'application/json',
  };
  
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  
  try {
    const res = await fetch(url, { headers });
    
    if (!res.ok) {
      return null;
    }
    
    const data = await res.json();
    
    // Extract floor price from Reservoir stats response
    const stats = data?.stats;
    if (Array.isArray(stats) && stats.length > 0) {
      // Get the closest timestamp match
      let closestStat = stats[0];
      let closestDiff = Math.abs(stats[0].timestamp - targetTimestamp);
      
      for (const stat of stats) {
        const diff = Math.abs(stat.timestamp - targetTimestamp);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestStat = stat;
        }
      }
      
      const floorPrice = closestStat?.floorSale?.price || closestStat?.floorAsk?.price || null;
      
      if (typeof floorPrice === "number" && Number.isFinite(floorPrice)) {
        await setCachedPrice(cacheKey, floorPrice, 24); // Cache for 24 hours
        return floorPrice;
      }
    }
    
  } catch (_err) {
    // ignore errors
  }
  
  return null;
}

export async function getReservoirCurrentFloor(
  chain: "ethereum" | "base" | "bsc",
  contractAddress: string,
): Promise<number | null> {
  const apiKey = getReservoirApiKey();
  
  const url = `https://api.reservoir.tools/collections/v7?id=${contractAddress}&includeFloorAsk=true`;
  
  const headers: Record<string, string> = {
    'accept': 'application/json',
  };
  
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  
  try {
    const res = await fetch(url, { headers });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    const collection = data?.collections?.[0];
    const floorPrice = collection?.floorAsk?.price?.amount?.native;
    
    return typeof floorPrice === "number" && Number.isFinite(floorPrice) ? floorPrice : null;
  } catch (_err) {
    return null;
  }
}

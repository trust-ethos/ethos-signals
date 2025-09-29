import { getCachedPrice, setCachedPrice } from "./database.ts";
import { getReservoirHistoricalFloor, getReservoirCurrentFloor } from "./reservoir-historical.ts";

// Moralis API for NFT floor prices with historical data support
// Docs: https://docs.moralis.io/web3-data-api/evm/nft-api

function getMoralisApiKey(): string {
  return Deno.env.get("MORALIS_API_KEY") || "";
}

function getMoralisChainId(chain: "ethereum" | "base" | "bsc"): string {
  const chainMap = { 
    ethereum: "0x1", 
    base: "0x2105",
    bsc: "0x38" 
  };
  return chainMap[chain];
}

// Hybrid approach: Try Reservoir first (longer history), then Moralis, then current price fallback
export async function getMoralisNFTFloorAt(
  chain: "ethereum" | "base" | "bsc",
  contractAddress: string,
  atDateISO: string,
): Promise<number | null> {
  const cacheKey = `hybrid:nft:daily:${chain}:${contractAddress.toLowerCase()}:${atDateISO}`;
  const cached = await getCachedPrice(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // 1. Try Reservoir first (longer historical range)
  try {
    const reservoirPrice = await getReservoirHistoricalFloor(chain, contractAddress, atDateISO);
    if (reservoirPrice !== null) {
      await setCachedPrice(cacheKey, reservoirPrice, 24); // Cache for 24 hours
      return reservoirPrice;
    }
  } catch (_err) {
    // Continue to Moralis
  }

  // 2. Try Moralis (30-day historical range)
  const apiKey = getMoralisApiKey();
  if (apiKey) {
    const chainId = getMoralisChainId(chain);
    const url = `https://deep-index.moralis.io/api/v2.2/nft/${contractAddress}/floor-price/historical?chain=${chainId}&interval=1d`;
    
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'X-API-Key': apiKey,
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        const targetTimestamp = new Date(atDateISO + "T00:00:00Z").getTime();
        let closestPrice: number | null = null;
        let closestTimeDiff = Infinity;
        
        const dataPoints = data.result || [];
        
        if (Array.isArray(dataPoints) && dataPoints.length > 0) {
          for (const item of dataPoints) {
            const itemDateStr = item.timestamp;
            if (!itemDateStr) continue;
            
            const itemDate = new Date(itemDateStr);
            const timeDiff = Math.abs(itemDate.getTime() - targetTimestamp);
            
            if (timeDiff < closestTimeDiff && timeDiff <= 3 * 24 * 60 * 60 * 1000) {
              closestTimeDiff = timeDiff;
              closestPrice = parseFloat(item.floor_price || '0') || null;
            }
          }
        }
        
        if (typeof closestPrice === "number" && Number.isFinite(closestPrice) && closestPrice > 0) {
          await setCachedPrice(cacheKey, closestPrice, 24); // Cache for 24 hours
          return closestPrice;
        }
      }
    } catch (_err) {
      // Continue to fallback
    }
  }

  // 3. Fall back to current price
  const currentPrice = await getMoralisNFTFloorNow(chain, contractAddress);
  
  if (currentPrice !== null) {
    // Cache for 5 minutes (getMoralisNFTFloorNow already caches, but we cache again with historical key)
    await setCachedPrice(cacheKey, currentPrice, 5 / 60);
    return currentPrice;
  }
  
  return null;
}

// Hybrid approach for current prices: Try Reservoir first, then Moralis
export async function getMoralisNFTFloorNow(
  chain: "ethereum" | "base" | "bsc", 
  contractAddress: string,
): Promise<number | null> {
  const cacheKey = `nft:floor:current:${chain}:${contractAddress.toLowerCase()}`;
  
  // Check cache first (5 minute cache to avoid API abuse)
  const cached = await getCachedPrice(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  // 1. Try Reservoir first (often more reliable)
  try {
    const reservoirPrice = await getReservoirCurrentFloor(chain, contractAddress);
    if (reservoirPrice !== null) {
      // Cache for 5 minutes
      await setCachedPrice(cacheKey, reservoirPrice, 5 / 60);
      return reservoirPrice;
    }
  } catch (_err) {
    // Continue to Moralis
  }

  // 2. Try Moralis as fallback
  const apiKey = getMoralisApiKey();
  if (!apiKey) {
    return null;
  }

  const chainId = getMoralisChainId(chain);
  const url = `https://deep-index.moralis.io/api/v2.2/nft/${contractAddress}/floor-price?chain=${chainId}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': apiKey,
      }
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    
    // Extract current floor price from Moralis response
    let floorPrice = data?.floor_price || data?.floorPrice || data?.price;
    
    // Convert from wei if needed (Moralis sometimes returns wei values)
    if (typeof floorPrice === "string" && floorPrice.length > 10) {
      floorPrice = parseFloat(floorPrice) / Math.pow(10, 18); // Convert from wei to ETH
    } else if (typeof floorPrice === "string") {
      floorPrice = parseFloat(floorPrice);
    }
    
    if (typeof floorPrice === "number" && Number.isFinite(floorPrice)) {
      // Cache for 5 minutes
      await setCachedPrice(cacheKey, floorPrice, 5 / 60);
      return floorPrice;
    }
    
    return null;
  } catch (_err) {
    return null;
  }
}

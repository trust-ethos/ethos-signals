import { getCachedPrice, setCachedPrice } from "./kv-cache.ts";
import { getReservoirHistoricalFloor, getReservoirCurrentFloor } from "./reservoir-historical.ts";
import { getOpenSeaFloorNow, getOpenSeaFloorAt } from "./opensea-api.ts";

// Multi-source NFT floor price fetching
// Priority: Reservoir (best historical) → Moralis → OpenSea (best coverage)

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

type SupportedChain = "ethereum" | "base" | "bsc" | "hyperliquid" | "polygon" | "arbitrum" | "optimism";

// Multi-source historical NFT floor price: Reservoir → Moralis → OpenSea → Current price fallback
export async function getMoralisNFTFloorAt(
  chain: SupportedChain,
  contractAddress: string,
  atDateISO: string,
): Promise<number | null> {
  const cacheKey = `hybrid:nft:daily:${chain}:${contractAddress.toLowerCase()}:${atDateISO}`;
  const cached = await getCachedPrice(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // 1. Try Reservoir first (longer historical range, Ethereum/Base only)
  if (chain === "ethereum" || chain === "base") {
    try {
      const reservoirPrice = await getReservoirHistoricalFloor(chain, contractAddress, atDateISO);
      if (reservoirPrice !== null) {
        await setCachedPrice(cacheKey, reservoirPrice, 24); // Cache for 24 hours
        return reservoirPrice;
      }
    } catch (_err) {
      // Continue to next source
    }
  }

  // 2. Try Moralis (30-day historical range, Ethereum/Base/BSC only)
  if (chain === "ethereum" || chain === "base" || chain === "bsc") {
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
        // Continue to next source
      }
    }
  }

  // 3. Try OpenSea historical (note: limited support)
  try {
    const openSeaPrice = await getOpenSeaFloorAt(chain, contractAddress, atDateISO);
    if (openSeaPrice !== null) {
      await setCachedPrice(cacheKey, openSeaPrice, 24);
      return openSeaPrice;
    }
  } catch (_err) {
    // Continue to fallback
  }

  // 4. Fall back to current price
  const currentPrice = await getMoralisNFTFloorNow(chain, contractAddress);
  
  if (currentPrice !== null) {
    // Cache for 5 minutes
    await setCachedPrice(cacheKey, currentPrice, 5 / 60);
    return currentPrice;
  }
  
  return null;
}

// Multi-source current floor price: Reservoir → Moralis → OpenSea
export async function getMoralisNFTFloorNow(
  chain: SupportedChain, 
  contractAddress: string,
): Promise<number | null> {
  const cacheKey = `nft:floor:current:${chain}:${contractAddress.toLowerCase()}`;
  
  // Check cache first (5 minute cache to avoid API abuse)
  const cached = await getCachedPrice(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  // 1. Try Reservoir first (often more reliable, Ethereum/Base only)
  if (chain === "ethereum" || chain === "base") {
    try {
      const reservoirPrice = await getReservoirCurrentFloor(chain, contractAddress);
      if (reservoirPrice !== null) {
        // Cache for 5 minutes
        await setCachedPrice(cacheKey, reservoirPrice, 5 / 60);
        return reservoirPrice;
      }
    } catch (_err) {
      // Continue to next source
    }
  }

  // 2. Try Moralis (Ethereum/Base/BSC only)
  if (chain === "ethereum" || chain === "base" || chain === "bsc") {
    const apiKey = getMoralisApiKey();
    if (apiKey) {
      const chainId = getMoralisChainId(chain);
      const url = `https://deep-index.moralis.io/api/v2.2/nft/${contractAddress}/floor-price?chain=${chainId}`;
      
      try {
        const res = await fetch(url, {
          headers: {
            'accept': 'application/json',
            'X-API-Key': apiKey,
          }
        });
        
        if (res.ok) {
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
        }
      } catch (_err) {
        // Continue to next source
      }
    }
  }

  // 3. Try OpenSea (works for all chains including Hyperliquid!)
  try {
    console.log(`⚠️ Reservoir/Moralis has no price for ${chain}:${contractAddress}, trying OpenSea...`);
    const openSeaPrice = await getOpenSeaFloorNow(chain, contractAddress);
    
    if (openSeaPrice !== null) {
      console.log(`✅ Found floor price on OpenSea: ${openSeaPrice} ETH`);
      // Cache for 5 minutes
      await setCachedPrice(cacheKey, openSeaPrice, 5 / 60);
      return openSeaPrice;
    }
  } catch (_err) {
    // All sources exhausted
  }
  
  return null;
}

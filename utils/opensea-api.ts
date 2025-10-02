/**
 * OpenSea API integration for NFT floor prices
 * Supports multiple chains including Ethereum, Base, Arbitrum, Optimism, Polygon, and more
 * 
 * API Docs: https://docs.opensea.io/reference/api-overview
 */

import { getCachedPrice, setCachedPrice } from "./kv-cache.ts";

function getOpenSeaApiKey(): string {
  return Deno.env.get("OPENSEA_API_KEY") || "";
}

/**
 * Map our chain names to OpenSea chain identifiers
 */
function getOpenSeaChain(chain: string): string {
  const chainMap: Record<string, string> = {
    ethereum: "ethereum",
    base: "base",
    bsc: "bsc",
    polygon: "matic",
    arbitrum: "arbitrum",
    optimism: "optimism",
    avalanche: "avalanche",
    // Hyperliquid uses "hyperevm" on OpenSea
    hyperliquid: "hyperevm",
  };
  return chainMap[chain] || chain;
}

export interface OpenSeaCollectionStats {
  total: {
    volume: number;
    sales: number;
    average_price: number;
    num_owners: number;
    market_cap: number;
    floor_price: number;
    floor_price_symbol: string;
  };
}

export interface OpenSeaCollection {
  collection: string;
  name: string;
  description: string;
  image_url: string;
  banner_image_url: string;
  owner: string;
  safelist_status: string;
  category: string;
  is_disabled: boolean;
  is_nsfw: boolean;
  trait_offers_enabled: boolean;
  opensea_url: string;
  project_url: string;
  wiki_url: string;
  discord_url: string;
  telegram_url: string;
  twitter_username: string;
  instagram_username: string;
  contracts: Array<{
    address: string;
    chain: string;
  }>;
}

/**
 * Get OpenSea collection slug from contract address
 * @param chain - ethereum, base, etc.
 * @param contractAddress - NFT contract address
 * @returns Collection slug or null
 */
async function getCollectionSlug(
  chain: string,
  contractAddress: string
): Promise<string | null> {
  const apiKey = getOpenSeaApiKey();
  if (!apiKey) {
    return null;
  }

  const openSeaChain = getOpenSeaChain(chain);
  
  try {
    // OpenSea API v2 - Contract lookup endpoint
    const url = `https://api.opensea.io/api/v2/chain/${openSeaChain}/contract/${contractAddress}`;
    
    const response = await fetch(url, {
      headers: {
        "accept": "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.collection || null;
  } catch {
    return null;
  }
}

/**
 * Get current floor price for an NFT collection from OpenSea
 * @param chain - ethereum, base, hyperliquid, etc.
 * @param contractAddress - NFT contract address
 * @returns Floor price in native currency (ETH, etc.) or null
 */
export async function getOpenSeaFloorNow(
  chain: string,
  contractAddress: string
): Promise<number | null> {
  const cacheKey = `opensea:floor:current:${chain}:${contractAddress.toLowerCase()}`;
  
  // Check cache first (5 minute cache)
  const cached = await getCachedPrice(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const apiKey = getOpenSeaApiKey();
  if (!apiKey) {
    console.warn("OPENSEA_API_KEY not set");
    return null;
  }
  
  try {
    // Step 1: Look up collection slug by contract address
    const slug = await getCollectionSlug(chain, contractAddress);
    
    if (!slug) {
      console.warn(`OpenSea: No collection found for ${chain}:${contractAddress}`);
      return null;
    }

    // Step 2: Get collection stats using the slug
    const url = `https://api.opensea.io/api/v2/collections/${slug}/stats`;
    
    const response = await fetch(url, {
      headers: {
        "accept": "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      console.warn(`OpenSea API error: ${response.status} for ${chain}:${contractAddress} (slug: ${slug})`);
      return null;
    }

    const data: OpenSeaCollectionStats = await response.json();
    
    const floorPrice = data.total?.floor_price;
    
    if (typeof floorPrice === "number" && Number.isFinite(floorPrice) && floorPrice > 0) {
      // Cache for 5 minutes
      await setCachedPrice(cacheKey, floorPrice, 5 / 60);
      return floorPrice;
    }

    return null;
  } catch (error) {
    console.error(`OpenSea API error for ${chain}:${contractAddress}:`, error);
    return null;
  }
}

/**
 * Get collection info from OpenSea (includes floor price and more)
 * @param contractAddress - NFT contract address
 * @returns Collection data or null
 */
export async function getOpenSeaCollectionInfo(
  contractAddress: string
): Promise<OpenSeaCollection | null> {
  const apiKey = getOpenSeaApiKey();
  if (!apiKey) {
    return null;
  }

  try {
    const url = `https://api.opensea.io/api/v2/collections/${contractAddress}`;
    
    const response = await fetch(url, {
      headers: {
        "accept": "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("OpenSea collection info error:", error);
    return null;
  }
}

/**
 * Get historical floor price by analyzing sales events
 * This calculates the lowest sale price on a given date
 * 
 * Note: This is an approximation based on sales, not true floor listings
 */
export async function getOpenSeaFloorAt(
  chain: string,
  contractAddress: string,
  dateISO: string
): Promise<number | null> {
  const cacheKey = `opensea:floor:historical:${chain}:${contractAddress.toLowerCase()}:${dateISO}`;
  
  // Check cache first (cache for 24 hours since historical data doesn't change)
  const cached = await getCachedPrice(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const apiKey = getOpenSeaApiKey();
  if (!apiKey) {
    return null;
  }

  try {
    // Step 1: Get collection slug
    const slug = await getCollectionSlug(chain, contractAddress);
    if (!slug) {
      return null;
    }

    // Step 2: Calculate timestamp range for the target date (full day)
    const targetDate = new Date(dateISO + "T00:00:00Z");
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const afterTimestamp = Math.floor(targetDate.getTime() / 1000);
    const beforeTimestamp = Math.floor(nextDate.getTime() / 1000);

    // Step 3: Fetch sales events for that day
    const url = `https://api.opensea.io/api/v2/events/collection/${slug}?event_type=sale&after=${afterTimestamp}&before=${beforeTimestamp}&limit=50`;
    
    const response = await fetch(url, {
      headers: {
        "accept": "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const events = data.asset_events || [];

    if (events.length === 0) {
      // No sales on this day - fall back to current price
      return null;
    }

    // Step 4: Find lowest sale price (floor price for that day)
    let minPrice: number | null = null;

    for (const event of events) {
      if (event.payment?.quantity && event.payment?.decimals) {
        const price = parseFloat(event.payment.quantity) / Math.pow(10, event.payment.decimals);
        
        if (Number.isFinite(price) && price > 0) {
          if (minPrice === null || price < minPrice) {
            minPrice = price;
          }
        }
      }
    }

    if (minPrice !== null) {
      // Cache for 24 hours (historical data doesn't change)
      await setCachedPrice(cacheKey, minPrice, 24);
      return minPrice;
    }

    return null;
  } catch (error) {
    console.error(`OpenSea historical floor error for ${chain}:${contractAddress} on ${dateISO}:`, error);
    return null;
  }
}

/**
 * Get historical floor prices for a date range (for charting)
 * @param chain - blockchain name
 * @param contractAddress - NFT contract address
 * @param startDate - Start date (yyyy-mm-dd)
 * @param endDate - End date (yyyy-mm-dd)
 * @returns Array of {date, floorPrice} objects
 */
export async function getOpenSeaFloorPriceHistory(
  chain: string,
  contractAddress: string,
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; floorPrice: number }>> {
  // Check cache first (cache chart data for 6 hours)
  const cacheKey = `opensea:chart:${chain}:${contractAddress.toLowerCase()}:${startDate}:${endDate}`;
  const cached = await getCachedPrice(cacheKey);
  
  if (cached !== null && Array.isArray(cached)) {
    console.log(`✅ Using cached OpenSea chart data (${cached.length} days)`);
    // deno-lint-ignore no-explicit-any
    return cached as any;
  }

  const apiKey = getOpenSeaApiKey();
  if (!apiKey) {
    console.warn("OPENSEA_API_KEY not set");
    return [];
  }

  try {
    // Step 1: Get collection slug
    const slug = await getCollectionSlug(chain, contractAddress);
    if (!slug) {
      return [];
    }

    // Step 2: Calculate date range
    const start = new Date(startDate + "T00:00:00Z");
    const end = new Date(endDate + "T23:59:59Z");
    
    const afterTimestamp = Math.floor(start.getTime() / 1000);
    const beforeTimestamp = Math.floor(end.getTime() / 1000);

    // Step 3: Fetch ALL sales events in the date range (with pagination)
    console.log(`📊 Fetching OpenSea sales events for ${slug} from ${startDate} to ${endDate}...`);
    
    const allEvents: Array<{
      payment?: { quantity: string; decimals: number };
      event_timestamp?: number;
    }> = [];
    let cursor: string | null = null;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore) {
      const url: string = cursor
        ? `https://api.opensea.io/api/v2/events/collection/${slug}?event_type=sale&after=${afterTimestamp}&before=${beforeTimestamp}&limit=200&next=${cursor}`
        : `https://api.opensea.io/api/v2/events/collection/${slug}?event_type=sale&after=${afterTimestamp}&before=${beforeTimestamp}&limit=200`;
      
      const response: Response = await fetch(url, {
        headers: {
          "accept": "application/json",
          "x-api-key": apiKey,
        },
      });

      if (!response.ok) {
        console.warn(`OpenSea API error on page ${pageCount + 1}: ${response.status}`);
        break;
      }

      // deno-lint-ignore no-explicit-any
      const data: any = await response.json();
      const events = data.asset_events || [];
      allEvents.push(...events);
      
      pageCount++;
      console.log(`  Page ${pageCount}: ${events.length} events (total: ${allEvents.length})`);

      // Check if there's more data
      cursor = data.next || null;
      hasMore = cursor !== null && events.length > 0;
      
      // Safety limit: Stop after 50 pages (10,000 events) to avoid runaway API calls
      // This is much higher than the previous 1000 event limit
      if (pageCount >= 50) {
        console.log(`⚠️ Reached safety limit of 50 pages (${allEvents.length} events)`);
        break;
      }
    }
    
    console.log(`✅ Fetched ${allEvents.length} total events from ${pageCount} pages`);

    // Step 4: Group events by day and find minimum price per day
    const pricesByDay = new Map<string, number>();

    for (const event of allEvents) {
      if (event.payment?.quantity && event.payment?.decimals && event.event_timestamp) {
        const price = parseFloat(event.payment.quantity) / Math.pow(10, event.payment.decimals);
        
        if (Number.isFinite(price) && price > 0) {
          // Get date string (yyyy-mm-dd)
          const eventDate = new Date(event.event_timestamp * 1000).toISOString().split('T')[0];
          
          // Track minimum price for this day
          const currentMin = pricesByDay.get(eventDate);
          if (currentMin === undefined || price < currentMin) {
            pricesByDay.set(eventDate, price);
          }
        }
      }
    }

    // Step 5: Convert to array and sort by date
    const result = Array.from(pricesByDay.entries())
      .map(([date, floorPrice]) => ({ date, floorPrice }))
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log(`📈 Calculated floor prices for ${result.length} days`);
    
    // Cache the result for 6 hours (chart data doesn't change much)
    if (result.length > 0) {
      // deno-lint-ignore no-explicit-any
      await setCachedPrice(cacheKey, result as any, 6);
    }

    return result;
  } catch (error) {
    console.error(`OpenSea historical range error for ${chain}:${contractAddress}:`, error);
    return [];
  }
}

/**
 * Check if OpenSea has data for a given NFT collection
 */
export async function isOpenSeaAvailable(
  contractAddress: string
): Promise<boolean> {
  try {
    const info = await getOpenSeaCollectionInfo(contractAddress);
    return info !== null;
  } catch {
    return false;
  }
}


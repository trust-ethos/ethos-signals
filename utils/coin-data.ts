// CoinGecko API integration for auto-populating verified projects
// Free tier: 10-30 calls/minute, no API key required
// Pro/Demo tier: Use API key from environment

import { buildCoinGeckoUrl, waitForRateLimit } from "./coingecko-api.ts";

interface CoinGeckoListItem {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<string, string>;
}

interface CoinGeckoDetail {
  id: string;
  symbol: string;
  name: string;
  links: {
    twitter_screen_name: string;
    homepage: string[];
  };
  image: {
    large: string;
  };
  platforms: Record<string, string>;
}

export async function searchCoinsByTwitter(twitterHandle: string): Promise<CoinGeckoDetail[]> {
  try {
    // First get the coins list to search through
    const url = buildCoinGeckoUrl("/coins/list", { include_platform: "true" });
    const listResponse = await fetch(url);
    if (!listResponse.ok) return [];
    
    const coins: CoinGeckoListItem[] = await listResponse.json();
    
    // Search for coins that might match the twitter handle
    const possibleMatches = coins.filter(coin => 
      coin.id.toLowerCase().includes(twitterHandle.toLowerCase()) ||
      coin.name.toLowerCase().includes(twitterHandle.toLowerCase()) ||
      coin.symbol.toLowerCase() === twitterHandle.toLowerCase()
    );
    
    // Get detailed info for the first few matches
    const details: CoinGeckoDetail[] = [];
    for (const coin of possibleMatches.slice(0, 5)) {
      try {
        const url = buildCoinGeckoUrl(`/coins/${coin.id}`, {
          localization: "false",
          tickers: "false",
          market_data: "false",
          community_data: "false",
          developer_data: "false",
          sparkline: "false",
        });
        const detailResponse = await fetch(url);
        
        if (detailResponse.ok) {
          const detail: CoinGeckoDetail = await detailResponse.json();
          
          // Only include if it has Twitter data
          if (detail.links?.twitter_screen_name) {
            details.push(detail);
          }
        }
        
        // Rate limiting - wait between requests
        await waitForRateLimit(200);
      } catch (_err) {
        continue;
      }
    }
    
    return details;
  } catch (_err) {
    return [];
  }
}

export async function getCoinDetailsByTwitter(twitterHandle: string): Promise<CoinGeckoDetail | null> {
  try {
    // For popular coins, try direct ID lookup first
    const directIds = [
      twitterHandle.toLowerCase(),
      `${twitterHandle.toLowerCase()}-coin`,
      `${twitterHandle.toLowerCase()}-token`
    ];
    
    for (const id of directIds) {
      try {
        const url = buildCoinGeckoUrl(`/coins/${id}`, {
          localization: "false",
          tickers: "false",
          market_data: "false",
          community_data: "false",
          developer_data: "false",
          sparkline: "false",
        });
        const response = await fetch(url);
        
        if (response.ok) {
          const coin: CoinGeckoDetail = await response.json();
          if (coin.links?.twitter_screen_name?.toLowerCase() === twitterHandle.toLowerCase()) {
            return coin;
          }
        }
        
        await waitForRateLimit(200); // Rate limiting
      } catch (_err) {
        continue;
      }
    }
    
    // Fallback to search
    const searchResults = await searchCoinsByTwitter(twitterHandle);
    const exactMatch = searchResults.find(coin => 
      coin.links?.twitter_screen_name?.toLowerCase() === twitterHandle.toLowerCase()
    );
    
    return exactMatch || null;
  } catch (_err) {
    return null;
  }
}

export function extractContractAddresses(coin: CoinGeckoDetail): Array<{ chain: "ethereum" | "base" | "solana" | "bsc"; address: string }> {
  const contracts: Array<{ chain: "ethereum" | "base" | "solana" | "bsc"; address: string }> = [];
  
  if (coin.platforms) {
    // Ethereum
    if (coin.platforms.ethereum && coin.platforms.ethereum !== "") {
      contracts.push({ chain: "ethereum", address: coin.platforms.ethereum });
    }
    
    // Base
    if (coin.platforms.base && coin.platforms.base !== "") {
      contracts.push({ chain: "base", address: coin.platforms.base });
    }
    
    // Solana
    if (coin.platforms.solana && coin.platforms.solana !== "") {
      contracts.push({ chain: "solana", address: coin.platforms.solana });
    }
    
    // BSC (Binance Smart Chain)
    if (coin.platforms["binance-smart-chain"] && coin.platforms["binance-smart-chain"] !== "") {
      contracts.push({ chain: "bsc", address: coin.platforms["binance-smart-chain"] });
    }
  }
  
  return contracts;
}

export function coinToVerifiedProject(coin: CoinGeckoDetail, ethosUserId: number): {
  twitterUsername: string;
  displayName: string;
  avatarUrl: string;
  type: "token";
  contracts: Array<{ chain: "ethereum" | "base" | "solana" | "bsc"; address: string }>;
} | null {
  if (!coin.links?.twitter_screen_name) return null;
  
  const contracts = extractContractAddresses(coin);
  if (contracts.length === 0) return null;
  
  return {
    twitterUsername: coin.links.twitter_screen_name,
    displayName: coin.name,
    avatarUrl: coin.image?.large || "",
    type: "token",
    contracts,
  };
}

#!/usr/bin/env -S deno run -A

/**
 * Pre-load top tokens from CoinGecko API
 * Fetches top 500 tokens by market cap and adds them to verified_projects
 */

import "https://deno.land/std@0.216.0/dotenv/load.ts";
import { initializeDatabase } from "../utils/db.ts";
import { saveVerifiedProject, createUlid, getVerifiedByUsername } from "../utils/database.ts";
import { lookupEthosUserByTwitter } from "../utils/project-validation.ts";

interface CoinGeckoToken {
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
    twitter_screen_name?: string;
  };
  platforms: Record<string, string>;
  image: {
    large: string;
  };
}

const COINGECKO_API_KEY = Deno.env.get("COINGECKO_API_KEY");
const COINGECKO_API_BASE = COINGECKO_API_KEY 
  ? "https://pro-api.coingecko.com/api/v3"
  : "https://api.coingecko.com/api/v3";

const CHAIN_MAPPING: Record<string, string> = {
  "ethereum": "ethereum",
  "binance-smart-chain": "bsc",
  "base": "base",
  "solana": "solana",
};

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTopTokens(page: number = 1, perPage: number = 250): Promise<CoinGeckoToken[]> {
  try {
    const headers: Record<string, string> = {
      "accept": "application/json",
    };
    
    if (COINGECKO_API_KEY) {
      headers["x-cg-pro-api-key"] = COINGECKO_API_KEY;
    }
    
    const url = `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`;
    
    console.log(`Fetching page ${page}...`);
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching tokens from CoinGecko:", error);
    return [];
  }
}

async function fetchTokenDetails(coinId: string): Promise<CoinGeckoDetail | null> {
  try {
    const headers: Record<string, string> = {
      "accept": "application/json",
    };
    
    if (COINGECKO_API_KEY) {
      headers["x-cg-pro-api-key"] = COINGECKO_API_KEY;
    }
    
    const url = `${COINGECKO_API_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`;
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching details for ${coinId}:`, error);
    return null;
  }
}

async function preloadCoinGeckoTokens() {
  console.log("🚀 Starting CoinGecko token pre-load...\n");
  
  await initializeDatabase();
  
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  
  // Fetch top 500 tokens (2 pages of 250)
  for (let page = 1; page <= 2; page++) {
    const tokens = await fetchTopTokens(page, 250);
    
    console.log(`\n📊 Processing page ${page} (${tokens.length} tokens)...`);
    
    for (const token of tokens) {
      try {
        // Fetch detailed info to get Twitter handle
        const details = await fetchTokenDetails(token.id);
        await delay(1300); // Rate limiting: ~50 requests per minute (free tier)
        
        if (!details || !details.links.twitter_screen_name) {
          console.log(`⏭️  Skipping ${token.name} - no Twitter`);
          totalSkipped++;
          continue;
        }
        
        const twitterHandle = details.links.twitter_screen_name;
        
        // Check if already exists
        const existing = await getVerifiedByUsername(twitterHandle);
        if (existing) {
          console.log(`⏭️  Skipping ${token.name} (@${twitterHandle}) - already exists`);
          totalSkipped++;
          continue;
        }
        
        // Lookup Ethos profile
        const ethosUser = await lookupEthosUserByTwitter(twitterHandle);
        await delay(200); // Small delay for Ethos API
        
        if (!ethosUser) {
          console.log(`⚠️  ${token.name} (@${twitterHandle}) - no Ethos profile`);
          totalSkipped++;
          continue;
        }
        
        // Determine chain and contract address
        let chain = "ethereum";
        let contractAddress: string | undefined;
        
        // Check platforms for supported chains
        for (const [platform, address] of Object.entries(details.platforms)) {
          if (CHAIN_MAPPING[platform] && address) {
            chain = CHAIN_MAPPING[platform];
            contractAddress = address;
            break;
          }
        }
        
        // Save to database
        const success = await saveVerifiedProject({
          id: createUlid(),
          ethosUserId: ethosUser.id,
          twitterUsername: twitterHandle,
          displayName: token.name,
          avatarUrl: details.image.large || ethosUser.avatarUrl,
          type: "token",
          chain: chain as "ethereum" | "base" | "solana" | "bsc",
          link: contractAddress,
          coinGeckoId: token.id,
          ticker: token.symbol.toUpperCase(),
          isVerified: true,
          verifiedAt: Date.now(),
          verifiedBy: "coingecko-import",
          createdAt: Date.now(),
        });
        
        if (success) {
          console.log(`✅ Added ${token.name} (@${twitterHandle}) - ${chain} - $${token.symbol.toUpperCase()}`);
          totalAdded++;
        } else {
          console.error(`❌ Failed to save ${token.name}`);
          totalFailed++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${token.name}:`, error);
        totalFailed++;
      }
    }
    
    console.log(`\n📊 Page ${page} complete - Added: ${totalAdded}, Skipped: ${totalSkipped}, Failed: ${totalFailed}`);
    
    // Delay between pages
    if (page < 2) {
      console.log("\n⏸️  Waiting 5 seconds before next page...\n");
      await delay(5000);
    }
  }
  
  console.log("\n\n" + "=".repeat(60));
  console.log("🎉 CoinGecko import complete!");
  console.log("=".repeat(60));
  console.log(`✅ Successfully added: ${totalAdded} tokens`);
  console.log(`⏭️  Skipped: ${totalSkipped} tokens`);
  console.log(`❌ Failed: ${totalFailed} tokens`);
  console.log("=".repeat(60));
}

if (import.meta.main) {
  preloadCoinGeckoTokens().catch(console.error);
}


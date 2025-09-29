#!/usr/bin/env -S deno run -A
// Script to bulk import top tokens from CoinGecko

import "$std/dotenv/load.ts";
import { initializeDatabase } from "../utils/db.ts";
import { createUlid, saveVerifiedProject } from "../utils/database.ts";
import { searchUsersByTwitter } from "../utils/ethos-api.ts";
import { buildCoinGeckoUrl, waitForRateLimit } from "../utils/coingecko-api.ts";

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
}

interface CoinGeckoDetail {
  id: string;
  symbol: string;
  name: string;
  links: {
    homepage: string[];
    twitter_screen_name: string;
  };
  image: {
    large: string;
  };
  platforms: Record<string, string>;
}

async function getTopTokens(limit = 1000): Promise<CoinGeckoMarketData[]> {
  const perPage = 250; // CoinGecko limit per request
  const pages = Math.ceil(limit / perPage);
  const allTokens: CoinGeckoMarketData[] = [];
  
  for (let page = 1; page <= pages; page++) {
    try {
      console.log(`📊 Fetching page ${page}/${pages} from CoinGecko...`);
      
      const url = buildCoinGeckoUrl("/coins/markets", {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: String(perPage),
        page: String(page),
        sparkline: "false",
        locale: "en",
      });
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Failed to fetch page ${page}: ${response.status}`);
        break;
      }
      
      const pageTokens: CoinGeckoMarketData[] = await response.json();
      allTokens.push(...pageTokens);
      
      // Rate limiting
      await waitForRateLimit(2000);
      
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      break;
    }
  }
  
  return allTokens.slice(0, limit);
}

async function getTokenDetails(coinId: string): Promise<CoinGeckoDetail | null> {
  try {
    // IMPORTANT: Set community_data=true to get Twitter information!
    const url = buildCoinGeckoUrl(`/coins/${coinId}`, {
      localization: "false",
      tickers: "false",
      market_data: "false",
      community_data: "true",
      developer_data: "false",
      sparkline: "false",
    });
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const detail: CoinGeckoDetail = await response.json();
    return detail;
    
  } catch (_err) {
    return null;
  }
}

function extractContracts(platforms: Record<string, string>): Array<{ chain: "ethereum" | "base" | "solana" | "bsc" | "plasma"; address: string }> {
  const contracts: Array<{ chain: "ethereum" | "base" | "solana" | "bsc" | "plasma"; address: string }> = [];
  
  if (platforms.ethereum && platforms.ethereum !== "") {
    contracts.push({ chain: "ethereum", address: platforms.ethereum });
  }
  
  if (platforms.base && platforms.base !== "") {
    contracts.push({ chain: "base", address: platforms.base });
  }
  
  if (platforms.solana && platforms.solana !== "") {
    contracts.push({ chain: "solana", address: platforms.solana });
  }
  
  if (platforms["binance-smart-chain"] && platforms["binance-smart-chain"] !== "") {
    contracts.push({ chain: "bsc", address: platforms["binance-smart-chain"] });
  }
  
  if (platforms.plasma && platforms.plasma !== "") {
    contracts.push({ chain: "plasma", address: platforms.plasma });
  }
  
  return contracts;
}

async function findEthosUser(twitterHandle: string): Promise<{ id: number; username: string; displayName: string; avatarUrl: string } | null> {
  try {
    const users = await searchUsersByTwitter(twitterHandle);
    
    // Find exact match by username
    const exactMatch = users.find(u => 
      u.username?.toLowerCase() === twitterHandle.toLowerCase()
    );
    
    if (exactMatch) {
      return {
        id: exactMatch.userID,
        username: exactMatch.username || exactMatch.displayName,
        displayName: exactMatch.displayName,
        avatarUrl: exactMatch.avatarUrl,
      };
    }
    
    return null;
  } catch (_err) {
    return null;
  }
}

async function importTokens() {
  console.log("🚀 Starting bulk token import from CoinGecko...");
  
  // Initialize database
  await initializeDatabase();
  
  // Get top tokens
  console.log("📊 Fetching top 1000 tokens from CoinGecko...");
  const topTokens = await getTopTokens(1000);
  
  console.log(`✅ Found ${topTokens.length} tokens`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const [index, token] of topTokens.entries()) {
    console.log(`\n[${index + 1}/${topTokens.length}] Processing ${token.name} (${token.symbol.toUpperCase()})...`);
    
    try {
      // Get detailed info including social links
      const detail = await getTokenDetails(token.id);
      
      if (!detail?.links?.twitter_screen_name) {
        console.log(`⏭️  No Twitter handle found for ${token.name}`);
        skipped++;
        continue;
      }
      
      const twitterHandle = detail.links.twitter_screen_name;
      console.log(`🐦 Twitter: @${twitterHandle}`);
      
      // Check if we can find this user on Ethos
      const ethosUser = await findEthosUser(twitterHandle);
      
      if (!ethosUser) {
        console.log(`⏭️  No Ethos user found for @${twitterHandle}`);
        skipped++;
        continue;
      }
      
      console.log(`✅ Found Ethos user: ${ethosUser.displayName}`);
      
      // Get contracts
      const contracts = extractContracts(detail.platforms || {});
      
      if (contracts.length === 0) {
        console.log(`⏭️  No supported contracts found for ${token.name}`);
        skipped++;
        continue;
      }
      
      // Save each contract as a verified project
      for (const contract of contracts) {
        const success = await saveVerifiedProject({
          id: createUlid(),
          ethosUserId: ethosUser.id, // Use .id field from Ethos API
          twitterUsername: twitterHandle,
          displayName: detail.name,
          avatarUrl: detail.image?.large || ethosUser.avatarUrl,
          type: "token",
          chain: contract.chain,
          link: contract.address,
          createdAt: Date.now(),
        });
        
        if (success) {
          console.log(`💾 Saved: ${detail.name} on ${contract.chain} (${contract.address.slice(0, 10)}...)`);
          imported++;
        } else {
          console.log(`❌ Failed to save: ${detail.name} on ${contract.chain}`);
          errors++;
        }
      }
      
      // Rate limiting - be respectful to APIs
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error processing ${token.name}:`, error);
      errors++;
    }
  }
  
  console.log(`\n🎉 Import Complete!`);
  console.log(`✅ Imported: ${imported} verified projects`);
  console.log(`⏭️  Skipped: ${skipped} tokens (no Twitter or Ethos match)`);
  console.log(`❌ Errors: ${errors} failed imports`);
}

// Run the import
if (import.meta.main) {
  await importTokens();
}

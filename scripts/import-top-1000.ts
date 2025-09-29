#!/usr/bin/env -S deno run -A
// Import top 1000 tokens from CoinGecko with Twitter data

import "$std/dotenv/load.ts";
import { initializeDatabase } from "../utils/db.ts";
import { createUlid, saveVerifiedProject } from "../utils/database.ts";
import { searchUsersByTwitter } from "../utils/ethos-api.ts";

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank: number;
}

interface CoinGeckoDetail {
  id: string;
  symbol: string;
  name: string;
  links: {
    twitter_screen_name: string;
  };
  image: {
    large: string;
  };
  platforms: Record<string, string>;
}

async function getTop1000Tokens(): Promise<CoinGeckoMarket[]> {
  console.log("📊 Fetching top 1000 tokens from CoinGecko...");
  
  const perPage = 250;
  const pages = 4; // 4 pages × 250 = 1000 tokens
  const allTokens: CoinGeckoMarket[] = [];
  
  for (let page = 1; page <= pages; page++) {
    try {
      console.log(`   📄 Page ${page}/${pages}...`);
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`
      );
      
      if (!response.ok) {
        console.error(`❌ Failed to fetch page ${page}: ${response.status}`);
        break;
      }
      
      const pageTokens: CoinGeckoMarket[] = await response.json();
      allTokens.push(...pageTokens);
      
      // Rate limiting for free tier (10 calls/minute)
      await new Promise(resolve => setTimeout(resolve, 7000)); // 7 second delay
      
    } catch (error) {
      console.error(`❌ Error fetching page ${page}:`, error);
      break;
    }
  }
  
  return allTokens;
}

async function getTokenWithTwitter(coinId: string): Promise<CoinGeckoDetail | null> {
  try {
    // Include community_data to get Twitter information
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=false&sparkline=false`
    );
    
    if (!response.ok) return null;
    
    const detail: CoinGeckoDetail = await response.json();
    
    // Only return if it has Twitter data
    return detail.links?.twitter_screen_name ? detail : null;
    
  } catch (_err) {
    return null;
  }
}

function extractContracts(platforms: Record<string, string>): Array<{ chain: "ethereum" | "base" | "solana" | "bsc" | "plasma"; address: string }> {
  const contracts: Array<{ chain: "ethereum" | "base" | "solana" | "bsc" | "plasma"; address: string }> = [];
  
  if (platforms.ethereum && platforms.ethereum.trim() !== "") {
    contracts.push({ chain: "ethereum", address: platforms.ethereum });
  }
  
  if (platforms.base && platforms.base.trim() !== "") {
    contracts.push({ chain: "base", address: platforms.base });
  }
  
  if (platforms.solana && platforms.solana.trim() !== "") {
    contracts.push({ chain: "solana", address: platforms.solana });
  }
  
  if (platforms["binance-smart-chain"] && platforms["binance-smart-chain"].trim() !== "") {
    contracts.push({ chain: "bsc", address: platforms["binance-smart-chain"] });
  }
  
  if (platforms.plasma && platforms.plasma.trim() !== "") {
    contracts.push({ chain: "plasma", address: platforms.plasma });
  }
  
  return contracts;
}

async function importTop1000() {
  console.log("🚀 Starting import of top 1000 tokens with Twitter data...");
  console.log("⚠️  This will take ~2 hours due to rate limiting (respecting CoinGecko free tier)");
  
  await initializeDatabase();
  
  // Get top 1000 tokens
  const tokens = await getTop1000Tokens();
  console.log(`✅ Retrieved ${tokens.length} tokens from CoinGecko`);
  
  let processed = 0;
  let imported = 0;
  let noTwitter = 0;
  let noEthos = 0;
  let noContracts = 0;
  let errors = 0;
  
  console.log("\n🔍 Processing tokens for Twitter + Ethos + Contract data...\n");
  
  for (const token of tokens) {
    processed++;
    console.log(`[${processed}/${tokens.length}] ${token.name} (${token.symbol.toUpperCase()}) - Rank #${token.market_cap_rank}`);
    
    try {
      // Get detailed info including Twitter
      const detail = await getTokenWithTwitter(token.id);
      
      if (!detail?.links?.twitter_screen_name) {
        console.log(`   ⏭️  No Twitter handle`);
        noTwitter++;
        
        // Rate limiting even for skipped items
        await new Promise(resolve => setTimeout(resolve, 8000));
        continue;
      }
      
      const twitterHandle = detail.links.twitter_screen_name;
      console.log(`   🐦 Twitter: @${twitterHandle}`);
      
      // Search for this user on Ethos
      const ethosUsers = await searchUsersByTwitter(twitterHandle);
      const ethosUser = ethosUsers.find(u => 
        u.username?.toLowerCase() === twitterHandle.toLowerCase()
      );
      
      if (!ethosUser) {
        console.log(`   ❌ Not found on Ethos`);
        noEthos++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 8000));
        continue;
      }
      
      console.log(`   ✅ Found on Ethos: ${ethosUser.displayName}`);
      
      // Get contract addresses
      const contracts = extractContracts(detail.platforms || {});
      
      if (contracts.length === 0) {
        console.log(`   ⚠️  No supported contracts`);
        noContracts++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 8000));
        continue;
      }
      
      console.log(`   📄 Contracts: ${contracts.length} found`);
      
      // Save each contract as a verified project
      for (const contract of contracts) {
        const success = await saveVerifiedProject({
          id: createUlid(),
          ethosUserId: ethosUser.id,
          twitterUsername: twitterHandle,
          displayName: detail.name,
          avatarUrl: detail.image?.large || ethosUser.avatarUrl,
          type: "token",
          chain: contract.chain,
          link: contract.address,
          createdAt: Date.now(),
        });
        
        if (success) {
          console.log(`   💾 ✅ Saved on ${contract.chain}: ${contract.address.slice(0, 12)}...`);
          imported++;
        } else {
          console.log(`   ❌ Failed to save on ${contract.chain}`);
          errors++;
        }
      }
      
      // Progress update every 50 tokens
      if (processed % 50 === 0) {
        console.log(`\n📊 Progress Update:`);
        console.log(`   Processed: ${processed}/${tokens.length} (${(processed/tokens.length*100).toFixed(1)}%)`);
        console.log(`   ✅ Imported: ${imported} projects`);
        console.log(`   ⏭️  No Twitter: ${noTwitter}`);
        console.log(`   ❌ No Ethos: ${noEthos}`);
        console.log(`   ⚠️  No contracts: ${noContracts}`);
        console.log(`   🔥 Errors: ${errors}\n`);
      }
      
      // Rate limiting - CoinGecko free tier allows ~10 calls/minute
      // Using 8 seconds = 7.5 calls/minute to be safe
      await new Promise(resolve => setTimeout(resolve, 8000));
      
    } catch (error) {
      console.error(`❌ Error processing ${token.name}:`, error);
      errors++;
      
      // Still rate limit on errors
      await new Promise(resolve => setTimeout(resolve, 8000));
    }
  }
  
  console.log(`\n🎉 Import Complete!`);
  console.log(`📊 Final Results:`);
  console.log(`   Processed: ${processed} tokens`);
  console.log(`   ✅ Successfully imported: ${imported} verified projects`);
  console.log(`   ⏭️  No Twitter: ${noTwitter} tokens`);
  console.log(`   ❌ Not on Ethos: ${noEthos} tokens`);
  console.log(`   ⚠️  No contracts: ${noContracts} tokens`);
  console.log(`   🔥 Errors: ${errors} failed imports`);
  console.log(`\n🌐 Check http://localhost:8000/admin/verified to see all imported projects!`);
}

if (import.meta.main) {
  await importTop1000();
}



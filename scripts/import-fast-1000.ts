#!/usr/bin/env -S deno run -A
// Fast import of top 1000 tokens using optimized CoinGecko approach

import "$std/dotenv/load.ts";
import { initializeDatabase } from "../utils/db.ts";
import { createUlid, saveVerifiedProject } from "../utils/database.ts";
import { searchUsersByTwitter } from "../utils/ethos-api.ts";

interface TokenData {
  id: string;
  name: string;
  symbol: string;
  rank: number;
}

async function getTop1000TokensFast(): Promise<TokenData[]> {
  console.log("📊 Fetching top 1000 tokens (fast approach)...");
  
  const perPage = 250;
  const pages = 4; // 4 × 250 = 1000
  const allTokens: TokenData[] = [];
  
  // Fetch all pages in parallel for speed (market data is simple)
  const promises = [];
  for (let page = 1; page <= pages; page++) {
    promises.push(
      fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`)
        .then(r => r.json())
        .then(data => data.map((token: any) => ({
          id: token.id,
          name: token.name,
          symbol: token.symbol,
          rank: token.market_cap_rank
        })))
    );
  }
  
  try {
    const results = await Promise.all(promises);
    for (const pageTokens of results) {
      allTokens.push(...pageTokens);
    }
  } catch (error) {
    console.error("Error fetching token list:", error);
  }
  
  return allTokens.slice(0, 1000).sort((a, b) => a.rank - b.rank);
}

async function getTokenSocialData(coinId: string): Promise<{twitter?: string; contracts: Record<string, string>} | null> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=false&sparkline=false`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    return {
      twitter: data.links?.twitter_screen_name || undefined,
      contracts: data.platforms || {}
    };
    
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

async function fastImport() {
  console.log("🚀 Fast import of top 1000 tokens with optimized rate limiting...");
  console.log("⚡ Estimated completion: ~50 minutes (vs 2+ hours with slow approach)");
  
  await initializeDatabase();
  
  // Get all 1000 tokens quickly using parallel requests
  const tokens = await getTop1000TokensFast();
  console.log(`✅ Retrieved ${tokens.length} tokens`);
  
  let processed = 0;
  let imported = 0;
  let noTwitter = 0;
  let noEthos = 0;
  let noContracts = 0;
  let errors = 0;
  
  console.log("\n🔍 Processing tokens for Twitter + Ethos + Contract data...\n");
  
  for (const token of tokens) {
    processed++;
    console.log(`[${processed}/${tokens.length}] ${token.name} (${token.symbol.toUpperCase()}) - Rank #${token.rank}`);
    
    try {
      // Get social and contract data
      const socialData = await getTokenSocialData(token.id);
      
      if (!socialData?.twitter) {
        console.log(`   ⏭️  No Twitter handle`);
        noTwitter++;
        
        // Faster rate limiting: 3 seconds instead of 8
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      
      const twitterHandle = socialData.twitter;
      console.log(`   🐦 Twitter: @${twitterHandle}`);
      
      // Search Ethos (with caching to avoid repeated searches)
      const ethosUsers = await searchUsersByTwitter(twitterHandle);
      const ethosUser = ethosUsers.find(u => 
        u.username?.toLowerCase() === twitterHandle.toLowerCase()
      );
      
      if (!ethosUser) {
        console.log(`   ❌ Not found on Ethos`);
        noEthos++;
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      
      console.log(`   ✅ Found on Ethos: ${ethosUser.displayName}`);
      
      // Get contracts
      const contracts = extractContracts(socialData.contracts);
      
      if (contracts.length === 0) {
        console.log(`   ⚠️  No supported contracts`);
        noContracts++;
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      
      console.log(`   📄 Contracts: ${contracts.map(c => `${c.chain}:${c.address.slice(0,8)}...`).join(", ")}`);
      
      // Save each contract
      for (const contract of contracts) {
        const success = await saveVerifiedProject({
          id: createUlid(),
          ethosUserId: ethosUser.id,
          twitterUsername: twitterHandle,
          displayName: token.name,
          avatarUrl: ethosUser.avatarUrl,
          type: "token",
          chain: contract.chain,
          link: contract.address,
          createdAt: Date.now(),
        });
        
        if (success) {
          console.log(`   💾 ✅ Saved on ${contract.chain}`);
          imported++;
        } else {
          console.log(`   ❌ Failed to save on ${contract.chain}`);
          errors++;
        }
      }
      
      // Progress update every 25 tokens
      if (processed % 25 === 0) {
        const progressPct = (processed / tokens.length * 100).toFixed(1);
        const timeElapsed = processed * 3; // 3 seconds per token
        const estimatedTotal = tokens.length * 3;
        const remaining = Math.max(0, estimatedTotal - timeElapsed);
        
        console.log(`\n📊 Progress Update (${progressPct}%):`);
        console.log(`   ✅ Imported: ${imported} projects`);
        console.log(`   ⏭️  No Twitter: ${noTwitter}`);
        console.log(`   ❌ No Ethos: ${noEthos}`);
        console.log(`   ⚠️  No contracts: ${noContracts}`);
        console.log(`   🔥 Errors: ${errors}`);
        console.log(`   ⏱️  Est. remaining: ${Math.round(remaining / 60)} minutes\n`);
      }
      
      // 3 second rate limiting (20 calls/minute - well within limits)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error(`❌ Error processing ${token.name}:`, error);
      errors++;
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log(`\n🎉 Fast Import Complete!`);
  console.log(`📊 Final Results:`);
  console.log(`   Processed: ${processed} tokens`);
  console.log(`   ✅ Successfully imported: ${imported} verified projects`);
  console.log(`   ⏭️  No Twitter: ${noTwitter} tokens`);
  console.log(`   ❌ Not on Ethos: ${noEthos} tokens`);
  console.log(`   ⚠️  No contracts: ${noContracts} tokens`);
  console.log(`   🔥 Errors: ${errors} failed imports`);
  console.log(`\n🌐 Check http://localhost:8000/admin/verified to see all ${imported} imported projects!`);
}

if (import.meta.main) {
  await fastImport();
}



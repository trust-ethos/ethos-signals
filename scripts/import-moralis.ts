#!/usr/bin/env -S deno run -A
// Fast import using Moralis API (much higher rate limits than CoinGecko)

import "$std/dotenv/load.ts";
import { initializeDatabase } from "../utils/db.ts";
import { createUlid, saveVerifiedProject } from "../utils/database.ts";
import { searchUsersByTwitter } from "../utils/ethos-api.ts";

interface MoralisToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
  thumbnail?: string;
  possible_spam: boolean;
  verified_contract: boolean;
}

function getMoralisApiKey(): string {
  return Deno.env.get("MORALIS_API_KEY") || "";
}

async function getTopTokensByMarketCap(chain: "eth" | "base" | "solana" = "eth", limit = 500): Promise<MoralisToken[]> {
  const apiKey = getMoralisApiKey();
  if (!apiKey) {
    throw new Error("MORALIS_API_KEY is required");
  }

  console.log(`📊 Fetching top ${limit} tokens from ${chain.toUpperCase()} via Moralis...`);

  try {
    // Moralis doesn't have a direct "top tokens by market cap" endpoint
    // But we can get tokens and filter by verified_contract and !possible_spam
    const chainId = chain === "eth" ? "0x1" : chain === "base" ? "0x2105" : "devnet"; // Solana uses 'devnet'
    
    const response = await fetch(
      `https://deep-index.moralis.io/api/v2.2/erc20?chain=${chainId}&limit=${limit}`,
      {
        headers: {
          'accept': 'application/json',
          'X-API-Key': apiKey,
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Moralis API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter for high-quality tokens
    const tokens = (data.result || []).filter((token: MoralisToken) => 
      token.verified_contract && !token.possible_spam && token.name && token.symbol
    );

    return tokens;
  } catch (error) {
    console.error("Failed to fetch tokens from Moralis:", error);
    return [];
  }
}

// Alternative: Use CoinGecko's market data but with Moralis for token details
async function getTopTokensHybrid(limit = 1000): Promise<Array<{name: string; symbol: string; coinGeckoId: string; rank: number}>> {
  console.log(`📊 Getting top ${limit} tokens from CoinGecko markets...`);
  
  const perPage = 250;
  const pages = Math.ceil(limit / perPage);
  const allTokens: Array<{name: string; symbol: string; coinGeckoId: string; rank: number}> = [];
  
  for (let page = 1; page <= pages; page++) {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`
      );
      
      if (!response.ok) break;
      
      const pageTokens = await response.json();
      const formattedTokens = pageTokens.map((token: any) => ({
        name: token.name,
        symbol: token.symbol,
        coinGeckoId: token.id,
        rank: token.market_cap_rank
      }));
      
      allTokens.push(...formattedTokens);
      
      // Faster rate limiting for market data (simpler endpoint)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      break;
    }
  }
  
  return allTokens.slice(0, limit);
}

async function getTokenSocialData(coinGeckoId: string): Promise<{twitter?: string; contracts: Record<string, string>} | null> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinGeckoId}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=false&sparkline=false`
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

async function fastImportTop1000() {
  console.log("🚀 Fast import of top 1000 tokens using hybrid approach...");
  console.log("📈 This should complete in ~30-45 minutes instead of 2+ hours!");
  
  await initializeDatabase();
  
  // Get top 1000 tokens (fast)
  const tokens = await getTopTokensHybrid(1000);
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
      // Get social data and contracts
      const socialData = await getTokenSocialData(token.coinGeckoId);
      
      if (!socialData?.twitter) {
        console.log(`   ⏭️  No Twitter handle`);
        noTwitter++;
        
        // Faster rate limiting since we're using simpler CoinGecko calls
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds instead of 8
        continue;
      }
      
      const twitterHandle = socialData.twitter;
      console.log(`   🐦 Twitter: @${twitterHandle}`);
      
      // Search Ethos
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
      
      console.log(`   📄 Contracts: ${contracts.length} found`);
      
      // Save each contract
      for (const contract of contracts) {
        const success = await saveVerifiedProject({
          id: createUlid(),
          ethosUserId: ethosUser.id,
          twitterUsername: twitterHandle,
          displayName: token.name,
          avatarUrl: ethosUser.avatarUrl, // Use Ethos avatar since CoinGecko images might not work
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
      
      // Progress update every 25 tokens
      if (processed % 25 === 0) {
        const progressPct = (processed / tokens.length * 100).toFixed(1);
        const timeElapsed = processed * 3; // 3 seconds per token
        const estimatedTotal = tokens.length * 3;
        const remaining = estimatedTotal - timeElapsed;
        
        console.log(`\n📊 Progress Update (${progressPct}%):`);
        console.log(`   ✅ Imported: ${imported} projects`);
        console.log(`   ⏭️  No Twitter: ${noTwitter}`);
        console.log(`   ❌ No Ethos: ${noEthos}`);
        console.log(`   ⚠️  No contracts: ${noContracts}`);
        console.log(`   🔥 Errors: ${errors}`);
        console.log(`   ⏱️  Estimated remaining: ${Math.round(remaining / 60)} minutes\n`);
      }
      
      // 3 second rate limiting (20 calls/minute)
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
  console.log(`\n🌐 Check http://localhost:8000/admin/verified to see all imported projects!`);
}

if (import.meta.main) {
  await fastImportTop1000();
}



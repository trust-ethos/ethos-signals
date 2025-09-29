#!/usr/bin/env -S deno run -A
// Fast import using Moralis API with comprehensive token metadata

import "$std/dotenv/load.ts";
import { initializeDatabase } from "../utils/db.ts";
import { createUlid, saveVerifiedProject } from "../utils/database.ts";
import { searchUsersByTwitter } from "../utils/ethos-api.ts";

interface MoralisTokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: string;
  logo?: string;
  verified_contract: boolean;
  possible_spam: boolean;
  links?: {
    twitter?: string;
    website?: string;
    telegram?: string;
    reddit?: string;
  };
  security_score?: number;
  categories?: string[];
  market_cap?: string;
  circulating_supply?: string;
}

function getMoralisApiKey(): string {
  return Deno.env.get("MORALIS_API_KEY") || "";
}

// Get top tokens by market cap using CoinGecko (fast), then get metadata from Moralis
async function getTopTokenAddresses(limit = 500): Promise<Array<{address: string; name: string; symbol: string; rank: number}>> {
  console.log(`📊 Getting top ${limit} token addresses from CoinGecko...`);
  
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`
  );
  
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }
  
  const tokens = await response.json();
  
  // Extract Ethereum contract addresses
  const ethTokens = [];
  for (const token of tokens) {
    // Get detailed info to find contract address
    try {
      const detailResponse = await fetch(`https://api.coingecko.com/api/v3/coins/${token.id}`);
      if (detailResponse.ok) {
        const detail = await detailResponse.json();
        const ethAddress = detail.platforms?.ethereum;
        if (ethAddress && ethAddress.trim() !== "") {
          ethTokens.push({
            address: ethAddress,
            name: token.name,
            symbol: token.symbol,
            rank: token.market_cap_rank
          });
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (_err) {
      continue;
    }
  }
  
  return ethTokens;
}

async function getMoralisTokenMetadata(addresses: string[]): Promise<MoralisTokenMetadata[]> {
  const apiKey = getMoralisApiKey();
  if (!apiKey) {
    throw new Error("MORALIS_API_KEY is required");
  }

  console.log(`🔍 Getting metadata for ${addresses.length} tokens from Moralis...`);
  
  // Moralis allows batch requests - much faster!
  const batchSize = 25; // Process 25 at a time
  const allMetadata: MoralisTokenMetadata[] = [];
  
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    console.log(`   📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(addresses.length / batchSize)}: ${batch.length} tokens`);
    
    try {
      const addressParam = batch.join(',');
      const response = await fetch(
        `https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=eth&addresses=${addressParam}`,
        {
          headers: {
            'accept': 'application/json',
            'X-API-Key': apiKey,
          }
        }
      );
      
      if (response.ok) {
        const data: MoralisTokenMetadata[] = await response.json();
        
        // Filter for high-quality tokens with social data
        const qualityTokens = data.filter(token => 
          token.verified_contract && 
          !token.possible_spam && 
          token.links?.twitter &&
          token.security_score && token.security_score > 70
        );
        
        allMetadata.push(...qualityTokens);
        console.log(`   ✅ Found ${qualityTokens.length} tokens with Twitter data`);
      }
      
      // Rate limiting - Moralis has much higher limits than CoinGecko
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between batches
      
    } catch (error) {
      console.error(`❌ Error fetching batch:`, error);
    }
  }
  
  return allMetadata;
}

function extractTwitterHandle(twitterUrl?: string): string | null {
  if (!twitterUrl) return null;
  
  // Extract handle from Twitter URL
  const match = twitterUrl.match(/twitter\.com\/([^\/\?]+)/);
  return match ? match[1] : null;
}

async function fastMoralisImport() {
  console.log("🚀 Fast import using Moralis API (high rate limits!)");
  console.log("⚡ Estimated completion: ~15-20 minutes");
  
  await initializeDatabase();
  
  // Get top token addresses (fast from CoinGecko)
  const tokenAddresses = await getTopTokenAddresses(500);
  console.log(`✅ Found ${tokenAddresses.length} Ethereum tokens`);
  
  // Get metadata from Moralis (fast batch requests)
  const tokensWithMetadata = await getMoralisTokenMetadata(tokenAddresses.map(t => t.address));
  console.log(`✅ Found ${tokensWithMetadata.length} tokens with Twitter data`);
  
  let imported = 0;
  let noEthos = 0;
  let errors = 0;
  
  console.log("\n🔍 Processing tokens for Ethos matching...\n");
  
  for (const [index, token] of tokensWithMetadata.entries()) {
    const twitterHandle = extractTwitterHandle(token.links?.twitter);
    
    if (!twitterHandle) continue;
    
    console.log(`[${index + 1}/${tokensWithMetadata.length}] ${token.name} (@${twitterHandle})`);
    
    try {
      // Search Ethos
      const ethosUsers = await searchUsersByTwitter(twitterHandle);
      const ethosUser = ethosUsers.find(u => 
        u.username?.toLowerCase() === twitterHandle.toLowerCase()
      );
      
      if (!ethosUser) {
        console.log(`   ❌ Not found on Ethos`);
        noEthos++;
        continue;
      }
      
      console.log(`   ✅ Found on Ethos: ${ethosUser.displayName}`);
      
      // Save the verified project
      const success = await saveVerifiedProject({
        id: createUlid(),
        ethosUserId: ethosUser.id,
        twitterUsername: twitterHandle,
        displayName: token.name,
        avatarUrl: token.logo || ethosUser.avatarUrl,
        type: "token",
        chain: "ethereum",
        link: token.address,
        createdAt: Date.now(),
      });
      
      if (success) {
        console.log(`   💾 ✅ Saved: ${token.address.slice(0, 12)}...`);
        imported++;
      } else {
        console.log(`   ❌ Failed to save`);
        errors++;
      }
      
      // Faster rate limiting since Moralis has higher limits
      await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 seconds
      
    } catch (error) {
      console.error(`   ❌ Error:`, error);
      errors++;
    }
  }
  
  console.log(`\n🎉 Moralis Import Complete!`);
  console.log(`📊 Results:`);
  console.log(`   ✅ Imported: ${imported} verified projects`);
  console.log(`   ❌ Not on Ethos: ${noEthos} tokens`);
  console.log(`   🔥 Errors: ${errors} failed imports`);
  console.log(`\n🌐 Check http://localhost:8000/admin/verified to see all imported projects!`);
}

if (import.meta.main) {
  await fastMoralisImport();
}



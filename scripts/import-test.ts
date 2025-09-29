#!/usr/bin/env -S deno run -A
// Test script to import top 10 tokens from CoinGecko

import "$std/dotenv/load.ts";
import { initializeDatabase } from "../utils/db.ts";
import { createUlid, saveVerifiedProject } from "../utils/database.ts";
import { searchUsersByTwitter } from "../utils/ethos-api.ts";

async function getTop10Tokens() {
  console.log("📊 Fetching top 10 tokens from CoinGecko...");
  
  const response = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&locale=en"
  );
  
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }
  
  return await response.json();
}

async function getTokenDetail(coinId: string) {
  console.log(`🔍 Getting details for ${coinId}...`);
  
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=false&sparkline=false`
  );
  
  if (!response.ok) return null;
  
  return await response.json();
}

async function testImport() {
  console.log("🚀 Testing token import...");
  
  await initializeDatabase();
  
  const tokens = await getTop10Tokens();
  console.log(`✅ Found ${tokens.length} top tokens`);
  
  for (const [index, token] of tokens.entries()) {
    console.log(`\n[${index + 1}/10] ${token.name} (${token.symbol.toUpperCase()}) - Rank #${token.market_cap_rank}`);
    
    try {
      const detail = await getTokenDetail(token.id);
      
      if (detail?.links?.twitter_screen_name) {
        console.log(`🐦 Twitter: @${detail.links.twitter_screen_name}`);
        
        // Check if we can find on Ethos
        const ethosUsers = await searchUsersByTwitter(detail.links.twitter_screen_name);
        const exactMatch = ethosUsers.find(u => 
          u.username?.toLowerCase() === detail.links.twitter_screen_name.toLowerCase()
        );
        
        if (exactMatch) {
          console.log(`✅ Found on Ethos: ${exactMatch.displayName}`);
          
          // Get contract addresses
          const contracts: string[] = [];
          if (detail.platforms?.ethereum) contracts.push(`ETH: ${detail.platforms.ethereum}`);
          if (detail.platforms?.base) contracts.push(`BASE: ${detail.platforms.base}`);
          if (detail.platforms?.solana) contracts.push(`SOL: ${detail.platforms.solana}`);
          
          if (contracts.length > 0) {
            console.log(`📄 Contracts: ${contracts.join(", ")}`);
            console.log(`✨ Ready to import!`);
          } else {
            console.log(`⚠️  No supported contracts found`);
          }
        } else {
          console.log(`❌ Not found on Ethos`);
        }
      } else {
        console.log(`❌ No Twitter handle`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error:`, error);
    }
  }
  
  console.log(`\n🎯 Test complete! Run 'deno task import-tokens' to do the full import.`);
}

if (import.meta.main) {
  await testImport();
}

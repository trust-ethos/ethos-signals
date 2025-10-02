#!/usr/bin/env -S deno run -A

/**
 * Automatically fetch and update CoinGecko IDs for tokens
 * Uses contract addresses to look up the correct CoinGecko ID
 * 
 * NOTE: New tokens are automatically looked up when saved via /api/verified
 * This script is for BACKFILLING existing tokens without CoinGecko IDs
 */

import { getDbClient } from "../utils/db.ts";

interface CoinGeckoSearchResult {
  id: string;
  name: string;
  symbol: string;
  platforms: Record<string, string>;
}

// Map our chain names to CoinGecko platform names
const CHAIN_MAP: Record<string, string> = {
  "ethereum": "ethereum",
  "base": "base",
  "solana": "solana",
  "bsc": "binance-smart-chain",
  "plasma": "plasma", // May not be supported by CoinGecko
  "hyperliquid": "hyperliquid", // May not be supported by CoinGecko
};

async function searchCoinGecko(contractAddress: string, chain: string): Promise<string | null> {
  const cgChain = CHAIN_MAP[chain];
  if (!cgChain) {
    console.log(`  ⚠️  Chain ${chain} not mapped to CoinGecko platform`);
    return null;
  }

  // Search by contract address
  const searchUrl = `https://api.coingecko.com/api/v3/search?query=${contractAddress}`;
  
  try {
    const response = await fetch(searchUrl);
    if (!response.ok) {
      console.log(`  ⚠️  CoinGecko API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    // Look for a coin that matches our contract address on the right chain
    for (const coin of (data.coins || [])) {
      const platforms = coin.platforms || {};
      const platformAddress = platforms[cgChain]?.toLowerCase();
      
      if (platformAddress === contractAddress.toLowerCase()) {
        return coin.id;
      }
    }

    // If no exact match, try fetching coin details for each result
    for (const coin of (data.coins || []).slice(0, 5)) { // Check first 5 results
      try {
        const detailUrl = `https://api.coingecko.com/api/v3/coins/${coin.id}`;
        const detailResponse = await fetch(detailUrl);
        
        if (detailResponse.ok) {
          const detail = await detailResponse.json();
          const platformAddress = detail.platforms?.[cgChain]?.toLowerCase();
          
          if (platformAddress === contractAddress.toLowerCase()) {
            return detail.id;
          }
        }
        
        // Rate limit: wait 6 seconds between detail requests (CoinGecko free tier)
        await new Promise(resolve => setTimeout(resolve, 6000));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(`  ⚠️  Error fetching details for ${coin.id}:`, message);
      }
    }

    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  ⚠️  Error searching CoinGecko:`, message);
    return null;
  }
}

async function main() {
  console.log("🔍 Finding tokens without CoinGecko IDs...\n");

  const client = await getDbClient();

  // Get all tokens without CoinGecko IDs
  const result = await client.queryObject<{
    twitter_username: string;
    display_name: string;
    chain: string;
    link: string;
    coingecko_id: string | null;
  }>(`
    SELECT twitter_username, display_name, chain, link, coingecko_id
    FROM verified_projects
    WHERE type = 'token' 
      AND coingecko_id IS NULL
      AND link IS NOT NULL
    ORDER BY chain, twitter_username
  `);

  if (result.rows.length === 0) {
    console.log("✅ All tokens already have CoinGecko IDs!");
    return;
  }

  console.log(`Found ${result.rows.length} tokens without CoinGecko IDs:\n`);

  let updated = 0;
  let failed = 0;

  for (const token of result.rows) {
    console.log(`🔎 @${token.twitter_username} (${token.display_name}) on ${token.chain}`);
    console.log(`   Contract: ${token.link}`);

    const coingeckoId = await searchCoinGecko(token.link, token.chain);

    if (coingeckoId) {
      console.log(`   ✅ Found CoinGecko ID: ${coingeckoId}`);
      
      // Update the database
      await client.queryObject(`
        UPDATE verified_projects
        SET coingecko_id = $1
        WHERE twitter_username = $2
      `, [coingeckoId, token.twitter_username]);

      updated++;
    } else {
      console.log(`   ❌ No CoinGecko ID found`);
      failed++;
    }

    console.log();

    // Rate limit: wait 6 seconds between requests (CoinGecko free tier)
    if (result.rows.indexOf(token) < result.rows.length - 1) {
      console.log("⏳ Waiting 6 seconds to respect rate limits...\n");
      await new Promise(resolve => setTimeout(resolve, 6000));
    }
  }

  console.log("\n📊 Summary:");
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ❌ Not found: ${failed}`);
  console.log(`   📈 Total processed: ${result.rows.length}`);

  if (updated > 0) {
    console.log("\n🎉 Updated tokens will now have hourly price data!");
  }
}

if (import.meta.main) {
  main();
}


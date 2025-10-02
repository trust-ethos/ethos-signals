#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Test script for OpenSea API integration
 * Tests NFT floor price fetching for Hypurr on Hyperliquid
 */

import { getOpenSeaFloorNow, getOpenSeaCollectionInfo } from "../utils/opensea-api.ts";

const HYPURR_CONTRACT = "0x9125e2d6827a00b0f8330d6ef7bef07730bac685";

console.log("🧪 Testing OpenSea API Integration");
console.log("===================================");
console.log("");

// Check if API key is set
const apiKey = Deno.env.get("OPENSEA_API_KEY");
if (!apiKey) {
  console.log("❌ OPENSEA_API_KEY not set in environment");
  console.log("");
  console.log("To fix:");
  console.log('  1. Get an API key from https://docs.opensea.io/reference/api-keys');
  console.log('  2. Add to .env file: OPENSEA_API_KEY=your_key_here');
  console.log('  3. Re-run this script');
  Deno.exit(1);
}

console.log("✅ API key found");
console.log("");

// Test 1: Get Hypurr floor price
console.log("Test 1: Fetching Hypurr NFT floor price...");
console.log(`  Contract: ${HYPURR_CONTRACT}`);
console.log(`  Chain: hyperliquid`);
console.log("");

try {
  const floorPrice = await getOpenSeaFloorNow("hyperliquid", HYPURR_CONTRACT);
  
  if (floorPrice !== null) {
    console.log(`✅ Floor price: ${floorPrice} ETH`);
    console.log(`   USD estimate: $${(floorPrice * 3000).toLocaleString()} (at $3k/ETH)`);
  } else {
    console.log("❌ Floor price not available");
    console.log("   Possible reasons:");
    console.log("   - Collection not on OpenSea yet");
    console.log("   - API key permissions issue");
    console.log("   - Rate limit hit");
  }
} catch (error) {
  console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
}

console.log("");

// Test 2: Get collection info
console.log("Test 2: Fetching Hypurr collection info...");
console.log("");

try {
  const info = await getOpenSeaCollectionInfo(HYPURR_CONTRACT);
  
  if (info) {
    console.log("✅ Collection found:");
    console.log(`   Name: ${info.name}`);
    console.log(`   Description: ${info.description?.substring(0, 100)}...`);
    console.log(`   Category: ${info.category}`);
    console.log(`   OpenSea URL: ${info.opensea_url}`);
    if (info.twitter_username) {
      console.log(`   Twitter: @${info.twitter_username}`);
    }
  } else {
    console.log("❌ Collection info not available");
  }
} catch (error) {
  console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
}

console.log("");
console.log("===================================");
console.log("🎉 OpenSea API test complete!");


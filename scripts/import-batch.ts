#!/usr/bin/env -S deno run -A
// Import tokens in small batches to avoid CoinGecko rate limiting issues

import "$std/dotenv/load.ts";
import { initializeDatabase } from "../utils/db.ts";
import { createUlid, saveVerifiedProject } from "../utils/database.ts";
import { searchUsersByTwitter } from "../utils/ethos-api.ts";

// Pre-verified tokens with known working Twitter handles and contracts
// This avoids the CoinGecko API limitations
const WORKING_TOKENS = [
  {
    name: "Bitcoin",
    symbol: "BTC",
    twitter: "bitcoin",
    contracts: [] // Native
  },
  {
    name: "Ethereum", 
    symbol: "ETH",
    twitter: "ethereum",
    contracts: [] // Native
  },
  {
    name: "Tether",
    symbol: "USDT",
    twitter: "Tether_to", // Known working handle
    contracts: [
      { chain: "ethereum" as const, address: "0xdac17f958d2ee523a2206206994597c13d831ec7" },
      { chain: "solana" as const, address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" }
    ]
  },
  {
    name: "XRP",
    symbol: "XRP", 
    twitter: "Ripple", // Known working handle
    contracts: [] // Native
  },
  {
    name: "BNB",
    symbol: "BNB",
    twitter: "BNBCHAIN", // Correct Twitter handle
    contracts: [
      { chain: "ethereum" as const, address: "0xb8c77482e45f1f44de1745f52c74426c631bdd52" }
    ]
  },
  {
    name: "Solana",
    symbol: "SOL",
    twitter: "solana",
    contracts: [] // Native
  },
  {
    name: "USDC",
    symbol: "USDC",
    twitter: "centre", // Centre Consortium
    contracts: [
      { chain: "ethereum" as const, address: "0xa0b86a33e6c90e956c8b1f69b1e165f5b1e60b7a" },
      { chain: "base" as const, address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" },
      { chain: "solana" as const, address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }
    ]
  },
  {
    name: "Dogecoin",
    symbol: "DOGE",
    twitter: "dogecoin",
    contracts: [] // Native
  },
  {
    name: "Cardano",
    symbol: "ADA",
    twitter: "cardano",
    contracts: [] // Native
  },
  {
    name: "TRON",
    symbol: "TRX",
    twitter: "trondao",
    contracts: [] // Native
  },
  {
    name: "Avalanche",
    symbol: "AVAX", 
    twitter: "avalancheavax",
    contracts: [] // Native
  },
  {
    name: "Shiba Inu",
    symbol: "SHIB",
    twitter: "shibtoken",
    contracts: [
      { chain: "ethereum" as const, address: "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce" }
    ]
  },
  {
    name: "Polkadot",
    symbol: "DOT",
    twitter: "polkadot",
    contracts: [] // Native
  },
  {
    name: "Chainlink",
    symbol: "LINK",
    twitter: "chainlink", 
    contracts: [
      { chain: "ethereum" as const, address: "0x514910771af9ca656af840dff83e8264ecf986ca" }
    ]
  },
  {
    name: "Polygon",
    symbol: "MATIC",
    twitter: "0xpolygon",
    contracts: [
      { chain: "ethereum" as const, address: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0" }
    ]
  },
  {
    name: "Litecoin",
    symbol: "LTC",
    twitter: "litecoin",
    contracts: [] // Native
  },
  {
    name: "Uniswap",
    symbol: "UNI",
    twitter: "uniswap",
    contracts: [
      { chain: "ethereum" as const, address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984" }
    ]
  },
  {
    name: "Internet Computer",
    symbol: "ICP",
    twitter: "dfinity",
    contracts: [] // Native
  },
  {
    name: "Kaspa",
    symbol: "KAS", 
    twitter: "KaspaCurrency",
    contracts: [] // Native
  },
  {
    name: "Ethereum Classic",
    symbol: "ETC",
    twitter: "eth_classic",
    contracts: [] // Native
  },
  {
    name: "Render",
    symbol: "RNDR",
    twitter: "rendertoken",
    contracts: [
      { chain: "ethereum" as const, address: "0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24" }
    ]
  }
];

async function importWorkingTokens() {
  console.log("🚀 Importing tokens with verified Twitter handles...");
  console.log(`📊 Processing ${WORKING_TOKENS.length} high-quality tokens`);
  
  await initializeDatabase();
  
  let imported = 0;
  let noEthos = 0;
  let errors = 0;
  
  for (const [index, token] of WORKING_TOKENS.entries()) {
    console.log(`\n[${index + 1}/${WORKING_TOKENS.length}] ${token.name} (@${token.twitter})`);
    
    try {
      // Search Ethos for this Twitter handle
      const ethosUsers = await searchUsersByTwitter(token.twitter);
      
      // Find exact match or close match
      let ethosUser = ethosUsers.find(u => 
        u.username?.toLowerCase() === token.twitter.toLowerCase()
      );
      
      if (!ethosUser) {
        // Try broader matching
        ethosUser = ethosUsers.find(u => 
          u.displayName?.toLowerCase().includes(token.name.toLowerCase()) ||
          token.name.toLowerCase().includes(u.displayName?.toLowerCase() || "")
        );
      }
      
      if (!ethosUser) {
        console.log(`   ❌ No Ethos user found for @${token.twitter}`);
        noEthos++;
        continue;
      }
      
      console.log(`   ✅ Found Ethos user: ${ethosUser.displayName} (ID: ${ethosUser.id})`);
      
      if (token.contracts.length === 0) {
        console.log(`   ℹ️  Native token - no contracts to import`);
        continue;
      }
      
      // Save each contract
      for (const contract of token.contracts) {
        const success = await saveVerifiedProject({
          id: createUlid(),
          ethosUserId: ethosUser.id,
          twitterUsername: ethosUser.username || ethosUser.displayName,
          displayName: token.name,
          avatarUrl: ethosUser.avatarUrl,
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
      
      // Rate limiting for Ethos API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`   ❌ Error processing ${token.name}:`, error);
      errors++;
    }
  }
  
  console.log(`\n🎉 Import Complete!`);
  console.log(`✅ Successfully imported: ${imported} verified projects`);
  console.log(`❌ Not found on Ethos: ${noEthos} tokens`);
  console.log(`🔥 Errors: ${errors} failed imports`);
  console.log(`\n📊 Check http://localhost:8000/admin/verified to see the results!`);
}

if (import.meta.main) {
  await importWorkingTokens();
}



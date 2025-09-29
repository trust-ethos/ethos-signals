#!/usr/bin/env -S deno run -A
// Import tokens with manually verified Twitter <-> Contract mappings

import "$std/dotenv/load.ts";
import { initializeDatabase } from "../utils/db.ts";
import { createUlid, saveVerifiedProject } from "../utils/database.ts";
import { searchUsersByTwitter } from "../utils/ethos-api.ts";

// Manually curated list of tokens with verified Twitter handles and contracts
// This ensures high-quality data since we know these Twitter accounts exist and are legitimate
const VERIFIED_TOKENS = [
  {
    name: "Ethereum",
    symbol: "ETH",
    twitter: "ethereum",
    type: "token" as const,
    contracts: [] // Native token
  },
  {
    name: "Chainlink",
    symbol: "LINK", 
    twitter: "chainlink",
    type: "token" as const,
    contracts: [
      { chain: "ethereum" as const, address: "0x514910771af9ca656af840dff83e8264ecf986ca" }
    ]
  },
  {
    name: "Uniswap",
    symbol: "UNI",
    twitter: "uniswap",
    type: "token" as const,
    contracts: [
      { chain: "ethereum" as const, address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984" }
    ]
  },
  {
    name: "Aave",
    symbol: "AAVE",
    twitter: "aave",
    type: "token" as const,
    contracts: [
      { chain: "ethereum" as const, address: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9" }
    ]
  },
  {
    name: "Compound",
    symbol: "COMP",
    twitter: "compoundfinance",
    type: "token" as const,
    contracts: [
      { chain: "ethereum" as const, address: "0xc00e94cb662c3520282e6f5717214004a7f26888" }
    ]
  },
  {
    name: "Polygon",
    symbol: "MATIC",
    twitter: "0xpolygon",
    type: "token" as const,
    contracts: [
      { chain: "ethereum" as const, address: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0" }
    ]
  },
  {
    name: "Solana",
    symbol: "SOL",
    twitter: "solana",
    type: "token" as const,
    contracts: [] // Native token
  },
  {
    name: "Base",
    symbol: "BASE",
    twitter: "base",
    type: "token" as const,
    contracts: [] // Chain, not token
  },
  {
    name: "Arbitrum",
    symbol: "ARB",
    twitter: "arbitrum",
    type: "token" as const,
    contracts: [
      { chain: "ethereum" as const, address: "0xb50721bcf8d664c30412cfbc6cf2d15fa8431bd3" }
    ]
  },
  {
    name: "Optimism",
    symbol: "OP",
    twitter: "optimism",
    type: "token" as const,
    contracts: [
      { chain: "ethereum" as const, address: "0x4200000000000000000000000000000000000042" }
    ]
  },
  {
    name: "Pudgy Penguins",
    symbol: "PENGU",
    twitter: "pudgypenguins",
    type: "nft" as const,
    contracts: [
      { chain: "ethereum" as const, address: "0xbd3531da5cf5857e7cfaa92426877b022e612cf8" }
    ]
  },
  {
    name: "MakerDAO",
    symbol: "MKR",
    twitter: "makerdao",
    type: "token" as const,
    contracts: [
      { chain: "ethereum" as const, address: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2" }
    ]
  },
  {
    name: "Pancakeswap",
    symbol: "CAKE",
    twitter: "pancakeswap",
    type: "token" as const,
    contracts: [
      { chain: "ethereum" as const, address: "0x152649ea73beab28c5b49b26eb48f7ead6d4c898" }
    ]
  },
  {
    name: "Curve DAO",
    symbol: "CRV",
    twitter: "curvefinance",
    type: "token" as const,
    contracts: [
      { chain: "ethereum" as const, address: "0xd533a949740bb3306d119cc777fa900ba034cd52" }
    ]
  }
];

async function importKnownTokens() {
  console.log("🚀 Importing manually verified tokens...");
  
  await initializeDatabase();
  
  let imported = 0;
  let notFound = 0;
  let errors = 0;
  
  for (const [index, token] of VERIFIED_TOKENS.entries()) {
    console.log(`\n[${index + 1}/${VERIFIED_TOKENS.length}] Processing ${token.name} (@${token.twitter})...`);
    
    try {
      // Search for this user on Ethos
      const users = await searchUsersByTwitter(token.twitter);
      
      // Try multiple matching strategies
      let ethosUser = users.find(u => 
        u.username?.toLowerCase() === token.twitter.toLowerCase()
      );
      
      if (!ethosUser) {
        // Try partial name match
        ethosUser = users.find(u => 
          u.displayName?.toLowerCase().includes(token.name.toLowerCase()) ||
          token.name.toLowerCase().includes(u.displayName?.toLowerCase() || "")
        );
      }
      
      if (!ethosUser) {
        console.log(`❌ No Ethos user found for @${token.twitter}`);
        notFound++;
        continue;
      }
      
      console.log(`✅ Found Ethos user: ${ethosUser.displayName} (ID: ${ethosUser.id})`);
      
      if (token.contracts.length === 0) {
        console.log(`ℹ️  Native token - no contracts to import`);
        continue;
      }
      
      // Save each contract
      for (const contract of token.contracts) {
        const success = await saveVerifiedProject({
          id: createUlid(),
          ethosUserId: ethosUser.id, // Use .id instead of .userID
          twitterUsername: ethosUser.username || ethosUser.displayName,
          displayName: token.name,
          avatarUrl: ethosUser.avatarUrl,
          type: token.type,
          chain: contract.chain,
          link: contract.address,
          createdAt: Date.now(),
        });
        
        if (success) {
          console.log(`💾 ✅ Saved: ${token.name} on ${contract.chain}`);
          console.log(`   📄 Contract: ${contract.address}`);
          imported++;
        } else {
          console.log(`❌ Failed to save ${token.name} on ${contract.chain}`);
          errors++;
        }
      }
      
      // Rate limiting for Ethos API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error processing ${token.name}:`, error);
      errors++;
    }
  }
  
  console.log(`\n🎉 Import Complete!`);
  console.log(`✅ Successfully imported: ${imported} verified projects`);
  console.log(`❌ Not found on Ethos: ${notFound} tokens`);
  console.log(`🔥 Errors: ${errors} failed saves`);
  console.log(`\n📊 Check http://localhost:8000/admin/verified to see the results!`);
}

if (import.meta.main) {
  await importKnownTokens();
}

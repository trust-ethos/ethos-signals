#!/usr/bin/env -S deno run -A
// Import a small sample of tokens with known Twitter handles

import "$std/dotenv/load.ts";
import { initializeDatabase } from "../utils/db.ts";
import { createUlid, saveVerifiedProject } from "../utils/database.ts";
import { searchUsersByTwitter } from "../utils/ethos-api.ts";

async function importSampleTokens() {
  console.log("🚀 Importing sample tokens with Twitter data...");
  
  await initializeDatabase();
  
  // Manually curated list of tokens with verified Twitter handles
  const tokensToImport = [
    {
      coinId: "tether",
      expectedTwitter: "Tether_to",
      name: "Tether",
      symbol: "USDT"
    },
    {
      coinId: "chainlink", 
      expectedTwitter: "chainlink",
      name: "Chainlink",
      symbol: "LINK"
    },
    {
      coinId: "uniswap",
      expectedTwitter: "Uniswap",
      name: "Uniswap",
      symbol: "UNI"
    },
    {
      coinId: "compound-governance-token",
      expectedTwitter: "compoundfinance", 
      name: "Compound",
      symbol: "COMP"
    },
    {
      coinId: "aave",
      expectedTwitter: "AaveAave",
      name: "Aave", 
      symbol: "AAVE"
    }
  ];
  
  let imported = 0;
  
  for (const tokenSpec of tokensToImport) {
    console.log(`\n📊 Processing ${tokenSpec.name}...`);
    
    try {
      // Get token details from CoinGecko
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${tokenSpec.coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`
      );
      
      if (!response.ok) {
        console.log(`❌ Failed to fetch ${tokenSpec.name} from CoinGecko`);
        continue;
      }
      
      const detail = await response.json();
      const twitterHandle = detail.links?.twitter_screen_name;
      
      if (!twitterHandle) {
        console.log(`❌ No Twitter handle found for ${tokenSpec.name}`);
        continue;
      }
      
      console.log(`🐦 Twitter: @${twitterHandle}`);
      
      // Try to find on Ethos (try both expected and actual handles)
      const searchTerms = [twitterHandle, tokenSpec.expectedTwitter, tokenSpec.name.toLowerCase()];
      let ethosUser = null;
      
      for (const searchTerm of searchTerms) {
        try {
          const users = await searchUsersByTwitter(searchTerm);
          ethosUser = users.find(u => 
            u.username?.toLowerCase() === twitterHandle.toLowerCase() ||
            u.username?.toLowerCase() === tokenSpec.expectedTwitter.toLowerCase() ||
            u.displayName?.toLowerCase().includes(tokenSpec.name.toLowerCase())
          );
          
          if (ethosUser) break;
          
          await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit Ethos API
        } catch (_err) {
          continue;
        }
      }
      
      if (!ethosUser) {
        console.log(`❌ No Ethos user found for ${tokenSpec.name}`);
        continue;
      }
      
      console.log(`✅ Found Ethos user: ${ethosUser.displayName} (@${ethosUser.username})`);
      
      // Extract supported contracts
      const contracts = [];
      if (detail.platforms?.ethereum) {
        contracts.push({ chain: "ethereum" as const, address: detail.platforms.ethereum });
      }
      if (detail.platforms?.base) {
        contracts.push({ chain: "base" as const, address: detail.platforms.base });
      }
      if (detail.platforms?.solana) {
        contracts.push({ chain: "solana" as const, address: detail.platforms.solana });
      }
      
      if (contracts.length === 0) {
        console.log(`⚠️  No supported contracts for ${tokenSpec.name}`);
        continue;
      }
      
      // Save each contract
      for (const contract of contracts) {
        const success = await saveVerifiedProject({
          id: createUlid(),
          ethosUserId: ethosUser.userID,
          twitterUsername: ethosUser.username || ethosUser.displayName,
          displayName: detail.name,
          avatarUrl: detail.image?.large || ethosUser.avatarUrl,
          type: "token",
          chain: contract.chain,
          link: contract.address,
          createdAt: Date.now(),
        });
        
        if (success) {
          console.log(`💾 ✅ Saved: ${detail.name} on ${contract.chain}`);
          console.log(`   Contract: ${contract.address}`);
          imported++;
        } else {
          console.log(`❌ Failed to save ${detail.name} on ${contract.chain}`);
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.error(`❌ Error processing ${tokenSpec.name}:`, error);
    }
  }
  
  console.log(`\n🎉 Sample import complete!`);
  console.log(`✅ Imported ${imported} verified projects`);
  console.log(`🌐 Check the admin panel to see the results`);
}

if (import.meta.main) {
  await importSampleTokens();
}



#!/usr/bin/env -S deno run -A

/**
 * Pre-load curated list of top NFT collections
 * Manual list of popular NFT collections with their Twitter handles
 */

import "https://deno.land/std@0.216.0/dotenv/load.ts";
import { initializeDatabase } from "../utils/db.ts";
import { saveVerifiedProject, createUlid, getVerifiedByUsername } from "../utils/database.ts";
import { lookupEthosUserByTwitter } from "../utils/project-validation.ts";

interface NFTCollection {
  name: string;
  twitter: string;
  chain: "ethereum" | "solana" | "base";
  contract?: string;
  ticker?: string;
}

// Curated list of top NFT collections
const NFT_COLLECTIONS: NFTCollection[] = [
  // Ethereum NFTs
  {
    name: "Bored Ape Yacht Club",
    twitter: "BoredApeYC",
    chain: "ethereum",
    contract: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
    ticker: "BAYC",
  },
  {
    name: "Mutant Ape Yacht Club",
    twitter: "BoredApeYC",
    chain: "ethereum",
    contract: "0x60E4d786628Fea6478F785A6d7e704777c86a7c6",
    ticker: "MAYC",
  },
  {
    name: "CryptoPunks",
    twitter: "cryptopunksnfts",
    chain: "ethereum",
    contract: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
    ticker: "PUNK",
  },
  {
    name: "Azuki",
    twitter: "AzukiOfficial",
    chain: "ethereum",
    contract: "0xED5AF388653567Af2F388E6224dC7C4b3241C544",
    ticker: "AZUKI",
  },
  {
    name: "Clone X",
    twitter: "CloneX",
    chain: "ethereum",
    contract: "0x49cF6f5d44E70224e2E23fDcdd2C053F30aDA28B",
    ticker: "CLONEX",
  },
  {
    name: "Doodles",
    twitter: "doodles",
    chain: "ethereum",
    contract: "0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e",
    ticker: "DOODLE",
  },
  {
    name: "Pudgy Penguins",
    twitter: "pudgypenguins",
    chain: "ethereum",
    contract: "0xBd3531dA5CF5857e7CfAA92426877b022e612cf8",
    ticker: "PPG",
  },
  {
    name: "DeGods",
    twitter: "DeGodsNFT",
    chain: "ethereum",
    contract: "0x8821BeE2ba0dF28761AffF119D66390D594CD280",
    ticker: "DEGODS",
  },
  {
    name: "Milady Maker",
    twitter: "miladymaker",
    chain: "ethereum",
    contract: "0x5Af0D9827E0c53E4799BB226655A1de152A425a5",
    ticker: "MILADY",
  },
  {
    name: "Moonbirds",
    twitter: "moonbirds",
    chain: "ethereum",
    contract: "0x23581767a106ae21c074b2276D25e5C3e136a68b",
    ticker: "MOONBIRD",
  },
  {
    name: "The Captainz",
    twitter: "The_Captainz_",
    chain: "ethereum",
    contract: "0x769272677faB02575E84945F03Eca517ACc37C14",
    ticker: "CAPZ",
  },
  {
    name: "Otherside",
    twitter: "OthersideMeta",
    chain: "ethereum",
    contract: "0x34d85c9CDeB23FA97cb08333b511ac86E1C4E258",
    ticker: "OTHR",
  },
  {
    name: "VeeFriends",
    twitter: "veefriends",
    chain: "ethereum",
    contract: "0xa3AEe8BcE55BEeA1951EF834b99f3Ac60d1ABeeB",
    ticker: "VEE",
  },
  {
    name: "Cool Cats",
    twitter: "coolcatsnft",
    chain: "ethereum",
    contract: "0x1A92f7381B9F03921564a437210bB9396471050C",
    ticker: "COOL",
  },
  {
    name: "World of Women",
    twitter: "worldofwomennft",
    chain: "ethereum",
    contract: "0xe785E82358879F061BC3dcAC6f0444462D4b5330",
    ticker: "WOW",
  },
  {
    name: "Art Blocks",
    twitter: "artblocks_io",
    chain: "ethereum",
    contract: "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270",
    ticker: "BLOCKS",
  },
  // Solana NFTs
  {
    name: "Mad Lads",
    twitter: "MadLadsNFT",
    chain: "solana",
    ticker: "MADLAD",
  },
  {
    name: "Tensorians",
    twitter: "tensor_hq",
    chain: "solana",
    ticker: "TNSR",
  },
  {
    name: "Okay Bears",
    twitter: "OkayBears",
    chain: "solana",
    ticker: "OKAY",
  },
];

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function preloadNFTCollections() {
  console.log("🚀 Starting NFT collections pre-load...\n");
  
  await initializeDatabase();
  
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  
  console.log(`📊 Processing ${NFT_COLLECTIONS.length} curated NFT collections...\n`);
  
  for (const collection of NFT_COLLECTIONS) {
    try {
      const twitterHandle = collection.twitter;
      
      // Check if already exists
      const existing = await getVerifiedByUsername(twitterHandle);
      if (existing) {
        console.log(`⏭️  Skipping ${collection.name} (@${twitterHandle}) - already exists`);
        totalSkipped++;
        continue;
      }
      
      // Lookup Ethos profile
      const ethosUser = await lookupEthosUserByTwitter(twitterHandle);
      await delay(200); // Small delay for Ethos API
      
      if (!ethosUser) {
        console.log(`⚠️  ${collection.name} (@${twitterHandle}) - no Ethos profile`);
        totalSkipped++;
        continue;
      }
      
      // Save to database
      const success = await saveVerifiedProject({
        id: createUlid(),
        ethosUserId: ethosUser.id,
        twitterUsername: twitterHandle,
        displayName: collection.name,
        avatarUrl: ethosUser.avatarUrl,
        type: "nft",
        chain: collection.chain,
        link: collection.contract,
        ticker: collection.ticker,
        isVerified: true,
        verifiedAt: Date.now(),
        verifiedBy: "nft-import",
        createdAt: Date.now(),
      });
      
      if (success) {
        console.log(`✅ Added ${collection.name} (@${twitterHandle}) - ${collection.chain} - ${collection.ticker || 'NFT'}`);
        totalAdded++;
      } else {
        console.error(`❌ Failed to save ${collection.name}`);
        totalFailed++;
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${collection.name}:`, error);
      totalFailed++;
    }
  }
  
  console.log("\n\n" + "=".repeat(60));
  console.log("🎉 NFT collections import complete!");
  console.log("=".repeat(60));
  console.log(`✅ Successfully added: ${totalAdded} collections`);
  console.log(`⏭️  Skipped: ${totalSkipped} collections`);
  console.log(`❌ Failed: ${totalFailed} collections`);
  console.log("=".repeat(60));
}

if (import.meta.main) {
  preloadNFTCollections().catch(console.error);
}


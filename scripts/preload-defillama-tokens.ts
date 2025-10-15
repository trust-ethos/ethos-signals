#!/usr/bin/env -S deno run -A

/**
 * Pre-load DeFi protocols from DefiLlama API
 * Fetches top protocols and adds governance tokens to verified_projects
 */

import "https://deno.land/std@0.216.0/dotenv/load.ts";
import { initializeDatabase } from "../utils/db.ts";
import { saveVerifiedProject, createUlid, getVerifiedByUsername } from "../utils/database.ts";
import { lookupEthosUserByTwitter } from "../utils/project-validation.ts";

interface DefiLlamaProtocol {
  id: string;
  name: string;
  symbol: string;
  gecko_id?: string;
  twitter?: string;
  chains: string[];
  logo?: string;
  tvl?: number;
}

const DEFILLAMA_API_BASE = "https://api.llama.fi";

const CHAIN_MAPPING: Record<string, string> = {
  "Ethereum": "ethereum",
  "BSC": "bsc",
  "Base": "base",
  "Solana": "solana",
};

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchDefiLlamaProtocols(): Promise<DefiLlamaProtocol[]> {
  try {
    console.log("Fetching protocols from DefiLlama...");
    const response = await fetch(`${DEFILLAMA_API_BASE}/protocols`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch protocols: ${response.statusText}`);
    }
    
    const protocols: DefiLlamaProtocol[] = await response.json();
    
    // Filter for protocols with governance tokens and Twitter
    return protocols
      .filter(p => p.twitter && p.symbol && p.tvl && p.tvl > 10000000) // $10M+ TVL
      .sort((a, b) => (b.tvl || 0) - (a.tvl || 0)) // Sort by TVL
      .slice(0, 100); // Top 100
    
  } catch (error) {
    console.error("Error fetching protocols from DefiLlama:", error);
    return [];
  }
}

async function fetchProtocolDetails(slug: string): Promise<any | null> {
  try {
    const response = await fetch(`${DEFILLAMA_API_BASE}/protocol/${slug}`);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching details for ${slug}:`, error);
    return null;
  }
}

function extractTwitterHandle(twitterUrl: string): string {
  // Extract handle from URLs like "https://twitter.com/MakerDAO"
  const match = twitterUrl.match(/twitter\.com\/([^\/\?]+)/);
  if (match) {
    return match[1].replace('@', '');
  }
  return twitterUrl.replace('@', '');
}

async function preloadDefiLlamaTokens() {
  console.log("🚀 Starting DefiLlama protocol pre-load...\n");
  
  await initializeDatabase();
  
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  
  const protocols = await fetchDefiLlamaProtocols();
  console.log(`\n📊 Found ${protocols.length} protocols with governance tokens\n`);
  
  for (const protocol of protocols) {
    try {
      const twitterHandle = extractTwitterHandle(protocol.twitter!);
      
      // Check if already exists
      const existing = await getVerifiedByUsername(twitterHandle);
      if (existing) {
        console.log(`⏭️  Skipping ${protocol.name} (@${twitterHandle}) - already exists`);
        totalSkipped++;
        continue;
      }
      
      // Lookup Ethos profile
      const ethosUser = await lookupEthosUserByTwitter(twitterHandle);
      await delay(200); // Small delay for Ethos API
      
      if (!ethosUser) {
        console.log(`⚠️  ${protocol.name} (@${twitterHandle}) - no Ethos profile`);
        totalSkipped++;
        continue;
      }
      
      // Fetch detailed info
      const details = await fetchProtocolDetails(protocol.id);
      await delay(100); // Rate limiting for DefiLlama
      
      // Determine primary chain
      let chain = "ethereum"; // Default
      if (protocol.chains && protocol.chains.length > 0) {
        const firstChain = protocol.chains[0];
        chain = CHAIN_MAPPING[firstChain] || "ethereum";
      }
      
      // Try to find contract address from chain tvl data
      let contractAddress: string | undefined;
      if (details && details.chainTvls) {
        // Look for token addresses in chain data
        // This is simplified - in reality, DefiLlama doesn't always provide token addresses
      }
      
      // Use CoinGecko ID if available for price tracking
      const coinGeckoId = protocol.gecko_id;
      
      // Save to database
      const success = await saveVerifiedProject({
        id: createUlid(),
        ethosUserId: ethosUser.id,
        twitterUsername: twitterHandle,
        displayName: protocol.name,
        avatarUrl: protocol.logo || ethosUser.avatarUrl,
        type: "token",
        chain: chain as "ethereum" | "base" | "solana" | "bsc",
        link: contractAddress,
        coinGeckoId: coinGeckoId,
        ticker: protocol.symbol.toUpperCase(),
        isVerified: true,
        verifiedAt: Date.now(),
        verifiedBy: "defillama-import",
        createdAt: Date.now(),
      });
      
      if (success) {
        const tvlStr = protocol.tvl ? `TVL: $${(protocol.tvl / 1000000).toFixed(0)}M` : '';
        console.log(`✅ Added ${protocol.name} (@${twitterHandle}) - $${protocol.symbol.toUpperCase()} - ${chain} ${tvlStr}`);
        totalAdded++;
      } else {
        console.error(`❌ Failed to save ${protocol.name}`);
        totalFailed++;
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${protocol.name}:`, error);
      totalFailed++;
    }
  }
  
  console.log("\n\n" + "=".repeat(60));
  console.log("🎉 DefiLlama import complete!");
  console.log("=".repeat(60));
  console.log(`✅ Successfully added: ${totalAdded} protocols`);
  console.log(`⏭️  Skipped: ${totalSkipped} protocols`);
  console.log(`❌ Failed: ${totalFailed} protocols`);
  console.log("=".repeat(60));
}

if (import.meta.main) {
  preloadDefiLlamaTokens().catch(console.error);
}


#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Save a real signal from the database to the blockchain
 */

import { listAllRecentSignals } from "../utils/database.ts";
import { 
  getSignalsContractWithSigner, 
  createSignalOnchain 
} from "../utils/onchain-signals.ts";

const contractAddress = Deno.env.get("SIGNALS_CONTRACT_ADDRESS");
const privateKey = Deno.env.get("PRIVATE_KEY");

if (!contractAddress) {
  console.error("❌ SIGNALS_CONTRACT_ADDRESS not set in environment");
  Deno.exit(1);
}

if (!privateKey) {
  console.error("❌ PRIVATE_KEY not set in environment");
  Deno.exit(1);
}

console.log("📝 Saving Real Signal Onchain\n");
console.log(`Contract Address: ${contractAddress}\n`);

try {
  // Get the latest signal from database
  console.log("Fetching latest signal from database...");
  const signals = await listAllRecentSignals(1);
  
  if (signals.length === 0) {
    console.error("❌ No signals found in database");
    Deno.exit(1);
  }
  
  const signal = signals[0];
  
  console.log("\n📊 Signal Details:");
  console.log(`  Twitter User: @${signal.twitterUsername}`);
  console.log(`  Project: ${signal.projectDisplayName || signal.projectHandle}`);
  console.log(`  Sentiment: ${signal.sentiment === "bullish" ? "🐂 Bullish" : "🐻 Bearish"}`);
  console.log(`  Tweet: ${signal.tweetContent}`);
  console.log(`  URL: ${signal.tweetUrl}`);
  console.log(`  Date: ${signal.notedAt}\n`);
  
  // Get contract with signer
  console.log("Creating onchain transaction...");
  const contract = getSignalsContractWithSigner(privateKey);
  
  // Create signal onchain
  const result = await createSignalOnchain(contract, {
    subject: signal.projectHandle,
    tweetUrl: signal.tweetUrl,
    tweetContent: signal.tweetContent || "",
    isBullish: signal.sentiment === "bullish",
    metadata: {
      twitterUsername: signal.twitterUsername,
      notedAt: signal.notedAt,
      projectUserId: signal.projectUserId,
      projectDisplayName: signal.projectDisplayName,
      projectAvatarUrl: signal.projectAvatarUrl,
    },
    twitterAccountId: signal.projectUserId?.toString() || "",
  });
  
  console.log("\n✅ Signal saved onchain successfully!");
  console.log(`   Signal ID: ${result.signalId}`);
  console.log(`   Transaction: ${result.txHash}`);
  console.log(`\n🔍 View on BaseScan:`);
  console.log(`   https://sepolia.basescan.org/tx/${result.txHash}`);
  
} catch (error) {
  console.error("❌ Error saving signal:", error);
  Deno.exit(1);
}


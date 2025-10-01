#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Migrate all existing signals from database to blockchain
 * This will batch process signals and show progress
 */

import { listAllRecentSignals } from "../utils/database.ts";
import { 
  getSignalsContractWithSigner, 
  createSignalOnchain 
} from "../utils/onchain-signals.ts";

const contractAddress = Deno.env.get("SIGNALS_CONTRACT_ADDRESS");
const privateKey = Deno.env.get("PRIVATE_KEY");
const batchSize = 1; // Process 1 signal at a time to avoid gas/timing issues

if (!contractAddress) {
  console.error("❌ SIGNALS_CONTRACT_ADDRESS not set in environment");
  Deno.exit(1);
}

if (!privateKey) {
  console.error("❌ PRIVATE_KEY not set in environment");
  Deno.exit(1);
}

console.log("🚀 Signal Migration to Blockchain\n");
console.log(`Contract: ${contractAddress}`);
console.log(`Network: Base Mainnet\n`);

// Fetch all signals from database
console.log("📊 Fetching signals from database...");
const allSignals = await listAllRecentSignals(10000);
console.log(`Found ${allSignals.length} signals\n`);

if (allSignals.length === 0) {
  console.log("No signals to migrate!");
  Deno.exit(0);
}

// Cost estimate
const costPerSignal = 0.02;
const totalCost = (allSignals.length * costPerSignal).toFixed(2);
console.log("💰 Cost Estimate:");
console.log(`  Signals: ${allSignals.length}`);
console.log(`  Per signal: ~$${costPerSignal}`);
console.log(`  Total: ~$${totalCost}\n`);

// Confirm
console.log("⚠️  This will cost real money on Base mainnet!");
console.log("Press Ctrl+C to cancel, or wait 3 seconds to continue...\n");
await new Promise(resolve => setTimeout(resolve, 3000));

console.log("🚀 Starting migration...\n");

const contract = getSignalsContractWithSigner(privateKey);
let successCount = 0;
let failCount = 0;
const failedSignals: { signal: { id: string; projectHandle: string }; error: string }[] = [];

// Process in batches
for (let i = 0; i < allSignals.length; i += batchSize) {
  const batch = allSignals.slice(i, i + batchSize);
  const batchNum = Math.floor(i / batchSize) + 1;
  const totalBatches = Math.ceil(allSignals.length / batchSize);
  
  console.log(`\n📦 Batch ${batchNum}/${totalBatches} (signals ${i + 1}-${Math.min(i + batchSize, allSignals.length)})`);
  
  for (const signal of batch) {
    try {
      const result = await createSignalOnchain(contract, {
        subject: signal.projectHandle,
        tweetUrl: signal.tweetUrl,
        tweetContent: signal.tweetContent || "",
        isBullish: signal.sentiment === "bullish",
        metadata: {
          dateTimeOfPost: signal.tweetTimestamp || undefined,
          dateTimeOfSave: signal.createdAt ? new Date(signal.createdAt).toISOString() : new Date().toISOString(),
        },
        twitterAccountId: signal.projectUserId?.toString() || "",
      });
      
      successCount++;
      console.log(`  ✅ ${signal.id.slice(0, 8)}... (@${signal.twitterUsername} → ${signal.projectHandle})`);
      console.log(`     TX: ${result.txHash}`);
      console.log(`     Onchain ID: ${result.signalId}`);
      
      // Wait 2 seconds between transactions to ensure confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      failCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      failedSignals.push({ signal: { id: signal.id, projectHandle: signal.projectHandle }, error: errorMessage });
      console.log(`  ❌ ${signal.id.slice(0, 8)}... - Failed: ${errorMessage}`);
    }
  }
  
  // Progress update every 10 signals
  if ((i + batchSize) % 10 === 0 && i + batchSize < allSignals.length) {
    console.log(`\n⏳ Progress: ${i + batchSize}/${allSignals.length} signals migrated (${((i + batchSize) / allSignals.length * 100).toFixed(1)}%)\n`);
  }
}

// Summary
console.log("\n" + "=".repeat(60));
console.log("📊 Migration Summary");
console.log("=".repeat(60));
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`📈 Success Rate: ${((successCount / allSignals.length) * 100).toFixed(1)}%`);

if (failedSignals.length > 0) {
  console.log(`\n⚠️  Failed Signals (${failedSignals.length}):`);
  failedSignals.forEach(({ signal, error }) => {
    console.log(`  - ${signal.id}: ${error}`);
  });
  console.log("\nYou can retry failed signals later.");
}

console.log(`\n🔗 View all signals on BaseScan:`);
console.log(`   https://basescan.org/address/${contractAddress}#events`);
console.log("\n✨ Migration complete!");


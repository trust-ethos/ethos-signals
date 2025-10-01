#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Create a test signal onchain
 * This demonstrates how to write to the contract
 */

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

console.log("📝 Creating Test Signal Onchain\n");
console.log(`Contract Address: ${contractAddress}\n`);

try {
  // Get contract with signer
  const contract = getSignalsContractWithSigner(privateKey);
  
  // Create a test signal
  console.log("Creating signal...");
  const result = await createSignalOnchain(contract, {
    subject: "ethereum",
    tweetUrl: "https://x.com/vitalik/status/1234567890",
    tweetContent: "Ethereum is looking strong for the rest of 2025. The merge has been incredibly successful and layer 2 adoption is accelerating.",
    isBullish: true,
    metadata: {
      twitterUsername: "vitalik",
      notedAt: new Date().toISOString().split('T')[0],
      projectDisplayName: "Ethereum",
      projectUserId: 123456789,
      projectAvatarUrl: "https://example.com/avatar.jpg",
      verifiedProjectId: "ethereum-mainnet"
    },
    twitterAccountId: "123456789"
  });
  
  console.log("\n✅ Signal created successfully!");
  console.log(`   Signal ID: ${result.signalId}`);
  console.log(`   Transaction: ${result.txHash}`);
  console.log(`\nView on BaseScan:`);
  console.log(`https://basescan.org/tx/${result.txHash}`);
  
  console.log("\n🔍 To read this signal, run:");
  console.log("   deno run scripts/test-contract-read.ts");
  
} catch (error) {
  console.error("❌ Error creating signal:", error);
  Deno.exit(1);
}



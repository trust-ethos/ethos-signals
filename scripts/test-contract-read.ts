#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Test script for reading from the SignalsAttestation contract
 * Run after deploying the contract to verify it works
 */

import { 
  getSignalsContract, 
  getSignalCountOnchain,
  getSignalsByProjectOnchain,
  getProjectSentimentOnchain 
} from "../utils/onchain-signals.ts";

const contractAddress = Deno.env.get("SIGNALS_CONTRACT_ADDRESS");

if (!contractAddress) {
  console.error("❌ SIGNALS_CONTRACT_ADDRESS not set in environment");
  console.error("Please add it to your .env file after deployment");
  Deno.exit(1);
}

console.log("🔍 Testing SignalsAttestation Contract\n");
console.log(`Contract Address: ${contractAddress}\n`);

try {
  // Get contract instance
  const contract = getSignalsContract();
  
  // Test 1: Get signal count
  console.log("Test 1: Getting total signal count...");
  const count = await getSignalCountOnchain(contract);
  console.log(`✅ Total signals: ${count}\n`);
  
  if (count > 0) {
    // Test 2: Try to get a signal
    console.log("Test 2: Getting signal #0...");
    const signal = await contract.getSignal(0);
    console.log("✅ Signal details:");
    console.log(`  Author: ${signal.author}`);
    console.log(`  Subject: ${signal.subject}`);
    console.log(`  Sentiment: ${signal.isBullish ? "Bullish 🐂" : "Bearish 🐻"}`);
    console.log(`  Tweet URL: ${signal.tweetUrl}`);
    console.log(`  Archived: ${signal.archived}\n`);
    
    // Test 3: Get signals by project
    console.log("Test 3: Getting signals for project...");
    const projectSignals = await getSignalsByProjectOnchain(contract, signal.subject);
    console.log(`✅ Found ${projectSignals.length} signals for ${signal.subject}\n`);
    
    // Test 4: Get sentiment
    console.log("Test 4: Getting sentiment stats...");
    const sentiment = await getProjectSentimentOnchain(contract, signal.subject);
    console.log(`✅ ${signal.subject} sentiment:`);
    console.log(`  Bullish: ${sentiment.bullishCount} 🐂`);
    console.log(`  Bearish: ${sentiment.bearishCount} 🐻\n`);
  } else {
    console.log("ℹ️  No signals created yet. Create one with:");
    console.log("   deno run scripts/create-test-signal.ts");
  }
  
  console.log("✨ All tests passed!");
  
} catch (error) {
  console.error("❌ Error testing contract:", error);
  Deno.exit(1);
}



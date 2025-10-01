#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { getSignalsContract, getSignalCountOnchain } from "../utils/onchain-signals.ts";

const contractAddress = Deno.env.get("SIGNALS_CONTRACT_ADDRESS");
const rpcUrl = Deno.env.get("BASE_RPC_URL");

console.log("🔍 Checking Mainnet Contract\n");
console.log(`Contract: ${contractAddress}`);
console.log(`Network: ${rpcUrl}\n`);

try {
  const contract = getSignalsContract();
  const count = await getSignalCountOnchain(contract);
  
  console.log(`✅ Contract is live!`);
  console.log(`   Total signals: ${count}`);
  console.log(`\n🔗 View on BaseScan:`);
  console.log(`   https://basescan.org/address/${contractAddress}`);
} catch (error) {
  console.error("❌ Error:", error.message);
}

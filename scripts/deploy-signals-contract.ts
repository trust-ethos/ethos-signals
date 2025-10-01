#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Script to help with deploying the SignalsAttestation contract
 * This generates the deployment command and verifies environment setup
 */

console.log("🚀 Signals Contract Deployment Helper\n");

// Check for required environment variables
const requiredEnvVars = {
  PRIVATE_KEY: Deno.env.get("PRIVATE_KEY"),
  BASE_RPC_URL: Deno.env.get("BASE_RPC_URL"),
  BASESCAN_API_KEY: Deno.env.get("BASESCAN_API_KEY"),
};

let allEnvVarsSet = true;
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    console.error(`❌ Missing environment variable: ${key}`);
    allEnvVarsSet = false;
  } else {
    console.log(`✅ ${key} is set`);
  }
}

if (!allEnvVarsSet) {
  console.error("\n❌ Please set all required environment variables in your .env file");
  console.error("\nExample .env:");
  console.error("PRIVATE_KEY=0x...");
  console.error("BASE_RPC_URL=https://mainnet.base.org");
  console.error("BASESCAN_API_KEY=...");
  Deno.exit(1);
}

console.log("\n📝 Deployment Commands:\n");

console.log("For Base Mainnet:");
console.log("─".repeat(80));
console.log(`forge create \\
  --rpc-url ${requiredEnvVars.BASE_RPC_URL} \\
  --private-key ${requiredEnvVars.PRIVATE_KEY?.slice(0, 10)}... \\
  --etherscan-api-key ${requiredEnvVars.BASESCAN_API_KEY} \\
  --verify \\
  contracts/SignalsAttestation.sol:SignalsAttestation
`);

console.log("\nFor Base Sepolia (Testnet):");
console.log("─".repeat(80));
console.log(`forge create \\
  --rpc-url https://sepolia.base.org \\
  --private-key ${requiredEnvVars.PRIVATE_KEY?.slice(0, 10)}... \\
  --etherscan-api-key ${requiredEnvVars.BASESCAN_API_KEY} \\
  --verify \\
  contracts/SignalsAttestation.sol:SignalsAttestation
`);

console.log("\n📋 After Deployment:\n");
console.log("1. Copy the deployed contract address");
console.log("2. Add to your .env file:");
console.log("   SIGNALS_CONTRACT_ADDRESS=0x...");
console.log("\n3. Verify on BaseScan:");
console.log("   https://basescan.org/address/YOUR_CONTRACT_ADDRESS");
console.log("\n4. Test with the read-only utilities:");
console.log("   deno run scripts/test-contract-read.ts");

console.log("\n✨ Good luck with deployment!");



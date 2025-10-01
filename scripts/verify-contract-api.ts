#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Verify contract using BaseScan API directly
 * No Foundry required!
 */

const contractAddress = Deno.env.get("SIGNALS_CONTRACT_ADDRESS");
const apiKey = Deno.env.get("BASESCAN_API_KEY");
const rpcUrl = Deno.env.get("BASE_RPC_URL") || "";

if (!contractAddress) {
  console.error("❌ SIGNALS_CONTRACT_ADDRESS not set in .env");
  Deno.exit(1);
}

if (!apiKey) {
  console.error("❌ BASESCAN_API_KEY not set in .env");
  console.error("Get one at: https://basescan.org/myapikey");
  Deno.exit(1);
}

// Determine network (use V2 API)
const isTestnet = rpcUrl.includes("sepolia");
const apiUrl = isTestnet 
  ? "https://api-sepolia.basescan.org/v2/api"
  : "https://api.basescan.org/v2/api";
const explorerUrl = isTestnet
  ? "https://sepolia.basescan.org"
  : "https://basescan.org";

console.log("🔍 Verifying Contract via API\n");
console.log(`Network: ${isTestnet ? "Base Sepolia (testnet)" : "Base Mainnet"}`);
console.log(`Contract: ${contractAddress}\n`);

// Read the contract source code
const contractSource = await Deno.readTextFile("./contracts/SignalsAttestation.sol");

// Prepare verification request (V2 API format)
const verificationData = {
  contractAddress: contractAddress,
  sourceCode: contractSource,
  codeformat: "solidity-single-file",
  contractName: "SignalsAttestation",
  compilerVersion: "v0.8.20+commit.a1b79de6",
  optimizationUsed: 0, // 0 = No, 1 = Yes
  runs: 200,
  constructorArguments: "", // No constructor args
  evmVersion: "default",
  licenseType: 3, // 3 = MIT
};

console.log("Submitting verification request...");

try {
  const response = await fetch(`${apiUrl}?module=contract&action=verifysourcecode&apikey=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(verificationData),
  });

  const result = await response.json();

  if (result.status === "1") {
    const guid = result.result;
    console.log(`✅ Verification submitted!`);
    console.log(`   GUID: ${guid}\n`);
    
    // Check status
    console.log("Checking verification status...");
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      const statusResponse = await fetch(
        `${apiUrl}?module=contract&action=checkverifystatus&guid=${guid}&apikey=${apiKey}`
      );
      const statusResult = await statusResponse.json();
      
      if (statusResult.status === "1") {
        if (statusResult.result === "Pass - Verified") {
          console.log("\n🎉 Contract verified successfully!");
          console.log(`\n🔗 View on BaseScan:`);
          console.log(`   ${explorerUrl}/address/${contractAddress}#code`);
          Deno.exit(0);
        } else if (statusResult.result.includes("Pending")) {
          process.stdout.write(".");
          attempts++;
        } else {
          console.log(`\n❌ Verification failed: ${statusResult.result}`);
          Deno.exit(1);
        }
      } else {
        console.log(`\n❌ Error checking status: ${statusResult.result}`);
        Deno.exit(1);
      }
    }
    
    console.log("\n⏳ Verification still pending. Check manually at:");
    console.log(`   ${explorerUrl}/address/${contractAddress}#code`);
    
  } else {
    console.error(`❌ Verification failed: ${result.result}`);
    Deno.exit(1);
  }
} catch (error) {
  console.error("❌ Error:", error.message);
  Deno.exit(1);
}


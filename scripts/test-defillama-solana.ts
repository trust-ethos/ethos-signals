// Test DefiLlama API for Solana tokens
// Example: Addicted token address (this is a placeholder - we'll need the real one)

const testCases = [
  {
    name: "Test Solana Token",
    chain: "solana",
    // Common Solana token format - user will need to provide the actual address
    address: "SOLANA_ADDRESS_HERE"
  }
];

for (const test of testCases) {
  console.log(`\n========================================`);
  console.log(`Testing: ${test.name}`);
  console.log(`Chain: ${test.chain}`);
  console.log(`Address: ${test.address}`);
  console.log(`========================================`);
  
  const priceKey = `${test.chain}:${test.address}`;
  
  // Test current price
  console.log("\n1. Testing current price...");
  const currentUrl = `https://coins.llama.fi/prices/current/${priceKey}`;
  console.log(`   URL: ${currentUrl}`);
  try {
    const currentRes = await fetch(currentUrl);
    const currentData = await currentRes.json();
    console.log(`   Status: ${currentRes.status}`);
    console.log(`   Response:`, JSON.stringify(currentData, null, 2));
  } catch (error) {
    console.error(`   Error:`, error);
  }
  
  // Test historical price (7 days ago)
  console.log("\n2. Testing historical price (7 days ago)...");
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const ts = Math.floor(sevenDaysAgo.getTime() / 1000);
  const historicalUrl = `https://coins.llama.fi/prices/historical/${ts}/${priceKey}`;
  console.log(`   URL: ${historicalUrl}`);
  console.log(`   Timestamp: ${ts} (${sevenDaysAgo.toISOString()})`);
  try {
    const historicalRes = await fetch(historicalUrl);
    const historicalData = await historicalRes.json();
    console.log(`   Status: ${historicalRes.status}`);
    console.log(`   Response:`, JSON.stringify(historicalData, null, 2));
  } catch (error) {
    console.error(`   Error:`, error);
  }
  
  // Test with a date string
  console.log("\n3. Testing daily price with date...");
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateStr = yesterday.toISOString().slice(0, 10);
  const tsDaily = Math.floor(new Date(dateStr + "T00:00:00Z").getTime() / 1000);
  const dailyUrl = `https://coins.llama.fi/prices/historical/${tsDaily}/${priceKey}`;
  console.log(`   URL: ${dailyUrl}`);
  console.log(`   Date: ${dateStr}`);
  try {
    const dailyRes = await fetch(dailyUrl);
    const dailyData = await dailyRes.json();
    console.log(`   Status: ${dailyRes.status}`);
    console.log(`   Response:`, JSON.stringify(dailyData, null, 2));
  } catch (error) {
    console.error(`   Error:`, error);
  }
}

console.log("\n\n========================================");
console.log("NOTE: Replace SOLANA_ADDRESS_HERE with the actual Solana token address");
console.log("You can find it in the database or the token page URL");
console.log("========================================\n");


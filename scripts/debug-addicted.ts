import { getDbClient } from "../utils/db.ts";

const client = await getDbClient();

try {
  // Find Addicted in verified projects
  const result = await client.queryObject<{
    id: string;
    twitter_username: string;
    display_name: string;
    type: string;
    chain: string | null;
    link: string | null;
    coin_gecko_id: string | null;
  }>(`
    SELECT id, twitter_username, display_name, type, chain, link, coin_gecko_id
    FROM verified_projects
    WHERE LOWER(twitter_username) = 'addicteddotfun'
       OR LOWER(display_name) LIKE '%addicted%'
  `);
  
  console.log("Found projects:", result.rows);
  
  if (result.rows.length > 0) {
    const project = result.rows[0];
    console.log("\nProject details:");
    console.log("  Twitter:", project.twitter_username);
    console.log("  Display Name:", project.display_name);
    console.log("  Type:", project.type);
    console.log("  Chain:", project.chain);
    console.log("  Address:", project.link);
    console.log("  CoinGecko ID:", project.coin_gecko_id);
    
    // Test DefiLlama API if we have chain and address
    if (project.chain && project.link) {
      console.log("\nTesting DefiLlama API...");
      const priceKey = `${project.chain}:${project.link}`;
      console.log("  Price key:", priceKey);
      
      // Test current price
      const currentUrl = `https://coins.llama.fi/prices/current/${priceKey}`;
      console.log("\n  Testing current price:", currentUrl);
      const currentRes = await fetch(currentUrl);
      const currentData = await currentRes.json();
      console.log("  Response:", JSON.stringify(currentData, null, 2));
      
      // Test historical price (yesterday)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const ts = Math.floor(yesterday.getTime() / 1000);
      const historicalUrl = `https://coins.llama.fi/prices/historical/${ts}/${priceKey}`;
      console.log("\n  Testing historical price:", historicalUrl);
      const historicalRes = await fetch(historicalUrl);
      const historicalData = await historicalRes.json();
      console.log("  Response:", JSON.stringify(historicalData, null, 2));
    }
  }
} catch (error) {
  console.error("Error:", error);
} finally {
  await client.end();
}


import "$std/dotenv/load.ts";
import { getDbClient } from "../utils/db.ts";
import { fetchCoinGecko, waitForRateLimit } from "../utils/coingecko-api.ts";

interface CoinGeckoDetailResponse {
  id: string;
  symbol: string;
  name: string;
}

async function fetchAndUpdateTickers() {
  const client = await getDbClient();
  
  try {
    // Get all verified projects with coinGeckoId but no ticker
    const result = await client.queryObject<{
      id: string;
      coingecko_id: string;
      display_name: string;
    }>`
      SELECT id, coingecko_id, display_name
      FROM verified_projects
      WHERE coingecko_id IS NOT NULL
      AND (ticker IS NULL OR ticker = '')
    `;
    
    console.log(`Found ${result.rows.length} projects to update`);
    
    for (const project of result.rows) {
      try {
        console.log(`Fetching ticker for ${project.display_name} (${project.coingecko_id})...`);
        
        // Fetch coin details from CoinGecko
        const response = await fetchCoinGecko(`/coins/${project.coingecko_id}`);
        
        if (!response.ok) {
          console.error(`Failed to fetch ${project.coingecko_id}: ${response.status}`);
          await waitForRateLimit(2000);
          continue;
        }
        
        const data = await response.json() as CoinGeckoDetailResponse;
        const ticker = data.symbol.toUpperCase();
        
        // Update the database
        await client.queryObject`
          UPDATE verified_projects
          SET ticker = ${ticker}
          WHERE id = ${project.id}
        `;
        
        console.log(`✅ Updated ${project.display_name}: ${ticker}`);
        
        // Respect rate limits
        await waitForRateLimit();
        
      } catch (error) {
        console.error(`Error fetching ticker for ${project.display_name}:`, error);
        await waitForRateLimit(2000);
      }
    }
    
    console.log("\n✅ Finished updating tickers!");
    
  } catch (error) {
    console.error("❌ Failed to fetch tickers:", error);
    throw error;
  }
}

if (import.meta.main) {
  await fetchAndUpdateTickers();
  Deno.exit(0);
}

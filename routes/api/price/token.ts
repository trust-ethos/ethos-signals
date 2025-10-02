import { Handlers } from "$fresh/server.ts";
import { getDefiLlamaTokenPriceAt, getDefiLlamaTokenPriceAtTimestamp, getDefiLlamaTokenPriceNow } from "../../../utils/price.ts";
import { getDexScreenerPriceNow } from "../../../utils/dexscreener-api.ts";

export const handler: Handlers = {
  OPTIONS() {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  },
  async GET(req) {
    const url = new URL(req.url);
    const chain = (url.searchParams.get("chain") as "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid") ?? "ethereum";
    const address = url.searchParams.get("address");
    const date = url.searchParams.get("date"); // yyyy-mm-dd optional
    const timestamp = url.searchParams.get("timestamp"); // ISO datetime optional
    
    const corsHeaders = {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    };
    
    if (!address) return new Response(JSON.stringify({ error: "address required" }), { status: 400, headers: corsHeaders });
    
    if (timestamp) {
      // Use precise timestamp (DefiLlama only for now)
      const price = await getDefiLlamaTokenPriceAtTimestamp(chain, address, timestamp);
      return new Response(JSON.stringify({ price }), { headers: corsHeaders });
    }
    if (date) {
      // Use daily price (DefiLlama only for now)
      const price = await getDefiLlamaTokenPriceAt(chain, address, date);
      return new Response(JSON.stringify({ price }), { headers: corsHeaders });
    }
    
    // Current price - try DefiLlama first, fallback to DexScreener
    let price = await getDefiLlamaTokenPriceNow(chain, address);
    
    // If DefiLlama doesn't have it, try DexScreener (great for new tokens)
    if (price === null) {
      console.log(`⚠️ DefiLlama has no price for ${chain}:${address}, trying DexScreener...`);
      price = await getDexScreenerPriceNow(chain, address);
      
      if (price !== null) {
        console.log(`✅ Found price on DexScreener: $${price}`);
      }
    }
    
    return new Response(JSON.stringify({ price }), { headers: corsHeaders });
  },
};





import { Handlers } from "$fresh/server.ts";
import { getDefiLlamaTokenPriceAt, getDefiLlamaTokenPriceNow, getCoinGeckoPriceAtTimestamp } from "../../../utils/price.ts";

export const handler: Handlers = {
  async OPTIONS() {
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
    const coinGeckoId = url.searchParams.get("id"); // e.g., "plasma" for Plasma (XPL)
    const date = url.searchParams.get("date"); // yyyy-mm-dd optional
    const timestamp = url.searchParams.get("timestamp"); // ISO datetime optional
    
    const corsHeaders = {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    };
    
    if (!coinGeckoId) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: corsHeaders });
    
    const fullId = `coingecko:${coinGeckoId}`;
    
    if (timestamp) {
      // Use precise timestamp with CoinGecko's market_chart/range API
      const price = await getCoinGeckoPriceAtTimestamp(coinGeckoId, timestamp);
      return new Response(JSON.stringify({ price }), { headers: corsHeaders });
    }
    
    if (date) {
      // Use daily price
      const price = await getDefiLlamaTokenPriceAt(fullId, "", date);
      return new Response(JSON.stringify({ price }), { headers: corsHeaders });
    }
    
    // Current price
    const price = await getDefiLlamaTokenPriceNow(fullId);
    return new Response(JSON.stringify({ price }), { headers: corsHeaders });
  },
};



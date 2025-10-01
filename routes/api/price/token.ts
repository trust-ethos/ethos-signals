import { Handlers } from "$fresh/server.ts";
import { getDefiLlamaTokenPriceAt, getDefiLlamaTokenPriceAtTimestamp, getDefiLlamaTokenPriceNow } from "../../../utils/price.ts";

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
      // Use precise timestamp
      const price = await getDefiLlamaTokenPriceAtTimestamp(chain, address, timestamp);
      return new Response(JSON.stringify({ price }), { headers: corsHeaders });
    }
    if (date) {
      // Use daily price
      const price = await getDefiLlamaTokenPriceAt(chain, address, date);
      return new Response(JSON.stringify({ price }), { headers: corsHeaders });
    }
    
    // Current price
    const price = await getDefiLlamaTokenPriceNow(chain, address);
    return new Response(JSON.stringify({ price }), { headers: corsHeaders });
  },
};





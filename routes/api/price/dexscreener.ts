import { Handlers } from "$fresh/server.ts";
import { getDexScreenerPriceNow, getDexScreenerTokenInfo } from "../../../utils/dexscreener-api.ts";

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
    const chain = url.searchParams.get("chain") || "solana";
    const address = url.searchParams.get("address");
    const includeInfo = url.searchParams.get("info") === "true";
    
    const corsHeaders = {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    };
    
    if (!address) {
      return new Response(
        JSON.stringify({ error: "address required" }), 
        { status: 400, headers: corsHeaders }
      );
    }
    
    try {
      if (includeInfo) {
        // Return full token info including all pairs
        const info = await getDexScreenerTokenInfo(address);
        
        if (!info || !info.pairs || info.pairs.length === 0) {
          return new Response(
            JSON.stringify({ error: "Token not found on DexScreener", price: null }), 
            { status: 404, headers: corsHeaders }
          );
        }
        
        return new Response(JSON.stringify(info), { headers: corsHeaders });
      } else {
        // Return just the price
        const price = await getDexScreenerPriceNow(chain, address);
        
        if (price === null) {
          return new Response(
            JSON.stringify({ error: "Price not available", price: null }), 
            { status: 404, headers: corsHeaders }
          );
        }
        
        return new Response(JSON.stringify({ price }), { headers: corsHeaders });
      }
    } catch (error) {
      console.error("DexScreener endpoint error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error", price: null }), 
        { status: 500, headers: corsHeaders }
      );
    }
  },
};


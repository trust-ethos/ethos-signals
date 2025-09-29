import { Handlers } from "$fresh/server.ts";
import { buildCoinGeckoUrl } from "../../../utils/coingecko-api.ts";

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
    const coinGeckoId = url.searchParams.get("coinGeckoId");
    const from = url.searchParams.get("from"); // Unix timestamp
    const to = url.searchParams.get("to"); // Unix timestamp
    
    const corsHeaders = {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    };
    
    if (!coinGeckoId || !from || !to) {
      return new Response(JSON.stringify({ error: "coinGeckoId, from, and to are required" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    try {
      // Proxy the request to CoinGecko to avoid CORS issues (includes API key if available)
      const cgUrl = buildCoinGeckoUrl(`/coins/${coinGeckoId}/market_chart/range`, {
        vs_currency: "usd",
        from: from,
        to: to,
      });
      const response = await fetch(cgUrl);
      
      if (!response.ok) {
        return new Response(JSON.stringify({ error: "Failed to fetch from CoinGecko", prices: [] }), { 
          status: response.status, 
          headers: corsHeaders 
        });
      }
      
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    } catch (error) {
      console.error("Error fetching chart data:", error);
      return new Response(JSON.stringify({ error: "Internal server error", prices: [] }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },
};

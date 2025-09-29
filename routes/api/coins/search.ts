import { Handlers } from "$fresh/server.ts";
import { lookupTokenByTwitter } from "../../../utils/token-lookup.ts";

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
    const twitter = url.searchParams.get("twitter");
    
    const corsHeaders = {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    };
    
    if (!twitter) {
      return new Response(JSON.stringify({ error: "twitter parameter required" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    try {
      const tokenInfo = await lookupTokenByTwitter(twitter);
      
      if (!tokenInfo) {
        return new Response(JSON.stringify({ coin: null }), { headers: corsHeaders });
      }
      
      return new Response(JSON.stringify({ 
        coin: {
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          twitter: tokenInfo.twitter,
          image: tokenInfo.image,
          contracts: tokenInfo.contracts,
          source: tokenInfo.source
        }
      }), { headers: corsHeaders });
      
    } catch (error) {
      console.error("Error fetching token data:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch token data" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },
};

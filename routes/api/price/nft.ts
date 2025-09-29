import { Handlers } from "$fresh/server.ts";
import { getMoralisNFTFloorAt, getMoralisNFTFloorNow } from "../../../utils/nft-price.ts";

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
    const chain = (url.searchParams.get("chain") as "ethereum" | "base") ?? "ethereum";
    const address = url.searchParams.get("address");
    const date = url.searchParams.get("date"); // yyyy-mm-dd optional
    
    const corsHeaders = {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    };
    
    if (!address) return new Response(JSON.stringify({ error: "address required" }), { status: 400, headers: corsHeaders });
    
    if (date) {
      // Historical floor price
      const floorPrice = await getMoralisNFTFloorAt(chain, address, date);
      return new Response(JSON.stringify({ floorPrice }), { headers: corsHeaders });
    }
    
    // Current floor price
    const floorPrice = await getMoralisNFTFloorNow(chain, address);
    return new Response(JSON.stringify({ floorPrice }), { headers: corsHeaders });
  },
};

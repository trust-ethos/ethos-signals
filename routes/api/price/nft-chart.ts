import { Handlers } from "$fresh/server.ts";
import { getOpenSeaFloorPriceHistory } from "../../../utils/opensea-api.ts";
import { getMoralisNFTFloorAt } from "../../../utils/nft-price.ts";

type SupportedChain = "ethereum" | "base" | "bsc" | "hyperliquid" | "polygon" | "arbitrum" | "optimism";

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
    const chain = (url.searchParams.get("chain") as SupportedChain) ?? "ethereum";
    const address = url.searchParams.get("address");
    const daysParam = url.searchParams.get("days") || "30";
    const days = parseInt(daysParam, 10);
    
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
    
    if (days < 1 || days > 365) {
      return new Response(
        JSON.stringify({ error: "days must be between 1 and 365" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Try to get data from best source first
      let chartData: Array<{ date: string; floorPrice: number }> = [];

      // For Ethereum/Base: Try Reservoir/Moralis first, then OpenSea
      if (chain === "ethereum" || chain === "base" || chain === "bsc") {
        // Fetch historical data day by day from primary sources
        const dates: string[] = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          dates.push(new Date(currentDate).toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Try to get each day's floor price
        const promises = dates.map(async (date) => {
          const floorPrice = await getMoralisNFTFloorAt(chain, address, date);
          return floorPrice !== null ? { date, floorPrice } : null;
        });

        const results = await Promise.all(promises);
        chartData = results.filter((r): r is { date: string; floorPrice: number } => r !== null);
      }

      // If we don't have enough data from primary sources, try OpenSea
      if (chartData.length < days * 0.3) {
        console.log(`⚠️ Limited data from primary sources (${chartData.length} days), trying OpenSea...`);
        chartData = await getOpenSeaFloorPriceHistory(chain, address, startStr, endStr);
      }

      // Return the chart data
      return new Response(JSON.stringify({ 
        chain,
        address,
        days,
        dataPoints: chartData.length,
        data: chartData 
      }), { 
        headers: corsHeaders 
      });
    } catch (error) {
      console.error("NFT chart endpoint error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch chart data" }), 
        { status: 500, headers: corsHeaders }
      );
    }
  },
};


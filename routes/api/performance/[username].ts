import { Handlers } from "$fresh/server.ts";
import { listTestSignals, getVerifiedByUsername } from "../../../utils/database.ts";
import { calculatePerformance, calculateAggregatePerformance, type SignalWithPrice } from "../../../utils/performance.ts";
import { getDefiLlamaTokenPriceAtTimestamp, getDefiLlamaTokenPriceNow } from "../../../utils/price.ts";
import { getCoinGeckoPriceAtTimestamp } from "../../../utils/price.ts";

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
  
  async GET(_req, ctx) {
    const { username } = ctx.params;
    
    const corsHeaders = {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    };
    
    try {
      // Get user's signals
      const signals = await listTestSignals(username);
      
      if (signals.length === 0) {
        return new Response(JSON.stringify({
          overall: {
            shortTerm: null,
            longTerm: null,
            d1: null,
            d7: null,
            d28: null,
            allTime: null,
            totalSignals: 0
          },
          byAsset: {}
        }), { headers: corsHeaders });
      }
      
      // Group signals by project and fetch prices
      const signalsByAsset: Record<string, SignalWithPrice[]> = {};
      
      for (const signal of signals) {
        const projectKey = signal.projectHandle.toLowerCase();
        
        // Get verified project info
        const project = await getVerifiedByUsername(signal.projectHandle);
        
        if (!project || !project.link) {
          continue; // Skip unverified projects or those without contract addresses
        }
        
        const timestamp = signal.tweetTimestamp || `${signal.notedAt}T12:00:00Z`;
        const signalDate = new Date(timestamp);
        const now = new Date();
        
        // Calculate future dates
        const date1d = new Date(signalDate.getTime() + 24 * 60 * 60 * 1000);
        const date7d = new Date(signalDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        const date28d = new Date(signalDate.getTime() + 28 * 24 * 60 * 60 * 1000);
        
        // Only fetch prices if enough time has passed
        const has1d = now >= date1d;
        const has7d = now >= date7d;
        const has28d = now >= date28d;
        
        let priceAtCall = null;
        let priceAt1d = null;
        let priceAt7d = null;
        let priceAt28d = null;
        let currentPrice = null;
        
        try {
          if (project.type === 'token') {
            // Use CoinGecko if available, otherwise contract address
            if (project.coinGeckoId) {
              priceAtCall = await getCoinGeckoPriceAtTimestamp(project.coinGeckoId, timestamp);
              if (has1d) priceAt1d = await getCoinGeckoPriceAtTimestamp(project.coinGeckoId, date1d.toISOString());
              if (has7d) priceAt7d = await getCoinGeckoPriceAtTimestamp(project.coinGeckoId, date7d.toISOString());
              if (has28d) priceAt28d = await getCoinGeckoPriceAtTimestamp(project.coinGeckoId, date28d.toISOString());
              currentPrice = await getDefiLlamaTokenPriceNow(`coingecko:${project.coinGeckoId}`);
            } else if (project.chain && project.link) {
              priceAtCall = await getDefiLlamaTokenPriceAtTimestamp(project.chain, project.link, timestamp);
              if (has1d) priceAt1d = await getDefiLlamaTokenPriceAtTimestamp(project.chain, project.link, date1d.toISOString());
              if (has7d) priceAt7d = await getDefiLlamaTokenPriceAtTimestamp(project.chain, project.link, date7d.toISOString());
              if (has28d) priceAt28d = await getDefiLlamaTokenPriceAtTimestamp(project.chain, project.link, date28d.toISOString());
              currentPrice = await getDefiLlamaTokenPriceNow(project.chain, project.link);
            }
          }
          // NFT floor price tracking could be added here in the future
        } catch (err) {
          console.error(`Error fetching prices for ${signal.projectHandle}:`, err);
        }
        
        const signalWithPrice: SignalWithPrice = {
          id: signal.id,
          sentiment: signal.sentiment,
          notedAt: signal.notedAt,
          tweetTimestamp: signal.tweetTimestamp,
          priceAtCall,
          priceAt1d,
          priceAt7d,
          priceAt28d,
          currentPrice
        };
        
        if (!signalsByAsset[projectKey]) {
          signalsByAsset[projectKey] = [];
        }
        signalsByAsset[projectKey].push(signalWithPrice);
      }
      
      // Calculate performance by asset
      const performanceByAsset: Record<string, ReturnType<typeof calculatePerformance>> = {};
      for (const [asset, assetSignals] of Object.entries(signalsByAsset)) {
        performanceByAsset[asset] = calculatePerformance(assetSignals);
      }
      
      // Calculate overall performance
      const overallPerformance = calculateAggregatePerformance(signalsByAsset);
      
      return new Response(JSON.stringify({
        overall: overallPerformance,
        byAsset: performanceByAsset
      }), { headers: corsHeaders });
      
    } catch (error) {
      console.error("Error calculating performance:", error);
      return new Response(JSON.stringify({ error: "Failed to calculate performance" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },
};


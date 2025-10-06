import { Handlers } from "$fresh/server.ts";
import { listAllRecentSignals, listVerifiedProjects } from "../../../utils/database.ts";
import { getUserByTwitterUsername, getUserByAddress, getUserByProfileId, EthosUser } from "../../../utils/ethos-api.ts";

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
    const limit = parseInt(url.searchParams.get("limit") || "15");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    
    const corsHeaders = {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    };
    
    try {
      const [signals, verifiedProjects] = await Promise.all([
        listAllRecentSignals(limit, offset),
        listVerifiedProjects()
      ]);
      
      // Fetch Ethos user data for signal authors
      const signalAuthors = [...new Set(signals.map(s => s.twitterUsername))];
      const authorsData = await Promise.all(
        signalAuthors.map(async (username) => {
          const user = await getUserByTwitterUsername(username);
          return { username, user };
        })
      );
      
      const ethosUsers: Record<string, EthosUser> = {};
      for (const { username, user } of authorsData) {
        if (user) {
          ethosUsers[username] = user;
        }
      }
      
      // Fetch Ethos user data for saved-by users (by wallet address or profile ID)
      const savedByPromises = signals
        .filter(s => s.savedBy)
        .map(async (signal) => {
          const savedBy = signal.savedBy!;
          let user = null;
          
          // Try username first if available
          if (savedBy.ethosUsername) {
            user = await getUserByTwitterUsername(savedBy.ethosUsername);
          }
          
          // Otherwise try profile ID
          if (!user && savedBy.ethosProfileId) {
            user = await getUserByProfileId(savedBy.ethosProfileId);
          }
          
          // Otherwise try wallet address as last resort
          if (!user) {
            user = await getUserByAddress(savedBy.walletAddress);
          }
          
          // Store user data with their actual username (or savedBy username as fallback)
          if (user) {
            const key = user.username || savedBy.ethosUsername || savedBy.walletAddress;
            if (key && !ethosUsers[key]) {
              ethosUsers[key] = user;
              console.log(`✅ Fetched saved-by user: ${key} -> ${user.displayName} (${user.avatarUrl})`);
              // Also store under savedBy username if different (case-insensitive)
              if (savedBy.ethosUsername && savedBy.ethosUsername.toLowerCase() !== (user.username || '').toLowerCase()) {
                ethosUsers[savedBy.ethosUsername] = user;
                console.log(`✅ Also storing under: ${savedBy.ethosUsername}`);
              }
            }
          } else {
            console.warn(`❌ Could not fetch Ethos profile for saved-by user:`, savedBy);
          }
        });
      
      await Promise.all(savedByPromises);
      
      return new Response(JSON.stringify({
        signals,
        verifiedProjects,
        ethosUsers,
        hasMore: signals.length === limit
      }), { headers: corsHeaders });
    } catch (error) {
      console.error("Error fetching signals:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch signals" }), {
        status: 500,
        headers: corsHeaders
      });
    }
  },
};

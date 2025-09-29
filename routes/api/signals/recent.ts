import { Handlers } from "$fresh/server.ts";
import { listAllRecentSignals, listVerifiedProjects } from "../../../utils/database.ts";
import { getUserByTwitterUsername, EthosUser } from "../../../utils/ethos-api.ts";

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
      
      // Fetch Ethos user data for unique usernames
      const uniqueUsernames = [...new Set(signals.map(s => s.twitterUsername))];
      const ethosUsersArray = await Promise.all(
        uniqueUsernames.map(async (username) => {
          const user = await getUserByTwitterUsername(username);
          return { username, user };
        })
      );
      
      const ethosUsers: Record<string, EthosUser> = {};
      for (const { username, user } of ethosUsersArray) {
        if (user) {
          ethosUsers[username] = user;
        }
      }
      
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

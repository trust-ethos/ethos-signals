import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { getVerifiedByUsername, type TestSignal } from "../../utils/database.ts";
import { getUserByTwitterUsername, type EthosUser } from "../../utils/ethos-api.ts";
import TokenPageIsland from "../../islands/TokenPageIsland.tsx";

interface TokenPageData {
  project: {
    id: string;
    twitterUsername: string;
    displayName: string;
    avatarUrl: string;
    type: "token" | "nft" | "pre_tge";
    chain?: string;
    link?: string;
    coinGeckoId?: string;
    ticker?: string;
  };
  signals: Array<TestSignal & { user?: EthosUser }>;
  totalSignals: number;
  bullishCount: number;
  bearishCount: number;
}

export const handler: Handlers<TokenPageData> = {
  async GET(_req, ctx) {
    const { handle } = ctx.params;
    
    // Get verified project
    const project = await getVerifiedByUsername(handle);
    
    if (!project || project.type !== "token") {
      return new Response("Token not found", { status: 404 });
    }
    
    // Get all signals for this project from all users using the new database method
    const { getSignalsByProject } = await import("../../utils/database.ts");
    const projectSignals = await getSignalsByProject(handle);
    
    // Fetch Ethos user data for each unique user
    const uniqueUsernames = [...new Set(projectSignals.map(s => s.twitterUsername))];
    const usersMap = new Map<string, EthosUser>();
    
    await Promise.all(
      uniqueUsernames.map(async (username) => {
        try {
          const user = await getUserByTwitterUsername(username);
          if (user) {
            usersMap.set(username, user);
          }
        } catch (error) {
          console.error(`Failed to fetch user ${username}:`, error);
        }
      })
    );
    
    // Attach user data to signals
    const allSignals: (TestSignal & { user?: EthosUser })[] = projectSignals.map(signal => ({
      ...signal,
      user: usersMap.get(signal.twitterUsername),
    }));
    
    const bullishCount = allSignals.filter(s => s.sentiment === 'bullish').length;
    const bearishCount = allSignals.filter(s => s.sentiment === 'bearish').length;
    
    return ctx.render({
      project: {
        id: project.id,
        twitterUsername: project.twitterUsername,
        displayName: project.displayName,
        avatarUrl: project.avatarUrl,
        type: project.type,
        chain: project.chain,
        link: project.link,
        coinGeckoId: project.coinGeckoId,
        ticker: project.ticker,
      },
      signals: allSignals,
      totalSignals: allSignals.length,
      bullishCount,
      bearishCount,
    });
  },
};

export default function TokenPage({ data }: PageProps<TokenPageData>) {
  return (
    <>
      <Head>
        <title>{data.project.displayName} - Ethos Signals</title>
        <meta name="description" content={`View all trading signals and performance for ${data.project.displayName}`} />
      </Head>
      
      <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900">
        <div class="container mx-auto px-4 py-8">
          {/* Project Header */}
          <div class="mb-8">
            <a href="/" class="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </a>
            
            <div class="glass-strong rounded-2xl p-8 border border-white/10">
              <div class="flex items-center gap-6">
                <img 
                  src={data.project.avatarUrl} 
                  alt={data.project.displayName}
                  class="w-24 h-24 rounded-full border-4 border-blue-500/50 shadow-xl"
                />
                <div class="flex-1">
                  <h1 class="text-4xl font-bold text-white mb-2">{data.project.displayName}</h1>
                  <div class="flex items-center gap-4 text-gray-400">
                    <span>@{data.project.twitterUsername}</span>
                    {data.project.ticker && (
                      <>
                        <span>•</span>
                        <span class="font-semibold text-blue-400">${data.project.ticker}</span>
                      </>
                    )}
                    {data.project.chain && (
                      <>
                        <span>•</span>
                        <span class="capitalize">{data.project.chain}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Stats */}
                  <div class="flex gap-6 mt-4">
                    <div>
                      <div class="text-2xl font-bold text-white">{data.totalSignals}</div>
                      <div class="text-sm text-gray-400">Total Signals</div>
                    </div>
                    <div>
                      <div class="text-2xl font-bold text-green-400">{data.bullishCount}</div>
                      <div class="text-sm text-gray-400">Bullish</div>
                    </div>
                    <div>
                      <div class="text-2xl font-bold text-red-400">{data.bearishCount}</div>
                      <div class="text-sm text-gray-400">Bearish</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Content - Island Component */}
          <TokenPageIsland 
            project={data.project}
            initialSignals={data.signals}
          />
        </div>
      </div>
    </>
  );
}


import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import SearchForm from "../islands/SearchForm.tsx";
import RecentSignalsPaginated from "../islands/RecentSignalsPaginated.tsx";
import TraderAvatar from "../islands/TraderAvatar.tsx";
import { listAllRecentSignals, countAllRecentSignals, listVerifiedProjects, TestSignal, VerifiedProject } from "../utils/database.ts";
import { getUserByTwitterUsername, getUserByAddress, getUserByProfileId, EthosUser } from "../utils/ethos-api.ts";
import { getScoreColor } from "../utils/ethos-score.ts";

interface TraderWithStats {
  username: string;
  user: EthosUser;
  signalCount: number;
  bullishCount: number;
  bearishCount: number;
}

interface PageData {
  signals: TestSignal[];
  verifiedProjects: VerifiedProject[];
  ethosUsers: Record<string, EthosUser>;
  topTraders: TraderWithStats[];
  recentTraders: TraderWithStats[];
  currentPage: number;
  totalPages: number;
}

export const handler: Handlers<PageData> = {
  async GET(req, ctx) {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const perPage = 15;
    const offset = (page - 1) * perPage;
    
    const [totalCount, signals, verifiedProjects, allSignals] = await Promise.all([
      countAllRecentSignals(),
      listAllRecentSignals(perPage, offset),
      listVerifiedProjects(),
      listAllRecentSignals(500) // Load many more signals to get enough unique traders for both sections
    ]);
    
    const totalPages = Math.ceil(totalCount / perPage);
    
    // Fetch Ethos user data for signal authors
    const signalAuthors = [...new Set([...signals.map(s => s.twitterUsername), ...allSignals.map(s => s.twitterUsername)])];
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
    
    // Fetch Ethos user data for saved-by users
    const savedByPromises = [...signals, ...allSignals]
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
              // Also store under savedBy username if different (case-insensitive)
              if (savedBy.ethosUsername && savedBy.ethosUsername.toLowerCase() !== (user.username || '').toLowerCase()) {
                ethosUsers[savedBy.ethosUsername] = user;
              }
            }
          }
      });
    
    await Promise.all(savedByPromises);
    
    // Calculate all trader stats
    const allTraderStats = [...new Set(allSignals.map(s => s.twitterUsername))].map(username => {
      const user = ethosUsers[username];
      if (!user) return null;
      
      const userSignals = allSignals.filter(s => s.twitterUsername === username);
      const signalCount = userSignals.length;
      const bullishCount = userSignals.filter(s => s.sentiment === 'bullish').length;
      const bearishCount = userSignals.filter(s => s.sentiment === 'bearish').length;
      
      // Get most recent signal timestamp for this trader
      const mostRecentSignal = userSignals.reduce((latest, signal) => {
        const signalTime = new Date(signal.tweetTimestamp || signal.notedAt).getTime();
        const latestTime = new Date(latest.tweetTimestamp || latest.notedAt).getTime();
        return signalTime > latestTime ? signal : latest;
      }, userSignals[0]);
      
      return {
        username,
        user,
        signalCount,
        bullishCount,
        bearishCount,
        mostRecentTimestamp: new Date(mostRecentSignal.tweetTimestamp || mostRecentSignal.notedAt).getTime()
      };
    }).filter(Boolean) as (TraderWithStats & { mostRecentTimestamp: number })[];
    
    // Top traders by signal count (36 traders)
    const topTraders = allTraderStats
      .sort((a, b) => b.signalCount - a.signalCount)
      .slice(0, 36)
      .map(({ mostRecentTimestamp: _mostRecentTimestamp, ...trader }) => trader);
    
    // Recent traders by most recent signal (54 traders)
    const recentTraders = allTraderStats
      .sort((a, b) => b.mostRecentTimestamp - a.mostRecentTimestamp)
      .slice(0, 54)
      .map(({ mostRecentTimestamp: _mostRecentTimestamp2, ...trader }) => trader);
    
    return ctx.render({ 
      signals, 
      verifiedProjects, 
      ethosUsers, 
      topTraders,
      recentTraders,
      currentPage: page,
      totalPages
    });
  },
};

export default function Home({ data }: PageProps<PageData>) {
  const { signals, verifiedProjects, ethosUsers, topTraders, recentTraders, currentPage, totalPages } = data;
  
  return (
    <>
      <Head>
        <title>Signals - Track Trading Signals with Accountability</title>
        <meta name="description" content="Search for Ethos users and track their bull/bear trading signals with blockchain-verified accountability." />
      </Head>
      
      <div class="min-h-screen gradient-mesh">
        {/* Navigation */}
        <nav class="glass-nav fixed top-0 left-0 right-0 z-50">
          <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex items-center">
                <a href="/" class="flex items-center group">
                  <span class="text-xl font-bold text-white">Signals</span>
                </a>
              </div>
              <div class="flex items-center space-x-4">
                <a 
                  href="/projects" 
                  class="text-gray-400 hover:text-white transition-all duration-300 px-4 py-2 rounded-lg hover:bg-white/10"
                >
                  Verified Projects
                </a>
                <a 
                  href="/admin/verified" 
                  class="text-gray-400 hover:text-white transition-all duration-300 px-4 py-2 rounded-lg hover:bg-white/10"
                >
                  Admin
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          {/* Hero Section */}
          <div class="text-center mb-12">
            <h1 class="text-5xl font-bold text-white mb-4">
              Track Trading Signals
            </h1>
            <p class="text-xl text-gray-400 max-w-2xl mx-auto">
              Follow top traders and track their performance with blockchain-verified accountability
            </p>
          </div>

          {/* Search Section */}
          <div class="mb-8 flex justify-center">
            <SearchForm />
          </div>
          
          {/* Most Signals - Top 20 traders */}
          {topTraders.length > 0 && (
            <div class="glass-strong rounded-3xl shadow-2xl shadow-black/40 p-8 mb-8">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-1 h-8 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full"></div>
                <h2 class="text-2xl font-bold text-white">Most Signals</h2>
              </div>
              
              {/* Grid of top trader avatars - dynamically fills rows */}
              <div class="grid gap-2" style="grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));">
                {topTraders.map((trader) => {
                  const scoreColor = getScoreColor(trader.user.score || 1200);
                  return (
                    <a
                      key={trader.username}
                      href={`/profile/${trader.user.username || trader.username}`}
                      class="group relative"
                      title={`${trader.user.username || trader.username} - ${trader.signalCount} signals`}
                    >
                      {/* Avatar with Ethos score colored border */}
                      <div class="relative aspect-square">
                        <TraderAvatar
                          avatarUrl={trader.user.avatarUrl}
                          username={trader.user.username || trader.username}
                          scoreColor={scoreColor}
                          className="w-full h-full rounded-lg object-cover transition-all duration-300 group-hover:scale-125 group-hover:shadow-2xl group-hover:z-10 border-[3px]"
                        />
                        
                        {/* Sentiment indicator badge */}
                        <div class="absolute -bottom-0.5 -right-0.5 bg-gradient-to-br from-gray-900 to-gray-800 rounded px-1 py-0.5 border border-white/20 shadow-lg">
                          <div class="flex items-center gap-0.5 text-[8px] font-bold leading-none">
                            <span class="text-green-400">{trader.bullishCount}</span>
                            <span class="text-gray-500">/</span>
                            <span class="text-red-400">{trader.bearishCount}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Username on hover */}
                      <div class="absolute inset-x-0 -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                        <div class="text-[10px] font-medium text-white text-center truncate px-1 bg-black/80 rounded py-0.5">
                          {trader.user.username || trader.username}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Signals - Last 54 active traders */}
          {recentTraders.length > 0 && (
            <div class="glass-strong rounded-3xl shadow-2xl shadow-black/40 p-8 mb-8">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                <h2 class="text-2xl font-bold text-white">Recent Signals</h2>
              </div>
              
              {/* Grid of recent trader avatars - dynamically fills rows */}
              <div class="grid gap-2" style="grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));">
                {recentTraders.map((trader) => {
                  const scoreColor = getScoreColor(trader.user.score || 1200);
                  return (
                    <a
                      key={trader.username}
                      href={`/profile/${trader.user.username || trader.username}`}
                      class="group relative"
                      title={`${trader.user.username || trader.username} - ${trader.signalCount} signals`}
                    >
                      {/* Avatar with Ethos score colored border */}
                      <div class="relative aspect-square">
                        <TraderAvatar
                          avatarUrl={trader.user.avatarUrl}
                          username={trader.user.username || trader.username}
                          scoreColor={scoreColor}
                          className="w-full h-full rounded-lg object-cover transition-all duration-300 group-hover:scale-125 group-hover:shadow-2xl group-hover:z-10 border-[3px]"
                        />
                        
                        {/* Sentiment indicator badge */}
                        <div class="absolute -bottom-0.5 -right-0.5 bg-gradient-to-br from-gray-900 to-gray-800 rounded px-1 py-0.5 border border-white/20 shadow-lg">
                          <div class="flex items-center gap-0.5 text-[8px] font-bold leading-none">
                            <span class="text-green-400">{trader.bullishCount}</span>
                            <span class="text-gray-500">/</span>
                            <span class="text-red-400">{trader.bearishCount}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Username on hover */}
                      <div class="absolute inset-x-0 -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                        <div class="text-[10px] font-medium text-white text-center truncate px-1 bg-black/80 rounded py-0.5">
                          {trader.user.username || trader.username}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* All Signals Feed */}
          <div class="glass-strong rounded-3xl shadow-2xl shadow-black/40 p-8">
            <div class="flex items-center gap-3 mb-8">
              <div class="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              <h2 class="text-3xl font-bold text-white">All Signals</h2>
            </div>
            
            {signals.length === 0 ? (
              <div class="text-gray-400 text-center py-16 glass-subtle rounded-2xl">
                <div class="text-6xl mb-4">📊</div>
                <p class="text-lg">No signals yet. Start tracking traders to see their calls here!</p>
              </div>
            ) : (
              <RecentSignalsPaginated
                signals={signals}
                projects={verifiedProjects}
                ethosUsers={ethosUsers}
                currentPage={currentPage}
                totalPages={totalPages}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
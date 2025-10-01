import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import SearchForm from "../islands/SearchForm.tsx";
import RecentSignalsInfinite from "../islands/RecentSignalsInfinite.tsx";
import TradersCarousel from "../islands/TradersCarousel.tsx";
import { listAllRecentSignals, listVerifiedProjects, TestSignal, VerifiedProject } from "../utils/database.ts";
import { getUserByTwitterUsername, EthosUser } from "../utils/ethos-api.ts";

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
  featuredTraders: TraderWithStats[];
}

export const handler: Handlers<PageData> = {
  async GET(_req, ctx) {
    const [signals, verifiedProjects] = await Promise.all([
      listAllRecentSignals(50), // Load more signals for better trader stats
      listVerifiedProjects()
    ]);
    
    // Fetch Ethos user data for all unique usernames in signals
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
    
    // Calculate stats for featured traders
    const traderStats = uniqueUsernames.map(username => {
      const user = ethosUsers[username];
      if (!user) return null;
      
      const userSignals = signals.filter(s => s.twitterUsername === username);
      const signalCount = userSignals.length;
      const bullishCount = userSignals.filter(s => s.sentiment === 'bullish').length;
      const bearishCount = userSignals.filter(s => s.sentiment === 'bearish').length;
      
      return {
        username,
        user,
        signalCount,
        bullishCount,
        bearishCount
      };
    }).filter(Boolean) as TraderWithStats[];
    
    // Sort by signal count and take top 15
    const featuredTraders = traderStats
      .sort((a, b) => b.signalCount - a.signalCount)
      .slice(0, 15);
    
    return ctx.render({ signals: signals.slice(0, 15), verifiedProjects, ethosUsers, featuredTraders });
  },
};

export default function Home({ data }: PageProps<PageData>) {
  const { signals, verifiedProjects, ethosUsers, featuredTraders } = data;
  
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
          <div class="mb-12 flex justify-center">
            <SearchForm />
          </div>
          
          {/* Featured Traders - Only show if we have traders */}
          {featuredTraders.length > 0 && (
            <div class="glass-strong rounded-3xl shadow-2xl shadow-black/40 p-8 mb-8">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                <h2 class="text-2xl font-bold text-white">Active Traders</h2>
              </div>
              
              <TradersCarousel traders={featuredTraders} />
            </div>
          )}
          
          {/* Recent Signals */}
          <div class="glass-strong rounded-3xl shadow-2xl shadow-black/40 p-8">
            <div class="flex items-center gap-3 mb-8">
              <div class="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              <h2 class="text-3xl font-bold text-white">Recent Signals</h2>
            </div>
            
            {signals.length === 0 ? (
              <div class="text-gray-400 text-center py-16 glass-subtle rounded-2xl">
                <div class="text-6xl mb-4">📊</div>
                <p class="text-lg">No signals yet. Start tracking traders to see their calls here!</p>
              </div>
            ) : (
              <RecentSignalsInfinite
                initialSignals={signals}
                initialProjects={verifiedProjects}
                initialEthosUsers={ethosUsers}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import SearchForm from "../islands/SearchForm.tsx";
import SignalPerformance from "../islands/SignalPerformance.tsx";
import RelativeTime from "../islands/RelativeTime.tsx";
import { listAllRecentSignals, listVerifiedProjects, TestSignal, VerifiedProject } from "../utils/database.ts";
import { getUserByTwitterUsername, EthosUser } from "../utils/ethos-api.ts";
import { Badge } from "../components/ui/Badge.tsx";

interface PageData {
  signals: TestSignal[];
  verifiedProjects: VerifiedProject[];
  ethosUsers: Record<string, EthosUser>;
}

export const handler: Handlers<PageData> = {
  async GET(_req, ctx) {
    const [signals, verifiedProjects] = await Promise.all([
      listAllRecentSignals(15),
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
    
    return ctx.render({ signals, verifiedProjects, ethosUsers });
  },
};

export default function Home({ data }: PageProps<PageData>) {
  const { signals, verifiedProjects, ethosUsers } = data;
  
  // Create a lookup map for verified projects
  const verifiedByUsername: Record<string, VerifiedProject> = {};
  for (const project of verifiedProjects) {
    verifiedByUsername[project.twitterUsername.toLowerCase()] = project;
  }
  
  return (
    <>
      <Head>
        <title>Signals - Track Trading Signals with Accountability</title>
        <meta name="description" content="Search for Ethos users and track their bull/bear trading signals with blockchain-verified accountability." />
      </Head>
      
      <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Navigation */}
        <nav style="border-bottom: 1px solid #e5e7eb; background-color: rgba(255, 255, 255, 0.8); backdrop-filter: blur(4px);">
          <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex items-center">
                <a href="/" class="flex items-center">
                  <img
                    src="/logo.svg"
                    width="32"
                    height="32"
                    alt="Signals logo"
                    class="mr-3"
                  />
                  <span class="text-xl font-bold text-gray-900">Signals</span>
                </a>
              </div>
              <div class="flex items-center space-x-4">
                <a href="/admin/verified" class="text-gray-500 hover:text-gray-900 transition-colors">Admin</a>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Section */}
          <div class="mb-8 flex justify-center">
            <SearchForm />
          </div>
          
          {/* Recent Signals */}
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Recent Signals</h2>
            
            {signals.length === 0 ? (
              <div class="text-gray-600 text-center py-8">
                No signals yet. Start tracking traders to see their calls here!
              </div>
            ) : (
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {signals.map((signal) => {
                  const project = verifiedByUsername[signal.projectHandle.toLowerCase()];
                  const ethosUser = ethosUsers[signal.twitterUsername];
                  
                  return (
                    <SignalCard
                      key={signal.id}
                      signal={signal}
                      project={project}
                      ethosUser={ethosUser}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SignalCard({ signal, project, ethosUser }: { 
  signal: TestSignal; 
  project?: VerifiedProject;
  ethosUser?: EthosUser;
}) {
  const avatarUrl = ethosUser?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${signal.twitterUsername}`;
  const displayName = ethosUser?.displayName || signal.twitterUsername;
  
  return (
    <div class="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-all hover:shadow-md bg-white">
      {/* Header with User and Actions */}
      <div class="flex items-start justify-between gap-4 mb-4">
        <div class="flex items-start gap-4 flex-1 min-w-0">
          <a href={`/profile/${signal.twitterUsername}`} class="flex-shrink-0">
            <img 
              src={avatarUrl} 
              alt={displayName}
              class="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
            />
          </a>
          <div class="flex-1 min-w-0">
            <a href={`/profile/${signal.twitterUsername}`} class="block">
              <h3 class="font-bold text-gray-900 hover:text-blue-600 transition-colors truncate">
                {displayName}
              </h3>
              <p class="text-sm text-gray-500">@{signal.twitterUsername}</p>
            </a>
            {ethosUser && (
              <div class="mt-1">
                <span class="text-xs text-gray-600">
                  Score: <span class="font-semibold text-blue-600">{ethosUser.score}</span>
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions in Top Right */}
        <div class="flex flex-col items-end gap-2 text-right flex-shrink-0">
          <RelativeTime 
            timestamp={signal.tweetTimestamp || `${signal.notedAt}T00:00:00Z`}
          />
          <a 
            class="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 whitespace-nowrap" 
            href={signal.tweetUrl} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            View Tweet
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <a 
            href={`/profile/${signal.twitterUsername}`}
            class="text-xs text-gray-600 hover:text-blue-600 whitespace-nowrap"
          >
            Full Profile →
          </a>
        </div>
      </div>
      
      {/* Signal Info */}
      <div class="space-y-3">
        <div>
          <Badge variant={signal.sentiment === "bullish" ? "success" : "destructive"} class="text-sm">
            {signal.sentiment === "bullish" ? "🚀 Bullish" : "📉 Bearish"}
          </Badge>
        </div>
        
        {/* Project */}
        <div class="flex items-center gap-2">
          {project && (
            <span class="text-xl">
              {project.type === 'token' ? '💰' : project.type === 'nft' ? '🖼️' : '🚀'}
            </span>
          )}
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-gray-900 truncate">
              {project?.displayName || `@${signal.projectHandle}`}
            </p>
          </div>
        </div>
        
        {/* Tweet Content */}
        {signal.tweetContent && (
          <div class="text-sm text-gray-700 line-clamp-3 bg-gray-50 p-3 rounded border-l-4 border-gray-300">
            "{signal.tweetContent}"
          </div>
        )}
        
        {/* Performance */}
        <SignalPerformance
          signalId={signal.id}
          projectHandle={signal.projectHandle}
          sentiment={signal.sentiment}
          notedAt={signal.notedAt}
          tweetTimestamp={signal.tweetTimestamp}
          project={project ? {
            type: project.type,
            chain: project.chain,
            link: project.link,
            coinGeckoId: project.coinGeckoId
          } : undefined}
        />
      </div>
    </div>
  );
}
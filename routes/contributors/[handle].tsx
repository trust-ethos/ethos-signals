import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { getSignalsByContributor, listVerifiedProjects, type TestSignal, type VerifiedProject } from "../../utils/database.ts";
import { getUserByTwitterUsername, type EthosUser } from "../../utils/ethos-api.ts";
import { getAuthFromRequest } from "../../utils/auth-middleware.ts";
import ContributorSignalsList from "../../islands/ContributorSignalsList.tsx";

interface ContributorPageData {
  contributor: EthosUser | null;
  signals: TestSignal[];
  verifiedProjects: VerifiedProject[];
  isOwnPage: boolean;
  currentUserUsername?: string;
}

export const handler: Handlers<ContributorPageData> = {
  async GET(req, ctx) {
    const { handle } = ctx.params;
    
    // Get contributor info from Ethos
    const contributor = await getUserByTwitterUsername(handle);
    
    if (!contributor) {
      return new Response("Contributor not found", { status: 404 });
    }
    
    // Get all signals contributed by this user
    const signals = await getSignalsByContributor(handle);
    
    // Get verified projects for signal lookups
    const verifiedProjects = await listVerifiedProjects();
    
    // Check if the logged-in user is viewing their own page
    const auth = await getAuthFromRequest(req);
    const isOwnPage = auth?.ethosUsername?.toLowerCase() === handle.toLowerCase();
    
    return ctx.render({
      contributor,
      signals,
      verifiedProjects,
      isOwnPage,
      currentUserUsername: auth?.ethosUsername,
    });
  },
};

export default function ContributorPage({ data }: PageProps<ContributorPageData>) {
  const { contributor, signals, verifiedProjects, isOwnPage } = data;
  
  if (!contributor) {
    return (
      <div class="min-h-screen gradient-mesh flex items-center justify-center">
        <div class="text-white text-center">
          <h1 class="text-4xl font-bold mb-4">Contributor Not Found</h1>
          <p class="text-gray-400">The contributor you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>{contributor.displayName} - Signals Contributor</title>
        <meta name="description" content={`View all signals contributed by ${contributor.displayName}`} />
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
                  href="/" 
                  class="text-gray-400 hover:text-white transition-all duration-300 px-4 py-2 rounded-lg hover:bg-white/10"
                >
                  Home
                </a>
                <a 
                  href="/projects" 
                  class="text-gray-400 hover:text-white transition-all duration-300 px-4 py-2 rounded-lg hover:bg-white/10"
                >
                  Verified Projects
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          {/* Contributor Header */}
          <div class="glass-strong rounded-3xl shadow-2xl shadow-black/40 p-8 mb-8">
            <div class="flex items-start gap-6">
              <img 
                src={contributor.avatarUrl} 
                alt={contributor.displayName}
                class="w-24 h-24 rounded-full border-4 border-blue-500 shadow-lg shadow-blue-500/30"
              />
              <div class="flex-1">
                <h1 class="text-4xl font-bold text-white mb-2">
                  {contributor.displayName}
                </h1>
                {contributor.username && (
                  <p class="text-xl text-gray-400 mb-4">@{contributor.username}</p>
                )}
                <div class="flex items-center gap-6">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-blue-400">{signals.length}</div>
                    <div class="text-sm text-gray-400">Signals Contributed</div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-green-400">
                      {signals.filter(s => s.sentiment === 'bullish').length}
                    </div>
                    <div class="text-sm text-gray-400">Bullish</div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-red-400">
                      {signals.filter(s => s.sentiment === 'bearish').length}
                    </div>
                    <div class="text-sm text-gray-400">Bearish</div>
                  </div>
                </div>
              </div>
            </div>
            
            {isOwnPage && (
              <div class="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p class="text-sm text-blue-300">
                  ✨ You're viewing your own contributions. You can delete any signal you've saved.
                </p>
              </div>
            )}
          </div>

          {/* Signals List */}
          <div class="glass-strong rounded-3xl shadow-2xl shadow-black/40 p-8">
            <div class="flex items-center gap-3 mb-8">
              <div class="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              <h2 class="text-3xl font-bold text-white">Contributed Signals</h2>
            </div>
            
            {signals.length === 0 ? (
              <div class="text-gray-400 text-center py-16 glass-subtle rounded-2xl">
                <div class="text-6xl mb-4">📊</div>
                <p class="text-lg">No signals contributed yet.</p>
              </div>
            ) : (
              <ContributorSignalsList
                signals={signals}
                verifiedProjects={verifiedProjects}
                isOwnPage={isOwnPage}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}


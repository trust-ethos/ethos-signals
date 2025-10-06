import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { EthosUser, getUserByTwitterUsername } from "../../utils/ethos-api.ts";
import { Card, CardContent } from "../../components/ui/Card.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import SignalsForm from "../../islands/SignalsForm.tsx";
import PerformanceMetrics from "../../islands/PerformanceMetrics.tsx";
import { getScoreLevelName, getScoreColor, getScoreBadgeVariant } from "../../utils/ethos-score.ts";
import { listTestSignals, listVerifiedProjects } from "../../utils/database.ts";

interface ProfileData {
  user: EthosUser;
  totalSignals: number;
  signalAccuracy: {
    correct: number;
    incorrect: number;
    pending: number;
  };
}

export const handler: Handlers<ProfileData | null> = {
  async GET(req, ctx) {
    const { username } = ctx.params;
    
    try {
      const user = await getUserByTwitterUsername(username);
      
      if (!user) {
        return ctx.renderNotFound();
      }

      // Get user signals and verified projects to calculate stats
      const [signals, verifiedProjects] = await Promise.all([
        listTestSignals(username),
        listVerifiedProjects()
      ]);
      
      // Calculate signal accuracy
      let correct = 0;
      let incorrect = 0;
      let pending = 0;
      
      // Create a map of verified projects by username for quick lookup
      const projectsByUsername: Record<string, typeof verifiedProjects[0]> = {};
      for (const proj of verifiedProjects) {
        projectsByUsername[proj.twitterUsername.toLowerCase()] = proj;
      }
      
      // Check accuracy for each signal
      await Promise.all(signals.map(async (signal) => {
        const project = projectsByUsername[signal.projectHandle.toLowerCase()];
        
        // Skip if no project or no price tracking
        if (!project || project.hasPriceTracking === false) {
          pending++;
          return;
        }
        
        try {
          const baseTime = signal.tweetTimestamp ? new Date(signal.tweetTimestamp) : new Date(signal.notedAt + 'T00:00:00Z');
          const baseUrl = new URL(req.url).origin;
          
          let callPrice: number | null = null;
          let currentPrice: number | null = null;
          
          // Fetch prices based on project type
          if (project.type === 'token') {
            if (project.coinGeckoId) {
              // Use CoinGecko for tokens with coinGeckoId
              const [callRes, currentRes] = await Promise.all([
                fetch(`${baseUrl}/api/price/coingecko?id=${project.coinGeckoId}&timestamp=${baseTime.toISOString()}`),
                fetch(`${baseUrl}/api/price/coingecko?id=${project.coinGeckoId}`)
              ]);
              const callData = await callRes.json();
              const currentData = await currentRes.json();
              callPrice = callData.price;
              currentPrice = currentData.price;
            } else if (project.chain && project.link) {
              // Use DefiLlama for tokens with contract address
              const [callRes, currentRes] = await Promise.all([
                fetch(`${baseUrl}/api/price/token?chain=${project.chain}&address=${project.link}&timestamp=${baseTime.toISOString()}`),
                fetch(`${baseUrl}/api/price/token?chain=${project.chain}&address=${project.link}`)
              ]);
              const callData = await callRes.json();
              const currentData = await currentRes.json();
              callPrice = callData.price;
              currentPrice = currentData.price;
            }
          }
          
          // Determine if signal is correct
          if (callPrice !== null && currentPrice !== null && callPrice > 0) {
            const priceChange = ((currentPrice - callPrice) / callPrice) * 100;
            const isCorrect = (signal.sentiment === 'bullish' && priceChange >= 0) || 
                             (signal.sentiment === 'bearish' && priceChange < 0);
            
            if (isCorrect) {
              correct++;
            } else {
              incorrect++;
            }
          } else {
            pending++;
          }
        } catch (error) {
          console.error(`Error calculating accuracy for signal ${signal.id}:`, error);
          pending++;
        }
      }));

      return ctx.render({ 
        user, 
        totalSignals: signals.length,
        signalAccuracy: {
          correct,
          incorrect,
          pending
        }
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return ctx.renderNotFound();
    }
  },
};

export default function ProfilePage({ data }: PageProps<ProfileData | null>) {
  if (!data) {
    return (
      <>
        <Head>
          <title>Profile Not Found - Signals</title>
        </Head>
        <div class="min-h-screen gradient-mesh flex items-center justify-center">
          <Card class="max-w-md mx-auto glass-strong">
            <CardContent class="p-8 text-center">
              <div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 class="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
              <p class="text-gray-400 mb-6">The user you're looking for doesn't exist or isn't connected to Ethos.</p>
              <a href="/">
                <Button variant="outline">
                  ← Back to Search
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const { user, totalSignals, signalAccuracy: _signalAccuracy } = data;

  return (
    <>
      <Head>
        <title>{user.displayName} - Signals Profile</title>
        <meta name="description" content={`View ${user.displayName}'s Ethos profile and trading signals history.`} />
      </Head>
      
      <div class="min-h-screen gradient-mesh">
        {/* Navigation */}
        <nav class="glass-nav fixed top-0 left-0 right-0 z-50">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex items-center">
                <a href="/" class="mr-4">
                  <Button variant="ghost">
                    <div class="flex items-center">
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      <span>Back to Search</span>
                    </div>
                  </Button>
                </a>
                <span class="text-xl font-bold text-white">Signals</span>
              </div>
              <div class="flex items-center space-x-4">
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

        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          {/* Profile Header Card */}
          <Card class="mb-8 glass-strong hover-glow">
            <CardContent class="p-8">
              <div class="flex flex-col lg:flex-row items-start gap-8 py-4">
                {/* Avatar and Basic Info */}
                <div class="flex flex-col items-center lg:items-start">
                  <div class="relative">
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      class="w-32 h-32 rounded-full ring-4 shadow-2xl"
                      style={`border-color: ${getScoreColor(user.score)}; box-shadow: 0 0 20px ${getScoreColor(user.score)}50, 0 20px 40px rgba(0,0,0,0.4);`}
                    />
                  </div>
                  
                  <div class="mt-6 flex flex-col gap-3 w-full">
                    {user.username && (
                      <a href={`/contributors/${user.username}`} class="w-full">
                        <Button variant="default" size="sm" class="w-full">
                          <div class="flex items-center justify-center w-full">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>View Contributions</span>
                          </div>
                        </Button>
                      </a>
                    )}
                    <a href={`https://app.ethos.network/profile/x/${user.username || user.displayName.toLowerCase().replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer" class="w-full">
                      <Button variant="outline" size="sm" class="w-full">
                        <div class="flex items-center justify-center w-full">
                          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span>View on Ethos</span>
                        </div>
                      </Button>
                    </a>
                    {user.username && (
                      <a href={`https://x.com/${user.username}`} target="_blank" rel="noopener noreferrer" class="w-full">
                        <Button variant="outline" size="sm" class="w-full">
                          <div class="flex items-center justify-center w-full">
                            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            <span>View on Twitter</span>
                          </div>
                        </Button>
                      </a>
                    )}
                  </div>
                </div>

                {/* Profile Details */}
                <div class="flex-1 w-full">
                  <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6">
                    <div>
                      <h1 class="text-4xl font-bold text-white mb-3">
                        {user.displayName}
                      </h1>
                      {user.username && (
                        <p class="text-xl text-gray-400 mb-3">@{user.username}</p>
                      )}
                      <Badge variant={getScoreBadgeVariant(user.score)} class="text-sm">
                        {`${user.score} - ${getScoreLevelName(user.score)}`}
                      </Badge>
                    </div>
                  </div>

                  {user.description && (
                    <p class="text-gray-300 mb-6 text-lg leading-relaxed">{user.description}</p>
                  )}

                  {/* Stats Section - All in one row */}
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Total Signals */}
                    <div class="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-4 border border-blue-500/30 backdrop-blur-sm">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <span class="text-sm font-medium text-blue-300">Total Signals</span>
                      </div>
                      <div class="text-3xl font-bold text-blue-100">{totalSignals}</div>
                      <div class="text-xs text-blue-300">Tracked signals</div>
                    </div>

                    {/* Performance Metrics */}
                    <PerformanceMetrics username={user.username || user.displayName} inline />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signals History */}
          <SignalsForm username={user.username || user.displayName} />
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from "preact/hooks";
import PriceChart from "./PriceChart.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import SignalPerformance from "./SignalPerformance.tsx";

interface Signal {
  id: string;
  twitterUsername: string;
  sentiment: "bullish" | "bearish";
  tweetUrl: string;
  tweetContent?: string;
  projectHandle: string;
  notedAt: string;
  tweetTimestamp?: string;
  user?: {
    displayName: string;
    username?: string | null;
    avatarUrl: string;
    score: number;
  };
}

interface Project {
  id: string;
  twitterUsername: string;
  displayName: string;
  avatarUrl: string;
  type: "token" | "nft" | "pre_tge";
  chain?: string;
  link?: string;
  coinGeckoId?: string;
  ticker?: string;
}

interface LeaderboardEntry {
  username: string;
  displayName: string;
  avatarUrl: string;
  score: number;
  signalCount: number;
  performance: number | null; // Average of short-term + long-term
  shortTerm: number | null;
  longTerm: number | null;
  bullishCount: number;
  bearishCount: number;
}

interface Props {
  project: Project;
  initialSignals: Signal[];
}

export default function TokenPageIsland({ project, initialSignals }: Props) {
  const [signals] = useState<Signal[]>(initialSignals);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function calculateLeaderboard() {
      // Calculate leaderboard from signals
      const userMap = new Map<string, LeaderboardEntry>();
      
      signals.forEach(signal => {
        if (!signal.user) return;
        
        const username = signal.user.username || signal.twitterUsername;
        
        if (!userMap.has(username)) {
          userMap.set(username, {
            username,
            displayName: signal.user.displayName,
            avatarUrl: signal.user.avatarUrl,
            score: signal.user.score,
            signalCount: 0,
            performance: null,
            shortTerm: null,
            longTerm: null,
            bullishCount: 0,
            bearishCount: 0,
          });
        }
        
        const entry = userMap.get(username)!;
        entry.signalCount++;
        if (signal.sentiment === 'bullish') entry.bullishCount++;
        if (signal.sentiment === 'bearish') entry.bearishCount++;
      });
      
      // Fetch performance data for each user
      const leaderboardEntries = Array.from(userMap.values());
      await Promise.all(
        leaderboardEntries.map(async (entry) => {
          try {
            const res = await fetch(`/api/performance/${entry.username}`);
            const data = await res.json();
            
            // Get performance for this specific project
            const projectPerf = data.byAsset?.[project.twitterUsername.toLowerCase()];
            if (projectPerf) {
              entry.shortTerm = projectPerf.shortTerm;
              entry.longTerm = projectPerf.longTerm;
              
              // Calculate overall performance (average of available metrics)
              const metrics = [projectPerf.shortTerm, projectPerf.longTerm].filter(m => m !== null && m !== undefined);
              entry.performance = metrics.length > 0 
                ? metrics.reduce((a, b) => a + b, 0) / metrics.length 
                : null;
            }
          } catch (error) {
            console.error(`Failed to fetch performance for ${entry.username}:`, error);
          }
        })
      );
      
      // Sort by performance (highest first), then by signal count
      const sortedLeaderboard = leaderboardEntries.sort((a, b) => {
        // If both have performance data, sort by performance
        if (a.performance !== null && b.performance !== null) {
          return b.performance - a.performance;
        }
        // If only one has performance, prioritize it
        if (a.performance !== null) return -1;
        if (b.performance !== null) return 1;
        // Otherwise sort by signal count
        return b.signalCount - a.signalCount;
      });
      
      setLeaderboard(sortedLeaderboard);
      setLoading(false);
    }
    
    calculateLeaderboard();
  }, [signals, project.twitterUsername]);

  return (
    <div class="space-y-6">
      {/* Top Performers - Short List */}
      <div class="glass-strong rounded-2xl border border-white/10 overflow-hidden">
        <div class="p-6">
          <h2 class="text-2xl font-bold text-white mb-6">🏆 Top Performers</h2>
          {loading ? (
            <div class="text-center py-12 text-gray-400">
              Loading performance data...
            </div>
          ) : (
            <div class="space-y-3">
              {leaderboard.slice(0, 5).map((entry, index) => (
                <a
                  key={entry.username}
                  href={`/profile/${entry.username}`}
                  class="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
                >
                  {/* Rank */}
                  <div class="text-2xl font-bold text-gray-400 w-8">
                    {index + 1}
                  </div>
                  
                  {/* User Info */}
                  <img 
                    src={entry.avatarUrl} 
                    alt={entry.displayName}
                    class="w-12 h-12 rounded-full border-2 border-blue-500/50"
                  />
                  <div class="flex-1">
                    <div class="font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {entry.displayName}
                    </div>
                    <div class="text-sm text-gray-400">
                      @{entry.username} • Score: {entry.score}
                    </div>
                  </div>
                  
                  {/* Performance & Stats */}
                  <div class="flex gap-6 text-sm">
                    {entry.performance !== null && (
                      <div class="text-center">
                        <div class={`text-lg font-bold ${entry.performance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {entry.performance >= 0 ? '+' : ''}{entry.performance.toFixed(0)}%
                        </div>
                        <div class="text-gray-400">Performance</div>
                      </div>
                    )}
                    <div class="text-center">
                      <div class="text-white font-bold">{entry.signalCount}</div>
                      <div class="text-gray-400">Signals</div>
                    </div>
                    <div class="text-center">
                      <div class="text-green-400 font-bold">{entry.bullishCount}</div>
                      <div class="text-gray-400">Bull</div>
                    </div>
                    <div class="text-center">
                      <div class="text-red-400 font-bold">{entry.bearishCount}</div>
                      <div class="text-gray-400">Bear</div>
                    </div>
                  </div>
                </a>
              ))}
              
                {leaderboard.length === 0 && (
                  <div class="text-center py-12 text-gray-400">
                    No signals yet for this token
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      
      {/* Price History Chart */}
      <div class="glass-strong rounded-2xl border border-white/10 overflow-hidden">
        <div class="p-6">
          <h2 class="text-2xl font-bold text-white mb-4">📊 Price History</h2>
          <PriceChart
            coinGeckoId={project.coinGeckoId}
            chain={project.chain}
            address={project.link}
            signals={signals.map(s => ({
              timestamp: s.tweetTimestamp || s.notedAt,
              sentiment: s.sentiment,
              tweetContent: s.tweetContent,
              twitterUsername: s.twitterUsername,
            }))}
            projectName={project.displayName}
          />
        </div>
      </div>

      {/* All Signals */}
      <div class="glass-strong rounded-2xl border border-white/10 overflow-hidden">
        <div class="p-6">
          <h2 class="text-2xl font-bold text-white mb-6">📢 All Signals</h2>
            <div class="space-y-4">
              {signals.map(signal => (
                <div key={signal.id} class="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div class="flex items-start gap-4">
                    {signal.user && (
                      <a href={`/profile/${signal.user.username || signal.twitterUsername}`}>
                        <img 
                          src={signal.user.avatarUrl} 
                          alt={signal.user.displayName}
                          class="w-12 h-12 rounded-full border-2 border-blue-500/50 hover:scale-110 transition-transform"
                        />
                      </a>
                    )}
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-2">
                        {signal.user && (
                          <a 
                            href={`/profile/${signal.user.username || signal.twitterUsername}`}
                            class="font-semibold text-white hover:text-blue-400"
                          >
                            {signal.user.displayName}
                          </a>
                        )}
                        <Badge variant={signal.sentiment === "bullish" ? "success" : "destructive"} class="text-xs">
                          {signal.sentiment === "bullish" ? "🐂 Bullish" : "🐻 Bearish"}
                        </Badge>
                        <span class="text-sm text-gray-400">
                          {new Date(signal.tweetTimestamp || signal.notedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p class="text-gray-300 mb-2">{signal.tweetContent}</p>
                      <a 
                        href={signal.tweetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-sm text-blue-400 hover:text-blue-300 inline-block mb-3"
                      >
                        View Tweet →
                      </a>
                      
                      {/* Signal Performance */}
                      <SignalPerformance
                        signalId={signal.id}
                        projectHandle={signal.projectHandle}
                        sentiment={signal.sentiment}
                        notedAt={signal.notedAt}
                        tweetTimestamp={signal.tweetTimestamp}
                        project={{
                          type: project.type,
                          chain: project.chain as "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid" | undefined,
                          link: project.link,
                          coinGeckoId: project.coinGeckoId,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {signals.length === 0 && (
                <div class="text-center py-12 text-gray-400">
                  No signals yet for this token
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}


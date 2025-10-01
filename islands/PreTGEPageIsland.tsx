import { useState, useEffect } from "preact/hooks";
import { Badge } from "../components/ui/Badge.tsx";

interface Signal {
  id: string;
  twitterUsername: string;
  sentiment: "bullish" | "bearish";
  tweetUrl: string;
  tweetContent?: string;
  projectHandle: string;
  notedAt: string;
  tweetTimestamp?: string;
  onchainTxHash?: string;
  onchainSignalId?: number;
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
  ticker?: string;
}

interface LeaderboardEntry {
  username: string;
  displayName: string;
  avatarUrl: string;
  score: number;
  signalCount: number;
  bullishCount: number;
  bearishCount: number;
}

interface Props {
  project: Project;
  initialSignals: Signal[];
}

export default function PreTGEPageIsland({ initialSignals }: Props) {
  const [signals] = useState<Signal[]>(initialSignals);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
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
          bullishCount: 0,
          bearishCount: 0,
        });
      }
      
      const entry = userMap.get(username)!;
      entry.signalCount++;
      if (signal.sentiment === 'bullish') entry.bullishCount++;
      if (signal.sentiment === 'bearish') entry.bearishCount++;
    });
    
    const leaderboardData = Array.from(userMap.values())
      .sort((a, b) => b.signalCount - a.signalCount);
    
    setLeaderboard(leaderboardData);
  }, [signals]);

  return (
    <div class="space-y-6">
      {/* Launch Status */}
      <div class="glass-strong rounded-2xl p-6 border border-white/10">
        <div class="flex items-center justify-center gap-4">
          <div>
            <div class="text-xl font-bold text-white">Launches Soon</div>
            <div class="text-sm text-gray-400">Price data will be available after TGE</div>
          </div>
        </div>
      </div>

      {/* Top Performers - Short List */}
      <div class="glass-strong rounded-2xl border border-white/10 overflow-hidden">
        <div class="p-6">
          <h2 class="text-2xl font-bold text-white mb-6">Early Supporters</h2>
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
                  
                  {/* Stats */}
                  <div class="flex gap-6 text-sm">
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
                  No signals yet for this project
                </div>
              )}
            </div>
        </div>
      </div>

      {/* All Signals */}
      <div class="glass-strong rounded-2xl border border-white/10 overflow-hidden">
        <div class="p-6">
          <h2 class="text-2xl font-bold text-white mb-6">All Signals</h2>
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
                          {signal.sentiment === "bullish" ? "Bullish" : "Bearish"}
                        </Badge>
                        <span class="text-sm text-gray-400">
                          {new Date(signal.tweetTimestamp || signal.notedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p class="text-gray-300 mb-2">{signal.tweetContent}</p>
                      <div class="flex items-center gap-3">
                        <a 
                          href={signal.tweetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                        >
                          View Tweet →
                        </a>
                        {signal.onchainTxHash && (
                          <a 
                            href={`https://basescan.org/tx/${signal.onchainTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-sm text-green-400 hover:text-green-300 inline-flex items-center gap-1"
                            title="View on BaseScan"
                          >
                            View Onchain →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {signals.length === 0 && (
                <div class="text-center py-12 text-gray-400">
                  No signals yet for this project
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}


import { useState, useEffect } from "preact/hooks";

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

interface SupporterEntry {
  username: string;
  displayName: string;
  avatarUrl: string;
  score: number;
  firstSignalDate: string;
  signalCount: number;
  bullishCount: number;
  bearishCount: number;
  signals: Signal[];
}

interface Props {
  project: Project;
  initialSignals: Signal[];
}

export default function PreTGEPageIsland({ initialSignals }: Props) {
  const [signals] = useState<Signal[]>(initialSignals);
  const [supporters, setSupporters] = useState<SupporterEntry[]>([]);

  useEffect(() => {
    // Calculate supporters from signals, grouped by user and sorted chronologically
    const userMap = new Map<string, SupporterEntry>();
    
    signals.forEach(signal => {
      if (!signal.user) return;
      
      const username = signal.user.username || signal.twitterUsername;
      const signalDate = signal.tweetTimestamp || signal.notedAt;
      
      if (!userMap.has(username)) {
        userMap.set(username, {
          username,
          displayName: signal.user.displayName,
          avatarUrl: signal.user.avatarUrl,
          score: signal.user.score,
          firstSignalDate: signalDate,
          signalCount: 0,
          bullishCount: 0,
          bearishCount: 0,
          signals: [],
        });
      }
      
      const entry = userMap.get(username)!;
      entry.signalCount++;
      if (signal.sentiment === 'bullish') entry.bullishCount++;
      if (signal.sentiment === 'bearish') entry.bearishCount++;
      entry.signals.push(signal);
      
      // Update first signal date if this one is earlier
      if (signalDate < entry.firstSignalDate) {
        entry.firstSignalDate = signalDate;
      }
    });
    
    // Sort by first signal date (earliest first)
    const supportersData = Array.from(userMap.values())
      .sort((a, b) => new Date(a.firstSignalDate).getTime() - new Date(b.firstSignalDate).getTime());
    
    setSupporters(supportersData);
  }, [signals]);

  return (
    <div class="space-y-6">
      {/* Launch Status */}
      <div class="glass-strong rounded-2xl p-6 border border-white/10">
        <div class="flex items-center justify-center gap-4">
          <div class="text-center">
            <div class="text-xl font-bold text-white mb-2">🚀 Launches Soon</div>
            <div class="text-sm text-gray-400">Price data will be available after TGE</div>
          </div>
        </div>
      </div>

      {/* Early Supporters Table */}
      <div class="glass-strong rounded-2xl border border-white/10 overflow-hidden">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-white">Early Supporters</h2>
            <div class="text-sm text-gray-400">
              {supporters.length} {supporters.length === 1 ? 'supporter' : 'supporters'}
            </div>
          </div>
          
          {supporters.length > 0 ? (
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-white/10">
                    <th class="text-left py-3 px-4 text-sm font-semibold text-gray-400">#</th>
                    <th class="text-left py-3 px-4 text-sm font-semibold text-gray-400">Supporter</th>
                    <th class="text-left py-3 px-4 text-sm font-semibold text-gray-400">First Signal</th>
                    <th class="text-center py-3 px-4 text-sm font-semibold text-gray-400">Signals</th>
                    <th class="text-center py-3 px-4 text-sm font-semibold text-gray-400">Sentiment</th>
                    <th class="text-center py-3 px-4 text-sm font-semibold text-gray-400">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {supporters.map((supporter, index) => (
                    <tr 
                      key={supporter.username}
                      class="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      {/* Rank */}
                      <td class="py-4 px-4">
                        <div class="flex items-center gap-2">
                          <span class="text-lg font-bold text-gray-400">
                            {index + 1}
                          </span>
                          {index === 0 && (
                            <span class="text-xl" title="First supporter">🥇</span>
                          )}
                          {index === 1 && (
                            <span class="text-xl" title="Second supporter">🥈</span>
                          )}
                          {index === 2 && (
                            <span class="text-xl" title="Third supporter">🥉</span>
                          )}
                        </div>
                      </td>
                      
                      {/* User Info */}
                      <td class="py-4 px-4">
                        <a 
                          href={`/profile/${supporter.username}`}
                          class="flex items-center gap-3 group"
                        >
                          <img 
                            src={supporter.avatarUrl} 
                            alt={supporter.displayName}
                            class="w-10 h-10 rounded-full border-2 border-blue-500/50 group-hover:scale-110 transition-transform"
                          />
                          <div>
                            <div class="font-semibold text-white group-hover:text-blue-400 transition-colors">
                              {supporter.displayName}
                            </div>
                            <div class="text-sm text-gray-400">
                              @{supporter.username}
                            </div>
                          </div>
                        </a>
                      </td>
                      
                      {/* First Signal Date */}
                      <td class="py-4 px-4">
                        <div class="text-sm text-gray-300">
                          {new Date(supporter.firstSignalDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div class="text-xs text-gray-500">
                          {new Date(supporter.firstSignalDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      
                      {/* Signal Count */}
                      <td class="py-4 px-4 text-center">
                        <div class="text-lg font-bold text-white">
                          {supporter.signalCount}
                        </div>
                      </td>
                      
                      {/* Sentiment Breakdown */}
                      <td class="py-4 px-4">
                        <div class="flex items-center justify-center gap-3">
                          <div class="flex items-center gap-1">
                            <span class="text-green-400 font-bold">{supporter.bullishCount}</span>
                            <span class="text-xs text-gray-400">🐂</span>
                          </div>
                          <div class="flex items-center gap-1">
                            <span class="text-red-400 font-bold">{supporter.bearishCount}</span>
                            <span class="text-xs text-gray-400">🐻</span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Ethos Score */}
                      <td class="py-4 px-4 text-center">
                        <div class="text-sm font-semibold text-blue-400">
                          {supporter.score}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div class="text-center py-12 text-gray-400">
              No supporters yet for this project
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


import { useState, useEffect } from "preact/hooks";
import PriceChart from "./PriceChart.tsx";
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

// Helper component for token price deltas
function PriceDelta({ id, chain, address, notedAt, tweetTimestamp, sentiment }: { 
  id: string; 
  chain: string; 
  address: string; 
  notedAt: string; 
  tweetTimestamp?: string; 
  sentiment: "bullish" | "bearish" 
}) {
  const [data, setData] = useState<{ call?: number|null; d1?: number|null; d7?: number|null; d28?: number|null; current?: number|null } | null>(null);
  
  useEffect(() => {
    (async () => {
      const baseTime = tweetTimestamp ? new Date(tweetTimestamp) : new Date(notedAt + 'T00:00:00Z');
      const dayMS = 24 * 3600 * 1000;
      
      const fetchAtTime = async (offsetDays: number) => {
        const targetTime = new Date(baseTime.getTime() + offsetDays * dayMS);
        if (offsetDays === 0 && tweetTimestamp) {
          return (await fetch(`/api/price/token?chain=${chain}&address=${address}&timestamp=${tweetTimestamp}`)).json();
        } else {
          const dateISO = targetTime.toISOString().slice(0, 10);
          return (await fetch(`/api/price/token?chain=${chain}&address=${address}&date=${dateISO}`)).json();
        }
      };
      
      const fetchCurrent = async () => {
        return (await fetch(`/api/price/token?chain=${chain}&address=${address}`)).json();
      };
      
      const [p0, p1, p7, p28, pCurrent] = await Promise.all([
        fetchAtTime(0),
        fetchAtTime(1),
        fetchAtTime(7),
        fetchAtTime(28),
        fetchCurrent(),
      ]);
      setData({ 
        call: p0.price ?? null, 
        d1: p1.price ?? null, 
        d7: p7.price ?? null, 
        d28: p28.price ?? null,
        current: pCurrent.price ?? null
      });
    })();
  }, [id, chain, address, notedAt, tweetTimestamp]);

  if (!data) return <div class="text-xs text-gray-400 mt-2">Loading price…</div>;
  
  const fmt = (n?: number|null) => (n == null ? '—' : `$${n.toFixed(6)}`);
  const pct = (base?: number|null, next?: number|null) => {
    if (base == null || next == null) return null;
    if (base === 0) return null;
    return ((next - base) / base) * 100;
  };
  const reached = (days: number) => {
    const start = new Date(notedAt + 'T00:00:00Z').getTime();
    return Date.now() >= start + days * 24 * 3600 * 1000;
  };
  
  return (
    <div class="text-xs text-gray-300 mt-2">
      <div class="flex gap-4 flex-wrap">
        <span>Call: {fmt(data.call)}</span>
        <span>
          +1d: {reached(1) ? (
            <>
              {fmt(data.d1)}{' '}
              {(() => { const p = pct(data.call, data.d1); return p == null ? '' : (<span class={"ml-1 font-semibold " + (p >= 0 ? 'text-green-400' : 'text-red-400')}>{p.toFixed(2)}%</span>); })()}
            </>
          ) : '—'}
        </span>
        <span>
          +7d: {reached(7) ? (
            <>
              {fmt(data.d7)}{' '}
              {(() => { const p = pct(data.call, data.d7); return p == null ? '' : (<span class={"ml-1 font-semibold " + (p >= 0 ? 'text-green-400' : 'text-red-400')}>{p.toFixed(2)}%</span>); })()}
            </>
          ) : '—'}
        </span>
        <span>
          +28d: {reached(28) ? (
            <>
              {fmt(data.d28)}{' '}
              {(() => { const p = pct(data.call, data.d28); return p == null ? '' : (<span class={"ml-1 font-semibold " + (p >= 0 ? 'text-green-400' : 'text-red-400')}>{p.toFixed(2)}%</span>); })()}
            </>
          ) : '—'}
        </span>
        <span class="border-l border-white/20 pl-4">
          Current: {fmt(data.current)}{' '}
          {(() => { 
            const p = pct(data.call, data.current); 
            if (p == null) return '';
            
            const isCorrect = (sentiment === 'bullish' && p >= 0) || (sentiment === 'bearish' && p < 0);
            const accuracyIcon = isCorrect ? '✅' : '❌';
            const accuracyText = isCorrect ? 'Correct' : 'Wrong';
            
            return (
              <>
                <span class={"ml-1 font-semibold " + (p >= 0 ? 'text-green-400' : 'text-red-400')}>{p.toFixed(2)}%</span>
                <span class="ml-2 text-xs" title={`${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} signal ${accuracyText.toLowerCase()}`}>
                  {accuracyIcon} {accuracyText}
                </span>
              </>
            ); 
          })()}
        </span>
      </div>
    </div>
  );
}

// Helper component for CoinGecko price deltas
function CoinGeckoPriceDelta({ id, coinGeckoId, notedAt, tweetTimestamp, sentiment }: { 
  id: string; 
  coinGeckoId: string; 
  notedAt: string; 
  tweetTimestamp?: string; 
  sentiment: "bullish" | "bearish" 
}) {
  const [data, setData] = useState<{ call?: number|null; d1?: number|null; d7?: number|null; d28?: number|null; current?: number|null } | null>(null);
  
  useEffect(() => {
    (async () => {
      const baseTime = tweetTimestamp ? new Date(tweetTimestamp) : new Date(notedAt + 'T00:00:00Z');
      const dayMS = 24 * 3600 * 1000;
      
      const fetchAtTime = async (offsetDays: number) => {
        const targetTime = new Date(baseTime.getTime() + offsetDays * dayMS);
        if (offsetDays === 0 && tweetTimestamp) {
          return (await fetch(`/api/price/coingecko?id=${coinGeckoId}&timestamp=${tweetTimestamp}`)).json();
        } else {
          const dateISO = targetTime.toISOString().slice(0, 10);
          return (await fetch(`/api/price/coingecko?id=${coinGeckoId}&date=${dateISO}`)).json();
        }
      };
      
      const fetchCurrent = async () => {
        return (await fetch(`/api/price/coingecko?id=${coinGeckoId}`)).json();
      };
      
      const [p0, p1, p7, p28, pCurrent] = await Promise.all([
        fetchAtTime(0),
        fetchAtTime(1),
        fetchAtTime(7),
        fetchAtTime(28),
        fetchCurrent(),
      ]);
      setData({ 
        call: p0.price ?? null, 
        d1: p1.price ?? null, 
        d7: p7.price ?? null, 
        d28: p28.price ?? null,
        current: pCurrent.price ?? null
      });
    })();
  }, [id, coinGeckoId, notedAt, tweetTimestamp]);

  if (!data) return <div class="text-xs text-gray-400 mt-2">Loading price…</div>;
  
  const fmt = (n?: number|null) => (n == null ? '—' : `$${n.toFixed(6)}`);
  const pct = (base?: number|null, next?: number|null) => {
    if (base == null || next == null) return null;
    if (base === 0) return null;
    return ((next - base) / base) * 100;
  };
  const reached = (days: number) => {
    const start = new Date(notedAt + 'T00:00:00Z').getTime();
    return Date.now() >= start + days * 24 * 3600 * 1000;
  };
  
  return (
    <div class="text-xs text-gray-300 mt-2">
      <div class="flex gap-4 flex-wrap">
        <span>Call: {fmt(data.call)}</span>
        <span>
          +1d: {reached(1) ? (
            <>
              {fmt(data.d1)}{' '}
              {(() => { const p = pct(data.call, data.d1); return p == null ? '' : (<span class={"ml-1 font-semibold " + (p >= 0 ? 'text-green-400' : 'text-red-400')}>{p.toFixed(2)}%</span>); })()}
            </>
          ) : '—'}
        </span>
        <span>
          +7d: {reached(7) ? (
            <>
              {fmt(data.d7)}{' '}
              {(() => { const p = pct(data.call, data.d7); return p == null ? '' : (<span class={"ml-1 font-semibold " + (p >= 0 ? 'text-green-400' : 'text-red-400')}>{p.toFixed(2)}%</span>); })()}
            </>
          ) : '—'}
        </span>
        <span>
          +28d: {reached(28) ? (
            <>
              {fmt(data.d28)}{' '}
              {(() => { const p = pct(data.call, data.d28); return p == null ? '' : (<span class={"ml-1 font-semibold " + (p >= 0 ? 'text-green-400' : 'text-red-400')}>{p.toFixed(2)}%</span>); })()}
            </>
          ) : '—'}
        </span>
        <span class="border-l border-white/20 pl-4">
          Current: {fmt(data.current)}{' '}
          {(() => { 
            const p = pct(data.call, data.current); 
            if (p == null) return '';
            
            const isCorrect = (sentiment === 'bullish' && p >= 0) || (sentiment === 'bearish' && p < 0);
            const accuracyIcon = isCorrect ? '✅' : '❌';
            const accuracyText = isCorrect ? 'Correct' : 'Wrong';
            
            return (
              <>
                <span class={"ml-1 font-semibold " + (p >= 0 ? 'text-green-400' : 'text-red-400')}>{p.toFixed(2)}%</span>
                <span class="ml-2 text-xs" title={`${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} signal ${accuracyText.toLowerCase()}`}>
                  {accuracyIcon} {accuracyText}
                </span>
              </>
            ); 
          })()}
        </span>
      </div>
    </div>
  );
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
      let hasPerformanceData = false;
      
      await Promise.all(
        leaderboardEntries.map(async (entry) => {
          try {
            const res = await fetch(`/api/performance/${entry.username}`);
            const data = await res.json();
            
            // Get the actual projectHandle from signals (use the exact key the API uses)
            const signalProjectHandles = [...new Set(signals.map(s => s.projectHandle))];
            const primaryHandle = signalProjectHandles[0]?.toLowerCase(); // Use first signal's handle
            
            // Try the primary handle first (this is what the performance API uses)
            let projectPerf = null;
            
            if (primaryHandle && data.byAsset?.[primaryHandle]) {
              projectPerf = data.byAsset[primaryHandle];
            } else {
              // Fallback: try other variations only if primary doesn't work
              const fallbackKeys = [
                ...signalProjectHandles.map(h => h.toLowerCase().replace('@', '')),
                project.twitterUsername.toLowerCase(),
                `@${project.twitterUsername.toLowerCase()}`,
                'plasmafdn', // Historical
                '@plasmafdn',
              ];
              
              for (const key of fallbackKeys) {
                if (data.byAsset?.[key]) {
                  projectPerf = data.byAsset[key];
                  break;
                }
              }
            }
            
            if (projectPerf) {
              entry.shortTerm = projectPerf.shortTerm;
              entry.longTerm = projectPerf.longTerm;
              
              // Calculate overall performance (average of available metrics)
              const metrics = [projectPerf.shortTerm, projectPerf.longTerm].filter(m => m !== null && m !== undefined);
              entry.performance = metrics.length > 0 
                ? metrics.reduce((a, b) => a + b, 0) / metrics.length 
                : null;
              
              if (entry.performance !== null) {
                hasPerformanceData = true;
              }
            }
          } catch (error) {
            console.error(`Failed to fetch performance for ${entry.username}:`, error);
          }
        })
      );
      
      // If no performance data found for any user, show error
      if (!hasPerformanceData) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }
      
      // Sort by performance (highest first)
      const sortedLeaderboard = leaderboardEntries
        .filter(entry => entry.performance !== null)
        .sort((a, b) => b.performance! - a.performance!);
      
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
          <h2 class="text-2xl font-bold text-white mb-6">Top Performers</h2>
          {loading ? (
            <div class="text-center py-12 text-gray-400">
              Loading performance data...
            </div>
          ) : leaderboard.length === 0 ? (
            <div class="text-center py-12">
              <div class="text-red-400 font-semibold mb-2">Unable to load performance data</div>
              <div class="text-sm text-gray-400">Performance metrics are not available for this token</div>
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
              </div>
            )}
          </div>
        </div>
      
      {/* Price History Chart */}
      <div class="glass-strong rounded-2xl border border-white/10 overflow-hidden">
        <div class="p-6">
          <h2 class="text-2xl font-bold text-white mb-4">Price History</h2>
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
                      <a 
                        href={signal.tweetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-sm text-blue-400 hover:text-blue-300"
                      >
                        View Tweet →
                      </a>
                      
                      {/* Signal Performance */}
                      {project.coinGeckoId ? (
                        <CoinGeckoPriceDelta
                          id={signal.id}
                          coinGeckoId={project.coinGeckoId}
                          notedAt={signal.notedAt}
                          tweetTimestamp={signal.tweetTimestamp}
                          sentiment={signal.sentiment}
                        />
                      ) : project.chain && project.link ? (
                        <PriceDelta
                          id={signal.id}
                          chain={project.chain}
                          address={project.link}
                          notedAt={signal.notedAt}
                          tweetTimestamp={signal.tweetTimestamp}
                          sentiment={signal.sentiment}
                        />
                      ) : null}
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


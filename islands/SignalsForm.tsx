import { useEffect, useState } from "preact/hooks";
import { Card, CardContent } from "../components/ui/Card.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import PriceChart from "./PriceChart.tsx";

type Sentiment = "bullish" | "bearish";

interface Props {
  username: string;
}

interface SignalItem {
  id: string;
  sentiment: Sentiment;
  tweetUrl: string;
  tweetContent?: string;
  projectHandle: string;
  notedAt: string;
  tweetTimestamp?: string;
  projectUserId?: number;
  projectDisplayName?: string;
  projectAvatarUrl?: string;
}

type Chain = "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid";

interface VerifiedItem {
  id: string;
  ethosUserId: number;
  twitterUsername: string;
  displayName: string;
  avatarUrl: string;
  type: "token" | "nft" | "pre_tge";
  chain?: Chain;
  link?: string;
  coinGeckoId?: string; // Added for Layer 1 tokens
}

interface PriceSnapshot { called?: number | null; d1?: number | null; d7?: number | null; d28?: number | null; }

export default function SignalsForm({ username }: Props) {
  // Test mode state removed - signals managed via Chrome extension only
  const [error, _setError] = useState<string | null>(null);
  const [list, setList] = useState<SignalItem[]>([]);
  const [verifiedByUsername, setVerifiedByUsername] = useState<Record<string, VerifiedItem>>({});
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [assetPerformance, setAssetPerformance] = useState<Record<string, { shortTerm: number | null; longTerm: number | null }>>({});
  // local snapshots cache could be added later if needed

  async function refresh() {
    const res = await fetch(`/api/signals/${username}`);
    const data = await res.json();
    setList(data.values ?? []);
  }

  useEffect(() => {
    refresh();
    
    // Fetch performance data
    (async () => {
      try {
        const res = await fetch(`/api/performance/${username}`);
        const data = await res.json();
        if (data.byAsset) {
          setAssetPerformance(data.byAsset);
        }
      } catch (err) {
        console.error("Failed to fetch performance:", err);
      }
    })();
  }, [username]);

  useEffect(() => {
    // fetch verified projects once
    (async () => {
      try {
        const res = await fetch('/api/verified');
        const data = await res.json();
        const set = new Set<string>();
        const map: Record<string, VerifiedItem> = {};
        for (const v of (data.values || [])) {
          if (v.twitterUsername) {
            set.add(v.twitterUsername.toLowerCase());
            map[v.twitterUsername.toLowerCase()] = v as VerifiedItem;
          }
        }
        setVerifiedByUsername(map);
      } catch (_err) {
        // ignore network errors in typeahead; not critical for UX
      }
    })();
  }, []);

  // Test mode was removed - signals can only be created via Chrome extension

  // Remove function removed - signals managed via Chrome extension only

  // Project selection functions removed - signals managed via Chrome extension only

  // Group signals by project
  const groupedSignals = list.reduce((acc, signal) => {
    const key = signal.projectHandle.toLowerCase();
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(signal);
    return acc;
  }, {} as Record<string, SignalItem[]>);

  // Sort each group by date (newest first)
  Object.keys(groupedSignals).forEach(key => {
    groupedSignals[key].sort((a, b) => {
      const timeA = a.tweetTimestamp ? new Date(a.tweetTimestamp).getTime() : new Date(a.notedAt).getTime();
      const timeB = b.tweetTimestamp ? new Date(b.tweetTimestamp).getTime() : new Date(b.notedAt).getTime();
      return timeB - timeA;
    });
  });

  // Calculate stats for each project
  const projectStats = Object.entries(groupedSignals).map(([projectKey, signals]) => {
    const project = verifiedByUsername[projectKey];
    const bullishCount = signals.filter(s => s.sentiment === 'bullish').length;
    const bearishCount = signals.filter(s => s.sentiment === 'bearish').length;
    
    return {
      projectKey,
      project,
      displayName: project?.displayName || signals[0].projectHandle,
      avatarUrl: project?.avatarUrl,
      signalCount: signals.length,
      bullishCount,
      bearishCount,
    };
  });

  return (
    <div class="mt-6">
      {error && (<div class="text-red-400 text-sm mb-4 glass-subtle rounded-lg p-3 border border-red-500/30">{error}</div>)}

      {list.length === 0 ? (
        <Card class="glass-strong">
          <CardContent class="p-8 text-center text-gray-400">
            No signals yet.
          </CardContent>
        </Card>
      ) : (
        <div class="flex flex-col lg:flex-row gap-6">
          {/* Main Content Area */}
          <div class="flex-1 min-w-0">
            {/* Asset Navigation - Mobile Only (at top, not sticky) */}
            <div class="lg:hidden glass-strong border border-white/10 rounded-2xl shadow-2xl shadow-black/20 mb-6 p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-white">Tracked Assets</span>
                </div>
                <div class="text-sm text-gray-400">
                  {projectStats.length} {projectStats.length === 1 ? 'asset' : 'assets'} • {list.length} total {list.length === 1 ? 'signal' : 'signals'}
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                {projectStats.map(stat => (
                <a
                  key={stat.projectKey}
                  href={`#asset-${stat.projectKey}`}
                  class="flex items-center gap-2 px-3 py-2 glass-subtle hover:glass border border-white/10 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20"
                >
                  {stat.avatarUrl && (
                    <img src={stat.avatarUrl} class="w-6 h-6 rounded-full" alt={stat.displayName} />
                  )}
                  <div class="flex items-center gap-2 flex-1">
                    <span class="text-sm font-medium text-white">{stat.displayName}</span>
                    <div class="flex items-center gap-1 text-xs">
                      <span class="text-green-400">{stat.bullishCount}↑</span>
                      <span class="text-gray-500">•</span>
                      <span class="text-red-400">{stat.bearishCount}↓</span>
                    </div>
                  </div>
                  <div class="flex flex-col items-end gap-1">
                    {(() => {
                      const perf = assetPerformance[stat.projectKey];
                      const shortTerm = perf?.shortTerm;
                      const longTerm = perf?.longTerm;
                      return (
                        <>
                          <div class={`text-sm font-bold ${shortTerm !== null && shortTerm !== undefined ? (shortTerm >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                            {shortTerm !== null && shortTerm !== undefined ? `${shortTerm >= 0 ? '+' : ''}${shortTerm.toFixed(0)}%` : '--'}
                          </div>
                          <div class={`text-xs font-medium ${longTerm !== null && longTerm !== undefined ? (longTerm >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                            {longTerm !== null && longTerm !== undefined ? `${longTerm >= 0 ? '+' : ''}${longTerm.toFixed(0)}%` : '--'}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </a>
                ))}
              </div>
            </div>

            {/* Signals List */}
            <div class="space-y-6">
          {Object.entries(groupedSignals).map(([projectKey, signals]) => {
            const project = verifiedByUsername[projectKey];
            const firstSignal = signals[0];
            
            return (
              <div 
                key={projectKey} 
                id={`asset-${projectKey}`}
                class="border border-white/10 rounded-2xl overflow-hidden glass-strong shadow-2xl shadow-black/20 scroll-mt-24"
              >
                {/* Project Header */}
                <div class="bg-gradient-to-r from-white/5 to-white/10 p-4 border-b border-white/10">
                    <div class="flex items-center gap-3">
                      {project ? (
                        <>
                          <img src={project.avatarUrl} class="w-10 h-10 rounded-full border-2 border-blue-500/50 shadow-lg shadow-blue-500/30" alt={project.displayName} />
                          <div class="flex-1">
                            <div class="font-semibold text-lg text-white">{project.displayName}</div>
                            <div class="text-sm text-gray-400">@{project.twitterUsername}</div>
                          </div>
                        </>
                      ) : (
                        <div class="flex-1">
                          <div class="font-semibold text-lg text-white">@{firstSignal.projectHandle}</div>
                          <div class="text-sm text-gray-400">Unverified Project</div>
                        </div>
                      )}
                      <div class="text-right">
                        <div class="text-sm font-medium text-gray-300 mb-1">{signals.length} {signals.length === 1 ? 'Signal' : 'Signals'}</div>
                        <div class="flex gap-1">
                          {signals.slice().reverse().map((sig, idx) => (
                            <div 
                              key={idx}
                              class={`w-2 h-2 rounded-full ${sig.sentiment === 'bullish' ? 'bg-green-500' : 'bg-red-500'}`}
                              title={`${sig.sentiment} - ${sig.tweetTimestamp ? new Date(sig.tweetTimestamp).toLocaleDateString() : sig.notedAt}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Price Chart with Signal Markers */}
                  {project && signals.length > 0 && (
                    <div class="p-4 bg-black/20 border-b border-white/10">
                      <PriceChart
                        coinGeckoId={project.coinGeckoId}
                        chain={project.chain}
                        address={project.link}
                        signals={signals.map(s => ({
                          timestamp: s.tweetTimestamp || s.notedAt,
                          sentiment: s.sentiment,
                          tweetContent: s.tweetContent,
                          twitterUsername: username, // The person who made the signal
                        }))}
                        projectName={project.displayName}
                      />
                    </div>
                  )}
                  
                  {/* Signals List */}
                  <div class="divide-y divide-white/5">
                    {(expandedProjects[projectKey] ? signals : signals.slice(0, 3)).map((s) => (
              <div key={s.id} class="p-4 hover:bg-white/5 transition-all duration-300">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <Badge variant={s.sentiment === "bullish" ? "success" : "destructive"} class="text-xs">
                      {s.sentiment === "bullish" ? "🐂 Bullish" : "🐻 Bearish"}
                    </Badge>
                    <span class="text-sm text-gray-400">
                      {s.tweetTimestamp ? new Date(s.tweetTimestamp).toLocaleDateString() : s.notedAt}
                    </span>
                  </div>
                  
                  {s.tweetContent && (
                    <div class="text-sm text-gray-300 mb-2 p-3 glass-subtle rounded-xl border-l-4 border-blue-500/50">
                      "{s.tweetContent.length > 400 ? s.tweetContent.slice(0, 400) + '...' : s.tweetContent}"
                    </div>
                  )}
                  
                  <a class="text-sm text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 transition-colors" href={s.tweetUrl} target="_blank" rel="noopener noreferrer">
                    View Tweet
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  
                  {/* Price snapshots for verified projects */}
                  {s.projectHandle && verifiedByUsername[s.projectHandle.toLowerCase()] && (
                    (() => {
                      const project = verifiedByUsername[s.projectHandle.toLowerCase()];
                      if (project.type === 'token') {
                        // Prefer CoinGecko ID if available (more reliable price data)
                        if (project.coinGeckoId) {
                          return (
                            <CoinGeckoPriceDelta
                              id={s.id}
                              coinGeckoId={project.coinGeckoId}
                              notedAt={s.notedAt}
                              tweetTimestamp={s.tweetTimestamp}
                              sentiment={s.sentiment}
                            />
                          );
                        } else if (project.link) {
                          return (
                            <PriceDelta
                              id={s.id}
                              chain={(project.chain ?? 'ethereum') as Chain}
                              address={project.link!}
                              notedAt={s.notedAt}
                              tweetTimestamp={s.tweetTimestamp}
                              sentiment={s.sentiment}
                            />
                          );
                        }
                      } else if (project.type === 'nft' && project.link) {
                        // NFT floor price tracking (only for Ethereum, Base, BSC - not Solana)
                        const nftChain = project.chain ?? 'ethereum';
                        if (nftChain === 'ethereum' || nftChain === 'base' || nftChain === 'bsc') {
                          return (
                            <NFTFloorDelta
                              id={s.id}
                              chain={nftChain}
                              address={project.link!}
                              notedAt={s.notedAt}
                              tweetTimestamp={s.tweetTimestamp}
                              sentiment={s.sentiment}
                            />
                          );
                        }
                      }
                      return null;
                    })()
                  )}
                </div>
              </div>
                    ))}
                  </div>
                  
                  {/* Show More / Show Less Button */}
                  {signals.length > 3 && (
                    <div class="px-4 py-3 border-t border-white/5 bg-white/[0.02]">
                      <button
                        type="button"
                        onClick={() => setExpandedProjects(prev => ({ ...prev, [projectKey]: !prev[projectKey] }))}
                        class="w-full text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors duration-300 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-white/5"
                      >
                        {expandedProjects[projectKey] ? (
                          <>
                            <span>Show Less</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                            </svg>
                          </>
                        ) : (
                          <>
                            <span>See More ({signals.length - 3} more signals)</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          }
            </div>
          </div>

          {/* Sidebar - Desktop Only */}
          <div class="hidden lg:block w-80 flex-shrink-0">
            <div class="sticky top-24 glass-strong border border-white/10 rounded-2xl shadow-2xl shadow-black/20 p-4 max-h-[calc(100vh-7rem)] flex flex-col">
              <div class="flex items-center justify-between mb-4 flex-shrink-0">
                <span class="font-semibold text-white">Tracked Assets</span>
                <div class="text-xs text-gray-400">
                  {projectStats.length} {projectStats.length === 1 ? 'asset' : 'assets'}
                </div>
              </div>
              <div class="text-xs text-gray-400 mb-4 flex-shrink-0">
                {list.length} total {list.length === 1 ? 'signal' : 'signals'}
              </div>
              <div class="flex-1 overflow-y-auto space-y-2 pr-2 -mr-2 scrollbar-thin">
                {projectStats.map(stat => (
                  <a
                    key={stat.projectKey}
                    href={`#asset-${stat.projectKey}`}
                    class="flex items-center gap-3 px-3 py-3 glass-subtle hover:glass border border-white/10 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/20"
                  >
                    {stat.avatarUrl && (
                      <img src={stat.avatarUrl} class="w-10 h-10 rounded-full flex-shrink-0" alt={stat.displayName} />
                    )}
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-white truncate">{stat.displayName}</div>
                      <div class="flex items-center gap-2 text-xs mt-1">
                        <span class="text-green-400">{stat.bullishCount}↑</span>
                        <span class="text-gray-500">•</span>
                        <span class="text-red-400">{stat.bearishCount}↓</span>
                      </div>
                    </div>
                    <div class="flex-shrink-0 flex flex-col items-end gap-1">
                      {(() => {
                        const perf = assetPerformance[stat.projectKey];
                        const shortTerm = perf?.shortTerm;
                        const longTerm = perf?.longTerm;
                        return (
                          <>
                            <div class={`text-xl font-bold ${shortTerm !== null && shortTerm !== undefined ? (shortTerm >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                              {shortTerm !== null && shortTerm !== undefined ? `${shortTerm >= 0 ? '+' : ''}${shortTerm.toFixed(0)}%` : '--'}
                            </div>
                            <div class={`text-sm font-medium ${longTerm !== null && longTerm !== undefined ? (longTerm >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                              {longTerm !== null && longTerm !== undefined ? `${longTerm >= 0 ? '+' : ''}${longTerm.toFixed(0)}%` : '--'}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PriceDelta({ id, chain, address, notedAt, tweetTimestamp, sentiment }: { id: string; chain: Chain; address: string; notedAt: string; tweetTimestamp?: string; sentiment: Sentiment }) {
  const [data, setData] = useState<{ call?: number|null; d1?: number|null; d7?: number|null; d28?: number|null; current?: number|null } | null>(null);
  useEffect(() => {
    (async () => {
      const baseTime = tweetTimestamp ? new Date(tweetTimestamp) : new Date(notedAt + 'T00:00:00Z');
      const dayMS = 24 * 3600 * 1000;
      
      const fetchAtTime = async (offsetDays: number) => {
        const targetTime = new Date(baseTime.getTime() + offsetDays * dayMS);
        if (offsetDays === 0 && tweetTimestamp) {
          // Use precise timestamp for the call
          return (await fetch(`/api/price/token?chain=${chain}&address=${address}&timestamp=${tweetTimestamp}`)).json();
        } else {
          // Use daily price for intervals
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
            
            // Calculate accuracy: bullish + positive = correct, bearish + negative = correct
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

function CoinGeckoPriceDelta({ id, coinGeckoId, notedAt, tweetTimestamp, sentiment }: { id: string; coinGeckoId: string; notedAt: string; tweetTimestamp?: string; sentiment: Sentiment }) {
  const [data, setData] = useState<{ call?: number|null; d1?: number|null; d7?: number|null; d28?: number|null; current?: number|null } | null>(null);
  useEffect(() => {
    (async () => {
      const baseTime = tweetTimestamp ? new Date(tweetTimestamp) : new Date(notedAt + 'T00:00:00Z');
      const dayMS = 24 * 3600 * 1000;
      
      const fetchAtTime = async (offsetDays: number) => {
        const targetTime = new Date(baseTime.getTime() + offsetDays * dayMS);
        if (offsetDays === 0 && tweetTimestamp) {
          // Use precise timestamp for the call
          return (await fetch(`/api/price/coingecko?id=${coinGeckoId}&timestamp=${tweetTimestamp}`)).json();
        } else {
          // Use daily price for intervals
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
  
  const allSame = data.call === data.d1 && data.call === data.d7 && data.call === data.d28 && data.call === data.current;
  const signalDate = new Date(notedAt + 'T00:00:00Z');
  const daysSinceSignal = Math.floor((Date.now() - signalDate.getTime()) / (24 * 60 * 60 * 1000));
  
  return (
    <div class="text-xs text-gray-300 mt-2">
      {allSame ? (
        <div class="flex gap-4 flex-wrap">
          <span>Current Price: {fmt(data.current)}</span>
          <span class="text-gray-400 italic">
            {daysSinceSignal > 30 ? 
              '(Historical data only available for recent 30 days)' : 
              '(Historical data not available)'}
          </span>
        </div>
      ) : (
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
              
              // Calculate accuracy: bullish + positive = correct, bearish + negative = correct
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
      )}
    </div>
  );
}

function NFTFloorDelta({ id, chain, address, notedAt, tweetTimestamp, sentiment }: { id: string; chain: 'ethereum' | 'base' | 'bsc'; address: string; notedAt: string; tweetTimestamp?: string; sentiment: Sentiment }) {
  const [data, setData] = useState<{ call?: number|null; d1?: number|null; d7?: number|null; d28?: number|null; current?: number|null } | null>(null);
  useEffect(() => {
    (async () => {
      const baseTime = tweetTimestamp ? new Date(tweetTimestamp) : new Date(notedAt + 'T00:00:00Z');
      const dayMS = 24 * 3600 * 1000;
      
      const fetchAtTime = async (offsetDays: number) => {
        const targetTime = new Date(baseTime.getTime() + offsetDays * dayMS);
        const dateISO = targetTime.toISOString().slice(0, 10);
        return (await fetch(`/api/price/nft?chain=${chain}&address=${address}&date=${dateISO}`)).json();
      };
      
      const fetchCurrent = async () => {
        return (await fetch(`/api/price/nft?chain=${chain}&address=${address}`)).json();
      };
      
      const [p0, p1, p7, p28, pCurrent] = await Promise.all([
        fetchAtTime(0),
        fetchAtTime(1),
        fetchAtTime(7),
        fetchAtTime(28),
        fetchCurrent(),
      ]);
      setData({ 
        call: p0.floorPrice ?? null, 
        d1: p1.floorPrice ?? null, 
        d7: p7.floorPrice ?? null, 
        d28: p28.floorPrice ?? null,
        current: pCurrent.floorPrice ?? null
      });
    })();
  }, [id, chain, address, notedAt, tweetTimestamp]);

  if (!data) return <div class="text-xs text-gray-400 mt-2">Loading floor price…</div>;
  const fmt = (n?: number|null) => (n == null ? '—' : `${n.toFixed(4)} ETH`);
  const pct = (base?: number|null, next?: number|null) => {
    if (base == null || next == null) return null;
    if (base === 0) return null;
    return ((next - base) / base) * 100;
  };
  const reached = (days: number) => {
    const start = new Date(notedAt + 'T00:00:00Z').getTime();
    return Date.now() >= start + days * 24 * 3600 * 1000;
  };
  
  // Check if all prices are the same (indicating no historical data available)
  const allSame = data.call === data.d1 && data.call === data.d7 && data.call === data.d28 && data.call === data.current;
  
  // Calculate how far back in time this signal goes
  const signalDate = new Date(notedAt + 'T00:00:00Z');
  const daysSinceSignal = Math.floor((Date.now() - signalDate.getTime()) / (24 * 60 * 60 * 1000));
  
  return (
    <div class="text-xs text-gray-300 mt-2">
      {allSame ? (
        <div class="flex gap-4 flex-wrap">
          <span>Current Floor: {fmt(data.current)}</span>
          <span class="text-gray-400 italic">
            {daysSinceSignal > 30 ? 
              '(Historical data only available for recent 30 days)' : 
              '(Historical NFT data not available)'}
          </span>
        </div>
      ) : (
        <div class="flex gap-4 flex-wrap">
          <span>Floor: {fmt(data.call)}</span>
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
              
              // Calculate accuracy: bullish + positive = correct, bearish + negative = correct
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
      )}
    </div>
  );
}



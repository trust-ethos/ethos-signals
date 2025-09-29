import { useEffect, useRef, useState } from "preact/hooks";
import { Badge } from "../components/ui/Badge.tsx";
import SignalPerformance from "./SignalPerformance.tsx";
import RelativeTime from "./RelativeTime.tsx";

interface Signal {
  id: string;
  twitterUsername: string;
  projectHandle: string;
  projectDisplayName?: string;
  tweetUrl: string;
  tweetContent?: string;
  sentiment: "bullish" | "bearish";
  notedAt: string;
  tweetTimestamp?: string;
}

interface Project {
  twitterUsername: string;
  displayName: string;
  avatarUrl: string;
  type: "token" | "nft" | "pre_tge";
  chain?: "ethereum" | "base" | "solana" | "bsc" | "plasma";
  link?: string;
  coinGeckoId?: string;
  ticker?: string;
}

interface EthosUser {
  displayName: string;
  avatarUrl: string;
  score: number;
}

interface Props {
  initialSignals: Signal[];
  initialProjects: Project[];
  initialEthosUsers: Record<string, EthosUser>;
}

export default function RecentSignalsInfinite({ 
  initialSignals, 
  initialProjects, 
  initialEthosUsers 
}: Props) {
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [ethosUsers, setEthosUsers] = useState<Record<string, EthosUser>>(initialEthosUsers);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(initialSignals.length);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Create lookup maps
  const verifiedByUsername: Record<string, Project> = {};
  for (const project of projects) {
    verifiedByUsername[project.twitterUsername.toLowerCase()] = project;
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loading, offset]);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/signals/recent?limit=15&offset=${offset}`);
      const data = await response.json();

      if (data.signals && data.signals.length > 0) {
        setSignals(prev => [...prev, ...data.signals]);
        setOffset(prev => prev + data.signals.length);
        setHasMore(data.hasMore);

        // Merge new projects
        if (data.verifiedProjects) {
          setProjects(prev => {
            const existingIds = new Set(prev.map(p => p.twitterUsername.toLowerCase()));
            const newProjects = data.verifiedProjects.filter(
              (p: Project) => !existingIds.has(p.twitterUsername.toLowerCase())
            );
            return [...prev, ...newProjects];
          });
        }

        // Merge new Ethos users
        if (data.ethosUsers) {
          setEthosUsers(prev => ({ ...prev, ...data.ethosUsers }));
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more signals:", error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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

      {/* Load More Trigger */}
      <div ref={loadMoreRef} class="py-8 text-center">
        {loading && (
          <div class="text-gray-400">
            <svg class="animate-spin h-8 w-8 mx-auto text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="mt-2">Loading more signals...</p>
          </div>
        )}
        {!hasMore && signals.length > 0 && (
          <div class="text-gray-400">No more signals to load</div>
        )}
      </div>
    </>
  );
}

function SignalCard({ signal, project, ethosUser }: { 
  signal: Signal; 
  project?: Project;
  ethosUser?: EthosUser;
}) {
  const avatarUrl = ethosUser?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${signal.twitterUsername}`;
  const displayName = ethosUser?.displayName || signal.twitterUsername;
  
  return (
    <div class="border border-white/10 rounded-2xl p-6 glass-strong hover-glow transition-all duration-300">
      {/* Header with User and Actions */}
      <div class="flex items-start justify-between gap-4 mb-4">
        <div class="flex items-start gap-4 flex-1 min-w-0">
          <a href={`/profile/${signal.twitterUsername}`} class="flex-shrink-0">
            <img 
              src={avatarUrl} 
              alt={displayName}
              class="w-16 h-16 rounded-full object-cover border-2 border-blue-500/50 shadow-lg shadow-blue-500/20"
            />
          </a>
          <div class="flex-1 min-w-0">
            <a href={`/profile/${signal.twitterUsername}`} class="block">
              <h3 class="font-bold text-white hover:text-blue-400 transition-colors truncate">
                {displayName}
              </h3>
              <p class="text-sm text-gray-400">@{signal.twitterUsername}</p>
            </a>
            {ethosUser && (
              <div class="mt-1">
                <span class="text-xs text-gray-400">
                  Score: <span class="font-semibold text-blue-400">{ethosUser.score}</span>
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
            class="text-xs text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 whitespace-nowrap transition-colors" 
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
            class="text-xs text-gray-400 hover:text-blue-400 whitespace-nowrap transition-colors"
          >
            Full Profile →
          </a>
        </div>
      </div>
      
      {/* Signal Info */}
      <div class="space-y-4">
        {/* Project Name - Centered and Large */}
        <div class="text-center">
          <h1 class="text-2xl font-bold text-white mb-2">
            {project?.displayName || signal.projectHandle}
            {project?.ticker && (
              <span class="text-gray-400 ml-2">(${project.ticker})</span>
            )}
          </h1>
          
          {/* Sentiment Badge - Centered */}
          <div class="flex justify-center">
            <Badge variant={signal.sentiment === "bullish" ? "success" : "destructive"} class="text-sm">
              {signal.sentiment === "bullish" ? "Bullish" : "Bearish"}
            </Badge>
          </div>
        </div>
        
        {/* Tweet Content */}
        {signal.tweetContent && (
          <div class="text-sm text-gray-300 line-clamp-3 glass-subtle p-3 rounded-xl border-l-4 border-blue-500/50">
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

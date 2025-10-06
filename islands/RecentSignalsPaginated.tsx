import { Badge } from "../components/ui/Badge.tsx";
import SignalPerformance from "./SignalPerformance.tsx";
import RelativeTime from "./RelativeTime.tsx";
import { getScoreColor } from "../utils/ethos-score.ts";

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
  onchainTxHash?: string;
  onchainSignalId?: number;
  savedBy?: {
    walletAddress: string;
    ethosUsername?: string;
    ethosProfileId?: number;
  };
}

interface Project {
  twitterUsername: string;
  displayName: string;
  avatarUrl: string;
  type: "token" | "nft" | "pre_tge";
  chain?: "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid";
  link?: string;
  coinGeckoId?: string;
  ticker?: string;
  hasPriceTracking?: boolean;
}

interface EthosUser {
  displayName: string;
  avatarUrl: string;
  score: number;
}

interface Props {
  signals: Signal[];
  projects: Project[];
  ethosUsers: Record<string, EthosUser>;
  currentPage: number;
  totalPages: number;
}

export default function RecentSignalsPaginated({ 
  signals, 
  projects, 
  ethosUsers,
  currentPage,
  totalPages
}: Props) {
  // Create lookup maps
  const verifiedByUsername: Record<string, Project> = {};
  for (const project of projects) {
    verifiedByUsername[project.twitterUsername.toLowerCase()] = project;
  }

  const handlePageChange = (page: number) => {
    globalThis.location.href = `/?page=${page}`;
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    
    // Always show first page
    if (currentPage > 3) {
      buttons.push(
        <button
          key={1}
          type="button"
          onClick={() => handlePageChange(1)}
          class="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
        >
          1
        </button>
      );
      
      if (currentPage > 4) {
        buttons.push(
          <span key="ellipsis-start" class="px-2 text-gray-400">...</span>
        );
      }
    }
    
    // Show pages around current page
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          type="button"
          onClick={() => handlePageChange(i)}
          class={i === currentPage 
            ? "px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/30" 
            : "px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
          }
        >
          {i}
        </button>
      );
    }
    
    // Always show last page
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) {
        buttons.push(
          <span key="ellipsis-end" class="px-2 text-gray-400">...</span>
        );
      }
      
      buttons.push(
        <button
          key={totalPages}
          type="button"
          onClick={() => handlePageChange(totalPages)}
          class="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
        >
          {totalPages}
        </button>
      );
    }
    
    return buttons;
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
              ethosUsers={ethosUsers}
            />
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div class="mt-12 flex items-center justify-center gap-2 flex-wrap">
          {/* Previous Button */}
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            class={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentPage === 1
                ? "bg-white/5 text-gray-600 cursor-not-allowed"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            ← Previous
          </button>
          
          {/* Page Numbers */}
          {renderPaginationButtons()}
          
          {/* Next Button */}
          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            class={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentPage === totalPages
                ? "bg-white/5 text-gray-600 cursor-not-allowed"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            Next →
          </button>
        </div>
      )}
      
      {/* Page Info */}
      {totalPages > 1 && (
        <div class="mt-4 text-center text-sm text-gray-400">
          Page {currentPage} of {totalPages}
        </div>
      )}
    </>
  );
}

function SignalCard({ signal, project, ethosUser, ethosUsers }: { 
  signal: Signal; 
  project?: Project;
  ethosUser?: EthosUser;
  ethosUsers: Record<string, EthosUser>;
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
              class="w-16 h-16 rounded-full object-cover border-4 shadow-lg"
              style={ethosUser ? `border-color: ${getScoreColor(ethosUser.score)}; box-shadow: 0 0 16px ${getScoreColor(ethosUser.score)}40, 0 10px 25px rgba(0,0,0,0.3);` : "border-color: #6B7280; box-shadow: 0 10px 25px rgba(0,0,0,0.3);"}
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
                  Score: <span class="font-semibold" style={`color: ${getScoreColor(ethosUser.score)};`}>{ethosUser.score}</span>
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
          <div class="flex flex-col items-end gap-2">
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
            {signal.onchainTxHash && (
              <a 
                class="text-xs text-green-400 hover:text-green-300 hover:underline inline-flex items-center gap-1 whitespace-nowrap transition-colors" 
                href={`https://basescan.org/tx/${signal.onchainTxHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                title="View on BaseScan"
              >
                View Onchain
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </a>
            )}
          </div>
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
        
        {/* Performance - only show if project has price tracking */}
        {project && project.hasPriceTracking !== false ? (
          <SignalPerformance
            signalId={signal.id}
            projectHandle={signal.projectHandle}
            sentiment={signal.sentiment}
            notedAt={signal.notedAt}
            tweetTimestamp={signal.tweetTimestamp}
            project={{
              type: project.type,
              chain: project.chain,
              link: project.link,
              coinGeckoId: project.coinGeckoId
            }}
          />
        ) : (
          <div class="glass-subtle rounded-xl p-3 border border-white/10 text-center">
            <div class="text-xs text-gray-400">No price tracking available for this project</div>
          </div>
        )}
        
        {/* Saved By */}
        {signal.savedBy && (
          <div class="flex justify-end items-center gap-2 mt-2 text-xs text-gray-500">
            <span>Saved by</span>
            {signal.savedBy.ethosUsername ? (
              <a 
                href={`/contributors/${signal.savedBy.ethosUsername}`}
                class="flex items-center gap-1.5 hover:text-blue-400 transition-colors"
              >
                <img 
                  src={(() => {
                    const user = ethosUsers[signal.savedBy.ethosUsername];
                    if (user?.avatarUrl) {
                      return user.avatarUrl;
                    }
                    // Try case-insensitive lookup
                    const userKey = Object.keys(ethosUsers).find(
                      key => key.toLowerCase() === signal.savedBy!.ethosUsername!.toLowerCase()
                    );
                    if (userKey && ethosUsers[userKey]?.avatarUrl) {
                      return ethosUsers[userKey].avatarUrl;
                    }
                    return `https://api.dicebear.com/7.x/identicon/svg?seed=${signal.savedBy.walletAddress}`;
                  })()}
                  alt="Saved by"
                  class="w-4 h-4 rounded-full"
                />
                <span class="text-gray-400 hover:text-blue-400">
                  @{signal.savedBy.ethosUsername}
                </span>
              </a>
            ) : (
              <>
                <img 
                  src={`https://api.dicebear.com/7.x/identicon/svg?seed=${signal.savedBy.walletAddress}`}
                  alt="Saved by"
                  class="w-4 h-4 rounded-full"
                />
                <span class="text-gray-400">
                  {signal.savedBy.walletAddress.slice(0, 6)}...{signal.savedBy.walletAddress.slice(-4)}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


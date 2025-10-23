import { useState } from "preact/hooks";
import { Badge } from "../components/ui/Badge.tsx";
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
  onchainTxHash?: string;
  onchainSignalId?: number;
}

interface PaidPromoReport {
  id: string;
  tweetUrl: string;
  twitterUsername: string;
  tweetContent?: string;
  evidence?: string;
  disclosureStatus: "disclosed" | "undisclosed";
  reportedAt: number;
  reportedBy?: {
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
  ticker?: string;
}

interface Props {
  signals: Signal[];
  paidPromoReports: PaidPromoReport[];
  verifiedProjects: Project[];
  isOwnPage: boolean;
}

export default function ContributorSignalsList({ 
  signals: initialSignals, 
  paidPromoReports: initialReports,
  verifiedProjects,
  isOwnPage 
}: Props) {
  const [activeTab, setActiveTab] = useState<"signals" | "paid-promos">("signals");
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [paidPromoReports, setPaidPromoReports] = useState<PaidPromoReport[]>(initialReports);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create lookup map
  const verifiedByUsername: Record<string, Project> = {};
  for (const project of verifiedProjects) {
    verifiedByUsername[project.twitterUsername.toLowerCase()] = project;
  }

  const handleDeleteSignal = async (signalId: string) => {
    if (!confirm("Are you sure you want to delete this signal? This action cannot be undone.")) {
      return;
    }

    setDeletingId(signalId);
    
    try {
      // Get auth token from localStorage (set by extension)
      const authToken = globalThis.localStorage?.getItem("auth_token");
      
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`/api/signals/delete/${signalId}`, {
        method: "DELETE",
        credentials: "include",
        headers,
      });

      if (response.ok) {
        // Remove the signal from the list
        setSignals(signals.filter(s => s.id !== signalId));
      } else {
        const error = await response.json();
        alert(`Failed to delete signal: ${error.message || error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting signal:", error);
      alert("Failed to delete signal. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this paid promo report? This action cannot be undone.")) {
      return;
    }

    setDeletingId(reportId);
    
    try {
      const authToken = globalThis.localStorage?.getItem("auth_token");
      
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`/api/paid-promos/delete/${reportId}`, {
        method: "DELETE",
        credentials: "include",
        headers,
      });

      if (response.ok) {
        // Remove the report from the list
        setPaidPromoReports(paidPromoReports.filter(r => r.id !== reportId));
      } else {
        const error = await response.json();
        alert(`Failed to delete report: ${error.message || error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting report:", error);
      alert("Failed to delete report. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div class="flex items-center gap-3 mb-8">
        <div class="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
        <div class="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("signals")}
            class={`text-2xl font-bold transition-all duration-200 ${
              activeTab === "signals"
                ? "text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Signals ({signals.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("paid-promos")}
            class={`text-2xl font-bold transition-all duration-200 ${
              activeTab === "paid-promos"
                ? "text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Paid Promo Reports ({paidPromoReports.length})
          </button>
        </div>
      </div>

      {/* Signals Tab */}
      {activeTab === "signals" && (
        <div class="space-y-4">
          {signals.length === 0 ? (
            <div class="text-gray-400 text-center py-16 glass-subtle rounded-2xl">
              <div class="text-6xl mb-4">📊</div>
              <p class="text-lg">No signals contributed yet.</p>
            </div>
          ) : (
            signals.map((signal) => {
        const project = verifiedByUsername[signal.projectHandle.toLowerCase()];
        
        return (
          <div 
            key={signal.id}
            class="border border-white/10 rounded-2xl p-6 glass-strong hover-glow transition-all duration-300"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                {/* Project Info */}
                <div class="mb-4">
                  <h3 class="text-xl font-bold text-white mb-2">
                    {project?.displayName || signal.projectHandle}
                    {project?.ticker && (
                      <span class="text-gray-400 ml-2">(${project.ticker})</span>
                    )}
                  </h3>
                  <Badge variant={signal.sentiment === "bullish" ? "success" : "destructive"} class="text-sm">
                    {signal.sentiment === "bullish" ? "Bullish" : "Bearish"}
                  </Badge>
                </div>

                {/* Tweet Content */}
                {signal.tweetContent && (
                  <div class="text-sm text-gray-300 mb-4 glass-subtle p-3 rounded-xl border-l-4 border-blue-500/50">
                    "{signal.tweetContent}"
                  </div>
                )}

                {/* Signal Metadata */}
                <div class="flex flex-wrap items-center gap-4 text-sm">
                  <div class="text-gray-400">
                    Trader: <span class="text-white font-medium">@{signal.twitterUsername}</span>
                  </div>
                  <div class="text-gray-400">
                    <RelativeTime 
                      timestamp={signal.tweetTimestamp || `${signal.notedAt}T00:00:00Z`}
                    />
                  </div>
                  <a 
                    href={signal.tweetUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1"
                  >
                    View Tweet
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  {signal.onchainTxHash && (
                    <a 
                      href={`https://basescan.org/tx/${signal.onchainTxHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="text-green-400 hover:text-green-300 hover:underline inline-flex items-center gap-1"
                    >
                      View Onchain
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>

              {/* Delete Button (only show on own page) */}
              {isOwnPage && (
                <button
                  type="button"
                  onClick={() => handleDeleteSignal(signal.id)}
                  disabled={deletingId === signal.id}
                  class="flex-shrink-0 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingId === signal.id ? (
                    <span class="flex items-center gap-2">
                      <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </span>
                  ) : (
                    <span class="flex items-center gap-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
            );
          })
          )}
        </div>
      )}

      {/* Paid Promo Reports Tab */}
      {activeTab === "paid-promos" && (
        <div class="space-y-4">
          {paidPromoReports.length === 0 ? (
            <div class="text-gray-400 text-center py-16 glass-subtle rounded-2xl">
              <div class="text-6xl mb-4">⚠️</div>
              <p class="text-lg">No paid promo reports yet.</p>
            </div>
          ) : (
            paidPromoReports.map((report) => {
              return (
                <div 
                  key={report.id}
                  class="border border-orange-500/30 rounded-2xl p-6 glass-strong hover-glow transition-all duration-300"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1 min-w-0">
                      {/* Report Header */}
                      <div class="mb-4">
                        <h3 class="text-xl font-bold text-white mb-2">
                          Reported as Paid Promo
                        </h3>
                        <div class="flex gap-2">
                          <Badge variant="default" class="text-sm bg-orange-500/20 text-orange-400 border-orange-500/30">
                            Paid Promotion
                          </Badge>
                          <Badge 
                            variant="default" 
                            class={`text-sm ${
                              report.disclosureStatus === 'disclosed' 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}
                          >
                            {report.disclosureStatus === 'disclosed' ? 'Disclosed' : 'Undisclosed'}
                          </Badge>
                        </div>
                      </div>

                      {/* Tweet Content */}
                      {report.tweetContent && (
                        <div class="text-sm text-gray-300 mb-4 glass-subtle p-3 rounded-xl border-l-4 border-blue-500/50">
                          <div class="font-semibold text-blue-400 mb-1">Tweet:</div>
                          "{report.tweetContent}"
                        </div>
                      )}

                      {/* Evidence */}
                      {report.evidence && (
                        <div class="text-sm text-gray-300 mb-4 glass-subtle p-3 rounded-xl border-l-4 border-orange-500/50">
                          <div class="font-semibold text-orange-400 mb-1">Evidence:</div>
                          {report.evidence}
                        </div>
                      )}

                      {/* Report Metadata */}
                      <div class="flex flex-wrap items-center gap-4 text-sm">
                        <div class="text-gray-400">
                          Reported: <RelativeTime timestamp={new Date(report.reportedAt).toISOString()} />
                        </div>
                        <a 
                          href={report.tweetUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          class="text-orange-400 hover:text-orange-300 hover:underline inline-flex items-center gap-1"
                        >
                          View Tweet
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        {report.reportedBy && (
                          <div class="text-gray-400">
                            By: <span class="text-white font-medium">
                              {report.reportedBy.ethosUsername || `${report.reportedBy.walletAddress.slice(0, 6)}...${report.reportedBy.walletAddress.slice(-4)}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delete Button (only show on own page) */}
                    {isOwnPage && (
                      <button
                        type="button"
                        onClick={() => handleDeleteReport(report.id)}
                        disabled={deletingId === report.id}
                        class="flex-shrink-0 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === report.id ? (
                          <span class="flex items-center gap-2">
                            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Deleting...
                          </span>
                        ) : (
                          <span class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}


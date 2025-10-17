import { useEffect, useRef, useState } from "preact/hooks";
import { EthosUser } from "../utils/ethos-api.ts";

type ProjectType = "token" | "pre_tge" | "nft";

interface ProjectItem {
  id: string;
  twitterUsername: string;
  displayName: string;
  avatarUrl: string;
  type: ProjectType;
  link?: string;
  chain?: "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid";
  coinGeckoId?: string;
  ticker?: string;
  isVerified?: boolean;
  suggestedAt?: number;
  suggestedBy?: {
    walletAddress: string;
    ethosUsername?: string;
    ethosProfileId?: number;
  };
}

interface ContributorStats {
  walletAddress: string;
  ethosUsername?: string;
  ethosProfileId?: number;
  signalCount: number;
}

interface Props {
  initialItems: ProjectItem[];
  contributorStats: ContributorStats[];
}

export default function AdminVerified(props: Props) {
  const [activeTab, setActiveTab] = useState<"verified" | "pending" | "add">("verified");
  
  // All project lists
  const [verifiedItems, setVerifiedItems] = useState<ProjectItem[]>([]);
  const [pendingItems, setPendingItems] = useState<ProjectItem[]>([]);
  
  // Add New form state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EthosUser[]>([]);
  const [selected, setSelected] = useState<EthosUser | null>(null);
  const [type, setType] = useState<ProjectType>("token");
  const [link, setLink] = useState("");
  const [chain, setChain] = useState<"ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid">("ethereum");
  const [coinGeckoId, setCoinGeckoId] = useState("");
  const [ticker, setTicker] = useState("");
  
  // Edit suggestion state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProjectItem>>({});
  
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Load projects on mount and separate into verified/pending
  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const [verifiedRes, pendingRes] = await Promise.all([
        fetch('/api/verified?status=verified'),
        fetch('/api/verified?status=unverified'),
      ]);
      
      const verifiedData = await verifiedRes.json();
      const pendingData = await pendingRes.json();
      
      setVerifiedItems(verifiedData.values || []);
      setPendingItems(pendingData.values || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  // Search for Ethos users
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return; }
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults((data.values || []).slice(0, 6));
    }, 200);
    return () => clearTimeout(handler);
  }, [query]);

  async function autoPopulate() {
    if (!selected?.username) return alert("Select a project first to auto-populate data.");
    
    try {
      const response = await fetch(`/api/coins/search?twitter=${selected.username}`);
      const data = await response.json();
      
      if (data.coin && data.coin.contracts.length > 0) {
        const contract = data.coin.contracts[0];
        setType("token");
        setChain(contract.chain);
        setLink(contract.address);
        
        alert(`✅ Auto-populated from CoinGecko:\n\n📊 ${data.coin.name} (${data.coin.symbol.toUpperCase()})\n🔗 Chain: ${contract.chain}\n📄 Contract: ${contract.address}\n\nReview and click Save to confirm.`);
      } else {
        alert("❌ No matching token found on CoinGecko for @" + selected.username);
      }
    } catch (error) {
      console.error("Failed to auto-populate:", error);
      alert("❌ Failed to fetch data from CoinGecko. Please try again.");
    }
  }

  async function save() {
    if (!selected) return alert("Select a project via search first.");
    
    if (type !== "pre_tge" && !link && !coinGeckoId) {
      return alert("Please provide either a contract address or CoinGecko ID for price tracking.");
    }
    
    const body = {
      ethosUserId: selected.id,
      twitterUsername: selected.username || selected.displayName,
      displayName: selected.displayName,
      avatarUrl: selected.avatarUrl,
      type,
      link: link || undefined,
      coinGeckoId: coinGeckoId || undefined,
      ticker: ticker || undefined,
      ...(type !== "pre_tge" && { chain }),
    };
    
    const res = await fetch('/api/verified', { 
      method: 'POST', 
      headers: { 'content-type': 'application/json' }, 
      body: JSON.stringify(body) 
    });
    
    if (res.ok) {
      await loadProjects();
      setQuery(""); 
      setSelected(null); 
      setResults([]); 
      setLink(""); 
      setCoinGeckoId(""); 
      setTicker("");
      setActiveTab("verified");
      alert("✅ Project added successfully!");
    }
  }

  async function remove(id: string, displayName: string) {
    if (!confirm(`Are you sure you want to delete "${displayName}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/verified?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadProjects();
        alert(`✅ Successfully deleted "${displayName}"`);
      } else {
        alert(`❌ Failed to delete "${displayName}". Please try again.`);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert(`❌ Failed to delete "${displayName}". Please try again.`);
    }
  }

  function startEditing(project: ProjectItem) {
    setEditingId(project.id);
    setEditForm({
      twitterUsername: project.twitterUsername,
      displayName: project.displayName,
      type: project.type,
      chain: project.chain,
      link: project.link,
      coinGeckoId: project.coinGeckoId,
      ticker: project.ticker,
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm({});
  }

  async function approveSuggestion(projectId: string, withEdits: boolean = false) {
    try {
      const updates = withEdits ? editForm : {};
      
      const res = await fetch('/api/admin/projects/review', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          projectId,
          approve: true,
          updates,
          verifiedBy: 'admin',
        }),
      });

      if (res.ok) {
        await loadProjects();
        setEditingId(null);
        setEditForm({});
        alert("✅ Project approved successfully!");
      } else {
        alert("❌ Failed to approve project");
      }
    } catch (error) {
      console.error('Failed to approve project:', error);
      alert("❌ Failed to approve project");
    }
  }

  async function rejectSuggestion(projectId: string, displayName: string) {
    if (!confirm(`Are you sure you want to reject "${displayName}"? This will permanently delete the suggestion.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/projects/review?id=${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadProjects();
        alert("✅ Suggestion rejected");
      } else {
        alert("❌ Failed to reject suggestion");
      }
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
      alert("❌ Failed to reject suggestion");
    }
  }

  return (
    <div>
      {/* Contributor Statistics - Last 7 Days */}
      <div class="mb-8 p-6 glass-strong rounded-2xl border border-white/10">
        <h2 class="text-xl font-bold text-white mb-4">📊 Signal Contributors (Last 7 Days)</h2>
        {props.contributorStats.length === 0 ? (
          <div class="text-center text-gray-400 py-4">No signals saved in the last 7 days</div>
        ) : (
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {props.contributorStats.map((stat) => (
              <div key={stat.walletAddress} class="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all">
                {stat.ethosUsername ? (
                  <a 
                    href={`/profile/${stat.ethosUsername}`} 
                    class="text-sm text-blue-400 hover:text-blue-300 font-medium hover:underline"
                  >
                    @{stat.ethosUsername}
                  </a>
                ) : (
                  <span class="text-sm text-gray-300 font-mono">
                    {stat.walletAddress.slice(0, 6)}...{stat.walletAddress.slice(-4)}
                  </span>
                )}
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-400">signals:</span>
                  <span class="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm font-bold">
                    {stat.signalCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div class="flex gap-2 mb-6 border-b border-white/10">
        <button
          type="button"
          class={`px-6 py-3 font-semibold transition-all ${
            activeTab === "verified"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-200"
          }`}
          onClick={() => setActiveTab("verified")}
        >
          Verified Projects ({verifiedItems.length})
        </button>
        <button
          type="button"
          class={`px-6 py-3 font-semibold transition-all ${
            activeTab === "pending"
              ? "text-white border-b-2 border-yellow-500"
              : "text-gray-400 hover:text-gray-200"
          }`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Suggestions ({pendingItems.length})
        </button>
        <button
          type="button"
          class={`px-6 py-3 font-semibold transition-all ${
            activeTab === "add"
              ? "text-white border-b-2 border-green-500"
              : "text-gray-400 hover:text-gray-200"
          }`}
          onClick={() => setActiveTab("add")}
        >
          Add New
        </button>
      </div>

      {/* Verified Projects Tab */}
      {activeTab === "verified" && (
        <div class="space-y-3">
          {verifiedItems.length === 0 ? (
            <div class="text-center text-gray-400 py-8">No verified projects yet</div>
          ) : (
            verifiedItems.map((p) => (
              <div key={p.id} class="flex items-center justify-between p-4 glass-strong rounded-2xl border border-white/10">
                <div class="flex items-center gap-3">
                  <img src={p.avatarUrl} class="w-8 h-8 rounded-full" alt={p.displayName} />
                  <div>
                    <div class="font-medium text-white">{p.displayName} @{p.twitterUsername}</div>
                    <div class="text-xs text-gray-400">
                      {p.type} • {p.chain ?? "ethereum"}
                      {p.ticker && ` • $${p.ticker}`}
                      {p.link && ` • ${p.link.slice(0, 10)}...`}
                      {p.coinGeckoId && ` • ID: ${p.coinGeckoId}`}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  class="px-4 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-red-500/20 rounded-xl border border-red-500/30 hover:border-red-500/50 transition-all duration-200 backdrop-blur-sm"
                  onClick={() => remove(p.id, p.displayName)}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pending Suggestions Tab */}
      {activeTab === "pending" && (
        <div class="space-y-4">
          {pendingItems.length === 0 ? (
            <div class="text-center text-gray-400 py-8">No pending suggestions</div>
          ) : (
            pendingItems.map((p) => (
              <div key={p.id} class="p-4 glass-strong rounded-2xl border border-yellow-500/30">
                {editingId === p.id ? (
                  // Edit mode
                  <div class="space-y-3">
                    <div class="flex items-center gap-3 mb-3">
                      <img src={p.avatarUrl} class="w-10 h-10 rounded-full" alt={p.displayName} />
                      <div>
                        <div class="font-medium text-white">Editing: {p.displayName}</div>
                        <div class="text-xs text-gray-400">Suggested by {p.suggestedBy?.ethosUsername || p.suggestedBy?.walletAddress?.slice(0, 10)}</div>
                      </div>
                    </div>
                    
                    <input
                      class="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white"
                      placeholder="Twitter Username"
                      value={editForm.twitterUsername || ""}
                      onInput={(e) => setEditForm({ ...editForm, twitterUsername: (e.target as HTMLInputElement).value })}
                    />
                    
                    <input
                      class="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white"
                      placeholder="Display Name"
                      value={editForm.displayName || ""}
                      onInput={(e) => setEditForm({ ...editForm, displayName: (e.target as HTMLInputElement).value })}
                    />
                    
                    <select
                      class="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white"
                      value={editForm.type || "token"}
                      onInput={(e) => setEditForm({ ...editForm, type: (e.target as HTMLSelectElement).value as ProjectType })}
                    >
                      <option value="token">Token</option>
                      <option value="pre_tge">Pre-TGE</option>
                      <option value="nft">NFT</option>
                    </select>
                    
                    {editForm.type !== "pre_tge" && (
                      <>
                        <select
                          class="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white"
                          value={editForm.chain || "ethereum"}
                          onInput={(e) => setEditForm({ ...editForm, chain: (e.target as HTMLSelectElement).value as "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid" })}
                        >
                          <option value="ethereum">Ethereum</option>
                          <option value="base">Base</option>
                          <option value="solana">Solana</option>
                          <option value="bsc">BSC</option>
                          <option value="plasma">Plasma</option>
                          <option value="hyperliquid">Hyperliquid</option>
                        </select>
                        
                        <input
                          class="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white"
                          placeholder="Contract Address"
                          value={editForm.link || ""}
                          onInput={(e) => setEditForm({ ...editForm, link: (e.target as HTMLInputElement).value })}
                        />
                        
                        <input
                          class="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white"
                          placeholder="CoinGecko ID"
                          value={editForm.coinGeckoId || ""}
                          onInput={(e) => setEditForm({ ...editForm, coinGeckoId: (e.target as HTMLInputElement).value })}
                        />
                      </>
                    )}
                    
                    <input
                      class="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white"
                      placeholder="Ticker (e.g., MKR, XPL)"
                      value={editForm.ticker || ""}
                      onInput={(e) => setEditForm({ ...editForm, ticker: (e.target as HTMLInputElement).value })}
                    />
                    
                    <div class="flex gap-2">
                      <button
                        type="button"
                        class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all"
                        onClick={() => approveSuggestion(p.id, true)}
                      >
                        Save & Approve
                      </button>
                      <button
                        type="button"
                        class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div>
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-3">
                        <img src={p.avatarUrl} class="w-10 h-10 rounded-full" alt={p.displayName} />
                        <div>
                          <div class="font-medium text-white">{p.displayName} @{p.twitterUsername}</div>
                          <div class="text-xs text-gray-400">
                            {p.type} • {p.chain ?? "ethereum"}
                            {p.ticker && ` • $${p.ticker}`}
                          </div>
                        </div>
                      </div>
                      <div class="text-xs text-gray-400">
                        {p.suggestedAt && new Date(p.suggestedAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div class="text-sm text-gray-300 mb-3 space-y-1">
                      {p.link && <div>📄 Contract: <span class="font-mono text-xs">{p.link}</span></div>}
                      {p.coinGeckoId && (
                        <div class="flex items-center gap-2">
                          🦎 CoinGecko: <span class="font-mono">{p.coinGeckoId}</span>
                          <a
                            href={`https://www.coingecko.com/en/coins/${p.coinGeckoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-blue-400 hover:text-blue-300 underline text-xs"
                          >
                            View on CoinGecko →
                          </a>
                        </div>
                      )}
                      <div>👤 Suggested by: {p.suggestedBy?.ethosUsername || p.suggestedBy?.walletAddress?.slice(0, 10) || "Unknown"}</div>
                    </div>

                    {/* Price Chart - only show for tokens with ticker or CoinGecko ID */}
                    {(p.ticker || p.coinGeckoId) && p.type === 'token' && (
                      <div class="my-4 p-4 rounded-xl bg-black/30 border border-white/10">
                        <div class="flex items-center justify-between mb-3">
                          <div class="text-sm font-medium text-gray-300">📊 Price Chart</div>
                          <div class="flex gap-3 items-center">
                            {p.coinGeckoId && (
                              <a
                                href={`https://www.coingecko.com/en/coins/${p.coinGeckoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                              >
                                CoinGecko →
                              </a>
                            )}
                            {p.ticker && (
                              <a
                                href={`https://www.tradingview.com/chart/?symbol=${p.ticker}USD`}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                              >
                                TradingView →
                              </a>
                            )}
                          </div>
                        </div>
                        <div class="relative w-full h-96 bg-gradient-to-br from-gray-900/50 to-gray-800/30 rounded-lg overflow-hidden border border-white/5">
                          <iframe
                            src={`https://www.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${p.ticker ? `CRYPTO:${p.ticker}USD` : `COINBASE:ETHUSD`}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=f1f3f6&theme=dark&style=1&timezone=Etc%2FUTC&studies=%5B%5D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost&utm_medium=widget_new&utm_campaign=chart&utm_term=${p.ticker || 'ETH'}USD`}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            allowTransparency
                            scrolling="no"
                            allowFullScreen
                            title={`${p.displayName} TradingView Chart`}
                            class="w-full h-full"
                          />
                        </div>
                        <div class="text-xs text-yellow-500 mt-2 flex items-center gap-1 font-medium">
                          <span>⚠️</span>
                          <span>Verify this matches the correct token before approving (Symbol: {p.ticker || 'check manually'})</span>
                        </div>
                      </div>
                    )}
                    
                    <div class="flex gap-2">
                      <button
                        type="button"
                        class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-all"
                        onClick={() => approveSuggestion(p.id, false)}
                      >
                        ✓ Approve
                      </button>
                      <button
                        type="button"
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all"
                        onClick={() => startEditing(p)}
                      >
                        ✏️ Edit & Approve
                      </button>
                      <button
                        type="button"
                        class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-all"
                        onClick={() => rejectSuggestion(p.id, p.displayName)}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Add New Tab */}
      {activeTab === "add" && (
        <div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 relative">
            <input 
              class="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 transition-all" 
              placeholder="Search Ethos by Twitter handle" 
              value={query} 
              onInput={(e) => setQuery((e.target as HTMLInputElement).value)} 
            />
            <select 
              class="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 transition-all" 
              value={type} 
              onInput={(e) => setType((e.target as HTMLSelectElement).value as ProjectType)}
            >
              <option value="token">Token</option>
              <option value="pre_tge">Pre-TGE</option>
              <option value="nft">NFT</option>
            </select>
            {type !== "pre_tge" && (
              <select 
                class="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 transition-all" 
                value={chain} 
                onInput={(e) => setChain((e.target as HTMLSelectElement).value as "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid")}
              >
                <option value="ethereum">Ethereum</option>
                <option value="base">Base</option>
                <option value="solana">Solana</option>
                <option value="bsc">BSC</option>
                <option value="plasma">Plasma</option>
                <option value="hyperliquid">Hyperliquid</option>
              </select>
            )}
            {type !== "pre_tge" && (
              <input 
                class="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 transition-all" 
                placeholder="Contract address (optional)" 
                value={link} 
                onInput={(e) => setLink((e.target as HTMLInputElement).value)} 
              />
            )}
            {type !== "pre_tge" && (
              <input 
                class="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 transition-all" 
                placeholder="CoinGecko ID (for Layer 1 tokens)" 
                value={coinGeckoId} 
                onInput={(e) => setCoinGeckoId((e.target as HTMLInputElement).value)} 
              />
            )}
            <input 
              class="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 transition-all" 
              placeholder="Ticker symbol (e.g., MKR, XPL)" 
              value={ticker} 
              onInput={(e) => setTicker((e.target as HTMLInputElement).value)} 
            />
            <div class="md:col-span-2 flex gap-2">
              <button 
                class="flex-1 inline-flex items-center justify-center h-12 px-6 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105" 
                type="button" 
                onClick={save}
              >
                Save
              </button>
              <button 
                class="inline-flex items-center justify-center h-12 px-6 rounded-xl font-semibold bg-gradient-to-r from-gray-700 to-gray-600 text-gray-100 hover:from-gray-600 hover:to-gray-500 shadow-lg shadow-gray-700/30 transition-all duration-300 hover:scale-105" 
                type="button" 
                onClick={autoPopulate}
              >
                Auto-populate from CoinGecko
              </button>
            </div>

            {results.length > 0 && (
              <div ref={boxRef} class="absolute top-12 left-0 w-full md:w-1/2 rounded-2xl border border-white/20 glass-strong shadow-2xl shadow-black/40 z-10">
                {results.map((u) => (
                  <div 
                    key={u.id}
                    class="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/10 rounded-xl transition-all duration-200" 
                    onClick={() => { setSelected(u); setQuery(u.username || u.displayName); setResults([]); }}
                  >
                    <img src={u.avatarUrl} width={24} height={24} class="rounded-full" alt={u.displayName} />
                    <div class="text-sm text-white">{u.displayName}{u.username ? ` @${u.username}` : ""}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

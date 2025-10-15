import { useState, useEffect, useRef } from "preact/hooks";

type ProjectType = "token" | "nft" | "pre_tge";
type Chain = "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid";

interface EthosUser {
  id: number;
  username?: string;
  displayName: string;
  avatarUrl: string;
}

export default function SuggestProjectForm() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Clear any error when form is collapsed
  useEffect(() => {
    if (!isExpanded) {
      setErrorMessage("");
    }
  }, [isExpanded]);
  
  // Ethos search
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EthosUser[]>([]);
  const [selectedProject, setSelectedProject] = useState<EthosUser | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  
  // Form fields
  const [type, setType] = useState<ProjectType>("token");
  const [chain, setChain] = useState<Chain>("ethereum");
  const [contractAddress, setContractAddress] = useState("");
  const [coinGeckoId, setCoinGeckoId] = useState("");

  // Search Ethos users
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setSearchResults((data.values || []).slice(0, 6));
      } catch (error) {
        console.error("Failed to search Ethos:", error);
        setSearchResults([]);
      }
    }, 200);
    
    return () => clearTimeout(handler);
  }, [query]);

  const resetForm = () => {
    setQuery("");
    setSearchResults([]);
    setSelectedProject(null);
    setType("token");
    setChain("ethereum");
    setContractAddress("");
    setCoinGeckoId("");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // Validate selected project
      if (!selectedProject) {
        setErrorMessage("Please search and select a project from Ethos.");
        setIsSubmitting(false);
        return;
      }

      // For tokens/NFTs, need at least contract address or CoinGecko ID
      if (type !== "pre_tge" && !contractAddress && !coinGeckoId) {
        setErrorMessage("Please provide either a contract address or CoinGecko ID for tokens/NFTs.");
        setIsSubmitting(false);
        return;
      }

      // Prepare suggestion data
      const suggestionData: Record<string, string | number> = {
        twitterUsername: selectedProject.username || selectedProject.displayName,
        displayName: selectedProject.displayName,
        avatarUrl: selectedProject.avatarUrl,
        type,
      };

      if (type !== "pre_tge") {
        suggestionData.chain = chain;
        if (contractAddress) suggestionData.link = contractAddress.trim();
        if (coinGeckoId) suggestionData.coinGeckoId = coinGeckoId.trim();
      }

      // Get auth token from localStorage if available (optional)
      const authToken = localStorage.getItem("signals_auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      // Submit suggestion
      const response = await fetch("/api/projects/suggest", {
        method: "POST",
        headers,
        body: JSON.stringify(suggestionData),
      });

      const data = await response.json();

      if (response.ok) {
        const remainingText = data.remainingSuggestions !== undefined 
          ? ` You have ${data.remainingSuggestions} suggestions remaining today.` 
          : "";
        setSuccessMessage(`🎉 Thank you! Your project suggestion for "${selectedProject?.displayName}" has been submitted and is pending admin review.${remainingText}`);
        resetForm();
        setIsExpanded(false);
        
        // Clear success message after 10 seconds (increased from 5)
        setTimeout(() => setSuccessMessage(""), 10000);
      } else {
        if (data.code === "RATE_LIMIT_EXCEEDED") {
          setErrorMessage(data.message);
        } else if (data.code === "VALIDATION_ERROR") {
          setErrorMessage(`Validation error: ${data.errors.join(", ")}`);
        } else {
          setErrorMessage(data.message || "Failed to submit suggestion. Please try again.");
        }
      }
    } catch (error) {
      console.error("Failed to submit suggestion:", error);
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="mb-8">
      {/* Success Message */}
      {successMessage && (
        <div class="mb-4 p-5 rounded-xl bg-green-500/20 border-2 border-green-500/60 text-green-200 shadow-lg backdrop-blur-sm">
          <div class="flex items-start gap-3">
            <span class="text-2xl">✅</span>
            <div class="flex-1">
              <div class="font-semibold text-lg mb-1">Suggestion Submitted!</div>
              <div class="text-sm text-green-300">{successMessage}</div>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Section */}
      <div class="glass-strong rounded-xl border border-white/10 overflow-hidden">
        {/* Header */}
        <button
          type="button"
          class="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">💡</span>
            <div class="text-left">
              <h2 class="text-lg font-bold text-white">Suggest a New Project</h2>
              <p class="text-sm text-gray-400">Help expand our database of verified projects</p>
            </div>
          </div>
          <svg
            class={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Form */}
        {isExpanded && (
          <form onSubmit={handleSubmit} class="px-6 pb-6 border-t border-white/10">
            <div class="mt-6 space-y-4">
              {errorMessage && (
                <div class="p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Project Search */}
              <div class="relative">
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Search Project by Twitter Handle *
                </label>
                <input
                  type="text"
                  value={query}
                  onInput={(e) => {
                    setQuery((e.target as HTMLInputElement).value);
                    setSelectedProject(null);
                  }}
                  placeholder="Search Ethos by Twitter handle"
                  class="w-full px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                />
                
                {/* Selected Project Display */}
                {selectedProject && (
                  <div class="mt-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-3">
                    <img 
                      src={selectedProject.avatarUrl} 
                      alt={selectedProject.displayName}
                      class="w-10 h-10 rounded-full"
                    />
                    <div class="flex-1">
                      <div class="font-medium text-white">{selectedProject.displayName}</div>
                      {selectedProject.username && (
                        <div class="text-sm text-gray-400">@{selectedProject.username}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProject(null);
                        setQuery("");
                      }}
                      class="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && !selectedProject && (
                  <div 
                    ref={dropdownRef}
                    class="absolute top-full left-0 right-0 mt-2 rounded-xl border border-white/20 bg-gray-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 z-50 max-h-64 overflow-y-auto"
                  >
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        class="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/10 transition-all"
                        onClick={() => {
                          setSelectedProject(user);
                          setQuery(user.username || user.displayName);
                          setSearchResults([]);
                        }}
                      >
                        <img 
                          src={user.avatarUrl} 
                          alt={user.displayName}
                          class="w-8 h-8 rounded-full" 
                        />
                        <div>
                          <div class="text-sm font-medium text-white">{user.displayName}</div>
                          {user.username && (
                            <div class="text-xs text-gray-400">@{user.username}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project Type */}
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    Project Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType((e.target as HTMLSelectElement).value as ProjectType)}
                    class="w-full px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="token">Token</option>
                    <option value="nft">NFT</option>
                    <option value="pre_tge">Pre-TGE</option>
                  </select>
                </div>

                {/* Chain */}
                {type !== "pre_tge" && (
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">
                      Chain *
                    </label>
                    <select
                      value={chain}
                      onChange={(e) => setChain((e.target as HTMLSelectElement).value as Chain)}
                      class="w-full px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="ethereum">Ethereum</option>
                      <option value="base">Base</option>
                      <option value="solana">Solana</option>
                      <option value="bsc">BSC</option>
                      <option value="plasma">Plasma</option>
                      <option value="hyperliquid">Hyperliquid</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Contract Address & CoinGecko ID */}
              {type !== "pre_tge" && (
                <>
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">
                      Contract Address
                    </label>
                    <input
                      type="text"
                      value={contractAddress}
                      onInput={(e) => setContractAddress((e.target as HTMLInputElement).value)}
                      placeholder="0x..."
                      class="w-full px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">
                      CoinGecko ID <span class="text-xs text-gray-500">(for Layer 1 tokens without contracts)</span>
                    </label>
                    <input
                      type="text"
                      value={coinGeckoId}
                      onInput={(e) => setCoinGeckoId((e.target as HTMLInputElement).value)}
                      placeholder="e.g., ethereum, bitcoin"
                      class="w-full px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>

                  <p class="text-xs text-gray-400">
                    * Either contract address or CoinGecko ID is required for tokens/NFTs
                  </p>
                </>
              )}

              {/* Submit Buttons */}
              <div class="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedProject}
                  class="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300"
                >
                  {isSubmitting ? "Submitting..." : "Submit Suggestion"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsExpanded(false);
                  }}
                  class="px-6 py-3 rounded-xl font-semibold border border-white/20 text-gray-300 hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
              </div>

              <p class="text-xs text-gray-400">
                💡 <strong>Tip:</strong> Search for the project on Ethos, select it, and provide the contract address or CoinGecko ID.
                {" "}Rate limit: 5 suggestions per 24 hours (tracked by wallet if connected).
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

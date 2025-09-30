import { useState, useEffect } from "preact/hooks";
import { EthosUser, searchUsersByTwitter } from "../utils/ethos-api.ts";
import { Input } from "../components/ui/Input.tsx";
import { Card, CardContent } from "../components/ui/Card.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import { getScoreLevelName, getScoreColor, getScoreBadgeVariant } from "../utils/ethos-score.ts";

export default function SearchForm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EthosUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounced typeahead search
  useEffect(() => {
    const searchUsers = async () => {
      const trimmedQuery = query.trim();
      
      if (!trimmedQuery || trimmedQuery.length < 2) {
        setResults([]);
        setShowDropdown(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const users = await searchUsersByTwitter(trimmedQuery);
        setResults(users);
        setShowDropdown(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the search by 300ms
    const timeoutId = setTimeout(searchUsers, 300);
    
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    // Form submission is now handled by typeahead, but keep for Enter key
  };

  const handleUserClick = (username: string) => {
    // Navigate to profile page
    globalThis.location.href = `/profile/${username}`;
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setShowDropdown(false);
    }
  };

  return (
    <div class="w-full max-w-2xl mx-auto relative">
      {/* Search Form */}
      <Card class="mb-8 glass-strong hover-glow">
        <CardContent class="!p-6 flex items-center justify-center">
          <form onSubmit={handleSubmit} class="w-full">
            <div class="flex gap-3 items-center">
              <div class="flex-1 relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  {loading ? (
                    <svg class="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  )}
                </div>
                <Input
                  type="text"
                  value={query}
                  onInput={(e) => handleInputChange((e.target as HTMLInputElement).value)}
                  placeholder="Start typing a Twitter handle..."
                  class="pl-12 text-base h-14"
                />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
        
      {/* Typeahead Dropdown */}
      {showDropdown && results.length > 0 && (
        <div class="absolute top-full left-0 right-0 mt-2 glass-strong border border-white/20 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50 max-h-96 overflow-y-auto">
            {results.map((user) => (
              <div
                key={user.id}
                onClick={() => handleUserClick(user.username || user.id.toString())}
                class="p-4 hover:bg-white/10 transition-all duration-200 cursor-pointer border-b border-white/5 last:border-b-0"
              >
                <div class="flex items-center gap-4">
                  <div class="relative">
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      class="w-12 h-12 rounded-full ring-4 shadow-lg"
                      style={`border-color: ${getScoreColor(user.score)}; box-shadow: 0 0 12px ${getScoreColor(user.score)}40, 0 10px 25px rgba(0,0,0,0.3);`}
                    />
                    {user.status === "ACTIVE" && (
                      <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black shadow-lg shadow-green-500/50"></div>
                    )}
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <div>
                        <h4 class="font-semibold text-white text-base">{user.displayName}</h4>
                        {user.username && (
                          <p class="text-sm text-gray-400">@{user.username}</p>
                        )}
                      </div>
                      <Badge variant={getScoreBadgeVariant(user.score)} class="text-xs">
                        {getScoreLevelName(user.score)}
                      </Badge>
                    </div>
                    
                    <div class="flex items-center gap-4 mt-2">
                      <span class="text-xs text-gray-400">
                        Score: <span class="font-semibold" style={`color: ${getScoreColor(user.score)};`}>{user.score}</span>
                      </span>
                      <span class="text-xs text-gray-400">
                        XP: <span class="font-semibold text-white">{user.xpTotal.toLocaleString()}</span>
                      </span>
                      <span class="text-xs text-gray-400">
                        Reviews: <span class="font-semibold text-white">{user.stats.review.received.positive}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div class="mt-2 glass-subtle border border-red-500/30 rounded-2xl p-4">
          <div class="flex items-center gap-2 text-red-300">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L2.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span class="font-medium text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
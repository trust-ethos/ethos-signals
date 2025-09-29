import { useState } from "preact/hooks";
import { EthosUser, searchUsersByTwitter } from "../utils/ethos-api.ts";
import { Button } from "../components/ui/Button.tsx";
import { Input } from "../components/ui/Input.tsx";
import { Card, CardContent } from "../components/ui/Card.tsx";
import { Badge } from "../components/ui/Badge.tsx";

export default function SearchForm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EthosUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: Event) => {
    e.preventDefault();
    
    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const users = await searchUsersByTwitter(query.trim());
      setResults(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (username: string) => {
    // Navigate to profile page
    globalThis.location.href = `/profile/${username}`;
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 2000) return "success";
    if (score >= 1600) return "default";
    if (score >= 1200) return "secondary";
    if (score >= 800) return "warning";
    return "destructive";
  };

  const getScoreLevel = (score: number) => {
    if (score >= 2000) return "Exemplary";
    if (score >= 1600) return "Reputable";
    if (score >= 1200) return "Neutral";
    if (score >= 800) return "Questionable";
    return "Untrusted";
  };

  return (
    <div class="w-full max-w-2xl">
      {/* Search Form */}
      <Card class="mb-8 backdrop-blur-sm bg-white/90 border-gray-200/50">
        <CardContent>
          <form onSubmit={handleSearch} class="space-y-4">
            <div class="flex gap-3">
              <div class="flex-1 relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <Input
                  type="text"
                  value={query}
                  onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                  placeholder="Enter Twitter handle (e.g., vitalikbuterin)"
                  class="pl-10 text-base h-12"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                size="lg"
                class="px-8"
              >
                {loading ? (
                  <>
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching
                  </>
                ) : (
                  "Search"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card class="mb-6 border-red-200 bg-red-50">
          <CardContent class="p-4">
            <div class="flex items-center gap-2 text-red-800">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L2.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span class="font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Search Results</h3>
            <Badge variant="secondary">{results.length.toString()} found</Badge>
          </div>
          
          <div class="space-y-3">
            {results.map((user) => (
              <Card
                key={user.id}
                onClick={() => handleUserClick(user.username || user.id.toString())}
                class="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-gray-200/60 backdrop-blur-sm bg-white/90"
              >
                <CardContent class="p-5">
                  <div class="flex items-start gap-4">
                    <div class="relative">
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName}
                        class="w-14 h-14 rounded-full ring-2 ring-gray-100"
                      />
                      {user.status === "ACTIVE" && (
                        <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    
                    <div class="flex-1 min-w-0">
                      <div class="flex items-start justify-between">
                        <div>
                          <h4 class="font-semibold text-gray-900 text-lg">{user.displayName}</h4>
                          {user.username && (
                            <p class="text-gray-600 mb-2">@{user.username}</p>
                          )}
                        </div>
                        <Badge variant={getScoreBadgeVariant(user.score)}>
                          {getScoreLevel(user.score)}
                        </Badge>
                      </div>
                      
                      <div class="flex items-center gap-4 mt-3">
                        <div class="flex items-center gap-1">
                          <span class="text-sm font-medium text-gray-900">{user.score}</span>
                          <span class="text-xs text-gray-500">Score</span>
                        </div>
                        <div class="flex items-center gap-1">
                          <span class="text-sm font-medium text-gray-900">{user.xpTotal.toLocaleString()}</span>
                          <span class="text-xs text-gray-500">XP</span>
                        </div>
                        <div class="flex items-center gap-1">
                          <span class="text-sm font-medium text-gray-900">{user.stats.review.received.positive}</span>
                          <span class="text-xs text-gray-500">Reviews</span>
                        </div>
                      </div>
                      
                      {user.description && (
                        <p class="mt-3 text-sm text-gray-600 line-clamp-2">
                          {user.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

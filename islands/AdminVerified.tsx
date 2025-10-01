import { useEffect, useRef, useState } from "preact/hooks";
import { EthosUser } from "../utils/ethos-api.ts";

type ProjectType = "token" | "pre_tge" | "nft";

interface Props {
  initialItems: Array<{ 
    id: string; 
    twitterUsername: string; 
    displayName: string; 
    avatarUrl: string; 
    type: ProjectType; 
    link?: string; 
    chain?: "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid";
    coinGeckoId?: string;
    ticker?: string;
  }>;
}

export default function AdminVerified({ initialItems }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EthosUser[]>([]);
  const [selected, setSelected] = useState<EthosUser | null>(null);
  const [type, setType] = useState<ProjectType>("token");
  const [link, setLink] = useState("");
  const [chain, setChain] = useState<"ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid">("ethereum");
  const [coinGeckoId, setCoinGeckoId] = useState("");
  const [ticker, setTicker] = useState("");
  const [items, setItems] = useState(initialItems);
  const boxRef = useRef<HTMLDivElement | null>(null);

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
        // Auto-fill with the first contract found
        const contract = data.coin.contracts[0];
        setType("token");
        setChain(contract.chain);
        setLink(contract.address);
        
        // Show success feedback
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
    
    // Validate that we have either a contract address or CoinGecko ID
    if (!link && !coinGeckoId) {
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
      chain,
    };
    const res = await fetch('/api/verified', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      const list = await fetch('/api/verified').then(r => r.json());
      setItems(list.values || []);
      setQuery(""); setSelected(null); setResults([]); setLink(""); setCoinGeckoId(""); setTicker("");
    }
  }

  async function remove(id: string, displayName: string) {
    if (!confirm(`Are you sure you want to delete "${displayName}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/verified?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        // Remove from local state immediately
        setItems(items.filter(item => item.id !== id));
        alert(`✅ Successfully deleted "${displayName}"`);
      } else {
        alert(`❌ Failed to delete "${displayName}". Please try again.`);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert(`❌ Failed to delete "${displayName}". Please try again.`);
    }
  }

  return (
    <div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 relative">
        <input class="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 transition-all" placeholder="Search Ethos by Twitter handle" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
        <select class="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 transition-all" value={type} onInput={(e) => setType((e.target as HTMLSelectElement).value as ProjectType)}>
          <option value="token">Token</option>
          <option value="pre_tge">Pre-TGE</option>
          <option value="nft">NFT</option>
        </select>
        <select class="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 transition-all" value={chain} onInput={(e) => setChain((e.target as HTMLSelectElement).value as "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid")}>
          <option value="ethereum">Ethereum</option>
          <option value="base">Base</option>
          <option value="solana">Solana</option>
          <option value="bsc">BSC</option>
          <option value="plasma">Plasma</option>
          <option value="hyperliquid">Hyperliquid</option>
        </select>
        <input class="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 transition-all" placeholder="Contract address (optional)" value={link} onInput={(e) => setLink((e.target as HTMLInputElement).value)} />
        <input class="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 transition-all" placeholder="CoinGecko ID (for Layer 1 tokens)" value={coinGeckoId} onInput={(e) => setCoinGeckoId((e.target as HTMLInputElement).value)} />
        <input class="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 transition-all" placeholder="Ticker symbol (e.g., MKR, XPL)" value={ticker} onInput={(e) => setTicker((e.target as HTMLInputElement).value)} />
        <div class="md:col-span-2 flex gap-2">
          <button class="flex-1 inline-flex items-center justify-center h-12 px-6 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105" type="button" onClick={save}>Save</button>
          <button class="inline-flex items-center justify-center h-12 px-6 rounded-xl font-semibold bg-gradient-to-r from-gray-700 to-gray-600 text-gray-100 hover:from-gray-600 hover:to-gray-500 shadow-lg shadow-gray-700/30 transition-all duration-300 hover:scale-105" type="button" onClick={autoPopulate}>Auto-populate from CoinGecko</button>
        </div>

        {results.length > 0 && (
          <div ref={boxRef} class="absolute top-12 left-0 w-full rounded-2xl border border-white/20 glass-strong shadow-2xl shadow-black/40 z-10">
            {results.map((u) => (
              <div class="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/10 rounded-xl transition-all duration-200" onClick={() => { setSelected(u); setQuery(u.username || u.displayName); setResults([]); }}>
                <img src={u.avatarUrl} width={24} height={24} class="rounded-full" />
                <div class="text-sm text-white">{u.displayName}{u.username ? ` @${u.username}` : ""}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div class="space-y-3">
        {items.map((p) => (
          <div key={p.id} class="flex items-center justify-between p-4 glass-strong rounded-2xl border border-white/10">
            <div class="flex items-center gap-3">
              <img src={p.avatarUrl} class="w-8 h-8 rounded-full" />
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
        ))}
      </div>
    </div>
  );
}



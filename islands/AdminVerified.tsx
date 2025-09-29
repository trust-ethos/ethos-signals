import { useEffect, useRef, useState } from "preact/hooks";
import { EthosUser, searchUsersByTwitter } from "../utils/ethos-api.ts";

type ProjectType = "token" | "pre_tge" | "nft";

interface Props {
  initialItems: Array<{ 
    id: string; 
    twitterUsername: string; 
    displayName: string; 
    avatarUrl: string; 
    type: ProjectType; 
    link?: string; 
    chain?: "ethereum" | "base" | "solana" | "bsc" | "plasma";
    coinGeckoId?: string;
  }>;
}

export default function AdminVerified({ initialItems }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EthosUser[]>([]);
  const [selected, setSelected] = useState<EthosUser | null>(null);
  const [type, setType] = useState<ProjectType>("token");
  const [link, setLink] = useState("");
  const [chain, setChain] = useState<"ethereum" | "base" | "solana" | "bsc" | "plasma">("ethereum");
  const [coinGeckoId, setCoinGeckoId] = useState("");
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
      chain,
    };
    const res = await fetch('/api/verified', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      const list = await fetch('/api/verified').then(r => r.json());
      setItems(list.values || []);
      setQuery(""); setSelected(null); setResults([]); setLink(""); setCoinGeckoId("");
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
        <input class="input" placeholder="Search Ethos by Twitter handle" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
        <select class="input" value={type} onInput={(e) => setType((e.target as HTMLSelectElement).value as ProjectType)}>
          <option value="token">Token</option>
          <option value="pre_tge">Pre-TGE</option>
          <option value="nft">NFT</option>
        </select>
        <select class="input" value={chain} onInput={(e) => setChain((e.target as HTMLSelectElement).value as "ethereum" | "base" | "solana" | "bsc" | "plasma")}>
          <option value="ethereum">Ethereum</option>
          <option value="base">Base</option>
          <option value="solana">Solana</option>
          <option value="bsc">BSC</option>
          <option value="plasma">Plasma</option>
        </select>
        <input class="input" placeholder="Contract address (optional)" value={link} onInput={(e) => setLink((e.target as HTMLInputElement).value)} />
        <input class="input" placeholder="CoinGecko ID (for Layer 1 tokens)" value={coinGeckoId} onInput={(e) => setCoinGeckoId((e.target as HTMLInputElement).value)} />
        <div class="md:col-span-2 flex gap-2">
          <button class="btn btn-primary flex-1" type="button" onClick={save}>Save</button>
          <button class="btn btn-secondary" type="button" onClick={autoPopulate}>Auto-populate from CoinGecko</button>
        </div>

        {results.length > 0 && (
          <div ref={boxRef} class="absolute top-12 left-0 w-full rounded-md border border-gray-200 bg-white shadow-lg z-10">
            {results.map((u) => (
              <div class="flex items-center gap-3 p-2 cursor-pointer hover:bg-gray-50" onClick={() => { setSelected(u); setQuery(u.username || u.displayName); setResults([]); }}>
                <img src={u.avatarUrl} width={24} height={24} class="rounded-full" />
                <div class="text-sm">{u.displayName}{u.username ? ` @${u.username}` : ""}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div class="space-y-3">
        {items.map((p) => (
          <div key={p.id} class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
            <div class="flex items-center gap-3">
              <img src={p.avatarUrl} class="w-8 h-8 rounded-full" />
              <div>
                <div class="font-medium">{p.displayName} @{p.twitterUsername}</div>
                <div class="text-xs text-gray-600">
                  {p.type} • {p.chain ?? "ethereum"}
                  {p.link && ` • ${p.link.slice(0, 10)}...`}
                  {p.coinGeckoId && ` • ID: ${p.coinGeckoId}`}
                </div>
              </div>
            </div>
            <button
              class="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 hover:border-red-300 transition-colors"
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



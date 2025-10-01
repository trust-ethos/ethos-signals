import { useEffect, useState } from "preact/hooks";

type Sentiment = "bullish" | "bearish";

interface Props {
  signalId: string;
  projectHandle: string;
  sentiment: Sentiment;
  notedAt: string;
  tweetTimestamp?: string;
  project?: {
    type: "token" | "nft" | "pre_tge";
    chain?: "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid";
    link?: string;
    coinGeckoId?: string;
  };
}

export default function SignalPerformance({ signalId, projectHandle, sentiment, notedAt, tweetTimestamp, project }: Props) {
  const [performance, setPerformance] = useState<number | null>(null);
  const [callPrice, setCallPrice] = useState<number | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isNFT, setIsNFT] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!project) {
      setLoading(false);
      return;
    }

    const proj = project; // Capture in closure to satisfy TypeScript

    async function fetchPerformance() {
      try {
        let fetchedCallPrice: number | null = null;
        let fetchedCurrentPrice: number | null = null;
        let isNFTType = false;

        if (proj.type === 'token') {
          // Try contract address first if available
          if (proj.link) {
            const chain = proj.chain || 'ethereum';
            const callResponse = await fetch(
              tweetTimestamp 
                ? `/api/price/token?chain=${chain}&address=${proj.link}&timestamp=${tweetTimestamp}`
                : `/api/price/token?chain=${chain}&address=${proj.link}&date=${notedAt}`
            );
            const currentResponse = await fetch(`/api/price/token?chain=${chain}&address=${proj.link}`);
            
            const callData = await callResponse.json();
            const currentData = await currentResponse.json();
            
            fetchedCallPrice = callData.price;
            fetchedCurrentPrice = currentData.price;
          }
          
          // Fallback to CoinGecko if contract address didn't return data or isn't available
          if ((!fetchedCallPrice || !fetchedCurrentPrice) && proj.coinGeckoId) {
            const callResponse = await fetch(
              tweetTimestamp
                ? `/api/price/coingecko?id=${proj.coinGeckoId}&timestamp=${tweetTimestamp}`
                : `/api/price/coingecko?id=${proj.coinGeckoId}&date=${notedAt}`
            );
            const currentResponse = await fetch(`/api/price/coingecko?id=${proj.coinGeckoId}`);
            
            const callData = await callResponse.json();
            const currentData = await currentResponse.json();
            
            fetchedCallPrice = callData.price;
            fetchedCurrentPrice = currentData.price;
          }
        } else if (proj.type === 'nft' && proj.link) {
          // NFT floor price
          isNFTType = true;
          const chain = proj.chain || 'ethereum';
          const callResponse = await fetch(`/api/price/nft?chain=${chain}&address=${proj.link}&date=${notedAt}`);
          const currentResponse = await fetch(`/api/price/nft?chain=${chain}&address=${proj.link}`);
          
          const callData = await callResponse.json();
          const currentData = await currentResponse.json();
          
          fetchedCallPrice = callData.floorPrice;
          fetchedCurrentPrice = currentData.floorPrice;
        }
        
        if (fetchedCallPrice && fetchedCurrentPrice && fetchedCallPrice > 0) {
          const perf = ((fetchedCurrentPrice - fetchedCallPrice) / fetchedCallPrice) * 100;
          setPerformance(perf);
          setCallPrice(fetchedCallPrice);
          setCurrentPrice(fetchedCurrentPrice);
          setIsNFT(isNFTType);
        }
      } catch (error) {
        console.error('Error fetching performance:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPerformance();
  }, [signalId, projectHandle, notedAt, tweetTimestamp, project]);

  if (!project) {
    return null;
  }

  if (loading) {
    return (
      <div class="glass-subtle rounded-xl p-3 border border-white/10">
        <div class="text-xs text-gray-400">Loading performance...</div>
      </div>
    );
  }

  if (performance === null || callPrice === null || currentPrice === null) {
    return (
      <div class="glass-subtle rounded-xl p-3 border border-white/10">
        <div class="text-xs text-gray-400">Performance data unavailable</div>
      </div>
    );
  }

  const isPositive = performance >= 0;
  const isCorrect = (sentiment === 'bullish' && isPositive) || (sentiment === 'bearish' && !isPositive);
  
  // Format price based on whether it's an NFT or token
  const formatPrice = (price: number) => {
    if (isNFT) {
      return `${price.toFixed(4)} ETH`;
    }
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    }
    return `$${price.toFixed(6)}`;
  };
  
  return (
    <div class={`rounded-xl p-3 border-2 backdrop-blur-sm ${isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
      {/* Price Information */}
      <div class="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
        <div>
          <div class="text-xs text-gray-400 mb-0.5">Post Price</div>
          <div class="text-sm font-semibold text-white">{formatPrice(callPrice)}</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-gray-400 mb-0.5">Current Price</div>
          <div class="text-sm font-semibold text-white">{formatPrice(currentPrice)}</div>
        </div>
      </div>
      
      {/* Performance Metrics */}
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs text-gray-400 font-medium mb-1">Performance</div>
          <div class={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '↗' : '↘'} {Math.abs(performance).toFixed(1)}%
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-gray-400 mb-1">Accuracy</div>
          <div class={`text-xl font-semibold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {isCorrect ? '✅' : '❌'}
          </div>
        </div>
      </div>
    </div>
  );
}

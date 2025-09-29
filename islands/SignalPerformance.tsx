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
    chain?: "ethereum" | "base" | "solana";
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
          if (proj.link) {
            // Contract address-based token
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
          } else if (proj.coinGeckoId) {
            // CoinGecko ID-based token (Layer 1s)
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
      <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div class="text-xs text-gray-500">Loading performance...</div>
      </div>
    );
  }

  if (performance === null || callPrice === null || currentPrice === null) {
    return (
      <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div class="text-xs text-gray-500">Performance data unavailable</div>
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
    <div class={`rounded-lg p-3 border-2 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      {/* Price Information */}
      <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
        <div>
          <div class="text-xs text-gray-500 mb-0.5">Post Price</div>
          <div class="text-sm font-semibold text-gray-900">{formatPrice(callPrice)}</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-gray-500 mb-0.5">Current Price</div>
          <div class="text-sm font-semibold text-gray-900">{formatPrice(currentPrice)}</div>
        </div>
      </div>
      
      {/* Performance Metrics */}
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs text-gray-600 font-medium mb-1">Performance</div>
          <div class={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '↗' : '↘'} {Math.abs(performance).toFixed(1)}%
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-gray-600 mb-1">Accuracy</div>
          <div class={`text-xl font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
            {isCorrect ? '✅' : '❌'}
          </div>
        </div>
      </div>
    </div>
  );
}

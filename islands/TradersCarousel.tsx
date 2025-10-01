import { useState, useEffect } from "preact/hooks";
import { getScoreColor, getScoreLevelName } from "../utils/ethos-score.ts";

interface EthosUser {
  displayName: string;
  username?: string | null;
  avatarUrl: string;
  score: number;
  status?: string;
}

interface Signal {
  twitterUsername: string;
  sentiment: "bullish" | "bearish";
}

interface TraderWithStats {
  username: string;
  user: EthosUser;
  signalCount: number;
  bullishCount: number;
  bearishCount: number;
}

interface Props {
  traders: TraderWithStats[];
}

export default function TradersCarousel({ traders }: Props) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [direction, setDirection] = useState<'right' | 'left'>('right');
  const cardWidth = 240; // Width of each card + gap
  const maxScroll = Math.max(0, (traders.length - 5) * cardWidth);

  // Auto-rotate carousel
  useEffect(() => {
    if (traders.length <= 5) return; // Don't auto-rotate if all fit on screen
    
    const interval = setInterval(() => {
      setScrollPosition(prev => {
        // Scroll right
        if (direction === 'right') {
          const next = prev + cardWidth;
          if (next >= maxScroll) {
            setDirection('left');
            return maxScroll;
          }
          return next;
        } 
        // Scroll left
        else {
          const next = prev - cardWidth;
          if (next <= 0) {
            setDirection('right');
            return 0;
          }
          return next;
        }
      });
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [traders.length, maxScroll, cardWidth, direction]);

  const scrollLeft = () => {
    setScrollPosition(prev => Math.max(0, prev - cardWidth * 2));
  };

  const scrollRight = () => {
    setScrollPosition(prev => Math.min(maxScroll, prev + cardWidth * 2));
  };

  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = scrollPosition < maxScroll;

  return (
    <div class="relative">
      {/* Left Arrow */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={scrollLeft}
          class="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full glass-strong border border-white/20 flex items-center justify-center hover:scale-110 transition-all duration-300 shadow-xl -ml-5"
          aria-label="Scroll left"
        >
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Carousel Container */}
      <div class="overflow-hidden">
        <div 
          class="flex gap-4 transition-transform duration-500 ease-out"
          style={`transform: translateX(-${scrollPosition}px)`}
        >
          {traders.map(({ username, user, signalCount }) => {
            const scoreColor = getScoreColor(user.score);
            const credibilityLevel = getScoreLevelName(user.score);
            
            return (
              <a 
                key={username}
                href={`/profile/${username}`}
                class="flex-shrink-0 w-56 glass-subtle hover:glass border border-white/10 rounded-2xl p-5 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20 group"
              >
                <div class="flex flex-col items-center text-center">
                  <div class="relative mb-3">
                    <img 
                      src={user.avatarUrl} 
                      alt={user.displayName}
                      class="w-20 h-20 rounded-full ring-4 shadow-xl"
                      style={`border-color: ${scoreColor}; box-shadow: 0 0 16px ${scoreColor}50, 0 8px 24px rgba(0,0,0,0.4);`}
                    />
                  </div>
                  <div class="font-semibold text-white text-base truncate w-full mb-1">
                    {user.displayName}
                  </div>
                  <div class="text-xs text-gray-400 truncate w-full mb-3">
                    @{username}
                  </div>
                  
                  {/* Ethos Score */}
                  <div class="flex flex-col items-center gap-2 mb-2">
                    <div class="text-3xl font-bold" style={`color: ${scoreColor}`}>
                      {user.score}
                    </div>
                    <div 
                      class="px-3 py-1 rounded-full text-xs font-semibold"
                      style={`background-color: ${scoreColor}20; color: ${scoreColor}; border: 1px solid ${scoreColor}50;`}
                    >
                      {credibilityLevel}
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-2 text-xs text-gray-400">
                    <span>{signalCount} {signalCount === 1 ? 'signal' : 'signals'}</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Right Arrow */}
      {canScrollRight && (
        <button
          type="button"
          onClick={scrollRight}
          class="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full glass-strong border border-white/20 flex items-center justify-center hover:scale-110 transition-all duration-300 shadow-xl -mr-5"
          aria-label="Scroll right"
        >
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}


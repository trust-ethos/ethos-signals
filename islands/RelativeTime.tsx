import { useEffect, useState, useMemo } from "preact/hooks";

interface Props {
  timestamp: string; // ISO string or date string
}

export default function RelativeTime({ timestamp }: Props) {
  // Calculate absolute time immediately
  const absoluteTime = useMemo(() => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }, [timestamp]);

  const [relativeTime, setRelativeTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30);
      const diffYears = Math.floor(diffDays / 365);

      let relative = "";
      if (diffSeconds < 60) {
        relative = "just now";
      } else if (diffMinutes < 60) {
        relative = `${diffMinutes}m ago`;
      } else if (diffHours < 24) {
        relative = `${diffHours}h ago`;
      } else if (diffDays < 7) {
        relative = `${diffDays}d ago`;
      } else if (diffWeeks < 5) {
        relative = `${diffWeeks}w ago`;
      } else if (diffMonths < 12) {
        relative = `${diffMonths}mo ago`;
      } else {
        relative = `${diffYears}y ago`;
      }

      setRelativeTime(relative);
    };

    updateTime();
    // Update every minute to keep it fresh
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <span 
      class="text-xs text-gray-500 whitespace-nowrap cursor-help" 
      title={absoluteTime}
    >
      {relativeTime || "..."}
    </span>
  );
}

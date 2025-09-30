// Ethos Score Utilities
// Score levels and colors based on official Ethos Network scoring

export interface ScoreLevel {
  name: string;
  min: number;
  max: number;
  color: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

export const SCORE_LEVELS: ScoreLevel[] = [
  { name: "Untrusted", min: -Infinity, max: 800, color: "#b72b38", badgeVariant: "destructive" },
  { name: "Questionable", min: 800, max: 1200, color: "#C29010", badgeVariant: "warning" },
  { name: "Neutral", min: 1200, max: 1400, color: "#c1c0b6", badgeVariant: "secondary" },
  { name: "Known", min: 1400, max: 1600, color: "#7C8DA8", badgeVariant: "default" },
  { name: "Established", min: 1600, max: 1800, color: "#4E86B9", badgeVariant: "default" },
  { name: "Reputable", min: 1800, max: 2000, color: "#2E7BC3", badgeVariant: "default" },
  { name: "Exemplary", min: 2000, max: 2200, color: "#427B56", badgeVariant: "success" },
  { name: "Distinguished", min: 2200, max: 2400, color: "#127f31", badgeVariant: "success" },
  { name: "Revered", min: 2400, max: 2600, color: "#836DA6", badgeVariant: "success" },
  { name: "Renowned", min: 2600, max: Infinity, color: "#7A5EA0", badgeVariant: "success" },
];

export function getScoreLevel(score: number): ScoreLevel {
  return SCORE_LEVELS.find(level => score >= level.min && score < level.max) || SCORE_LEVELS[0];
}

export function getScoreLevelName(score: number): string {
  return getScoreLevel(score).name;
}

export function getScoreColor(score: number): string {
  return getScoreLevel(score).color;
}

export function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  return (getScoreLevel(score).badgeVariant || "default") as "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

// Get CSS for avatar border based on score
export function getAvatarBorderStyle(score: number): string {
  const color = getScoreColor(score);
  return `border: 3px solid ${color}; box-shadow: 0 0 12px ${color}40;`;
}

// Get Tailwind classes for avatar border (for use in JSX)
export function getAvatarBorderClasses(score: number): string {
  const level = getScoreLevel(score);
  
  // Map score levels to Tailwind border colors
  const borderColorMap: Record<string, string> = {
    "Untrusted": "border-[#b72b38]",
    "Questionable": "border-[#C29010]",
    "Neutral": "border-[#c1c0b6]",
    "Known": "border-[#7C8DA8]",
    "Established": "border-[#4E86B9]",
    "Reputable": "border-[#2E7BC3]",
    "Exemplary": "border-[#427B56]",
    "Distinguished": "border-[#127f31]",
    "Revered": "border-[#836DA6]",
    "Renowned": "border-[#7A5EA0]",
  };
  
  return `border-4 ${borderColorMap[level.name] || "border-gray-500"}`;
}

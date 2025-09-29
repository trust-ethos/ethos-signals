import { JSX } from "preact";

interface BadgeProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
  children: JSX.Element | JSX.Element[] | string | string[];
}

const variants = {
  default: "bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border-blue-500/30 shadow-lg shadow-blue-500/20",
  secondary: "bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-300 border-gray-500/30",
  destructive: "bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 border-red-500/30 shadow-lg shadow-red-500/20",
  outline: "text-gray-300 border-gray-600/50 bg-gray-800/30",
  success: "bg-gradient-to-r from-green-500/20 to-emerald-600/20 text-green-300 border-green-500/30 shadow-lg shadow-green-500/20",
  warning: "bg-gradient-to-r from-yellow-500/20 to-amber-600/20 text-yellow-300 border-yellow-500/30 shadow-lg shadow-yellow-500/20",
};

export function Badge({ variant = "default", class: className = "", children, ...props }: BadgeProps) {
  return (
    <div
      class={`
        inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold 
        transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black
        backdrop-blur-sm
        ${variants[variant]} ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
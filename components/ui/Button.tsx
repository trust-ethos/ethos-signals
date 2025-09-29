import { JSX } from "preact";

interface ButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: JSX.Element | JSX.Element[] | string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

const variants = {
  default: "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50",
  secondary: "bg-gradient-to-r from-gray-700 to-gray-600 text-gray-100 hover:from-gray-600 hover:to-gray-500 shadow-lg shadow-gray-700/30",
  outline: "border-2 border-blue-500/50 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400/70 backdrop-blur-sm",
  ghost: "hover:bg-white/10 text-gray-300 hover:text-white backdrop-blur-sm",
};

const sizes = {
  sm: "h-9 rounded-xl px-4 text-xs",
  md: "h-11 px-6 py-2 text-sm rounded-xl",
  lg: "h-13 rounded-xl px-8 text-base",
};

export function Button({ 
  variant = "default", 
  size = "md", 
  class: className = "", 
  children, 
  disabled = false,
  type = "button",
  ...props 
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      class={`
        inline-flex items-center justify-center whitespace-nowrap font-semibold 
        ring-offset-black transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 
        focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none 
        disabled:opacity-40 disabled:grayscale hover:scale-105 active:scale-95
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
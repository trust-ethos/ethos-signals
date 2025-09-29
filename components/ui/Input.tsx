import { JSX } from "preact";

interface InputProps extends JSX.HTMLAttributes<HTMLInputElement> {
  type?: string;
  placeholder?: string;
  value?: string;
  disabled?: boolean;
}

export function Input({ 
  class: className = "", 
  type = "text", 
  disabled = false,
  ...props 
}: InputProps) {
  return (
    <input
      type={type}
      disabled={disabled}
      class={`
        flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white
        backdrop-blur-sm
        ring-offset-black file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white
        placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 
        focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
        disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale
        transition-all duration-300 hover:border-white/20 hover:bg-white/10
        ${className}
      `}
      {...props}
    />
  );
}
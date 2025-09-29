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
        flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm 
        ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium 
        placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 
        focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed 
        disabled:opacity-50 ${className}
      `}
      {...props}
    />
  );
}




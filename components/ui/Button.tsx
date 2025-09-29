import { JSX } from "preact";

interface ButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: JSX.Element | JSX.Element[] | string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

const variants = {
  default: "bg-gray-900 text-gray-50 hover:bg-gray-900/90",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-100/80",
  outline: "border border-gray-200 bg-white hover:bg-gray-100 hover:text-gray-900",
  ghost: "hover:bg-gray-100 hover:text-gray-900",
};

const sizes = {
  sm: "h-9 rounded-md px-3 text-xs",
  md: "h-10 px-4 py-2 text-sm",
  lg: "h-11 rounded-md px-8 text-base",
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
        inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium 
        ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 
        focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none 
        disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

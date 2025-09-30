import { JSX } from "preact";

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element | JSX.Element[] | string;
}

export function Card({ children, class: className = "", ...props }: CardProps) {
  return (
    <div
      class={`rounded-2xl glass shadow-xl shadow-black/20 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, class: className = "", ...props }: CardProps) {
  return (
    <div class={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, class: className = "", ...props }: CardProps) {
  return (
    <h3 class={`text-2xl font-semibold leading-none tracking-tight text-white ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, class: className = "", ...props }: CardProps) {
  return (
    <p class={`text-sm text-gray-400 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, class: className = "", ...props }: CardProps) {
  return <div class={`p-6 ${className}`} {...props}>{children}</div>;
}
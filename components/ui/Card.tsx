import { JSX } from "preact";

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element | JSX.Element[] | string;
}

export function Card({ children, class: className = "", ...props }: CardProps) {
  return (
    <div
      class={`rounded-xl border border-gray-200 bg-white text-gray-950 shadow-sm ${className}`}
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
    <h3 class={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, class: className = "", ...props }: CardProps) {
  return (
    <p class={`text-sm text-gray-500 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, class: className = "", ...props }: CardProps) {
  return <div class={`p-6 pt-0 ${className}`} {...props}>{children}</div>;
}

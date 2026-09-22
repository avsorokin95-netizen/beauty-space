import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "../lib/utils";
import { useContacts } from "../hooks/useContacts";

export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
export function BookingLink({
  className,
  children = "Записатися онлайн",
  href,
}: {
  className?: string;
  children?: ReactNode;
  href?: string;
}) {
  const studio = useContacts();
  return (
    <a
      className={cn("button", className)}
      data-analytics="booking" href={href ?? studio.direct}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={18} aria-hidden="true" />
    </a>
  );
}
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("eyebrow", className)}>
      <span aria-hidden="true" />
      {children}
    </p>
  );
}

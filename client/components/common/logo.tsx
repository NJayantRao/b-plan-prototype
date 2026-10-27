import { HeartPulse } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";

export function Logo({
  href = "/",
  inverted = false,
  className,
}: {
  href?: string;
  /** White wordmark for dark backgrounds (the sidebar). */
  inverted?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <HeartPulse className="size-[18px]" aria-hidden />
      </span>
      <span className={cn("text-[15px]", inverted ? "text-white" : "text-foreground")}>
        Magadh Ventures
      </span>
    </Link>
  );
}

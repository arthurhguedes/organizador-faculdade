import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "muted" | "danger" | "warning";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

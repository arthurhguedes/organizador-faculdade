export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton-rows">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="skeleton-row" />
      ))}
    </div>
  );
}

export function SkeletonCards({ cards = 3 }: { cards?: number }) {
  return (
    <div className="skeleton-cards">
      {Array.from({ length: cards }).map((_, i) => (
        <Skeleton key={i} className="skeleton-card" />
      ))}
    </div>
  );
}

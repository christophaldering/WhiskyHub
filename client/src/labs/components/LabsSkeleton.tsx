export function SkeletonLine({ width = "100%", height = 12 }: { width?: string | number; height?: number }) {
  return (
    <div
      className="labs-skeleton labs-skeleton-text"
      style={{ width, height, borderRadius: height / 2 }}
    />
  );
}

export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return (
    <div
      className="labs-skeleton labs-skeleton-circle"
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  );
}

export function SkeletonCard({ lines = 3, showAvatar = false }: { lines?: number; showAvatar?: boolean }) {
  return (
    <div className="labs-skeleton-card labs-fade-in">
      <div className="flex items-start gap-3">
        {showAvatar && <SkeletonCircle size={44} />}
        <div className="flex-1 space-y-3">
          <SkeletonLine width="55%" height={16} />
          {Array.from({ length: lines }).map((_, i) => (
            <SkeletonLine
              key={i}
              width={i === lines - 1 ? "40%" : `${85 - i * 10}%`}
              height={11}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3, showAvatar = false }: { count?: number; showAvatar?: boolean }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} showAvatar={showAvatar} />
      ))}
    </div>
  );
}

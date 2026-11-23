interface BoxProps {
  className?: string;
}

export function SkeletonBox({ className = "" }: BoxProps) {
  return <div className={`animate-pulse rounded bg-haze/40 ${className}`} aria-hidden="true" />;
}

export function MediaRowSkeleton({ count = 6, inset = false }: { count?: number; inset?: boolean }) {
  return (
    <ul
      className={`mt-4 flex gap-4 overflow-hidden pb-2 ${inset ? "" : "mx-auto max-w-7xl px-4 sm:px-6"}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="w-36 shrink-0 sm:w-44 lg:w-48">
          <SkeletonBox className="aspect-[2/3] w-full rounded-card" />
          <SkeletonBox className="mt-2.5 h-4 w-3/4" />
          <SkeletonBox className="mt-1.5 h-3 w-1/2" />
        </li>
      ))}
    </ul>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <ul
      className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <SkeletonBox className="aspect-[2/3] w-full rounded-card" />
          <SkeletonBox className="mt-2.5 h-4 w-3/4" />
          <SkeletonBox className="mt-1.5 h-3 w-1/2" />
        </li>
      ))}
    </ul>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative flex min-h-[560px] items-end overflow-hidden bg-dusk sm:min-h-[640px]" aria-hidden="true">
      <div className="mx-auto w-full max-w-7xl px-4 pb-14 pt-24 sm:px-6 sm:pb-20">
        <SkeletonBox className="h-4 w-64 rounded" />
        <SkeletonBox className="mt-4 h-12 w-3/4 rounded sm:h-16" />
        <SkeletonBox className="mt-4 h-4 w-full rounded" />
        <SkeletonBox className="mt-2 h-4 w-11/12 rounded" />
        <SkeletonBox className="mt-2 h-4 w-4/5 rounded" />
        <SkeletonBox className="mt-7 h-11 w-52 rounded-full" />
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6">
      <div className="grid gap-8 md:grid-cols-[260px_1fr]">
        <SkeletonBox className="mx-auto aspect-[2/3] w-48 rounded-card md:mx-0 md:w-full" />
        <div>
          <SkeletonBox className="h-8 w-2/3 rounded" />
          <SkeletonBox className="mt-4 h-4 w-1/3 rounded" />
          <SkeletonBox className="mt-6 h-4 w-full rounded" />
          <SkeletonBox className="mt-2 h-4 w-11/12 rounded" />
          <SkeletonBox className="mt-2 h-4 w-4/5 rounded" />
          <SkeletonBox className="mt-8 h-11 w-44 rounded-full" />
        </div>
      </div>
    </div>
  );
}

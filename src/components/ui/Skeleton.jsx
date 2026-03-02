import clsx from 'clsx';

function SkeletonBase({ className }) {
  return (
    <div
      className={clsx('animate-pulse rounded bg-gray-200 dark:bg-gray-700', className)}
    />
  );
}

export default function Skeleton({ variant = 'text', count = 3, className }) {
  if (variant === 'card') {
    return <SkeletonBase className={clsx('h-24 w-full rounded-xl', className)} />;
  }

  if (variant === 'list') {
    return (
      <div className={clsx('space-y-3', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBase className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonBase className="h-4 w-3/4" />
              <SkeletonBase className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <SkeletonBase className={clsx('h-4 w-full', className)} />;
}

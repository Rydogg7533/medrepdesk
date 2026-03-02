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

  if (variant === 'detail') {
    return (
      <div className={clsx('space-y-4', className)}>
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <SkeletonBase className="mb-3 h-5 w-1/3" />
          <div className="space-y-2">
            <SkeletonBase className="h-4 w-full" />
            <SkeletonBase className="h-4 w-5/6" />
            <SkeletonBase className="h-4 w-2/3" />
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <SkeletonBase className="mb-3 h-5 w-1/4" />
          <div className="grid grid-cols-2 gap-3">
            <SkeletonBase className="h-16 rounded-lg" />
            <SkeletonBase className="h-16 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className={clsx('space-y-4', className)}>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800">
              <SkeletonBase className="mb-2 h-3 w-1/2" />
              <SkeletonBase className="h-6 w-2/3" />
            </div>
          ))}
        </div>
        <SkeletonBase className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return <SkeletonBase className={clsx('h-4 w-full', className)} />;
}

export { SkeletonBase };

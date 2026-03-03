import Button from '@/components/ui/Button';

export default function DuplicateBanner({ match, onReactivate, reactivating }) {
  if (!match) return null;

  const { record, isActive } = match;
  const displayName = record.name || record.full_name;

  if (isActive) {
    return (
      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-700 dark:text-amber-400">
        <span className="font-medium">&ldquo;{displayName}&rdquo;</span> already exists in your active records.
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
      <p className="text-sm text-blue-700 dark:text-blue-400">
        <span className="font-medium">&ldquo;{displayName}&rdquo;</span> already exists but is inactive. Reactivate it?
      </p>
      <Button
        type="button"
        size="sm"
        className="mt-2"
        loading={reactivating}
        onClick={() => onReactivate(record)}
      >
        Reactivate
      </Button>
    </div>
  );
}

import Button from './Button';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && <Icon className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />}
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button className="mt-4" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

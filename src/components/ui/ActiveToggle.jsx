import clsx from 'clsx';

export default function ActiveToggle({ isActive, onToggle, size = 'sm' }) {
  const sizes = {
    sm: { track: 'h-5 w-9', thumb: 'h-3.5 w-3.5', translate: 'translate-x-4' },
    md: { track: 'h-6 w-11', thumb: 'h-4.5 w-4.5', translate: 'translate-x-5' },
  };
  const s = sizes[size] || sizes.sm;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(!isActive);
      }}
      className={clsx(
        'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-800/20',
        s.track,
        isActive ? 'bg-brand-800' : 'bg-gray-300 dark:bg-gray-600'
      )}
    >
      <span
        className={clsx(
          'pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          s.thumb,
          isActive ? s.translate : 'translate-x-0'
        )}
      />
    </button>
  );
}

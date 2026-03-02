import { forwardRef } from 'react';
import clsx from 'clsx';

const Input = forwardRef(function Input(
  { label, error, type = 'text', className, ...rest },
  ref
) {
  const isEmpty = rest.value === '' || rest.value == null;
  const isDateOrTime = type === 'date' || type === 'time';

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={clsx(
          'min-h-touch w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20',
          'dark:bg-gray-700 dark:text-white',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-300 dark:border-gray-600',
          isDateOrTime && isEmpty && 'text-gray-400 dark:text-gray-500',
          className
        )}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

export default Input;

import { forwardRef } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

const Input = forwardRef(function Input(
  { label, error, type = 'text', className, onChange, ...rest },
  ref
) {
  const isEmpty = rest.value === '' || rest.value == null;
  const isDateOrTime = type === 'date' || type === 'time';
  const showClear = isDateOrTime && !isEmpty;

  function handleClear() {
    if (onChange) {
      onChange({ target: { name: rest.name, value: '' } });
    }
  }

  return (
    <div className={clsx('w-full', showClear && 'relative')}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        onChange={onChange}
        className={clsx(
          'min-h-touch w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20',
          'dark:bg-gray-700 dark:text-white',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-300 dark:border-gray-600',
          isDateOrTime && isEmpty && 'text-gray-400 dark:text-gray-500',
          showClear && 'pr-8',
          className
        )}
        {...rest}
      />
      {showClear && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 bottom-2.5 rounded-full p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

export default Input;

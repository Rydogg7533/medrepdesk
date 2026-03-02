import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Search...',
  label,
  error,
  onAddNew,
  displayKey = 'label',
  valueKey = 'value',
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedOption = options.find((o) => o[valueKey] === value);
  const filtered = query
    ? options.filter((o) =>
        o[displayKey].toLowerCase().includes(query.toLowerCase())
      )
    : options;

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(opt) {
    onChange(opt[valueKey]);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        type="text"
        className={clsx(
          'min-h-touch w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors',
          'placeholder:text-gray-400',
          'focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20',
          error ? 'border-red-500' : 'border-gray-300'
        )}
        placeholder={selectedOption ? selectedOption[displayKey] : placeholder}
        value={open ? query : selectedOption ? selectedOption[displayKey] : ''}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onChange={(e) => setQuery(e.target.value)}
      />

      {open && (
        <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 && (
            <div className="px-3 py-2.5 text-sm text-gray-400">No results</div>
          )}
          {filtered.map((opt) => (
            <button
              key={opt[valueKey]}
              type="button"
              className="min-h-touch w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50"
              onClick={() => handleSelect(opt)}
            >
              {opt[displayKey]}
            </button>
          ))}
          {onAddNew && (
            <button
              type="button"
              className="min-h-touch w-full border-t border-gray-100 px-3 py-2.5 text-left text-sm font-medium text-brand-800 hover:bg-gray-50"
              onClick={() => {
                setOpen(false);
                onAddNew();
              }}
            >
              + Add new
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

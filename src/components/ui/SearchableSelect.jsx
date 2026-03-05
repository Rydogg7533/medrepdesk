import { useState, useRef, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { findFuzzyDuplicate } from '@/utils/fuzzyMatch';

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
  allRecords,
  allRecordsNameField,
  // Async mode props
  onSearch,
  isSearching = false,
  minChars = 0,
  initialLabel,
  initialOptions = [],
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const isAsync = !!onSearch;

  const selectedOption = options.find((o) => o[valueKey] === value)
    || initialOptions.find((o) => o[valueKey] === value);
  const displayLabel = selectedOption
    ? selectedOption[displayKey]
    : initialLabel || '';

  // In async mode, don't filter client-side — options come pre-filtered from server
  const filtered = isAsync
    ? options
    : query
      ? options.filter((o) =>
          o[displayKey].toLowerCase().includes(query.toLowerCase())
        )
      : options;

  // Fuzzy suggestion: only in sync mode
  const fuzzySuggestion = useMemo(() => {
    if (isAsync || !allRecords || !query || query.length < 2) return null;
    const match = findFuzzyDuplicate(query, allRecords, allRecordsNameField || 'name');
    if (!match) return null;
    const alreadyVisible = filtered.some(
      (o) => o[valueKey] === match.record.id
    );
    if (alreadyVisible) return null;
    return match.record;
  }, [isAsync, query, allRecords, allRecordsNameField, filtered, valueKey]);

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

  function handleSelectFuzzy(record) {
    onChange(record.id);
    setQuery('');
    setOpen(false);
  }

  function handleInputChange(e) {
    const val = e.target.value;
    setQuery(val);
    if (isAsync && val.length >= minChars) {
      onSearch(val);
    }
  }

  // Filter initialOptions by query when user has typed but hasn't hit minChars yet
  const filteredInitialOptions = useMemo(() => {
    if (!isAsync || !initialOptions.length) return [];
    if (query.length === 0) return initialOptions;
    if (query.length < minChars) {
      const q = query.toLowerCase();
      return initialOptions.filter((o) => o[displayKey].toLowerCase().includes(q));
    }
    return [];
  }, [isAsync, initialOptions, query, minChars, displayKey]);

  const hasInitialOptions = filteredInitialOptions.length > 0;
  const showMinCharsPrompt = isAsync && open && query.length < minChars && query.length > 0 && !hasInitialOptions;
  const showEmptyPrompt = isAsync && open && query.length === 0 && minChars > 0 && !hasInitialOptions;
  const showSpinner = isAsync && isSearching && query.length >= minChars;
  const showResults = isAsync ? query.length >= minChars && !isSearching : true;
  const showInitialOptions = isAsync && open && query.length < minChars && hasInitialOptions;

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        type="text"
        className={clsx(
          'min-h-touch w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20',
          'dark:bg-gray-700 dark:text-white',
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
        )}
        placeholder={displayLabel || placeholder}
        value={open ? query : displayLabel}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onChange={handleInputChange}
      />

      {open && (
        <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
          {/* Min chars prompt */}
          {(showMinCharsPrompt || showEmptyPrompt) && (
            <div className="px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500">
              Type at least {minChars} characters to search...
            </div>
          )}

          {/* Initial options (private records shown before minChars) */}
          {showInitialOptions && filteredInitialOptions.map((opt) => (
            <button
              key={opt[valueKey]}
              type="button"
              className="min-h-touch w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-600"
              onClick={() => handleSelect(opt)}
            >
              <div className="flex items-center gap-2">
                <span>{opt[displayKey]}</span>
              </div>
              {opt.subtitle && (
                <p className="text-xs text-gray-400 dark:text-gray-500">{opt.subtitle}</p>
              )}
            </button>
          ))}

          {/* Hint to type more for global search when initial options are shown */}
          {showInitialOptions && minChars > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-600 px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
              Type {minChars}+ characters to search all records
            </div>
          )}

          {/* Loading spinner */}
          {showSpinner && (
            <div className="flex items-center gap-2 px-3 py-2.5">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-800 dark:border-gray-500 dark:border-t-brand-400" />
              <span className="text-sm text-gray-400 dark:text-gray-500">Searching...</span>
            </div>
          )}

          {/* Fuzzy suggestion (sync mode only) */}
          {!isAsync && fuzzySuggestion && (
            <button
              type="button"
              className="min-h-touch w-full border-b border-amber-100 bg-amber-50 px-3 py-2.5 text-left text-sm dark:border-amber-800 dark:bg-amber-900/20"
              onClick={() => handleSelectFuzzy(fuzzySuggestion)}
            >
              <span className="text-amber-700 dark:text-amber-400">Did you mean </span>
              <span className="font-medium text-amber-800 dark:text-amber-300">
                {fuzzySuggestion[allRecordsNameField || 'name'] || fuzzySuggestion.full_name}
              </span>
              <span className="text-amber-700 dark:text-amber-400">?</span>
            </button>
          )}

          {/* No results */}
          {showResults && filtered.length === 0 && !fuzzySuggestion && (
            <div className="px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500">No results</div>
          )}

          {/* Results */}
          {showResults && filtered.map((opt) => (
            <button
              key={opt[valueKey]}
              type="button"
              className="min-h-touch w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-600"
              onClick={() => handleSelect(opt)}
            >
              <div className="flex items-center gap-2">
                <span>{opt[displayKey]}</span>
                {opt.is_global && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:bg-gray-600 dark:text-gray-400">
                    Global
                  </span>
                )}
              </div>
              {opt.subtitle && (
                <p className="text-xs text-gray-400 dark:text-gray-500">{opt.subtitle}</p>
              )}
            </button>
          ))}

          {onAddNew && (
            <button
              type="button"
              className="min-h-touch w-full border-t border-gray-100 px-3 py-2.5 text-left text-sm font-medium text-brand-800 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-600"
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

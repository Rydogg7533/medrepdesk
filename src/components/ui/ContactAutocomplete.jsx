import { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function ContactAutocomplete({
  label,
  value = '',
  onSelect,
  onTextChange,
  facilityId,
  distributorId,
  manufacturerId,
  placeholder = 'Search contacts...',
  error,
}) {
  const { account } = useAuth();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Click-outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchContacts = useCallback(
    async (searchQuery) => {
      if (!searchQuery || searchQuery.length < 2 || !account?.id) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        let q = supabase
          .from('contacts')
          .select('*, facility:facilities(name), distributor:distributors(name), manufacturer:manufacturers(name)')
          .eq('account_id', account.id)
          .ilike('full_name', `%${searchQuery}%`)
          .order('full_name')
          .limit(10);

        if (facilityId) q = q.eq('facility_id', facilityId);
        if (distributorId) q = q.eq('distributor_id', distributorId);
        if (manufacturerId) q = q.eq('manufacturer_id', manufacturerId);

        const { data, error: fetchError } = await q;
        if (!fetchError) setResults(data || []);
      } catch {
        // ignore search errors
      } finally {
        setLoading(false);
      }
    },
    [account?.id, facilityId, distributorId, manufacturerId],
  );

  function handleInputChange(e) {
    const text = e.target.value;
    setQuery(text);
    setOpen(true);
    onTextChange?.(text);

    // Debounce search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchContacts(text);
    }, 300);
  }

  function handleSelect(contact) {
    setQuery(contact.full_name);
    setOpen(false);
    setResults([]);
    onSelect?.(contact);
  }

  function handleFocus() {
    if (query && query.length >= 2) {
      setOpen(true);
      searchContacts(query);
    }
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600',
        )}
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
      />

      {open && (results.length > 0 || loading) && (
        <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
          {loading && results.length === 0 && (
            <div className="px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500">
              Searching...
            </div>
          )}
          {results.map((contact) => (
            <button
              key={contact.id}
              type="button"
              className="min-h-touch w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-600"
              onClick={() => handleSelect(contact)}
            >
              <span className="font-medium">{contact.full_name}</span>
              {contact.role && (
                <span className="ml-1 text-gray-400 dark:text-gray-500">
                  ({contact.role})
                </span>
              )}
              {(contact.facility?.name || contact.distributor?.name || contact.manufacturer?.name) && (
                <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                  — {contact.facility?.name || contact.distributor?.name || contact.manufacturer?.name}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

import { useRef, useEffect, useCallback } from 'react';

const ITEM_HEIGHT = 44;

export default function ScrollWheelPicker({ items, value, onChange, className = '' }) {
  const containerRef = useRef(null);
  const scrollTimeout = useRef(null);
  const isUserScroll = useRef(true);

  const scrollToIndex = useCallback((index) => {
    if (!containerRef.current || index < 0) return;
    isUserScroll.current = false;
    containerRef.current.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: 'instant',
    });
    requestAnimationFrame(() => {
      isUserScroll.current = true;
    });
  }, []);

  // Scroll to value on mount and when value changes externally
  useEffect(() => {
    const idx = items.findIndex((item) => String(item.value) === String(value));
    if (idx >= 0) {
      scrollToIndex(idx);
    } else if (items.length > 0 && (value === '' || value == null)) {
      // Value doesn't match any item — sync form state with visible first item
      onChange(items[0].value);
    }
  }, [value, items, scrollToIndex, onChange]);

  const handleScroll = useCallback(() => {
    if (!isUserScroll.current) return;
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      if (items[clamped] && String(items[clamped].value) !== String(value)) {
        onChange(items[clamped].value);
      }
    }, 100);
  }, [items, value, onChange]);

  useEffect(() => {
    return () => clearTimeout(scrollTimeout.current);
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`snap-y snap-mandatory overflow-y-auto ${className}`}
      style={{
        height: ITEM_HEIGHT,
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none',
      }}
    >
      {items.map((item) => (
        <div
          key={item.value}
          className="flex snap-start items-center justify-center text-sm font-medium text-gray-900 dark:text-white"
          style={{ height: ITEM_HEIGHT }}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}

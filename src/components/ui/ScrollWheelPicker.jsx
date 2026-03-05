import { useRef, useEffect, useCallback } from 'react';

const ITEM_HEIGHT = 36;
const VISIBLE_COUNT = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;
const PADDING = ITEM_HEIGHT * 2;

export default function ScrollWheelPicker({ items, value, onChange, className = '' }) {
  const containerRef = useRef(null);
  const scrollTimeout = useRef(null);
  const isUserScroll = useRef(true);

  const selectedIndex = items.findIndex((item) => String(item.value) === String(value));

  const scrollToIndex = useCallback((index, smooth = false) => {
    if (!containerRef.current || index < 0) return;
    isUserScroll.current = false;
    containerRef.current.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: smooth ? 'smooth' : 'instant',
    });
    // Reset flag after scroll settles
    requestAnimationFrame(() => {
      isUserScroll.current = true;
    });
  }, []);

  // Scroll to value on mount and when value changes externally
  useEffect(() => {
    const idx = items.findIndex((item) => String(item.value) === String(value));
    if (idx >= 0) {
      scrollToIndex(idx);
    }
  }, [value, items, scrollToIndex]);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => clearTimeout(scrollTimeout.current);
  }, []);

  const centerIndex = selectedIndex >= 0 ? selectedIndex : 0;

  return (
    <div className={`relative ${className}`} style={{ height: CONTAINER_HEIGHT }}>
      {/* Center highlight bar */}
      <div
        className="pointer-events-none absolute inset-x-1 z-10 rounded bg-brand-50 dark:bg-brand-800/20"
        style={{ top: PADDING, height: ITEM_HEIGHT }}
      />
      {/* Scroll container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full snap-y snap-mandatory overflow-y-auto"
        style={{
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
        }}
      >
        {/* Top spacer */}
        <div style={{ height: PADDING }} />
        {items.map((item, i) => {
          const distance = Math.abs(i - centerIndex);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.5 : 0.25;
          return (
            <div
              key={item.value}
              className="flex snap-center items-center justify-center text-sm font-medium text-gray-900 dark:text-white"
              style={{ height: ITEM_HEIGHT, opacity }}
            >
              {item.label}
            </div>
          );
        })}
        {/* Bottom spacer */}
        <div style={{ height: PADDING }} />
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import clsx from 'clsx';

export default function BottomSheet({ isOpen, onClose, title, fullHeight, children }) {
  const sheetRef = useRef(null);
  const startY = useRef(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  function handleTouchStart(e) {
    startY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    const diff = e.changedTouches[0].clientY - startY.current;
    if (diff > 80) onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={clsx(
          'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white pb-safe-bottom shadow-xl transition-transform duration-300 ease-out dark:bg-gray-800',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {title && (
          <h2 className="px-5 pb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
        )}

        <div className={clsx('overflow-y-auto px-5 pb-6', fullHeight ? 'max-h-[85vh]' : 'max-h-[70vh]')}>
          {children}
        </div>
      </div>
    </>
  );
}

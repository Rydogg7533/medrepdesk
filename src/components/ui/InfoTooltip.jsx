import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

export default function InfoTooltip({ text, title, className }) {
  const [open, setOpen] = useState(false);
  const [flipLeft, setFlipLeft] = useState(false);
  const wrapperRef = useRef(null);
  const iconRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleToggle() {
    if (!open && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setFlipLeft(rect.left + 280 > window.innerWidth);
    }
    setOpen((prev) => !prev);
  }

  return (
    <span ref={wrapperRef} className={`relative inline-flex items-center ${className || ''}`}>
      <button
        ref={iconRef}
        type="button"
        onClick={handleToggle}
        className="ml-1 inline-flex items-center justify-center rounded-full p-0.5 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
        aria-label="More info"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          className={`absolute top-full z-40 mt-1 max-w-[280px] rounded-lg bg-white p-3 shadow-lg dark:bg-gray-700 ${
            flipLeft ? 'right-0' : 'left-0'
          }`}
        >
          {title && (
            <p className="mb-1 text-xs font-bold text-gray-900 dark:text-gray-100">{title}</p>
          )}
          <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{text}</p>
        </div>
      )}
    </span>
  );
}

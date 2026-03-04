import { useRef, useState, useCallback, useEffect } from 'react';
import { Trash2, ToggleLeft, RotateCcw } from 'lucide-react';

const THRESHOLD = 0.5;
const VELOCITY_THRESHOLD = 0.5;
const RUBBER_BAND = 0.55;

function getActionConfig(mode) {
  if (mode === 'deactivate') return { icon: ToggleLeft, label: 'Deactivate', bg: 'bg-amber-500' };
  if (mode === 'unarchive') return { icon: RotateCcw, label: 'Restore', bg: 'bg-brand-800' };
  return { icon: Trash2, label: 'Delete', bg: 'bg-red-500' };
}

export default function SwipeableRow({ children, onSwipe, mode = 'delete', disabled = false }) {
  const rowRef = useRef(null);
  const innerRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const dragging = useRef(false);
  const directionLocked = useRef(false);
  const isHorizontal = useRef(false);
  const startTime = useRef(0);
  const rafId = useRef(null);
  const [dismissed, setDismissed] = useState(false);
  const [collapsing, setCollapsing] = useState(false);
  const rowWidth = useRef(0);

  const config = getActionConfig(mode);
  const Icon = config.icon;

  const applyTransform = useCallback((x) => {
    const el = innerRef.current;
    const bg = rowRef.current?.querySelector('[data-swipe-bg]');
    if (!el) return;
    el.style.transform = `translateX(${x}px)`;
    if (bg) {
      bg.style.opacity = Math.min(1, Math.abs(x) / (rowWidth.current * 0.3));
    }
  }, []);

  const resetPosition = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
    applyTransform(0);
    const cleanup = () => { el.style.transition = ''; };
    el.addEventListener('transitionend', cleanup, { once: true });
  }, [applyTransform]);

  const dismiss = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    const width = rowWidth.current;
    el.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)';
    applyTransform(-width);
    setDismissed(true);

    el.addEventListener('transitionend', () => {
      setCollapsing(true);
    }, { once: true });
  }, [applyTransform]);

  useEffect(() => {
    if (!collapsing) return;
    const row = rowRef.current;
    if (!row) return;
    const h = row.offsetHeight;
    row.style.height = `${h}px`;
    row.style.transition = 'height 0.25s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease-out';
    requestAnimationFrame(() => {
      row.style.height = '0px';
      row.style.opacity = '0';
      row.style.overflow = 'hidden';
    });
    const handler = () => { onSwipe?.(); };
    row.addEventListener('transitionend', handler, { once: true });
    return () => row.removeEventListener('transitionend', handler);
  }, [collapsing, onSwipe]);

  const onStart = useCallback((clientX, clientY) => {
    if (disabled || dismissed) return;
    rowWidth.current = rowRef.current?.offsetWidth || 300;
    startX.current = clientX;
    startY.current = clientY;
    currentX.current = 0;
    dragging.current = true;
    directionLocked.current = false;
    isHorizontal.current = false;
    startTime.current = Date.now();
    const el = innerRef.current;
    if (el) el.style.transition = '';
  }, [disabled, dismissed]);

  const onMove = useCallback((clientX, clientY) => {
    if (!dragging.current) return;
    const dx = clientX - startX.current;
    const dy = clientY - startY.current;

    if (!directionLocked.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      directionLocked.current = true;
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      if (!isHorizontal.current) {
        dragging.current = false;
        return;
      }
    }

    if (!isHorizontal.current) return;

    // Only allow swipe left
    let x = Math.min(0, dx);
    // Rubber band effect past threshold
    const absX = Math.abs(x);
    const width = rowWidth.current;
    if (absX > width * THRESHOLD) {
      const over = absX - width * THRESHOLD;
      x = -(width * THRESHOLD + over * RUBBER_BAND);
    }
    currentX.current = x;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => applyTransform(x));
  }, [applyTransform]);

  const onEnd = useCallback(() => {
    if (!dragging.current || !isHorizontal.current) {
      dragging.current = false;
      return;
    }
    dragging.current = false;
    if (rafId.current) cancelAnimationFrame(rafId.current);

    const absX = Math.abs(currentX.current);
    const width = rowWidth.current;
    const elapsed = (Date.now() - startTime.current) / 1000;
    const velocity = absX / elapsed / width;
    const pastThreshold = absX > width * THRESHOLD;
    const fastSwipe = velocity > VELOCITY_THRESHOLD && absX > width * 0.2;

    if (pastThreshold || fastSwipe) {
      dismiss();
    } else {
      resetPosition();
    }
  }, [dismiss, resetPosition]);

  // Touch events
  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    onStart(t.clientX, t.clientY);
  }, [onStart]);

  const handleTouchMove = useCallback((e) => {
    if (!dragging.current) return;
    const t = e.touches[0];
    onMove(t.clientX, t.clientY);
    if (isHorizontal.current && directionLocked.current) {
      e.preventDefault();
    }
  }, [onMove]);

  const handleTouchEnd = useCallback(() => onEnd(), [onEnd]);

  // Mouse events
  const handleMouseDown = useCallback((e) => {
    onStart(e.clientX, e.clientY);
    const moveHandler = (ev) => onMove(ev.clientX, ev.clientY);
    const upHandler = () => {
      onEnd();
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
    };
    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);
  }, [onStart, onMove, onEnd]);

  return (
    <div
      ref={rowRef}
      className="relative overflow-hidden rounded-lg"
      style={{ willChange: collapsing ? 'height, opacity' : 'auto' }}
    >
      {/* Background action area */}
      <div
        data-swipe-bg
        className={`absolute inset-0 flex items-center justify-end ${config.bg} rounded-lg`}
        style={{ opacity: 0 }}
      >
        <div className="flex items-center gap-2 pr-6">
          <Icon className="h-5 w-5 text-white" />
          <span className="text-sm font-medium text-white">{config.label}</span>
        </div>
      </div>

      {/* Foreground content */}
      <div
        ref={innerRef}
        className="relative z-10 bg-white dark:bg-gray-900"
        style={{ willChange: 'transform', touchAction: 'pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {children}
      </div>
    </div>
  );
}

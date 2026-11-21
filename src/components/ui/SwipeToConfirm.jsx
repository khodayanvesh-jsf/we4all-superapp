import React, { useRef, useState } from 'react';

const ARROW = '\u2192';
const CHECK = '\u2713';

export function SwipeToConfirm({
  label = 'Swipe to Confirm',
  confirmedLabel = 'Confirmed',
  disabled = false,
  onConfirm,
}) {
  const trackRef = useRef(null);
  const [ratio, setRatio] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);

  const updateFromClientX = (clientX) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const usable = Math.max(rect.width - 52, 1);
    const next = Math.min(Math.max((clientX - rect.left - 26) / usable, 0), 1);
    setRatio(next);
    return next;
  };

  const handlePointerDown = (e) => {
    if (disabled || done) return;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (!dragging || disabled || done) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = async (e) => {
    if (!dragging) return;
    setDragging(false);
    const finalRatio = updateFromClientX(e.clientX);
    if (finalRatio >= 0.85) {
      setDone(true);
      setRatio(1);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(35);
      }
      try {
        await onConfirm?.();
      } catch {
        setDone(false);
        setRatio(0);
      }
    } else {
      setRatio(0);
    }
  };

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        setDragging(false);
        if (!done) setRatio(0);
      }}
      className={`relative h-12 w-full select-none touch-none rounded-2xl overflow-hidden border transition-colors ${
        done
          ? 'bg-emerald-600 border-emerald-600 text-white'
          : 'bg-emerald-50 border-emerald-300 text-emerald-900'
      } ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
    >
      <div
        className="absolute inset-y-0 left-0 bg-emerald-600/20 transition-all duration-75"
        style={{ width: `${Math.round(ratio * 100)}%` }}
      />
      <div className="relative z-10 flex h-full items-center justify-center text-xs font-bold tracking-wide pointer-events-none">
        {done ? `${CHECK} ${confirmedLabel}` : label}
      </div>
      <div
        className="absolute top-1 left-1 z-20 flex h-10 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-md transition-transform duration-75"
        style={{
          transform: "none",
          left: `calc(4px + ${ratio * 82}%)`,
        }}
      >
        {done ? CHECK : ARROW}
      </div>
    </div>
  );
}
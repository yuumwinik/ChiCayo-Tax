
import React, { useState, useRef, useEffect } from 'react';
import { IconChevronUp, IconStack, IconChevronLeft, IconChevronRight } from './Icons';

interface CardStackProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  threshold?: number;
}

export function CardStack<T extends { id: string }>({ items, renderItem, threshold = 4 }: CardStackProps<T>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoverOpen = useRef(false);

  useEffect(() => {
    if (currentIndex >= items.length) {
      setCurrentIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, currentIndex]);

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  const handleMouseEnterIcon = () => {
    if (isExpanded) return;
    hoverTimeout.current = setTimeout(() => {
      setIsExpanded(true);
      isHoverOpen.current = true;
    }, 1200); // 1.2s hold on the stack button
  };

  const handleMouseLeaveStack = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    if (isExpanded && isHoverOpen.current) {
      setIsExpanded(false);
      isHoverOpen.current = false;
    }
  };

  const handleManualExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setIsExpanded(true);
    isHoverOpen.current = false;
  };

  const handleManualCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(false);
    isHoverOpen.current = false;
    setCurrentIndex(0);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  if (items.length <= threshold) {
    return <div className="flex flex-col gap-4">{items.map(renderItem)}</div>;
  }

  const safeIndex = currentIndex >= items.length ? 0 : currentIndex;
  const activeItem = items[safeIndex];

  return (
    <div className="relative transition-all duration-300" onMouseLeave={handleMouseLeaveStack}>
      {isExpanded ? (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300 relative pt-10 pb-4 z-[100]">
          <button
            onClick={handleManualCollapse}
            className="absolute top-0 left-0 w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors z-[110]"
          >
            <IconChevronUp className="w-3 h-3" /> Show Less
          </button>
          <div className="space-y-4 relative z-[105]">
            {items.map(renderItem)}
          </div>
        </div>
      ) : (
        <div className="relative group min-h-[180px]">
          <div className="absolute top-4 left-0 right-0 h-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm z-0 scale-[0.95] opacity-50 translate-y-2 transition-all"></div>
          <div className="absolute top-8 left-0 right-0 h-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm z-[-1] scale-[0.90] opacity-30 translate-y-4 transition-all"></div>

          {activeItem && (
            <div key={activeItem.id} className="relative z-10 transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-right-8 fade-in duration-300">
              {renderItem(activeItem)}
            </div>
          )}

          <div className="absolute -bottom-5 left-0 right-0 z-20 flex justify-center">
            <div className="flex items-center gap-1 bg-slate-900/90 dark:bg-white/90 backdrop-blur-md p-1 rounded-full shadow-xl">
              <button onClick={handlePrev} className="p-1.5 rounded-full hover:bg-white/20 dark:hover:bg-black/10 text-white dark:text-slate-900 transition-colors"><IconChevronLeft className="w-3 h-3" /></button>
              <button
                onMouseEnter={handleMouseEnterIcon}
                onClick={handleManualExpand}
                className="px-3 py-1 text-xs font-bold text-white dark:text-slate-900 flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              >
                <IconStack className="w-3 h-3" />
                <span>+{items.length - 1}</span>
              </button>
              <button onClick={handleNext} className="p-1.5 rounded-full hover:bg-white/20 dark:hover:bg-black/10 text-white dark:text-slate-900 transition-colors"><IconChevronRight className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

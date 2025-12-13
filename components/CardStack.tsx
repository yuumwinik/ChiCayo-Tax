
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
  
  // Hover "Pop and Peek" Logic refs
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoverOpen = useRef(false);

  // Reset index if items shrink (e.g. item moved to another stage)
  useEffect(() => {
    if (currentIndex >= items.length) {
      setCurrentIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, currentIndex]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (isExpanded) return;
    
    // Start the 1.88s timer to Peek (adjusted from 2.6s)
    hoverTimeout.current = setTimeout(() => {
      setIsExpanded(true);
      isHoverOpen.current = true; // Mark as opened by hover
    }, 1880);
  };

  const handleMouseLeave = () => {
    // 1. Clear any pending open timer if the user leaves before 1.88s
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }

    // 2. If it was opened by hover, spring back up (collapse) when leaving
    if (isExpanded && isHoverOpen.current) {
      setIsExpanded(false);
      isHoverOpen.current = false;
    }
  };

  const handleManualExpand = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent bubbling
    
    // Cancel hover timer to avoid race conditions
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    
    setIsExpanded(true);
    isHoverOpen.current = false; // This is a manual open, so don't auto-close on leave
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

  // Ensure currentIndex is safe before render (double check)
  const safeIndex = currentIndex >= items.length ? 0 : currentIndex;
  const activeItem = items[safeIndex];

  // Wrapper div handles the hover events for both Expanded and Stacked states
  // ensuring the mouse stays "inside" even when the view switches.
  return (
    <div 
      className="relative transition-all duration-300"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isExpanded ? (
        // --- EXPANDED VIEW ---
        <div className="flex flex-col gap-4 animate-in fade-in duration-300 relative pt-10 pb-4">
          {/* Top Collapse Button */}
          <button
            onClick={handleManualCollapse}
            className="absolute top-0 left-0 w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors z-20"
          >
            <IconChevronUp className="w-3 h-3" /> Show Less
          </button>
          
          <div className="space-y-4">
              {items.map(renderItem)}
          </div>
        </div>
      ) : (
        // --- COLLAPSED (STACK) VIEW ---
        <div className="relative group min-h-[180px]">
          {/* Stack Background Effects */}
          <div className="absolute top-4 left-0 right-0 h-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm z-0 scale-[0.95] opacity-50 translate-y-2 transition-all"></div>
          <div className="absolute top-8 left-0 right-0 h-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm z-[-1] scale-[0.90] opacity-30 translate-y-4 transition-all"></div>

          {/* Top Card (Active) with Animation */}
          {activeItem && (
            <div 
                key={activeItem.id} 
                className="relative z-10 transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-right-8 fade-in duration-300"
            >
                {renderItem(activeItem)}
            </div>
          )}

          {/* Carousel & Expand Controls (Glassmorphism) */}
          <div className="absolute -bottom-5 left-0 right-0 z-20 flex justify-center">
             <div className="flex items-center gap-1 bg-slate-900/90 dark:bg-white/90 backdrop-blur-md p-1 rounded-full shadow-xl">
                {/* Prev */}
                <button 
                  onClick={handlePrev}
                  className="p-1.5 rounded-full hover:bg-white/20 dark:hover:bg-black/10 text-white dark:text-slate-900 transition-colors"
                >
                   <IconChevronLeft className="w-3 h-3" />
                </button>

                {/* Expand */}
                <button
                  onClick={handleManualExpand}
                  className="px-3 py-1 text-xs font-bold text-white dark:text-slate-900 flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                >
                  <IconStack className="w-3 h-3" />
                  <span>+{items.length - 1}</span>
                </button>

                {/* Next */}
                <button 
                  onClick={handleNext}
                  className="p-1.5 rounded-full hover:bg-white/20 dark:hover:bg-black/10 text-white dark:text-slate-900 transition-colors"
                >
                   <IconChevronRight className="w-3 h-3" />
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

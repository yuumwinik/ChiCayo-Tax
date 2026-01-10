
import React, { useState, useRef, useEffect } from 'react';
import { IconChevronDown, IconCheck } from './Icons';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[] | string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  editable?: boolean; // If true, acts as an input with datalist behavior
  onBlur?: () => void;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select...", 
  editable = false,
  onBlur,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to object format
  const normalizedOptions = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (onBlur) onBlur();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {editable ? (
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full px-4 py-3 pr-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white outline-none transition-all shadow-sm text-center font-medium cursor-text"
          />
          <div 
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-indigo-500 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            <IconChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-900 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:border-indigo-500 text-slate-900 dark:text-white outline-none transition-all shadow-sm group"
        >
          <span className={`font-medium truncate ${!value ? 'text-slate-400' : ''}`}>
            {normalizedOptions.find(o => o.value === value)?.label || value || placeholder}
          </span>
          <IconChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[80px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top">
          <div className="max-h-60 overflow-y-auto p-1 no-scrollbar space-y-0.5">
            {normalizedOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between
                  ${value === opt.value 
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {opt.label}
                {value === opt.value && <IconCheck className="w-3 h-3" />}
              </button>
            ))}
            {normalizedOptions.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-400 text-center">No options</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

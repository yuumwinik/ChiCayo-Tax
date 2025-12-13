
import React, { useState, useRef, useEffect } from 'react';
import { IconCalendar, IconChevronLeft, IconChevronRight } from './Icons';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  required?: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Initialize view date (defaults to value or today)
  const [viewDate, setViewDate] = useState(() => value ? new Date(value) : new Date());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDayClick = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    // Format as YYYY-MM-DD
    const dateStr = newDate.toLocaleDateString('en-CA'); 
    onChange(dateStr);
    setIsOpen(false);
  };

  const changeMonth = (delta: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00'); // Force local time interpretation
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    const selected = value ? new Date(value + 'T00:00:00') : null;

    const days = [];
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    // Headers
    weekDays.forEach(d => {
      days.push(
        <div key={`head-${d}`} className="text-center text-xs font-bold text-slate-400 py-1">
          {d}
        </div>
      );
    });

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} />);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
      const isSelected = selected && selected.getDate() === day && selected.getMonth() === month && selected.getFullYear() === year;

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDayClick(day)}
          className={`
            h-8 w-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all
            ${isSelected 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
              : isToday 
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:border-indigo-500 text-left flex items-center gap-3 transition-all shadow-sm group ${!value && required ? 'border-rose-200' : ''}`}
      >
        <IconCalendar className="w-5 h-5 text-indigo-500 group-hover:text-indigo-600 transition-colors" />
        <span className={`font-medium ${!value ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
          {value ? formatDateDisplay(value) : 'Select Date'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-[60] w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h4>
            <div className="flex gap-1">
              <button type="button" onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
                <IconChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
                <IconChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>

          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
             <button 
               type="button" 
               onClick={() => { onChange(''); setIsOpen(false); }}
               className="text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors"
             >
               Clear
             </button>
             <button 
               type="button" 
               onClick={() => { 
                 const today = new Date().toLocaleDateString('en-CA');
                 onChange(today); 
                 setViewDate(new Date());
                 setIsOpen(false); 
               }}
               className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
             >
               Today
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { PayCycle } from '../types';

interface CycleProgressIndicatorProps {
    activeCycle?: PayCycle;
}

export const CycleProgressIndicator: React.FC<CycleProgressIndicatorProps> = ({ activeCycle }) => {
    const [progress, setProgress] = useState(0);
    const [color, setColor] = useState('bg-rose-500');
    const [timeLeftStr, setTimeLeftStr] = useState('');

    useEffect(() => {
        if (!activeCycle) return;

        const updateProgress = () => {
            const now = new Date();
            const start = new Date(activeCycle.startDate);
            const end = new Date(activeCycle.endDate);
            end.setHours(16, 0, 0, 0); // Friday 4 PM

            // Ensure start begins at Monday 7 AM
            start.setHours(7, 0, 0, 0);

            // Total working hours formula (simplified: 5 days * 9 hours = 45 hours = 162,000,000 ms)
            // This is just a visual approximation. Let's do raw ms from Monday 7AM to Friday 4PM.
            const totalMs = end.getTime() - start.getTime();
            let elapsedMs = now.getTime() - start.getTime();

            if (elapsedMs < 0) elapsedMs = 0;
            if (elapsedMs > totalMs) elapsedMs = totalMs;

            const percentage = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
            setProgress(percentage);

            if (percentage < 25) setColor('text-rose-500 bg-rose-500');
            else if (percentage < 50) setColor('text-orange-500 bg-orange-500');
            else if (percentage < 75) setColor('text-yellow-400 bg-yellow-400');
            else setColor('text-emerald-500 bg-emerald-500');

            const remainingMs = Math.max(0, end.getTime() - now.getTime());
            const daysLeft = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
            const hoursLeft = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            setTimeLeftStr(`${daysLeft}d ${hoursLeft}h`);
        };

        updateProgress();
        const interval = setInterval(updateProgress, 60000);
        return () => clearInterval(interval);
    }, [activeCycle]);

    if (!activeCycle) return null;

    // Use a CSS conic-gradient to create a progress ring
    const ringStyle = {
        background: `conic-gradient(currentColor ${progress}%, transparent ${progress}%)`,
    };

    return (
        <div className="relative group/cycle cursor-pointer  flex items-center justify-center mr-2">
            {/* Standard Ring State */}
            <div 
                className={`w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all duration-300 transform group-hover/cycle:scale-0 group-hover/cycle:opacity-0 ${color.split(' ')[0]}`}
            >
                {/* The fill mask */}
                <div className="absolute inset-[2px] rounded-full bg-slate-50 dark:bg-slate-800 z-10" />
                <div className="absolute inset-0 rounded-full" style={ringStyle} />
            </div>

            {/* Hover State: Expanded Bar */}
            <div className="absolute right-0 flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full opacity-0 pointer-events-none scale-90 group-hover/cycle:opacity-100 group-hover/cycle:pointer-events-auto group-hover/cycle:scale-100 transition-all duration-500 shadow-xl overflow-hidden min-w-[120px]">
                <div className="flex flex-col w-full gap-1">
                    <div className="flex justify-between items-center w-full">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap">Cycle</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${color.split(' ')[0]}`}>{timeLeftStr}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${color.split(' ')[1]}`} style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

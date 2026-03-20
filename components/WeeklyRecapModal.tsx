import React, { useState, useMemo } from 'react';
import { Appointment, AppointmentStage, User } from '../types';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import { IconTrophy, IconSparkles, IconActivity, IconDownload, IconTrendingUp, IconClock, IconCalendar, IconChevronRight } from './Icons';

interface WeeklyRecapModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointments: Appointment[];
    user: User;
    allUsers: User[];
    onExportCSV: () => void;
}

export const WeeklyRecapModal: React.FC<WeeklyRecapModalProps> = ({
    isOpen, onClose, appointments, user, onExportCSV
}) => {
    const [page, setPage] = useState(0);

    const stats = useMemo(() => {
        // Assume the 'current cycle' is the last 7 days for the sake of the recap, or just use recent data. 
        // Given the requirement happens at the end of the pay cycle, we'll look at the last 7 days vs previous 14 days.
        const now = new Date();
        const cycleOnboards = appointments.filter(a => a.userId === user.id && (a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED));
        
        const currentCycleStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const prevCycleStart = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

        const currentWeekApps = cycleOnboards.filter(a => new Date(a.onboardedAt || a.scheduledAt) >= currentCycleStart);
        const prevWeeksApps = cycleOnboards.filter(a => {
            const date = new Date(a.onboardedAt || a.scheduledAt);
            return date >= prevCycleStart && date < currentCycleStart;
        });

        const totalEarnings = currentWeekApps.reduce((sum, a) => sum + (Number(a.earnedAmount) || 0), 0);
        const prevEarnings = prevWeeksApps.reduce((sum, a) => sum + (Number(a.earnedAmount) || 0), 0) / 2; // Avg per week

        const earningsDiff = totalEarnings - prevEarnings;
        const trend = earningsDiff >= 0 ? 'up' : 'down';
        const percentChange = prevEarnings === 0 ? 100 : Math.round(Math.abs(earningsDiff) / prevEarnings * 100);

        // Best Days and Happy Hours
        const daysCount: Record<number, number> = {};
        const hoursCount: Record<number, number> = {};

        currentWeekApps.forEach(a => {
            const date = new Date(a.onboardedAt || a.scheduledAt);
            const day = date.getDay();
            const hour = date.getHours();
            daysCount[day] = (daysCount[day] || 0) + 1;
            hoursCount[hour] = (hoursCount[hour] || 0) + 1;
        });

        const bestDayNumeric = parseInt(Object.keys(daysCount).sort((a, b) => daysCount[parseInt(b)] - daysCount[parseInt(a)])[0] || '1');
        const bestHourNumeric = parseInt(Object.keys(hoursCount).sort((a, b) => hoursCount[parseInt(b)] - hoursCount[parseInt(a)])[0] || '10');

        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const bestDay = daysOfWeek[bestDayNumeric] || 'Monday';
        const bestHour = `${bestHourNumeric > 12 ? bestHourNumeric - 12 : bestHourNumeric} ${bestHourNumeric >= 12 ? 'PM' : 'AM'}`;

        return {
            onboards: currentWeekApps.length,
            totalEarnings,
            trend,
            percentChange,
            bestDay,
            bestHour
        };
    }, [appointments, user.id]);

    if (!isOpen) return null;

    const pages = [
        {
            title: "End Cycle Snapshot",
            icon: <IconActivity className="w-12 h-12 text-indigo-500" />,
            content: (
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="text-6xl font-black text-slate-900 dark:text-white mb-2">{stats.onboards}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest text-[10px]">Total Cycle Onboards</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/40 p-6 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-800">
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1 text-center">Cycle Earnings</p>
                        <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 text-center">{formatCurrency(stats.totalEarnings)}</div>
                        
                        <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold">
                            {stats.trend === 'up' ? (
                                <span className="text-emerald-600 flex items-center gap-1"><IconTrendingUp className="w-4 h-4"/> +{stats.percentChange}% vs Prev 2W</span>
                            ) : (
                                <span className="text-rose-500 flex items-center gap-1"><IconTrendingUp className="w-4 h-4 scale-y-[-1]"/> -{stats.percentChange}% vs Prev 2W</span>
                            )}
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "Performance Insights",
            icon: <IconTrophy className="w-12 h-12 text-amber-500" />,
            content: (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 text-center">
                            <IconCalendar className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Best Day</div>
                            <div className="text-lg font-black text-slate-900 dark:text-white capitalize">{stats.bestDay}</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 text-center">
                            <IconClock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Happy Hour</div>
                            <div className="text-lg font-black text-slate-900 dark:text-white">{stats.bestHour}</div>
                        </div>
                    </div>
                    <div className="p-5 bg-sky-50 dark:bg-sky-900/30 rounded-3xl border border-sky-100 dark:border-sky-800/50">
                        <p className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><IconSparkles className="w-3 h-3" /> Motivation</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic leading-relaxed">
                            "{stats.trend === 'up' 
                                ? "You crushed it this cycle! Double down on your momentum and aim even higher next week. Great work." 
                                : "A solid foundation is set. Use what you learned this week to bounce back stronger next cycle."}"
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: "Ready for the Weekend?",
            icon: <IconSparkles className="w-12 h-12 text-purple-500" />,
            content: (
                <div className="space-y-6 text-center">
                    <p className="text-slate-500 text-sm font-medium">Download your final report and relax. You've earned it!</p>
                    <button
                        onClick={onExportCSV}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
                    >
                        <IconDownload className="w-5 h-5" />
                        Export Cycle Ledger
                    </button>
                    <div className="pt-2">
                        <button onClick={onClose} className="px-6 py-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full font-bold text-xs uppercase tracking-widest transition-all">Close Recap</button>
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-6 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-100 dark:bg-slate-800">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${((page + 1) / pages.length) * 100}%` }}
                    />
                </div>

                <div className="p-10 pt-16 flex flex-col items-center">
                    <div className="mb-6 animate-in zoom-in spin-in-12 duration-1000">
                        {pages[page].icon}
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 text-center tracking-tight">{pages[page].title}</h2>
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-10">End of Cycle</p>

                    <div className="w-full min-h-[220px] animate-in slide-in-from-bottom-4 duration-500">
                        {pages[page].content}
                    </div>

                    {page < pages.length - 1 && (
                        <button
                            onClick={() => setPage(p => p + 1)}
                            className="mt-6 w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-[2rem] font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                        >
                            Continue <IconChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

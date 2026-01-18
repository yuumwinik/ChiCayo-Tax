import React, { useState } from 'react';
import { Appointment, AppointmentStage, User } from '../types';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import { IconTrophy, IconSparkles, IconTrendingUp, IconActivity, IconDownload, IconX, IconChevronRight } from './Icons';

interface WeeklyRecapModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointments: Appointment[];
    user: User;
    allUsers: User[];
    onExportCSV: () => void;
}

export const WeeklyRecapModal: React.FC<WeeklyRecapModalProps> = ({
    isOpen, onClose, appointments, user, allUsers, onExportCSV
}) => {
    const [page, setPage] = useState(0);

    if (!isOpen) return null;

    // Stats Logic
    const cycleOnboards = appointments.filter(a => a.stage === AppointmentStage.ONBOARDED);
    const totalEarnings = cycleOnboards.reduce((sum, a) => sum + (Number(a.earnedAmount) || 0), 0);

    // Calculate Rank
    const userEarningsMap: Record<string, number> = {};
    allUsers.forEach(u => userEarningsMap[u.id] = 0);
    // Note: In a real scenario, this would come from all stats, but we use props for now
    // For demo/simulated rank:
    const myOnboards = cycleOnboards.filter(a => a.userId === user.id).length;

    const pages = [
        {
            title: "Week in Review",
            icon: <IconTrophy className="w-12 h-12 text-amber-500" />,
            content: (
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="text-6xl font-black text-slate-900 dark:text-white mb-2">{myOnboards}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest text-[10px]">Total Onboards Reached</div>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/40 p-6 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 text-center">Estimated Earnings</p>
                        <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 text-center">{formatCurrency(totalEarnings)}</div>
                    </div>
                </div>
            )
        },
        {
            title: "Your Impact",
            icon: <IconActivity className="w-12 h-12 text-indigo-500" />,
            content: (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700">
                            <IconTrendingUp className="w-5 h-5 text-emerald-500 mb-2" />
                            <div className="text-xs font-bold text-slate-400 uppercase text-[9px]">Conversion</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">High</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700">
                            <IconSparkles className="w-5 h-5 text-purple-500 mb-2" />
                            <div className="text-xs font-bold text-slate-400 uppercase text-[9px]">Referrals</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">Active</div>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl text-sm font-medium text-slate-600 dark:text-slate-300 italic">
                        "Another week of massive growth. Your hustle is the engine of ChiCayo Tax."
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
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 dark:shadow-none transition-all"
                    >
                        <IconDownload className="w-5 h-5" />
                        Export Cycle Ledger
                    </button>
                    <div className="pt-4">
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest">Close Recap</button>
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
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-10">Cycle Recap</p>

                    <div className="w-full animate-in slide-in-from-bottom-4 duration-500">
                        {pages[page].content}
                    </div>

                    {page < pages.length - 1 && (
                        <button
                            onClick={() => setPage(p => p + 1)}
                            className="mt-10 w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-[2rem] font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                        >
                            Continue <IconChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

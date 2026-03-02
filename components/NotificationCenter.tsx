
import React, { useState, useMemo, useEffect } from 'react';
import { Appointment, AppointmentStage } from '../types';
import { IconBell, IconClock, IconAlertCircle, IconCheck, IconX, IconTrash } from './Icons';

interface NotificationCenterProps {
    appointments: Appointment[];
    onOpenAppointment: (id: string) => void;
    onClearAll: () => void;
    onClearIndividual: (id: string) => void;
    dismissedIds: string[];
    isOpen: boolean;
    onToggle: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
    appointments,
    onOpenAppointment,
    onClearAll,
    onClearIndividual,
    dismissedIds,
    isOpen,
    onToggle
}) => {
    const alerts = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

        return appointments.filter(a => {
            if (dismissedIds.includes(a.id)) return false;
            // Only Pending or Rescheduled
            if (a.stage !== AppointmentStage.PENDING && a.stage !== AppointmentStage.RESCHEDULED) return false;

            const scheduledTime = new Date(a.scheduledAt).getTime();

            // Current Day rule
            if (scheduledTime < startOfToday || scheduledTime > endOfToday) return false;

            const diffMinutes = (scheduledTime - now.getTime()) / (1000 * 60);

            // Upcoming within 20 mins OR Past Due
            return diffMinutes <= 20;
        }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    }, [appointments, dismissedIds]);

    if (alerts.length === 0 && !isOpen) return null;

    return (
        <div className="relative">
            <button
                onClick={onToggle}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all active:scale-95 border ${alerts.length > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent opacity-50'}`}
            >
                <IconBell className={`w-4 h-4 ${alerts.length > 0 ? 'animate-ring' : ''}`} />
                {alerts.length > 0 && <span className="text-[10px] font-black uppercase tracking-widest">{alerts.length}</span>}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={onToggle} />
                    <div className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-[101] animate-in slide-in-from-top-2 duration-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <IconAlertCircle className="w-3.5 h-3.5" /> Today's Pulse
                            </h4>
                            {alerts.length > 0 && (
                                <button onClick={onClearAll} className="text-[9px] font-black text-rose-500 uppercase hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2 py-1 rounded-lg transition-colors">Clear All</button>
                            )}
                        </div>

                        <div className="max-h-[400px] overflow-y-auto p-3 custom-scrollbar">
                            {alerts.length > 0 ? (
                                <div className="space-y-2">
                                    {alerts.map(a => {
                                        const scheduledTime = new Date(a.scheduledAt).getTime();
                                        const isPast = scheduledTime < Date.now();
                                        return (
                                            <div key={a.id} className="group relative flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-all">
                                                <button
                                                    onClick={() => onOpenAppointment(a.id)}
                                                    className="flex-1 text-left"
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[120px]">{a.name}</span>
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${isPast ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'}`}>
                                                            {isPast ? 'PAST DUE' : 'UPCOMING'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold">
                                                        <IconClock className="w-3 h-3 text-indigo-500" />
                                                        {new Date(a.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => onClearIndividual(a.id)}
                                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <IconCheck className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-12 text-center">
                                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 opacity-50">
                                        <IconCheck className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inbox Zero</p>
                                    <p className="text-[9px] text-slate-500 font-medium">No alerts for the next 20 mins</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

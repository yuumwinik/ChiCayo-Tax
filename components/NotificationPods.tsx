import React, { useState, useEffect } from 'react';
import { Appointment, AppointmentStage, Reminder } from '../types';
import { IconBell, IconClock, IconAlertCircle, IconCalendar } from './Icons';

interface NotificationPodsProps {
    appointments: Appointment[];
    reminders?: Reminder[];
    onOpenAppointment: (id: string) => void;
    onNavigateToReminders?: () => void;
    highlightedReminderIdForPulse?: string | null;
    thresholdMinutes: number;
}

export const NotificationPods: React.FC<NotificationPodsProps> = ({ 
    appointments, 
    reminders = [],
    onOpenAppointment, 
    onNavigateToReminders,
    highlightedReminderIdForPulse,
    thresholdMinutes 
}) => {
    const [alerts, setAlerts] = useState<Appointment[]>([]);
    const [reminderAlerts, setReminderAlerts] = useState<Reminder[]>([]);

    useEffect(() => {
        const checkAlerts = () => {
            const now = new Date();
            const thresholdMs = thresholdMinutes * 60 * 1000;

            const active = appointments.filter(a => {
                // Only notify for Pending or Rescheduled items
                if (a.stage !== AppointmentStage.PENDING && a.stage !== AppointmentStage.RESCHEDULED) return false;

                const scheduledTime = new Date(a.scheduledAt).getTime();
                const diff = scheduledTime - now.getTime();

                // Is it coming up soon (within threshold) OR is it past due (within last 30 mins)?
                return (diff > 0 && diff <= thresholdMs) || (diff < 0 && diff > -1800000); // 30 mins past due window
            });

            setAlerts(active.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()));
        };

        const checkReminderAlerts = () => {
            const now = new Date();
            const thresholdMs = thresholdMinutes * 60 * 1000;

            const activeReminders = reminders.filter(r => {
                const callbackTime = new Date(r.callBackAt).getTime();
                const diff = callbackTime - now.getTime();

                // Is it coming up soon (within threshold) OR is it past due (within last 30 mins)?
                return (diff > 0 && diff <= thresholdMs) || (diff < 0 && diff > -1800000);
            });

            setReminderAlerts(activeReminders.sort((a, b) => new Date(a.callBackAt).getTime() - new Date(b.callBackAt).getTime()));
        };

        checkAlerts();
        checkReminderAlerts();
        const interval = setInterval(() => {
            checkAlerts();
            checkReminderAlerts();
        }, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [appointments, reminders, thresholdMinutes]);

    if (alerts.length === 0 && reminderAlerts.length === 0) return null;

    const totalAlerts = alerts.length + reminderAlerts.length;

    return (
        <div className="flex items-center gap-2 animate-in slide-in-from-top duration-500">
            <div className="relative group">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer">
                    <IconBell className="w-3.5 h-3.5 animate-ring" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{totalAlerts} Active</span>
                </div>

                {/* Tooltip with details */}
                <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-[100] transform translate-y-2 group-hover:translate-y-0">
                    <div className="p-4 space-y-3">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                            <IconAlertCircle className="w-3 h-3" /> Upcoming & Past Due
                        </h4>
                        <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {/* Appointments Section */}
                            {alerts.length > 0 && (
                                <>
                                    {alerts.map(a => {
                                        const diff = new Date(a.scheduledAt).getTime() - Date.now();
                                        const isPast = diff < 0;
                                        return (
                                            <button
                                                key={`apt-${a.id}`}
                                                onClick={() => onOpenAppointment(a.id)}
                                                className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 group"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate">{a.name}</span>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${isPast ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {isPast ? 'PAST DUE' : 'UPCOMING'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                                                    <IconClock className="w-3 h-3" />
                                                    {new Date(a.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </>
                            )}

                            {/* Reminders Section */}
                            {reminderAlerts.length > 0 && (
                                <>
                                    {alerts.length > 0 && <div className="border-t border-slate-100 dark:border-slate-800 my-2" />}
                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Reminders</div>
                                    {reminderAlerts.map(r => {
                                        const diff = new Date(r.callBackAt).getTime() - Date.now();
                                        const isPast = diff < 0;
                                        const isHighlighted = highlightedReminderIdForPulse === r.id;
                                        return (
                                            <button
                                                key={`rem-${r.id}`}
                                                onClick={() => onNavigateToReminders?.()}
                                                className={`w-full text-left p-3 rounded-xl transition-colors border transition-all group ${
                                                    isHighlighted
                                                        ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700 animate-pulse'
                                                        : 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-black text-indigo-900 dark:text-indigo-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors truncate">{r.name}</span>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${isPast ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {isPast ? 'PAST DUE' : 'UPCOMING'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-indigo-700 dark:text-indigo-300 font-bold">
                                                    <IconCalendar className="w-3 h-3" />
                                                    {new Date(r.callBackAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

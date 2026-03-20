import React, { useState, useMemo, useEffect } from 'react';
import { Reminder, AppointmentStage } from '../types';
import { useData } from '../contexts/DataContext';
import { useUser } from '../contexts/UserContext';
import { IconPlus, IconTrash, IconEdit, IconPhone, IconMail, IconClock, IconCalendar, IconTransfer, IconCheck, IconSearch, IconX } from './Icons';
import { formatDate } from '../utils/dateUtils';

interface RemindersViewProps {
    onOpenModal: (reminder?: Reminder) => void;
    onDeleteReminder: (id: string) => Promise<void>;
    onSaveAppointment: (data: any) => Promise<void>;
    onConvertReminderToAppointment: (reminder: Reminder, stage: AppointmentStage) => Promise<void>;
}

export const RemindersView: React.FC<RemindersViewProps> = ({ onOpenModal, onDeleteReminder, onSaveAppointment, onConvertReminderToAppointment }) => {
    const { reminders } = useData();
    const { user } = useUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const filteredReminders = useMemo(() => {
        let items = reminders.filter(r => r.userId === user?.id);
        if (searchQuery) {
            const low = searchQuery.toLowerCase();
            items = items.filter(r =>
                r.name.toLowerCase().includes(low) ||
                r.phone.includes(low) ||
                r.email.toLowerCase().includes(low)
            );
        }
        // Sort: Closest to NOW first
        return items.sort((a, b) => new Date(a.callBackAt).getTime() - new Date(b.callBackAt).getTime());
    }, [reminders, searchQuery, user]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                            <IconClock className="w-10 h-10 text-indigo-600" />
                            Partner Reminders
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">
                            Private callback queue. Cloud-synced across your devices.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group w-48 hidden lg:block">
                        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                        />
                    </div>
                    <button
                        onClick={() => onOpenModal()}
                        className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95 group"
                    >
                        <IconPlus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto pr-2">
                {filteredReminders.length === 0 ? (
                    <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 opacity-50">
                            <IconCalendar className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">No Active Reminders</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mt-2 font-medium">Use the + button to log partner callbacks and follow-ups.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {filteredReminders.map(reminder => (
                            <ReminderCard
                                key={reminder.id}
                                reminder={reminder}
                                onEdit={() => onOpenModal(reminder)}
                                onDelete={() => setDeleteConfirmId(reminder.id)}
                                onConvert={onConvertReminderToAppointment}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Inline Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 max-w-[280px] w-full text-center shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <IconTrash className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">Delete?</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold mb-6 leading-relaxed px-4">Remove this partner from your cloud callback queue?</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setDeleteConfirmId(null)} className="py-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black rounded-xl hover:bg-slate-100 transition-all uppercase text-[9px] tracking-widest border border-slate-100 dark:border-slate-700">Back</button>
                            <button onClick={async (e) => { e.stopPropagation(); await onDeleteReminder(deleteConfirmId); setDeleteConfirmId(null); }} className="py-3 bg-rose-600 text-white font-black rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-100 dark:shadow-none transition-all uppercase text-[9px] tracking-widest">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ReminderCard = ({ reminder, onEdit, onDelete, onConvert }: {
    reminder: Reminder;
    onEdit: () => void;
    onDelete: () => void;
    onConvert: (r: Reminder, s: AppointmentStage) => void;
}) => {
    const isPastDue = new Date(reminder.callBackAt).getTime() < Date.now();
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [copiedName, setCopiedName] = useState(false);
    const [copiedPhone, setCopiedPhone] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState(false);

    const copyToClipboard = (text: string, type: 'name' | 'phone' | 'email', e: React.MouseEvent) => {
        e.stopPropagation();
        if (!text) return;
        navigator.clipboard.writeText(text);
        if (type === 'name') { setCopiedName(true); setTimeout(() => setCopiedName(false), 2000); }
        if (type === 'phone') { setCopiedPhone(true); setTimeout(() => setCopiedPhone(false), 2000); }
        if (type === 'email') { setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000); }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
        return () => clearInterval(timer);
    }, []);

    const countdown = useMemo(() => {
        const target = new Date(reminder.callBackAt).getTime();
        const diff = target - currentTime;
        if (diff < 0) return { label: 'PAST DUE', percent: 100, color: 'bg-rose-500' };

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) return { label: `${Math.floor(hours / 24)}d away`, percent: 0, color: 'bg-slate-300' };
        if (hours > 0) return { label: `${hours}h ${mins}m`, percent: Math.max(0, 100 - (hours * 4)), color: 'bg-indigo-400' };

        // Final hour countdown
        const percent = Math.max(0, 100 - (mins / 60 * 100));
        return { label: `${mins}m left`, percent, color: 'bg-amber-500' };
    }, [reminder.callBackAt, currentTime]);

    return (
        <div className={`group bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border-b-4 transition-all hover:translate-y-[-4px] shadow-sm hover:shadow-xl ${isPastDue ? 'border-rose-500 shadow-rose-100 dark:shadow-none' : 'border-indigo-600 shadow-indigo-100 dark:shadow-none'}`}>
            <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 onClick={(e) => copyToClipboard(reminder.name, 'name', e)} className={`text-xl font-black truncate max-w-[150px] cursor-pointer transition-colors ${copiedName ? 'text-emerald-500' : 'text-slate-900 dark:text-white hover:text-indigo-600'}`}>{reminder.name}</h3>
                        {reminder.isPendingActivation && (
                            <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap shadow-sm border border-rose-200 dark:border-rose-800">🔥 Hot Lead</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <IconCalendar className="w-3.5 h-3.5" />
                        {formatDate(reminder.callBackAt)}
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={onEdit} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-all"><IconEdit className="w-4 h-4" /></button>
                    <button onClick={onDelete} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-all"><IconTrash className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Countdown Status Bar */}
            <div className="mb-6 space-y-1.5">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                    <span className={isPastDue ? 'text-rose-500' : 'text-slate-400'}>Callback Status</span>
                    <span className={isPastDue ? 'text-rose-500 animate-pulse' : 'text-indigo-600'}>{countdown.label}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ${countdown.color}`}
                        style={{ width: `${countdown.percent}%` }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div onClick={(e) => copyToClipboard(reminder.phone, 'phone', e)} className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-bold cursor-pointer transition-colors ${copiedPhone ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                    <IconPhone className={`w-3.5 h-3.5 ${copiedPhone ? 'text-emerald-500' : 'text-slate-400'}`} />
                    {reminder.phone || 'No Phone'}
                </div>
                <div onClick={(e) => copyToClipboard(reminder.email, 'email', e)} className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-bold truncate cursor-pointer transition-colors ${copiedEmail ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                    <IconMail className={`w-3.5 h-3.5 ${copiedEmail ? 'text-emerald-500' : 'text-slate-400'}`} />
                    {reminder.email || 'No Email'}
                </div>
            </div>

            {reminder.notes && (
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl text-xs text-slate-600 dark:text-indigo-200 mb-6 italic leading-relaxed font-medium">
                    "{reminder.notes}"
                </div>
            )}

            <div className="flex items-center gap-2 mt-auto">
                <button
                    onClick={() => onConvert(reminder, AppointmentStage.ONBOARDED)}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <IconCheck className="w-3 h-3" /> Onboard
                </button>
                {reminder.isPendingActivation && (
                    <button onClick={() => onConvert(reminder, AppointmentStage.TRANSFERRED)} className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-xl hover:bg-purple-200 transition-all active:scale-95" title="Transfer"><IconTransfer className="w-4 h-4" /></button>
                )}
            </div>
        </div>
    );
};

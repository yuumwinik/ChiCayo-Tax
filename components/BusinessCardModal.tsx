
import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, AppointmentStage, STAGE_LABELS, STAGE_COLORS, AE_COLORS } from '../types';
import { formatDate, formatCurrency, getRelativeTime } from '../utils/dateUtils';
import {
    IconX, IconPhone, IconMail, IconCopy, IconCheck, IconEdit, IconTrash,
    IconCalendar, IconNotes, IconTrophy, IconBriefcase, IconTransfer,
    IconClock, IconChevronLeft, IconChevronRight, IconSparkles, IconTrendingUp, IconActivity, IconPlus,
    IconUsers, IconAlertTriangle
} from './Icons';
import { ProtocolModal } from './ProtocolModal';

interface BusinessCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: Appointment | null;
    onEdit: (appt: Appointment, isRescheduleAction?: boolean) => void;
    onDelete: (id: string) => void;
    onMoveStage: (id: string, stage: AppointmentStage, isManualSelfOnboard?: boolean) => void;
    onSaveNotes: (id: string, notes: string) => void;
    onNext?: () => void;
    onPrev?: () => void;
    hasNext?: boolean;
    hasPrev?: boolean;
    referralRate: number;
    onUpdateReferrals: (id: string, count: number) => void;
}

export const BusinessCardModal: React.FC<BusinessCardModalProps> = ({
    isOpen, onClose, appointment, onEdit, onDelete, onMoveStage, onSaveNotes,
    onNext, onPrev, hasNext, hasPrev, referralRate, onUpdateReferrals
}) => {
    const [notes, setNotes] = useState('');
    const [copiedPhone, setCopiedPhone] = useState(false);
    const [copiedName, setCopiedName] = useState(false);

    useEffect(() => {
        if (appointment) setNotes(appointment.notes || '');
    }, [appointment]);

    const isOnboarded = appointment?.stage === AppointmentStage.ONBOARDED;
    const isTransferQueue = appointment?.stage === AppointmentStage.TRANSFERRED;
    const isActionable = appointment?.stage === AppointmentStage.PENDING || appointment?.stage === AppointmentStage.RESCHEDULED;

    if (!isOpen || !appointment) return null;

    const handleUpdateReferrals = (delta: number) => {
        const current = appointment.referralCount || 0;
        const next = Math.max(0, current + delta);
        onUpdateReferrals(appointment.id, next);
    };

    const copyToClipboard = (text: string, type: 'phone' | 'name') => {
        navigator.clipboard.writeText(text);
        if (type === 'phone') { setCopiedPhone(true); setTimeout(() => setCopiedPhone(false), 2000); }
        else { setCopiedName(true); setTimeout(() => setCopiedName(false), 2000); }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative bg-white dark:bg-slate-900 w-full h-[90vh] md:h-auto md:max-h-[85vh] md:max-w-4xl overflow-hidden flex flex-col md:flex-row border-0 md:border border-white/20 md:rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300">
                <button onClick={onClose} className="absolute top-5 right-5 z-40 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-full transition-colors border border-slate-100 dark:border-slate-700 shadow-sm"><IconX className="w-5 h-5" /></button>

                <div className={`w-full md:w-5/12 p-8 flex flex-col items-center text-center bg-slate-50 dark:bg-slate-800/30 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 transition-colors duration-500 ${isOnboarded ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}>
                    <div className="relative mb-6 flex items-center gap-4">
                        <button disabled={!hasPrev} onClick={onPrev} className={`p-2 rounded-full transition-all ${hasPrev ? 'opacity-30 hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700' : 'opacity-0'}`}><IconChevronLeft className="w-6 h-6" /></button>
                        <div className="relative"><div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-3xl font-black border-4 border-white dark:border-slate-800 shadow-xl transition-all ${isOnboarded ? 'bg-emerald-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>{appointment.name.charAt(0).toUpperCase()}</div></div>
                        <button disabled={!hasNext} onClick={onNext} className={`p-2 rounded-full transition-all ${hasNext ? 'opacity-30 hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700' : 'opacity-0'}`}><IconChevronRight className="w-6 h-6" /></button>
                    </div>

                    <h2 onClick={() => copyToClipboard(appointment.name, 'name')} className={`text-2xl font-black mb-1 transition-colors cursor-pointer ${copiedName ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{appointment.name}</h2>
                    <div className="flex flex-col items-center gap-2 mb-6">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><IconCalendar className="w-3 h-3" /> Captured {formatDate(appointment.createdAt)}</div>
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${getRelativeTime(appointment.scheduledAt).isPast && isActionable ? 'bg-rose-100 text-rose-600 border border-rose-200 animate-pulse' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                            {getRelativeTime(appointment.scheduledAt).isPast && isActionable && <IconAlertTriangle className="w-3 h-3" />}
                            {isActionable ? (getRelativeTime(appointment.scheduledAt).isPast ? `Overdue ${getRelativeTime(appointment.scheduledAt).label}` : `Due ${getRelativeTime(appointment.scheduledAt).label}`) : STAGE_LABELS[appointment.stage]}
                        </div>
                    </div>

                    {isOnboarded && (
                        <div className="w-full bg-emerald-600 p-5 rounded-3xl shadow-xl text-white text-left overflow-hidden relative group mt-4">
                            <div className="relative z-10">
                                <div className="text-[10px] font-black uppercase opacity-70 mb-1">Production Earned</div>
                                <div className="text-3xl font-black mb-3">{formatCurrency(appointment.earnedAmount || 0)}</div>
                                <div className="text-[9px] font-bold uppercase bg-white/20 px-2 py-1 rounded-lg w-fit">Closer: {appointment.aeName || 'Self'}</div>
                            </div>
                            <IconTrophy className="absolute -bottom-2 -right-2 w-16 h-16 text-white/10 group-hover:scale-110 transition-transform" />
                        </div>
                    )}

                    {isActionable && (
                        <div className="w-full mt-auto space-y-3 pt-6">
                            <button onClick={() => onMoveStage(appointment.id, AppointmentStage.ONBOARDED, true)} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"><IconCheck className="w-5 h-5" /> Direct Onboard</button>
                            <button onClick={() => onMoveStage(appointment.id, AppointmentStage.ONBOARDED, false)} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"><IconTransfer className="w-5 h-5" /> Transfer to AE</button>
                        </div>
                    )}
                </div>

                <div className="w-full md:w-7/12 p-8 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto no-scrollbar pb-24 md:pb-8">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group transition-all hover:border-indigo-200">
                            <div className="flex items-center gap-2 mb-2"><IconPhone className="w-3.5 h-3.5 text-indigo-500" /><span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Phone</span></div>
                            <ProtocolModal type="phone" value={appointment.phone}>{(trigger) => <button onClick={trigger} className="text-xs font-black text-slate-900 dark:text-white hover:text-indigo-600">{appointment.phone}</button>}</ProtocolModal>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group transition-all hover:border-blue-200">
                            <div className="flex items-center gap-2 mb-2"><IconMail className="w-3.5 h-3.5 text-blue-500" /><span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Email</span></div>
                            <ProtocolModal type="email" value={appointment.email} templatePath={isOnboarded ? "Files/Welcome to the Community Tax – SBTPG Referral Program.oft" : undefined}>{(trigger) => <button onClick={trigger} className="text-xs font-black text-slate-900 dark:text-white hover:text-blue-600 truncate block w-full">{appointment.email || 'None'}</button>}</ProtocolModal>
                        </div>
                    </div>

                    {isOnboarded && (
                        <div className="mb-6 animate-in slide-in-from-top-2 duration-500">
                            <div className="flex items-center justify-between mb-3 px-1">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><IconUsers className="w-4 h-4 text-rose-500" /> Referral Ledger</h4>
                                <span className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-lg">+{formatCurrency((appointment.referralCount || 0) * referralRate)} Bonus</span>
                            </div>
                            <div className="bg-rose-50/50 dark:bg-rose-900/10 p-5 rounded-3xl border border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
                                <div>
                                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{appointment.referralCount || 0}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">Successful Referrals</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleUpdateReferrals(-1)} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 text-rose-600 hover:bg-rose-50 font-black transition-all">-</button>
                                    <button onClick={() => handleUpdateReferrals(1)} className="w-10 h-10 rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-200 hover:bg-rose-700 flex items-center justify-center transition-all"><IconPlus className="w-5 h-5" /></button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 flex flex-col min-h-[150px]">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 px-1"><IconNotes className="w-3 h-3" /> Partner Session Logs</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => onSaveNotes(appointment.id, notes)} placeholder="Document context here..." className="flex-1 w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-xs font-medium border-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                        {isActionable && (
                            <button
                                onClick={() => { onMoveStage(appointment.id, AppointmentStage.NO_SHOW); onClose(); }}
                                className="flex-1 py-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors"
                            >
                                <IconAlertTriangle className="w-4 h-4" /> Mark as Failed
                            </button>
                        )}
                        <button onClick={() => { onEdit(appointment); onClose(); }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"><IconEdit className="w-4 h-4" /> Master Edit</button>
                        <button onClick={() => { onDelete(appointment.id); onClose(); }} className="p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-colors"><IconTrash className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

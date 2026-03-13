import React, { useMemo } from 'react';
import { Appointment, PayCycle, User } from '../types';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import { IconSparkles, IconTrophy, IconArrowRight, IconUsers, getAvatarIcon } from './Icons';

interface ReferralMomentumWidgetProps {
    appointments: Appointment[];
    activeCycle: PayCycle | null;
    onViewAppt: (appt: Appointment) => void;
    referralRate?: number;
    users: User[];
    allIncentives: any[];
    currentUserId?: string;
}

export const ReferralMomentumWidget: React.FC<ReferralMomentumWidgetProps> = ({
    appointments,
    activeCycle,
    onViewAppt,
    referralRate,
    users,
    allIncentives,
    currentUserId
}) => {
    const activeReferrals = useMemo(() => {
        if (!activeCycle || !allIncentives) return [];

        // Filter incentives to ONLY those belonging to the current user (unless admin)
        // Or if 'users' filter is not possible, we should just ensure we match the right owner.
        // The user said: "Only The Owner show have views of their activations."
        
        const cycleIncentives = allIncentives.filter(i =>
            i.appliedCycleId === activeCycle.id &&
            i.label.toLowerCase().includes('activation') &&
            i.relatedAppointmentId &&
            // If there's an owner filter, apply it
            (!currentUserId || i.userId === currentUserId)
        );

        return appointments
            .filter(a => cycleIncentives.some(i => i.relatedAppointmentId === a.id))
            .map(a => {
                const partnerIncentives = cycleIncentives.filter(i => i.relatedAppointmentId === a.id);
                const cycleCount = partnerIncentives.length;
                const cycleBonus = partnerIncentives.reduce((sum, i) => sum + i.amountCents, 0);
                return { ...a, cycleCount, cycleBonus };
            })
            .sort((a, b) => b.cycleBonus - a.cycleBonus);
    }, [appointments, activeCycle, allIncentives, currentUserId]);

    const totalActivations = useMemo(() => activeReferrals.reduce((sum, r) => sum + (r.cycleCount || 0), 0), [activeReferrals]);

    if (activeReferrals.length === 0) return null;

    return (
        <div className="mb-8 animate-in slide-in-from-top-4 duration-700">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                        <IconSparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Active Cycle Activation Momentum</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Production wins driven by partners</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800">
                    {activeReferrals.length} partners / {totalActivations} activations
                </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
                {activeReferrals.map(partner => (
                    <div
                        key={partner.id}
                        onClick={() => onViewAppt(partner)}
                        className="flex-shrink-0 w-80 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border-2 border-blue-100 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group relative overflow-hidden shadow-sm hover:shadow-xl"
                    >
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                            <IconTrophy className="w-20 h-20 text-blue-600" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center text-xl font-black border border-blue-100 dark:border-blue-800">
                                        {users.find(u => u.id === partner.userId)?.avatarId ? (
                                            <div className="w-full h-full rounded-2xl overflow-hidden text-slate-900 dark:text-white">
                                                {getAvatarIcon(users.find(u => u.id === partner.userId)!.avatarId!)}
                                            </div>
                                        ) : (
                                            partner.name.charAt(0)
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight truncate w-32">{partner.name}</h4>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Onboarded {formatDate(partner.onboardedAt || partner.scheduledAt).split(',')[0]}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20">ACTIVATED</div>
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-black text-blue-700 dark:text-blue-400 uppercase">Cycle Bonus Generated</span>
                                    <span className="text-[9px] font-black text-emerald-600">{formatCurrency(partner.cycleBonus)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-blue-100 dark:bg-blue-900/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `100%` }} />
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                                        {users.find(u => u.id === partner.userId)?.avatarId ? getAvatarIcon(users.find(u => u.id === partner.userId)!.avatarId!) : <span className="text-[8px] font-black uppercase">{users.find(u => u.id === partner.userId)?.name.charAt(0)}</span>}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500">{users.find(u => u.id === partner.userId)?.name}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                    Partner Details <IconArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

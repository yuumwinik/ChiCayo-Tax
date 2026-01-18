import React, { useMemo } from 'react';
import { Appointment, PayCycle, User } from '../types';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import { IconSparkles, IconTrophy, IconArrowRight, IconUsers, getAvatarIcon } from './Icons';

interface ReferralMomentumWidgetProps {
    appointments: Appointment[];
    activeCycle: PayCycle | null;
    onViewAppt: (appt: Appointment) => void;
    referralRate: number;
    users: User[];
}

export const ReferralMomentumWidget: React.FC<ReferralMomentumWidgetProps> = ({
    appointments,
    activeCycle,
    onViewAppt,
    referralRate,
    users
}) => {
    const activeReferrals = useMemo(() => {
        if (!activeCycle) return [];
        const start = new Date(activeCycle.startDate).getTime();
        const end = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);

        return appointments
            .filter(a => a.referralHistory && a.referralHistory.some(h => {
                const date = new Date(h.date).getTime();
                return date >= start && date <= end;
            }))
            .map(a => {
                const recentHistory = a.referralHistory!.filter(h => {
                    const date = new Date(h.date).getTime();
                    return date >= start && date <= end;
                });
                const cycleCount = recentHistory.reduce((s, h) => s + h.count, 0);
                return { ...a, cycleCount };
            })
            .sort((a, b) => new Date(b.lastReferralAt || 0).getTime() - new Date(a.lastReferralAt || 0).getTime());
    }, [appointments, activeCycle]);

    if (activeReferrals.length === 0) return null;

    return (
        <div className="mb-8 animate-in slide-in-from-top-4 duration-700">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-xl">
                        <IconSparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Active Cycle Referral Momentum</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Production wins driven by partners</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                    {activeReferrals.length} PARTNERS ACTIVE
                </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
                {activeReferrals.map(partner => (
                    <div
                        key={partner.id}
                        onClick={() => onViewAppt(partner)}
                        className="flex-shrink-0 w-80 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border-2 border-rose-100 dark:border-rose-900/30 hover:border-rose-300 dark:hover:border-rose-700 transition-all cursor-pointer group relative overflow-hidden shadow-sm hover:shadow-xl"
                    >
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                            <IconTrophy className="w-20 h-20 text-rose-600" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center text-xl font-black border border-rose-100 dark:border-rose-800">
                                        {partner.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight truncate w-32">{partner.name}</h4>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Onboarded {formatDate(partner.scheduledAt).split(',')[0]}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-rose-600 tabular-nums">+{partner.cycleCount}</div>
                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Received</div>
                                </div>
                            </div>

                            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-800 mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-black text-rose-700 dark:text-rose-400 uppercase">Cycle Bonus Generated</span>
                                    <span className="text-[9px] font-black text-emerald-600">{formatCurrency(partner.cycleCount * referralRate)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-rose-100 dark:bg-rose-900/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-rose-500 animate-pulse" style={{ width: `${Math.min(100, (partner.cycleCount / 5) * 100)}%` }} />
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                                        {users.find(u => u.id === partner.userId)?.avatarId ? getAvatarIcon(users.find(u => u.id === partner.userId)!.avatarId!) : <span className="text-[8px] font-black uppercase">{users.find(u => u.id === partner.userId)?.name.charAt(0)}</span>}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500">{users.find(u => u.id === partner.userId)?.name}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[9px] font-black text-rose-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
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

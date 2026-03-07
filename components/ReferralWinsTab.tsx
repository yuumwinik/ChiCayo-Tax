
import React, { useMemo } from 'react';
import { Appointment, Incentive, User, PayCycle, AppointmentStage } from '../types';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import { IconTrophy, IconActivity, IconClock, IconStar } from './Icons';

interface ReferralWinsTabProps {
    appointments: Appointment[];
    incentives: Incentive[];
    users: User[];
    payCycles: PayCycle[];
    referralRate: number;
    currentUser?: User;
    onViewAppt: (appt: Appointment, stack?: Appointment[]) => void;
}

export const ReferralWinsTab: React.FC<ReferralWinsTabProps> = ({
    appointments,
    incentives,
    users,
    payCycles,
    referralRate,
    currentUser,
    onViewAppt
}) => {
    const isMainAdmin = currentUser?.role === 'admin';

    const referralData = useMemo(() => {
        // Filter appointments that are activated
        const partners = appointments.filter(a => !!a.activatedAt);

        // Match incentives to partners
        return partners.map(p => {
            const partnerIncentives = incentives.filter(i => i.relatedAppointmentId === p.id);
            const totalEarned = partnerIncentives.reduce((sum, i) => sum + i.amountCents, 0);

            // Calculate velocity (days from onboard to activation)
            let velocityDays: number | null = null;
            if (p.onboardedAt && p.activatedAt) {
                const onboardedAt = new Date(p.onboardedAt).getTime();
                const activatedAt = new Date(p.activatedAt).getTime();
                velocityDays = Math.max(0, Math.floor((activatedAt - onboardedAt) / (1000 * 60 * 60 * 24)));
            }

            return {
                partnerId: p.id,
                partnerName: p.name,
                agentId: p.userId,
                agentName: users.find(u => u.id === p.userId)?.name || 'Unknown',
                activatedByUserId: p.activatedByUserId,
                activatedByName: users.find(u => u.id === p.activatedByUserId)?.name || 'System',
                referralCount: 1,
                totalEarned,
                onboardedAt: p.onboardedAt || p.scheduledAt,
                activatedAt: p.activatedAt,
                velocityDays,
                onboardType: p.originalOnboardType
            };
        }).sort((a, b) => new Date(b.activatedAt || 0).getTime() - new Date(a.activatedAt || 0).getTime());
    }, [appointments, incentives, users]);

    const stats = useMemo(() => {
        const totalReferrals = referralData.reduce((sum, d) => sum + d.referralCount, 0);
        const totalEarnings = referralData.reduce((sum, d) => sum + d.totalEarned, 0);
        const avgVelocity = referralData.filter(d => d.velocityDays !== null).reduce((sum, d) => sum + (d.velocityDays || 0), 0) / (referralData.filter(d => d.velocityDays !== null).length || 1);

        return { totalReferrals, totalEarnings, avgVelocity: Math.round(avgVelocity) };
    }, [referralData]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-slate-100 dark:text-slate-800 transition-transform group-hover:scale-110"><IconTrophy className="w-16 h-16" /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Activation Earnings</p>
                    <p className="text-4xl font-black text-emerald-600 tabular-nums">{formatCurrency(stats.totalEarnings)}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-slate-100 dark:text-slate-800 transition-transform group-hover:scale-110"><IconActivity className="w-16 h-16" /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Managed Activations</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{stats.totalReferrals}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-slate-100 dark:text-slate-800 transition-transform group-hover:scale-110"><IconClock className="w-16 h-16" /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Avg. Activation Velocity</p>
                    <p className="text-4xl font-black text-indigo-600 tabular-nums">{stats.avgVelocity} <span className="text-sm">Days</span></p>
                </div>
            </div>

            {/* Referral Timeline Feed */}
            <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest px-4">Partnership Activation Feed</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {referralData.map((data, idx) => (
                        <div
                            key={idx}
                            onClick={() => {
                                const appt = appointments.find(a => a.id === data.partnerId);
                                if (appt) onViewAppt(appt);
                            }}
                            className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:border-indigo-200 transition-all hover:shadow-lg group cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{data.partnerName}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Partner since {formatDate(data.onboardedAt)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-emerald-600">{formatCurrency(data.totalEarned)}</p>
                                    <div className="flex flex-col items-end">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Onboarded By: {data.agentName}</p>
                                        <p className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter mt-0.5 whitespace-nowrap">
                                            Activated By: {data.activatedByName}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline Graphic */}
                            <div className="relative h-12 flex items-center mb-6">
                                <div className="absolute inset-0 h-1 bg-slate-100 dark:bg-slate-800 top-1/2 -translate-y-1/2 rounded-full" />
                                <div className="relative flex justify-between w-full px-2">
                                    <div className="flex flex-col items-center gap-1 group/point">
                                        <div className="w-3 h-3 rounded-full bg-slate-400 border-2 border-white dark:border-slate-900 shadow-sm" />
                                        <span className="text-[8px] font-black text-slate-400 uppercase">Onboard</span>
                                    </div>
                                    {data.velocityDays !== null && (
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-3 h-3 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900 shadow-sm animate-pulse" />
                                            <span className="text-[8px] font-black text-indigo-500 uppercase">+{data.velocityDays}d Activation</span>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-4 h-4 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center"><IconStar className="w-2 h-2 text-white" /></div>
                                        <span className="text-[8px] font-black text-rose-500 uppercase">{data.referralCount} Activated</span>
                                    </div>
                                </div>
                            </div>

                            {/* Activation Context */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 overflow-hidden">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Activation Metrics</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] text-slate-500 font-bold block">SOURCE</span>
                                        <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white">{data.onboardType === 'self' ? 'Self Onboard' : 'AE Assisted'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 font-bold block">STATUS</span>
                                        <span className="text-[10px] font-black uppercase text-emerald-600">Successfully Activated</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

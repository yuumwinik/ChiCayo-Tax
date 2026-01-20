
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
}

export const ReferralWinsTab: React.FC<ReferralWinsTabProps> = ({
    appointments,
    incentives,
    users,
    payCycles,
    referralRate,
    currentUser
}) => {
    const isMainAdmin = currentUser?.role === 'admin';

    const referralData = useMemo(() => {
        // Filter appointments that have sent referrals
        const partners = appointments.filter(a => (a.referralCount || 0) > 0);

        // Match incentives to partners
        return partners.map(p => {
            const partnerIncentives = incentives.filter(i => i.relatedAppointmentId === p.id);
            const totalEarned = partnerIncentives.reduce((sum, i) => sum + i.amountCents, 0);

            // Calculate velocity (days from onboard to first referral)
            let velocityDays: number | null = null;
            if (p.referralHistory && p.referralHistory.length > 0) {
                const onboardedAt = new Date(p.onboardedAt || p.scheduledAt).getTime();
                const firstRefAt = new Date(p.referralHistory[0].date).getTime();
                velocityDays = Math.max(0, Math.floor((firstRefAt - onboardedAt) / (1000 * 60 * 60 * 24)));
            }

            return {
                partnerId: p.id,
                partnerName: p.name,
                agentId: p.userId,
                agentName: users.find(u => u.id === p.userId)?.name || 'Unknown',
                referralCount: p.referralCount || 0,
                totalEarned,
                onboardedAt: p.onboardedAt || p.scheduledAt,
                lastReferralAt: p.lastReferralAt,
                velocityDays,
                history: p.referralHistory || []
            };
        }).sort((a, b) => new Date(b.lastReferralAt || 0).getTime() - new Date(a.lastReferralAt || 0).getTime());
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
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Referral Earnings</p>
                    <p className="text-4xl font-black text-emerald-600 tabular-nums">{formatCurrency(stats.totalEarnings)}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-slate-100 dark:text-slate-800 transition-transform group-hover:scale-110"><IconActivity className="w-16 h-16" /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Managed Referrals</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{stats.totalReferrals}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-slate-100 dark:text-slate-800 transition-transform group-hover:scale-110"><IconClock className="w-16 h-16" /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Avg. Referral Velocity</p>
                    <p className="text-4xl font-black text-indigo-600 tabular-nums">{stats.avgVelocity} <span className="text-sm">Days</span></p>
                </div>
            </div>

            {/* Referral Timeline Feed */}
            <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest px-4">Partnership Referral Feed</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {referralData.map((data, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:border-indigo-200 transition-all hover:shadow-lg group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{data.partnerName}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Partner since {formatDate(data.onboardedAt)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-emerald-600">{formatCurrency(data.totalEarned)}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Agent: {data.agentName}</p>
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
                                            <span className="text-[8px] font-black text-indigo-500 uppercase">+{data.velocityDays}d First Ref</span>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-4 h-4 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center"><IconStar className="w-2 h-2 text-white" /></div>
                                        <span className="text-[8px] font-black text-rose-500 uppercase">{data.referralCount} Total</span>
                                    </div>
                                </div>
                            </div>

                            {/* Recent History Table */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 overflow-hidden">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">History Breakdown</p>
                                <div className="space-y-2">
                                    {data.history.slice().reverse().map((entry, eIdx) => (
                                        <div key={eIdx} className="flex justify-between items-center text-[10px] font-bold">
                                            <span className="text-slate-500">{formatDate(entry.date)}</span>
                                            <span className="text-indigo-600">Sent {entry.count} Referrals</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

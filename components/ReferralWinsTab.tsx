
import React, { useMemo, useState } from 'react';
import { Appointment, Incentive, User, PayCycle, AppointmentStage } from '../types';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import { IconTrophy, IconActivity, IconClock, IconStar, IconChevronDown } from './Icons';

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
    const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());

    const toggleCycle = (cycleId: string) => {
        const next = new Set(expandedCycles);
        if (next.has(cycleId)) next.delete(cycleId);
        else next.add(cycleId);
        setExpandedCycles(next);
    };

    const groupedReferralData = useMemo(() => {
        // Filter appointments that belong to the user or were activated by them
        const partners = appointments.filter(a => 
            a.stage === AppointmentStage.ACTIVATED && 
            (a.userId === currentUser?.id || a.activatedByUserId === currentUser?.id)
        );

        const data = partners.map(p => {
            const partnerIncentives = incentives.filter(i => i.relatedAppointmentId === p.id && i.label.toLowerCase().includes('activation'));
            const totalEarned = partnerIncentives.length > 0 ? partnerIncentives.reduce((sum, i) => sum + i.amountCents, 0) : referralRate;

            let velocityDays: number | null = null;
            if ((p.onboardedAt || p.scheduledAt) && p.activatedAt) {
                const onboardedAt = new Date(p.onboardedAt || p.scheduledAt).getTime();
                const activatedAt = new Date(p.activatedAt).getTime();
                velocityDays = Math.max(1, Math.ceil((activatedAt - onboardedAt) / (1000 * 60 * 60 * 24)));
            }

            // Find matching pay cycle
            const activatedTime = new Date(p.activatedAt || p.onboardedAt || p.scheduledAt).getTime();
            const cycle = payCycles.find(c => {
                const start = new Date(c.startDate).getTime();
                const end = new Date(c.endDate).setHours(23, 59, 59, 999);
                return activatedTime >= start && activatedTime <= end;
            });

            return {
                partnerId: p.id,
                partnerName: p.name,
                agentId: p.userId,
                agentName: users.find(u => u.id === p.userId)?.name || 'Unknown',
                activatedByUserId: p.activatedByUserId,
                activatedByName: users.find(u => u.id === p.activatedByUserId)?.name || 'System',
                totalEarned,
                onboardedAt: p.onboardedAt || p.scheduledAt,
                activatedAt: p.activatedAt,
                velocityDays,
                onboardType: p.originalOnboardType,
                cycleId: cycle?.id || 'unknown',
                cycleLabel: cycle ? `${formatDate(cycle.startDate)} - ${formatDate(cycle.endDate)}` : 'Outside Cycle'
            };
        });

        // Group by cycle
        const groups: Record<string, { label: string, items: typeof data }> = {};
        data.forEach(item => {
            if (!groups[item.cycleId]) {
                groups[item.cycleId] = { label: item.cycleLabel, items: [] };
            }
            groups[item.cycleId].items.push(item);
        });

        // Initialize expandedCycles with current active cycle or most recent cycle
        // (But only once, so we don't use useEffect here to keep it simple)

        // Sort items in each group by date
        Object.values(groups).forEach(g => {
            g.items.sort((a, b) => new Date(b.activatedAt || 0).getTime() - new Date(a.activatedAt || 0).getTime());
        });

        return groups;
    }, [appointments, incentives, users, currentUser, referralRate, payCycles]);

    const stats = useMemo(() => {
        const allItems = Object.values(groupedReferralData).flatMap(g => g.items);
        const totalReferrals = allItems.length;
        const totalEarnings = allItems.reduce((sum, d) => sum + d.totalEarned, 0);
        
        const allWithVelocity = allItems.filter(d => d.velocityDays !== null);
        const avgVelocity = allWithVelocity.length > 0
            ? allWithVelocity.reduce((sum, d) => sum + d.velocityDays!, 0) / allWithVelocity.length
            : 0;

        return { totalReferrals, totalEarnings, avgVelocity: Math.round(avgVelocity) };
    }, [groupedReferralData]);

    // UI: Default expand the first (most recent) group
    useMemo(() => {
        const keys = Object.keys(groupedReferralData);
        if (keys.length > 0 && expandedCycles.size === 0) {
            setExpandedCycles(new Set([keys[0]]));
        }
    }, [groupedReferralData]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-slate-100 dark:text-slate-800 transition-transform group-hover:scale-110"><IconTrophy className="w-16 h-16" /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Activation Earnings</p>
                    <p className="text-4xl font-black text-emerald-600 tabular-nums">{formatCurrency(stats.totalEarnings)}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-slate-100 dark:text-slate-800 transition-transform group-hover:scale-110"><IconActivity className="w-16 h-16" /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Activations</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{stats.totalReferrals}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-slate-100 dark:text-slate-800 transition-transform group-hover:scale-110"><IconClock className="w-16 h-16" /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Avg. Velocity</p>
                    <p className="text-4xl font-black text-indigo-600 tabular-nums">{stats.avgVelocity} <span className="text-sm">Days</span></p>
                </div>
            </div>

            {/* Referral Timeline Feed */}
            <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest px-4">Partnership Activation Feed</h3>
                
                <div className="space-y-4">
                    {Object.entries(groupedReferralData).sort((a, b) => {
                        if (a[0] === 'unknown') return 1;
                        if (b[0] === 'unknown') return -1;
                        return b[0].localeCompare(a[0]);
                    }).map(([cycleId, group]) => (
                        <div key={cycleId} className="space-y-3">
                            <button 
                                onClick={() => toggleCycle(cycleId)}
                                className="w-full flex items-center justify-between px-6 py-4 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{group.label}</span>
                                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg">{group.items.length} Activations</span>
                                </div>
                                <IconChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedCycles.has(cycleId) ? 'rotate-180' : ''}`} />
                            </button>

                            {expandedCycles.has(cycleId) && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                    {group.items.map((data) => (
                                        <div
                                            key={data.partnerId}
                                            onClick={() => {
                                                const appt = appointments.find(a => a.id === data.partnerId);
                                                if (appt) onViewAppt(appt);
                                            }}
                                            className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:border-indigo-200 transition-all hover:shadow-lg group cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{data.partnerName}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">ONBOARD: {formatDate(data.onboardedAt)}</span>
                                                        <span className="text-[9px] font-black bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded">ACT: {formatDate(data.activatedAt || '')}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-emerald-600">{formatCurrency(data.totalEarned)}</p>
                                                    <div className="flex flex-col items-end">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Owner: {data.agentName}</p>
                                                        <p className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter mt-0.5 whitespace-nowrap">
                                                            {data.activatedByUserId === currentUser?.id ? 'Activated By You' : `Activated By: ${data.activatedByName}`}
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
                                                        <span className="text-[8px] font-black text-slate-400 uppercase text-center">Onboard</span>
                                                    </div>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className={`w-3 h-3 rounded-full ${data.velocityDays !== null ? 'bg-indigo-500 animate-pulse' : 'bg-slate-200'} border-2 border-white dark:border-slate-900 shadow-sm`} />
                                                        <span className="text-[8px] font-black text-indigo-500 uppercase text-center">{data.velocityDays !== null ? `+${data.velocityDays}d` : '...'} Growth</span>
                                                    </div>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="w-4 h-4 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center"><IconStar className="w-2 h-2 text-white" /></div>
                                                        <span className="text-[8px] font-black text-rose-500 uppercase text-center">Activated</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Activation Context */}
                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 overflow-hidden">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Activation Metrics</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-[10px] text-slate-500 font-bold block">SOURCE</span>
                                                        <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white">
                                                            {data.onboardType === 'self' ? 'Self Onboard' : data.onboardType === 'transfer' ? 'AE Assisted' : 'Raw / Account Review'}
                                                        </span>
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
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

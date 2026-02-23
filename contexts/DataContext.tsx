import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Appointment, Incentive, IncentiveRule, User, PayCycle, ActivityLog, ReferralHistoryEntry, EarningWindow, AppointmentStage } from '../types';
import { generateId } from '../utils/dateUtils';
import { supabase } from '../utils/supabase';
import { useUser } from './UserContext';

interface DataContextType {
    allAppointments: Appointment[];
    allIncentives: Incentive[];
    allIncentiveRules: IncentiveRule[];
    allUsers: User[];
    payCycles: PayCycle[];
    activityLogs: ActivityLog[];
    commissionRate: number;
    selfCommissionRate: number;
    referralCommissionRate: number;
    commissionActivation: number;
    refreshData: () => Promise<void>;
    loadingData: boolean;
    setCommissionRate: (rate: number) => void;
    setSelfCommissionRate: (rate: number) => void;
    setReferralCommissionRate: (rate: number) => void;
    setCommissionActivation: (rate: number) => void;
    handleUpdateMasterCommissions: (standard: number, self: number, referral: number, activation: number) => Promise<void>;
    handleImportReferrals: (rows: { name: string, phone: string, referrals: number, date: string }[]) => Promise<void>;
    handleManualReferralUpdate: (clientId: string, newCount: number) => Promise<void>;
    handleDeleteReferralEntry: (clientId: string, entryId: string) => Promise<void>;
    handleSaveAppointment: (data: any) => Promise<void>;
    handleMoveStage: (id: string, stage: AppointmentStage, isManualSelfOnboard?: boolean) => Promise<void>;
    handleDeleteAppointment: (id: string) => Promise<void>;
    undoLastAction: () => Promise<void>;
    displayEarnings: { current: EarningWindow | null, history: EarningWindow[], lifetime: number };
    activeCycle: PayCycle | undefined;
    teamCurrentCycleTotal: number;
    performanceStats: {
        agentStats: Record<string, {
            onboards: number;
            activations: number;
            totalReferrals: number;
            ratio: string;
            avgDaysToActivate: string;
        }>;
    };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useUser();
    const [loadingData, setLoadingData] = useState(false);

    const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
    const [allIncentives, setAllIncentives] = useState<Incentive[]>([]);
    const [allIncentiveRules, setAllIncentiveRules] = useState<IncentiveRule[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [payCycles, setPayCycles] = useState<PayCycle[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [lastAction, setLastAction] = useState<{ id: string, stage: AppointmentStage, earnedAmount: number, onboardedAt?: string, notes?: string } | null>(null);

    // Settings
    const [commissionRate, setCommissionRate] = useState(200);
    const [selfCommissionRate, setSelfCommissionRate] = useState(300);
    const [referralCommissionRate, setReferralCommissionRate] = useState(200);
    const [commissionActivation, setCommissionActivation] = useState(1000);

    const refreshData = useCallback(async () => {
        // Ideally we might check if user is logged in, but some public data might be needed (rare here)
        // For now, we fetch if user exists, or if we want to support a public dashboard later.
        // The previous App.tsx refreshed data whenever called.

        setLoadingData(true);
        console.log("📡 DataContext: Refreshing data...");
        try {
            const [
                { data: users },
                { data: appointments },
                { data: cycles },
                { data: logs },
                { data: incentives },
                { data: rules },
                { data: settings }
            ] = await Promise.all([
                supabase.from('users').select('*'),
                supabase.from('appointments').select('*'),
                supabase.from('pay_cycles').select('*'),
                supabase.from('activity_logs').select('*'),
                supabase.from('incentives').select('*'),
                supabase.from('incentive_rules').select('*'),
                supabase.from('settings').select('*').eq('id', 'global').maybeSingle()
            ]);

            if (users) {
                setAllUsers(users.map(u => ({
                    ...u,
                    avatarId: u.avatar_id,
                    createdAt: u.created_at,
                    hasSeenTutorial: u.has_seen_tutorial,
                    notificationSettings: u.notification_settings,
                    preferredDialer: u.preferred_dialer,
                    dismissedCycleIds: u.dismissed_cycle_ids || []
                })));
            }

            if (appointments) {
                setAllAppointments(appointments.map(a => ({
                    ...a,
                    userId: a.user_id,
                    scheduledAt: a.scheduled_at,
                    createdAt: a.created_at,
                    earnedAmount: a.earned_amount,
                    aeName: a.ae_name,
                    referralCount: a.referral_count || 0,
                    lastReferralAt: a.last_referral_at,
                    referralHistory: (a.referral_history || []) as ReferralHistoryEntry[],
                    onboardedAt: a.onboarded_at,
                    activatedAt: a.activated_at,
                    originalUserId: a.original_user_id,
                    originalOnboardType: a.original_onboard_type,
                    originalAeName: a.original_ae_name
                })));
            }

            if (cycles) setPayCycles(cycles.map(c => ({ ...c, startDate: c.start_date, endDate: c.end_date })));
            if (logs) setActivityLogs(logs.map(l => ({ ...l, userId: l.user_id, userName: l.user_name, relatedId: l.related_id })));
            if (incentives) setAllIncentives(incentives.map(i => ({ ...i, userId: i.user_id, amountCents: i.amount_cents, appliedCycleId: i.applied_cycle_id, createdAt: i.created_at, relatedAppointmentId: i.related_appointment_id, ruleId: i.rule_id })));
            if (rules) setAllIncentiveRules(rules.map(r => ({ ...r, userId: r.user_id, type: r.type, valueCents: r.value_cents, startTime: r.start_time, endTime: r.end_time, targetCount: r.target_count, currentCount: r.current_count, isActive: r.is_active, createdAt: r.created_at })));

            if (settings) {
                setCommissionRate(settings.commission_standard);
                setSelfCommissionRate(settings.commission_self);
                setReferralCommissionRate(settings.commission_referral || 200);
                setCommissionActivation(settings.commission_activation || 1000);
            }
        } catch (e) {
            console.error("Data fetch error:", e);
        } finally {
            console.log("📡 DataContext: Data refresh complete.");
            setLoadingData(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        refreshData();
    }, [refreshData, user]); // Refetch when user changes (e.g. login)

    const handleUpdateMasterCommissions = async (standard: number, self: number, referral: number, activation: number) => {
        if (user?.role !== 'admin') return;
        const { error } = await supabase.from('settings').upsert({
            id: 'global',
            commission_standard: standard,
            commission_self: self,
            commission_referral: referral,
            commission_activation: activation,
            updated_at: new Date().toISOString()
        });
        if (error) { alert(`Sync Error: ${error.message}`); return; }

        setCommissionRate(standard);
        setSelfCommissionRate(self);
        setReferralCommissionRate(referral);
        setCommissionActivation(activation); // Added this line
        await refreshData();
    };

    const activeCycle = useMemo(() => {
        const n = Date.now();
        return payCycles.find(c => n >= new Date(c.startDate).getTime() && n <= new Date(c.endDate).setHours(23, 59, 59, 999));
    }, [payCycles]);

    const handleImportReferrals = async (rows: { name: string, phone: string, referrals: number, date: string }[]) => {
        if (user?.role !== 'admin') return;
        if (!activeCycle) {
            alert("No active Pay Cycle found. Please establish a Payout Window before importing reports.");
            return;
        }

        const now = new Date().toISOString();
        let matchedCount = 0;
        let newBonusTotal = 0;

        for (const row of rows) {
            const cleanName = row.name.toLowerCase().trim();
            const cleanPhone = row.phone.replace(/\D/g, '');

            const appt = allAppointments.find(a =>
                (a.stage === AppointmentStage.ONBOARDED) &&
                (a.name.toLowerCase().trim() === cleanName || a.phone.replace(/\D/g, '').includes(cleanPhone))
            );

            if (appt) {
                const currentRefs = appt.referralCount || 0;
                const newTotalRefsFromReport = row.referrals;
                const delta = newTotalRefsFromReport - currentRefs;

                if (delta > 0) {
                    const incentiveId = generateId();
                    const historyId = generateId();
                    const updatedHistory: ReferralHistoryEntry[] = [...(appt.referralHistory || []), { id: historyId, date: row.date || now, count: delta, incentiveId }];

                    await supabase.from('appointments').update({
                        referral_count: newTotalRefsFromReport,
                        last_referral_at: now,
                        referral_history: updatedHistory
                    }).eq('id', appt.id);

                    const bonusCents = delta * referralCommissionRate;
                    await supabase.from('incentives').insert({
                        id: incentiveId,
                        user_id: appt.userId,
                        amount_cents: bonusCents,
                        label: `Ref Bonus Delta: ${delta} Lead(s) from ${appt.name}`,
                        applied_cycle_id: activeCycle.id,
                        related_appointment_id: appt.id,
                        created_at: now
                    });

                    matchedCount++;
                    newBonusTotal += bonusCents;
                }
            }
        }

        alert(`Ledger Sync Complete.\n- Successfully matched ${matchedCount} partners.\n- Distributed ${((newBonusTotal / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' }))} in new referral bonuses.`);
        await refreshData();
    };

    const handleManualReferralUpdate = async (clientId: string, newCount: number) => {
        if (user?.role !== 'admin') return;
        if (!activeCycle) {
            alert("Active Pay Cycle Required.");
            return;
        }

        const appt = allAppointments.find(a => a.id === clientId);
        if (!appt) return;

        const current = appt.referralCount || 0;
        const delta = newCount - current;
        const now = new Date().toISOString();

        if (delta === 0) return;

        const incentiveId = generateId();
        const historyId = generateId();
        const updatedHistory: ReferralHistoryEntry[] = [...(appt.referralHistory || []), { id: historyId, date: now, count: delta, incentiveId }];

        await supabase.from('appointments').update({
            referral_count: newCount,
            last_referral_at: now,
            referral_history: updatedHistory
        }).eq('id', appt.id);

        if (delta > 0) {
            const bonusCents = delta * referralCommissionRate;
            await supabase.from('incentives').insert({
                id: incentiveId,
                user_id: appt.userId,
                amount_cents: bonusCents,
                label: `Manual Ref: ${delta} from ${appt.name}`,
                applied_cycle_id: activeCycle.id,
                related_appointment_id: appt.id,
                created_at: now
            });

            await supabase.from('activity_logs').insert({
                id: generateId(),
                user_id: user?.id,
                user_name: user?.name,
                action: 'REFERRAL_ADDED',
                details: `Added ${delta} referrals to ${appt.name} for agent ${allUsers.find(u => u.id === appt.userId)?.name}`,
                timestamp: now
            });
        }

        await refreshData();
    };

    const handleDeleteReferralEntry = async (clientId: string, entryId: string) => {
        if (user?.role !== 'admin') return;
        const appt = allAppointments.find(a => a.id === clientId);
        if (!appt || !appt.referralHistory) return;

        const entry = appt.referralHistory.find(e => e.id === entryId);
        if (!entry) return;

        const updatedHistory = appt.referralHistory.filter(e => e.id !== entryId);
        const newCount = Math.max(0, (appt.referralCount || 0) - entry.count);

        await Promise.all([
            supabase.from('appointments').update({
                referral_count: newCount,
                referral_history: updatedHistory,
                last_referral_at: newCount === 0 ? null : appt.lastReferralAt // Clear indicator if no referrals left
            }).eq('id', clientId),
            supabase.from('incentives').delete().eq('id', entry.incentiveId)
        ]);

        await supabase.from('activity_logs').insert({
            id: generateId(),
            user_id: user?.id,
            user_name: user?.name,
            action: 'REFERRAL_REMOVED',
            details: `Removed referral entry of ${entry.count} from ${appt.name}`,
            timestamp: new Date().toISOString()
        });

        await refreshData();
    };

    const processOnboardingIncentives = async (userId: string, appointmentId: string) => {
        const now = new Date();
        const nowISO = now.toISOString();
        let bonus = 0;
        const newIncentives = [];

        try {
            for (const rule of allIncentiveRules.filter(r => r.isActive)) {
                const isTargeted = rule.userId === 'team' || rule.userId === userId;
                const isTimed = (!rule.startTime || now >= new Date(rule.startTime)) && (!rule.endTime || now <= new Date(rule.endTime));
                const hasCount = rule.targetCount === undefined || (rule.currentCount || 0) < rule.targetCount;

                if (isTargeted && isTimed && hasCount) {
                    bonus += rule.valueCents;
                    newIncentives.push({
                        id: generateId(),
                        user_id: userId,
                        amount_cents: rule.valueCents,
                        label: rule.label,
                        applied_cycle_id: activeCycle?.id || null,
                        created_at: nowISO,
                        rule_id: rule.id,
                        related_appointment_id: appointmentId
                    });
                    await supabase.from('incentive_rules').update({ current_count: (rule.currentCount || 0) + 1 }).eq('id', rule.id);
                }
            }

            if (newIncentives.length > 0) {
                const { error } = await supabase.from('incentives').insert(newIncentives);
                if (error) console.error("Incentive insert error:", error);
            }
        } catch (err) {
            console.error("Error processing incentives:", err);
        }

        return bonus;
    };

    const handleSaveAppointment = async (data: any) => {
        if (!user) return;
        const originalAppt = data.id ? allAppointments.find(a => a.id === data.id) : null;
        let finalUserId = data.targetUserId || originalAppt?.userId || user.id;
        const targetProfile = allUsers.find(u => u.id === finalUserId);

        if (targetProfile?.role === 'admin' && !data.targetUserId) {
            const firstAgent = allUsers.find(u => u.role !== 'admin');
            finalUserId = firstAgent?.id || user.id;
        }

        const agent = allUsers.find(u => u.id === finalUserId);
        const isSelf = data.aeName && agent && data.aeName === agent.name;
        const baseRate = isSelf ? selfCommissionRate : commissionRate;
        const now = new Date();

        let bonus = 0;
        if (data.stage === AppointmentStage.ONBOARDED && !originalAppt?.onboardedAt) {
            const id = data.id || generateId();
            bonus = await processOnboardingIncentives(finalUserId, id);
        }

        if (originalAppt) {
            setLastAction({
                id: originalAppt.id,
                stage: originalAppt.stage,
                earnedAmount: originalAppt.earnedAmount || 0,
                onboardedAt: originalAppt.onboardedAt,
                notes: originalAppt.notes
            });
        }

        const dbData = {
            name: data.name,
            phone: data.phone,
            email: data.email,
            scheduled_at: data.scheduledAt,
            stage: data.stage,
            notes: data.notes,
            user_id: finalUserId,
            type: data.type || 'appointment',
            ae_name: data.aeName,
            earned_amount: data.stage === AppointmentStage.ONBOARDED ? baseRate : (data.stage === AppointmentStage.ACTIVATED ? commissionActivation : 0),
            referral_count: data.referralCount || 0,
            onboarded_at: (data.stage === AppointmentStage.ONBOARDED && !originalAppt?.onboardedAt) ? now.toISOString() : originalAppt?.onboardedAt,
            activated_at: (data.stage === AppointmentStage.ACTIVATED && !originalAppt?.activatedAt) ? now.toISOString() : originalAppt?.activatedAt,
            original_user_id: (data.stage === AppointmentStage.ACTIVATED && !originalAppt?.activatedAt && originalAppt?.userId !== finalUserId) ? originalAppt?.userId : (originalAppt?.originalUserId || null),
            original_onboard_type: (data.stage === AppointmentStage.ACTIVATED && !originalAppt?.activatedAt) ? (originalAppt?.aeName === (allUsers.find(u => u.id === originalAppt?.userId)?.name) ? 'self' : 'transfer') : (originalAppt?.originalOnboardType || null),
            original_ae_name: (data.stage === AppointmentStage.ACTIVATED && !originalAppt?.activatedAt) ? (originalAppt?.aeName || null) : (originalAppt?.originalAeName || null)
        };

        try {
            if (data.id) {
                const { error } = await supabase.from('appointments').update(dbData).eq('id', data.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('appointments').insert({ ...dbData, id: data.id || generateId(), created_at: now.toISOString() });
                if (error) throw error;
            }
            await refreshData();
        } catch (err: any) {
            console.error("Error saving appointment:", err);
            alert(`Failed to save appointment: ${err.message || 'Unknown error'}`);
        }
    };

    const handleMoveStage = async (id: string, stage: AppointmentStage, isManualSelfOnboard: boolean = false) => {
        console.log(`[DB_UPDATE] Moving appointment ${id} to stage: ${stage} (manual: ${isManualSelfOnboard})`);
        const appt = allAppointments.find(a => a.id === id);
        if (!appt) return;

        setLastAction({
            id: appt.id,
            stage: appt.stage,
            earnedAmount: appt.earnedAmount || 0,
            onboardedAt: appt.onboardedAt,
            notes: appt.notes
        });

        try {
            if (stage === AppointmentStage.ONBOARDED) {
                const agent = allUsers.find(u => u.id === appt.userId);
                const now = new Date().toISOString();

                let finalEarnedAmount = 0;
                let finalAeName = appt.aeName;

                if (isManualSelfOnboard) {
                    finalEarnedAmount = selfCommissionRate;
                    finalAeName = agent?.name || user?.name || 'Self';
                } else {
                    const isSelf = appt.aeName && agent && appt.aeName === agent.name;
                    finalEarnedAmount = isSelf ? selfCommissionRate : commissionRate;
                }

                await processOnboardingIncentives(appt.userId, id);

                const { error } = await supabase.from('appointments').update({
                    stage: AppointmentStage.ONBOARDED,
                    earned_amount: finalEarnedAmount,
                    ae_name: finalAeName,
                    onboarded_at: now
                }).eq('id', id);

                if (error) throw error;
                await refreshData();
                return;
            }
            if (stage === AppointmentStage.ACTIVATED) {
                const now = new Date().toISOString();
                const { error } = await supabase.from('appointments').update({
                    stage: AppointmentStage.ACTIVATED,
                    earned_amount: commissionActivation,
                    activated_at: now,
                    original_user_id: appt.originalUserId || appt.userId,
                    original_onboard_type: appt.originalOnboardType || (appt.aeName === (allUsers.find(u => u.id === appt.userId)?.name) ? 'self' : 'transfer'),
                    original_ae_name: appt.originalAeName || appt.aeName || null
                }).eq('id', id);
                if (error) throw error;
                await refreshData();
                return;
            }
            if (stage === AppointmentStage.DECLINED) {
                const nurtureDate = new Date();
                nurtureDate.setDate(nurtureDate.getDate() + 30);
                const { error } = await supabase.from('appointments').update({ stage, earned_amount: 0, nurture_date: nurtureDate.toISOString(), onboarded_at: null }).eq('id', id);
                if (error) throw error;
                await refreshData();
                return;
            }

            const { error } = await supabase.from('appointments').update({ stage, earned_amount: 0, onboarded_at: null }).eq('id', id);
            if (error) throw error;
            await refreshData();
        } catch (err: any) {
            console.error("Error moving stage:", err);
            alert(`Failed to move stage: ${err.message || 'Unknown error'}`);
        }
    };

    const undoLastAction = async () => {
        if (!lastAction) return;
        const { id, stage, earnedAmount, onboardedAt, notes } = lastAction;
        await supabase.from('appointments').update({
            stage,
            earned_amount: earnedAmount,
            onboarded_at: onboardedAt || null,
            notes: notes || null
        }).eq('id', id);
        setLastAction(null);
        await refreshData();
    };

    const handleDeleteAppointment = async (id: string) => {
        await supabase.from('appointments').delete().eq('id', id);
        await refreshData();
    };

    const displayEarnings = useMemo(() => {
        if (!user) return { current: null, history: [], lifetime: 0 };
        const isAdminMode = user.role === 'admin';
        const relevantAppts = isAdminMode ? allAppointments : allAppointments.filter(a => a.userId === user.id);
        const onboardedOnly = relevantAppts.filter(a => a.stage === AppointmentStage.ONBOARDED);
        const relevantIncentives = isAdminMode ? allIncentives : allIncentives.filter(i => i.userId === user.id || i.userId === 'team');

        const lifetime = onboardedOnly.reduce((s, a) => {
            const base = a.earnedAmount || 0;
            // Referral commissions are now handled via Incentives to ensure correct Cycle attribution
            return s + base;
        }, 0) + relevantIncentives.reduce((s, i) => s + i.amountCents, 0);

        const now = Date.now();
        const uniqueCycles = Array.from(payCycles.reduce<Map<string, PayCycle>>((acc, c) => {
            const k = new Date(c.startDate).toDateString(); if (!acc.has(k) || new Date(c.endDate) > new Date(acc.get(k)!.endDate)) acc.set(k, c); return acc;
        }, new Map<string, PayCycle>()).values());

        const windows: EarningWindow[] = [...uniqueCycles].sort((a: PayCycle, b: PayCycle) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()).reduce<EarningWindow[]>((acc: EarningWindow[], cycle: PayCycle) => {
            const start = new Date(cycle.startDate).getTime(); const end = new Date(cycle.endDate).setHours(23, 59, 59, 999);
            if (start > now) return acc;
            const cycleAppts = onboardedOnly.filter(a => {
                const d = new Date(a.onboardedAt || a.scheduledAt).getTime();
                return d >= start && d <= end;
            });
            const cycleIncentives = relevantIncentives.filter(i => i.appliedCycleId === cycle.id);

            const cycleProdTotal = cycleAppts.reduce((s, a) => {
                const base = a.earnedAmount || 0;
                // Referral commissions are in cycleIncentives
                return s + base;
            }, 0);

            acc.push({
                id: cycle.id,
                userId: isAdminMode ? 'team' : user.id,
                startDate: cycle.startDate,
                endDate: cycle.endDate,
                totalCents: cycleProdTotal + cycleIncentives.reduce((s, i) => s + i.amountCents, 0),
                onboardedCount: cycleAppts.length,
                isClosed: now > end,
                incentives: cycleIncentives
            });
            return acc;
        }, []);
        return { current: windows.find(w => !w.isClosed) || null, history: windows.filter(w => w.isClosed && !user.dismissedCycleIds?.includes(w.id)), lifetime };
    }, [user, allAppointments, allIncentives, payCycles, referralCommissionRate]);

    const teamCurrentCycleTotal = useMemo(() => {
        if (!activeCycle) return 0;
        const start = new Date(activeCycle.startDate).getTime();
        const end = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
        return allAppointments
            .filter(a => a.stage === AppointmentStage.ONBOARDED && new Date(a.onboardedAt || a.scheduledAt).getTime() >= start && new Date(a.onboardedAt || a.scheduledAt).getTime() <= end)
            .reduce((sum, a) => {
                const base = a.earnedAmount || 0;
                // Referral commissions are now Incentives
                return sum + base;
            }, 0) + allIncentives.filter(i => i.appliedCycleId === activeCycle.id).reduce((s, i) => s + i.amountCents, 0);
    }, [allAppointments, activeCycle, referralCommissionRate]);

    const performanceStats = useMemo(() => {
        const stats: Record<string, { onboards: number; activations: number; totalReferrals: number; ratio: string; avgDaysToActivate: string }> = {};

        allUsers.forEach(u => {
            const userAppts = allAppointments.filter(a => a.userId === u.id);
            const onboards = userAppts.filter(a => !!a.onboardedAt).length;
            const activations = userAppts.filter(a => a.stage === AppointmentStage.ACTIVATED).length;
            const totalReferrals = userAppts.reduce((sum, a) => sum + (a.referralCount || 0), 0);

            const ratio = onboards > 0 ? (totalReferrals / onboards).toFixed(1) : '0';

            const activationTimes = userAppts
                .filter(a => a.onboardedAt && a.activatedAt)
                .map(a => {
                    const diff = new Date(a.activatedAt!).getTime() - new Date(a.onboardedAt!).getTime();
                    return diff / (1000 * 60 * 60 * 24);
                });
            const avgDays = activationTimes.length > 0
                ? (activationTimes.reduce((s, t) => s + t, 0) / activationTimes.length).toFixed(1)
                : 'N/A';

            stats[u.id] = { onboards, activations, totalReferrals, ratio, avgDaysToActivate: avgDays };
        });

        return { agentStats: stats };
    }, [allAppointments, allUsers]);

    return (
        <DataContext.Provider value={{
            allAppointments,
            allIncentives,
            allIncentiveRules,
            allUsers,
            payCycles,
            activityLogs,
            commissionRate,
            selfCommissionRate,
            referralCommissionRate,
            commissionActivation,
            refreshData,
            loadingData,
            setCommissionRate,
            setSelfCommissionRate,
            setReferralCommissionRate,
            setCommissionActivation,
            handleUpdateMasterCommissions,
            handleImportReferrals,
            handleManualReferralUpdate,
            handleDeleteReferralEntry,
            handleSaveAppointment,
            handleMoveStage,
            handleDeleteAppointment,
            undoLastAction,
            displayEarnings,
            activeCycle,
            teamCurrentCycleTotal,
            performanceStats
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

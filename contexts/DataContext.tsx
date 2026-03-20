import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Appointment, Incentive, IncentiveRule, User, PayCycle, ActivityLog, ReferralHistoryEntry, EarningWindow, AppointmentStage, Reminder } from '../types';
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
    reminders: Reminder[];
    handleConvertReminderToAppointment: (reminder: Reminder, stage: AppointmentStage) => Promise<void>;
    handleSaveReminder: (data: Partial<Reminder>) => Promise<void>;
    handleDeleteReminder: (id: string) => Promise<void>;
    refreshData: () => Promise<void>;
    loadingData: boolean;
    setCommissionRate: (rate: number) => void;
    setSelfCommissionRate: (rate: number) => void;
    setReferralCommissionRate: (rate: number) => void;
    setCommissionActivation: (rate: number) => void;
    handleUpdateMasterCommissions: (standard: number, self: number, referral: number, activation: number) => Promise<void>;
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
            selfActivations: number;
            crossActivations: number;
            wasActivatedByOthers: number;
            selfOnboardActivations: number;
            aeAssistedActivations: number;
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
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [lastAction, setLastAction] = useState<{ id: string, stage: AppointmentStage, earnedAmount: number, onboardedAt?: string, notes?: string } | null>(null);

    // Settings
    const [commissionRate, setCommissionRate] = useState(200);
    const [selfCommissionRate, setSelfCommissionRate] = useState(300);
    const [referralCommissionRate, setReferralCommissionRate] = useState(0);
    const [commissionActivation, setCommissionActivation] = useState(1000);

    const getCycleForDate = useCallback((date: Date | string | number) => {
        const d = new Date(date).getTime();
        return payCycles.find(c => {
            const start = new Date(c.startDate).getTime();
            const end = new Date(c.endDate).setHours(23, 59, 59, 999);
            return d >= start && d <= end;
        });
    }, [payCycles]);

    const refreshData = useCallback(async () => {
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
                { data: settings },
                { data: dbReminders }
            ] = await Promise.all([
                supabase.from('users').select('*'),
                supabase.from('appointments').select('*'),
                supabase.from('pay_cycles').select('*'),
                supabase.from('activity_logs').select('*'),
                supabase.from('incentives').select('*'),
                supabase.from('incentive_rules').select('*'),
                supabase.from('settings').select('*').eq('id', 'global').maybeSingle(),
                supabase.from('reminders').select('*')
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
                    earnedAmount: Math.min(a.earned_amount || 0, 300), 
                    aeName: a.ae_name,
                    referralCount: a.referral_count || 0,
                    lastReferralAt: a.last_referral_at,
                    referralHistory: (a.referral_history || []) as ReferralHistoryEntry[],
                    onboardedAt: a.onboarded_at,
                    activatedAt: a.activated_at,
                    originalUserId: a.original_user_id,
                    originalOnboardType: a.original_onboard_type,
                    originalAeName: a.original_ae_name,
                    loggedMode: a.logged_mode as 'onboard' | 'activation' | 'transfer' | undefined
                })));
            }

            if (cycles) setPayCycles(cycles.map(c => ({ ...c, startDate: c.start_date, endDate: c.end_date })));
            if (logs) setActivityLogs(logs.map(l => ({ ...l, userId: l.user_id, userName: l.user_name, relatedId: l.related_id })));
            if (incentives) setAllIncentives(incentives.map(i => {
                const isActivation = (i.label || '').toLowerCase().includes('activat');
                return {
                    ...i,
                    userId: i.user_id,
                    amountCents: isActivation ? Math.min(i.amount_cents || 0, 1000) : (i.amount_cents || 0),
                    appliedCycleId: i.applied_cycle_id,
                    createdAt: i.created_at,
                    relatedAppointmentId: i.related_appointment_id,
                    ruleId: i.rule_id
                };
            }));
            if (rules) setAllIncentiveRules(rules.map(r => ({ ...r, userId: r.user_id, type: r.type, valueCents: r.value_cents, startTime: r.start_time, endTime: r.end_time, targetCount: r.target_count, currentCount: r.current_count, isActive: r.is_active, createdAt: r.created_at })));
            if (dbReminders) {
                setReminders(dbReminders.map(r => ({
                    id: r.id,
                    userId: r.user_id,
                    name: r.name,
                    phone: r.phone,
                    email: r.email,
                    callBackAt: r.call_back_at,
                    notes: r.notes,
                    isPendingActivation: r.is_pending_activation || false,
                    createdAt: r.created_at
                })));
            }
            if (settings) {
                setCommissionRate(settings.commission_standard);
                setSelfCommissionRate(settings.commission_self);
                setReferralCommissionRate(settings.commission_referral ?? 0);
                setCommissionActivation(Math.min(settings.commission_activation || 1000, 1000));
            }
        } catch (e) {
            console.error("Data fetch error:", e);
        } finally {
            console.log("📡 DataContext: Data refresh complete.");
            setLoadingData(false);
        }
    }, []);

    const handleSaveReminder = useCallback(async (data: Partial<Reminder>) => {
        if (!user) return;
        const id = data.id || generateId();
        const now = new Date().toISOString();

        const dbReminder = {
            id,
            user_id: user.id,
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || '',
            call_back_at: data.callBackAt || now,
            notes: data.notes || '',
            is_pending_activation: data.isPendingActivation || false,
            created_at: data.createdAt || now
        };

        const { error } = await supabase.from('reminders').upsert(dbReminder);
        if (error) {
            console.error("Error saving reminder:", error);
            return;
        }
        await refreshData();
    }, [user, refreshData]);

    const handleDeleteReminder = useCallback(async (id: string) => {
        if (!user) return;
        const { error } = await supabase.from('reminders').delete().eq('id', id).eq('user_id', user.id);
        if (error) {
            console.error("❌ DataContext: Error deleting reminder:", error.message);
            return;
        }
        await refreshData();
    }, [user, refreshData]);

    const activeCycle = useMemo(() => {
        return getCycleForDate(Date.now());
    }, [payCycles, getCycleForDate]);

    const handleConvertReminderToAppointment = useCallback(async (reminder: Reminder, stage: AppointmentStage) => {
        if (!user) return;
        const now = new Date();
        const targetId = generateId();
        let earnedAmount = 0;
        if (stage === AppointmentStage.ONBOARDED) {
            earnedAmount = commissionRate;
        } else if (stage === AppointmentStage.ACTIVATED) {
            earnedAmount = 0;
        }
        const dbData = {
            id: targetId,
            name: reminder.name,
            phone: reminder.phone,
            email: reminder.email,
            scheduled_at: reminder.callBackAt,
            stage,
            notes: reminder.notes,
            user_id: user.id,
            type: 'reminder_conversion',
            earned_amount: earnedAmount,
            onboarded_at: (stage === AppointmentStage.ONBOARDED || stage === AppointmentStage.ACTIVATED) ? now.toISOString() : null,
            activated_at: stage === AppointmentStage.ACTIVATED ? now.toISOString() : null,
            logged_mode: stage === AppointmentStage.ACTIVATED ? 'activation' : 'onboard',
            created_at: now.toISOString()
        };
        const { error } = await supabase.from('appointments').insert(dbData);
        if (error) {
            console.error("Error converting reminder:", error);
            return;
        }
        if (stage === AppointmentStage.ACTIVATED && activeCycle) {
            await supabase.from('incentives').insert({
                id: generateId(),
                user_id: user.id,
                amount_cents: Math.min(commissionActivation, 1000),
                label: `Partner Activation: ${reminder.name}`,
                applied_cycle_id: activeCycle.id,
                related_appointment_id: targetId,
                created_at: now.toISOString()
            });
        }
        if (reminder.id) {
            await supabase.from('reminders').delete().eq('id', reminder.id);
        }
        await refreshData();
    }, [user, commissionRate, commissionActivation, activeCycle, refreshData]);

    useEffect(() => {
        refreshData();
    }, [refreshData, user]);

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
        if (error) return;

        setCommissionRate(standard);
        setSelfCommissionRate(self);
        setReferralCommissionRate(referral);
        setCommissionActivation(activation);
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
                await supabase.from('incentives').insert(newIncentives);
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
        const targetId = data.id || generateId();

        if (data.stage === AppointmentStage.ONBOARDED && !originalAppt?.onboardedAt) {
            bonus = await processOnboardingIncentives(finalUserId, targetId);
        }

        const eventDate = ((data.stage === AppointmentStage.ONBOARDED || data.stage === AppointmentStage.ACTIVATED) && !originalAppt?.onboardedAt) ? now.toISOString() : (originalAppt?.onboardedAt || now.toISOString());
        const activatedDate = (data.stage === AppointmentStage.ACTIVATED && !originalAppt?.activatedAt) ? now.toISOString() : (originalAppt?.activatedAt || now.toISOString());

        if (data.stage === AppointmentStage.ACTIVATED && !originalAppt?.activatedAt) {
            const targetCycle = getCycleForDate(activatedDate);
            if (targetCycle) {
                const rewardRecipientId = (data.type === 'activation' || data.logMode === 'activation') ? user.id : (data.targetUserId || originalAppt?.userId || user.id);
                const existing = allIncentives.find(i => i.relatedAppointmentId === targetId && i.label.toLowerCase().includes('activat'));
                if (!existing) {
                    await supabase.from('incentives').insert({
                        id: generateId(),
                        user_id: rewardRecipientId,
                        amount_cents: Math.min(commissionActivation, 1000),
                        label: `Partner Activation: ${data.name}`,
                        applied_cycle_id: targetCycle.id,
                        related_appointment_id: targetId,
                        created_at: activatedDate
                    });
                }
            }
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
            earned_amount: (data.stage === AppointmentStage.ONBOARDED || (data.stage === AppointmentStage.ACTIVATED && data.logMode !== 'activation')) ? baseRate : 0,
            referral_count: (data.stage === AppointmentStage.ACTIVATED) ? (data.referralCount || 1) : (data.referralCount || 0),
            onboarded_at: eventDate,
            activated_at: activatedDate,
            activated_by_user_id: (data.stage === AppointmentStage.ACTIVATED) ? user.id : (originalAppt?.activatedByUserId || null),
            original_user_id: (data.stage === AppointmentStage.ACTIVATED && !originalAppt?.activatedAt && originalAppt?.userId !== finalUserId) ? originalAppt?.userId : (originalAppt?.originalUserId || null),
            original_onboard_type: (data.stage === AppointmentStage.ACTIVATED && !originalAppt?.activatedAt) ? (originalAppt?.aeName === (allUsers.find(u => u.id === originalAppt?.userId)?.name) ? 'self' : 'transfer') : (originalAppt?.originalOnboardType || null),
            original_ae_name: (data.stage === AppointmentStage.ACTIVATED && !originalAppt?.activatedAt) ? (originalAppt?.aeName || null) : (originalAppt?.originalAeName || null),
            logged_mode: data.logMode || (originalAppt?.loggedMode || undefined)
        };

        try {
            if (data.id) {
                await supabase.from('appointments').update(dbData).eq('id', data.id);
            } else {
                await supabase.from('appointments').insert({ ...dbData, id: targetId, created_at: now.toISOString() });
            }
            await refreshData();
        } catch (err: any) {
            console.error("Error saving appointment:", err);
        }
    };

    const handleMoveStage = async (id: string, stage: AppointmentStage, isManualSelfOnboard: boolean = false) => {
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
            if (stage !== AppointmentStage.ACTIVATED) {
                await supabase.from('incentives').delete().eq('related_appointment_id', id).ilike('label', '%Activation%');
            }

            const isNowOnboarded = stage === AppointmentStage.ONBOARDED || stage === AppointmentStage.ACTIVATED;
            const agentProfile = allUsers.find(u => u.id === appt.userId);
            const isSelf = isManualSelfOnboard || (appt.aeName && agentProfile && appt.aeName === agentProfile.name);
            const baseCommission = isSelf ? selfCommissionRate : commissionRate;

            if (stage === AppointmentStage.ONBOARDED && appt.stage !== AppointmentStage.ONBOARDED) {
                await processOnboardingIncentives(appt.userId, id);
            }

            if (stage === AppointmentStage.ACTIVATED && appt.stage !== AppointmentStage.ACTIVATED) {
                const nowISO = new Date().toISOString();
                const targetCycle = getCycleForDate(nowISO);
                if (targetCycle) {
                    const existing = allIncentives.find(i => i.relatedAppointmentId === id && i.label.toLowerCase().includes('activat'));
                    if (!existing) {
                        await supabase.from('incentives').insert({
                            id: generateId(),
                            user_id: appt.userId,
                            amount_cents: Math.min(commissionActivation, 1000),
                            label: `Partner Activation: ${appt.name}`,
                            applied_cycle_id: targetCycle.id,
                            related_appointment_id: id,
                            created_at: nowISO
                        });
                    }
                }
            }

            const updateProps: any = {
                stage,
                earned_amount: isNowOnboarded ? baseCommission : 0,
                onboarded_at: isNowOnboarded ? (appt.onboardedAt || new Date().toISOString()) : null,
                activated_at: (stage === AppointmentStage.ACTIVATED) ? (appt.activatedAt || new Date().toISOString()) : null,
                activated_by_user_id: (stage === AppointmentStage.ACTIVATED) ? user?.id : appt.activatedByUserId,
                referral_count: (stage === AppointmentStage.ACTIVATED) ? (appt.referralCount || 1) : 0,
                last_referral_at: (stage === AppointmentStage.ACTIVATED) ? (appt.lastReferralAt || new Date().toISOString()) : null,
                ae_name: isSelf ? (agentProfile?.name || 'Self') : appt.aeName,
                logged_mode: stage === AppointmentStage.ACTIVATED ? (appt.loggedMode || 'transfer') : appt.loggedMode
            };

            await supabase.from('appointments').update(updateProps).eq('id', id);
            await refreshData();
        } catch (err: any) {
            console.error("Error moving stage:", err);
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
        const onboardedOnly = relevantAppts.filter(a => a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED);
        const relevantIncentives = isAdminMode ? allIncentives : allIncentives.filter(i => i.userId === user.id || (i.userId === 'team' && isAdminMode));

        const lifetime = onboardedOnly.reduce((s, a) => s + (a.earnedAmount || 0), 0) + relevantIncentives.reduce((s, i) => s + i.amountCents, 0);

        const now = Date.now();
        const uniqueCycles = Array.from(payCycles.reduce<Map<string, PayCycle>>((acc, c) => {
            const k = new Date(c.startDate).toDateString(); if (!acc.has(k) || new Date(c.endDate) > new Date(acc.get(k)!.endDate)) acc.set(k, c); return acc;
        }, new Map<string, PayCycle>()).values());

        const windows: EarningWindow[] = [...uniqueCycles].sort((a: PayCycle, b: PayCycle) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()).reduce<EarningWindow[]>((acc: EarningWindow[], cycle: PayCycle) => {
            const start = new Date(cycle.startDate).getTime(); const end = new Date(cycle.endDate).setHours(23, 59, 59, 999);
            if (start > now) return acc;

            const cycleAppts = onboardedOnly.filter(a => {
                const d = new Date(a.activatedAt || a.onboardedAt || a.scheduledAt).getTime();
                return d >= start && d <= end;
            });

            const cycleIncentives = relevantIncentives.filter(i => i.appliedCycleId === cycle.id);

            acc.push({
                id: cycle.id,
                userId: isAdminMode ? 'team' : user.id,
                startDate: cycle.startDate,
                endDate: cycle.endDate,
                totalCents: cycleAppts.reduce((s, a) => s + (a.earnedAmount || 0), 0) + cycleIncentives.reduce((s, i) => s + i.amountCents, 0),
                onboardedCount: cycleAppts.length,
                isClosed: now > end,
                incentives: cycleIncentives
            });
            return acc;
        }, []);
        return { current: windows.find(w => !w.isClosed) || null, history: windows.filter(w => w.isClosed && !user.dismissedCycleIds?.includes(w.id)), lifetime };
    }, [user, allAppointments, allIncentives, payCycles]);

    const teamCurrentCycleTotal = useMemo(() => {
        if (!activeCycle) return 0;
        const start = new Date(activeCycle.startDate).getTime();
        const end = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
        return allAppointments
            .filter(a => (a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED) && new Date(a.onboardedAt || a.scheduledAt).getTime() >= start && new Date(a.onboardedAt || a.scheduledAt).getTime() <= end)
            .reduce((sum, a) => sum + (a.earnedAmount || 0), 0) + allIncentives.filter(i => i.appliedCycleId === activeCycle.id).reduce((s, i) => s + i.amountCents, 0);
    }, [allAppointments, activeCycle, allIncentives]);

    const performanceStats = useMemo(() => {
        const stats: Record<string, {
            onboards: number; activations: number; selfActivations: number; crossActivations: number; wasActivatedByOthers: number; selfOnboardActivations: number; aeAssistedActivations: number; ratio: string; avgDaysToActivate: string
        }> = {};
        allUsers.forEach(u => {
            const userOnboards = allAppointments.filter(a => a.userId === u.id && !!a.onboardedAt);
            const activationsDoneByMe = allAppointments.filter(a => a.activatedByUserId === u.id);
            const ratio = userOnboards.length > 0 ? (userOnboards.filter(a => !!a.activatedAt).length / userOnboards.length * 100).toFixed(0) + '%' : '0%';
            stats[u.id] = {
                onboards: userOnboards.length,
                activations: activationsDoneByMe.length,
                selfActivations: activationsDoneByMe.filter(a => a.userId === u.id).length,
                crossActivations: activationsDoneByMe.filter(a => a.userId !== u.id).length,
                wasActivatedByOthers: userOnboards.filter(a => !!a.activatedAt && a.activatedByUserId !== u.id).length,
                selfOnboardActivations: activationsDoneByMe.filter(a => a.originalOnboardType === 'self').length,
                aeAssistedActivations: activationsDoneByMe.filter(a => a.originalOnboardType !== 'self').length,
                ratio,
                avgDaysToActivate: 'N/A'
            };
        });
        return { agentStats: stats };
    }, [allAppointments, allUsers]);

    return (
        <DataContext.Provider value={{
            allAppointments, allIncentives, allIncentiveRules, allUsers, payCycles, activityLogs,
            commissionRate, selfCommissionRate, referralCommissionRate, commissionActivation, reminders,
            handleConvertReminderToAppointment, handleSaveReminder, handleDeleteReminder, refreshData, loadingData,
            setCommissionRate, setSelfCommissionRate, setReferralCommissionRate, setCommissionActivation, handleUpdateMasterCommissions,
            handleSaveAppointment, handleMoveStage, handleDeleteAppointment, undoLastAction, displayEarnings, activeCycle,
            teamCurrentCycleTotal, performanceStats
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) throw new Error('useData must be used within a DataProvider');
    return context;
};

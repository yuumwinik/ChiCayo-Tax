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
    const [reminders, setReminders] = useState<Reminder[]>(() => {
        const saved = localStorage.getItem('agent_reminders');
        return saved ? JSON.parse(saved) : [];
    });
    const [lastAction, setLastAction] = useState<{ id: string, stage: AppointmentStage, earnedAmount: number, onboardedAt?: string, notes?: string } | null>(null);

    // Settings
    const [commissionRate, setCommissionRate] = useState(200);
    const [selfCommissionRate, setSelfCommissionRate] = useState(300);
    const [referralCommissionRate, setReferralCommissionRate] = useState(0);
    const [commissionActivation, setCommissionActivation] = useState(1000);

    const getCycleForDate = (date: Date | string | number) => {
        const d = new Date(date).getTime();
        return payCycles.find(c => {
            const start = new Date(c.startDate).getTime();
            const end = new Date(c.endDate).setHours(23, 59, 59, 999);
            return d >= start && d <= end;
        });
    };

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
                    earnedAmount: Math.min(a.earned_amount || 0, 300), // Safety cap: max $3.00
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
                    amountCents: isActivation ? Math.min(i.amount_cents || 0, 1000) : (i.amount_cents || 0), // Cap activation at $10
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
            }            if (settings) {
                setCommissionRate(settings.commission_standard);
                setSelfCommissionRate(settings.commission_self);
                setReferralCommissionRate(settings.commission_referral ?? 0);
                setCommissionActivation(Math.min(settings.commission_activation || 1000, 1000));
            }

            // Maintenance & Data Integrity
            if (incentives && appointments && cycles) {
                const payCyclesForRepair = cycles.map((c: any) => ({ id: c.id, startDate: c.start_date, endDate: c.end_date }));

                const getCycleForDateLocal = (date: string | null | undefined) => {
                    if (!date) return null;
                    const d = new Date(date).getTime();
                    return payCyclesForRepair.find((c: any) => {
                        const start = new Date(c.startDate).getTime();
                        const end = new Date(c.endDate).setHours(23, 59, 59, 999);
                        return d >= start && d <= end;
                    }) || null;
                };

                let repairsMade = false;

                // 1. Remove duplicate activation incentives per appointment
                const seenApptIds = new Set<string>();
                const duplicates = incentives.filter((i: any) => {
                    if (!i.related_appointment_id || !i.label?.toLowerCase().includes('activat')) return false;
                    if (seenApptIds.has(i.related_appointment_id)) return true;
                    seenApptIds.add(i.related_appointment_id);
                    return false;
                });
                if (duplicates.length > 0) {
                    console.warn(`[REPAIR] Removing ${duplicates.length} duplicate activation records.`);
                    for (const d of duplicates) {
                        await supabase.from('incentives').delete().eq('id', d.id);
                    }
                    repairsMade = true;
                }

                // 2. Re-pin incentives to cycle matching actual activation event date
                const freshIncentives = duplicates.length > 0
                    ? (await supabase.from('incentives').select('*')).data || incentives
                    : incentives;

                for (const i of freshIncentives) {
                    if (!i.label?.toLowerCase().includes('activat')) continue;
                    const appt = appointments.find((a: any) => a.id === i.related_appointment_id);

                    // Use the appointment's own timestamps as source of truth.
                    // activated_at -> onboarded_at -> scheduled_at (in that priority order).
                    // NEVER use i.created_at alone because backfilled records have today's date.
                    const eventDate = appt?.activated_at || appt?.onboarded_at || appt?.scheduled_at;
                    if (!eventDate) continue;

                    const correctCycle = getCycleForDateLocal(eventDate);
                    if (correctCycle && correctCycle.id !== i.applied_cycle_id) {
                        console.warn(`[REPAIR] Re-pinning incentive ${i.id}: cycle ${i.applied_cycle_id} → ${correctCycle.id} (appt event: ${eventDate})`);
                        await supabase.from('incentives').update({ applied_cycle_id: correctCycle.id }).eq('id', i.id);
                        repairsMade = true;
                    }
                    // Fix user_id if mismatched
                    if (appt && appt.user_id && appt.user_id !== i.user_id) {
                        await supabase.from('incentives').update({ user_id: appt.user_id }).eq('id', i.id);
                        repairsMade = true;
                    }
                    // Cap oversized amounts
                    if ((i.amount_cents || 0) > 1000) {
                        await supabase.from('incentives').update({ amount_cents: 1000 }).eq('id', i.id);
                        repairsMade = true;
                    }
                }

                // 3. If any repairs were made, re-fetch incentives so in-memory state is accurate
                if (repairsMade) {
                    const { data: freshFixed } = await supabase.from('incentives').select('*');
                    if (freshFixed) {
                        setAllIncentives(freshFixed.map((i: any) => {
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
                    }
                }
            }
        } catch (e) {
            console.error("Data fetch error:", e);
        } finally {
            console.log("📡 DataContext: Data refresh complete.");
            setLoadingData(false);
        }
    }, []);

    // LocalStorage fallback removed - now uses Supabase
    /*
    useEffect(() => {
        localStorage.setItem('agent_reminders', JSON.stringify(reminders));
    }, [reminders]);
    */

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
        console.log(`[DELETE] Removing reminder ${id} for user ${user.id}`);
        const { error } = await supabase.from('reminders').delete().eq('id', id).eq('user_id', user.id);
        if (error) {
            console.error("❌ DataContext: Error deleting reminder:", error.message, error.details);
            alert(`Failed to delete reminder: ${error.message}`);
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
            // Usually, activations from reminders skip the initial onboard commission 
            // and earn only the activation reward.
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
            alert(`Failed to convert reminder: ${error.message}`);
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

    // Import referrals and manual referral functions removed

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
        const targetId = data.id || generateId();

        if (data.stage === AppointmentStage.ONBOARDED && !originalAppt?.onboardedAt) {
            bonus = await processOnboardingIncentives(finalUserId, targetId);
        }

        const eventDate = ((data.stage === AppointmentStage.ONBOARDED || data.stage === AppointmentStage.ACTIVATED) && !originalAppt?.onboardedAt) ? now.toISOString() : (originalAppt?.onboardedAt || now.toISOString());
        const activatedDate = (data.stage === AppointmentStage.ACTIVATED && !originalAppt?.activatedAt) ? now.toISOString() : (originalAppt?.activatedAt || now.toISOString());

        if (data.stage === AppointmentStage.ACTIVATED && !originalAppt?.activatedAt) {
            const targetCycle = getCycleForDate(activatedDate);
            if (targetCycle) {
                // Only create if one doesn't exist for this ID
                const existing = allIncentives.find(i => i.relatedAppointmentId === targetId && i.label.toLowerCase().includes('activat'));
                if (!existing) {
                    const activationBonus = Math.min(commissionActivation, 1000); 
                    await supabase.from('incentives').insert({
                        id: generateId(),
                        user_id: finalUserId,
                        amount_cents: activationBonus,
                        label: `Partner Activation: ${data.name}`,
                        applied_cycle_id: targetCycle.id,
                        related_appointment_id: targetId,
                        created_at: activatedDate
                    });
                }
            } else {
                console.warn('Cannot assign activation bonus: Date falls outside defined pay cycles.');
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
            // Skip base commission if explicitly logging a new activation (skipping onboard fee)
            earned_amount: (data.stage === AppointmentStage.ONBOARDED || (data.stage === AppointmentStage.ACTIVATED && data.logMode !== 'activation')) ? baseRate : 0,
            referral_count: (data.stage === AppointmentStage.ACTIVATED) ? (data.referralCount || 1) : (data.referralCount || 0),
            onboarded_at: eventDate,
            activated_at: activatedDate,
            original_user_id: (data.stage === AppointmentStage.ACTIVATED && !originalAppt?.activatedAt && originalAppt?.userId !== finalUserId) ? originalAppt?.userId : (originalAppt?.originalUserId || null),
            original_onboard_type: (data.stage === AppointmentStage.ACTIVATED && !originalAppt?.activatedAt) ? (originalAppt?.aeName === (allUsers.find(u => u.id === originalAppt?.userId)?.name) ? 'self' : 'transfer') : (originalAppt?.originalOnboardType || null),
            original_ae_name: (data.stage === AppointmentStage.ACTIVATED && !originalAppt?.activatedAt) ? (originalAppt?.aeName || null) : (originalAppt?.originalAeName || null),
            logged_mode: data.logMode || (originalAppt?.loggedMode || undefined)
        };

        try {
            if (data.id) {
                const { error } = await supabase.from('appointments').update(dbData).eq('id', data.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('appointments').insert({ ...dbData, id: targetId, created_at: now.toISOString() });
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
            // 1. Data Integrity: Ensure no activation bonus if NOT in ACTIVATED stage
            if (stage !== AppointmentStage.ACTIVATED) {
                console.log(`[DATA_CLEANUP] Ensuring no activation bonuses exist for ${id} (Stage: ${stage})`);
                await supabase.from('incentives').delete().eq('related_appointment_id', id).ilike('label', '%Activation%');
            }

            // 2. Determine target values
            const isNowOnboarded = stage === AppointmentStage.ONBOARDED || stage === AppointmentStage.ACTIVATED;
            const isNeutral = stage === AppointmentStage.PENDING || stage === AppointmentStage.RESCHEDULED || stage === AppointmentStage.TRANSFERRED || stage === AppointmentStage.NO_SHOW;
            const agentProfile = allUsers.find(u => u.id === appt.userId);
            const isSelf = isManualSelfOnboard || (appt.aeName && agentProfile && appt.aeName === agentProfile.name);
            const baseCommission = isSelf ? selfCommissionRate : commissionRate;

            // 3. Handle Special Stage logic (Incentives/Rewards)
            if (stage === AppointmentStage.ONBOARDED && appt.stage !== AppointmentStage.ONBOARDED) {
                await processOnboardingIncentives(appt.userId, id);
            }

            if (stage === AppointmentStage.ACTIVATED && appt.stage !== AppointmentStage.ACTIVATED) {
                const nowISO = new Date().toISOString();
                const targetCycle = getCycleForDate(nowISO);
                if (!targetCycle) throw new Error("Event date falls outside any defined Payout Window");
                
                // Only insert if no activation incentive already exists for this appointment
                const existing = allIncentives.find(i => i.relatedAppointmentId === id && i.label.toLowerCase().includes('activat'));
                if (!existing) {
                    await supabase.from('incentives').insert({
                        id: generateId(),
                        user_id: appt.userId,
                        amount_cents: Math.min(commissionActivation, 1000), // Hard-cap $10
                        label: `Partner Activation: ${appt.name}`,
                        applied_cycle_id: targetCycle.id,
                        related_appointment_id: id,
                        created_at: nowISO
                    });
                }
            }

            // 4. Update the Appointment Record
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

            const { error: updateError } = await supabase.from('appointments').update(updateProps).eq('id', id);
            if (updateError) throw updateError;

            await refreshData();
        } catch (err: any) {
            console.error("Error moving stage:", err);
            alert(`Failed: ${err.message || 'Unknown error'}`);
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

            // Onboard appointments: use onboardedAt. Activated appointments: use activatedAt.
            // This is the same logic as UserAnalytics - must be consistent.
            const cycleAppts = onboardedOnly.filter(a => {
                if (a.stage === AppointmentStage.ACTIVATED) {
                    const d = new Date(a.activatedAt || a.onboardedAt || a.scheduledAt).getTime();
                    return d >= start && d <= end;
                }
                const d = new Date(a.onboardedAt || a.scheduledAt).getTime();
                return d >= start && d <= end;
            });

            // Incentives: filter by appliedCycleId first, then cross-validate activation
            // incentives against the linked appointment's actual closing date.
            const cycleIncentives = relevantIncentives.filter(i => {
                if (i.appliedCycleId !== cycle.id) return false;
                // Cross-validate activation incentives against appointment date
                if (i.label?.toLowerCase().includes('activat') && i.relatedAppointmentId) {
                    const linkedAppt = onboardedOnly.find(a => a.id === i.relatedAppointmentId)
                        || relevantAppts.find(a => a.id === i.relatedAppointmentId);
                    if (linkedAppt) {
                        const eventDate = new Date(linkedAppt.activatedAt || linkedAppt.onboardedAt || linkedAppt.scheduledAt || 0).getTime();
                        return eventDate >= start && eventDate <= end;
                    }
                }
                return true;
            });

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
            .filter(a => (a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED) && new Date(a.onboardedAt || a.scheduledAt).getTime() >= start && new Date(a.onboardedAt || a.scheduledAt).getTime() <= end)
            .reduce((sum, a) => {
                const base = a.earnedAmount || 0;
                // Referral commissions are now Incentives
                return sum + base;
            }, 0) + allIncentives.filter(i => i.appliedCycleId === activeCycle.id).reduce((s, i) => s + i.amountCents, 0);
    }, [allAppointments, activeCycle, referralCommissionRate]);

    const performanceStats = useMemo(() => {
        const stats: Record<string, {
            onboards: number;
            activations: number;
            selfActivations: number;
            crossActivations: number;
            wasActivatedByOthers: number;
            selfOnboardActivations: number;
            aeAssistedActivations: number;
            ratio: string;
            avgDaysToActivate: string
        }> = {};

        allUsers.forEach(u => {
            const userOnboards = allAppointments.filter(a => a.userId === u.id && !!a.onboardedAt);
            const activationsDoneByMe = allAppointments.filter(a => a.activatedByUserId === u.id);

            const onboards = userOnboards.length;
            const activations = activationsDoneByMe.length;

            const selfActivations = activationsDoneByMe.filter(a => a.userId === u.id).length;
            const crossActivations = activationsDoneByMe.filter(a => a.userId !== u.id).length;
            const wasActivatedByOthers = userOnboards.filter(a => !!a.activatedAt && a.activatedByUserId !== u.id).length;

            const selfOnboardActivations = activationsDoneByMe.filter(a => a.originalOnboardType === 'self').length;
            const aeAssistedActivations = activationsDoneByMe.filter(a => a.originalOnboardType !== 'self').length;

            const myOnboardsActivated = userOnboards.filter(a => !!a.activatedAt).length;
            const ratio = onboards > 0 ? (myOnboardsActivated / onboards * 100).toFixed(0) + '%' : '0%';

            const activationTimes = activationsDoneByMe
                .filter(a => a.onboardedAt && a.activatedAt)
                .map(a => {
                    const diff = new Date(a.activatedAt!).getTime() - new Date(a.onboardedAt!).getTime();
                    return diff / (1000 * 60 * 60 * 24);
                });
            const avgDays = activationTimes.length > 0
                ? (activationTimes.reduce((s, t) => s + t, 0) / activationTimes.length).toFixed(1)
                : 'N/A';

            stats[u.id] = {
                onboards,
                activations,
                selfActivations,
                crossActivations,
                wasActivatedByOthers,
                selfOnboardActivations,
                aeAssistedActivations,
                ratio,
                avgDaysToActivate: avgDays
            };
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
            reminders,
            handleSaveReminder,
            handleDeleteReminder,
            handleConvertReminderToAppointment,
            refreshData,
            loadingData,
            setCommissionRate,
            setSelfCommissionRate,
            setReferralCommissionRate,
            setCommissionActivation,
            handleUpdateMasterCommissions,
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

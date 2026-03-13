
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Appointment, AppointmentStage, EarningWindow, STAGE_LABELS, View, User, TeamMember, PayCycle, AvatarId, ActivityLog, Incentive, IncentiveRule, STAGE_COLORS, ACCOUNT_EXECUTIVES, ReferralHistoryEntry, Reminder } from './types';
import { AppointmentCard } from './components/AppointmentCard';
import { AppointmentModal } from './components/AppointmentModal';
import { EarningsPanel } from './components/EarningsPanel';
import { Sidebar } from './components/Sidebar';
import { CalendarView } from './components/CalendarView';
import { OnboardedView } from './components/OnboardedView';
import { EarningsFullView } from './components/EarningsFullView';
import { AuthScreen } from './components/AuthScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { ProfileView } from './components/ProfileView';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { TaxterChat } from './components/TaxterChat';
import { TutorialOverlay } from './components/TutorialOverlay';
import { UserAnalytics } from './components/UserAnalytics';
import { EducationCenter } from './components/EducationCenter';
import { RemindersView } from './components/RemindersView';
import { NotificationPods } from './components/NotificationPods';
import { IconMenu, IconMoon, IconPlus, IconSearch, IconSun, getAvatarIcon, IconTrash, IconTrophy, IconSparkles, IconTransfer, IconActivity, IconX, IconCheck, IconClock, IconAlertCircle, IconAlertTriangle, IconLayout, IconDollarSign } from './components/Icons';

import { ReminderModal } from './components/ReminderModal';
import { calculatePeakTime } from './utils/analyticsUtils';
import { generateId, formatDate, formatCurrency } from './utils/dateUtils';
import { CreateModal } from './components/CreateModal';
import { AESelectionModal } from './components/AESelectionModal';
import { BusinessCardModal } from './components/BusinessCardModal';
import { WeeklyRecapModal } from './components/WeeklyRecapModal';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { ReferralMomentumWidget } from './components/ReferralMomentumWidget';
import { supabase } from './utils/supabase';
import { CardStack } from './components/CardStack';
import { GlobalWinTicker } from './components/GlobalWinTicker';
import { useUser } from './contexts/UserContext';
import { useData } from './contexts/DataContext';
import { ErrorBoundary } from 'react-error-boundary';

const ErrorFallback = ({ error, resetErrorBoundary }: any) => {
    return (
        <div role="alert" className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <h2 className="text-lg font-bold">Something went wrong:</h2>
            <pre className="text-sm mt-2">{error.message}</pre>
            <button onClick={resetErrorBoundary} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Try again</button>
        </div>
    );
};

const DeveloperHealthCheck: React.FC<{ activeCycle?: PayCycle; appointments: Appointment[]; hasApiKey: boolean }> = ({ activeCycle, appointments, hasApiKey }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsVisible(!isVisible)}
                className="fixed bottom-24 left-6 z-[110] p-3 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-white/10 text-white/50 hover:text-white transition-all shadow-xl"
                title="Developer Status"
            >
                <IconActivity className="w-5 h-5" />
            </button>
            <div className={`fixed bottom-40 left-6 z-[110] transition-all duration-500 origin-bottom-left ${isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0 pointer-events-none'}`}>
                <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl w-72 space-y-6 text-white">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Dev Mode Monitor</h3>
                        <button onClick={() => setIsVisible(false)} className="text-white/30 hover:text-white"><IconX className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Active Cycle</span>
                                <span className="text-[8px] text-slate-500 font-medium">Required for Earnings</span>
                            </div>
                            <span className={`text-[10px] px-3 py-1 rounded-lg font-black ${activeCycle ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {activeCycle ? 'LIVE' : 'MISSING'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Groq AI API</span>
                                <span className="text-[8px] text-slate-500 font-medium">VITE_GROQ_API_KEY</span>
                            </div>
                            <span className={`text-[10px] px-3 py-1 rounded-lg font-black ${hasApiKey ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {hasApiKey ? 'READY' : 'UNSET'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Synced Leads</span>
                                <span className="text-[8px] text-slate-500 font-medium">Database Count</span>
                            </div>
                            <span className="text-xs font-black tabular-nums">{appointments.length}</span>
                        </div>
                    </div>

                    {!activeCycle && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                            <p className="text-[10px] text-amber-500 leading-relaxed font-bold">
                                ⚠️ No active pay cycle detected. "Onboard" and "Failed" buttons may save data but won't show in Cycle Stats.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

const KEYS = { THEME: 'chicayo_dark_mode', LAST_VIEW: 'chicayo_last_view_v3', TICKER: 'chicayo_ticker_visible' };

export default function App() {
    const { user, loadingAuth, isAdmin, refreshUser, setUser } = useUser();
    const {
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
        handleUpdateMasterCommissions,
        handleSaveAppointment,
        handleMoveStage: moveStageInContext,
        handleDeleteAppointment,
        undoLastAction,
        displayEarnings,
        activeCycle,
        teamCurrentCycleTotal,
        performanceStats,
        handleSaveReminder,
        handleDeleteReminder,
        handleConvertReminderToAppointment,
        reminders
    } = useData();

    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isTickerVisible, setIsTickerVisible] = useState(() => {
        const saved = localStorage.getItem(KEYS.TICKER);
        return saved === 'true';
    });

    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [isOverDeleteZone, setIsOverDeleteZone] = useState(false);
    const [isEarningsPanelOpen, setIsEarningsPanelOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
    const [viewingAppt, setViewingAppt] = useState<Appointment | null>(null);
    const [activeStack, setActiveStack] = useState<Appointment[]>([]);
    const [isBusinessCardOpen, setIsBusinessCardOpen] = useState(false);
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
    const [darkMode, setDarkMode] = useState(false);
    const [forceTutorial, setForceTutorial] = useState(false);
    const [isAEModalOpen, setIsAEModalOpen] = useState(false);
    const [pendingMove, setPendingMove] = useState<{ id: string, stage: AppointmentStage } | null>(null);

    // notification center removed per request

    // conversion helper for reminder modal
    const handleConvertReminderModal = async (data: Partial<Reminder>, stage: AppointmentStage) => {
        try {
            await handleConvertReminderToAppointment(data as Reminder, stage);
            addToast('Converted to appointment', 'success');
            setIsReminderModalOpen(false);
        } catch (err) {
            addToast(`Error converting reminder: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        }
    };
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    const [highlightedReminderIdForPulse, setHighlightedReminderIdForPulse] = useState<string | null>(null);

    const [referralAlert, setReferralAlert] = useState<{ id: string, count: number, totalCents: number, clientName: string } | null>(null);
    const [seenReferralIds, setSeenReferralIds] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('seen_referral_ids');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    const [activeCelebration, setActiveCelebration] = useState<any>(null);
    const [isWeeklyRecapOpen, setIsWeeklyRecapOpen] = useState(false);
    const [toasts, setToasts] = useState<{ id: string, message: string, type: 'success' | 'error' | 'info' }[]>([]);

    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    const [achievements, setAchievements] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('achievements_v2');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    useEffect(() => {
        const savedTheme = localStorage.getItem(KEYS.THEME);
        if (savedTheme) setDarkMode(JSON.parse(savedTheme));

        // Handle initial view based on role if no saved view
        if (user && !sessionStorage.getItem(KEYS.LAST_VIEW)) {
            setCurrentView(user.role === 'admin' ? 'admin-dashboard' : 'dashboard');
        } else {
            const lastView = sessionStorage.getItem(KEYS.LAST_VIEW) as View;
            if (lastView as string === 'training') {
                setCurrentView('education');
                sessionStorage.setItem(KEYS.LAST_VIEW, 'education');
            } else {
                setCurrentView(lastView);
            }
        }
    }, [user]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                undoLastAction();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undoLastAction]);

    useEffect(() => {
        localStorage.setItem(KEYS.THEME, JSON.stringify(darkMode));
        if (darkMode) {
            document.documentElement.classList.add('dark');
            document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#020617');
        } else {
            document.documentElement.classList.remove('dark');
            document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f8fafc');
        }
    }, [darkMode]);

    useEffect(() => {
        if (!user || user.role === 'admin') return;

        const newActivations = allIncentives.filter(i =>
            i.userId === user.id &&
            i.label.toLowerCase().includes('activation') &&
            !seenReferralIds.has(i.id)
        );

        if (newActivations.length > 0) {
            const latest = newActivations[newActivations.length - 1];
            const clientName = latest.label.replace('Partner Activation: ', '') || 'A partner';

            setReferralAlert(prev => prev ? prev : {
                id: latest.id,
                clientName: clientName,
                count: 1,
                totalCents: latest.amountCents
            });
        }
    }, [allIncentives, user, seenReferralIds]);

    useEffect(() => {
        if (!user || user.role === 'admin') return;

        const checkMilestones = () => {
            const onboarded = allAppointments.filter(a => a.userId === user.id && (a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED));
            const activated = allAppointments.filter(a => a.userId === user.id && (a.stage === AppointmentStage.ACTIVATED || a.stage === AppointmentStage.TRANSFERRED));
            const selfOnboarded = onboarded.filter(a => !a.aeName || a.aeName === user.name);
            const lifetimeCents = displayEarnings.lifetime;

            const newAchievements = new Set(achievements);
            let triggered: any = null;

            if (onboarded.length >= 100 && !achievements.has('100_ONBOARDS')) {
                triggered = '100_ONBOARDS';
            } else if (selfOnboarded.length >= 100 && !achievements.has('100_SELF')) {
                triggered = '100_SELF';
            } else if (lifetimeCents >= 100000 && !achievements.has('1000_EARNINGS')) {
                triggered = '1000_EARNINGS';
            } else if (lifetimeCents >= 50000 && !achievements.has('500_EARNINGS')) {
                triggered = '500_EARNINGS';
            } else if (activated.length >= 10 && !achievements.has('ACTIVATION_10')) {
                triggered = 'ACTIVATION_10';
            } else if (activated.length >= 5 && !achievements.has('ACTIVATION_5')) {
                triggered = 'ACTIVATION_5';
            } else if (activated.length >= 1 && !achievements.has('FIRST_ACTIVATION')) {
                triggered = 'FIRST_ACTIVATION';
            }

            if (triggered) {
                newAchievements.add(triggered);
                setAchievements(newAchievements);
                localStorage.setItem('achievements_v2', JSON.stringify([...newAchievements]));
                setActiveCelebration(triggered);
            }
        };

        const checkFridayRecap = () => {
            const now = new Date();
            const isFriday = now.getDay() === 5;
            const isRecapTime = now.getHours() === 16 && now.getMinutes() >= 45;

            if (isFriday && isRecapTime) {
                const weekKey = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`;
                const lastRecap = localStorage.getItem('last_recap_week');
                if (lastRecap !== weekKey) {
                    setIsWeeklyRecapOpen(true);
                    localStorage.setItem('last_recap_week', weekKey);
                }
            }
        };

        checkMilestones();
        const interval = setInterval(checkFridayRecap, 60000);
        return () => clearInterval(interval);
    }, [allAppointments, user, displayEarnings.lifetime, achievements]);

    useEffect(() => {
        if (!user || user.role === 'admin') return;

        const checkMilestones = () => {
            const onboarded = allAppointments.filter(a => a.userId === user.id && (a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED));
            const activated = allAppointments.filter(a => a.userId === user.id && (a.stage === AppointmentStage.ACTIVATED || a.stage === AppointmentStage.TRANSFERRED));
            const selfOnboarded = onboarded.filter(a => !a.aeName || a.aeName === user.name);
            const lifetimeCents = displayEarnings.lifetime;

            const newAchievements = new Set(achievements);
            let triggered: any = null;

            if (onboarded.length >= 100 && !achievements.has('100_ONBOARDS')) {
                triggered = '100_ONBOARDS';
            } else if (selfOnboarded.length >= 100 && !achievements.has('100_SELF')) {
                triggered = '100_SELF';
            } else if (lifetimeCents >= 100000 && !achievements.has('1000_EARNINGS')) {
                triggered = '1000_EARNINGS';
            } else if (lifetimeCents >= 50000 && !achievements.has('500_EARNINGS')) {
                triggered = '500_EARNINGS';
            } else if (activated.length >= 10 && !achievements.has('ACTIVATION_10')) {
                triggered = 'ACTIVATION_10';
            } else if (activated.length >= 5 && !achievements.has('ACTIVATION_5')) {
                triggered = 'ACTIVATION_5';
            } else if (activated.length >= 1 && !achievements.has('FIRST_ACTIVATION')) {
                triggered = 'FIRST_ACTIVATION';
            }

            if (triggered) {
                newAchievements.add(triggered);
                setAchievements(newAchievements);
                localStorage.setItem('achievements_v2', JSON.stringify([...newAchievements]));
                setActiveCelebration(triggered);
            }
        };

        const checkFridayRecap = () => {
            const now = new Date();
            const isFriday = now.getDay() === 5;
            const isRecapTime = now.getHours() === 16 && now.getMinutes() >= 45;

            if (isFriday && isRecapTime) {
                const weekKey = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`;
                const lastRecap = localStorage.getItem('last_recap_week');
                if (lastRecap !== weekKey) {
                    setIsWeeklyRecapOpen(true);
                    localStorage.setItem('last_recap_week', weekKey);
                }
            }
        };

        checkMilestones();
        const interval = setInterval(checkFridayRecap, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [allAppointments, user, displayEarnings.lifetime, achievements]);

    const handleDismissReferral = () => {
        if (referralAlert) {
            const next = new Set(seenReferralIds).add(referralAlert.id);
            setSeenReferralIds(next);
            localStorage.setItem('seen_referral_ids', JSON.stringify([...next]));
            setReferralAlert(null);
        }
    };

    const handleSaveApptWrapper = async (data: any) => {
        try {
            await handleSaveAppointment(data);
            addToast(`Successfully ${data.id ? 'updated' : 'saved'} record`, 'success');
            setEditingAppt(null);
        } catch (err) {
            addToast(`Error saving: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        }
    };

    const handleSaveReminderWrapper = async (data: Partial<Reminder>) => {
        try {
            await handleSaveReminder(data);
            addToast(`Reminder ${data.id ? 'updated' : 'saved'}`, 'success');
            setIsReminderModalOpen(false);
        } catch (err) {
            addToast(`Error saving reminder: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        }
    };

    const handleDeleteReminderWrapper = async (id: string) => {
        try {
            await handleDeleteReminder(id);
            addToast('Reminder removed', 'info');
        } catch (err) {
            addToast(`Error deleting reminder: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        }
    };

    const handleMoveStage = async (id: string, stage: AppointmentStage, isManualSelfOnboard: boolean = false) => {
        console.log(`[DATA] Moving appointment ${id} to stage: ${stage} (manual: ${isManualSelfOnboard})`);
        const appt = allAppointments.find(a => a.id === id); if (!appt) return;
        if (stage === AppointmentStage.RESCHEDULED) { setEditingAppt(appt); setIsRescheduling(true); setIsModalOpen(true); return; }

        if (stage === AppointmentStage.ONBOARDED && appt.stage !== AppointmentStage.TRANSFERRED && !isManualSelfOnboard) {
            setPendingMove({ id, stage: AppointmentStage.TRANSFERRED });
            setIsAEModalOpen(true);
            return;
        }

        try {
            await moveStageInContext(id, stage, isManualSelfOnboard);
            addToast(`Successfully moved to ${STAGE_LABELS[stage] || stage}`, 'success');
        } catch (err) {
            addToast(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        }
    };

    const handleOpenReminderModal = (reminder?: Reminder) => {
        setEditingReminder(reminder || null);
        setIsReminderModalOpen(true);
    };

    const handleOpenBusinessCard = (appt: Appointment, stack?: Appointment[]) => {
        setViewingAppt(appt);
        setActiveStack(stack || [appt]);
        setIsBusinessCardOpen(true);
    };

    const navigateStack = (direction: 'next' | 'prev') => {
        if (!viewingAppt || activeStack.length <= 1) return;
        const currentIndex = activeStack.findIndex(a => a.id === viewingAppt.id);
        if (currentIndex === -1) return;
        let nextIndex: number;
        if (direction === 'next') nextIndex = (currentIndex + 1) % activeStack.length;
        else nextIndex = (currentIndex - 1 + activeStack.length) % activeStack.length;
        setViewingAppt(activeStack[nextIndex]);
    };

    const handleExportCycleLedger = () => {
        if (!activeCycle) return;
        const onboarded = (isAdmin ? allAppointments : allAppointments.filter(a => a.userId === user?.id)).filter(a => {
            if (a.stage !== AppointmentStage.ONBOARDED && a.stage !== AppointmentStage.ACTIVATED) return false;
            const start = new Date(activeCycle.startDate).getTime();
            const end = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
            const onboardedTime = new Date(a.onboardedAt || a.scheduledAt).getTime();
            return onboardedTime >= start && onboardedTime <= end;
        });

        const headers = ["ID", "Onboard/Activated Date", "Client", "Phone", "AE Name", "Type", "Referral Count", "Activation Reward", "Commission", "Total Payout", "Notes"];
        const rows = onboarded.map(a => {
            const isSelf = !a.aeName || a.aeName === user?.name;
            const baseCommission = (a.earnedAmount || 0);
            const refBonus = (a.referralCount || 0) * referralCommissionRate;
            const incEntives = allIncentives.filter(i => i.relatedAppointmentId === a.id);
            const incTotal = incEntives.reduce((sum, i) => sum + i.amountCents, 0);
            const total = baseCommission + refBonus + incTotal;

            return [
                a.id,
                formatDate(a.onboardedAt || a.scheduledAt),
                a.name.replace(/,/g, ""),
                a.phone,
                a.aeName || 'Self',
                a.stage === AppointmentStage.ACTIVATED ? 'Activated Partner' : (isSelf ? 'Self Onboard' : 'AE Transfer'),
                a.referralCount || 0,
                a.stage === AppointmentStage.ACTIVATED ? (commissionActivation / 100).toFixed(2) : "0.00",
                (baseCommission / 100).toFixed(2),
                (total / 100).toFixed(2),
                (a.notes || "").replace(/,/g, ";")
            ].join(",");
        });

        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cycle_ledger_${user?.name.replace(/\s+/g, '_')}_${formatDate(activeCycle.startDate).split(',')[0]}.csv`;
        link.click();
    };

    if (!user) return <AuthScreen onLogin={async (u) => { setUser(u); refreshData(); }} />;
    
    const hasApiKey = !!import.meta.env.VITE_GROQ_API_KEY;

    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <div className="h-screen flex bg-slate-50 dark:bg-slate-950 overflow-hidden app-container">
                {/* Removed Developer Health Check for both agents and admins */}
                {referralAlert && (
                    <div
                        className="fixed inset-0 z-[300] flex items-center justify-center bg-indigo-950/80 backdrop-blur-md animate-in fade-in duration-500 p-6 cursor-pointer"
                        onClick={handleDismissReferral}
                    >
                        <div
                            className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 text-center max-w-sm shadow-2xl relative overflow-hidden group cursor-default"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-indigo-500/10 animate-pulse" />
                            <div className="relative z-10">
                                <div className="w-24 h-24 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce shadow-xl">
                                    <IconTrophy className="w-12 h-12" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Activation Win!</h2>
                                <p className="text-slate-500 dark:text-slate-400 font-bold mb-8">
                                    You just activated <span className="text-indigo-600 dark:text-indigo-400 font-black">{referralAlert.clientName}</span>!
                                </p>
                                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 mb-8">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">New Bonus</p>
                                    <p className="text-4xl font-black text-emerald-600 tabular-nums">{formatCurrency(referralAlert.totalCents)}</p>
                                </div>
                                <button
                                    onClick={handleDismissReferral}
                                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-sm"
                                >
                                    Sweet! Back to Work
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <TutorialOverlay isOpen={!user.hasSeenTutorial || forceTutorial} userRole={user.role} onComplete={async () => { setUser({ ...user, hasSeenTutorial: true }); await supabase.from('users').update({ has_seen_tutorial: true }).eq('id', user.id); setForceTutorial(false); }} />
                <Sidebar currentView={currentView} onChangeView={v => { setCurrentView(v); sessionStorage.setItem(KEYS.LAST_VIEW, v); }} isOpen={isSidebarOpen} onCloseMobile={() => setIsSidebarOpen(false)} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} onLogout={() => setUser(null)} userRole={user.role} userName={user.name} userAvatar={user.avatarId} isTickerVisible={isTickerVisible} onToggleTicker={() => setIsTickerVisible(!isTickerVisible)} />
                <div className="flex-1 flex flex-col min-w-0" onDragOver={e => e.preventDefault()}>
                    <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-40 flex-shrink-0">
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                            {/* Mobile Menu Button - Always accessible */}
                            <button 
                              onClick={() => setIsSidebarOpen(true)} 
                              className="mobile-menu-btn p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:scale-105 active:scale-95 transition-all flex-shrink-0 lg:hidden" 
                              title="Open menu"
                            >
                              <IconMenu className="w-5 h-5" />
                            </button>
                            {/* Search - Hidden on small screens but preserves layout */}
                            <div className="relative group hidden sm:block flex-1">
                                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
                                <input type="text" placeholder="Search partners..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2.5 pl-11 pr-8 text-sm font-bold w-full focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-900 dark:text-white" />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                        <IconX className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 ml-auto flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all outline-none" title="Toggle dark mode">
                                {darkMode ? <IconSun className="w-5 h-5" /> : <IconMoon className="w-5 h-5" />}
                            </button>
                            <div id="wallet-pill" className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-black text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all outline-none border border-emerald-400 shadow-md cursor-pointer whitespace-nowrap" onClick={() => setIsEarningsPanelOpen(true)}>
                                <IconDollarSign className="w-4 h-4" />
                                {formatCurrency(displayEarnings.current?.totalCents || 0)}
                            </div>
                            <button onClick={() => setCurrentView('profile')} className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-100 dark:shadow-none hover:scale-105 active:scale-95 transition-all outline-none overflow-hidden flex-shrink-0" title="Profile">
                                {user.avatarId && user.avatarId !== 'initial' ? <div className="w-7 h-7">{getAvatarIcon(user.avatarId)}</div> : user.name.charAt(0).toUpperCase()}
                            </button>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto no-scrollbar relative">
                        {loadingAuth ? <div className="h-full flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
                            : currentView === 'education' ? <EducationCenter />
                                : currentView === 'reminders' ? <RemindersView onOpenModal={handleOpenReminderModal} onDeleteReminder={handleDeleteReminderWrapper} onSaveAppointment={handleSaveApptWrapper} onConvertReminderToAppointment={handleConvertReminderToAppointment} />
                                    : currentView === 'profile' ? <ProfileView onReplayTutorial={() => setForceTutorial(true)} totalEarnings={displayEarnings.lifetime} totalOnboarded={allAppointments.filter(a => (isAdmin ? true : a.userId === user?.id) && (a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED)).length} />
                                        : currentView === 'admin-dashboard' ? <AdminDashboard
                                            members={allUsers.map((u: User) => ({
                                                ...u,
                                                status: 'active',
                                                onboardedCount: allAppointments.filter(a => a.userId === u.id && (a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED)).length,
                                                totalEarnings: 0,
                                                lastActive: u.createdAt || new Date().toISOString()
                                            }))}
                                            payCycles={payCycles}
                                            onAddCycle={(s, e) => {
                                                supabase.from('pay_cycles').insert({ start_date: s, end_date: e, status: 'upcoming' }).then(() => refreshData());
                                            }}
                                            onEditCycle={(id, s, e) => {
                                                supabase.from('pay_cycles').update({ start_date: s, end_date: e }).eq('id', id).then(() => refreshData());
                                            }}
                                            onDeleteCycle={(id) => {
                                                supabase.from('pay_cycles').delete().eq('id', id).then(() => refreshData());
                                            }}
                                            onUpdateMasterCommissions={handleUpdateMasterCommissions}
                                            onViewAppt={handleOpenBusinessCard}
                                            activeCycle={activeCycle}
                                            appointments={allAppointments}
                                            allUsers={allUsers}
                                            performanceStats={performanceStats}
                                            allIncentives={allIncentives}
                                            incentiveRules={allIncentiveRules}
                                            commissionRate={commissionRate}
                                            selfCommissionRate={selfCommissionRate}
                                            referralRate={referralCommissionRate}
                                            activationRate={commissionActivation}
                                        />
                                            : currentView === 'user-analytics' ? <div className="p-6 max-w-6xl mx-auto"><UserAnalytics appointments={allAppointments.filter(a => a.userId === user?.id)} allAppointments={allAppointments} allIncentives={allIncentives} earnings={displayEarnings} activeCycle={activeCycle} payCycles={payCycles} currentUserName={user?.name || ''} currentUser={user!} referralRate={referralCommissionRate} users={allUsers} onViewAppt={handleOpenBusinessCard} /></div>
                                                : currentView === 'calendar' ? <div className="p-6 max-w-6xl mx-auto"><CalendarView appointments={isAdmin ? allAppointments : allAppointments.filter(a => a.userId === user?.id)} onEdit={a => { setEditingAppt(a); setIsModalOpen(true); }} onView={a => handleOpenBusinessCard(a, isAdmin ? allAppointments : allAppointments.filter(item => item.userId === user?.id))} userRole={user?.role || 'agent'} users={allUsers} activeCycle={activeCycle} /></div>
                                                    : currentView === 'onboarded' ? <div className="p-6 max-w-6xl mx-auto"><OnboardedView appointments={isAdmin ? allAppointments : allAppointments.filter(a => a.userId === user?.id)} searchQuery={searchQuery} onEdit={a => { setEditingAppt(a); setIsModalOpen(true); }} onView={(a, stack) => handleOpenBusinessCard(a, stack)} onDelete={id => setDeleteConfirmation({ isOpen: true, id })} users={allUsers} payCycles={payCycles} userRole={user?.role || 'agent'} currentWindow={displayEarnings.current} referralRate={referralCommissionRate} incentives={allIncentives} /></div>
                                                        : currentView === 'earnings-full' ? <div className="p-6 max-w-6xl mx-auto"><EarningsFullView history={displayEarnings.history} currentWindow={displayEarnings.current} appointments={isAdmin ? allAppointments : allAppointments.filter(a => a.userId === user?.id)} users={allUsers} userRole={user?.role || 'agent'} currentUserName={user?.name || ''} onDismissCycle={id => supabase.from('users').update({ dismissed_cycle_ids: [...(user?.dismissedCycleIds || []), id] }).eq('id', user?.id).then(() => refreshData())} incentives={allIncentives} referralRate={referralCommissionRate} /></div>
                                                            : (
                                                                <div className="relative p-6 pt-20 min-h-full">
                                                                    <div className="fixed top-24 right-8 z-30 pointer-events-none">
                                                                        <button onClick={() => { setEditingAppt(null); setIsModalOpen(true); }} className="pointer-events-auto flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg transition-all active:scale-95 text-sm font-black uppercase tracking-widest shadow-indigo-100/50 dark:shadow-none"><IconPlus className="w-5 h-5" /> New Appointment</button>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start pb-8">
                                                                        {isAdmin ?
                                                                            // Admin view: Only show ONBOARDED and ACTIVATED stages
                                                                            [AppointmentStage.ONBOARDED, AppointmentStage.ACTIVATED].map(stage => {
                                                                                const searchLower = searchQuery.toLowerCase();
                                                                                const items = allAppointments.filter(a => {
                                                                                    if (stage === AppointmentStage.ONBOARDED) {
                                                                                        if (a.stage !== AppointmentStage.ONBOARDED && a.stage !== AppointmentStage.ACTIVATED) return false;
                                                                                    } else {
                                                                                        if (a.stage !== stage) return false;
                                                                                    }
                                                                                    if (stage === AppointmentStage.ONBOARDED || stage === AppointmentStage.ACTIVATED) {
                                                                                        if (activeCycle && !searchQuery) {
                                                                                            const start = new Date(activeCycle.startDate).getTime();
                                                                                            const end = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
                                                                                            const onboarded = new Date(a.onboardedAt || a.scheduledAt).getTime();
                                                                                            if (onboarded < start || onboarded > end) return false;
                                                                                        }
                                                                                    }
                                                                                    if (searchQuery) {
                                                                                        const matches = a.name.toLowerCase().includes(searchLower) || (a.phone && a.phone.includes(searchLower)) || (a.email && a.email.toLowerCase().includes(searchLower)) || (a.notes && a.notes.toLowerCase().includes(searchLower)) || (a.aeName && a.aeName.toLowerCase().includes(searchLower)) || formatDate(a.scheduledAt).toLowerCase().includes(searchLower);
                                                                                        if (!matches) return false;
                                                                                    }
                                                                                    return true;
                                                                                });
                                                                                const sortedItems = [...items].sort((a, b) => {
                                                                                    const tA = new Date(a.scheduledAt).getTime();
                                                                                    const tB = new Date(b.scheduledAt).getTime();
                                                                                    return (stage === AppointmentStage.ONBOARDED || stage === AppointmentStage.ACTIVATED) ? tB - tA : tA - tB;
                                                                                });

                                                                                // Hide Cycle Onboard and Activated if empty
                                                                                if ((stage === AppointmentStage.ONBOARDED || stage === AppointmentStage.ACTIVATED) && sortedItems.length === 0) return null;

                                                                                if (sortedItems.length === 0 && stage !== AppointmentStage.ONBOARDED) return null;

                                                                                return (
                                                                                    <div key={stage} className="flex flex-col gap-4 animate-in fade-in" onDragOver={e => e.preventDefault()} onDrop={() => draggedId && handleMoveStage(draggedId, stage)}>
                                                                                        <div className="flex justify-between px-1"><h3 className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">{stage === AppointmentStage.ONBOARDED ? 'Active Cycle Wins' : stage === AppointmentStage.ACTIVATED ? 'Activated Partners' : STAGE_LABELS[stage]}</h3><span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{sortedItems.length}</span></div>
                                                                                        {stage === AppointmentStage.TRANSFERRED && (<div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 mb-1 animate-pulse flex items-center gap-2"><div className="p-1 bg-indigo-600 text-white rounded-lg"><IconTransfer className="w-3.5 h-3.5" /></div><span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">LIVE WAITING ONBOARD</span></div>)}
                                                                                        <CardStack<Appointment> threshold={stage === AppointmentStage.ACTIVATED ? 2 : 4} items={sortedItems} renderItem={appt => (<div onDragStart={() => setDraggedId(appt.id)} onDragEnd={() => { setDraggedId(null); setIsOverDeleteZone(false); }} draggable><AppointmentCard appointment={appt} onMoveStage={handleMoveStage} onEdit={(a, res) => { setEditingAppt(a); setIsRescheduling(!!res); setIsModalOpen(true); }} onView={a => handleOpenBusinessCard(a, sortedItems)} onDelete={id => setDeleteConfirmation({ isOpen: true, id })} agentName={isAdmin ? allUsers.find(u => u.id === appt.userId)?.name : undefined} preferredDialer={user.preferredDialer} referralRate={referralCommissionRate} allUsers={allUsers} incentives={allIncentives} isAdmin={isAdmin} /></div>)} />
                                                                                    </div>
                                                                                );
                                                                            })
                                                                            // Agent view: Show all stages as before
                                                                            : [AppointmentStage.PENDING, AppointmentStage.RESCHEDULED, AppointmentStage.TRANSFERRED, AppointmentStage.ONBOARDED, AppointmentStage.ACTIVATED, ...((user?.showFailedSection ?? true) ? [AppointmentStage.NO_SHOW, AppointmentStage.DECLINED] : [])].map(stage => {
                                                                                const searchLower = searchQuery.toLowerCase();
                                                                                const items = allAppointments.filter(a => a.userId === user?.id).filter(a => {
                                                                                    if (stage === AppointmentStage.ONBOARDED) {
                                                                                        if (a.stage !== AppointmentStage.ONBOARDED && a.stage !== AppointmentStage.ACTIVATED) return false;
                                                                                    } else {
                                                                                        if (a.stage !== stage) return false;
                                                                                    }
                                                                                    if (stage === AppointmentStage.ONBOARDED || stage === AppointmentStage.ACTIVATED) {
                                                                                        if (activeCycle && !searchQuery) {
                                                                                            const start = new Date(activeCycle.startDate).getTime();
                                                                                            const end = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
                                                                                            const onboarded = new Date(a.onboardedAt || a.scheduledAt).getTime();
                                                                                            if (onboarded < start || onboarded > end) return false;
                                                                                        }
                                                                                    }
                                                                                    if (searchQuery) {
                                                                                        const matches = a.name.toLowerCase().includes(searchLower) || (a.phone && a.phone.includes(searchLower)) || (a.email && a.email.toLowerCase().includes(searchLower)) || (a.notes && a.notes.toLowerCase().includes(searchLower)) || (a.aeName && a.aeName.toLowerCase().includes(searchLower)) || formatDate(a.scheduledAt).toLowerCase().includes(searchLower);
                                                                                        if (!matches) return false;
                                                                                    }
                                                                                    return true;
                                                                                });
                                                                                const sortedItems = [...items].sort((a, b) => {
                                                                                    const tA = new Date(a.scheduledAt).getTime();
                                                                                    const tB = new Date(b.scheduledAt).getTime();
                                                                                    return (stage === AppointmentStage.ONBOARDED || stage === AppointmentStage.ACTIVATED) ? tB - tA : tA - tB;
                                                                                });

                                                                                // Hide Cycle Onboard and Activated if empty
                                                                                if ((stage === AppointmentStage.ONBOARDED || stage === AppointmentStage.ACTIVATED) && sortedItems.length === 0) return null;

                                                                                if (sortedItems.length === 0 && stage !== AppointmentStage.ONBOARDED) return null;

                                                                                return (
                                                                                    <div key={stage} className="flex flex-col gap-4 animate-in fade-in" onDragOver={e => e.preventDefault()} onDrop={() => draggedId && handleMoveStage(draggedId, stage)}>
                                                                                        <div className="flex justify-between px-1"><h3 className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">{stage === AppointmentStage.ONBOARDED ? 'Active Cycle Wins' : stage === AppointmentStage.ACTIVATED ? 'Activated Partners' : STAGE_LABELS[stage]}</h3><span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{sortedItems.length}</span></div>
                                                                                        {stage === AppointmentStage.TRANSFERRED && (<div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 mb-1 animate-pulse flex items-center gap-2"><div className="p-1 bg-indigo-600 text-white rounded-lg"><IconTransfer className="w-3.5 h-3.5" /></div><span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">LIVE WAITING ONBOARD</span></div>)}
                                                                                        <CardStack<Appointment> threshold={stage === AppointmentStage.ACTIVATED ? 2 : 4} items={sortedItems} renderItem={appt => (<div onDragStart={() => setDraggedId(appt.id)} onDragEnd={() => { setDraggedId(null); setIsOverDeleteZone(false); }} draggable><AppointmentCard appointment={appt} onMoveStage={handleMoveStage} onEdit={(a, res) => { setEditingAppt(a); setIsRescheduling(!!res); setIsModalOpen(true); }} onView={a => handleOpenBusinessCard(a, sortedItems)} onDelete={id => setDeleteConfirmation({ isOpen: true, id })} agentName={isAdmin ? allUsers.find(u => u.id === appt.userId)?.name : undefined} preferredDialer={user.preferredDialer} referralRate={referralCommissionRate} allUsers={allUsers} incentives={allIncentives} isAdmin={isAdmin} /></div>)} />
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                    </div>

                                                                    {allAppointments.length === 0 && (
                                                                        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-700">
                                                                            <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-[3rem] flex items-center justify-center mb-8"><IconCheck className="w-16 h-16 text-slate-200" /></div>
                                                                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Cycle Ready for Kickoff</h2>
                                                                            <p className="text-slate-500 font-medium max-w-sm mb-10">No activity recorded for this session. Start by logging your first partner appointment.</p>
                                                                            <button onClick={() => setIsModalOpen(true)} className="px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[2rem] shadow-xl shadow-indigo-100 transition-all flex items-center gap-4 uppercase tracking-widest text-xs"><IconPlus className="w-5 h-5" /> Start New Session</button>
                                                                        </div>
                                                                    )}
                                                                    {draggedId && (
                                                                        <div onDragOver={e => { e.preventDefault(); setIsOverDeleteZone(true); }} onDragLeave={() => setIsOverDeleteZone(false)} onDrop={() => { handleMoveStage(draggedId, AppointmentStage.NO_SHOW); setDraggedId(null); setIsOverDeleteZone(false); }} className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 pointer-events-auto ${isOverDeleteZone ? 'scale-110' : 'scale-100 opacity-60'}`}>
                                                                            <div className={`px-8 py-5 rounded-[2rem] flex items-center gap-3 shadow-2xl border-2 transition-all duration-300 ${isOverDeleteZone ? 'bg-amber-600 text-white border-amber-400' : 'bg-white dark:bg-slate-900 text-amber-600 border-amber-100 dark:border-amber-900/50'}`}>
                                                                                <IconX className={`w-6 h-6 ${isOverDeleteZone ? 'animate-bounce' : ''}`} />
                                                                                <span className="font-black text-xs uppercase tracking-[0.2em]">Drop to Mark Failed</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                    </main>
                </div>
                <CreateModal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setEditingAppt(null); }} onSubmit={handleSaveApptWrapper} isAdminMode={isAdmin} currentUserName={user.name} agentOptions={allUsers.filter(u => u.role !== 'admin')} commissionRate={commissionRate} selfCommissionRate={selfCommissionRate} />
                <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => setIsModalOpen(false)}>
                    <AppointmentModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingAppt(null); }} onSubmit={handleSaveApptWrapper} onDelete={id => { setDeleteConfirmation({ isOpen: true, id }); setEditingAppt(null); }} initialData={editingAppt} isRescheduling={isRescheduling} agentName={user?.name} isAdmin={isAdmin} commissionRate={commissionRate} selfCommissionRate={selfCommissionRate} />
                </ErrorBoundary>
                <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => setIsBusinessCardOpen(false)}>
                    <BusinessCardModal
                        isOpen={isBusinessCardOpen} onClose={() => { setIsBusinessCardOpen(false); setActiveStack([]); }} appointment={viewingAppt} onEdit={(a, res) => { setEditingAppt(a); setIsRescheduling(!!res); setIsModalOpen(true); }} onDelete={id => { setDeleteConfirmation({ isOpen: true, id }); setIsBusinessCardOpen(false); }} onMoveStage={(id, stage, isManual) => { handleMoveStage(id, stage, isManual); setIsBusinessCardOpen(false); }} onSaveNotes={(id, notes) => supabase.from('appointments').update({ notes }).eq('id', id).then(() => refreshData())} onNext={() => navigateStack('next')} onPrev={() => navigateStack('prev')} hasNext={activeStack.length > 1} hasPrev={activeStack.length > 1} referralRate={referralCommissionRate}
                    />
                </ErrorBoundary>
                <DeleteConfirmationModal isOpen={deleteConfirmation.isOpen} onClose={() => setDeleteConfirmation({ isOpen: false, id: null })} onConfirm={() => handleDeleteAppointment(deleteConfirmation.id!).then(() => setDeleteConfirmation({ isOpen: false, id: null }))} title="Confirm Removal" message="Permanently delete this item?" />
                <AESelectionModal isOpen={isAEModalOpen} onClose={() => setIsAEModalOpen(false)} agentName={user?.name} onConfirm={ae => { if (pendingMove) { handleMoveStage(pendingMove.id, pendingMove.stage, false).then(() => { supabase.from('appointments').update({ ae_name: ae }).eq('id', pendingMove.id).then(() => { setPendingMove(null); refreshData(); }); }); } }} />
                <EarningsPanel isOpen={isEarningsPanelOpen} onClose={() => setIsEarningsPanelOpen(false)} onViewAll={() => { setIsEarningsPanelOpen(false); setCurrentView('earnings-full'); }} currentWindow={displayEarnings.current} history={displayEarnings.history} lifetimeEarnings={displayEarnings.lifetime} teamEarnings={isAdmin ? displayEarnings.lifetime : undefined} teamCurrentPool={isAdmin ? teamCurrentCycleTotal : undefined} isTeamView={isAdmin} referralRate={referralCommissionRate} allAppointments={allAppointments} allIncentives={allIncentives} currentUserName={user.name} currentUserId={user.id} />

                <TaxterChat user={user} allAppointments={allAppointments} allEarnings={displayEarnings.history} payCycles={payCycles} allUsers={allUsers} onNavigate={setCurrentView} activeCycle={activeCycle} commissionRate={commissionRate} selfCommissionRate={selfCommissionRate} referralCommissionRate={referralCommissionRate} reminders={reminders} allIncentives={allIncentives} />

                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] flex flex-col-reverse gap-3 pointer-events-none items-center">
                    {toasts.map(t => (
                        <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 border backdrop-blur-md transition-all ${t.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : t.type === 'error' ? 'bg-rose-500 text-white border-rose-400' : 'bg-slate-900 text-white border-slate-700'}`}>
                            {t.type === 'success' ? <IconCheck className="w-5 h-5" /> : t.type === 'error' ? <IconAlertCircle className="w-5 h-5" /> : <IconActivity className="w-5 h-5" />}
                            <span className="text-sm font-black whitespace-nowrap">{t.message}</span>
                        </div>
                    ))}
                </div>

                <WeeklyRecapModal
                    isOpen={isWeeklyRecapOpen}
                    onClose={() => setIsWeeklyRecapOpen(false)}
                    appointments={isAdmin ? allAppointments : allAppointments.filter(a => a.userId === user.id)}
                    user={user}
                    allUsers={allUsers}
                    onExportCSV={handleExportCycleLedger}
                />
                {
                    activeCelebration && (
                        <CelebrationOverlay
                            type={activeCelebration}
                            onClose={() => setActiveCelebration(null)}
                        />
                    )
                }

                <ReminderModal
                    isOpen={isReminderModalOpen}
                    onClose={() => setIsReminderModalOpen(false)}
                    onSave={handleSaveReminderWrapper}
                    onConvert={handleConvertReminderModal}
                    editingReminder={editingReminder}
                />
                <div className="fixed bottom-1 right-1 text-[10px] text-slate-300 dark:text-slate-700 opacity-50 z-[9999] pointer-events-none font-mono">v1.1.0</div>
            </div>
        </ErrorBoundary>
    );
}

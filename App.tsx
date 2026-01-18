
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Appointment, AppointmentStage, EarningWindow, STAGE_LABELS, View, User, TeamMember, PayCycle, AvatarId, ActivityLog, Incentive, IncentiveRule, STAGE_COLORS, ACCOUNT_EXECUTIVES, ReferralHistoryEntry } from './types';
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
import { IconMenu, IconMoon, IconPlus, IconSearch, IconSun, getAvatarIcon, IconTrash, IconTrophy, IconSparkles, IconTransfer, IconActivity, IconX, IconCheck, IconClock } from './components/Icons';
import { NotificationPods } from './components/NotificationPods';
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
        refreshData,
        handleUpdateMasterCommissions,
        handleImportReferrals,
        handleManualReferralUpdate,
        handleDeleteReferralEntry,
        handleSaveAppointment,
        handleMoveStage: handleMoveStageContext,
        handleDeleteAppointment,
        displayEarnings,
        activeCycle,
        teamCurrentCycleTotal
    } = useData();

    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isTickerVisible, setIsTickerVisible] = useState(() => {
        const saved = localStorage.getItem(KEYS.TICKER);
        return saved === 'true';
    });

    const [showFailedSection, setShowFailedSection] = useState(true);
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

    const [referralAlert, setReferralAlert] = useState<{ id: string, count: number, totalCents: number, clientName: string } | null>(null);
    const [seenReferralIds, setSeenReferralIds] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('seen_referral_ids');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    const [activeCelebration, setActiveCelebration] = useState<any>(null);
    const [isWeeklyRecapOpen, setIsWeeklyRecapOpen] = useState(false);
    const [achievements, setAchievements] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('achievements_v1');
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
            if (lastView) setCurrentView(lastView);
        }
    }, [user]);

    useEffect(() => {
        localStorage.setItem(KEYS.THEME, JSON.stringify(darkMode));
        if (darkMode) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    }, [darkMode]);

    useEffect(() => {
        if (!user || user.role === 'admin') return;

        // Find the most recent referral that hasn't been seen yet
        const newReferrals = allAppointments.flatMap(a => {
            if (a.userId !== user.id || !a.referralHistory) return [];
            return a.referralHistory.map(h => ({ ...h, clientName: a.name }));
        }).filter(h => !seenReferralIds.has(h.id));

        if (newReferrals.length > 0) {
            const latest = newReferrals[newReferrals.length - 1]; // Assume last is newest for now
            // Only set if not already showing one to avoid flickering or loops
            setReferralAlert(prev => prev ? prev : {
                id: latest.id,
                clientName: latest.clientName,
                count: latest.count,
                totalCents: latest.count * referralCommissionRate
            });
        }
    }, [allAppointments, user, referralCommissionRate, seenReferralIds]);

    // --- MILESTONES & FRIDAY RECAP LOGIC ---
    useEffect(() => {
        if (!user || user.role === 'admin') return;

        const checkMilestones = () => {
            const onboarded = allAppointments.filter(a => a.userId === user.id && a.stage === AppointmentStage.ONBOARDED);
            const selfOnboarded = onboarded.filter(a => !a.aeName || a.aeName === user.name);
            const lifetimeCents = displayEarnings.lifetime;
            const currentCents = displayEarnings.current?.totalCents || 0;

            const newAchievements = new Set(achievements);
            let triggered: any = null;

            if (onboarded.length >= 100 && !achievements.has('100_ONBOARDS')) {
                triggered = '100_ONBOARDS';
            } else if (selfOnboarded.length >= 100 && !achievements.has('100_SELF')) {
                triggered = '100_SELF';
            } else if (lifetimeCents >= 50000 && !achievements.has('500_EARNINGS')) {
                triggered = '500_EARNINGS';
            } else if (currentCents >= 10000 && !achievements.has('100_SINGLE_CYCLE')) {
                triggered = '100_SINGLE_CYCLE';
            }

            // Streak check (5 in 1 hour)
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            const recentSelf = selfOnboarded.filter(a => new Date(a.scheduledAt).getTime() > oneHourAgo);
            if (recentSelf.length >= 5 && !achievements.has('STREAK_5_HOUR')) {
                triggered = 'STREAK_5_HOUR';
            }

            if (triggered) {
                newAchievements.add(triggered);
                setAchievements(newAchievements);
                localStorage.setItem('achievements_v1', JSON.stringify([...newAchievements]));
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
        const interval = setInterval(checkFridayRecap, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [allAppointments, displayEarnings, user, achievements]);

    const handleDismissReferral = () => {
        if (referralAlert) {
            const next = new Set(seenReferralIds).add(referralAlert.id);
            setSeenReferralIds(next);
            localStorage.setItem('seen_referral_ids', JSON.stringify([...next]));
            setReferralAlert(null);
        }
    };

    const handleSaveApptWrapper = async (data: any) => {
        await handleSaveAppointment(data);
        setEditingAppt(null);
    };

    const handleMoveStage = async (id: string, stage: AppointmentStage, isManualSelfOnboard: boolean = false) => {
        const appt = allAppointments.find(a => a.id === id); if (!appt) return;
        if (stage === AppointmentStage.RESCHEDULED) { setEditingAppt(appt); setIsRescheduling(true); setIsModalOpen(true); return; }

        if (stage === AppointmentStage.ONBOARDED && appt.stage !== AppointmentStage.TRANSFERRED && !isManualSelfOnboard) {
            setPendingMove({ id, stage: AppointmentStage.TRANSFERRED });
            setIsAEModalOpen(true);
            return;
        }

        await handleMoveStageContext(id, stage, isManualSelfOnboard);
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
            const start = new Date(activeCycle.startDate).getTime();
            const end = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
            const scheduled = new Date(a.scheduledAt).getTime();
            return a.stage === AppointmentStage.ONBOARDED && scheduled >= start && scheduled <= end;
        });

        const headers = ["ID", "Onboard Date", "Client", "Phone", "Closer", "Type", "Referrals", "Payout", "Notes"];
        const rows = onboarded.map(a => {
            const isSelf = !a.aeName || a.aeName === user?.name;
            const payout = (a.earnedAmount || 0) + (a.referralCount || 0) * referralCommissionRate;
            return [
                a.id,
                formatDate(a.scheduledAt),
                a.name,
                a.phone,
                a.aeName || 'Self',
                isSelf ? 'Self' : 'Transfer',
                a.referralCount || 0,
                (payout / 100).toFixed(2),
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
    return (
        <div className="h-screen flex bg-slate-50 dark:bg-slate-950 overflow-hidden app-container">
            {referralAlert && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-indigo-950/80 backdrop-blur-md animate-in fade-in duration-500 p-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 text-center max-w-sm shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-indigo-500/10 animate-pulse" />
                        <div className="relative z-10">
                            <div className="w-24 h-24 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce shadow-xl">
                                <IconTrophy className="w-12 h-12" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Referral Win!</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-bold mb-8">
                                Your partner <span className="text-indigo-600 dark:text-indigo-400 font-black">{referralAlert.clientName}</span> just sent business!
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
                {isTickerVisible && (
                    <GlobalWinTicker
                        appointments={allAppointments}
                        users={allUsers}
                        onViewAppt={(id) => {
                            const appt = allAppointments.find(a => a.id === id);
                            if (appt) handleOpenBusinessCard(appt);
                        }}
                        onNavigate={(v) => setCurrentView(v)}
                    />
                )}
                <header className="h-16 flex items-center justify-between px-6 border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-md dark:border-slate-800">
                    <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500"><IconMenu /></button>
                    <div className="flex-1 max-w-xl mx-4">
                        <div className="relative group">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
                            <input type="text" placeholder="Search Name, Phone, Email, Notes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 rounded-full py-2.5 pl-10 pr-10 text-sm border-none dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                            {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-500 transition-colors"><IconX className="w-3 h-3" /></button>)}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationPods appointments={allAppointments} onOpenAppointment={(id) => { const a = allAppointments.find(x => x.id === id); if (a) handleOpenBusinessCard(a); }} thresholdMinutes={user.notificationSettings?.thresholdMinutes || 15} />
                        <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500">{darkMode ? <IconSun /> : <IconMoon />}</button>
                        <div id="wallet-pill" className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full text-sm font-bold cursor-pointer hover:scale-105 transition-transform" onClick={() => setIsEarningsPanelOpen(true)}>${(displayEarnings.lifetime / 100).toLocaleString()}</div>
                        <button onClick={() => { setCurrentView('profile'); sessionStorage.setItem(KEYS.LAST_VIEW, 'profile'); }} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden">{user.avatarId && user.avatarId !== 'initial' ? <div className="bg-indigo-50 dark:bg-indigo-900/50">{getAvatarIcon(user.avatarId)}</div> : <div className="bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs h-full">{user.name.charAt(0).toUpperCase()}</div>}</button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto no-scrollbar relative">
                    {loadingAuth ? <div className="h-full flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div> : currentView === 'profile' ? <ProfileView totalEarnings={displayEarnings.lifetime} totalOnboarded={allAppointments.filter(a => (isAdmin ? true : a.userId === user?.id) && a.stage === AppointmentStage.ONBOARDED).length} showFailedSection={showFailedSection} onToggleFailedSection={setShowFailedSection} onReplayTutorial={() => setForceTutorial(true)} /> : currentView === 'admin-dashboard' ? <AdminDashboard members={allUsers.filter(u => u.role !== 'admin').map(u => ({ id: u.id, name: u.name, role: u.role as any, status: 'Online', onboardedCount: allAppointments.filter(a => a.userId === u.id && a.stage === AppointmentStage.ONBOARDED).length, totalEarnings: (allAppointments.filter(a => a.userId === u.id && a.stage === AppointmentStage.ONBOARDED).reduce((s, a) => s + (a.earnedAmount || 0) + ((a.referralCount || 0) * referralCommissionRate), 0)) + allIncentives.filter(i => i.userId === u.id || i.userId === 'team').reduce((s, i) => s + i.amountCents, 0), lastActive: 'Recently', avatarId: u.avatarId }))} payCycles={payCycles} onAddCycle={(s, e) => supabase.from('pay_cycles').insert({ id: generateId(), start_date: s, end_date: e, status: 'active' }).then(() => refreshData())} onEditCycle={(id, s, e) => supabase.from('pay_cycles').update({ start_date: s, end_date: e }).eq('id', id).then(() => refreshData())} onDeleteCycle={id => supabase.from('pay_cycles').delete().eq('id', id).then(() => refreshData())} commissionRate={commissionRate} selfCommissionRate={selfCommissionRate} referralRate={referralCommissionRate} onUpdateMasterCommissions={handleUpdateMasterCommissions} onLogOnboard={() => setIsCreateModalOpen(true)} appointments={allAppointments} activeCycle={activeCycle} activityLogs={activityLogs} onApplyIncentive={i => supabase.from('incentives').insert({ ...i, id: generateId(), created_at: new Date().toISOString() }).then(() => refreshData())} allUsers={allUsers} lifetimeTeamEarnings={displayEarnings.lifetime} incentiveRules={allIncentiveRules} onDeleteIncentiveRule={id => supabase.from('incentive_rules').delete().eq('id', id).then(() => refreshData())} allIncentives={allIncentives} onImportReferrals={handleImportReferrals} onManualReferral={handleManualReferralUpdate} onDeleteReferral={handleDeleteReferralEntry} /> : currentView === 'user-analytics' ? <div className="p-6 max-w-6xl mx-auto"><UserAnalytics appointments={allAppointments.filter(a => a.userId === user?.id)} allAppointments={allAppointments} allIncentives={allIncentives} earnings={displayEarnings} activeCycle={activeCycle} payCycles={payCycles} currentUserName={user?.name || ''} currentUser={user!} referralRate={referralCommissionRate} /></div> : currentView === 'calendar' ? <div className="p-6 max-w-6xl mx-auto"><CalendarView appointments={isAdmin ? allAppointments : allAppointments.filter(a => a.userId === user?.id)} onEdit={a => { setEditingAppt(a); setIsModalOpen(true); }} onView={a => handleOpenBusinessCard(a, isAdmin ? allAppointments : allAppointments.filter(item => item.userId === user?.id))} userRole={user?.role || 'agent'} users={allUsers} activeCycle={activeCycle} /></div> : currentView === 'onboarded' ? <div className="p-6 max-w-6xl mx-auto"><OnboardedView appointments={isAdmin ? allAppointments : allAppointments.filter(a => a.userId === user?.id)} searchQuery={searchQuery} onEdit={a => { setEditingAppt(a); setIsModalOpen(true); }} onView={(a, stack) => handleOpenBusinessCard(a, stack)} onDelete={id => setDeleteConfirmation({ isOpen: true, id })} users={allUsers} payCycles={payCycles} userRole={user?.role || 'agent'} currentWindow={displayEarnings.current} referralRate={referralCommissionRate} /></div> : currentView === 'earnings-full' ? <div className="p-6 max-w-6xl mx-auto"><EarningsFullView history={displayEarnings.history} currentWindow={displayEarnings.current} appointments={isAdmin ? allAppointments : allAppointments.filter(a => a.userId === user?.id)} users={allUsers} userRole={user?.role || 'agent'} currentUserName={user?.name || ''} onDismissCycle={id => supabase.from('users').update({ dismissed_cycle_ids: [...(user?.dismissedCycleIds || []), id] }).eq('id', user?.id).then(() => refreshData())} incentives={allIncentives} referralRate={referralCommissionRate} /></div> : (
                        <div className="relative p-6 min-h-full">
                            <div className="sticky top-0 z-20 flex justify-end mb-6 pointer-events-none">
                                <button
                                    onClick={() => {
                                        setEditingAppt(null);
                                        if (isAdmin) setIsCreateModalOpen(true);
                                        else setIsModalOpen(true);
                                    }}
                                    className="pointer-events-auto flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-2xl transition-all active:scale-95 text-sm font-black uppercase tracking-widest animate-in slide-in-from-right-4 duration-500 shadow-indigo-200 dark:shadow-none"
                                >
                                    {isAdmin ? <IconSparkles className="w-5 h-5" /> : <IconPlus className="w-5 h-5" />}
                                    {isAdmin ? 'Log Onboarded Partner' : 'New Appointment'}
                                </button>
                            </div>

                            <ReferralMomentumWidget
                                appointments={allAppointments}
                                activeCycle={activeCycle}
                                onViewAppt={a => handleOpenBusinessCard(a)}
                                referralRate={referralCommissionRate}
                                users={allUsers}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                                {[AppointmentStage.PENDING, AppointmentStage.RESCHEDULED, AppointmentStage.TRANSFERRED, AppointmentStage.ONBOARDED, ...(showFailedSection ? [AppointmentStage.NO_SHOW, AppointmentStage.DECLINED] : [])].map(stage => {
                                    const searchLower = searchQuery.toLowerCase();
                                    const items = (isAdmin ? allAppointments : allAppointments.filter(a => a.userId === user.id)).filter(a => {
                                        if (a.stage !== stage) return false;
                                        if (stage === AppointmentStage.ONBOARDED && activeCycle) {
                                            const start = new Date(activeCycle.startDate).getTime();
                                            const end = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
                                            const scheduled = new Date(a.scheduledAt).getTime();
                                            if (scheduled < start || scheduled > end) return false;
                                        }
                                        if (searchQuery) {
                                            const matches = a.name.toLowerCase().includes(searchLower) || a.phone.includes(searchLower) || (a.email && a.email.toLowerCase().includes(searchLower)) || (a.notes && a.notes.toLowerCase().includes(searchLower)) || (a.aeName && a.aeName.toLowerCase().includes(searchLower)) || formatDate(a.scheduledAt).toLowerCase().includes(searchLower);
                                            if (!matches) return false;
                                        }
                                        return true;
                                    });
                                    const sortedItems = [...items].sort((a, b) => {
                                        const tA = new Date(a.scheduledAt).getTime();
                                        const tB = new Date(b.scheduledAt).getTime();
                                        return stage === AppointmentStage.ONBOARDED ? tB - tA : tA - tB;
                                    });
                                    if (sortedItems.length === 0 && stage !== AppointmentStage.ONBOARDED) return null;
                                    return (
                                        <div key={stage} className="flex flex-col gap-4 animate-in fade-in" onDragOver={e => e.preventDefault()} onDrop={() => draggedId && handleMoveStage(draggedId, stage)}>
                                            <div className="flex justify-between px-1"><h3 className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">{stage === AppointmentStage.ONBOARDED ? 'Cycle Onboarded' : stage === AppointmentStage.NO_SHOW ? 'No Show/Cancelled' : stage === AppointmentStage.DECLINED ? 'Declined' : STAGE_LABELS[stage]}</h3><span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{sortedItems.length}</span></div>
                                            {stage === AppointmentStage.TRANSFERRED && (<div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 mb-1 animate-pulse flex items-center gap-2"><div className="p-1 bg-indigo-600 text-white rounded-lg"><IconTransfer className="w-3.5 h-3.5" /></div><span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">LIVE WAITING ONBOARD</span></div>)}
                                            {sortedItems.length === 0 && stage === AppointmentStage.ONBOARDED ? (
                                                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl opacity-50"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Cycle Wins</p></div>
                                            ) : (
                                                <CardStack<Appointment> items={sortedItems} renderItem={appt => (<div onDragStart={() => setDraggedId(appt.id)} onDragEnd={() => { setDraggedId(null); setIsOverDeleteZone(false); }} draggable><AppointmentCard appointment={appt} onMoveStage={handleMoveStage} onEdit={(a, res) => { setEditingAppt(a); setIsRescheduling(!!res); setIsModalOpen(true); }} onView={a => handleOpenBusinessCard(a, sortedItems)} onDelete={id => setDeleteConfirmation({ isOpen: true, id })} agentName={isAdmin ? allUsers.find(u => u.id === appt.userId)?.name : undefined} preferredDialer={user.preferredDialer} referralRate={referralCommissionRate} /></div>)} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {draggedId && (<div onDragOver={e => { e.preventDefault(); setIsOverDeleteZone(true); }} onDragLeave={() => setIsOverDeleteZone(false)} onDrop={() => { handleMoveStage(draggedId, AppointmentStage.NO_SHOW); setDraggedId(null); setIsOverDeleteZone(false); }} className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 pointer-events-auto ${isOverDeleteZone ? 'scale-110' : 'scale-100 opacity-60'}`}><div className={`px-8 py-5 rounded-[2rem] flex items-center gap-3 shadow-2xl border-2 transition-all duration-300 ${isOverDeleteZone ? 'bg-amber-600 text-white border-amber-400' : 'bg-white dark:bg-slate-900 text-amber-600 border-amber-100 dark:border-amber-900/50'}`}><IconX className={`w-6 h-6 ${isOverDeleteZone ? 'animate-bounce' : ''}`} /><span className="font-black text-xs uppercase tracking-[0.2em]">Drop to Mark Failed</span></div></div>)}
                        </div>
                    )}
                </main>
            </div>
            <CreateModal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setEditingAppt(null); }} onSubmit={handleSaveApptWrapper} isAdminMode={isAdmin} currentUserName={user.name} agentOptions={allUsers.filter(u => u.role !== 'admin')} commissionRate={commissionRate} selfCommissionRate={selfCommissionRate} />
            <AppointmentModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingAppt(null); }} onSubmit={handleSaveApptWrapper} onDelete={id => { setDeleteConfirmation({ isOpen: true, id }); setEditingAppt(null); }} initialData={editingAppt} isRescheduling={isRescheduling} agentName={user.name} isAdmin={isAdmin} commissionRate={commissionRate} selfCommissionRate={selfCommissionRate} />
            <BusinessCardModal
                isOpen={isBusinessCardOpen} onClose={() => { setIsBusinessCardOpen(false); setActiveStack([]); }} appointment={viewingAppt} onEdit={(a, res) => { setEditingAppt(a); setIsRescheduling(!!res); setIsModalOpen(true); }} onDelete={id => { setDeleteConfirmation({ isOpen: true, id }); setIsBusinessCardOpen(false); }} onMoveStage={(id, stage, isManual) => { handleMoveStage(id, stage, isManual); setIsBusinessCardOpen(false); }} onSaveNotes={(id, notes) => supabase.from('appointments').update({ notes }).eq('id', id).then(() => refreshData())} onNext={() => navigateStack('next')} onPrev={() => navigateStack('prev')} hasNext={activeStack.length > 1} hasPrev={activeStack.length > 1} referralRate={referralCommissionRate} onUpdateReferrals={(id, count) => handleManualReferralUpdate(id, count)}
            />
            <DeleteConfirmationModal isOpen={deleteConfirmation.isOpen} onClose={() => setDeleteConfirmation({ isOpen: false, id: null })} onConfirm={() => handleDeleteAppointment(deleteConfirmation.id!).then(() => setDeleteConfirmation({ isOpen: false, id: null }))} title="Confirm Removal" message="Permanently delete this item?" />
            <AESelectionModal isOpen={isAEModalOpen} onClose={() => setIsAEModalOpen(false)} agentName={user.name} onConfirm={ae => { if (pendingMove) { handleMoveStageContext(pendingMove.id, pendingMove.stage, false).then(() => { supabase.from('appointments').update({ ae_name: ae }).eq('id', pendingMove.id).then(() => { setPendingMove(null); refreshData(); }); }); } }} />
            <EarningsPanel isOpen={isEarningsPanelOpen} onClose={() => setIsEarningsPanelOpen(false)} onViewAll={() => { setIsEarningsPanelOpen(false); setCurrentView('earnings-full'); }} currentWindow={displayEarnings.current} history={displayEarnings.history} lifetimeEarnings={displayEarnings.lifetime} teamEarnings={isAdmin ? displayEarnings.lifetime : undefined} teamCurrentPool={isAdmin ? teamCurrentCycleTotal : undefined} isTeamView={isAdmin} referralRate={referralCommissionRate} allAppointments={allAppointments} />
            <TaxterChat user={user} allAppointments={allAppointments} allEarnings={displayEarnings.history} payCycles={payCycles} allUsers={allUsers} onNavigate={setCurrentView} activeCycle={activeCycle} commissionRate={commissionRate} selfCommissionRate={selfCommissionRate} />

            <WeeklyRecapModal
                isOpen={isWeeklyRecapOpen}
                onClose={() => setIsWeeklyRecapOpen(false)}
                appointments={isAdmin ? allAppointments : allAppointments.filter(a => a.userId === user.id)}
                user={user}
                allUsers={allUsers}
                onExportCSV={handleExportCycleLedger}
            />
            {activeCelebration && (
                <CelebrationOverlay
                    type={activeCelebration}
                    onClose={() => setActiveCelebration(null)}
                />
            )}

            <div className="fixed bottom-1 right-1 text-[10px] text-slate-300 dark:text-slate-700 opacity-50 z-[9999] pointer-events-none font-mono">v1.0.2</div>
        </div>
    );
}

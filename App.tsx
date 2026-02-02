
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
import { IconMenu, IconMoon, IconPlus, IconSearch, IconSun, getAvatarIcon, IconTrash, IconTrophy, IconSparkles, IconTransfer, IconActivity, IconX, IconCheck } from './components/Icons';
import { generateId, formatDate, formatCurrency } from './utils/dateUtils';
import { CreateModal } from './components/CreateModal';
import { AESelectionModal } from './components/AESelectionModal';
import { BusinessCardModal } from './components/BusinessCardModal';
import { supabase } from './utils/supabase';
import { CardStack } from './components/CardStack';
import { GlobalWinTicker } from './components/GlobalWinTicker';

const KEYS = { THEME: 'chicayo_dark_mode', LAST_VIEW: 'chicayo_last_view_v3', TICKER: 'chicayo_ticker_visible' };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const isAdmin = user?.role === 'admin';

  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [allIncentives, setAllIncentives] = useState<Incentive[]>([]);
  const [allIncentiveRules, setAllIncentiveRules] = useState<IncentiveRule[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [payCycles, setPayCycles] = useState<PayCycle[]>([]);
  
  const [commissionRate, setCommissionRate] = useState(200);
  const [selfCommissionRate, setSelfCommissionRate] = useState(300); 
  const [referralCommissionRate, setReferralCommissionRate] = useState(500); 
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

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

  const [referralAlert, setReferralAlert] = useState<{ count: number, totalCents: number, clientName: string } | null>(null);

  const refreshData = useCallback(async () => {
    try {
        const [{ data: users }, { data: appointments }, { data: cycles }, { data: logs }, { data: incentives }, { data: rules }, { data: settings }] = await Promise.all([
            supabase.from('users').select('*'), 
            supabase.from('appointments').select('*').order('scheduled_at', { ascending: false }), 
            supabase.from('pay_cycles').select('*'),
            supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(100), 
            supabase.from('incentives').select('*'), 
            supabase.from('incentive_rules').select('*'),
            supabase.from('settings').select('*').eq('id', 'global').maybeSingle()
        ]);
        if (users) setAllUsers(users.map(u => ({ ...u, avatarId: u.avatar_id, createdAt: u.created_at, hasSeenTutorial: u.has_seen_tutorial, notificationSettings: u.notification_settings, preferredDialer: u.preferred_dialer, dismissedCycleIds: u.dismissed_cycle_ids || [] })));
        
        if (appointments) setAllAppointments(appointments.map(a => ({ 
            ...a, 
            userId: a.user_id, 
            scheduledAt: a.scheduled_at, 
            createdAt: a.created_at, 
            earnedAmount: a.earned_amount, 
            aeName: a.ae_name, 
            referralCount: a.referral_count || 0, 
            lastReferralAt: a.last_referral_at, 
            referralHistory: (a.referral_history || []) as ReferralHistoryEntry[]
        })));

        if (cycles) setPayCycles(cycles.map(c => ({...c, startDate: c.start_date, endDate: c.end_date})));
        if (logs) setActivityLogs(logs.map(l => ({...l, userId: l.user_id, userName: l.user_name, relatedId: l.related_id})));
        if (incentives) setAllIncentives(incentives.map(i => ({...i, userId: i.user_id, amountCents: i.amount_cents, appliedCycleId: i.applied_cycle_id, createdAt: i.created_at})));
        if (rules) setAllIncentiveRules(rules.map(r => ({ ...r, userId: r.user_id, type: r.type, valueCents: r.value_cents, startTime: r.start_time, endTime: r.end_time, targetCount: r.target_count, currentCount: r.current_count, isActive: r.is_active, createdAt: r.created_at })));
        
        if (settings) { 
            setCommissionRate(settings.commission_standard); 
            setSelfCommissionRate(settings.commission_self); 
            setReferralCommissionRate(settings.commission_referral || 500); 
        }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
            if (profile) {
                setUser({ id: profile.id, name: profile.name, email: profile.email, role: profile.role, avatarId: profile.avatar_id, createdAt: profile.created_at, hasSeenTutorial: profile.has_seen_tutorial, notificationSettings: profile.notification_settings, preferredDialer: profile.preferred_dialer, dismissedCycleIds: profile.dismissed_cycle_ids || [] });
                const lastView = sessionStorage.getItem(KEYS.LAST_VIEW) as View;
                if (lastView) setCurrentView(lastView); else setCurrentView(profile.role === 'admin' ? 'admin-dashboard' : 'dashboard');
            }
        }
        setLoadingAuth(false); refreshData();
    };
    checkUser();
    const savedTheme = localStorage.getItem(KEYS.THEME); if (savedTheme) setDarkMode(JSON.parse(savedTheme));
  }, [refreshData]);

  useEffect(() => {
    localStorage.setItem(KEYS.THEME, JSON.stringify(darkMode));
    if (darkMode) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const activeCycle = useMemo(() => {
    const n = Date.now();
    return payCycles.find(c => n >= new Date(c.startDate).getTime() && n <= new Date(c.endDate).setHours(23, 59, 59, 999));
  }, [payCycles]);

  const teamCurrentCycleTotal = useMemo(() => {
    if (!activeCycle) return 0;
    const start = new Date(activeCycle.startDate).getTime();
    const end = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
    return allAppointments
      .filter(a => a.stage === AppointmentStage.ONBOARDED && new Date(a.scheduledAt).getTime() >= start && new Date(a.scheduledAt).getTime() <= end)
      .reduce((sum, a) => {
          const base = a.earnedAmount || 0;
          const referrals = (a.referralCount || 0) * referralCommissionRate;
          return sum + base + referrals;
      }, 0);
  }, [allAppointments, activeCycle, referralCommissionRate]);

  const handleUpdateMasterCommissions = async (standard: number, self: number, referral: number, syncRetroactive: boolean = false) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('settings').upsert({ 
        id: 'global', 
        commission_standard: standard, 
        commission_self: self, 
        commission_referral: referral,
        updated_at: new Date().toISOString() 
    });
    if (error) { alert(`Sync Error: ${error.message}`); return; }

    setCommissionRate(standard); 
    setSelfCommissionRate(self); 
    setReferralCommissionRate(referral);
    refreshData();
  };

  const handleImportReferrals = async (rows: { name: string, phone: string, referrals: number, date: string }[]) => {
      if (!isAdmin) return;
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
                  const historyId = generateId(); // Patch: Explicit history ID for tracking
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
                      created_at: now
                  });

                  matchedCount++;
                  newBonusTotal += bonusCents;
              }
          }
      }
      
      alert(`Ledger Sync Complete.\n- Successfully matched ${matchedCount} partners.\n- Distributed ${formatCurrency(newBonusTotal)} in new referral bonuses.`);
      refreshData();
  };

  const handleManualReferralUpdate = async (clientId: string, newCount: number) => {
      if (!isAdmin) return;
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

      refreshData();
  };

  const handleDeleteReferralEntry = async (clientId: string, entryId: string) => {
      if (!isAdmin) return;
      const appt = allAppointments.find(a => a.id === clientId);
      if (!appt || !appt.referralHistory) return;

      const entry = appt.referralHistory.find(e => e.id === entryId);
      if (!entry) return;

      const updatedHistory = appt.referralHistory.filter(e => e.id !== entryId);
      const newCount = Math.max(0, (appt.referralCount || 0) - entry.count);

      await Promise.all([
          supabase.from('appointments').update({
              referral_count: newCount,
              referral_history: updatedHistory
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

      refreshData();
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
    let bonus = 0; const now = new Date(); const newIncentives = [];
    
    for (const rule of allIncentiveRules.filter(r => r.isActive)) {
       const isTargeted = rule.userId === 'team' || rule.userId === finalUserId;
       const isTimed = (!rule.startTime || now >= new Date(rule.startTime)) && (!rule.endTime || now <= new Date(rule.endTime));
       const hasCount = rule.targetCount === undefined || (rule.currentCount || 0) < rule.targetCount;
       if (isTargeted && isTimed && hasCount && data.stage === AppointmentStage.ONBOARDED) {
          bonus += rule.valueCents;
          newIncentives.push({ id: generateId(), user_id: finalUserId, amount_cents: rule.valueCents, label: rule.label, applied_cycle_id: activeCycle?.id, created_at: now.toISOString(), rule_id: rule.id });
          await supabase.from('incentive_rules').update({ current_count: (rule.currentCount || 0) + 1 }).eq('id', rule.id);
       }
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
        earned_amount: data.stage === AppointmentStage.ONBOARDED ? (baseRate + bonus) : 0,
        referral_count: data.referralCount || 0
    };
    if (data.id) await supabase.from('appointments').update(dbData).eq('id', data.id);
    else await supabase.from('appointments').insert({ ...dbData, id: generateId(), created_at: new Date().toISOString() });
    
    if (newIncentives.length) await supabase.from('incentives').insert(newIncentives);
    
    setEditingAppt(null);
    refreshData();
  };

  const handleMoveStage = async (id: string, stage: AppointmentStage, isManualSelfOnboard: boolean = false) => {
    const appt = allAppointments.find(a => a.id === id); if (!appt) return;
    if (stage === AppointmentStage.RESCHEDULED) { setEditingAppt(appt); setIsRescheduling(true); setIsModalOpen(true); return; }
    
    if (stage === AppointmentStage.ONBOARDED) {
        const agent = allUsers.find(u => u.id === appt.userId);
        
        // CASE A: Direct "Onboard" click (Pure Self-Onboard)
        if (isManualSelfOnboard) {
            await supabase.from('appointments').update({ 
                stage: AppointmentStage.ONBOARDED, 
                earned_amount: selfCommissionRate,
                ae_name: agent?.name // Auto-credit the agent as closer
            }).eq('id', id);
            refreshData();
            return;
        }

        // CASE B: Transferred already, now confirming
        if (appt.stage === AppointmentStage.TRANSFERRED) {
            const isSelf = appt.aeName === agent?.name;
            const baseRate = isSelf ? selfCommissionRate : commissionRate;
            await supabase.from('appointments').update({ stage: AppointmentStage.ONBOARDED, earned_amount: baseRate }).eq('id', id);
            refreshData();
        } else { 
            // Trigger AE Selection
            setPendingMove({ id, stage: AppointmentStage.TRANSFERRED }); 
            setIsAEModalOpen(true); 
        }
        return;
    }
    await supabase.from('appointments').update({ stage, earned_amount: 0 }).eq('id', id); refreshData();
  };

  const displayEarnings = useMemo(() => {
    if (!user) return { current: null, history: [], lifetime: 0 };
    const isAdminMode = user.role === 'admin';
    const relevantAppts = isAdminMode ? allAppointments : allAppointments.filter(a => a.userId === user.id);
    const onboardedOnly = relevantAppts.filter(a => a.stage === AppointmentStage.ONBOARDED);
    const relevantIncentives = isAdminMode ? allIncentives : allIncentives.filter(i => i.userId === user.id || i.userId === 'team');
    
    const lifetime = onboardedOnly.reduce((s, a) => {
        const base = a.earnedAmount || 0;
        const refs = (a.referralCount || 0) * referralCommissionRate;
        return s + base + refs;
    }, 0) + relevantIncentives.reduce((s, i) => s + i.amountCents, 0);

    const now = Date.now();
    const uniqueCycles = Array.from(payCycles.reduce<Map<string, PayCycle>>((acc, c) => { 
        const k = new Date(c.startDate).toDateString(); if (!acc.has(k) || new Date(c.endDate) > new Date(acc.get(k)!.endDate)) acc.set(k, c); return acc; 
    }, new Map<string, PayCycle>()).values());
    
    const windows: EarningWindow[] = [...uniqueCycles].sort((a: PayCycle, b: PayCycle) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()).reduce<EarningWindow[]>((acc: EarningWindow[], cycle: PayCycle) => {
        const start = new Date(cycle.startDate).getTime(); const end = new Date(cycle.endDate).setHours(23, 59, 59, 999);
        if (start > now) return acc;
        const cycleAppts = onboardedOnly.filter(a => { const d = new Date(a.scheduledAt).getTime(); return d >= start && d <= end; });
        const cycleIncentives = relevantIncentives.filter(i => i.appliedCycleId === cycle.id);
        
        const cycleProdTotal = cycleAppts.reduce((s, a) => {
            const base = a.earnedAmount || 0;
            const refs = (a.referralCount || 0) * referralCommissionRate;
            return s + base + refs;
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

  if (!user) return <AuthScreen onLogin={async (u) => { setUser(u); refreshData(); }} />;
  return (
    <div className="h-screen flex bg-slate-50 dark:bg-slate-950 overflow-hidden">
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
                        onClick={() => setReferralAlert(null)}
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-sm"
                    >
                        Sweet! Back to Work
                    </button>
                  </div>
              </div>
          </div>
      )}

      <TutorialOverlay isOpen={!user.hasSeenTutorial || forceTutorial} userRole={user.role} onComplete={async () => { setUser({...user, hasSeenTutorial: true}); await supabase.from('users').update({has_seen_tutorial: true}).eq('id', user.id); setForceTutorial(false); }} />
      <Sidebar currentView={currentView} onChangeView={v => {setCurrentView(v); sessionStorage.setItem(KEYS.LAST_VIEW, v);}} isOpen={isSidebarOpen} onCloseMobile={() => setIsSidebarOpen(false)} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} onLogout={() => setUser(null)} userRole={user.role} userName={user.name} userAvatar={user.avatarId} isTickerVisible={isTickerVisible} onToggleTicker={() => setIsTickerVisible(!isTickerVisible)} />
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
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500">{darkMode ? <IconSun /> : <IconMoon />}</button>
              <div id="wallet-pill" className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full text-sm font-bold cursor-pointer hover:scale-105 transition-transform" onClick={() => setIsEarningsPanelOpen(true)}>${(displayEarnings.lifetime / 100).toLocaleString() }</div>
              <button onClick={() => {setCurrentView('profile'); sessionStorage.setItem(KEYS.LAST_VIEW, 'profile');}} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden">{user.avatarId && user.avatarId !== 'initial' ? <div className="bg-indigo-50 dark:bg-indigo-900/50">{getAvatarIcon(user.avatarId)}</div> : <div className="bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs h-full">{user.name.charAt(0).toUpperCase()}</div>}</button>
           </div>
        </header>
        <main className="flex-1 overflow-y-auto no-scrollbar relative">
          {loadingAuth ? <div className="h-full flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div> : currentView === 'profile' ? <ProfileView user={user} onUpdateUser={(n, a, ns, pd) => supabase.from('users').update({name: n, avatar_id: a, notification_settings: ns, preferred_dialer: pd}).eq('id', user.id).then(() => refreshData())} totalEarnings={displayEarnings.lifetime} totalOnboarded={allAppointments.filter(a => (isAdmin ? true : a.userId === user.id) && a.stage === AppointmentStage.ONBOARDED).length} showFailedSection={showFailedSection} onToggleFailedSection={setShowFailedSection} onReplayTutorial={() => setForceTutorial(true)} /> : currentView === 'admin-dashboard' ? <AdminDashboard members={allUsers.filter(u => u.role !== 'admin').map(u => ({ id: u.id, name: u.name, role: u.role as any, status: 'Online', onboardedCount: allAppointments.filter(a => a.userId === u.id && a.stage === AppointmentStage.ONBOARDED).length, totalEarnings: (allAppointments.filter(a => a.userId === u.id && a.stage === AppointmentStage.ONBOARDED).reduce((s, a) => s + (a.earnedAmount || 0) + ((a.referralCount || 0) * referralCommissionRate), 0)) + allIncentives.filter(i => i.userId === u.id || i.userId === 'team').reduce((s, i) => s + i.amountCents, 0), lastActive: 'Recently', avatarId: u.avatarId }))} payCycles={payCycles} onAddCycle={(s,e) => supabase.from('pay_cycles').insert({id: generateId(), start_date: s, end_date: e, status: 'active'}).then(() => refreshData())} onEditCycle={(id, s, e) => supabase.from('pay_cycles').update({start_date: s, end_date: e}).eq('id', id).then(() => refreshData())} onDeleteCycle={id => supabase.from('pay_cycles').delete().eq('id', id).then(() => refreshData())} commissionRate={commissionRate} selfCommissionRate={selfCommissionRate} referralRate={referralCommissionRate} onUpdateMasterCommissions={handleUpdateMasterCommissions} onLogOnboard={() => setIsCreateModalOpen(true)} appointments={allAppointments} activeCycle={activeCycle} activityLogs={activityLogs} onApplyIncentive={i => supabase.from('incentives').insert({...i, id: generateId(), created_at: new Date().toISOString()}).then(() => refreshData())} allUsers={allUsers} lifetimeTeamEarnings={displayEarnings.lifetime} incentiveRules={allIncentiveRules} onDeleteIncentiveRule={id => supabase.from('incentive_rules').delete().eq('id', id).then(() => refreshData())} allIncentives={allIncentives} onImportReferrals={handleImportReferrals} onManualReferral={handleManualReferralUpdate} onDeleteReferral={handleDeleteReferralEntry} /> : currentView === 'user-analytics' ? <div className="p-6 max-w-6xl mx-auto"><UserAnalytics appointments={allAppointments.filter(a => a.userId === user.id)} allAppointments={allAppointments} allIncentives={allIncentives} earnings={displayEarnings} activeCycle={activeCycle} payCycles={payCycles} currentUserName={user.name} currentUser={user} referralRate={referralCommissionRate} /></div> : currentView === 'calendar' ? <div className="p-6 max-w-6xl mx-auto"><CalendarView appointments={isAdmin ? allAppointments : allAppointments.filter(a => a.userId === user.id)} onEdit={a => {setEditingAppt(a); setIsModalOpen(true);}} onView={a => handleOpenBusinessCard(a, isAdmin ? allAppointments : allAppointments.filter(item => item.userId === user.id))} userRole={user.role} users={allUsers} activeCycle={activeCycle} /></div> : currentView === 'onboarded' ? <div className="p-6 max-w-6xl mx-auto"><OnboardedView appointments={isAdmin ? allAppointments : allAppointments.filter(a => a.userId === user.id)} searchQuery={searchQuery} onEdit={a => {setEditingAppt(a); setIsModalOpen(true);}} onView={(a, stack) => handleOpenBusinessCard(a, stack)} onDelete={id => setDeleteConfirmation({ isOpen: true, id })} users={allUsers} payCycles={payCycles} userRole={user.role} currentWindow={displayEarnings.current} referralRate={referralCommissionRate} /></div> : currentView === 'earnings-full' ? <div className="p-6 max-w-6xl mx-auto"><EarningsFullView history={displayEarnings.history} currentWindow={displayEarnings.current} appointments={isAdmin ? allAppointments : allAppointments.filter(a => a.userId === user.id)} users={allUsers} userRole={user.role} currentUserName={user.name} onDismissCycle={id => supabase.from('users').update({ dismissed_cycle_ids: [...(user.dismissedCycleIds || []), id] }).eq('id', user.id).then(() => refreshData())} incentives={allIncentives} referralRate={referralCommissionRate} /></div> : (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                    {[AppointmentStage.PENDING, AppointmentStage.RESCHEDULED, AppointmentStage.TRANSFERRED, AppointmentStage.ONBOARDED].map(stage => {
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
                                <div className="flex justify-between px-1"><h3 className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">{stage === AppointmentStage.ONBOARDED ? 'Cycle Onboarded' : STAGE_LABELS[stage]}</h3><span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{sortedItems.length}</span></div>
                                {stage === AppointmentStage.TRANSFERRED && (<div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 mb-1 animate-pulse flex items-center gap-2"><div className="p-1 bg-indigo-600 text-white rounded-lg"><IconTransfer className="w-3.5 h-3.5" /></div><span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">LIVE WAITING ONBOARD</span></div>)}
                                {sortedItems.length === 0 && stage === AppointmentStage.ONBOARDED ? (
                                    <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl opacity-50"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Cycle Wins</p></div>
                                ) : (
                                    <CardStack<Appointment> items={sortedItems} renderItem={appt => (<div onDragStart={() => setDraggedId(appt.id)} onDragEnd={() => { setDraggedId(null); setIsOverDeleteZone(false); }} draggable><AppointmentCard appointment={appt} onMoveStage={handleMoveStage} onEdit={(a, res) => {setEditingAppt(a); setIsRescheduling(!!res); setIsModalOpen(true);}} onView={a => handleOpenBusinessCard(a, sortedItems)} onDelete={id => setDeleteConfirmation({ isOpen: true, id })} agentName={isAdmin ? allUsers.find(u => u.id === appt.userId)?.name : undefined} preferredDialer={user.preferredDialer} referralRate={referralCommissionRate} /></div>)} />
                                )}
                            </div>
                        );
                    })}
                </div>
                {draggedId && (<div onDragOver={e => { e.preventDefault(); setIsOverDeleteZone(true); }} onDragLeave={() => setIsOverDeleteZone(false)} onDrop={() => { setDeleteConfirmation({ isOpen: true, id: draggedId }); setDraggedId(null); setIsOverDeleteZone(false); }} className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 pointer-events-auto ${isOverDeleteZone ? 'scale-110' : 'scale-100 opacity-60'}`}><div className={`px-8 py-5 rounded-[2rem] flex items-center gap-3 shadow-2xl border-2 transition-all duration-300 ${isOverDeleteZone ? 'bg-rose-600 text-white border-rose-400' : 'bg-white dark:bg-slate-900 text-rose-50 border-rose-100 dark:border-rose-900/50'}`}><IconTrash className={`w-6 h-6 ${isOverDeleteZone ? 'animate-bounce' : ''}`} /><span className="font-black text-xs uppercase tracking-[0.2em]">Drop to Remove</span></div></div>)}
            </div>
          )}
        </main>
      </div>
      <CreateModal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setEditingAppt(null); }} onSubmit={handleSaveAppointment} isAdminMode={isAdmin} currentUserName={user.name} agentOptions={allUsers.filter(u => u.role !== 'admin')} commissionRate={commissionRate} selfCommissionRate={selfCommissionRate} />
      <AppointmentModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingAppt(null); }} onSubmit={handleSaveAppointment} onDelete={id => { setDeleteConfirmation({ isOpen: true, id }); setEditingAppt(null); }} initialData={editingAppt} isRescheduling={isRescheduling} agentName={user.name} isAdmin={isAdmin} commissionRate={commissionRate} selfCommissionRate={selfCommissionRate} />
      <BusinessCardModal 
        isOpen={isBusinessCardOpen} onClose={() => { setIsBusinessCardOpen(false); setActiveStack([]); }} appointment={viewingAppt} onEdit={(a, res) => {setEditingAppt(a); setIsRescheduling(!!res); setIsModalOpen(true);}} onDelete={id => { setDeleteConfirmation({ isOpen: true, id }); setIsBusinessCardOpen(false); }} onMoveStage={(id, stage, isManual) => { handleMoveStage(id, stage, isManual); setIsBusinessCardOpen(false); }} onSaveNotes={(id, notes) => supabase.from('appointments').update({ notes }).eq('id', id).then(() => refreshData())} onNext={() => navigateStack('next')} onPrev={() => navigateStack('prev')} hasNext={activeStack.length > 1} hasPrev={activeStack.length > 1} referralRate={referralCommissionRate} onUpdateReferrals={(id, count) => supabase.from('appointments').update({ referral_count: count }).eq('id', id).then(() => refreshData())} 
      />
      <DeleteConfirmationModal isOpen={deleteConfirmation.isOpen} onClose={() => setDeleteConfirmation({ isOpen: false, id: null })} onConfirm={() => supabase.from('appointments').delete().eq('id', deleteConfirmation.id!).then(() => refreshData())} title="Confirm Removal" message="Permanently delete this item?" />
      <AESelectionModal isOpen={isAEModalOpen} onClose={() => setIsAEModalOpen(false)} agentName={user.name} onConfirm={ae => { if(pendingMove) { const appt = allAppointments.find(a => a.id === pendingMove.id); const agent = allUsers.find(u => u.id === appt?.userId); const rate = (ae === agent?.name) ? selfCommissionRate : commissionRate; supabase.from('appointments').update({stage: pendingMove.stage, ae_name: ae, earned_amount: rate}).eq('id', pendingMove.id).then(() => {setPendingMove(null); refreshData();}); } }} />
      <EarningsPanel isOpen={isEarningsPanelOpen} onClose={() => setIsEarningsPanelOpen(false)} onViewAll={() => { setIsEarningsPanelOpen(false); setCurrentView('earnings-full'); }} currentWindow={displayEarnings.current} history={displayEarnings.history} lifetimeEarnings={displayEarnings.lifetime} teamEarnings={isAdmin ? displayEarnings.lifetime : undefined} teamCurrentPool={isAdmin ? teamCurrentCycleTotal : undefined} isTeamView={isAdmin} referralRate={referralCommissionRate} allAppointments={allAppointments} />
      <TaxterChat user={user} allAppointments={allAppointments} allEarnings={displayEarnings.history} payCycles={payCycles} allUsers={allUsers} onNavigate={setCurrentView} activeCycle={activeCycle} commissionRate={commissionRate} selfCommissionRate={selfCommissionRate} />
    </div>
  );
}


import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Appointment, AppointmentStage, EarningWindow, STAGE_LABELS, View, User, TeamMember, PayCycle, AvatarId, DashboardStats, ActivityLog, NotificationSettings } from './types';
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
import { AlertModal } from './components/AlertModal';
import { TaxterChat } from './components/TaxterChat';
import { TutorialOverlay } from './components/TutorialOverlay';
import { UserAnalytics } from './components/UserAnalytics';
import { IconCalendar, IconMenu, IconMoon, IconPlus, IconSearch, IconSun, getAvatarIcon, IconFilter, IconTransfer, IconSparkles, IconCopy, IconCheck, IconX } from './components/Icons';
import { addWorkingDays, generateId } from './utils/dateUtils';
import { CreateModal } from './components/CreateModal';
import { CustomSelect } from './components/CustomSelect';
import { AESelectionModal } from './components/AESelectionModal';
import { BusinessCardModal } from './components/BusinessCardModal';
import { supabase } from './utils/supabase';
import { CardStack } from './components/CardStack';

const KEYS = {
  USERS: 'chicayo_users_v3',
  APPOINTMENTS: 'chicayo_appointments_v3',
  EARNINGS: 'chicayo_earnings_v3',
  THEME: 'chicayo_dark_mode',
  CYCLES: 'chicayo_pay_cycles_v3',
  COMMISSION: 'chicayo_commission_rate_v3',
  ACTIVITY: 'chicayo_activity_logs_v3',
  LAST_VIEW: 'chicayo_last_view_v3'
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [allEarnings, setAllEarnings] = useState<EarningWindow[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [payCycles, setPayCycles] = useState<PayCycle[]>([]);
  const [commissionRate, setCommissionRate] = useState(200);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [adminAgentFilter, setAdminAgentFilter] = useState<string>('all');

  // User Preferences
  const [showFailedSection, setShowFailedSection] = useState(true);

  // Notification Pod State
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);
  const [copiedPodId, setCopiedPodId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  
  // Business Card View State
  const [viewingAppt, setViewingAppt] = useState<Appointment | null>(null);
  const [isBusinessCardOpen, setIsBusinessCardOpen] = useState(false);

  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isEarningsPanelOpen, setIsEarningsPanelOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, id: string | null, type?: 'appointment' | 'user' | 'self' }>({ isOpen: false, id: null, type: 'appointment' });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean, title: string, message: string, type: 'info' | 'success' | 'error' }>({ isOpen: false, title: '', message: '', type: 'info' });
  const [darkMode, setDarkMode] = useState(false);

  // AE Selection & Admin Log States
  const [isAEModalOpen, setIsAEModalOpen] = useState(false);
  const [pendingOnboardId, setPendingOnboardId] = useState<string | null>(null);
  const [pendingTransferId, setPendingTransferId] = useState<string | null>(null); 
  const [isAdminLogOnboardOpen, setIsAdminLogOnboardOpen] = useState(false);

  // --- DATA LOADING & SYNC ---

  const refreshData = useCallback(async () => {
    try {
        const [
            { data: users },
            { data: appointments },
            { data: earnings },
            { data: cycles },
            { data: logs }
        ] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('appointments').select('*'),
            supabase.from('earning_windows').select('*'),
            supabase.from('pay_cycles').select('*'),
            supabase.from('activity_logs').select('*')
        ]);

        if (users) setAllUsers(users.map(u => ({...u, avatarId: u.avatar_id, createdAt: u.created_at, hasSeenTutorial: u.has_seen_tutorial, notificationSettings: u.notification_settings, preferredDialer: u.preferred_dialer })));
        if (appointments) setAllAppointments(appointments.map(a => ({...a, userId: a.user_id, scheduledAt: a.scheduled_at, createdAt: a.created_at, earnedAmount: a.earned_amount, aeName: a.ae_name})));
        if (earnings) setAllEarnings(earnings.map(e => ({...e, userId: e.user_id, startDate: e.start_date, endDate: e.end_date, totalCents: e.total_cents, onboardedCount: e.onboarded_count, isClosed: e.is_closed})));
        if (cycles) setPayCycles(cycles.map(c => ({...c, startDate: c.start_date, endDate: c.end_date})));
        if (logs) setActivityLogs(logs.map(l => ({...l, userId: l.user_id, userName: l.user_name, relatedId: l.related_id})));

        const loadedCommission = localStorage.getItem(KEYS.COMMISSION);
        if (loadedCommission) setCommissionRate(parseInt(loadedCommission));

    } catch (error) {
        console.error("Error refreshing data:", error);
    }
  }, []);

  // Sync Current User state with AllUsers source of truth
  useEffect(() => {
    if (user && allUsers.length > 0) {
        const syncedUser = allUsers.find(u => u.id === user.id);
        if (syncedUser && JSON.stringify(syncedUser) !== JSON.stringify(user)) {
            setUser(syncedUser);
        }
    }
  }, [allUsers, user?.id]); 

  // Initial Load & Auth Check
  useEffect(() => {
    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
            if (profile) {
                setUser({
                    id: profile.id,
                    name: profile.name,
                    email: profile.email,
                    role: profile.role,
                    avatarId: profile.avatar_id,
                    createdAt: profile.created_at,
                    hasSeenTutorial: profile.has_seen_tutorial,
                    notificationSettings: profile.notification_settings,
                    preferredDialer: profile.preferred_dialer
                });
                
                // Load Preferences
                const prefShowFailed = localStorage.getItem(`chicayo_pref_show_failed_${profile.id}`);
                if (prefShowFailed !== null) setShowFailedSection(JSON.parse(prefShowFailed));

                const lastView = sessionStorage.getItem(KEYS.LAST_VIEW) as View;
                if (lastView && ['dashboard', 'calendar', 'onboarded', 'earnings-full', 'admin-dashboard', 'profile', 'user-analytics'].includes(lastView)) {
                    setCurrentView(lastView);
                } else {
                    setCurrentView(profile.role === 'admin' ? 'admin-dashboard' : 'dashboard');
                }
            }
        }
        setLoadingAuth(false);
        refreshData();
    };

    checkUser();

    const savedTheme = localStorage.getItem(KEYS.THEME);
    if (savedTheme) setDarkMode(JSON.parse(savedTheme));

    const channels = [
        supabase.channel('public:appointments').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => refreshData()).subscribe(),
        supabase.channel('public:users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => refreshData()).subscribe(),
        supabase.channel('public:earning_windows').on('postgres_changes', { event: '*', schema: 'public', table: 'earning_windows' }, () => refreshData()).subscribe(),
        supabase.channel('public:pay_cycles').on('postgres_changes', { event: '*', schema: 'public', table: 'pay_cycles' }, () => refreshData()).subscribe(),
        supabase.channel('public:activity_logs').on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => refreshData()).subscribe()
    ];

    const handleFocus = () => refreshData();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
        channels.forEach(c => supabase.removeChannel(c));
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [refreshData]);

  const handleSetCurrentView = (view: View) => {
      setCurrentView(view);
      sessionStorage.setItem(KEYS.LAST_VIEW, view);
  };

  const handleToggleFailedSection = (show: boolean) => {
      if (user) {
          setShowFailedSection(show);
          localStorage.setItem(`chicayo_pref_show_failed_${user.id}`, JSON.stringify(show));
      }
  };

  useEffect(() => {
    localStorage.setItem(KEYS.THEME, JSON.stringify(darkMode));
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (darkMode) {
      document.documentElement.classList.add('dark');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#020617');
    } else {
      document.documentElement.classList.remove('dark');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#f8fafc');
    }
  }, [darkMode]);

  const logActivity = async (action: ActivityLog['action'], details: string, relatedId?: string) => {
     if (!user) return;
     const newLog = {
        id: generateId(),
        user_id: user.id,
        user_name: user.name,
        action,
        details,
        timestamp: new Date().toISOString(),
        related_id: relatedId
     };
     await supabase.from('activity_logs').insert(newLog);
  };

  const userAppointments = useMemo(() => {
    if (!user) return [];
    return allAppointments.filter(a => a.userId === user.id);
  }, [allAppointments, user]);

  const userEarnings = useMemo(() => {
    if (!user) return { current: null, history: [] };
    const windows = allEarnings.filter(w => w.userId === user.id);
    const current = windows.find(w => !w.isClosed) || null;
    const history = windows.filter(w => w.isClosed).sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    return { current, history };
  }, [allEarnings, user]);

  // Admin Specific Data Aggregations
  const adminEarningsHistory = useMemo(() => {
      if (!user || user.role !== 'admin') return [];
      return payCycles.map(cycle => {
          const start = new Date(cycle.startDate).getTime();
          const end = new Date(cycle.endDate);
          end.setHours(23, 59, 59, 999);
          
          const cycleAppts = allAppointments.filter(a => {
              if (a.stage !== AppointmentStage.ONBOARDED) return false;
              const d = new Date(a.scheduledAt).getTime();
              return d >= start && d <= end.getTime();
          });

          const totalCents = cycleAppts.reduce((sum, a) => sum + (a.earnedAmount || 200), 0);
          const onboardedCount = cycleAppts.length;
          const isClosed = cycle.status !== 'active';

          return {
              id: cycle.id,
              userId: 'team',
              startDate: cycle.startDate,
              endDate: cycle.endDate,
              totalCents,
              onboardedCount,
              isClosed
          } as EarningWindow;
      }).sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  }, [payCycles, allAppointments, user]);

  const adminOnboardedList = useMemo(() => {
      if (!user || user.role !== 'admin') return [];
      let base = allAppointments.filter(a => a.stage === AppointmentStage.ONBOARDED);
      if (adminAgentFilter !== 'all') {
          base = base.filter(a => a.userId === adminAgentFilter);
      }
      return base.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  }, [allAppointments, adminAgentFilter, user]);


  const activePayCycle = useMemo(() => {
     if (payCycles.length === 0) return undefined;
     const now = new Date();
     return payCycles.find(c => {
        const start = new Date(c.startDate);
        start.setHours(0, 0, 0, 0); // Start of day
        
        const end = new Date(c.endDate);
        end.setHours(23, 59, 59, 999); // End of day
        
        return now >= start && now <= end;
     });
  }, [payCycles]);

  const teamMembers: TeamMember[] = useMemo(() => {
    if (!user || user.role !== 'admin') return [];
    return allUsers.map(u => {
       if (u.role === 'admin') return null;
       
       let relevantEarnings = 0;
       let relevantOnboarded = 0;

       if (activePayCycle) {
          const start = new Date(activePayCycle.startDate).getTime();
          const end = new Date(activePayCycle.endDate);
          end.setHours(23, 59, 59, 999);
          
          const uAppts = allAppointments.filter(a => a.userId === u.id);
          const onboardedInCycle = uAppts.filter(a => {
             if (a.stage !== AppointmentStage.ONBOARDED) return false;
             const d = new Date(a.scheduledAt).getTime(); 
             return d >= start && d <= end.getTime();
          });
          relevantOnboarded = onboardedInCycle.length;
          relevantEarnings = onboardedInCycle.reduce((sum, a) => sum + (a.earnedAmount || 200), 0);
       } else {
          const uAppts = allAppointments.filter(a => a.userId === u.id);
          relevantOnboarded = uAppts.filter(a => a.stage === AppointmentStage.ONBOARDED).length;
          relevantEarnings = uAppts.filter(a => a.stage === AppointmentStage.ONBOARDED).reduce((sum, a) => sum + (a.earnedAmount || 200), 0);
       }
       
       return { id: u.id, name: u.name, role: u.role, status: (u.id === user.id ? 'Online' : 'Offline'), onboardedCount: relevantOnboarded, totalEarnings: relevantEarnings, lastActive: 'Recently', avatarId: u.avatarId };
    }).filter(Boolean) as TeamMember[];
  }, [allUsers, allAppointments, user, activePayCycle]);

  // --- QUEUE WIDGET LOGIC ---
  const activeTransfers = useMemo<Appointment[]>(() => {
    if (!user) return [];
    let base = user.role === 'admin' ? allAppointments : userAppointments;
    if (user.role === 'admin' && adminAgentFilter !== 'all') base = base.filter(a => a.userId === adminAgentFilter);
    return base.filter(a => 
       (a.type === 'transfer' && a.stage === AppointmentStage.PENDING) || 
       (a.stage === AppointmentStage.TRANSFERRED)
    );
  }, [allAppointments, userAppointments, user, adminAgentFilter]);

  const dashboardAppointments = useMemo<Appointment[]>(() => {
    if (!user) return [];
    let base = user.role === 'admin' ? allAppointments : userAppointments;
    if (user.role === 'admin' && adminAgentFilter !== 'all') base = base.filter(a => a.userId === adminAgentFilter);
    
    base = base.filter(a => !(a.type === 'transfer' && a.stage === AppointmentStage.PENDING) && a.stage !== AppointmentStage.TRANSFERRED);
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        base = base.filter(a => a.name.toLowerCase().includes(q) || a.phone.includes(q) || a.email.toLowerCase().includes(q));
    }

    return base.sort((a, b) => {
        const timeBasedStages = [AppointmentStage.PENDING, AppointmentStage.RESCHEDULED];
        const isTimeA = timeBasedStages.includes(a.stage);
        const isTimeB = timeBasedStages.includes(b.stage);

        if (isTimeA && isTimeB) {
            return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [allAppointments, userAppointments, user, searchQuery, adminAgentFilter]);

  // --- NAV LIST FOR MODAL ---
  // Calculates the linear list of appointments for prev/next navigation
  // Logic: Scoped to the specific "Stack" (Column) the card belongs to.
  const navigationContextList = useMemo(() => {
      if (!viewingAppt) return [];

      if (currentView === 'dashboard') {
          // 1. Transfer Queue Stack
          const isTransferQueue = activeTransfers.some(a => a.id === viewingAppt.id);
          if (isTransferQueue) {
              return activeTransfers;
          }

          // 2. Stage Columns Stack (Pending, Rescheduled, Failed, etc.)
          // We filter the main dashboard list to only include items of the SAME STAGE.
          return dashboardAppointments.filter(a => a.stage === viewingAppt.stage);
      }

      if (currentView === 'onboarded') {
          if (user?.role === 'admin') {
              return adminOnboardedList;
          }
          // Match the sort in OnboardedView (Newest First by default)
          return userAppointments
            .filter(a => a.stage === AppointmentStage.ONBOARDED)
            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
      }

      // Fallback: All user appointments sorted by date descending
      return userAppointments.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  }, [currentView, viewingAppt, activeTransfers, dashboardAppointments, userAppointments, adminOnboardedList, user]);

  const currentNavIndex = useMemo(() => {
      if (!viewingAppt) return -1;
      return navigationContextList.findIndex(a => a.id === viewingAppt.id);
  }, [viewingAppt, navigationContextList]);

  const handleNextAppt = () => {
      if (currentNavIndex !== -1 && currentNavIndex < navigationContextList.length - 1) {
          setViewingAppt(navigationContextList[currentNavIndex + 1]);
      }
  };

  const handlePrevAppt = () => {
      if (currentNavIndex > 0) {
          setViewingAppt(navigationContextList[currentNavIndex - 1]);
      }
  };

  const globalStats: DashboardStats = useMemo(() => {
     let relevantAppointments = allAppointments;
     if (user?.role === 'admin' && activePayCycle) {
        const start = new Date(activePayCycle.startDate).getTime();
        const end = new Date(activePayCycle.endDate);
        end.setHours(23, 59, 59, 999);
        relevantAppointments = allAppointments.filter(a => {
           const d = new Date(a.scheduledAt).getTime();
           return d >= start && d <= end.getTime();
        });
     }

     const total = relevantAppointments.length;
     const onboarded = relevantAppointments.filter(a => a.stage === AppointmentStage.ONBOARDED).length;
     const pending = relevantAppointments.filter(a => a.stage === AppointmentStage.PENDING).length;
     const failed = relevantAppointments.filter(a => a.stage === AppointmentStage.NO_SHOW || a.stage === AppointmentStage.DECLINED).length;
     const rescheduled = relevantAppointments.filter(a => a.stage === AppointmentStage.RESCHEDULED).length;
     
     const allTransfers = relevantAppointments.filter(a => a.type === 'transfer');
     const totalTransfers = allTransfers.length;
     const transfersOnboarded = allTransfers.filter(a => a.stage === AppointmentStage.ONBOARDED).length;
     const transfersDeclined = allTransfers.filter(a => a.stage === AppointmentStage.DECLINED).length;
     
     const appointmentsTransferred = relevantAppointments.filter(a => a.type === 'appointment' && (a.stage === AppointmentStage.TRANSFERRED || (a.stage === AppointmentStage.ONBOARDED && a.aeName))).length;
     const appointmentsTransferredOnboarded = relevantAppointments.filter(a => a.type === 'appointment' && a.stage === AppointmentStage.ONBOARDED && a.aeName).length;

     const aePerformance: Record<string, number> = {};
     relevantAppointments.filter(a => a.stage === AppointmentStage.ONBOARDED && a.aeName).forEach(a => {
        const ae = a.aeName!;
        aePerformance[ae] = (aePerformance[ae] || 0) + 1;
     });

     if (total === 0) return { totalAppointments: 0, totalOnboarded: 0, totalPending: 0, totalFailed: 0, totalRescheduled: 0, conversionRate: '0.0', totalTransfers: 0, transfersOnboarded: 0, transfersDeclined: 0, transferConversionRate: '0.0', appointmentsTransferred: 0, apptTransferConversionRate: '0.0', aePerformance: {} };

     return { 
        totalAppointments: total, 
        totalOnboarded: onboarded, 
        totalPending: pending, 
        totalFailed: failed, 
        totalRescheduled: rescheduled, 
        conversionRate: ((onboarded / total) * 100).toFixed(1), 
        totalTransfers, 
        transfersOnboarded, 
        transfersDeclined, 
        transferConversionRate: totalTransfers > 0 ? ((transfersOnboarded / totalTransfers) * 100).toFixed(1) : '0.0',
        appointmentsTransferred,
        apptTransferConversionRate: appointmentsTransferred > 0 ? ((appointmentsTransferredOnboarded / appointmentsTransferred) * 100).toFixed(1) : '0.0',
        aePerformance
     };
  }, [allAppointments, activePayCycle, user]);

  const totalTeamEarnings = useMemo(() => teamMembers.reduce((acc, curr) => acc + curr.totalEarnings, 0), [teamMembers]);

  const handleLogin = async (loggedInUser: User) => {
    // 1. Fetch data immediately
    await refreshData();
    // 2. Then set user to unlock the view
    setUser(loggedInUser);
    sessionStorage.setItem('chicayo_current_user_id', loggedInUser.id);
    const view = loggedInUser.role === 'admin' ? 'admin-dashboard' : 'dashboard';
    handleSetCurrentView(view);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    sessionStorage.clear();
    setAllAppointments([]);
    setAllEarnings([]);
    setAllUsers([]);
    setCurrentView('dashboard');
    setIsSidebarOpen(false);
  };

  const handleUpdateUser = async (name: string, avatarId?: AvatarId, notificationSettings?: NotificationSettings, preferredDialer?: string) => {
    if (user) {
      const updatedUser = { ...user, name, avatarId, notificationSettings, preferredDialer };
      // Optimistic update
      setUser(updatedUser);
      setAllUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
      
      await supabase.from('users').update({ 
          name, 
          avatar_id: avatarId, 
          notification_settings: notificationSettings, 
          preferred_dialer: preferredDialer 
      }).eq('id', user.id);
      
      logActivity('update', `Updated profile settings`);
    }
  };

  const handleCreateAdmin = async (newAdmin: User) => { 
     if (user?.role === 'admin') {
        const { data: existing } = await supabase.from('users').select('*').eq('email', newAdmin.email).single();
        if (existing) {
            await supabase.from('users').update({ role: 'admin', avatar_id: 'crown' }).eq('id', existing.id);
            logActivity('create', `Promoted ${newAdmin.email} to Admin`);
            setAlertModal({ isOpen: true, type: 'success', title: 'Admin Promoted', message: `User ${newAdmin.email} has been successfully promoted to Admin.` });
        } else {
            setAlertModal({ isOpen: true, type: 'info', title: 'User Not Found', message: "The user must sign up for an account first before they can be promoted to Admin status." });
        }
     }
  };
  
  const handleDeleteUser = (userId: string) => { if (user?.role === 'admin') setDeleteConfirmation({ isOpen: true, id: userId, type: 'user' }); };
  const executeDeleteUser = async () => {
     const userId = deleteConfirmation.id;
     if (!userId) return;
     await supabase.from('appointments').delete().eq('user_id', userId);
     await supabase.from('earning_windows').delete().eq('user_id', userId);
     await supabase.from('users').delete().eq('id', userId);
     logActivity('delete', `Deleted user data: ${userId}`);
     setDeleteConfirmation({ isOpen: false, id: null, type: 'appointment' });
  };
  
  const handleSelfDelete = () => { if (user) setDeleteConfirmation({ isOpen: true, id: user.id, type: 'self' }); };
  const executeSelfDelete = async () => {
     if (user) {
        await supabase.from('appointments').delete().eq('user_id', user.id);
        await supabase.from('earning_windows').delete().eq('user_id', user.id);
        alert("Account data cleared. Contact admin to remove login.");
        handleLogout();
     }
  };

  const handleTutorialComplete = async () => {
     if (user) {
        const updatedUser = { ...user, hasSeenTutorial: true };
        setUser(updatedUser);
        await supabase.from('users').update({ has_seen_tutorial: true }).eq('id', user.id);
     }
  };

  const updateEarnings = async (targetUserId: string, operation: 'add' | 'subtract', amount: number) => {
      // OPTIMISTIC UPDATE
      const now = new Date();
      setAllEarnings(prev => {
          const userWins = prev.filter(w => w.userId === targetUserId);
          const current = userWins.find(w => !w.isClosed);
          
          if (operation === 'add') {
             if (!current || new Date(current.endDate) < now) {
                // New Window
                const endDate = addWorkingDays(now, 9);
                const newWin: EarningWindow = {
                    id: generateId(), userId: targetUserId, startDate: now.toISOString(), endDate: endDate.toISOString(), totalCents: amount, onboardedCount: 1, isClosed: false
                };
                if(current) current.isClosed = true;
                return [...prev.filter(w => w.id !== current?.id), ...(current ? [current] : []), newWin];
             } else {
                return prev.map(w => w.id === current.id ? { ...w, totalCents: w.totalCents + amount, onboardedCount: w.onboardedCount + 1 } : w);
             }
          } else {
             if (current && current.totalCents >= amount) {
                return prev.map(w => w.id === current.id ? { ...w, totalCents: w.totalCents - amount, onboardedCount: Math.max(0, w.onboardedCount - 1) } : w);
             }
             return prev;
          }
      });

      // DATABASE SYNC
      const { data: windows } = await supabase.from('earning_windows').select('*').eq('user_id', targetUserId);
      if (!windows) return;
      const current = windows.find(w => !w.is_closed);

      if (operation === 'add') {
         if (!current || new Date(current.end_date) < now) {
            if (current) await supabase.from('earning_windows').update({ is_closed: true }).eq('id', current.id);
            const endDate = addWorkingDays(now, 9);
            await supabase.from('earning_windows').insert({
                id: generateId(), user_id: targetUserId, start_date: now.toISOString(), end_date: endDate.toISOString(), total_cents: amount, onboarded_count: 1, is_closed: false
            });
         } else {
            await supabase.from('earning_windows').update({ total_cents: current.total_cents + amount, onboarded_count: current.onboarded_count + 1 }).eq('id', current.id);
         }
      } else {
         if (current && current.total_cents >= amount) {
             await supabase.from('earning_windows').update({ total_cents: current.total_cents - amount, onboarded_count: Math.max(0, current.onboarded_count - 1) }).eq('id', current.id);
         } else {
             const targetWindow = windows.filter(w => w.total_cents >= amount && w.id !== current?.id).sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())[0];
             if (targetWindow) await supabase.from('earning_windows').update({ total_cents: targetWindow.total_cents - amount, onboarded_count: Math.max(0, targetWindow.onboarded_count - 1) }).eq('id', targetWindow.id);
         }
      }
  };

  const handleSaveAppointment = useCallback(async (data: Partial<Appointment> & { id?: string, targetUserId?: string }) => {
    if (!user) return;
    const currentRate = commissionRate || 200;
    const effectiveUserId = data.targetUserId || user.id;

    if (data.id) {
       const existingAppt = allAppointments.find(a => a.id === data.id);
       if (existingAppt) {
          const prevStage = existingAppt.stage;
          const newStage = data.stage;
          let earnedAmountToUpdate = existingAppt.earnedAmount;
          
          if (newStage && newStage !== prevStage) {
             if (prevStage !== AppointmentStage.ONBOARDED && newStage === AppointmentStage.ONBOARDED) {
                 earnedAmountToUpdate = currentRate;
                 updateEarnings(existingAppt.userId, 'add', currentRate);
                 logActivity('move_stage', `Moved ${existingAppt.name} to Onboarded`, existingAppt.id);
             } else if (prevStage === AppointmentStage.ONBOARDED && newStage !== AppointmentStage.ONBOARDED) {
                 const amountToDeduct = existingAppt.earnedAmount || 200;
                 updateEarnings(existingAppt.userId, 'subtract', amountToDeduct);
                 logActivity('move_stage', `Moved ${existingAppt.name} from Onboarded to ${STAGE_LABELS[newStage]}`, existingAppt.id);
             }
          }
          setAllAppointments(prev => prev.map(a => a.id === data.id ? { ...a, ...data, earnedAmount: earnedAmountToUpdate } as Appointment : a));
          await supabase.from('appointments').update({ name: data.name, phone: data.phone, email: data.email, scheduled_at: data.scheduledAt, stage: data.stage, notes: data.notes, ae_name: data.aeName, earned_amount: earnedAmountToUpdate }).eq('id', data.id);
       }
    } else {
       const newId = generateId();
       const newAppt: Appointment = {
         id: newId, userId: effectiveUserId, name: data.name!, phone: data.phone!, email: data.email || '', scheduledAt: data.scheduledAt!, stage: data.stage || AppointmentStage.PENDING, notes: data.notes, createdAt: new Date().toISOString(), type: data.type, aeName: data.aeName, earnedAmount: data.stage === AppointmentStage.ONBOARDED ? currentRate : undefined
       };
       if (newAppt.stage === AppointmentStage.ONBOARDED) updateEarnings(effectiveUserId, 'add', currentRate);
       setAllAppointments(prev => [newAppt, ...prev]);
       logActivity('create', `Created ${newAppt.type === 'transfer' ? 'Transfer' : 'Appointment'}: ${newAppt.name}`, newAppt.id);
       await supabase.from('appointments').insert({ id: newId, user_id: effectiveUserId, name: newAppt.name, phone: newAppt.phone, email: newAppt.email, scheduled_at: newAppt.scheduledAt, stage: newAppt.stage, notes: newAppt.notes, created_at: newAppt.createdAt, type: newAppt.type, ae_name: newAppt.aeName, earned_amount: newAppt.earnedAmount });
    }
  }, [user, allAppointments, commissionRate]);

  const handleMoveStage = useCallback(async (id: string, stage: AppointmentStage) => {
    if (!user) return;
    const appt = allAppointments.find(a => a.id === id);
    if (!appt) return;

    if (stage === AppointmentStage.ONBOARDED && !appt.aeName) {
       setPendingOnboardId(id);
       setIsAEModalOpen(true);
       return;
    }

    if (stage === AppointmentStage.TRANSFERRED && !appt.aeName) {
       setPendingTransferId(id);
       setIsAEModalOpen(true);
       return;
    }

    const prevStage = appt.stage;
    let earnedAmountToUpdate = appt.earnedAmount;
    const currentRate = commissionRate || 200;
    
    // Immediate Optimistic Update for UI Responsiveness
    setAllAppointments(prev => prev.map(a => a.id === id ? { ...a, stage, earnedAmount: earnedAmountToUpdate } : a));

    if (prevStage !== AppointmentStage.ONBOARDED && stage === AppointmentStage.ONBOARDED) {
       earnedAmountToUpdate = currentRate;
       updateEarnings(appt.userId, 'add', currentRate);
    } else if (prevStage === AppointmentStage.ONBOARDED && stage !== AppointmentStage.ONBOARDED) {
       const amountToDeduct = appt.earnedAmount || 200;
       updateEarnings(appt.userId, 'subtract', amountToDeduct);
    }
    
    // Side effects after state update
    logActivity('move_stage', `Moved ${appt.name} to ${STAGE_LABELS[stage]}`, appt.id);
    await supabase.from('appointments').update({ stage, earned_amount: earnedAmountToUpdate }).eq('id', id);
  }, [user, allAppointments, commissionRate]);

  const handleSaveNotes = useCallback(async (id: string, notes: string) => {
    // Update local state
    setAllAppointments(prev => prev.map(a => a.id === id ? { ...a, notes } : a));
    // Update DB
    await supabase.from('appointments').update({ notes }).eq('id', id);
  }, []);

  const handleAEConfirm = async (aeName: string) => {
     if (pendingOnboardId) {
        const appt = allAppointments.find(a => a.id === pendingOnboardId);
        if (appt) {
           const currentRate = commissionRate || 200;
           updateEarnings(appt.userId, 'add', currentRate);
           logActivity('move_stage', `Moved ${appt.name} to Onboarded (AE: ${aeName})`, appt.id);
           setAllAppointments(prev => prev.map(a => a.id === pendingOnboardId ? { ...a, stage: AppointmentStage.ONBOARDED, aeName, earnedAmount: currentRate } : a));
           await supabase.from('appointments').update({ stage: AppointmentStage.ONBOARDED, ae_name: aeName, earned_amount: currentRate }).eq('id', pendingOnboardId);
        }
        setPendingOnboardId(null);
     } 
     else if (pendingTransferId) {
        const appt = allAppointments.find(a => a.id === pendingTransferId);
        if (appt) {
           logActivity('move_stage', `Transferred ${appt.name} to ${aeName}`, appt.id);
           setAllAppointments(prev => prev.map(a => a.id === pendingTransferId ? { ...a, stage: AppointmentStage.TRANSFERRED, aeName } : a));
           await supabase.from('appointments').update({ stage: AppointmentStage.TRANSFERRED, ae_name: aeName }).eq('id', pendingTransferId);
        }
        setPendingTransferId(null);
     }
  };

  const handleAdminLogOnboard = (data: any) => {
      handleSaveAppointment(data);
  };

  const executeDeleteAppointment = async () => {
    const id = deleteConfirmation.id;
    if (!user || !id) return;
    const appt = allAppointments.find(a => a.id === id);
    if (appt) {
        if (appt.stage === AppointmentStage.ONBOARDED) {
            const amountToDeduct = appt.earnedAmount || 200;
            updateEarnings(appt.userId, 'subtract', amountToDeduct);
        }
        logActivity('delete', `Deleted appointment: ${appt.name}`, appt.id);
    }
    setAllAppointments(prev => prev.filter(a => a.id !== id));
    await supabase.from('appointments').delete().eq('id', id);
    if (editingAppt?.id === id) { setIsModalOpen(false); setEditingAppt(null); }
    if (viewingAppt?.id === id) { setIsBusinessCardOpen(false); setViewingAppt(null); }
    setDeleteConfirmation({ isOpen: false, id: null, type: 'appointment' });
  };

  const promptDeleteAppointment = (id: string) => setDeleteConfirmation({ isOpen: true, id, type: 'appointment' });
  const openCreateModal = () => { setEditingAppt(null); setIsRescheduling(false); setIsCreateModalOpen(true); setIsAdminLogOnboardOpen(false); };
  const openAdminLogOnboard = () => { setEditingAppt(null); setIsRescheduling(false); setIsCreateModalOpen(true); setIsAdminLogOnboardOpen(true); };
  const openEditModal = (appt: Appointment, isRescheduleAction: boolean = false) => { 
      setEditingAppt(appt); 
      setIsRescheduling(isRescheduleAction); 
      setIsModalOpen(true); 
      setIsBusinessCardOpen(false); // Close business card if open
  };
  const handleViewAppointment = (appt: Appointment) => {
      setViewingAppt(appt);
      setIsBusinessCardOpen(true);
  };
  const handleOpenAppointmentFromId = (id: string) => { const appt = allAppointments.find(a => a.id === id); if (appt) handleViewAppointment(appt); };
  const handleAddCycle = async (startDate: string, endDate: string) => { const newCycle = { id: generateId(), start_date: startDate, end_date: endDate, status: 'active' }; setPayCycles(prev => [...prev, { id: newCycle.id, startDate, endDate, status: 'active' }]); await supabase.from('pay_cycles').insert(newCycle); };
  
  const handleEditCycle = async (id: string, startDate: string, endDate: string) => {
      // Update local state
      setPayCycles(prev => prev.map(c => c.id === id ? { ...c, startDate, endDate } : c));
      // Update DB
      await supabase.from('pay_cycles').update({ start_date: startDate, end_date: endDate }).eq('id', id);
  };

  const handleDeleteCycle = async (id: string) => { setPayCycles(prev => prev.filter(c => c.id !== id)); await supabase.from('pay_cycles').delete().eq('id', id); };
  const handleUpdateCommission = (rate: number) => { setCommissionRate(rate); localStorage.setItem(KEYS.COMMISSION, rate.toString()); };

  // --- NOTIFICATION PODS LOGIC ---
  const notificationPods = useMemo<Appointment[]>(() => {
    if (!user || !user.notificationSettings?.enabled) return [];
    
    // Use dashboard appointments (Pending/Rescheduled/etc.)
    const candidates = userAppointments.filter(a => 
      a.stage === AppointmentStage.PENDING || a.stage === AppointmentStage.RESCHEDULED
    );
    
    const now = new Date().getTime();
    const thresholdMs = (user.notificationSettings.thresholdMinutes || 15) * 60 * 1000;
    
    return candidates.filter(a => {
        if (dismissedNotificationIds.includes(a.id)) return false;
        
        const scheduled = new Date(a.scheduledAt).getTime();
        const diff = scheduled - now;

        // Logic: Show if within threshold (positive diff) OR if slightly overdue (negative diff) but not more than an hour late
        return diff <= thresholdMs && diff > -3600000; 
    }).sort((a,b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  }, [userAppointments, user, dismissedNotificationIds]);

  const handleDismissNotification = (id: string, phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPodId(id);
    
    // Visual delay before disappearing
    setTimeout(() => {
        setDismissedNotificationIds(prev => [...prev, id]);
        setCopiedPodId(null);
    }, 800);
  };

  const columns = useMemo(() => {
    const order = [AppointmentStage.PENDING, AppointmentStage.RESCHEDULED, AppointmentStage.NO_SHOW, AppointmentStage.DECLINED, AppointmentStage.ONBOARDED];
    
    let visibleOrder = order;
    if (!showFailedSection) {
        visibleOrder = visibleOrder.filter(stage => stage !== AppointmentStage.NO_SHOW && stage !== AppointmentStage.DECLINED);
    }

    if (user?.role === 'admin') return visibleOrder;
    return visibleOrder.filter(stage => dashboardAppointments.some(a => a.stage === stage));
  }, [dashboardAppointments, user, showFailedSection]);

  const totalLifetimeEarnings = useMemo(() => (userEarnings.current ? userEarnings.current.totalCents : 0) + userEarnings.history.reduce((acc, curr) => acc + curr.totalCents, 0), [userEarnings]);
  const totalOnboardedCount = useMemo(() => (userEarnings.current ? userEarnings.current.onboardedCount : 0) + userEarnings.history.reduce((acc, curr) => acc + curr.onboardedCount, 0), [userEarnings]);

  const renderContent = () => {
    if (loadingAuth) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="flex gap-2">
                    <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-4 h-4 bg-emerald-500 rounded-full animate-bounce"></div>
                </div>
            </div>
        );
    }

    switch(currentView) {
      case 'profile': return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <ProfileView 
              user={user!} 
              onUpdateUser={handleUpdateUser} 
              onCreateAdmin={handleCreateAdmin} 
              onDeleteAccount={handleSelfDelete} 
              totalEarnings={user?.role === 'admin' ? totalTeamEarnings : totalLifetimeEarnings} 
              totalOnboarded={totalOnboardedCount}
              showFailedSection={showFailedSection}
              onToggleFailedSection={handleToggleFailedSection}
            />
        </div>
      );
      case 'admin-dashboard': return <AdminDashboard members={teamMembers} payCycles={payCycles} onAddCycle={handleAddCycle} onEditCycle={handleEditCycle} onDeleteCycle={handleDeleteCycle} onDeleteUser={handleDeleteUser} stats={globalStats} commissionRate={commissionRate} onUpdateCommission={handleUpdateCommission} activeCycle={activePayCycle} activityLogs={activityLogs} onLogOnboard={openAdminLogOnboard} />;
      case 'user-analytics': return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <UserAnalytics appointments={userAppointments} earnings={userEarnings} activeCycle={activePayCycle} />
        </div>
      );
      case 'calendar': return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <CalendarView 
                appointments={user?.role === 'admin' ? allAppointments : userAppointments} 
                onEdit={openEditModal} 
                onView={handleViewAppointment}
                userRole={user?.role}
                users={allUsers}
                activeCycle={activePayCycle}
            />
        </div>
      );
      case 'onboarded': return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <OnboardedView 
                appointments={user?.role === 'admin' ? adminOnboardedList : userAppointments} 
                searchQuery={searchQuery} 
                onEdit={openEditModal} 
                onView={handleViewAppointment}
                onDelete={promptDeleteAppointment} 
                userRole={user!.role} 
                users={allUsers} 
                preferredDialer={user?.preferredDialer}
                currentWindow={user?.role === 'admin' ? undefined : userEarnings.current}
            />
        </div>
      );
      case 'earnings-full': return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <EarningsFullView 
                history={user?.role === 'admin' ? adminEarningsHistory : userEarnings.history} 
                currentWindow={user?.role === 'admin' ? null : userEarnings.current} 
                appointments={user?.role === 'admin' ? allAppointments : userAppointments} 
                onRemoveItem={(id) => handleMoveStage(id, AppointmentStage.PENDING)} 
                userRole={user!.role} 
                users={allUsers} 
            />
        </div>
      );
      case 'dashboard': default:
        return (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-40 bg-slate-50 dark:bg-slate-950 py-3 px-4 sm:px-6 lg:px-8 border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-all">
               <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{user?.role === 'admin' ? 'Team Dashboard' : 'Dashboard'}</h2>
               
               <div className="flex flex-wrap items-center gap-3">
                  {/* NOTIFICATION PODS AREA */}
                  {user?.role !== 'admin' && notificationPods.length > 0 && (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
                          {notificationPods.slice(0, 2).map((pod) => (
                             <button 
                                key={pod.id}
                                onClick={() => handleDismissNotification(pod.id, pod.phone)}
                                className={`
                                  flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border border-slate-200 dark:border-slate-700
                                  ${copiedPodId === pod.id 
                                    ? 'bg-emerald-500 text-white scale-95 ring-2 ring-emerald-300' 
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200'}
                                `}
                                title={`Due: ${new Date(pod.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                             >
                                <span className="truncate max-w-[80px]">{pod.name.split(' ')[0]}</span>
                                {copiedPodId === pod.id ? <IconCheck className="w-3 h-3" /> : <IconCopy className="w-3 h-3 opacity-50" />}
                             </button>
                          ))}
                          {notificationPods.length > 2 && (
                             <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold flex items-center justify-center text-slate-500">
                                +{notificationPods.length - 2}
                             </div>
                          )}
                      </div>
                  )}

                  {user?.role === 'admin' && (
                     <>
                        <div className="w-48">
                            <CustomSelect 
                            options={[{value: 'all', label: 'All Agents'}, ...allUsers.filter(u => u.role !== 'admin').map(u => ({value: u.id, label: u.name}))]}
                            value={adminAgentFilter}
                            onChange={setAdminAgentFilter}
                            placeholder="Filter Agent..."
                            />
                        </div>
                        <button onClick={openAdminLogOnboard} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-105 active:scale-95" title="Log Onboard">
                            <IconSparkles className="w-4 h-4" />
                            <span className="hidden sm:inline">Log Onboard</span>
                        </button>
                     </>
                  )}
                  {user?.role !== 'admin' && (
                    <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-105 active:scale-95">
                      <IconPlus className="w-4 h-4" /> <span className="hidden sm:inline">New Appointment</span><span className="sm:hidden">New</span>
                    </button>
                  )}
               </div>
            </div>
            
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                {activeTransfers.length > 0 && (
                <div className="animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-1.5 rounded-lg"><IconTransfer className="w-4 h-4" /></div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Transfers Queue</h3>
                        <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">{activeTransfers.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeTransfers.map(appt => (
                            <AppointmentCard key={appt.id} appointment={appt} onMoveStage={handleMoveStage} onEdit={openEditModal} onView={handleViewAppointment} onDelete={promptDeleteAppointment} agentName={user?.role === 'admin' ? allUsers.find(u => u.id === appt.userId)?.name : undefined} agentAvatar={user?.role === 'admin' ? allUsers.find(u => u.id === appt.userId)?.avatarId : undefined} preferredDialer={user?.preferredDialer} />
                        ))}
                    </div>
                </div>
                )}

                {dashboardAppointments.length === 0 && activeTransfers.length === 0 && user?.role === 'admin' && (
                <div className="text-center py-12 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700"><p className="text-slate-500">No appointments found.</p></div>
                )}
                
                {dashboardAppointments.length === 0 && activeTransfers.length === 0 && user?.role !== 'admin' && (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4">
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 text-indigo-500"><IconCalendar className="w-10 h-10" /></div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No appointments yet</h2>
                    <p className="text-slate-500 max-w-sm mb-8">Start tracking your calls by creating your first appointment.</p>
                    <button onClick={openCreateModal} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none transition-transform active:scale-95"><IconPlus className="w-5 h-5" />Create Appointment</button>
                </div>
                )}

                <div className={`grid gap-6 ${columns.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} items-start pb-20`}>
                {columns.map(stage => {
                    const items = dashboardAppointments.filter(a => a.stage === stage);
                    return (
                    <div key={stage} className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="font-medium text-slate-500 text-sm uppercase tracking-wider">{STAGE_LABELS[stage]}</h3>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs py-0.5 px-2 rounded-full font-medium">{items.length}</span>
                        </div>
                        <CardStack<Appointment> 
                            items={items}
                            renderItem={(appt) => (
                            <AppointmentCard key={appt.id} appointment={appt} onMoveStage={handleMoveStage} onEdit={openEditModal} onView={handleViewAppointment} onDelete={promptDeleteAppointment} agentName={user?.role === 'admin' ? allUsers.find(u => u.id === appt.userId)?.name : undefined} agentAvatar={user?.role === 'admin' ? allUsers.find(u => u.id === appt.userId)?.avatarId : undefined} preferredDialer={user?.preferredDialer} />
                            )}
                        />
                    </div>
                    )
                })}
                </div>
            </div>
          </>
        );
    }
  };

  if (loadingAuth) return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
            <div className="flex gap-2">
                <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-4 h-4 bg-emerald-500 rounded-full animate-bounce"></div>
            </div>
            <div className="mt-6 flex items-center gap-2">
                <div className="bg-indigo-600 p-1.5 rounded-lg">
                    <IconSparkles className="w-4 h-4 text-white" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-bold tracking-tight">ChiCayo Tax</p>
            </div>
        </div>
  );
  
  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="h-[100dvh] flex font-sans bg-slate-50 dark:bg-slate-950 overflow-hidden selection:bg-indigo-100 dark:selection:bg-indigo-900 transition-colors duration-200">
      <TutorialOverlay isOpen={!user.hasSeenTutorial} userRole={user.role} onComplete={handleTutorialComplete} />
      <Sidebar currentView={currentView} onChangeView={handleSetCurrentView} isOpen={isSidebarOpen} onCloseMobile={() => setIsSidebarOpen(false)} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} onLogout={handleLogout} userRole={user.role} userAvatar={user.avatarId} userName={user.name} />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 h-full relative">
        <header className="shrink-0 sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:hidden">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-slate-300"><IconMenu /></button>
               <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">ChiCayo Tax</div>
            </div>
            <div className="flex-1 flex items-center max-w-xl">
              {currentView !== 'admin-dashboard' && currentView !== 'profile' && currentView !== 'user-analytics' && (
                 <div className="relative w-full">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-full py-2 pl-10 pr-10 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all outline-none" 
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            <IconX className="w-3 h-3" />
                        </button>
                    )}
                 </div>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">{darkMode ? <IconSun className="w-5 h-5"/> : <IconMoon className="w-5 h-5"/>}</button>
              {currentView !== 'admin-dashboard' && currentView !== 'user-analytics' && (
                <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" onClick={() => setIsEarningsPanelOpen(true)}>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:block">{user.role === 'admin' ? 'Team Earned' : 'Current'}</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${user.role === 'admin' ? (totalTeamEarnings / 100).toFixed(0) : (userEarnings.current ? (userEarnings.current.totalCents / 100).toFixed(0) : '0')}</div>
                </div>
              )}
              <button onClick={() => handleSetCurrentView('profile')} className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold border border-indigo-200 dark:border-indigo-800 uppercase hover:ring-2 hover:ring-indigo-500 transition-all overflow-hidden" title="Profile">
                {user.avatarId && user.avatarId !== 'initial' ? getAvatarIcon(user.avatarId) : <span className="text-xs font-bold">{user.name?.charAt(0).toUpperCase() || 'U'}</span>}
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto no-scrollbar bg-slate-50 dark:bg-slate-950">{renderContent()}</main>
      </div>
      
      <CreateModal 
        isOpen={isCreateModalOpen} 
        onClose={() => { setIsCreateModalOpen(false); setIsAdminLogOnboardOpen(false); }} 
        onSubmit={isAdminLogOnboardOpen ? handleAdminLogOnboard : handleSaveAppointment} 
        isAdminMode={isAdminLogOnboardOpen}
        agentOptions={user.role === 'admin' ? allUsers.filter(u => u.role !== 'admin') : undefined}
        currentUserEmail={user.email}
        currentUserName={user.name}
      />
      
      <AppointmentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleSaveAppointment} 
        onDelete={promptDeleteAppointment} 
        initialData={editingAppt} 
        isRescheduling={isRescheduling} 
      />

      <BusinessCardModal 
        isOpen={isBusinessCardOpen}
        onClose={() => setIsBusinessCardOpen(false)}
        appointment={viewingAppt}
        onEdit={(appt, isRescheduling) => openEditModal(appt, isRescheduling)}
        onDelete={promptDeleteAppointment}
        onMoveStage={handleMoveStage}
        onSaveNotes={handleSaveNotes}
        onNext={handleNextAppt}
        onPrev={handlePrevAppt}
        hasNext={currentNavIndex !== -1 && currentNavIndex < navigationContextList.length - 1}
        hasPrev={currentNavIndex > 0}
      />

      <DeleteConfirmationModal isOpen={deleteConfirmation.isOpen} onClose={() => setDeleteConfirmation({ isOpen: false, id: null })} onConfirm={() => { if (deleteConfirmation.type === 'user') executeDeleteUser(); else if (deleteConfirmation.type === 'self') executeSelfDelete(); else executeDeleteAppointment(); }} title={deleteConfirmation.type === 'self' ? "Delete Your Account?" : deleteConfirmation.type === 'user' ? "Delete User?" : "Delete Appointment?"} message={deleteConfirmation.type === 'self' ? "Are you sure you want to delete your account? This will permanently erase all your data and cannot be undone." : deleteConfirmation.type === 'user' ? "Are you sure you want to remove this agent? All their data (appointments, earnings) will be permanently deleted." : "Are you sure you want to delete this appointment? This action cannot be undone."} />
      <AlertModal isOpen={alertModal.isOpen} onClose={() => setAlertModal({...alertModal, isOpen: false})} title={alertModal.title} message={alertModal.message} type={alertModal.type} />
      <AESelectionModal isOpen={isAEModalOpen} onClose={() => setIsAEModalOpen(false)} onConfirm={handleAEConfirm} />
      <EarningsPanel isOpen={isEarningsPanelOpen} onClose={() => setIsEarningsPanelOpen(false)} onViewAll={() => { setIsEarningsPanelOpen(false); if (user.role !== 'admin') { handleSetCurrentView('earnings-full'); } else { handleSetCurrentView('admin-dashboard'); } }} currentWindow={user.role === 'admin' ? null : userEarnings.current} history={user.role === 'admin' ? [] : userEarnings.history} isTeamView={user.role === 'admin'} teamEarnings={totalTeamEarnings} activeCycleLabel={activePayCycle ? `${new Date(activePayCycle.startDate).toLocaleDateString()} - ${new Date(activePayCycle.endDate).toLocaleDateString()}` : 'No Active Cycle'} />
      <TaxterChat user={user} allAppointments={allAppointments} allEarnings={allEarnings} payCycles={payCycles} allUsers={allUsers} onOpenAppointment={handleOpenAppointmentFromId} onNavigate={handleSetCurrentView} />
    </div>
  );
}


import React, { useState, useMemo } from 'react';
import { Appointment, AppointmentStage, EarningWindow, PayCycle, ACCOUNT_EXECUTIVES, Incentive, TeamMember, User } from '../types';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import { IconTrendingUp, IconBriefcase, IconTransfer, IconCheck, IconCycle, IconClock, IconChevronDown, IconActivity, IconSparkles, IconTrophy, IconChartBar, IconUsers, IconStar, IconZap, IconRocket, IconDollarSign } from './Icons';
import { CustomSelect } from './CustomSelect';
import { ReferralWinsTab } from './ReferralWinsTab';
import { calculatePeakTime } from '../utils/analyticsUtils';

interface UserAnalyticsProps {
   appointments: Appointment[];
   allAppointments: Appointment[];
   allIncentives: Incentive[];
   earnings: { current: EarningWindow | null; history: EarningWindow[] };
   activeCycle?: PayCycle;
   payCycles?: PayCycle[];
   currentUserName?: string;
   currentUser: User;
   referralRate: number;
   users: User[];
   onViewAppt: (appt: Appointment, stack?: Appointment[]) => void;
}

export const UserAnalytics: React.FC<UserAnalyticsProps> = ({
   appointments, allAppointments, allIncentives, earnings, activeCycle, payCycles = [], currentUserName, currentUser, referralRate, users, onViewAppt
}) => {
   const [selectedScopeId, setSelectedScopeId] = useState<string>('active');
   const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());
   const [isHistoryOpen, setIsHistoryOpen] = useState(false);
   const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

   const toggleCycle = (id: string) => {
      const next = new Set(expandedCycles);
      if (next.has(id)) next.delete(id); else next.add(id);
      setExpandedCycles(next);
   };

   const scopeOptions = useMemo(() => {
      const options = [{ value: 'active', label: 'Current Active Cycle' }, { value: 'lifetime', label: 'Total Lifetime Stats' }];
      payCycles.filter(c => new Date(c.endDate).getTime() < Date.now()).sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()).slice(0, 5).forEach(c => options.push({ value: c.id, label: `${formatDate(c.startDate)} - ${formatDate(c.endDate)}` }));
      return options;
   }, [payCycles]);

   const scopedData = useMemo(() => {
      let personalFiltered = appointments;
      let teamFiltered = allAppointments;
      let label = "Active Cycle";
      let start: number | null = null;
      let end: number | null = null;
      let scopeType: 'active' | 'lifetime' | 'history' = 'lifetime';
      let scopeCycleId: string | null = null;

      if (selectedScopeId === 'active' && activeCycle) {
         start = new Date(activeCycle.startDate).getTime();
         end = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
         scopeType = 'active';
         scopeCycleId = activeCycle.id;
      } else if (selectedScopeId !== 'lifetime') {
         const cycle = payCycles.find(c => c.id === selectedScopeId);
         if (cycle) {
            start = new Date(cycle.startDate).getTime();
            end = new Date(cycle.endDate).setHours(23, 59, 59, 999);
            label = `${formatDate(cycle.startDate)} - ${formatDate(cycle.endDate)}`;
            scopeType = 'history';
            scopeCycleId = cycle.id;
         }
      } else {
         label = "Lifetime Performance";
         scopeType = 'lifetime';
      }

      // STRICT CYCLE FILTERING
      // Onboarded appointments use onboardedAt; Activated appointments use activatedAt.
      // This is critical to prevent an activation that was closed in a previous cycle
      // from appearing in the current active cycle stats.
      const filterApptForCycle = (a: Appointment): boolean => {
         if (scopeType === 'lifetime' || start === null || end === null) return true;
         const s = start; const e = end;
         if (a.stage === AppointmentStage.ACTIVATED) {
            const d = new Date(a.activatedAt || a.onboardedAt || a.scheduledAt).getTime();
            return d >= s && d <= e;
         }
         const d = new Date(a.onboardedAt || a.scheduledAt).getTime();
         return d >= s && d <= e;
      };

      const personalFiltersApplied = personalFiltered.filter(filterApptForCycle);
      const teamFiltersApplied = teamFiltered.filter(filterApptForCycle);

      const personalOnboarded = personalFiltersApplied.filter(a => a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED);
      const teamOnboarded = teamFiltersApplied.filter(a => a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED);

      const aeBreakdown: Record<string, number> = { 'Joshua': 0, 'Jorge': 0, 'Andrew': 0 };
      if (currentUserName) aeBreakdown[currentUserName] = 0;

      personalOnboarded.forEach(a => {
         if (a.aeName && aeBreakdown.hasOwnProperty(a.aeName)) aeBreakdown[a.aeName]++;
         else if (!a.aeName && currentUserName) aeBreakdown[currentUserName]++;
      });

      // Incentives: first filter by appliedCycleId (DB-level), then cross-validate
      // activation incentives against the linked appointment's actual event date
      // (UI-level safety net — catches any remaining DB mismatches).
      const personalIncentives = allIncentives.filter(i => {
         if (i.userId !== currentUser.id) return false;
         if (scopeType === 'lifetime') return true;

         // Primary filter: appliedCycleId must match
         if (i.appliedCycleId !== scopeCycleId) return false;

         // Secondary guard for activation incentives: cross-validate the linked
         // appointment's actual closing date against the cycle's date window.
         // This catches backfilled records whose created_at is today but whose
         // partner was actually activated in a prior cycle.
         if (i.label.toLowerCase().includes('activat') && i.relatedAppointmentId && start !== null && end !== null) {
            const linkedAppt = allAppointments.find(a => a.id === i.relatedAppointmentId);
            if (linkedAppt) {
               const eventDate = new Date(linkedAppt.activatedAt || linkedAppt.onboardedAt || linkedAppt.scheduledAt || 0).getTime();
               if (eventDate < start || eventDate > end) {
                  // The appointment's actual closing date is outside this cycle — exclude it.
                  return false;
               }
            }
         }

         return true;
      });

      const personalOnboardedAppointments = personalFiltersApplied.filter(a => 
         (a.userId === currentUser.id && a.stage === AppointmentStage.ONBOARDED) || 
         (a.userId === currentUser.id && a.stage === AppointmentStage.ACTIVATED) ||
         (a.activatedByUserId === currentUser.id && a.stage === AppointmentStage.ACTIVATED)
      );
      // But for the "Onboarded" count, we usually mean strictly onboards we own
      const onboarded = personalFiltersApplied.filter(a => a.userId === currentUser.id && (a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED)).length;

      // Base production revenue (Onboard fees)
      const onboardingRevenue = personalOnboardedAppointments.reduce((sum, a) => sum + (a.earnedAmount || 0), 0);
      
      // Calculate average payout ONLY for those that actually earned a base commission
      // This prevents 'direct activations' (0 base) from skewing the reported rate.
      const paidOnboards = personalOnboardedAppointments.filter(a => (a.earnedAmount || 0) > 0);
      const avgOnboard = paidOnboards.length > 0 ? (onboardingRevenue / paidOnboards.length) : 0; // Corrected: avgOnboard should be per onboard, not per 100

      // Activation / Referral Bonus Revenue (from Incentives)
      // These are incentives linked to an appointment activated in this cycle
      const personalActivationIncentives = personalIncentives.filter(i => (i.label || '').toLowerCase().includes('activat'));
      const activeReferralsCount = personalActivationIncentives.length;
      const activationIncentiveRevenue = personalActivationIncentives.reduce((sum, i) => sum + Number(i.amountCents), 0);

      // Other bonus revenue (not activation/referral related)
      const personalBonusRevenue = personalIncentives.filter(i => {
         // Skip activation and ref incentives — they are counted separately
         if (i.label.toLowerCase().includes('activat')) return false;
         if (i.relatedAppointmentId && i.label.toLowerCase().includes('ref')) return false;
         return true;
      }).reduce((sum, i) => sum + Number(i.amountCents), 0);

      // Total Revenue for this scope
      const totalRevenue = onboardingRevenue + activationIncentiveRevenue + personalBonusRevenue;

      // Team pool: strictly by appliedCycleId AND date cross-validation for activations
      const teamPoolIncentives = allIncentives.filter(i => {
         if (scopeType === 'lifetime') return true;
         if (i.appliedCycleId !== scopeCycleId) return false;
         // Cross-validate activation date for team pool too
         if (i.label.toLowerCase().includes('activat') && i.relatedAppointmentId && start !== null && end !== null) {
            const linkedAppt = allAppointments.find(a => a.id === i.relatedAppointmentId);
            if (linkedAppt) {
               const eDate = new Date(linkedAppt.activatedAt || linkedAppt.onboardedAt || linkedAppt.scheduledAt || 0).getTime();
               if (eDate < start || eDate > end) return false;
            }
         }
         return true;
      });

      const teamTotalPool = teamOnboarded.reduce((sum, a) => {
         const base = Number(a.earnedAmount) || 0;
         return sum + base;
      }, 0) + teamPoolIncentives.reduce((sum, i) => sum + Number(i.amountCents), 0);

      return {
         total: personalFiltersApplied.length,
         onboarded: onboarded,
         revenue: totalRevenue, // This is the new totalRevenue
         bonusRevenue: personalBonusRevenue,
         referralRevenue: activationIncentiveRevenue,
         referralCount: activeReferralsCount,
         aeBreakdown,
         selfOnboards: personalOnboarded.filter(a => !a.aeName || a.aeName === currentUserName).length,
         scopeLabel: label,
         teamPoolTotal: teamTotalPool,
         scopeType,
         peakTime: personalOnboarded.length > 0 ? calculatePeakTime(personalOnboarded).label : 'N/A',
         onboardRevenue: onboardingRevenue,
         activationRevenue: activationIncentiveRevenue,
         avgOnboard,
         totalRevenue // Exposing totalRevenue directly
      };
   }, [appointments, allAppointments, allIncentives, selectedScopeId, activeCycle, payCycles, currentUserName, currentUser.id]);

   const currentRevenue: number = Number(scopedData.revenue) || 0;
   const poolTotal: number = Number(scopedData.teamPoolTotal) || 0;
   const contributionPercentage = poolTotal > 0 ? Math.round((currentRevenue / poolTotal) * 100) : 0;

   const radius = 35;
   const circum = 2 * Math.PI * radius;
   const strokeDash = (contributionPercentage / 100) * circum;

   const historicalWindows = useMemo(() => earnings.current ? [earnings.current, ...earnings.history] : earnings.history, [earnings.current, earnings.history]);

   const leaderboardData = useMemo(() => {
      let start: number | null = null;
      let end: number | null = null;
      let scopeType: 'active' | 'lifetime' | 'history' = 'lifetime';

      if (selectedScopeId === 'active' && activeCycle) {
         start = new Date(activeCycle.startDate).getTime();
         end = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
         scopeType = 'active';
      } else if (selectedScopeId !== 'lifetime') {
         const cycle = payCycles.find(c => c.id === selectedScopeId);
         if (cycle) {
            start = new Date(cycle.startDate).getTime();
            end = new Date(cycle.endDate).setHours(23, 59, 59, 999);
            scopeType = 'history';
         }
      }

      const performers = users.map(u => {
         let userAppts = allAppointments.filter(a => a.userId === u.id || a.activatedByUserId === u.id);
         let userIncentives = allIncentives.filter(i => i.userId === u.id);

         if (scopeType !== 'lifetime' && start !== null && end !== null) {
            const s = start; const e = end;
            userAppts = userAppts.filter(a => {
               const d = new Date(a.onboardedAt || a.scheduledAt).getTime();
               return d >= s && d <= e;
            });
            userIncentives = userIncentives.filter(i => {
               if (scopeType === 'active' && i.appliedCycleId !== activeCycle?.id) return false;
               if (scopeType === 'history' && i.appliedCycleId !== selectedScopeId) return false;
               return true;
            });
         }

         const onboards = userAppts.filter(a => a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED);
         const prodRev = onboards.reduce((sum, a) => sum + (Number(a.earnedAmount) || 0), 0);
         const actRev = userIncentives.filter(i => i.label.toLowerCase().includes('activat')).reduce((sum, i) => sum + i.amountCents, 0);
         const bonusRev = userIncentives.filter(i => {
            if (i.label.toLowerCase().includes('activat')) return false;
            if (i.relatedAppointmentId && i.label.toLowerCase().includes('ref')) return false;
            return true;
         }).reduce((sum, i) => sum + Number(i.amountCents), 0);

         return {
            id: u.id,
            name: u.name,
            avatarId: u.avatarId,
            revenue: prodRev + actRev + bonusRev
         };
      }).filter(p => p.revenue > 0).sort((a, b) => b.revenue - a.revenue);

      return performers;
   }, [users, allAppointments, allIncentives, selectedScopeId, activeCycle, payCycles]);

   return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
         <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none"><IconActivity className="w-6 h-6" /></div>
               <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Performance Scope</h2>
                  <p className="text-xs text-slate-500 font-medium">Viewing personal stats for: <span className="text-indigo-600 font-bold">{scopedData.scopeLabel}</span></p>
               </div>
            </div>
            <div className="w-full md:w-64"><CustomSelect options={scopeOptions} value={selectedScopeId} onChange={setSelectedScopeId} /></div>
         </div>

         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-indigo-600 p-6 rounded-[2.5rem] shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 text-white/10 group-hover:text-white/20 transition-colors"><IconActivity className="w-12 h-12" /></div>
               <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">Peak AI Alert</p>
               <div className="text-3xl font-black text-white">{scopedData.peakTime}</div>
               <p className="text-[9px] font-bold text-indigo-100/60 mt-1">Your most active power hour</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 text-slate-50 dark:text-slate-800/40"><IconZap className="w-12 h-12" /></div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Efficiency Ratio</p>
               <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">1:{scopedData.onboarded > 0 ? (scopedData.referralCount / scopedData.onboarded).toFixed(1) : '0'}</div>
               <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Activations Per Onboard</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 text-slate-50 dark:text-slate-800/40 transition-transform group-hover:rotate-12"><IconTrophy className="w-12 h-12" /></div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Onboards</p>
               <div className="text-3xl font-black text-emerald-600 tabular-nums">{scopedData.onboarded}</div>
               <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Confirmed Partners</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 text-slate-50 dark:text-slate-800/40"><IconSparkles className="w-12 h-12" /></div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Payout</p>
               <div className="text-3xl font-black text-indigo-600 tabular-nums">{formatCurrency(scopedData.revenue)}</div>
               <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Confirmed + Activation Rewards</p>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div><h2 className="text-3xl font-black mb-1">Production Stats</h2><p className="text-indigo-100 flex items-center gap-2 text-sm font-medium"><IconRocket className="w-4 h-4" /> Performance verified by Taxter AI</p></div>
                  <div className="text-right">
                     <div className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1 opacity-80">Total Scoped Pay</div>
                     <div className="text-5xl font-black tracking-tight drop-shadow-md">{formatCurrency(scopedData.revenue)}</div>
                  </div>
               </div>
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
            </div>

            {contributionPercentage > 0 && (
               <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-6 animate-in slide-in-from-right-4 duration-500">
                  <div className="relative w-28 h-28 shrink-0">
                     <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full drop-shadow-sm">
                        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="8" className="dark:stroke-slate-700" />
                        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#6366f1" strokeWidth="10" strokeDasharray={`${strokeDash} ${circum}`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{contributionPercentage}%</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase">Share</span>
                     </div>
                  </div>
                  <div>
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Team Influence</h3>
                     <div className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        You own {contributionPercentage}% of the {scopedData.scopeType === 'lifetime' ? 'lifetime' : 'scoped'} team pool.
                     </div>
                     <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-2 uppercase tracking-tighter bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded w-fit">
                        POOL: {formatCurrency(scopedData.teamPoolTotal)}
                     </div>
                  </div>
               </div>
            )}
         </div>

         {
            scopedData.referralCount > 0 && (
               <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-2 border-emerald-200 dark:border-emerald-900/50 p-8 rounded-[3rem] flex flex-col md:flex-row items-center gap-8 animate-in zoom-in duration-700 shadow-lg shadow-emerald-100 dark:shadow-none relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <div className="p-6 bg-emerald-600 text-white rounded-3xl shadow-xl shadow-emerald-200 dark:shadow-none shrink-0 group hover:rotate-6 transition-transform relative z-10">
                     <IconUsers className="w-10 h-10" />
                  </div>
                  <div className="flex-1 text-center md:text-left relative z-10">
                     <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-emerald-600 text-[8px] font-black text-white uppercase tracking-widest rounded-full">Active Bonus</span>
                        <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-tighter">Activation Rewards</h3>
                     </div>
                     <p className="text-sm font-bold text-emerald-700 dark:text-emerald-500/80 max-w-md">Your network is your net worth! You've earned an extra <span className="text-emerald-600 dark:text-emerald-300 font-black">{formatCurrency(scopedData.referralRevenue)}</span> from {scopedData.referralCount} activations sent by onboarded partners.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full md:w-auto relative z-10">
                     <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900 shadow-sm text-center">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Activations</span>
                        <span className="text-3xl font-black text-emerald-600">{scopedData.referralCount}</span>
                     </div>
                     <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900 shadow-sm text-center">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Rewards</span>
                        <span className="text-3xl font-black text-emerald-600">{formatCurrency(scopedData.referralRevenue)}</span>
                     </div>
                  </div>
               </div>
            )
         }

         {scopedData.total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02]"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl"><IconCheck className="w-4 h-4" /></div><span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Onboarded</span></div><div className="text-3xl font-black text-slate-900 dark:text-white">{scopedData.onboarded}</div><div className="text-[10px] text-slate-400 font-medium mt-1">Confirmed Wins</div></div>
               <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02]"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl"><IconSparkles className="w-4 h-4" /></div><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Self Rate</span></div><div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{scopedData.onboarded > 0 ? ((scopedData.selfOnboards / scopedData.onboarded) * 100).toFixed(1) : '0.0'}%</div><div className="text-[10px] text-slate-400 font-medium mt-1">{scopedData.selfOnboards} Independent Closes</div></div>
               <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02]"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl"><IconTrendingUp className="w-4 h-4" /></div><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Conversion</span></div><div className="text-3xl font-black text-slate-900 dark:text-white">{scopedData.total > 0 ? ((scopedData.onboarded / scopedData.total) * 100).toFixed(1) : '0.0'}%</div><div className="text-[10px] text-slate-400 font-medium mt-1">Lead to Deal Mastery</div></div>
               <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02]"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl"><IconClock className="w-4 h-4" /></div><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Peak Time</span></div><div className="text-3xl font-black text-slate-900 dark:text-white">{scopedData.peakTime}</div><div className="text-[10px] text-slate-400 font-medium mt-1">Optimization analysis</div></div>
            </div>
         )}

         {/* EARNINGS BREAKDOWN WIDGET - Only show if there's data */}
         {scopedData.onboarded > 0 && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-8 rounded-[2.5rem] border border-emerald-200 dark:border-emerald-800 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 text-emerald-100/50 dark:text-emerald-800/10 z-0"><IconTrendingUp className="w-16 h-16" /></div>
               <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="shrink-0">
                     <h3 className="text-xl font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-3">
                        <IconDollarSign className="w-6 h-6 text-emerald-600" />
                        Earnings Breakdown
                     </h3>
                     <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">How your payout is composed</p>
                  </div>
                  <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap shadow-sm border border-emerald-200/50 dark:border-emerald-700/30 relative z-20 mr-2">
                     {scopedData.scopeLabel}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Onboard Earnings */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
                     <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                           <IconCheck className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Onboard Base</span>
                     </div>
                     <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mb-1">{formatCurrency(scopedData.onboardRevenue)}</div>
                     <div className="text-[10px] text-slate-500 font-medium">From {scopedData.onboarded} onboard{scopedData.onboarded !== 1 ? 's' : ''}</div>
                  </div>

                  {/* Activation Earnings */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
                     <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                           <IconRocket className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activation Bonus</span>
                     </div>
                     <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mb-1">{formatCurrency(scopedData.activationRevenue)}</div>
                     <div className="text-[10px] text-slate-500 font-medium">From {scopedData.referralCount} activation{scopedData.referralCount !== 1 ? 's' : ''}</div>
                  </div>

                  {/* Visual Breakdown Chart */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                     <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl">
                           <IconChartBar className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Composition</span>
                     </div>
                     <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <div className="flex-1">
                           <div className="flex justify-between mb-2">
                              <span className="text-[10px] font-black text-emerald-600 uppercase">Onboard Base ({scopedData.onboarded})</span>
                              <span className="text-[10px] font-black text-indigo-600 uppercase">Activation Boost ({scopedData.referralCount})</span>
                           </div>
                           <div className="h-4 bg-indigo-500 rounded-full flex overflow-hidden shadow-inner">
                              <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(scopedData.onboardRevenue / (scopedData.totalRevenue || 1)) * 100}%` }} />
                           </div>
                           <div className="flex justify-between mt-3">
                              <span className="text-xl font-black text-slate-900 dark:text-white">{((scopedData.onboardRevenue / (scopedData.totalRevenue || 1)) * 100).toFixed(0)}%</span>
                              <span className="text-xl font-black text-slate-900 dark:text-white">{((scopedData.referralRevenue / (scopedData.totalRevenue || 1)) * 100).toFixed(0)}%</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {scopedData.onboarded > 0 && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 text-slate-100 dark:text-slate-800/20 z-0"><IconTrendingUp className="w-16 h-16" /></div>
               <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="shrink-0">
                     <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <IconBriefcase className="w-4 h-4 text-indigo-600" /> 
                        AE Closing Breakdown
                     </h3>
                     <p className="text-[10px] text-slate-500 font-medium mt-0.5">Who is sealing the deal on your leads?</p>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest leading-none whitespace-nowrap border border-indigo-100 dark:border-indigo-800/30 relative z-20 mr-2">
                     {scopedData.onboarded} Wins
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {Object.entries(scopedData.aeBreakdown).map(([name, countValue]) => {
                     const count = countValue as number;
                     const percent = scopedData.onboarded > 0 ? Math.round((count / scopedData.onboarded) * 100) : 0; const isSelf = name === currentUserName;
                     return (<div key={name} className="space-y-1.5"><div className="flex justify-between items-end"><div className="flex items-center gap-2"><span className={`font-bold text-xs ${isSelf ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{name} {isSelf && '(You)'}</span></div><div className="text-right"><span className="text-sm font-black text-slate-900 dark:text-white leading-none">{count}</span><span className="text-[9px] font-bold text-slate-400 ml-1 uppercase">Wins</span></div></div><div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-50 dark:border-slate-800/50"><div className={`h-full ${isSelf ? 'bg-indigo-600' : 'bg-slate-400'} transition-all duration-1000`} style={{ width: `${percent}%` }} /></div><div className="flex justify-between"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Support Level</span><span className="text-[9px] font-black text-slate-500">{percent}%</span></div></div>);
                  })}
               </div>
            </div>
         )}

         {scopedData.referralCount > 0 && (
            <div className="space-y-4">
               <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3"><IconStar className="w-6 h-6 text-emerald-500" /> My Referral Insights</h3>
               <ReferralWinsTab
                  appointments={allAppointments}
                  incentives={allIncentives}
                  users={users}
                  payCycles={payCycles}
                  referralRate={referralRate}
                  currentUser={currentUser}
                  onViewAppt={onViewAppt}
               />
            </div>
         )}
         
         {/* Payout History Moved to Bottom & Collapsible */}
         <div className="space-y-4 border-t-4 border-slate-100 dark:border-slate-800 pt-10">
            <button
               onClick={() => setIsHistoryOpen(!isHistoryOpen)}
               className="flex items-center justify-between w-full px-4 group"
            >
               <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                  <IconCycle className="w-8 h-8 text-indigo-500" />
                  Cycle Payout History
               </h3>
               <div className={`p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 transition-all group-hover:bg-indigo-600 group-hover:text-white ${isHistoryOpen ? 'rotate-180' : ''}`}>
                  <IconChevronDown className="w-6 h-6" />
               </div>
            </button>

            {isHistoryOpen && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-500">
                  {historicalWindows.map(win => {
                     const isOpen = expandedCycles.has(win.id);
                     return (
                        <div key={win.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] overflow-hidden shadow-sm transition-all hover:shadow-md h-fit">
                           <button onClick={() => toggleCycle(win.id)} className="w-full p-6 flex items-center justify-between text-left transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                              <div className="flex items-center gap-5">
                                 <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-2xl flex flex-col items-center justify-center font-black">
                                    <span className="text-xl leading-none">{win.onboardedCount}</span>
                                    <span className="text-[8px] uppercase tracking-tighter">Wins</span>
                                 </div>
                                 <div className="shrink-0">
                                    <div className="text-sm font-black text-slate-900 dark:text-white mb-0.5">{formatDate(win.startDate)} — {formatDate(win.endDate)}</div>
                                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Total: {formatCurrency(win.totalCents)}</div>
                                 </div>
                              </div>
                              <div className={`p-2 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                 <IconChevronDown className="w-5 h-5" />
                              </div>
                           </button>

                           {isOpen && (
                              <div className="px-6 pb-6 animate-in slide-in-from-top-4 duration-300">
                                 <div className="space-y-4 border-t border-slate-100 dark:border-slate-700 pt-6">
                                    {win.incentives && win.incentives.length > 0 && (
                                       <div className="space-y-2">
                                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bonuses Earned</h5>
                                          {win.incentives.map(i => (
                                             <div key={i.id} className="flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                                <div className="flex items-center gap-2">
                                                   <IconSparkles className="w-3.5 h-3.5 text-emerald-600" />
                                                   <span className="text-xs font-bold text-emerald-900 dark:text-emerald-400 truncate max-w-[150px]">{i.label}</span>
                                                </div>
                                                <span className="text-xs font-black text-emerald-600 shrink-0">+{formatCurrency(i.amountCents)}</span>
                                             </div>
                                          ))}
                                       </div>
                                    )}
                                    <div className="space-y-2">
                                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmed Deals</h5>
                                       <div className="max-h-[150px] overflow-y-auto no-scrollbar space-y-1">
                                          {appointments.filter(a => {
                                             const d = new Date(a.onboardedAt || a.scheduledAt).getTime();
                                             const winStart = new Date(win.startDate).getTime();
                                             const winEnd = new Date(win.endDate).setHours(23, 59, 59, 999);
                                             return (a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED) && d >= winStart && d <= winEnd;
                                          }).map(a => (
                                             <button
                                                key={a.id}
                                                onClick={() => onViewAppt(a)}
                                                className="w-full flex justify-between items-center text-xs p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 text-left transition-colors"
                                             >
                                                <div className="truncate pr-4">
                                                   <span className="font-bold text-slate-900 dark:text-white block truncate">{a.name}</span>
                                                   {a.referralCount ? <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Includes Referrals</span> : null}
                                                </div>
                                                <span className="font-bold text-emerald-600 shrink-0">+{formatCurrency((a.earnedAmount || 0) + (a.referralCount || 0) * referralRate)}</span>
                                             </button>
                                          ))}
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           )}
                        </div>
                     );
                  })}
               </div>
            )}
         </div>

         {/* FULL TEAM LEADERBOARD */}
         {leaderboardData.length > 0 && (
            <div className="space-y-4 border-t-4 border-slate-100 dark:border-slate-800 pt-10">
               <button
                  onClick={() => setIsLeaderboardOpen(!isLeaderboardOpen)}
                  className="flex items-center justify-between w-full px-4 group"
               >
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                     <IconTrophy className="w-8 h-8 text-amber-500" />
                     Full Team Leaderboard
                  </h3>
                  <div className={`p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 transition-all group-hover:bg-amber-500 group-hover:text-white ${isLeaderboardOpen ? 'rotate-180' : ''}`}>
                     <IconChevronDown className="w-6 h-6" />
                  </div>
               </button>

               {isLeaderboardOpen && (
                  <div className="animate-in slide-in-from-top-4 duration-500 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                           <div className="flex items-center gap-2 mb-4">
                              <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest rounded-lg">Ranked by Performance</span>
                           </div>
                           <div className="space-y-4">
                              {leaderboardData.map((performer, idx) => {
                                 const maxRev = leaderboardData[0].revenue;
                                 const relativeWidth = Math.max(10, (performer.revenue / maxRev) * 100);
                                 const isSelf = performer.id === currentUser.id;
                                 
                                 // Sequence of colors for top 5
                                 const colors = [
                                    'bg-amber-500',
                                    'bg-indigo-500',
                                    'bg-emerald-500',
                                    'bg-violet-500',
                                    'bg-rose-500'
                                 ];
                                 const barColor = idx < 5 ? colors[idx] : 'bg-slate-400';

                                 return (
                                    <div key={performer.id} className="group">
                                       <div className="flex justify-between items-center mb-1.5 px-1">
                                          <div className="flex items-center gap-3">
                                             <span className="text-xs font-black text-slate-400 w-4">#{idx + 1}</span>
                                             <span className={`text-sm font-bold ${isSelf ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {performer.name} {isSelf && '(You)'}
                                             </span>
                                          </div>
                                          {idx === 0 && <IconStar className="w-4 h-4 text-amber-500" />}
                                       </div>
                                       <div className="h-4 w-full bg-slate-50 dark:bg-slate-800/50 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner p-1">
                                          <div 
                                             className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out`}
                                             style={{ width: `${relativeWidth}%` }}
                                          />
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>

                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50">
                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Ownership of Full Pot</h4>
                           <div className="relative w-64 h-64">
                              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                 {leaderboardData.slice(0, 8).map((p, i, arr) => {
                                    const total = leaderboardData.reduce((sum, item) => sum + item.revenue, 0);
                                    let offset = 0;
                                    for (let j = 0; j < i; j++) offset += (arr[j].revenue / total) * 100;
                                    const percent = (p.revenue / total) * 100;
                                    
                                    const colors = ['#f59e0b', '#6366f1', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4', '#ec4899', '#84cc16'];
                                    const stroke = colors[i % colors.length];
                                    const r = 40;
                                    const c = 2 * Math.PI * r;
                                    const dash = (percent / 100) * c;
                                    const space = c - dash;

                                    return (
                                       <circle
                                          key={p.id}
                                          cx="50" cy="50" r={r}
                                          fill="transparent"
                                          stroke={stroke}
                                          strokeWidth="12"
                                          strokeDasharray={`${dash} ${space}`}
                                          strokeDashoffset={-(offset / 100) * c}
                                          className="transition-all duration-1000"
                                       />
                                    );
                                 })}
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                 <IconSparkles className="w-8 h-8 text-indigo-500 mb-1" />
                                 <span className="text-[10px] font-black text-slate-400 uppercase">Team Pool</span>
                              </div>
                           </div>
                           <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2">
                              {leaderboardData.slice(0, 6).map((p, i) => {
                                 const total = leaderboardData.reduce((sum, item) => sum + item.revenue, 0);
                                 const percent = Math.round((p.revenue / total) * 100);
                                 const colors = ['bg-[#f59e0b]', 'bg-[#6366f1]', 'bg-[#10b981]', 'bg-[#8b5cf6]', 'bg-[#f43f5e]', 'bg-[#06b6d4]'];
                                 return (
                                    <div key={p.id} className="flex items-center gap-2">
                                       <div className={`w-2 h-2 rounded-full ${colors[i]}`} />
                                       <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate w-24">{p.name}</span>
                                       <span className="text-[10px] font-black text-slate-400">{percent}%</span>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         )}
      </div>
   );
};

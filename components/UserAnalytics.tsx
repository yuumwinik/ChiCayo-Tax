
import React, { useState, useMemo } from 'react';
import { Appointment, AppointmentStage, EarningWindow, PayCycle, ACCOUNT_EXECUTIVES, Incentive, TeamMember, User } from '../types';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import { IconTrendingUp, IconBriefcase, IconTransfer, IconCheck, IconCycle, IconClock, IconChevronDown, IconActivity, IconSparkles, IconTrophy, IconChartBar, IconUsers } from './Icons';
import { CustomSelect } from './CustomSelect';

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
}

export const UserAnalytics: React.FC<UserAnalyticsProps> = ({
   appointments, allAppointments, allIncentives, earnings, activeCycle, payCycles = [], currentUserName, currentUser, referralRate
}) => {
   const [selectedScopeId, setSelectedScopeId] = useState<string>('active');
   const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());

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

      if (selectedScopeId === 'active' && activeCycle) {
         start = new Date(activeCycle.startDate).getTime();
         end = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
         scopeType = 'active';
      } else if (selectedScopeId !== 'lifetime') {
         const cycle = payCycles.find(c => c.id === selectedScopeId);
         if (cycle) {
            start = new Date(cycle.startDate).getTime();
            end = new Date(cycle.endDate).setHours(23, 59, 59, 999);
            label = `${formatDate(cycle.startDate)} - ${formatDate(cycle.endDate)}`;
            scopeType = 'history';
         }
      } else {
         label = "Lifetime Performance";
         scopeType = 'lifetime';
      }

      if (scopeType !== 'lifetime' && start !== null && end !== null) {
         const s = start; const e = end;
         personalFiltered = personalFiltered.filter(a => { const d = new Date(a.scheduledAt).getTime(); return d >= s && d <= e; });
         teamFiltered = teamFiltered.filter(a => { const d = new Date(a.scheduledAt).getTime(); return d >= s && d <= e; });
      }

      const personalOnboarded = personalFiltered.filter(a => a.stage === AppointmentStage.ONBOARDED);
      const teamOnboarded = teamFiltered.filter(a => a.stage === AppointmentStage.ONBOARDED);

      const aeBreakdown: Record<string, number> = { 'Joshua': 0, 'Jorge': 0, 'Andrew': 0 };
      if (currentUserName) aeBreakdown[currentUserName] = 0;

      personalOnboarded.forEach(a => {
         if (a.aeName && aeBreakdown.hasOwnProperty(a.aeName)) aeBreakdown[a.aeName]++;
         else if (!a.aeName && currentUserName) aeBreakdown[currentUserName]++;
      });

      const totalReferrals = personalOnboarded.reduce((sum, a) => sum + (a.referralCount || 0), 0);
      const personalReferralRevenue = totalReferrals * referralRate;

      const personalProdRevenue = personalOnboarded.reduce((sum, a) => sum + (Number(a.earnedAmount) || 0), 0) + personalReferralRevenue;

      const personalBonusRevenue = allIncentives.filter(i => {
         if (i.userId !== currentUser.id && i.userId !== 'team') return false;
         if (scopeType === 'active' && i.appliedCycleId !== activeCycle?.id) return false;
         if (scopeType === 'history' && i.appliedCycleId !== selectedScopeId) return false;
         return true;
      }).reduce((sum, i) => sum + Number(i.amountCents), 0);

      const myTotalRevenue = personalProdRevenue + personalBonusRevenue;

      const teamTotalPool = teamOnboarded.reduce((sum, a) => {
         const base = Number(a.earnedAmount) || 0;
         const refs = (a.referralCount || 0) * referralRate;
         return sum + base + refs;
      }, 0) + allIncentives.filter(i => {
         if (scopeType === 'active' && i.appliedCycleId !== activeCycle?.id) return false;
         if (scopeType === 'history' && i.appliedCycleId !== selectedScopeId) return false;
         return true;
      }).reduce((sum, i) => sum + Number(i.amountCents), 0);

      return {
         total: personalFiltered.length,
         onboarded: personalOnboarded.length,
         revenue: myTotalRevenue,
         bonusRevenue: personalBonusRevenue,
         referralRevenue: personalReferralRevenue,
         referralCount: totalReferrals,
         aeBreakdown,
         selfOnboards: personalOnboarded.filter(a => !a.aeName || a.aeName === currentUserName).length,
         scopeLabel: label,
         teamPoolTotal: teamTotalPool,
         scopeType
      };
   }, [appointments, allAppointments, allIncentives, selectedScopeId, activeCycle, payCycles, currentUserName, currentUser.id, referralRate]);

   const currentRevenue: number = Number(scopedData.revenue) || 0;
   const poolTotal: number = Number(scopedData.teamPoolTotal) || 0;
   const contributionPercentage = poolTotal > 0 ? Math.round((currentRevenue / poolTotal) * 100) : 0;

   const radius = 35;
   const circum = 2 * Math.PI * radius;
   const strokeDash = (contributionPercentage / 100) * circum;

   const historicalWindows = useMemo(() => earnings.current ? [earnings.current, ...earnings.history] : earnings.history, [earnings.current, earnings.history]);

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

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div><h2 className="text-3xl font-black mb-1">Production Stats</h2><p className="text-indigo-100 flex items-center gap-2 text-sm font-medium"><IconSparkles className="w-4 h-4" /> Performance verified by Taxter AI</p></div>
                  <div className="text-right">
                     <div className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1 opacity-80">Total Scoped Pay</div>
                     <div className="text-5xl font-black tracking-tight drop-shadow-md">{formatCurrency(scopedData.revenue)}</div>
                  </div>
               </div>
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
            </div>

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
         </div>

         {scopedData.referralCount > 0 && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-2 border-emerald-200 dark:border-emerald-900/50 p-8 rounded-[3rem] flex flex-col md:flex-row items-center gap-8 animate-in zoom-in duration-700 shadow-lg shadow-emerald-100 dark:shadow-none relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
               <div className="p-6 bg-emerald-600 text-white rounded-3xl shadow-xl shadow-emerald-200 dark:shadow-none shrink-0 group hover:rotate-6 transition-transform relative z-10">
                  <IconUsers className="w-10 h-10" />
               </div>
               <div className="flex-1 text-center md:text-left relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="px-2 py-0.5 bg-emerald-600 text-[8px] font-black text-white uppercase tracking-widest rounded-full">Active Bonus</span>
                     <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-tighter">Referral Multiplier</h3>
                  </div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-500/80 max-w-md">Your network is your net worth! You've earned an extra <span className="text-emerald-600 dark:text-emerald-300 font-black">{formatCurrency(scopedData.referralRevenue)}</span> from {scopedData.referralCount} referrals sent by onboarded partners.</p>
               </div>
               <div className="grid grid-cols-2 gap-4 w-full md:w-auto relative z-10">
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900 shadow-sm text-center">
                     <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Referrals</span>
                     <span className="text-3xl font-black text-emerald-600">{scopedData.referralCount}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900 shadow-sm text-center">
                     <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Payout</span>
                     <span className="text-3xl font-black text-emerald-600">{formatCurrency(scopedData.referralRevenue)}</span>
                  </div>
               </div>
            </div>
         )}

         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02]"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl"><IconCheck className="w-4 h-4" /></div><span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Onboarded</span></div><div className="text-3xl font-black text-slate-900 dark:text-white">{scopedData.onboarded}</div><div className="text-[10px] text-slate-400 font-medium mt-1">Confirmed Wins</div></div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02]"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl"><IconSparkles className="w-4 h-4" /></div><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Self Rate</span></div><div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{scopedData.onboarded > 0 ? ((scopedData.selfOnboards / scopedData.onboarded) * 100).toFixed(1) : '0.0'}%</div><div className="text-[10px] text-slate-400 font-medium mt-1">{scopedData.selfOnboards} Independent Closes</div></div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02]"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl"><IconTrendingUp className="w-4 h-4" /></div><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Conversion</span></div><div className="text-3xl font-black text-slate-900 dark:text-white">{scopedData.total > 0 ? ((scopedData.onboarded / scopedData.total) * 100).toFixed(1) : '0.0'}%</div><div className="text-[10px] text-slate-400 font-medium mt-1">Lead to Deal Mastery</div></div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02]"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl"><IconClock className="w-4 h-4" /></div><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Peak Time</span></div><div className="text-3xl font-black text-slate-900 dark:text-white">N/A</div><div className="text-[10px] text-slate-400 font-medium mt-1">Optimization analysis</div></div>
         </div>

         <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-8"><div><h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3"><IconBriefcase className="w-6 h-6 text-indigo-600" /> AE Closing Breakdown</h3><p className="text-xs text-slate-500 font-medium mt-1">Who is sealing the deal on your leads?</p></div><div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest">{scopedData.onboarded} Total Wins</div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
               {Object.entries(scopedData.aeBreakdown).map(([name, countValue]) => {
                  const count = countValue as number;
                  const percent = scopedData.onboarded > 0 ? Math.round((count / scopedData.onboarded) * 100) : 0; const isSelf = name === currentUserName;
                  return (<div key={name} className="space-y-2"><div className="flex justify-between items-end"><div className="flex items-center gap-2"><span className={`font-bold text-sm ${isSelf ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{name} {isSelf && '(You)'}</span></div><div className="text-right"><span className="text-lg font-black text-slate-900 dark:text-white">{count}</span><span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Wins</span></div></div><div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-50 dark:border-slate-800/50"><div className={`h-full ${isSelf ? 'bg-indigo-600' : 'bg-slate-400'} transition-all duration-1000`} style={{ width: `${percent}%` }} /></div><div className="flex justify-between"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Support Level</span><span className="text-[10px] font-black text-slate-500">{percent}%</span></div></div>);
               })}
            </div>
         </div>

         <div className="space-y-4">
            <div className="flex items-center justify-between px-2"><h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3"><IconCycle className="w-6 h-6 text-indigo-500" /> Cycle Payout History</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                              <div>
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
                                          <div key={i.id} className="flex justify-between items-center bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                             <div className="flex items-center gap-2">
                                                <IconTrophy className="w-3.5 h-3.5 text-amber-600" />
                                                <span className="text-xs font-bold text-amber-900 dark:text-amber-400">{i.label}</span>
                                             </div>
                                             <span className="text-xs font-black text-amber-600">+{formatCurrency(i.amountCents)}</span>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                                 <div className="space-y-2">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Onboarded Leads</h5>
                                    <div className="max-h-[150px] overflow-y-auto no-scrollbar space-y-1">
                                       {appointments.filter(a => {
                                          const d = new Date(a.scheduledAt).getTime();
                                          const winStart = new Date(win.startDate).getTime();
                                          const winEnd = new Date(win.endDate).setHours(23, 59, 59, 999);
                                          return a.stage === AppointmentStage.ONBOARDED && d >= winStart && d <= winEnd;
                                       }).map(a => (
                                          <div key={a.id} className="flex justify-between items-center text-xs p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                             <div>
                                                <span className="font-bold text-slate-900 dark:text-white block">{a.name}</span>
                                                {a.referralCount ? <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">{a.referralCount} Referrals included</span> : null}
                                             </div>
                                             <span className="font-bold text-emerald-600">+{formatCurrency((a.earnedAmount || 0) + (a.referralCount || 0) * referralRate)}</span>
                                          </div>
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
         </div>
      </div>
   );
};

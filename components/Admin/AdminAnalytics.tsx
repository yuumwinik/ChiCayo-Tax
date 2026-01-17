
import React, { useState, useMemo } from 'react';
import { TeamMember, DashboardStats, Appointment, PayCycle, AppointmentStage, User, AE_COLORS, ACCOUNT_EXECUTIVES } from '../../types';
import { IconTrendingUp, IconTransfer, IconBriefcase, IconCheck, IconX, IconCalendar, IconFilter, IconActivity, IconTrophy, IconChartBar, IconSparkles, IconDownload, IconUsers, IconDollarSign, IconChevronLeft, IconChevronRight } from '../Icons';
import { CustomSelect } from '../CustomSelect';
import { formatDate, formatCurrency } from '../../utils/dateUtils';

interface AdminAnalyticsProps {
   members: TeamMember[];
   stats: DashboardStats;
   appointments: Appointment[];
   payCycles: PayCycle[];
   users: User[];
   referralRate: number;
   commissionRate: number;
   selfCommissionRate: number;
   onManualReferral?: (clientId: string, count: number) => void;
   onDeleteReferral?: (clientId: string, entryId: string) => void;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ members, stats, appointments, payCycles, users, referralRate, commissionRate, selfCommissionRate, onManualReferral, onDeleteReferral }) => {
   const [selectedCycleId, setSelectedCycleId] = useState<string>('active');
   const [selectedAgentId, setSelectedAgentId] = useState<string>('all');

   const [pipelineView, setPipelineView] = useState(0);
   const [leaderboardView, setLeaderboardView] = useState(0);

   const cycleOptions = useMemo(() => {
      const base = [{ value: 'active', label: 'Current Cycle' }, { value: 'lifetime', label: 'Lifetime Stats' }];
      const past = payCycles.filter(c => new Date(c.endDate).getTime() < Date.now()).map(c => ({
         value: c.id,
         label: `${new Date(c.startDate).toLocaleDateString()} - ${new Date(c.endDate).toLocaleDateString()}`
      }));
      return [...base, ...past];
   }, [payCycles]);

   const filteredAppointments = useMemo(() => {
      let filtered = appointments;
      if (selectedCycleId === 'active') {
         const active = payCycles.find(c => {
            const now = Date.now();
            const s = new Date(c.startDate).getTime();
            const e = new Date(c.endDate).setHours(23, 59, 59, 999);
            return now >= s && now <= e;
         });
         if (active) {
            filtered = filtered.filter(a => {
               const d = new Date(a.scheduledAt).getTime();
               return d >= new Date(active.startDate).getTime() && d <= new Date(active.endDate).setHours(23, 59, 59, 999);
            });
         }
      } else if (selectedCycleId !== 'lifetime') {
         const cycle = payCycles.find(c => c.id === selectedCycleId);
         if (cycle) {
            filtered = filtered.filter(a => {
               const d = new Date(a.scheduledAt).getTime();
               return d >= new Date(cycle.startDate).getTime() && d <= new Date(cycle.endDate).setHours(23, 59, 59, 999);
            });
         }
      }
      if (selectedAgentId !== 'all') filtered = filtered.filter(a => a.userId === selectedAgentId);
      return filtered;
   }, [appointments, selectedCycleId, selectedAgentId, payCycles]);

   const scopedData = useMemo(() => {
      const onboardedAppts = filteredAppointments.filter(a => a.stage === AppointmentStage.ONBOARDED);
      const totalCount = filteredAppointments.length || 1;
      const onboardedCount = onboardedAppts.length;
      const pending = filteredAppointments.filter(a => a.stage === AppointmentStage.PENDING || a.stage === AppointmentStage.RESCHEDULED).length;
      const failed = filteredAppointments.filter(a => a.stage === AppointmentStage.NO_SHOW || a.stage === AppointmentStage.DECLINED).length;

      let selfRev = 0;
      let transferRev = 0;
      let selfCount = 0;
      let transferCount = 0;

      onboardedAppts.forEach(a => {
         const agent = users.find(u => u.id === a.userId);
         // CRITICAL FIX: Ensure aeName is strictly checked against the agent's name
         const isSelf = !a.aeName || a.aeName === agent?.name;

         const amt = a.earnedAmount !== undefined ? a.earnedAmount : (isSelf ? selfCommissionRate : commissionRate);
         if (isSelf) {
            selfRev += amt;
            selfCount++;
         } else {
            transferRev += amt;
            transferCount++;
         }
      });

      const synergy: Record<string, Record<string, { count: number, revenue: number }>> = {};
      onboardedAppts.forEach(a => {
         const agent = users.find(u => u.id === a.userId);
         const agentName = agent?.name || 'Unknown';
         const isSelf = !a.aeName || a.aeName === agentName;
         const amt = a.earnedAmount !== undefined ? a.earnedAmount : (isSelf ? selfCommissionRate : commissionRate);

         if (a.aeName && !isSelf) {
            if (!synergy[agentName]) synergy[agentName] = {};
            if (!synergy[agentName][a.aeName]) synergy[agentName][a.aeName] = { count: 0, revenue: 0 };
            synergy[agentName][a.aeName].count++;
            synergy[agentName][a.aeName].revenue += amt;
         }
      });

      const referralRevenue = onboardedAppts.reduce((sum, a) => sum + (a.referralCount || 0) * referralRate, 0);
      const referralCount = onboardedAppts.reduce((sum, a) => sum + (a.referralCount || 0), 0);

      return {
         total: filteredAppointments.length,
         onboarded: onboardedCount,
         pending,
         failed,
         convRate: ((onboardedCount / totalCount) * 100).toFixed(1),
         selfOnboarded: selfCount,
         selfOnboardRate: onboardedCount > 0 ? ((selfCount / onboardedCount) * 100).toFixed(1) : '0.0',
         revenue: selfRev + transferRev + referralRevenue,
         selfRevenue: selfRev,
         transferRevenue: transferRev,
         referralRevenue,
         referralCount,
         synergy
      };
   }, [filteredAppointments, users, referralRate, commissionRate, selfCommissionRate]);

   const radius = 40;
   const circumference = 2 * Math.PI * radius;

   const renderRing = (segments: { value: number, color: string, label: string }[], centerLabel: string, centerValue: string) => {
      const totalValue = segments.reduce((s, x) => s + x.value, 0) || 1;
      let currentOffset = 0;
      return (
         <div className="relative w-56 h-56 group">
            <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full drop-shadow-xl transition-all duration-700">
               <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="12" className="dark:stroke-slate-700/30" />
               {segments.map((seg, i) => {
                  const len = (seg.value / totalValue) * circumference;
                  const segmentOffset = currentOffset;
                  currentOffset -= len;
                  return (
                     <circle
                        key={i} cx="50" cy="50" r={radius} fill="transparent"
                        stroke={seg.color} strokeWidth="14"
                        strokeDasharray={`${len} ${circumference}`}
                        strokeDashoffset={segmentOffset}
                        className="transition-all duration-1000 ease-out"
                     />
                  );
               })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center animate-in zoom-in duration-500">
               <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{centerValue}</span>
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{centerLabel}</span>
            </div>
         </div>
      );
   };

   const pipelineViews = [
      {
         title: "Funnel Status",
         centerLabel: "Total Scoped",
         centerValue: scopedData.total.toString(),
         segments: [
            { value: scopedData.onboarded, color: '#10b981', label: 'Onboard' },
            { value: scopedData.pending, color: '#6366f1', label: 'Active' },
            { value: scopedData.failed, color: '#f43f5e', label: 'Failed' }
         ]
      },
      {
         title: "Closer Distribution",
         centerLabel: "Team Assisted",
         centerValue: (scopedData.onboarded - scopedData.selfOnboarded).toString(),
         segments: ACCOUNT_EXECUTIVES.map(name => ({
            // Only count deal if AE is NOT the agent owning the lead
            value: filteredAppointments.filter(a => {
               const agent = users.find(u => u.id === a.userId);
               return a.aeName === name && a.stage === AppointmentStage.ONBOARDED && a.aeName !== agent?.name;
            }).length,
            color: name === 'Joshua' ? '#3b82f6' : name === 'Jorge' ? '#f97316' : '#a855f7',
            label: name
         }))
      },
      {
         title: "Agent Self-Onboard Mix",
         centerLabel: "Self Closes",
         centerValue: scopedData.selfOnboarded.toString(),
         segments: members.map((m, i) => {
            const colors = ['#06b6d4', '#ec4899', '#84cc16', '#eab308', '#6366f1'];
            return {
               value: filteredAppointments.filter(a => a.userId === m.id && (!a.aeName || a.aeName === m.name) && a.stage === AppointmentStage.ONBOARDED).length,
               color: colors[i % colors.length],
               label: m.name
            }
         })
      },
      {
         title: "Revenue Contribution Pool",
         centerLabel: "Total Revenue",
         centerValue: formatCurrency(scopedData.revenue),
         segments: [
            ...ACCOUNT_EXECUTIVES.map(name => ({
               value: filteredAppointments.filter(a => {
                  const agent = users.find(u => u.id === a.userId);
                  return a.aeName === name && a.stage === AppointmentStage.ONBOARDED && a.aeName !== agent?.name;
               }).reduce((s, a) => s + (a.earnedAmount || commissionRate), 0),
               color: name === 'Joshua' ? '#3b82f6' : name === 'Jorge' ? '#f97316' : '#a855f7',
               label: `AE ${name}`
            })),
            ...members.map((m, i) => ({
               value: filteredAppointments.filter(a => a.userId === m.id && (!a.aeName || a.aeName === m.name) && a.stage === AppointmentStage.ONBOARDED).reduce((s, a) => s + (a.earnedAmount || selfCommissionRate), 0),
               color: '#10b981',
               label: `${m.name} (Self)`
            }))
         ]
      }
   ];

   return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
         <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3">
               <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none"><IconActivity className="w-6 h-6" /></div>
               <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Admin Deep Dive</h3>
                  <p className="text-xs text-slate-500 font-medium">Synergy analysis and revenue composition.</p>
               </div>
            </div>
            <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-end">
               <div className="w-48"><CustomSelect options={cycleOptions} value={selectedCycleId} onChange={setSelectedCycleId} /></div>
               <div className="w-48"><CustomSelect options={[{ value: 'all', label: 'Team View' }, ...members.map(m => ({ value: m.id, label: m.name }))]} value={selectedAgentId} onChange={setSelectedAgentId} /></div>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
               <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2 text-emerald-100 font-black uppercase tracking-widest text-[10px]"><IconSparkles className="w-4 h-4" /> Self-Onboard Revenue</div>
                  <div className="text-5xl font-black mb-4">{formatCurrency(scopedData.selfRevenue)}</div>
                  <div className="flex items-center justify-between text-xs font-bold bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                     <span>{scopedData.selfOnboarded} Pure Closes</span>
                     <span className="text-emerald-100">{scopedData.selfOnboardRate}% of Volume</span>
                  </div>
               </div>
               <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
               <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2 text-indigo-100 font-black uppercase tracking-widest text-[10px]"><IconTransfer className="w-4 h-4" /> Transfer Revenue</div>
                  <div className="text-5xl font-black mb-4">{formatCurrency(scopedData.transferRevenue)}</div>
                  <div className="flex items-center justify-between text-xs font-bold bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                     <span>{scopedData.onboarded - scopedData.selfOnboarded} AE Assisted</span>
                     <span className="text-indigo-100">{Math.round(((scopedData.onboarded - scopedData.selfOnboarded) / (scopedData.onboarded || 1)) * 100)}% of Volume</span>
                  </div>
               </div>
               <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            </div>
            <div className="bg-gradient-to-br from-rose-500 to-orange-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
               <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2 text-rose-100 font-black uppercase tracking-widest text-[10px]"><IconUsers className="w-4 h-4" /> Referral Engine</div>
                  <div className="text-5xl font-black mb-4">{formatCurrency(scopedData.referralRevenue)}</div>
                  <div className="flex items-center justify-between text-xs font-bold bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                     <span>{scopedData.referralCount} Leads Delivered</span>
                     <span className="text-rose-100">+{formatCurrency(scopedData.referralRevenue)} Distributed</span>
                  </div>
               </div>
               <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-700 flex flex-col items-center shadow-sm relative group/card">
               <div className="w-full flex justify-between items-center mb-8">
                  <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tighter text-sm">
                     <IconChartBar className="w-5 h-5 text-indigo-500" /> {pipelineViews[pipelineView].title}
                  </h4>
                  <div className="flex gap-1">
                     {pipelineViews.map((_, i) => (
                        <button key={i} onClick={() => setPipelineView(i)} className={`w-2 h-2 rounded-full transition-all ${pipelineView === i ? 'bg-indigo-600 w-4' : 'bg-slate-200 dark:bg-slate-700 hover:bg-indigo-300'}`} />
                     ))}
                  </div>
               </div>

               {renderRing(pipelineViews[pipelineView].segments, pipelineViews[pipelineView].centerLabel, pipelineViews[pipelineView].centerValue)}

               <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 w-full border-t border-slate-50 dark:border-slate-700/50 pt-8">
                  {pipelineViews[pipelineView].segments.filter(s => s.value > 0).slice(0, 6).map((seg, i) => (
                     <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }}></div>
                        <div className="overflow-hidden">
                           <div className="text-[10px] font-black text-slate-400 uppercase truncate">{seg.label}</div>
                           <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {pipelineViews[pipelineView].title.includes("Revenue") ? formatCurrency(seg.value) : seg.value}
                           </div>
                        </div>
                     </div>
                  ))}
                  {pipelineViews[pipelineView].segments.every(s => s.value === 0) && (
                     <div className="col-span-full text-center text-slate-400 text-xs italic py-4">No data for this view in current scope</div>
                  )}
               </div>

               <div className="absolute inset-y-0 left-2 items-center flex opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <button onClick={() => setPipelineView(v => (v > 0 ? v - 1 : pipelineViews.length - 1))} className="p-2 bg-white dark:bg-slate-700 shadow-lg rounded-full border border-slate-100 dark:border-slate-600"><IconChevronLeft className="w-4 h-4" /></button>
               </div>
               <div className="absolute inset-y-0 right-2 items-center flex opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <button onClick={() => setPipelineView(v => (v < pipelineViews.length - 1 ? v + 1 : 0))} className="p-2 bg-white dark:bg-slate-700 shadow-lg rounded-full border border-slate-100 dark:border-slate-600"><IconChevronRight className="w-4 h-4" /></button>
               </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-sm relative group/board">
               <div className="w-full flex justify-between items-center mb-8">
                  <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tighter text-sm">
                     <IconTrophy className="w-5 h-5 text-yellow-500" />
                     {leaderboardView === 0 ? "Production Rank" : leaderboardView === 1 ? "AE Closer Rank" : "Self-Onboard Mastery"}
                  </h4>
                  <div className="flex gap-2">
                     <button onClick={() => setLeaderboardView(0)} className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all ${leaderboardView === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>Agents</button>
                     <button onClick={() => setLeaderboardView(1)} className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all ${leaderboardView === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>Closers</button>
                     <button onClick={() => setLeaderboardView(2)} className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all ${leaderboardView === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>Self</button>
                  </div>
               </div>

               <div className="space-y-6">
                  {leaderboardView === 0 ? (
                     members.sort((a, b) => {
                        const ac = filteredAppointments.filter(app => app.userId === a.id && app.stage === AppointmentStage.ONBOARDED).length;
                        const bc = filteredAppointments.filter(app => app.userId === b.id && app.stage === AppointmentStage.ONBOARDED).length;
                        return bc - ac;
                     }).map((m, i) => {
                        const count = filteredAppointments.filter(a => a.userId === m.id && a.stage === AppointmentStage.ONBOARDED).length;
                        return (
                           <div key={m.id} className="relative group">
                              <div className="flex justify-between items-center mb-1.5">
                                 <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 w-4">#{i + 1}</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{m.name}</span>
                                 </div>
                                 <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{count} Wins</span>
                              </div>
                              <div className="h-1.5 bg-slate-50 dark:bg-slate-900 rounded-full overflow-hidden shadow-inner">
                                 <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${(count / Math.max(1, scopedData.onboarded)) * 100}%` }} />
                              </div>
                           </div>
                        );
                     })
                  ) : leaderboardView === 1 ? (
                     ACCOUNT_EXECUTIVES.map((ae, i) => {
                        // Count only as assisted deal (ae is not the lead owner)
                        const count = filteredAppointments.filter(a => {
                           const agent = users.find(u => u.id === a.userId);
                           return a.aeName === ae && a.stage === AppointmentStage.ONBOARDED && a.aeName !== agent?.name;
                        }).length;
                        const color = ae === 'Joshua' ? 'bg-blue-500' : ae === 'Jorge' ? 'bg-orange-500' : 'bg-purple-500';
                        return (
                           <div key={ae} className="relative">
                              <div className="flex justify-between items-center mb-1.5">
                                 <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 w-4">#{i + 1}</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{ae}</span>
                                 </div>
                                 <span className={`text-xs font-black ${color.replace('bg-', 'text-')}`}>{count} Closes</span>
                              </div>
                              <div className="h-1.5 bg-slate-50 dark:bg-slate-900 rounded-full overflow-hidden shadow-inner">
                                 <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${(count / Math.max(1, (scopedData.onboarded - scopedData.selfOnboarded) || 1)) * 100}%` }} />
                              </div>
                           </div>
                        );
                     })
                  ) : (
                     members.sort((a, b) => {
                        const ac = filteredAppointments.filter(app => app.userId === a.id && (!app.aeName || app.aeName === a.name) && app.stage === AppointmentStage.ONBOARDED).length;
                        const bc = filteredAppointments.filter(app => app.userId === b.id && (!app.aeName || app.aeName === b.name) && app.stage === AppointmentStage.ONBOARDED).length;
                        return bc - ac;
                     }).map((m, i) => {
                        const count = filteredAppointments.filter(a => a.userId === m.id && (!a.aeName || a.aeName === m.name) && a.stage === AppointmentStage.ONBOARDED).length;
                        return (
                           <div key={m.id} className="relative">
                              <div className="flex justify-between items-center mb-1.5">
                                 <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 w-4">#{i + 1}</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{m.name}</span>
                                 </div>
                                 <span className="text-xs font-black text-emerald-600">{count} Self-Closed</span>
                              </div>
                              <div className="h-1.5 bg-slate-50 dark:bg-slate-900 rounded-full overflow-hidden shadow-inner">
                                 <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${(count / Math.max(1, scopedData.selfOnboarded || 1)) * 100}%` }} />
                              </div>
                           </div>
                        );
                     })
                  )}
               </div>
               {scopedData.onboarded === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 opacity-50">
                     <IconTrophy className="w-12 h-12 mb-4" />
                     <span className="text-sm font-bold italic">No wins recorded in this scope</span>
                  </div>
               )}
            </div>
         </div>

         <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
               <div>
                  <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                     <IconUsers className="w-6 h-6 text-indigo-500" /> Transfer Synergy Breakdown
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">Direct funnel mapping: Which Agent deals were closed by which AE?</p>
               </div>
            </div>
            <div className="p-8">
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Object.entries(scopedData.synergy).map(([agent, aeData]) => (
                     <div key={agent} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col h-full">
                        <div className="text-sm font-black text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2 flex justify-between items-center">
                           {agent}
                           <span className="text-[10px] bg-white dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-400">Source Agent</span>
                        </div>
                        <div className="space-y-4 flex-1">
                           {Object.entries(aeData).sort((a, b) => b[1].revenue - a[1].revenue).map(([ae, stats]) => {
                              const aeColor = ae === 'Joshua' ? 'bg-blue-500' : ae === 'Jorge' ? 'bg-orange-500' : 'bg-purple-500';
                              return (
                                 <div key={ae} className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-end">
                                       <div className="flex flex-col">
                                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Closed by {ae}</span>
                                          <span className="text-[10px] text-slate-400 font-medium">{stats.count} Transfers</span>
                                       </div>
                                       <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{formatCurrency(stats.revenue)}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white dark:bg-slate-800 rounded-full overflow-hidden">
                                       <div className={`h-full ${aeColor}`} style={{ width: `${(stats.revenue / Object.values(aeData).reduce((s, c) => s + c.revenue, 0)) * 100}%` }} />
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Generated</span>
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                 {formatCurrency(Object.values(aeData).reduce((s, c) => s + c.revenue, 0))}
                              </span>
                           </div>
                        </div>
                     </div>
                  ))}
                  {Object.keys(scopedData.synergy).length === 0 && (
                     <div className="col-span-full py-12 text-center text-slate-400 italic font-medium">No transfer synergy data found for the current filter.</div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
};


import React from 'react';
import { Appointment, AppointmentStage, EarningWindow, PayCycle } from '../types';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import { IconTrendingUp, IconBriefcase, IconTransfer, IconCheck, IconChartPie, IconActivity, IconSparkles } from './Icons';

interface UserAnalyticsProps {
  appointments: Appointment[];
  earnings: { current: EarningWindow | null; history: EarningWindow[] };
  activeCycle?: PayCycle;
}

export const UserAnalytics: React.FC<UserAnalyticsProps> = ({ appointments, earnings, activeCycle }) => {
  
  // 1. FILTER DATA BY ACTIVE CYCLE (OR SHOW ALL IF NO CYCLE)
  const currentAppts = activeCycle 
    ? appointments.filter(a => {
        const d = new Date(a.scheduledAt).getTime();
        const start = new Date(activeCycle.startDate).getTime();
        const end = new Date(activeCycle.endDate).getTime();
        return d >= start && d <= end;
      })
    : appointments;

  const total = currentAppts.length || 1;
  const pending = currentAppts.filter(a => a.stage === AppointmentStage.PENDING).length;
  const onboarded = currentAppts.filter(a => a.stage === AppointmentStage.ONBOARDED).length;
  const failed = currentAppts.filter(a => a.stage === AppointmentStage.NO_SHOW || a.stage === AppointmentStage.DECLINED).length;
  
  // 2. LIVE TRANSFER STATS
  const transfers = currentAppts.filter(a => a.type === 'transfer');
  const totalTransfers = transfers.length;
  const transfersOnboarded = transfers.filter(a => a.stage === AppointmentStage.ONBOARDED).length;
  const transferConvRate = totalTransfers > 0 ? ((transfersOnboarded / totalTransfers) * 100).toFixed(1) : '0.0';

  // 3. AE PERFORMANCE BREAKDOWN
  // We need to fetch the User Name safely. Since we don't have user prop here, we infer self-owned if aeName matches user (though user prop isn't passed here).
  // Strategy: Group by AE Name. If we add logic in App.tsx to pass user, we could label it 'Self-Closed'.
  // For now, we display the raw name. If the name matches the agent's name, it will be obvious.
  const aeStats: Record<string, number> = {};
  
  // Include ALL onboarded appointments that have an AE Name (which includes self-owned)
  currentAppts.filter(a => a.stage === AppointmentStage.ONBOARDED && a.aeName).forEach(a => {
      const name = a.aeName!;
      aeStats[name] = (aeStats[name] || 0) + 1;
  });

  // 4. CHART DATA
  const radius = 40;
  const circumference = 2 * Math.PI * radius; 
  
  const segmentOnboarded = (onboarded / total) * circumference;
  const segmentPending = (pending / total) * circumference;
  const segmentFailed = (failed / total) * circumference;
  
  const offsetPending = -segmentOnboarded; 
  const offsetFailed = -(segmentOnboarded + segmentPending);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
       
       {/* HERO SECTION */}
       <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-300 dark:shadow-none relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
             <div>
                <h2 className="text-3xl font-bold mb-1">My Performance</h2>
                <p className="text-indigo-100 flex items-center gap-2 text-sm">
                   <IconActivity className="w-4 h-4" /> 
                   {activeCycle ? `Active Cycle: ${formatDate(activeCycle.startDate)} - ${formatDate(activeCycle.endDate)}` : 'Lifetime Stats'}
                </p>
             </div>
             <div className="text-right">
                <div className="text-indigo-200 text-xs font-medium uppercase tracking-wider mb-1">Current Earnings</div>
                <div className="text-5xl font-bold tracking-tight">
                   {earnings.current ? formatCurrency(earnings.current.totalCents) : '$0.00'}
                </div>
             </div>
          </div>
          
          {/* Background Decor */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-indigo-500/30 rounded-full blur-3xl"></div>
       </div>

       {/* KEY METRICS GRID */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-transform hover:scale-105">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                   <IconCheck className="w-4 h-4" />
                </div>
                <span className="text-xs text-slate-500 font-medium uppercase">Onboarded</span>
             </div>
             <div className="text-2xl font-bold text-slate-900 dark:text-white">{onboarded}</div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-transform hover:scale-105">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                   <IconTransfer className="w-4 h-4" />
                </div>
                <span className="text-xs text-slate-500 font-medium uppercase">Transfers</span>
             </div>
             <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalTransfers}</div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-transform hover:scale-105">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                   <IconTrendingUp className="w-4 h-4" />
                </div>
                <span className="text-xs text-slate-500 font-medium uppercase">Conversion</span>
             </div>
             <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {((onboarded / total) * 100).toFixed(1)}%
             </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-transform hover:scale-105">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                   <IconBriefcase className="w-4 h-4" />
                </div>
                <span className="text-xs text-slate-500 font-medium uppercase">Transfer Rate</span>
             </div>
             <div className="text-2xl font-bold text-slate-900 dark:text-white">{transferConvRate}%</div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* FUNNEL & PIE CHART */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <IconChartPie className="w-5 h-5 text-slate-400" />
                Funnel Breakdown
             </h3>
             
             <div className="flex flex-col sm:flex-row items-center justify-around gap-8">
                {/* SVG Pie */}
                <div className="relative w-48 h-48">
                   <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="20" className="dark:stroke-slate-700"/>
                      {onboarded > 0 && (
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="20" strokeDasharray={`${segmentOnboarded} ${circumference}`} />
                      )}
                      {pending > 0 && (
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#6366f1" strokeWidth="20" strokeDasharray={`${segmentPending} ${circumference}`} strokeDashoffset={offsetPending} />
                      )}
                      {failed > 0 && (
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f43f5e" strokeWidth="20" strokeDasharray={`${segmentFailed} ${circumference}`} strokeDashoffset={offsetFailed} />
                      )}
                   </svg>
                   <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-3xl font-bold text-slate-900 dark:text-white">{total}</span>
                      <span className="text-xs text-slate-500">Total</span>
                   </div>
                </div>

                {/* Legend */}
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-none"></div>
                      <div>
                         <div className="text-sm font-semibold text-slate-900 dark:text-white">{onboarded} Onboarded</div>
                         <div className="text-xs text-slate-500">Completed deals</div>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200 dark:shadow-none"></div>
                      <div>
                         <div className="text-sm font-semibold text-slate-900 dark:text-white">{pending} Pending</div>
                         <div className="text-xs text-slate-500">In progress</div>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-200 dark:shadow-none"></div>
                      <div>
                         <div className="text-sm font-semibold text-slate-900 dark:text-white">{failed} Failed/Declined</div>
                         <div className="text-xs text-slate-500">Lost opportunities</div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* AE PERFORMANCE */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <IconBriefcase className="w-5 h-5 text-slate-400" />
                Closing Source Breakdown
             </h3>
             <p className="text-sm text-slate-500 mb-6">Who closed your deals? (AE vs Self-Closed)</p>
             
             <div className="space-y-5">
                {Object.keys(aeStats).length === 0 ? (
                   <div className="text-center py-8 text-slate-400 italic">No onboarded deals yet.</div>
                ) : (
                   Object.entries(aeStats)
                      .sort((a,b) => b[1] - a[1])
                      .map(([name, count]) => {
                         const max = Math.max(...Object.values(aeStats));
                         const percent = (count / (onboarded || 1)) * 100;
                         
                         return (
                            <div key={name}>
                               <div className="flex justify-between items-end mb-1">
                                  <span className="font-medium text-slate-700 dark:text-slate-300">{name}</span>
                                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{count} Deals ({percent.toFixed(0)}%)</span>
                                </div>
                                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                   <div 
                                      className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out"
                                      style={{ width: `${(count / max) * 100}%` }}
                                   />
                                </div>
                            </div>
                         )
                      })
                )}
             </div>
          </div>

       </div>
    </div>
  );
};

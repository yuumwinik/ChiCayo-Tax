
import React from 'react';
import { TeamMember, DashboardStats } from '../../types';
import { IconTrendingUp, IconTransfer, IconBriefcase, IconCheck, IconX, IconCalendar } from '../Icons';

interface AdminAnalyticsProps {
  members: TeamMember[];
  stats: DashboardStats;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ members, stats }) => {
  
  // Calculate Circle Math for Pie Chart
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // approx 251.32
  
  const total = stats.totalAppointments || 1; // prevent divide by zero
  
  const pendingPercent = stats.totalPending / total;
  const onboardedPercent = stats.totalOnboarded / total;
  const failedPercent = stats.totalFailed / total;
  
  const segmentOnboarded = onboardedPercent * circumference;
  const segmentPending = ((stats.totalPending + stats.totalRescheduled) / total) * circumference;
  const segmentFailed = failedPercent * circumference;
  
  const offsetPending = -segmentOnboarded; 
  const offsetFailed = -(segmentOnboarded + segmentPending);

  // Transfer Math
  const totalTransfers = stats.totalTransfers || 0;
  const transferConvRate = totalTransfers > 0 ? ((stats.transfersOnboarded / totalTransfers) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 pb-12">
       
       {/* --- MAIN METRICS --- */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
             <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Global Conversion</div>
             <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.conversionRate}%</div>
             <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
               <IconTrendingUp className="w-3 h-3" /> All Funnels
             </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
             <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Avg per Agent</div>
             <div className="text-2xl font-bold text-slate-900 dark:text-white">
               {members.length > 0 ? (stats.totalOnboarded / members.length).toFixed(1) : 0}
             </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
             <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Total Agents</div>
             <div className="text-2xl font-bold text-slate-900 dark:text-white">{members.length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
             <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Active Now</div>
             <div className="text-2xl font-bold text-slate-900 dark:text-white">{members.filter(m => m.status === 'Online').length}</div>
          </div>
       </div>

       {/* --- APPOINTMENT -> TRANSFER FUNNEL --- */}
       <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
             <IconCalendar className="w-4 h-4 text-blue-500" />
             Appointment Lifecycle Funnel
          </h3>
          <div className="flex flex-col sm:flex-row items-center justify-between text-center gap-4 relative">
             <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-blue-200 dark:bg-blue-800 -z-0 hidden sm:block"></div>
             
             <div className="relative z-10 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-blue-100 dark:border-blue-900/30 w-full sm:w-auto">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalAppointments - stats.totalTransfers}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Set Appointments</div>
             </div>

             <div className="relative z-10">
                <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                   {stats.appointmentsTransferred} Transferred
                </div>
             </div>

             <div className="relative z-10 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 w-full sm:w-auto">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.apptTransferConversionRate}%</div>
                <div className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-wider">Success Rate</div>
             </div>
          </div>
       </div>

       {/* --- LIVE TRANSFER INTELLIGENCE --- */}
       <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
             <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <IconTransfer className="w-4 h-4" />
             </div>
             Live Transfer Intelligence
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             
             {/* Transfer Funnel */}
             <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-6 text-sm">Direct Transfer Funnel</h4>
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative">
                   {/* Connector Line */}
                   <div className="hidden sm:block absolute top-1/2 left-10 right-10 h-1 bg-slate-100 dark:bg-slate-700 -z-0"></div>

                   {/* Step 1: Logged */}
                   <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-2 font-bold text-slate-600 dark:text-slate-300">
                         {stats.totalTransfers}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 uppercase">Logged</div>
                   </div>

                   {/* Step 2: Metrics */}
                   <div className="bg-white dark:bg-slate-900 px-4 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-medium z-10 text-slate-500">
                      {transferConvRate.toFixed(1)}% Conversion
                   </div>

                   {/* Step 3: Outcomes */}
                   <div className="flex gap-8 relative z-10">
                      <div className="flex flex-col items-center text-center">
                         <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/20 rounded-full flex items-center justify-center mb-2 text-rose-600 dark:text-rose-400">
                            <IconX className="w-5 h-5" />
                         </div>
                         <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase">{stats.transfersDeclined} Declined</div>
                      </div>
                      <div className="flex flex-col items-center text-center">
                         <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-2 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-100 dark:shadow-none">
                            <IconCheck className="w-6 h-6" />
                         </div>
                         <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">{stats.transfersOnboarded} Onboarded</div>
                      </div>
                   </div>
                </div>
             </div>

             {/* AE Leaderboard */}
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm flex items-center gap-2">
                   <IconBriefcase className="w-4 h-4 text-slate-400" /> AE Performance
                </h4>
                <div className="space-y-4">
                   {Object.entries(stats.aePerformance).length === 0 ? (
                      <div className="text-center text-slate-500 text-sm py-4 italic">No transfer data yet.</div>
                   ) : (
                      (Object.entries(stats.aePerformance) as [string, number][])
                        .sort((a, b) => b[1] - a[1])
                        .map(([ae, count]) => (
                           <div key={ae} className="flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                    {ae.charAt(0)}
                                 </div>
                                 <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{ae}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{count}</span>
                                 <span className="text-[10px] text-slate-400 uppercase">Deals</span>
                              </div>
                           </div>
                        ))
                   )}
                </div>
             </div>
          </div>
       </div>

       {/* --- GENERAL CHARTS --- */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Bar Chart (CSS) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
             <h3 className="font-bold text-slate-900 dark:text-white mb-6">Top Agents (Total Onboarded)</h3>
             <div className="space-y-4">
                {members.sort((a,b) => b.onboardedCount - a.onboardedCount).slice(0, 5).map(member => {
                   const max = members[0]?.onboardedCount || 1;
                   const percent = Math.max((member.onboardedCount / max) * 100, 5); // min 5% width for visibility
                   return (
                     <div key={member.id}>
                        <div className="flex justify-between text-sm mb-1">
                           <span className="font-medium text-slate-700 dark:text-slate-300">{member.name}</span>
                           <span className="text-slate-500">{member.onboardedCount} total deals</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                             style={{ width: `${percent}%` }}
                           />
                        </div>
                     </div>
                   )
                })}
             </div>
          </div>

          {/* Real Data Pie Chart */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
             <h3 className="font-bold text-slate-900 dark:text-white mb-6 w-full text-left">Appointment Breakdown</h3>
             <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                   <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="20" className="dark:stroke-slate-700"/>
                   
                   <circle 
                     cx="50" cy="50" r="40" 
                     fill="transparent" 
                     stroke="#10b981" 
                     strokeWidth="20" 
                     strokeDasharray={`${segmentOnboarded} ${circumference}`} 
                     strokeDashoffset={0}
                   />
                   
                   <circle 
                     cx="50" cy="50" r="40" 
                     fill="transparent" 
                     stroke="#6366f1" 
                     strokeWidth="20" 
                     strokeDasharray={`${segmentPending} ${circumference}`} 
                     strokeDashoffset={offsetPending}
                   />

                   <circle 
                     cx="50" cy="50" r="40" 
                     fill="transparent" 
                     stroke="#f43f5e" 
                     strokeWidth="20" 
                     strokeDasharray={`${segmentFailed} ${circumference}`} 
                     strokeDashoffset={offsetFailed}
                   />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                   <span className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalAppointments}</span>
                   <span className="text-xs text-slate-500">Total</span>
                </div>
             </div>
             
             <div className="flex flex-wrap gap-4 mt-6 text-xs justify-center">
                <div className="flex items-center gap-1">
                   <div className="w-2 h-2 rounded-full bg-emerald-500"></div> 
                   Onboarded
                </div>
                <div className="flex items-center gap-1">
                   <div className="w-2 h-2 rounded-full bg-indigo-500"></div> 
                   Active
                </div>
                <div className="flex items-center gap-1">
                   <div className="w-2 h-2 rounded-full bg-rose-500"></div> 
                   Failed
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

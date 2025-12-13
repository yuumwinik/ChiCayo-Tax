
import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import { 
  IconUsers, 
  IconDollarSign, 
  IconCheck, 
  IconChartBar, 
  IconLayout, 
  IconCycle, 
  getAvatarIcon,
  IconTrash,
  IconDownload,
  IconClipboardList,
  IconTimer,
  IconSparkles
} from './Icons';

import { TeamMember, AdminView, PayCycle, DashboardStats, ActivityLog } from '../types';
import { AdminAnalytics } from './Admin/AdminAnalytics';
import { AdminCycles } from './Admin/AdminCycles';
import { CustomSelect } from './CustomSelect';

interface AdminDashboardProps {
  members: TeamMember[];
  payCycles: PayCycle[];
  onAddCycle: (start: string, end: string) => void;
  onEditCycle: (id: string, start: string, end: string) => void;
  onDeleteCycle: (id: string) => void;
  onDeleteUser?: (id: string) => void;
  stats?: DashboardStats;
  commissionRate?: number;
  onUpdateCommission?: (rate: number) => void;
  activeCycle?: PayCycle;
  activityLogs?: ActivityLog[];
  onLogOnboard?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  members,
  payCycles,
  onAddCycle,
  onEditCycle,
  onDeleteCycle,
  onDeleteUser,
  stats,
  commissionRate = 200,
  onUpdateCommission,
  activeCycle,
  activityLogs = [],
  onLogOnboard
}) => {

  const [activeTab, setActiveTab] = useState<AdminView>('overview');
  const [adminAlert, setAdminAlert] = useState<{ isOpen: boolean, memberName: string, milestone: number, message: string } | null>(null);

  const totalEarnings = members.reduce((acc, curr) => acc + curr.totalEarnings, 0);
  const totalOnboarded = members.reduce((acc, curr) => acc + curr.onboardedCount, 0);
  const activeAgents = members.filter(m => m.status !== 'Online').length;

  // Cycle Urgency Logic
  let cycleUrgency = null;
  if (activeCycle) {
     const end = new Date(activeCycle.endDate);
     const diffTime = Math.abs(end.getTime() - new Date().getTime());
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
     if (diffDays <= 3) {
        cycleUrgency = diffDays;
     }
  }

  // --- ADMIN ALERT MONITORING ---
  useEffect(() => {
    if (!activeCycle) return;

    // Check each member for milestone in CURRENT active cycle
    members.forEach(member => {
        // Milestone 13
        if (member.onboardedCount >= 13) {
            const key13 = `admin_seen_milestone_13_${member.id}_${activeCycle.id}`;
            const seen13 = localStorage.getItem(key13);
            if (!seen13) {
                setAdminAlert({
                    isOpen: true,
                    memberName: member.name,
                    milestone: 13,
                    message: `${member.name} has hit 13 Onboards this cycle! They're on fire!`
                });
                localStorage.setItem(key13, 'true');
                return; // Show one at a time
            }
        }

        // Milestone 21
        if (member.onboardedCount >= 21) {
            const key21 = `admin_seen_milestone_21_${member.id}_${activeCycle.id}`;
            const seen21 = localStorage.getItem(key21);
            if (!seen21) {
                setAdminAlert({
                    isOpen: true,
                    memberName: member.name,
                    milestone: 21,
                    message: `CYCLE MASTER ALERT! ${member.name} has hit 21 Onboards! Absolutely crushing it.`
                });
                localStorage.setItem(key21, 'true');
            }
        }
    });
  }, [members, activeCycle]);

  const safeStats: DashboardStats = stats || {
    totalAppointments: 0,
    totalOnboarded: 0,
    totalPending: 0,
    totalFailed: 0,
    totalRescheduled: 0,
    conversionRate: '0.0',
    totalTransfers: 0,
    transfersOnboarded: 0,
    transfersDeclined: 0,
    transferConversionRate: '0.0',
    appointmentsTransferred: 0,
    apptTransferConversionRate: '0.0',
    aePerformance: {}
  };

  const downloadReport = () => {
     const headers = ['Agent Name', 'Status', 'Onboarded', 'Earnings', 'Last Active'];
     const rows = members.map(m => [m.name, m.status, m.onboardedCount, (m.totalEarnings/100).toFixed(2), m.lastActive]);
     const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `chi_cayo_report_${new Date().toISOString().split('T')[0]}.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "analytics": return <AdminAnalytics members={members} stats={safeStats} />;
      case "cycles": return <AdminCycles cycles={payCycles} onAddCycle={onAddCycle} onEditCycle={onEditCycle} onDeleteCycle={onDeleteCycle} commissionRate={commissionRate} onUpdateCommission={onUpdateCommission!} />;
      case "audit": 
        return (
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700"><h3 className="font-semibold text-slate-900 dark:text-white">Activity Log</h3></div>
              <div className="max-h-[600px] overflow-y-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                       <tr>
                          <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Time</th>
                          <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
                          <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                          <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Details</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                       {activityLogs.length === 0 ? (
                          <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No activity recorded yet.</td></tr>
                       ) : (
                          activityLogs.slice().reverse().map(log => (
                             <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                <td className="px-6 py-3 text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-3 text-sm font-medium text-slate-900 dark:text-white">{log.userName}</td>
                                <td className="px-6 py-3">
                                   <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                      log.action === 'create' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                      log.action === 'delete' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' :
                                      log.action === 'update' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                      'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                   }`}>{log.action.toUpperCase()}</span>
                                </td>
                                <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">{log.details}</td>
                             </tr>
                          ))
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        );

      case "overview":
      default:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            
            {/* CYCLE BANNER */}
            <div className={`rounded-xl p-4 flex items-center justify-between border ${activeCycle ? 'bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/50' : 'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}>
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-lg ${activeCycle ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-slate-200 text-slate-500'}`}>
                      {activeCycle ? <IconCycle className="w-5 h-5" /> : <IconLayout className="w-5 h-5" />}
                   </div>
                   <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{activeCycle ? 'Viewing Active Cycle' : 'Viewing Lifetime Data'}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{activeCycle ? `${formatDate(activeCycle.startDate)} — ${formatDate(activeCycle.endDate)}` : 'No active pay cycle set. Showing all-time stats.'}</p>
                   </div>
                </div>
                {cycleUrgency && (
                   <div className="flex items-center gap-2 px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 rounded-lg text-xs font-bold animate-pulse">
                      <IconTimer className="w-4 h-4" /> Ends in {cycleUrgency} days
                   </div>
                )}
            </div>

            {/* LEADERBOARD WIDGET */}
            {members.length > 0 && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                  {members.sort((a,b) => b.onboardedCount - a.onboardedCount).slice(0,3).map((m, idx) => (
                     <div key={m.id} className={`relative p-4 rounded-2xl border flex items-center gap-4 ${idx === 0 ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-100 dark:from-yellow-900/10 dark:to-orange-900/10 dark:border-orange-900/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border-2 border-white dark:border-slate-800 ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-orange-300 text-orange-900'}`}>#{idx+1}</div>
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xl overflow-hidden border border-slate-200 dark:border-slate-600">
                           {m.avatarId && m.avatarId !== 'initial' ? (
                              <div className="w-8 h-8 text-indigo-600 dark:text-indigo-400">{getAvatarIcon(m.avatarId)}</div>
                           ) : (
                              <span className="text-lg font-bold uppercase text-slate-500 dark:text-slate-400">{m.name.charAt(0)}</span>
                           )}
                        </div>
                        <div>
                           <div className="font-bold text-slate-900 dark:text-white">{m.name}</div>
                           <div className="text-xs text-slate-500">{m.onboardedCount} Onboarded</div>
                        </div>
                     </div>
                  ))}
               </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400"><IconDollarSign className="w-6 h-6" /></div>
                  <div><p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Team Earnings</p><h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalEarnings)}</h3></div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400"><IconCheck className="w-6 h-6" /></div>
                  <div><p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Onboarded</p><h3 className="text-2xl font-bold text-slate-900 dark:text-white">{totalOnboarded}</h3></div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400"><IconUsers className="w-6 h-6" /></div>
                  <div><p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active Agents</p><h3 className="text-2xl font-bold text-slate-900 dark:text-white">{activeAgents} <span className="text-sm font-normal text-slate-400">/ {members.length}</span></h3></div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-semibold text-slate-900 dark:text-white">Agent Performance</h3>
                <div className="flex items-center gap-3">
                    {onLogOnboard && (
                        <button 
                            onClick={onLogOnboard}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all hover:scale-105 active:scale-95 shadow-md shadow-indigo-200/50 dark:shadow-none"
                        >
                            <IconSparkles className="w-3 h-3" /> Log Onboard
                        </button>
                    )}
                    <button onClick={downloadReport} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors">
                        <IconDownload className="w-3 h-3" /> Export CSV
                    </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Agent</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Onboarded</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Earnings</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {members.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No agents found.</td></tr>
                    ) : (
                      members.map(agent => (
                        <tr key={agent.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800 overflow-hidden">
                                {agent.avatarId && agent.avatarId !== 'initial' ? (
                                   <div className="w-5 h-5">{getAvatarIcon(agent.avatarId)}</div>
                                ) : (
                                   <span className="text-xs font-bold uppercase">{agent.name.charAt(0)}</span>
                                )}
                              </div>
                              <div className="font-medium text-slate-900 dark:text-white">{agent.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${agent.status === 'Online' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900' : 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>{agent.status}</span></td>
                          <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300 font-medium">{agent.onboardedCount}</td>
                          <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(agent.totalEarnings)}</td>
                          <td className="px-6 py-4 text-center">
                            {onDeleteUser && (
                                <button onClick={() => onDeleteUser(agent.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Delete User">
                                    <IconTrash className="w-4 h-4" />
                                </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* ADMIN ALERT POPUP */}
      {adminAlert && adminAlert.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in zoom-in duration-500">
           <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-8 rounded-3xl shadow-2xl max-w-sm text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
              <div className="relative z-10">
                 <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-yellow-500/50 animate-bounce">
                    <IconSparkles className="w-10 h-10 text-yellow-900" />
                 </div>
                 <h2 className="text-2xl font-extrabold mb-2">Team Milestone Alert!</h2>
                 <div className="text-xs bg-indigo-500/50 inline-block px-3 py-1 rounded-full mb-4 font-bold border border-indigo-400/50">
                    {adminAlert.milestone} Onboards
                 </div>
                 <p className="text-indigo-100 mb-6 font-medium leading-relaxed">{adminAlert.message}</p>
                 <button 
                   onClick={() => setAdminAlert(null)}
                   className="w-full py-3 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
                 >
                   Acknowledge
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* STICKY ADMIN HEADER */}
      <div className="sticky top-0 z-40 bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 lg:px-8 py-3 border-b border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Portal</h2>
            <p className="text-slate-500 text-xs">Manage team, cycles and analytics</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto max-w-full">
          <button onClick={() => setActiveTab("overview")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "overview" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}><IconLayout className="w-4 h-4" /> Overview</button>
          <button onClick={() => setActiveTab("analytics")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "analytics" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}><IconChartBar className="w-4 h-4" /> Analytics</button>
          <button onClick={() => setActiveTab("cycles")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "cycles" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}><IconCycle className="w-4 h-4" /> Pay Cycles</button>
          <button onClick={() => setActiveTab("audit")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "audit" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}><IconClipboardList className="w-4 h-4" /> Audit Log</button>
        </div>
      </div>
      
      {/* SCROLLABLE CONTENT */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {renderContent()}
      </div>
    </div>
  );
};

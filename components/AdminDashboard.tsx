import React, { useState, useEffect, useMemo } from 'react';
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
  IconSparkles,
  IconTrophy,
  IconMedal,
  IconPlus,
  IconBot,
  IconX,
  IconSend,
  IconBriefcase,
  IconTrendingUp,
  IconTransfer,
  IconActivity,
  IconBonusMachine,
  IconChevronDown
} from './Icons';

import { TeamMember, AdminView, PayCycle, DashboardStats, ActivityLog, Appointment, AppointmentStage, User, IncentiveRule, Incentive } from '../types';
import { AdminAnalytics } from './Admin/AdminAnalytics';
import { AdminCycles } from './Admin/AdminCycles';
import { CustomSelect } from './CustomSelect';
import { IncentiveBuilder } from './Admin/IncentiveBuilder';

interface AdminDashboardProps {
  members: TeamMember[];
  payCycles: PayCycle[];
  onAddCycle: (start: string, end: string) => void;
  onEditCycle: (id: string, start: string, end: string) => void;
  onDeleteCycle: (id: string) => void;
  onDeleteUser?: (id: string) => void;
  stats?: DashboardStats;
  commissionRate?: number;
  selfCommissionRate?: number;
  onUpdateMasterCommissions: (std: number, self: number) => void;
  activeCycle?: PayCycle;
  activityLogs?: ActivityLog[];
  onLogOnboard?: () => void;
  appointments?: Appointment[];
  onApplyIncentive?: (rule: Partial<IncentiveRule>) => void;
  allUsers?: User[];
  lifetimeTeamEarnings?: number;
  incentiveRules?: IncentiveRule[];
  onDeleteIncentiveRule?: (id: string) => void;
  allIncentives?: Incentive[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  members, payCycles, onAddCycle, onEditCycle, onDeleteCycle, onDeleteUser, stats,
  commissionRate = 200, selfCommissionRate = 300, onUpdateMasterCommissions,
  activeCycle, activityLogs = [], onLogOnboard, appointments = [],
  onApplyIncentive, allUsers = [], lifetimeTeamEarnings = 0, incentiveRules = [], 
  onDeleteIncentiveRule, 
  allIncentives = []
}) => {

  const [activeTab, setActiveTab] = useState<AdminView>('overview');
  const [selectedScopeId, setSelectedScopeId] = useState<string>('active');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());

  const toggleCycle = (id: string) => {
      const next = new Set(expandedCycles);
      if (next.has(id)) next.delete(id); else next.add(id);
      setExpandedCycles(next);
  };

  const scopeOptions = useMemo(() => {
    const options = [
      { value: 'active', label: 'Current Active Cycle' },
      { value: 'lifetime', label: 'All-Time Lifetime' }
    ];
    const ended = payCycles
        .filter(c => new Date(c.endDate).getTime() < Date.now())
        .sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
        .slice(0, 5)
        .map(c => ({
            value: c.id,
            label: `${formatDate(c.startDate)} - ${formatDate(c.endDate)}`
        }));
    return [...options, ...ended];
  }, [payCycles]);

  const dashboardData = useMemo(() => {
    let filteredAppts = appointments.filter(a => a.stage === AppointmentStage.ONBOARDED);
    let scopeLabel = "Active Cycle";
    
    if (selectedScopeId === 'active') {
        if (activeCycle) {
            const s = new Date(activeCycle.startDate).getTime();
            const e = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
            filteredAppts = filteredAppts.filter(a => {
                const d = new Date(a.scheduledAt).getTime();
                return d >= s && d <= e;
            });
        } else {
            filteredAppts = [];
        }
    } else if (selectedScopeId !== 'lifetime') {
        const cycle = payCycles.find(c => c.id === selectedScopeId);
        if (cycle) {
            const s = new Date(cycle.startDate).getTime();
            const e = new Date(cycle.endDate).setHours(23, 59, 59, 999);
            filteredAppts = filteredAppts.filter(a => {
                const d = new Date(a.scheduledAt).getTime();
                return d >= s && d <= e;
            });
            scopeLabel = `${formatDate(cycle.startDate)} - ${formatDate(cycle.endDate)}`;
        }
    }

    if (selectedAgentId !== 'all') {
        filteredAppts = filteredAppts.filter(a => a.userId === selectedAgentId);
    }

    const liveFunnel = appointments.filter(a => a.stage === AppointmentStage.PENDING || a.stage === AppointmentStage.RESCHEDULED).length;
    const projectedWins = Math.round(liveFunnel * 0.2);
    const projectedRevenue = projectedWins * commissionRate;

    const aeCloseMap: Record<string, number> = { 'Joshua': 0, 'Jorge': 0, 'Andrew': 0 };
    let agentSelfCloseCount = 0;

    filteredAppts.forEach(a => {
        const agent = allUsers.find(u => u.id === a.userId);
        if (a.aeName && aeCloseMap.hasOwnProperty(a.aeName)) {
            aeCloseMap[a.aeName]++;
        } else if (agent && a.aeName === agent.name) {
            agentSelfCloseCount++;
        }
    });

    const agentMatrix = allUsers.filter(u => u.role !== 'admin').map(agent => {
        const userAppts = filteredAppts.filter(a => a.userId === agent.id);
        const self = userAppts.filter(a => a.aeName === agent.name).length;
        const passed = userAppts.length - self;
        return { id: agent.id, name: agent.name, avatarId: agent.avatarId, self, passed, total: userAppts.length };
    }).sort((a,b) => b.total - a.total);

    let selfOnboardRevenue = 0; let transferredRevenue = 0;
    filteredAppts.forEach(a => {
        const agent = allUsers.find(u => u.id === a.userId);
        const isSelf = a.aeName === agent?.name;
        const rate = a.earnedAmount || (isSelf ? selfCommissionRate : commissionRate);
        if (isSelf) selfOnboardRevenue += rate; else transferredRevenue += rate;
    });

    const relevantIncentives = allIncentives.filter(i => {
       if (selectedAgentId !== 'all' && i.userId !== selectedAgentId) return false;
       if (selectedScopeId === 'active' && i.appliedCycleId !== activeCycle?.id) return false;
       if (selectedScopeId !== 'active' && selectedScopeId !== 'lifetime' && i.appliedCycleId !== selectedScopeId) return false;
       return true;
    });
    const bonusRevenue = relevantIncentives.reduce((sum, i) => sum + i.amountCents, 0);

    const synergy: Record<string, Record<string, { count: number, revenue: number }>> = {};
    filteredAppts.forEach(a => {
        const agent = allUsers.find(u => u.id === a.userId);
        if (agent && agent.role !== 'admin' && a.aeName && a.aeName !== agent.name) {
            if (!synergy[agent.name]) synergy[agent.name] = {};
            if (!synergy[agent.name][a.aeName]) synergy[agent.name][a.aeName] = { count: 0, revenue: 0 };
            
            const rate = Number(a.earnedAmount) || commissionRate;
            synergy[agent.name][a.aeName].count++;
            synergy[agent.name][a.aeName].revenue += rate;
        }
    });

    const history = payCycles
        .filter(c => new Date(c.endDate).getTime() < Date.now())
        .sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
        .map(cycle => {
            const s = new Date(cycle.startDate).getTime();
            const e = new Date(cycle.endDate).setHours(23, 59, 59, 999);
            const cycleAppts = appointments.filter(a => {
                if (selectedAgentId !== 'all' && a.userId !== selectedAgentId) return false;
                const d = new Date(a.scheduledAt).getTime();
                return a.stage === AppointmentStage.ONBOARDED && d >= s && d <= e;
            });
            const cycleIncentives = allIncentives.filter(i => {
                if (selectedAgentId !== 'all' && i.userId !== selectedAgentId) return false;
                return i.appliedCycleId === cycle.id;
            });
            const prodRev = cycleAppts.reduce((sum, a) => sum + (Number(a.earnedAmount) || 0), 0);
            const bonusRev = cycleIncentives.reduce((sum, i) => sum + Number(i.amountCents), 0);
            return {
                ...cycle,
                onboardedCount: cycleAppts.length,
                totalCents: prodRev + bonusRev,
                incentives: cycleIncentives,
                appointments: cycleAppts
            };
        });

    return { 
        appointments: filteredAppts, 
        totalProductionRevenue: selfOnboardRevenue + transferredRevenue,
        totalBonusRevenue: bonusRevenue,
        totalOnboarded: filteredAppts.length,
        aePerformance: aeCloseMap,
        agentSelfCloseCount,
        agentMatrix,
        scopeLabel,
        synergy,
        history,
        projectedRevenue,
        projectedWins
    };
  }, [appointments, selectedScopeId, selectedAgentId, activeCycle, payCycles, allUsers, commissionRate, selfCommissionRate, allIncentives]);

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 pb-20">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none"><IconCycle className="w-5 h-5" /></div>
                <div><h4 className="text-sm font-bold text-slate-900 dark:text-white">Viewing: {dashboardData.scopeLabel}</h4><p className="text-[10px] text-slate-500 font-medium">Global workforce aggregation.</p></div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <div className="w-48"><CustomSelect options={scopeOptions} value={selectedScopeId} onChange={setSelectedScopeId} /></div>
                <div className="w-48"><CustomSelect options={[{value: 'all', label: 'All Agents'}, ...allUsers.filter(u => u.role !== 'admin').map(u => ({value: u.id, label: u.name}))]} value={selectedAgentId} onChange={setSelectedAgentId} /></div>
            </div>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border-b-4 border-indigo-500">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center animate-pulse"><IconBot className="w-6 h-6 text-indigo-400" /></div>
              <div>
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Taxter Predictive Lens</h3>
                 <p className="text-lg font-bold">Cycle Forecast: <span className="text-indigo-300">+{dashboardData.projectedWins} Projected Onboards</span></p>
              </div>
           </div>
           <div className="flex items-center gap-6">
              <div className="text-right">
                 <div className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Potential Pipeline Rev</div>
                 <div className="text-2xl font-black text-indigo-400">+{formatCurrency(dashboardData.projectedRevenue)}</div>
              </div>
              <div className="h-10 w-[1px] bg-white/10 hidden md:block"></div>
              <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                 <IconTrendingUp className="w-4 h-4 text-emerald-400" />
                 <span className="text-xs font-black uppercase tracking-widest text-emerald-400">20% Conversion Model</span>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {['Joshua', 'Jorge', 'Andrew', 'Agent-Self'].map(name => {
                const isSelf = name === 'Agent-Self';
                const count = isSelf ? dashboardData.agentSelfCloseCount : (dashboardData.aePerformance[name] || 0);
                const total = dashboardData.totalOnboarded || 1;
                const percent = Math.round((count / total) * 100);
                const color = isSelf ? 'bg-emerald-500' : (name === 'Joshua' ? 'bg-blue-500' : name === 'Jorge' ? 'bg-orange-500' : 'bg-purple-500');
                const Icon = isSelf ? IconSparkles : IconBriefcase;
                return (
                    <div key={name} className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
                        <div className="flex justify-between items-center mb-4 relative z-10">
                            <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl ${color} text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-6`}><Icon className="w-5 h-5" /></div><span className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-[11px]">{isSelf ? 'Agents-Self' : name}</span></div>
                            <div className="text-right"><div className="text-2xl font-black text-slate-900 dark:text-white">{count}</div><div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Scoped</div></div>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className={`h-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${percent}%` }} /></div>
                        <div className="mt-2 flex justify-between"><span className="text-[9px] font-bold text-slate-400 uppercase">Share of Total</span><span className="text-[9px] font-black text-slate-600 dark:text-slate-300">{percent}%</span></div>
                    </div>
                );
            })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
                    <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl shrink-0 group-hover:scale-110 transition-transform"><IconDollarSign className="w-7 h-7" /></div>
                    <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Production Rev</p><h3 className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(dashboardData.totalProductionRevenue)}</h3></div>
                </div>
                {dashboardData.totalBonusRevenue > 0 ? (
                  <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 rounded-[2rem] shadow-lg flex items-center gap-4 text-white animate-in zoom-in duration-500">
                      <div className="p-4 bg-white/20 rounded-2xl shrink-0"><IconTrophy className="w-7 h-7" /></div>
                      <div><p className="text-xs font-black uppercase tracking-widest opacity-80">Bonus Payout</p><h3 className="text-2xl font-black">{formatCurrency(dashboardData.totalBonusRevenue)}</h3></div>
                  </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
                        <div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl shrink-0 group-hover:rotate-12 transition-transform"><IconChartBar className="w-7 h-7" /></div>
                        <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Confirmed Leads</p><h3 className="text-2xl font-black text-slate-900 dark:text-white">{dashboardData.totalOnboarded}</h3></div>
                    </div>
                )}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 group">
                    <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl shrink-0 group-hover:scale-110 transition-transform"><IconUsers className="w-7 h-7" /></div>
                    <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Workforce Size</p><h3 className="text-2xl font-black text-slate-900 dark:text-white">{allUsers.filter(u => u.role !== 'admin').length} <span className="text-xs font-bold text-slate-400">Agents</span></h3></div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 group">
                    <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl shrink-0 group-hover:animate-pulse"><IconTrendingUp className="w-7 h-7" /></div>
                    <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Funnel Velocity</p><h3 className="text-2xl font-black text-slate-900 dark:text-white">{appointments.filter(a => a.stage === AppointmentStage.PENDING || a.stage === AppointmentStage.RESCHEDULED).length} <span className="text-xs font-bold text-slate-400">Live</span></h3></div>
                </div>
            </div>
            <IncentiveBuilder onApply={onApplyIncentive!} members={members} activeCycle={activeCycle} rules={incentiveRules} onDeleteRule={onDeleteIncentiveRule!} />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center"><h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><IconActivity className="w-5 h-5 text-indigo-500" /> Agent Performance Dynamics</h3><div className="flex gap-4"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Self-Onboard</span></div><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AE Assisted</span></div></div></div>
            <div className="p-8"><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{dashboardData.agentMatrix.map(data => { const selfPercent = data.total > 0 ? Math.round((data.self / data.total) * 100) : 0; const passedPercent = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0; return (<div key={data.id} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 transition-all"><div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">{data.avatarId && data.avatarId !== 'initial' ? getAvatarIcon(data.avatarId) : <span className="font-bold text-indigo-500">{data.name.charAt(0)}</span>}</div><div className="flex-1 min-w-0"><div className="text-sm font-black text-slate-900 dark:text-white truncate">{data.name}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{data.total} Scoped Wins</div></div></div><div className="space-y-4"><div className="space-y-1"><div className="flex justify-between text-[10px] font-black uppercase tracking-tighter"><span className="text-emerald-600">Self-Onboard</span><span className="text-slate-500">{data.self} ({selfPercent}%)</span></div><div className="h-2 w-full bg-white dark:bg-slate-800 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${selfPercent}%` }}></div></div></div><div className="space-y-1"><div className="flex justify-between text-[10px] font-black uppercase tracking-tighter"><span className="text-indigo-600">AE Assisted</span><span className="text-slate-500">{data.passed} ({passedPercent}%)</span></div><div className="h-2 w-full bg-white dark:bg-slate-800 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${passedPercent}%` }}></div></div></div></div></div>); })}</div></div>
        </div>

        <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3 px-2">
                <IconCycle className="w-6 h-6 text-indigo-500" /> Team Payout History
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dashboardData.history.map(win => {
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
                                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Team Total: {formatCurrency(win.totalCents)}</div>
                                    </div>
                                </div>
                                <div className={`p-2 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                    <IconChevronDown className="w-5 h-5" />
                                </div>
                            </button>

                            {isOpen && (
                                <div className="px-6 pb-6 animate-in slide-in-from-top-4 duration-300">
                                    <div className="space-y-4 border-t border-slate-100 dark:border-slate-700 pt-6">
                                        {win.incentives.length > 0 && (
                                            <div className="space-y-2">
                                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cycle Challenges</h5>
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
                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                                            <table className="w-full text-left text-[10px]">
                                                <thead className="bg-slate-100 dark:bg-slate-800">
                                                    <tr>
                                                        <th className="px-4 py-2 font-black uppercase text-slate-400">Agent</th>
                                                        <th className="px-4 py-2 text-right font-black uppercase text-slate-400">Earned</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {win.appointments.map(a => (
                                                        <tr key={a.id}>
                                                            <td className="px-4 py-2 font-bold text-slate-600 dark:text-slate-300">{allUsers?.find(u => u.id === a.userId)?.name || 'Agent'}</td>
                                                            <td className="px-4 py-2 text-right font-black text-emerald-600">{formatCurrency(a.earnedAmount || 0)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
             <div className="px-8 py-5 border-b border-slate-50 dark:border-slate-700"><h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><IconTransfer className="w-5 h-5 text-indigo-500" /> Executive Synergy Matrix</h3></div>
             <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(dashboardData.synergy).map(([agentName, aeData]) => {
                   const totalAgentSynergyRev = Object.values(aeData).reduce((s, c) => s + c.revenue, 0);
                   return (
                      <div key={agentName} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col h-full">
                         <div className="text-sm font-black text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2 flex justify-between items-center">
                            {agentName}
                            <span className="text-[10px] bg-white dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-400">Source Agent</span>
                         </div>
                         <div className="space-y-4 flex-1">
                            {Object.entries(aeData).sort((a,b) => b[1].revenue - a[1].revenue).map(([ae, data]) => {
                               const aeColor = ae === 'Joshua' ? 'bg-blue-500' : ae === 'Jorge' ? 'bg-orange-500' : 'bg-purple-500';
                               return (
                                  <div key={ae} className="flex flex-col gap-1.5">
                                     <div className="flex justify-between items-end">
                                        <div className="flex flex-col">
                                           <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Closed by {ae}</span>
                                           <span className="text-[10px] text-slate-400 font-medium">{data.count} Transfers</span>
                                        </div>
                                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{formatCurrency(data.revenue)}</span>
                                     </div>
                                     <div className="h-1.5 w-full bg-white dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${aeColor}`} style={{ width: `${(data.revenue / (totalAgentSynergyRev || 1)) * 100}%` }} />
                                     </div>
                                  </div>
                               );
                            })}
                         </div>
                      </div>
                   );
                })}
                {Object.keys(dashboardData.synergy).length === 0 && (
                   <div className="col-span-full py-8 text-center text-slate-400 italic">No synergy data recorded for this scope.</div>
                )}
             </div>
        </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "analytics": return <AdminAnalytics members={members} stats={stats!} appointments={appointments} payCycles={payCycles} users={allUsers!} />;
      case "cycles": return <AdminCycles cycles={payCycles} onAddCycle={onAddCycle} onEditCycle={onEditCycle} onDeleteCycle={onDeleteCycle} commissionRate={commissionRate} selfCommissionRate={selfCommissionRate} onUpdateMasterCommissions={onUpdateMasterCommissions} />;
      case "audit": return (<div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in flex flex-col h-[700px]"><div className="px-8 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0"><h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><IconClipboardList className="w-5 h-5 text-indigo-500" /> Activity Audit</h3></div><div className="flex-1 overflow-y-auto no-scrollbar"><table className="w-full text-left"><thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-700/50"><tr><th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Time</th><th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Agent</th><th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</th><th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Details</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">{activityLogs.slice().reverse().filter(log => !log.details.toLowerCase().includes('updated profile settings')).map(log => (<tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"><td className="px-8 py-4 text-xs text-slate-400 tabular-nums">{new Date(log.timestamp).toLocaleString()}</td><td className="px-8 py-4 text-sm font-bold text-slate-900 dark:text-white">{log.userName}</td><td className="px-8 py-4"><span className="text-[10px] font-black px-2 py-1 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 uppercase tracking-tighter">{log.action}</span></td><td className="px-8 py-4 text-sm text-slate-600 dark:text-slate-400">{log.details}</td></tr>))}</tbody></table></div></div>);
      case "overview": default: return renderOverview();
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="sticky top-0 z-40 bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 lg:px-8 py-3 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 dark:border-slate-800">
        <div className="flex items-center justify-between w-full">
           <div className="flex items-center gap-4">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Dashboard</h2>
              <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-2xl shadow-inner ml-4"><button onClick={() => setActiveTab("overview")} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeTab === "overview" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Overview</button><button onClick={() => setActiveTab("analytics")} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeTab === "analytics" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Deep Dive</button><button onClick={() => setActiveTab("cycles")} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeTab === "cycles" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Cycles</button><button onClick={() => setActiveTab("audit")} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeTab === "audit" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Audit Log</button></div>
           </div>
           
           {/* Log Onboard Button inside Admin Dashboard component */}
           <button 
             onClick={onLogOnboard}
             className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xl transition-all active:scale-95 text-sm font-bold animate-in slide-in-from-right-2 duration-500 shadow-indigo-200 dark:shadow-none"
           >
             <IconSparkles className="w-5 h-5" /> 
             Log Onboarded Partner
           </button>
        </div>
      </div>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">{renderContent()}</div>
    </div>
  );
};
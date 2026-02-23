
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import {
  IconUsers, IconDollarSign, IconCheck, IconChartBar, IconLayout, IconCycle,
  getAvatarIcon, IconTrash, IconDownload, IconClock,
  IconSparkles, IconTrophy, IconPlus, IconBot, IconX, IconBriefcase,
  IconTrendingUp, IconTransfer, IconActivity, IconChevronDown, IconChevronLeft, IconChevronRight, IconFilter, IconChartPie, IconAlertCircle, IconTimer, IconStar, IconZap
} from './Icons';

import { TeamMember, AdminView, PayCycle, DashboardStats, ActivityLog, Appointment, AppointmentStage, User, IncentiveRule, Incentive, ACCOUNT_EXECUTIVES } from '../types';
import { AdminAnalytics } from './Admin/AdminAnalytics';
import { AdminCycles } from './Admin/AdminCycles';
import { CustomSelect } from './CustomSelect';
import { IncentiveBuilder } from './Admin/IncentiveBuilder';
import { ReferralWinsTab } from './ReferralWinsTab';

interface AdminDashboardProps {
  members: TeamMember[]; payCycles: PayCycle[]; onAddCycle: (s: string, e: string) => void;
  onEditCycle: (id: string, s: string, e: string) => void; onDeleteCycle: (id: string) => void;
  stats?: DashboardStats; commissionRate?: number; selfCommissionRate?: number; referralRate?: number; activationRate?: number;
  onUpdateMasterCommissions: (std: number, self: number, referral: number, activation: number) => void;
  activeCycle?: PayCycle; activityLogs?: ActivityLog[]; onLogOnboard?: () => void;
  appointments?: Appointment[]; onApplyIncentive?: (rule: Partial<IncentiveRule>) => void;
  allUsers?: User[]; lifetimeTeamEarnings?: number; incentiveRules?: IncentiveRule[];
  onDeleteIncentiveRule?: (id: string) => void; allIncentives?: Incentive[];
  onImportReferrals?: (rows: { name: string, phone: string, referrals: number, date: string }[]) => void;
  onManualReferral?: (clientId: string, count: number) => void;
  onDeleteReferral?: (clientId: string, entryId: string) => void;
  onViewAppt: (appt: Appointment, stack?: Appointment[]) => void;
  performanceStats?: {
    agentStats: Record<string, {
      onboards: number;
      activations: number;
      totalReferrals: number;
      ratio: string;
      avgDaysToActivate: string;
    }>;
  };
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  members, payCycles, onAddCycle, onEditCycle, onDeleteCycle, stats, commissionRate = 200,
  selfCommissionRate = 300, referralRate = 200, activationRate = 1000, onUpdateMasterCommissions,
  activeCycle, activityLogs = [], onLogOnboard, appointments = [], onApplyIncentive,
  allUsers = [], incentiveRules = [], onDeleteIncentiveRule, allIncentives = [],
  onImportReferrals, onManualReferral, onDeleteReferral, onViewAppt, performanceStats
}) => {
  const [activeTab, setActiveTab] = useState<AdminView>('overview');
  const [selectedCycleId, setSelectedCycleId] = useState<string>('active');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [openCycleIds, setOpenCycleIds] = useState<Set<string>>(new Set());
  const [synergyIndex, setSynergyIndex] = useState(0);
  const [isCompareMinimized, setIsCompareMinimized] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  const historyListRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 20, y: 150 });
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  const cycleOptions = useMemo(() => {
    const base = [{ value: 'active', label: 'Current Active Cycle' }, { value: 'all', label: 'All Time' }];
    const sorted = [...payCycles].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    return [...base, ...sorted.map(c => ({ value: c.id, label: `${formatDate(c.startDate)} - ${formatDate(c.endDate)}` }))];
  }, [payCycles]);

  const filteredData = useMemo(() => {
    let onboarded = appointments.filter(a => a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED);
    let all = appointments;

    if (selectedCycleId === 'active' && activeCycle) {
      const s = new Date(activeCycle.startDate).getTime();
      const e = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
      onboarded = onboarded.filter(a => { const d = new Date(a.onboardedAt || a.scheduledAt).getTime(); return d >= s && d <= e; });
      all = all.filter(a => { const d = new Date(a.onboardedAt || a.scheduledAt).getTime(); return d >= s && d <= e; });
    } else if (selectedCycleId !== 'all' && selectedCycleId !== 'active') {
      const cycle = payCycles.find(c => c.id === selectedCycleId);
      if (cycle) {
        const s = new Date(cycle.startDate).getTime();
        const e = new Date(cycle.endDate).setHours(23, 59, 59, 999);
        onboarded = onboarded.filter(a => { const d = new Date(a.onboardedAt || a.scheduledAt || a.createdAt).getTime(); return d >= s && d <= e; });
        all = all.filter(a => { const d = new Date(a.onboardedAt || a.scheduledAt || a.createdAt).getTime(); return d >= s && d <= e; });
      }
    }

    if (selectedAgentId !== 'all') {
      onboarded = onboarded.filter(a => a.userId === selectedAgentId);
      all = all.filter(a => a.userId === selectedAgentId);
    }

    return { onboarded, all };
  }, [appointments, selectedCycleId, selectedAgentId, activeCycle, payCycles]);

  const agentPerformers = useMemo(() => {
    const aes = ACCOUNT_EXECUTIVES;
    return allUsers.filter(u => u.role !== 'admin').map(agent => {
      const agentAll = filteredData.all.filter(a => a.userId === agent.id);
      const agentWins = filteredData.onboarded.filter(a => a.userId === agent.id);
      const selfWins = agentWins.filter(a => !a.aeName || a.aeName === agent.name || !aes.includes(a.aeName));
      const assistedWins = agentWins.filter(a => a.aeName && aes.includes(a.aeName));
      const failed = agentAll.filter(a => a.stage === AppointmentStage.NO_SHOW || a.stage === AppointmentStage.DECLINED);
      const agentIncentives = allIncentives.filter(i => i.userId === agent.id || i.userId === 'team');
      const totalEarned = agentWins.reduce((s, a) => s + (a.earnedAmount || 0), 0) + agentIncentives.reduce((s, i) => s + i.amountCents, 0);
      const totalVelocity = agentWins.reduce((sum, a) => {
        const start = new Date(a.createdAt).getTime();
        const end = new Date(a.onboardedAt || a.scheduledAt).getTime();
        return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
      }, 0);
      const avgVelocityNum = agentWins.length > 0 ? (totalVelocity / agentWins.length) : 0;
      const avgVelocity = avgVelocityNum > 0 ? avgVelocityNum.toFixed(1) : 'N/A';
      return {
        ...agent, winCount: agentWins.length, selfCount: selfWins.length, assistedCount: assistedWins.length, failedCount: failed.length,
        totalEarned, velocity: avgVelocity, onboardRate: agentAll.length > 0 ? Math.round((agentWins.length / agentAll.length) * 100) : 0,
        cancelRate: agentAll.length > 0 ? Math.round((failed.length / agentAll.length) * 100) : 0
      };
    }).filter(a => a.winCount > 0 || a.failedCount > 0 || selectedAgentId === 'all');
  }, [allUsers, filteredData, referralRate, selectedAgentId]);

  const marketShareData = useMemo(() => {
    const totalRev = agentPerformers.reduce((s, a) => s + a.totalEarned, 0) || 1;
    return agentPerformers.map((a, i) => {
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
      return { name: a.name, share: Math.round((a.totalEarned / totalRev) * 100), value: a.totalEarned, color: colors[i % colors.length] };
    }).sort((a, b) => b.value - a.value);
  }, [agentPerformers]);

  const synergyMatrix = useMemo(() => {
    return allUsers.filter(u => u.role !== 'admin').map(agent => {
      const agentWins = appointments.filter(a => a.userId === agent.id && a.stage === AppointmentStage.ONBOARDED);
      const assistsMap: Record<string, number> = {};
      agentWins.forEach(a => { if (a.aeName && a.aeName !== agent.name && ACCOUNT_EXECUTIVES.includes(a.aeName)) assistsMap[a.aeName] = (assistsMap[a.aeName] || 0) + 1; });
      return { agentName: agent.name, assists: Object.entries(assistsMap).sort((a, b) => b[1] - a[1]) };
    }).filter(s => s.assists.length > 0);
  }, [appointments, allUsers]);

  const historyCycles = useMemo(() => {
    const now = new Date().getTime();
    return payCycles.filter(c => new Date(c.startDate).getTime() <= now).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [payCycles]);

  const comparisonData = useMemo(() => {
    if (openCycleIds.size <= 1) return null;
    const openCycles = historyCycles.filter(c => openCycleIds.has(c.id));
    const items = openCycles.map(c => {
      const cycleOnboarded = appointments.filter(a => a.stage === AppointmentStage.ONBOARDED && new Date(a.onboardedAt || a.scheduledAt).getTime() >= new Date(c.startDate).getTime() && new Date(a.onboardedAt || a.scheduledAt).getTime() <= new Date(c.endDate).setHours(23, 59, 59, 999));
      const totalEarned = cycleOnboarded.reduce((s, a) => s + (a.earnedAmount || 0) + ((a.referralCount || 0) * referralRate), 0);
      const dailyMap: Record<string, { wins: number, revenue: number }> = {};
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) dailyMap[d.toLocaleDateString('en-CA')] = { wins: 0, revenue: 0 };
      cycleOnboarded.forEach(a => {
        const dayKey = new Date(a.onboardedAt || a.scheduledAt).toLocaleDateString('en-CA');
        if (dailyMap[dayKey]) { dailyMap[dayKey].wins++; dailyMap[dayKey].revenue += (a.earnedAmount || 0) + (a.referralCount || 0) * referralRate; }
      });
      const dailyPoints = Object.entries(dailyMap).map(([date, data]) => ({ dateLabel: date.split('-').slice(1).join('/'), ...data }));
      return { id: c.id, label: formatDate(c.startDate).split(',')[0], wins: cycleOnboarded.length, revenue: totalEarned, dailyPoints, selfRate: cycleOnboarded.length > 0 ? Math.round((cycleOnboarded.filter(a => a.aeName === allUsers.find(u => u.id === a.userId)?.name).length / cycleOnboarded.length) * 100) : 0 };
    });
    const flattenedPoints = items.flatMap(item => item.dailyPoints);
    return { items, total: items.reduce((s, x) => s + x.revenue, 0), flattenedPoints };
  }, [openCycleIds, historyCycles, appointments, referralRate, allUsers]);

  const toggleCycleDetails = (id: string, element: HTMLElement) => {
    const next = new Set(openCycleIds);
    if (next.has(id)) next.delete(id); else { next.add(id); setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }
    setOpenCycleIds(next);
  };

  const exportFilteredLedger = () => {
    const headers = ["ID", "Created Date", "Onboard Date", "Agent", "Client", "Phone", "Closer", "Type", "Referrals", "Ref Payout", "Std Payout", "Total Payout", "Notes"];
    const rows = filteredData.onboarded.map(a => {
      const agent = allUsers.find(u => u.id === a.userId);
      const isSelf = !a.aeName || a.aeName === agent?.name;
      const apptIncentives = allIncentives.filter(i => i.relatedAppointmentId === a.id);
      const refPayout = apptIncentives.filter(i => i.label.toLowerCase().includes('ref')).reduce((s, i) => s + i.amountCents, 0);
      const bonusPayout = apptIncentives.filter(i => !i.label.toLowerCase().includes('ref')).reduce((s, i) => s + i.amountCents, 0);
      const stdPayout = a.earnedAmount || (isSelf ? selfCommissionRate : commissionRate);
      return [
        a.id,
        new Date(a.createdAt).toLocaleString(),
        new Date(a.onboardedAt || a.scheduledAt).toLocaleString(),
        agent?.name || 'Agent',
        a.name,
        a.phone,
        a.aeName || 'Self',
        isSelf ? 'Self' : 'Transfer',
        a.referralCount || 0,
        (refPayout / 100).toFixed(2),
        (stdPayout / 100).toFixed(2),
        ((refPayout + stdPayout + bonusPayout) / 100).toFixed(2),
        (a.notes || "").replace(/,/g, ";")
      ].join(",");
    });
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `ChiCayo Tax_Full_Export_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => { if (draggingRef.current) setPos({ x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y }); };
    const handleMouseUp = () => { draggingRef.current = false; };
    window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, []);

  const cycleProgress = useMemo(() => {
    if (!activeCycle) return 0;
    const start = new Date(activeCycle.startDate).getTime();
    const end = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
    const now = Date.now();
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  }, [activeCycle]);

  const teamTotalEarnedInScope = useMemo(() => agentPerformers.reduce((s, a) => s + a.totalEarned, 0), [agentPerformers]);
  const teamAvgVelocityInScope = useMemo(() => {
    const vels = agentPerformers.map(a => parseFloat(a.velocity)).filter(v => !isNaN(v));
    return vels.length > 0 ? (vels.reduce((s, v) => s + v, 0) / vels.length).toFixed(1) : 'N/A';
  }, [agentPerformers]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {comparisonData && (
        <div style={{ left: pos.x, top: pos.y }} className={`fixed z-[100] transition-all duration-500 group/compare ${isCompareMinimized ? 'w-24 h-24 rounded-full' : 'w-[90vw] md:w-[500px] rounded-[3rem]'} bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-white/20 overflow-hidden cursor-default`} onMouseDown={(e) => { if (e.target instanceof HTMLElement && e.target.closest('button')) return; draggingRef.current = true; offsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }; }}>
          {isCompareMinimized ? (
            <button onClick={() => setIsCompareMinimized(false)} className="w-full h-full flex flex-col items-center justify-center gap-1 group/btn transition-transform active:scale-90"><div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">Total Open</div><div className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{formatCurrency(comparisonData.total)}</div><IconActivity className="w-4 h-4 text-indigo-500 animate-pulse" /></button>
          ) : (
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl"><IconTrendingUp className="w-4 h-4" /></div><h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Multi-Cycle Trend Analysis</h4></div><button onClick={() => setIsCompareMinimized(true)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"><IconX className="w-4 h-4" /></button></div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">{comparisonData.items.map((data, i) => { const next = comparisonData.items[i + 1]; const isGrowth = next ? data.revenue >= next.revenue : true; return (<div key={data.id} className="min-w-[150px] bg-slate-50 dark:bg-white/5 p-5 rounded-[2rem] border border-slate-100 dark:border-white/10 hover:border-indigo-200 transition-colors"><p className="text-[9px] font-black text-slate-400 uppercase mb-2">{data.label}</p><div className="text-xl font-black text-slate-900 dark:text-white mb-1 tabular-nums">{formatCurrency(data.revenue)}</div><div className="flex items-center justify-between text-[10px] font-bold text-slate-500"><span>{data.wins} Wins</span>{next && <span className={isGrowth ? 'text-emerald-500' : 'text-rose-500'}>{isGrowth ? '↑' : '↓'}</span>}</div></div>); })}</div>
              <div className="relative group/chart"><h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><IconActivity className="w-3 h-3" /> Performance Velocity Timeline</h5><div className="h-40 w-full bg-slate-950/5 dark:bg-white/5 rounded-[2rem] relative flex items-end pt-8 px-4"><svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100"><defs><linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" /><stop offset="100%" stopColor="#6366f1" stopOpacity="0" /></linearGradient></defs>{(() => { const pts = comparisonData.flattenedPoints; if (pts.length < 2) return null; const maxRev = Math.max(...pts.map(p => p.revenue)) || 1; const stepX = 100 / (pts.length - 1); const pathD = pts.reduce((acc, p, i) => { const x = i * stepX; const y = 100 - (p.revenue / maxRev) * 70; return acc + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`); }, ""); return (<><path d={`${pathD} L 100 100 L 0 100 Z`} fill="url(#chartGradient)" /><path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{pts.map((p, i) => (<rect key={i} x={i * stepX - (stepX / 2)} y="0" width={stepX} height="100" fill="transparent" onMouseEnter={() => setHoveredPoint({ ...p, x: i * stepX, y: 100 - (p.revenue / maxRev) * 70 })} onMouseLeave={() => setHoveredPoint(null)} className="cursor-crosshair" />))}</>); })()}</svg>{hoveredPoint && (<div className="absolute z-[200] pointer-events-none bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-white/20 -translate-x-1/2 animate-in fade-in zoom-in-95 duration-200" style={{ left: `${hoveredPoint.x}%`, top: `${Math.max(5, hoveredPoint.y - 45)}%` }}><div className="flex items-center gap-2 mb-1"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400" /><span className="text-[10px] font-black text-slate-400">{hoveredPoint.dateLabel}</span></div><div className="text-xs font-black">{formatCurrency(hoveredPoint.revenue)}</div><div className="text-[9px] font-bold text-indigo-300 mt-0.5">{hoveredPoint.wins} Onboards Verified</div></div>)}<div className="absolute bottom-2 left-4 right-4 flex justify-between pointer-events-none"><span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Recent Session</span><span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">History Flow</span></div></div></div>
              <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex justify-between items-center"><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Team Growth Momentum</p><p className="text-sm font-black text-emerald-600 tabular-nums">+{Math.round((comparisonData.items[0].revenue / (comparisonData.items[comparisonData.items.length - 1].revenue || 1)) * 100) - 100}% Velocity</p></div><div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg Conversion</p><p className="text-sm font-black text-indigo-600">84.2% Mastery</p></div></div>
            </div>
          )}
        </div>
      )}

      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 md:px-8 py-4 border-b flex flex-col xl:flex-row justify-between items-center gap-4 dark:border-slate-800 shrink-0">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10 w-full xl:w-auto">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight shrink-0">Admin Console</h2>
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl flex flex-wrap justify-center gap-1 shadow-inner border border-slate-200/50 dark:border-slate-700/50 overflow-x-auto no-scrollbar max-w-full">
            {['overview', 'deepdive', 'referral-wins', 'cycles', 'auditlog'].map((id) => (
              <button key={id} onClick={() => setActiveTab(id as AdminView)} className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 md:px-6 py-2 md:py-2.5 rounded-xl transition-all duration-300 ${activeTab === id ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-lg scale-[1.02]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>{id.replace('auditlog', 'Audit Log').replace('referral-wins', 'Referral Wins').replace('deepdive', 'Deep Dive').replace('cycles', 'Payout Windows').replace('overview', 'Overview')}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 w-full xl:w-auto">
          <div className="flex items-center gap-1 md:gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 scale-90 md:scale-100">
            <div className="flex flex-col px-2 md:px-3 border-r border-slate-200 dark:border-slate-700">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Std</span>
              <input type="number" value={commissionRate} onChange={e => onUpdateMasterCommissions(parseInt(e.target.value), selfCommissionRate, referralRate, activationRate)} className="w-10 md:w-12 bg-transparent text-xs font-black text-indigo-600 focus:outline-none" />
            </div>
            <div className="flex flex-col px-2 md:px-3 border-r border-slate-200 dark:border-slate-700">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Self</span>
              <input type="number" value={selfCommissionRate} onChange={e => onUpdateMasterCommissions(commissionRate, parseInt(e.target.value), referralRate, activationRate)} className="w-10 md:w-12 bg-transparent text-xs font-black text-emerald-600 focus:outline-none" />
            </div>
            <div className="flex flex-col px-2 md:px-3 border-r border-slate-200 dark:border-slate-700">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Ref</span>
              <input type="number" value={referralRate} onChange={e => onUpdateMasterCommissions(commissionRate, selfCommissionRate, parseInt(e.target.value), activationRate)} className="w-10 md:w-12 bg-transparent text-xs font-black text-rose-600 focus:outline-none" />
            </div>
            <div className="flex flex-col px-2 md:px-3">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Act</span>
              <input type="number" value={activationRate} onChange={e => onUpdateMasterCommissions(commissionRate, selfCommissionRate, referralRate, parseInt(e.target.value))} className="w-10 md:w-12 bg-transparent text-xs font-black text-amber-600 focus:outline-none" />
            </div>
          </div>
          <button onClick={onLogOnboard} className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest active:scale-95 whitespace-nowrap"><IconSparkles className="w-4 h-4" /> Log Onboard</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-4 w-full md:w-auto"><div className="w-60"><CustomSelect options={cycleOptions} value={selectedCycleId} onChange={setSelectedCycleId} /></div><div className="w-60"><CustomSelect options={[{ value: 'all', label: 'Entire Workforce' }, ...allUsers.filter(u => u.role !== 'admin').map(u => ({ value: u.id, label: u.name }))]} value={selectedAgentId} onChange={setSelectedAgentId} /></div></div>
              <button onClick={exportFilteredLedger} className="px-6 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"><IconDownload className="w-4 h-4" /> Export Analytics</button>
            </div>
            <div className="bg-slate-950 rounded-[3rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-transparent to-purple-900/20 pointer-events-none"></div>
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div><div className="flex items-center gap-3 mb-6"><div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10"><IconBot className="w-6 h-6 text-indigo-400" /></div><span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em]">Taxter Predictive Engine</span></div><h3 className="text-3xl font-black text-white mb-4 leading-tight">Cycle Earning Forecast: <span className="text-indigo-400">+{formatCurrency(Math.ceil(filteredData.all.filter(a => a.stage === AppointmentStage.PENDING).length * 0.25) * 200)}</span></h3><div className="space-y-3"><div className="flex justify-between items-end mb-1"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cycle Deadline Progress</span><span className="text-xs font-black text-indigo-400">{Math.round(cycleProgress)}% Complete</span></div><div className="h-2 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-1000" style={{ width: `${cycleProgress}%` }}></div></div></div></div>
                <div className="flex flex-col items-end gap-6"><div className="text-right"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Momentum vs Previous</p><div className="flex items-center justify-end gap-3"><span className="text-4xl font-black text-white tabular-nums">+{filteredData.onboarded.length} Wins</span><div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black flex items-center gap-2 border border-emerald-500/20 animate-in slide-in-from-right-2"><IconTrendingUp className="w-4 h-4" /> 12% GROWTH</div></div></div><div className="grid grid-cols-3 gap-4 w-full"><div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center"><p className="text-[9px] font-bold text-slate-500 uppercase">Velocity</p><p className="text-lg font-black text-white">{teamAvgVelocityInScope}d</p></div><div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center"><p className="text-[9px] font-bold text-slate-500 uppercase">Target</p><p className="text-lg font-black text-indigo-400">$2.5k</p></div><div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center"><p className="text-[9px] font-bold text-slate-500 uppercase">Accuracy</p><p className="text-lg font-black text-white">94%</p></div></div></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all"><div className="flex items-center gap-4 mb-4"><div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl transition-transform group-hover:scale-110"><IconDollarSign className="w-6 h-6" /></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue Pool</span></div><div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{formatCurrency(teamTotalEarnedInScope)}</div><p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-tighter">Gross Production Payout</p></div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all"><div className="flex items-center gap-4 mb-4"><div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl transition-transform group-hover:scale-110"><IconCheck className="w-6 h-6" /></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirmed Leads</span></div><div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{filteredData.onboarded.length} Wins</div><p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-tighter">Conversion Confirmation</p></div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all"><div className="flex items-center gap-4 mb-4"><div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-2xl transition-transform group-hover:scale-110"><IconUsers className="w-6 h-6" /></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Ratio</span></div><div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">1:{(filteredData.onboarded.length > 0 ? (filteredData.onboarded.reduce((s, a) => s + (a.referralCount || 0), 0) / filteredData.onboarded.length) : 0).toFixed(1)}</div><p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-tighter">Average Referrals Per Win</p></div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all"><div className="flex items-center gap-4 mb-4"><div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl transition-transform group-hover:scale-110"><IconZap className="w-6 h-6" /></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activations</span></div><div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{filteredData.onboarded.filter(a => a.stage === AppointmentStage.ACTIVATED).length} Ready</div><p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-tighter">Final Stage Completion</p></div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all"><div className="flex items-center gap-4 mb-4"><div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-2xl transition-transform group-hover:scale-110"><IconTimer className="w-6 h-6" /></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Speed Goal</span></div><div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{teamAvgVelocityInScope}d</div><p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-tighter">Onboard Velocity Avg</p></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center animate-in zoom-in-95 duration-500"><h3 className="text-xs font-black text-slate-900 dark:text-white mb-10 uppercase tracking-widest flex items-center gap-3"><IconChartPie className="w-5 h-5 text-indigo-500" /> Agent Market Share</h3><div className="relative w-56 h-56 mb-10"><svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full drop-shadow-xl transition-all duration-700"><circle cx="50" cy="50" r={35} fill="transparent" stroke="#f1f5f9" strokeWidth="12" className="dark:stroke-slate-800" />{marketShareData.reduce((acc, share, i) => { const total = marketShareData.reduce((s, x) => s + x.value, 0) || 1; const circum = 2 * Math.PI * 35; const length = (share.value / total) * circum; const offset = acc.offset; acc.offset -= length; acc.elements.push(<circle key={i} cx="50" cy="50" r={35} fill="transparent" stroke={share.color} strokeWidth="14" strokeDasharray={`${length} ${circum}`} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />); return acc; }, { offset: 0, elements: [] as any }).elements}</svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-black text-slate-900 dark:text-white">{marketShareData.length}</span><span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active Agents</span></div></div><div className="w-full space-y-4">{marketShareData.slice(0, 3).map(share => (<div key={share.name} className="flex justify-between items-center text-xs"><div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: share.color }}></div><span className="font-bold text-slate-700 dark:text-slate-300">{share.name}</span></div><span className="font-black text-slate-900 dark:text-white">{share.share}%</span></div>))}</div></div>
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">{agentPerformers.map(agent => (<div key={agent.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden hover:shadow-xl transition-all"><div className="flex justify-between items-start mb-6"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden border border-indigo-100 dark:border-indigo-800 shadow-sm">{agent.avatarId && agent.avatarId !== 'initial' ? <div className="w-8 h-8">{getAvatarIcon(agent.avatarId)}</div> : <span className="text-xl font-black text-indigo-600">{agent.name.charAt(0)}</span>}</div><div><h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{agent.name}</h4><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Production Share</p></div></div><div className="text-right"><span className="text-2xl font-black text-emerald-600 tabular-nums">{formatCurrency(agent.totalEarned)}</span><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Payout</p></div></div><div className="space-y-4 mb-6"><div className="space-y-1.5"><div className="flex justify-between text-[9px] font-black uppercase tracking-widest"><span>Self-Onboard mastery</span><span className="text-emerald-500 font-black">{agent.selfCount} Wins</span></div><div className="h-2 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${agent.winCount > 0 ? (agent.selfCount / agent.winCount) * 100 : 0}%` }}></div></div></div><div className="space-y-1.5"><div className="flex justify-between text-[9px] font-black uppercase tracking-widest"><span>velocity</span><span className="text-indigo-500 font-black">{agent.velocity === 'N/A' ? '0.0' : agent.velocity} Days</span></div><div className="h-2 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${Math.min(100, (parseFloat(agent.velocity === 'N/A' ? '0' : agent.velocity) / 10) * 100)}%` }}></div></div></div></div><div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-slate-800"><div className="text-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Onboard Rate</p><p className="text-lg font-black text-slate-900 dark:text-white">{agent.onboardRate}%</p></div><div className="text-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cancel Rate</p><p className="text-lg font-black text-rose-500">{agent.cancelRate}%</p></div></div></div>))}</div>
            </div>
            {synergyMatrix.length > 0 && (<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12"><div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col"><div className="px-10 py-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/30"><h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm flex items-center gap-4"><IconTimer className="w-6 h-6 text-amber-500" /> Time to Activation (Avg)</h3><IconTrendingUp className="w-4 h-4 text-emerald-500" /></div><div className="p-10 flex-1 flex flex-col justify-center">{allUsers.filter(u => u.role !== 'agent').slice(0, 4).map(u => { const stats = performanceStats?.agentStats[u.id]; return (<div key={u.id} className="mb-6"><div className="flex justify-between items-end mb-2"><span className="text-xs font-black text-slate-700 dark:text-slate-300">{u.name}</span><span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{stats?.avgDaysToActivate || '0.0'} Days</span></div><div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${Math.min(100, (parseFloat(stats?.avgDaysToActivate || '0') / 14) * 100)}%` }}></div></div></div>); })}</div></div><div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"><div className="px-10 py-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/30"><h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm flex items-center gap-4"><IconTransfer className="w-6 h-6 text-orange-500" /> Executive Synergy Matrix</h3><div className="flex items-center gap-2">{synergyMatrix.map((_, i) => (<button key={i} onClick={() => setSynergyIndex(i)} className={`w-2 h-2 rounded-full transition-all ${synergyIndex === i ? 'bg-indigo-600 w-4' : 'bg-slate-200 dark:bg-slate-700'}`} />))}</div></div><div className="p-10 relative flex items-center justify-center min-h-[300px]"><button onClick={() => setSynergyIndex(v => (v > 0 ? v - 1 : synergyMatrix.length - 1))} className="absolute left-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><IconChevronLeft className="w-8 h-8" /></button><div className="w-full max-w-lg text-center animate-in slide-in-from-right-8 duration-500" key={synergyIndex}><div className="flex flex-col items-center mb-8"><div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center text-2xl font-black shadow-sm mb-3">{synergyMatrix[synergyIndex].agentName.charAt(0)}</div><h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{synergyMatrix[synergyIndex].agentName}</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source Performance Flow</p></div><div className="space-y-6">{synergyMatrix[synergyIndex].assists.map(([ae, count]: [string, number]) => { const totalAssisted = synergyMatrix[synergyIndex].assists.reduce((s, x) => s + x[1], 0); return (<div key={ae} className="space-y-2"><div className="flex justify-between items-end"><span className="text-xs font-black text-slate-700 dark:text-slate-300">Closed by {ae}</span><span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{count} Transfers</span></div><div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner"><div className={`h-full bg-indigo-500 transition-all duration-1000`} style={{ width: `${(count / totalAssisted) * 100}%` }}></div></div></div>); })}</div></div><button onClick={() => setSynergyIndex(v => (v < synergyMatrix.length - 1 ? v + 1 : 0))} className="absolute right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><IconChevronRight className="w-8 h-8" /></button></div></div></div>)}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden mb-12"><div className="px-10 py-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/30"><h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm flex items-center gap-4"><IconCycle className="w-6 h-6 text-indigo-500" /> Team Payout History Ledger</h3><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audited cycle archives</span></div><div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start" ref={historyListRef}>{historyCycles.map(cycle => { const cycleOnboarded = appointments.filter(a => a.stage === AppointmentStage.ONBOARDED && new Date(a.onboardedAt || a.scheduledAt).getTime() >= new Date(cycle.startDate).getTime() && new Date(a.onboardedAt || a.scheduledAt).getTime() <= new Date(cycle.endDate).setHours(23, 59, 59, 999)); const total = cycleOnboarded.reduce((s, a) => s + (a.earnedAmount || 0) + ((a.referralCount || 0) * referralRate), 0); const isExpanded = openCycleIds.has(cycle.id); const isLive = new Date().getTime() <= new Date(cycle.endDate).setHours(23, 59, 59, 999); return (<div key={cycle.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border border-slate-100 dark:border-slate-700 flex flex-col transition-all duration-500 hover:border-indigo-200 hover:shadow-xl"><button onClick={(e) => toggleCycleDetails(cycle.id, e.currentTarget)} className="w-full p-8 flex items-center justify-between group"><div className="flex items-center gap-6"><div className={`w-16 h-16 rounded-[2rem] flex flex-col items-center justify-center transition-all duration-500 shadow-sm ${isExpanded ? 'bg-indigo-600 text-white rotate-6' : 'bg-white dark:bg-slate-900 text-slate-600'}`}><span className="text-2xl font-black">{cycleOnboarded.length}</span><span className="text-[8px] font-bold uppercase">Wins</span></div><div className="text-left"><p className="text-sm font-black text-slate-900 dark:text-white">{formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}</p><div className="flex items-center gap-3 mt-1"><p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Total: {formatCurrency(total)}</p>{isLive && <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 text-[8px] font-black animate-pulse">LIVE ACTIVE</span>}</div></div></div><div className={`p-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-400 transition-all duration-500 ${isExpanded ? 'rotate-180 text-indigo-600 scale-110' : 'group-hover:scale-110'}`}><IconChevronDown className="w-6 h-6" /></div></button>{isExpanded && (<div className="px-8 pb-8 animate-in slide-in-from-top-6 duration-700 overflow-hidden"><div className="bg-white dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-inner overflow-hidden mb-6"><div className="max-h-80 overflow-y-auto no-scrollbar divide-y dark:divide-slate-800">{cycleOnboarded.length > 0 ? cycleOnboarded.map(a => { const agent = allUsers.find(u => u.id === a.userId); const isTransferred = a.aeName && ACCOUNT_EXECUTIVES.includes(a.aeName); return (<button key={a.id} onClick={() => onViewAppt(a)} className="w-full text-left p-5 flex justify-between items-center text-xs group/item hover:bg-slate-50 transition-colors"><div className="flex items-center gap-4"><div className={`p-2 rounded-xl ${isTransferred ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>{isTransferred ? <IconTransfer className="w-4 h-4" /> : <IconCheck className="w-4 h-4" />}</div><div><p className="font-black text-slate-900 dark:text-white">{agent?.name} <span className="text-slate-400 font-medium">onboarded</span> {a.name}</p><div className="flex items-center gap-2 mt-1">{isTransferred && <span className="text-[8px] font-black text-indigo-500 uppercase flex items-center gap-1"><IconBriefcase className="w-2.5 h-2.5" /> Assisted by {a.aeName}</span>}{a.referralCount ? <span className="text-[8px] font-black text-rose-500 uppercase">+{formatCurrency(a.referralCount * referralRate)} Ref</span> : null}</div></div></div><span className="font-black text-emerald-600 tabular-nums">+{formatCurrency((a.earnedAmount || 0) + (a.referralCount || 0) * referralRate)}</span></button>); }) : <div className="p-12 text-center text-slate-400 italic text-sm">No onboards recorded.</div>}</div></div><button onClick={() => exportFilteredLedger()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95"><IconDownload className="w-5 h-5" /> Quick Ledger Export</button></div>)}</div>); })}</div></div>
          </div>
        )}
        {activeTab === 'deepdive' && (
          <AdminAnalytics
            members={members}
            stats={stats || { totalAppointments: 0, totalOnboarded: 0, totalPending: 0, totalFailed: 0, totalRescheduled: 0, conversionRate: '0%', aePerformance: {} }}
            appointments={appointments}
            payCycles={payCycles}
            users={allUsers}
            referralRate={referralRate}
            commissionRate={commissionRate}
            selfCommissionRate={selfCommissionRate}
            onManualReferral={onManualReferral}
            onDeleteReferral={onDeleteReferral}
          />
        )}
        {activeTab === 'referral-wins' && <ReferralWinsTab appointments={appointments} incentives={allIncentives} users={allUsers} payCycles={payCycles} referralRate={referralRate} currentUser={allUsers.find(u => u.role === 'admin')} onViewAppt={onViewAppt} />}
        {activeTab === 'cycles' && (
          <AdminCycles
            cycles={payCycles}
            onAddCycle={onAddCycle}
            onEditCycle={onEditCycle}
            onDeleteCycle={onDeleteCycle}
            commissionRate={commissionRate}
            selfCommissionRate={selfCommissionRate}
            referralRate={referralRate}
            onUpdateMasterCommissions={(std, self, ref, _syncRetroactive) => onUpdateMasterCommissions(std, self, ref, activationRate)}
            onImportReferrals={onImportReferrals}
            appointments={appointments}
            allUsers={allUsers}
            onManualReferral={onManualReferral}
            onDeleteReferral={onDeleteReferral}
          />
        )}
        {activeTab === 'auditlog' && (<div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm"><table className="w-full text-left"><thead className="bg-slate-50 dark:bg-slate-900/50"><tr><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Agent</th><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Action</th><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Details</th><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Date</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">{activityLogs.slice().reverse().map(log => (<tr key={log.id} className="hover:bg-slate-50 transition-colors"><td className="px-8 py-5 text-sm font-bold text-slate-900 dark:text-white">{log.userName}</td><td className="px-8 py-5"><span className="text-[10px] font-black px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 uppercase">{log.action}</span></td><td className="px-8 py-5 text-xs text-slate-500 font-medium">{log.details}</td><td className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">{formatDate(log.timestamp)}</td></tr>))}</tbody></table></div>)}
      </div>
    </div>
  );
};

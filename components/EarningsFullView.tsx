
import React, { useState, useMemo } from 'react';
import { EarningWindow, Appointment, AppointmentStage, AE_COLORS, User, Incentive } from '../types';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import { IconDollarSign, IconChevronDown, IconChevronUp, IconTrash, IconUser, getAvatarIcon, IconDownload, IconX, IconStack, IconSparkles, IconActivity, IconTrendingUp } from './Icons';
import { CustomSelect } from './CustomSelect';

interface EarningsFullViewProps {
  history: EarningWindow[];
  currentWindow: EarningWindow | null;
  appointments: Appointment[];
  onDismissCycle: (id: string) => void;
  userRole?: string;
  users?: User[];
  currentUserName?: string;
  incentives?: Incentive[];
  referralRate: number; // NEW
}

export const EarningsFullView: React.FC<EarningsFullViewProps> = ({
  history, currentWindow, appointments, onDismissCycle, userRole, users = [], currentUserName, incentives = [], referralRate
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [showStack, setShowStack] = useState(false);

  const filteredAppointments = useMemo(() => {
    if (selectedAgentId === 'all') return appointments;
    return appointments.filter(a => a.userId === selectedAgentId);
  }, [appointments, selectedAgentId]);

  const displayedWindows = useMemo(() => {
    let wins = currentWindow ? [currentWindow, ...history] : history;
    if (userRole === 'admin' && selectedAgentId !== 'all') {
      return wins.map(win => {
        const winAppts = filteredAppointments.filter(a => {
          const d = new Date(a.onboardedAt || a.scheduledAt).getTime();
          const start = new Date(win.startDate).getTime();
          const end = new Date(win.endDate).getTime();
          return a.stage === AppointmentStage.ONBOARDED && d >= start && d <= end;
        });
        const winIncentives = incentives.filter(i => i.appliedCycleId === win.id && (selectedAgentId === 'all' || i.userId === selectedAgentId || i.userId === 'team'));
        const productionTotal = winAppts.reduce((sum, a) => sum + (a.earnedAmount || 0) + ((a.referralCount || 0) * referralRate), 0);
        const incentiveTotal = winIncentives.reduce((sum, i) => sum + i.amountCents, 0);
        return { ...win, totalCents: productionTotal + incentiveTotal, onboardedCount: winAppts.length };
      });
    }
    return wins;
  }, [history, currentWindow, userRole, selectedAgentId, filteredAppointments, incentives, referralRate]);

  const getWindowAppointments = (window: EarningWindow) => {
    const start = new Date(window.startDate).getTime();
    const end = new Date(window.endDate).setHours(23, 59, 59, 999);
    return filteredAppointments.filter(a => {
      const d = new Date(a.onboardedAt || a.scheduledAt).getTime();
      return a.stage === AppointmentStage.ONBOARDED && d >= start && d <= end;
    });
  };

  const exportToCSV = (title: string, windows: EarningWindow[]) => {
    const headers = [
      "Capture Date",
      "Onboard Date",
      "Velocity (Days)",
      "Agent",
      "Client Name",
      "Phone",
      "Closer Attribution",
      "Onboard Type",
      "Base Payout ($)",
      "Referral Count",
      "Referral Bonus ($)",
      "Total Deal Payout ($)"
    ];
    let csvRows = [headers.join(",")];

    windows.forEach(win => {
      const winAppts = getWindowAppointments(win);
      winAppts.forEach(appt => {
        const agent = users.find(u => u.id === appt.userId);
        const agentName = agent?.name || 'Unknown';
        const isSelf = appt.aeName === agentName;

        const captureDate = new Date(appt.createdAt);
        const onboardDate = new Date(appt.onboardedAt || appt.scheduledAt);
        const velocity = Math.ceil((onboardDate.getTime() - captureDate.getTime()) / (1000 * 60 * 60 * 24));

        const basePayout = (appt.earnedAmount || 0) / 100;
        const refCount = appt.referralCount || 0;
        const refBonus = (refCount * referralRate) / 100;

        const row = [
          captureDate.toLocaleDateString(),
          onboardDate.toLocaleDateString(),
          velocity,
          `"${agentName}"`,
          `"${appt.name}"`,
          `"${appt.phone}"`,
          `"${appt.aeName || 'Self'}"`,
          isSelf ? "Self-Onboard" : "AE Transfer",
          basePayout.toFixed(2),
          refCount,
          refBonus.toFixed(2),
          (basePayout + refBonus).toFixed(2)
        ];
        csvRows.push(row.join(","));
      });
    });

    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `Community Tax_Ledger_${title}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderRow = (win: EarningWindow, idx: number) => {
    const winId = win.id || idx.toString();
    const isExpanded = expandedIds.has(winId);
    const winAppts = getWindowAppointments(win);
    const winIncentives = incentives.filter(i => i.appliedCycleId === winId && (selectedAgentId === 'all' || i.userId === selectedAgentId || i.userId === 'team'));

    return (
      <React.Fragment key={winId}>
        <tr onClick={() => { const s = new Set(expandedIds); if (s.has(winId)) s.delete(winId); else s.add(winId); setExpandedIds(s); }} className={`group cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}>
          <td className="px-4 py-4 text-slate-400">{isExpanded ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}</td>
          <td className="px-6 py-4"><div className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(win.startDate)} - {formatDate(win.endDate)}</div></td>
          <td className="px-6 py-4 hidden sm:table-cell text-xs text-slate-500">{winAppts.length} Deals Scoped</td>
          <td className="px-6 py-4 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${win.isClosed ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600 animate-pulse'}`}>{win.isClosed ? 'Closed' : 'Open'}</span></td>
          <td className="px-6 py-4 text-right"><div className="text-sm font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(win.totalCents)}</div></td>
          <td className="px-4 py-4">
            <button onClick={(e) => { e.stopPropagation(); exportToCSV(`Period_${idx}`, [win]); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"><IconDownload className="w-4 h-4" /></button>
          </td>
        </tr>
        {isExpanded && (
          <tr className="bg-slate-50/50 dark:bg-slate-900/30">
            <td colSpan={6} className="p-6">
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner">
                {winIncentives.map(inc => (
                  <div key={inc.id} className="p-4 flex justify-between border-b border-slate-50 dark:border-slate-700 bg-indigo-50/20">
                    <div className="flex items-center gap-3"><IconSparkles className="w-4 h-4 text-indigo-500" /><span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{inc.label}</span></div>
                    <span className="text-xs font-black text-indigo-600">+{formatCurrency(inc.amountCents)}</span>
                  </div>
                ))}
                {winAppts.map(appt => (
                  <div key={appt.id} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b last:border-0 border-slate-50 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${appt.aeName === users.find(u => u.id === appt.userId)?.name ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>{appt.name.charAt(0)}</div>
                      <div><div className="text-xs font-bold text-slate-900 dark:text-white">{appt.name}</div><div className="text-[9px] font-black text-slate-400 uppercase">{appt.aeName || 'Self'} • {appt.referralCount || 0} Referrals</div></div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900 dark:text-white">+{formatCurrency((appt.earnedAmount || 0) + ((appt.referralCount || 0) * referralRate))}</div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Deal Total</div>
                    </div>
                  </div>
                ))}
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3"><div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg"><IconDollarSign className="w-6 h-6" /></div>Financial Command</h2></div>
        <div className="flex gap-3">
          {userRole === 'admin' && <div className="w-48"><CustomSelect options={[{ value: 'all', label: 'Team View' }, ...users.filter(u => u.role !== 'admin').map(u => ({ value: u.id, label: u.name }))]} value={selectedAgentId} onChange={setSelectedAgentId} /></div>}
          <button onClick={() => exportToCSV("Master_Report", displayedWindows)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-xs font-black uppercase rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"><IconDownload className="w-4 h-4" /> Export Ledger</button>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
            <tr><th className="px-6 py-4 w-8"></th><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Cycle Period</th><th className="px-6 py-4 hidden sm:table-cell text-[10px] font-black uppercase text-slate-400">Activity</th><th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-400">Status</th><th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400">Earnings Pool</th><th className="px-6 py-4 w-8"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">{displayedWindows.map(renderRow)}</tbody>
        </table>
      </div>
    </div>
  );
};

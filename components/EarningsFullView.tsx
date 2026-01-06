import React, { useState, useMemo } from 'react';
import { EarningWindow, Appointment, AppointmentStage, AE_COLORS, User, Incentive } from '../types';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import { IconDollarSign, IconChevronDown, IconChevronUp, IconTrash, IconUser, getAvatarIcon, IconDownload, IconX, IconStack, IconSparkles } from './Icons';
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
}

export const EarningsFullView: React.FC<EarningsFullViewProps> = ({ 
  history, 
  currentWindow, 
  appointments,
  onDismissCycle,
  userRole,
  users = [],
  currentUserName,
  incentives = []
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
              const d = new Date(a.scheduledAt).getTime();
              const start = new Date(win.startDate).getTime();
              const end = new Date(win.endDate).getTime();
              return a.stage === AppointmentStage.ONBOARDED && d >= start && d <= end;
           });
           const winIncentives = incentives.filter(i => i.appliedCycleId === win.id && (selectedAgentId === 'all' || i.userId === selectedAgentId || i.userId === 'team'));
           const newTotal = winAppts.reduce((sum, a) => sum + (a.earnedAmount || 0), 0) + winIncentives.reduce((sum, i) => sum + i.amountCents, 0);
           return { ...win, totalCents: newTotal, onboardedCount: winAppts.length };
        });
     }
     return wins;
  }, [history, currentWindow, userRole, selectedAgentId, filteredAppointments, incentives]);

  const topWins = displayedWindows.slice(0, 10);
  const stackedWins = displayedWindows.slice(10);
  const totalLifetime = displayedWindows.reduce((sum, win) => sum + win.totalCents, 0);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedIds(newSet);
  };

  const getWindowAppointments = (window: EarningWindow) => {
    const start = new Date(window.startDate).getTime();
    const end = new Date(window.endDate).getTime();
    return filteredAppointments.filter(a => {
      const d = new Date(a.scheduledAt).getTime();
      return a.stage === AppointmentStage.ONBOARDED && d >= start && d <= end;
    });
  };

  const exportToCSV = (title: string, windows: EarningWindow[]) => {
    const headers = ["Date", "Client Name", "Phone", "Email", "Closer (AE)", "Type", "Base Payout", "Incentives", "Total"];
    let csvRows = [headers.join(",")];

    let grandTotal = 0;

    windows.forEach(win => {
      const winAppts = getWindowAppointments(win);
      const winIncentives = incentives.filter(i => i.appliedCycleId === win.id && (selectedAgentId === 'all' || i.userId === selectedAgentId || i.userId === 'team'));
      
      // Map appointments to rows
      winAppts.forEach(appt => {
        const row = [
          new Date(appt.scheduledAt).toLocaleDateString(),
          `"${appt.name.replace(/"/g, '""')}"`,
          `"${appt.phone}"`,
          `"${appt.email || ''}"`,
          `"${appt.aeName || 'Self'}"`,
          `"${appt.type || 'Appointment'}"`,
          (appt.earnedAmount || 0) / 100,
          0,
          (appt.earnedAmount || 0) / 100
        ];
        csvRows.push(row.join(","));
      });

      // Map incentives to rows
      winIncentives.forEach(inc => {
        const row = [
          new Date(inc.createdAt).toLocaleDateString(),
          `"Bonus: ${inc.label.replace(/"/g, '""')}"`,
          "-",
          "-",
          "-",
          "Incentive",
          0,
          inc.amountCents / 100,
          inc.amountCents / 100
        ];
        csvRows.push(row.join(","));
      });

      grandTotal += win.totalCents;
    });

    // Add final total row
    csvRows.push("");
    csvRows.push([,,,,"TOTAL EARNINGS",,, grandTotal / 100].join(","));

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // Create meaningful filename
    const agentName = selectedAgentId !== 'all' ? users.find(u => u.id === selectedAgentId)?.name : (userRole === 'admin' ? 'Team' : currentUserName);
    const fileName = `ChiCayo_${agentName?.replace(/\s+/g, '_')}_${title.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-CA')}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderRow = (win: EarningWindow, idx: number) => {
    const winId = win.id || idx.toString();
    const isExpanded = expandedIds.has(winId);
    const winAppts = getWindowAppointments(win);
    const names = winAppts.map(a => a.name.split(' ')[0]);
    const previewText = names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : '');

    return (
      <React.Fragment key={winId}>
          <tr onClick={() => toggleExpand(winId)} className={`group cursor-pointer transition-all ${isExpanded ? 'bg-slate-50 dark:bg-slate-700/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'}`}>
              <td className="px-4 py-4 text-slate-400">
                  {isExpanded ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
              </td>
              <td className="px-6 py-4">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(win.startDate)} - {formatDate(win.endDate)}</div>
              </td>
              <td className="px-6 py-4 hidden sm:table-cell">
                  <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2 truncate max-w-[200px]">{previewText || <span className="text-slate-400 italic text-xs">No onboarded leads</span>}</div>
              </td>
              <td className="px-6 py-4 text-center">
                  {!win.isClosed ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Active</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Closed</span>}
              </td>
              <td className="px-6 py-4 text-right">
                  <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(win.totalCents)}</div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{win.onboardedCount} Leads</div>
              </td>
              <td className="px-4 py-4">
                  {win.isClosed && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); if(confirm("Remove this cycle from your visual history? This does NOT affect total lifetime earnings.")) onDismissCycle(win.id); }}
                      className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Hide from History"
                    >
                      <IconX className="w-4 h-4" />
                    </button>
                  )}
              </td>
          </tr>
          {isExpanded && (
            <tr className="bg-slate-50/30 dark:bg-slate-900/10">
                <td colSpan={6} className="px-6 py-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in slide-in-from-top-2">
                        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payout Details</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); exportToCSV(`Cycle_${formatDate(win.startDate)}`, [win]); }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm transition-all active:scale-95"
                            >
                                <IconDownload className="w-3 h-3" /> Download CSV
                            </button>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {winAppts.length === 0 && (!win.incentives || win.incentives.length === 0) && <div className="p-8 text-center text-sm text-slate-400">Empty period</div>}
                            {win.incentives?.map(i => (
                              <div key={i.id} className="p-4 flex items-center justify-between bg-indigo-50/30 dark:bg-indigo-900/10">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center"><IconSparkles className="w-4 h-4" /></div>
                                      <div><div className="text-sm font-bold text-indigo-700 dark:text-indigo-400">{i.label}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manual Incentive</div></div>
                                  </div>
                                  <span className="text-sm font-black text-indigo-600">+{formatCurrency(i.amountCents)}</span>
                              </div>
                            ))}
                            {winAppts.map(appt => (
                              <div key={appt.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">{appt.name.charAt(0)}</div>
                                      <div><div className="text-sm font-bold">{appt.name}</div><div className="text-xs text-slate-400">{formatDate(appt.scheduledAt)}</div></div>
                                  </div>
                                  <span className="text-sm font-bold text-emerald-600">+{formatCurrency(appt.earnedAmount || 0)}</span>
                              </div>
                            ))}
                        </div>
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
        <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none"><IconDollarSign className="w-6 h-6" /></div>
              Earnings Command Center
            </h2>
            <div className="text-sm text-slate-500 mt-2 font-medium">Lifetime Production: <span className="text-emerald-600 dark:text-emerald-400 font-black">{formatCurrency(totalLifetime)}</span></div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {userRole === 'admin' && (
              <div className="w-full sm:w-56">
                <CustomSelect options={[{value: 'all', label: 'All Agents'}, ...users.filter(u => u.role !== 'admin').map(u => ({value: u.id, label: u.name}))]} value={selectedAgentId} onChange={setSelectedAgentId} placeholder="Filter Agent..." />
              </div>
            )}
            <button 
              onClick={() => exportToCSV("Master_Export", displayedWindows)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all active:scale-95"
            >
               <IconDownload className="w-4 h-4" /> Master Export
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <tr><th className="px-6 py-4 w-8"></th><th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Pay Period</th><th className="px-6 py-4 hidden sm:table-cell text-[10px] font-black text-slate-500 uppercase tracking-widest">Leads Onboarded</th><th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th><th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Payout</th><th className="px-6 py-4 w-8"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {displayedWindows.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No history logged yet.</td></tr> : topWins.map(renderRow)}
                {stackedWins.length > 0 && (
                  <>
                    <tr onClick={() => setShowStack(!showStack)} className="bg-indigo-50/50 dark:bg-indigo-900/10 cursor-pointer hover:bg-indigo-100 transition-colors">
                      <td colSpan={6} className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                          <IconStack className="w-4 h-4" /> {showStack ? 'Hide' : 'Show'} {stackedWins.length} Older Cycles
                        </div>
                      </td>
                    </tr>
                    {showStack && stackedWins.map(renderRow)}
                  </>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};
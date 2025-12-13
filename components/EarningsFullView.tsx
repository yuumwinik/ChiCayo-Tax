
import React, { useState, useMemo } from 'react';
import { EarningWindow, Appointment, AppointmentStage, AE_COLORS, User } from '../types';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import { IconDollarSign, IconChevronDown, IconChevronUp, IconTrash, IconUser, getAvatarIcon, IconDownload } from './Icons';
import { CustomSelect } from './CustomSelect';

interface EarningsFullViewProps {
  history: EarningWindow[];
  currentWindow: EarningWindow | null;
  appointments: Appointment[]; // Needed to show details
  onRemoveItem?: (id: string) => void; // Function to revert/delete an onboarded item
  userRole?: string;
  users?: User[];
}

export const EarningsFullView: React.FC<EarningsFullViewProps> = ({ 
  history, 
  currentWindow, 
  appointments,
  onRemoveItem,
  userRole,
  users = []
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');

  // If Admin filters, we need to adjust the logic. 
  // For Agents, currentWindow and history are passed in pre-filtered.
  // For Admins, history is usually the full team stats. 
  // If we filter by agent in Admin view, we must recalculate the window totals based on appointments.

  const filteredAppointments = useMemo(() => {
     if (selectedAgentId === 'all') return appointments;
     return appointments.filter(a => a.userId === selectedAgentId);
  }, [appointments, selectedAgentId]);

  const displayedWindows = useMemo(() => {
     // Start with the base history provided
     let wins = currentWindow ? [currentWindow, ...history] : history;

     // If we are filtering by a specific agent (Admin Only), we need to recalculate totals
     if (userRole === 'admin' && selectedAgentId !== 'all') {
        return wins.map(win => {
           // Find appointments for this specific window AND specific agent
           const winAppts = filteredAppointments.filter(a => {
              const d = new Date(a.scheduledAt).getTime();
              const start = new Date(win.startDate).getTime();
              const end = new Date(win.endDate).getTime();
              return a.stage === AppointmentStage.ONBOARDED && d >= start && d <= end;
           });

           const newTotal = winAppts.reduce((sum, a) => sum + (a.earnedAmount || 200), 0);
           
           return {
              ...win,
              totalCents: newTotal,
              onboardedCount: winAppts.length
           };
        });
     }
     
     // If "All" selected for admin, rely on the pre-calc history OR recalculate to be safe?
     // The passed 'history' prop for admin already sums up everything in App.tsx. 
     // We can use it directly.
     return wins;
  }, [history, currentWindow, userRole, selectedAgentId, filteredAppointments]);

  const totalLifetime = displayedWindows.reduce((sum, win) => sum + win.totalCents, 0);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  // Helper to find appointments for a specific window
  const getWindowAppointments = (window: EarningWindow) => {
    const start = new Date(window.startDate).getTime();
    const end = new Date(window.endDate).getTime();
    
    return filteredAppointments.filter(a => {
      const d = new Date(a.scheduledAt).getTime();
      return a.stage === AppointmentStage.ONBOARDED && d >= start && d <= end;
    });
  };

  const downloadCSV = (appts: Appointment[], filenamePrefix: string) => {
      // Define Columns
      const headers = ['Created At', 'Appt Date', 'Client Name', 'Phone', 'Stage', 'Commission', 'AE Name', 'Notes'];
      
      // Map Data
      const rows = appts.map(a => [
          `"${new Date(a.createdAt).toLocaleString()}"`, // Created At (Entry timestamp)
          new Date(a.scheduledAt).toLocaleDateString(), // Scheduled Date
          `"${a.name}"`, // Quote strings to handle commas
          `"${a.phone}"`,
          a.stage,
          (a.earnedAmount ? (a.earnedAmount / 100).toFixed(2) : '2.00'),
          `"${a.aeName || 'Self'}"`,
          `"${a.notes || ''}"`
      ]);
      
      // Calculate Totals for Summary Row
      const totalEarnings = appts.reduce((sum, a) => sum + (a.earnedAmount || 200), 0);
      const totalString = (totalEarnings / 100).toFixed(2);

      // Create Summary Row
      const summaryRow = ['', '', '', '', 'TOTAL EARNINGS:', totalString, '', ''];

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(',')), '', summaryRow.join(',')].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportAll = () => {
      // Export all ONBOARDED appointments currently visible (filtered)
      const allOnboarded = filteredAppointments.filter(a => a.stage === AppointmentStage.ONBOARDED);
      downloadCSV(allOnboarded, 'full_history_export');
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <IconDollarSign className="w-5 h-5" />
            </div>
            Earnings History
            </h2>
            <div className="text-sm text-slate-500 mt-1">
               Total Lifetime: <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(totalLifetime)}</span>
            </div>
        </div>

        <div className="flex gap-3 items-center">
            {userRole === 'admin' && (
                <div className="w-40">
                    <CustomSelect 
                        options={[{value: 'all', label: 'All Agents'}, ...users.filter(u => u.role !== 'admin').map(u => ({value: u.id, label: u.name}))]}
                        value={selectedAgentId}
                        onChange={setSelectedAgentId}
                        placeholder="Filter Agent..."
                    />
                </div>
            )}
            
            <button 
                onClick={handleExportAll}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                title="Export all history"
            >
                <IconDownload className="w-4 h-4" /> 
                <span className="hidden sm:inline">Export Full History</span>
                <span className="sm:hidden">Export</span>
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-8"></th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Window Period</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Clients</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {displayedWindows.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">No earnings recorded yet.</td></tr>
                ) : (
                displayedWindows.map((win, idx) => {
                    const winId = win.id || idx.toString();
                    const isExpanded = expandedIds.has(winId);
                    const winAppts = getWindowAppointments(win);
                    
                    // Generate Preview Names
                    const names = winAppts.map(a => a.name.split(' ')[0]);
                    const previewText = names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : '');

                    return (
                    <React.Fragment key={winId}>
                        {/* MAIN ROW */}
                        <tr 
                            onClick={() => toggleExpand(winId)}
                            className={`cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50 dark:bg-slate-700/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'}`}
                        >
                            <td className="px-4 py-4 text-slate-400">
                                {isExpanded ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-slate-900 dark:text-white">
                                {formatDate(win.startDate)}
                                </div>
                                <div className="text-xs text-slate-500">
                                to {formatDate(win.endDate)}
                                </div>
                            </td>
                            <td className="px-6 py-4 hidden sm:table-cell">
                                <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                   {previewText && <IconUser className="w-3 h-3 text-slate-400" />}
                                   {previewText || <span className="text-slate-400 italic">None</span>}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                {win.isClosed ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                    Closed
                                </span>
                                ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                    Active
                                </span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(win.totalCents)}
                                </div>
                                <div className="text-[10px] text-slate-400">{win.onboardedCount} deals</div>
                            </td>
                        </tr>

                        {/* EXPANDED DETAILS */}
                        {isExpanded && (
                            <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                                <td colSpan={5} className="px-4 sm:px-10 py-4">
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                Detailed Breakdown
                                            </span>
                                            {winAppts.length > 0 && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); downloadCSV(winAppts, `cycle_${win.startDate.split('T')[0]}`); }}
                                                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors bg-white dark:bg-slate-800 px-2 py-1 rounded-md shadow-sm border border-slate-200 dark:border-slate-700"
                                                >
                                                    <IconDownload className="w-3 h-3" /> Export CSV
                                                </button>
                                            )}
                                        </div>
                                        {winAppts.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-slate-500">No details available.</div>
                                        ) : (
                                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {winAppts.map(appt => {
                                                    const agent = users.find(u => u.id === appt.userId);
                                                    
                                                    return (
                                                    <div key={appt.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                                        <div className="flex items-center gap-3">
                                                            {/* Client Initial */}
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                                                                {appt.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-sm font-medium text-slate-900 dark:text-white">{appt.name}</div>
                                                                    {appt.aeName && (
                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${AE_COLORS[appt.aeName] || 'bg-slate-100 text-slate-500'}`}>
                                                                            {appt.aeName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* ADMIN: Show Agent Owner */}
                                                                {userRole === 'admin' && agent && (
                                                                    <div className="flex items-center gap-1.5 mt-1">
                                                                        <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[8px] font-bold overflow-hidden">
                                                                            {agent.avatarId && agent.avatarId !== 'initial' ? (
                                                                                <div className="w-2.5 h-2.5">{getAvatarIcon(agent.avatarId)}</div>
                                                                            ) : (
                                                                                agent.name.charAt(0)
                                                                            )}
                                                                        </div>
                                                                        <span className="text-xs text-slate-500">Agent: {agent.name}</span>
                                                                    </div>
                                                                )}
                                                                
                                                                <div className="text-xs text-slate-400 mt-0.5">Onboarded: {formatDate(appt.scheduledAt)}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                                {appt.earnedAmount ? formatCurrency(appt.earnedAmount) : '+$2.00'}
                                                            </span>
                                                            
                                                            {/* User Action: Remove Mistake */}
                                                            {userRole !== 'admin' && onRemoveItem && (
                                                                <button 
                                                                    onClick={() => {
                                                                        if(window.confirm(`Remove ${appt.name} from earnings? This will deduct the commission.`)) {
                                                                            onRemoveItem(appt.id);
                                                                        }
                                                                    }}
                                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                                                    title="Remove (Correction)"
                                                                >
                                                                    <IconTrash className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                    );
                })
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

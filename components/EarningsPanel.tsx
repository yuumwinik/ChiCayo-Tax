
import React from 'react';
import { EarningWindow } from '../types';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import { IconDollarSign, IconUsers, IconWallet, IconClock, IconLogo, IconSparkles } from './Icons';

interface EarningsPanelProps {
  currentWindow: EarningWindow | null;
  history: EarningWindow[];
  isOpen: boolean;
  onClose: () => void;
  onViewAll: () => void;
  title?: string;
  isTeamView?: boolean;
  teamEarnings?: number;
  teamCurrentPool?: number; // Total for running cycle
  activeCycleLabel?: string;
  lifetimeEarnings?: number; 
}

export const EarningsPanel: React.FC<EarningsPanelProps> = ({ 
  currentWindow, 
  history, 
  isOpen, 
  onClose, 
  onViewAll,
  title,
  isTeamView,
  teamEarnings = 0,
  teamCurrentPool = 0,
  activeCycleLabel,
  lifetimeEarnings = 0
}) => {

  const calculateProgress = (window: EarningWindow) => {
      const start = new Date(window.startDate).getTime();
      const end = new Date(window.endDate).getTime();
      const now = new Date().getTime();
      
      if (now < start) return 0;
      if (now > end) return 100;
      return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  };

  return (
    <div 
      className={`fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200 dark:border-slate-800 shadow-2xl transform transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isTeamView ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
               {isTeamView ? <IconUsers className="w-5 h-5" /> : <IconDollarSign className="w-5 h-5" />}
            </div>
            {title || (isTeamView ? 'Team Financials' : 'My Wallet')}
          </h2>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar flex flex-col bg-slate-50/50 dark:bg-slate-950/50">
          
          {/* --- TOP SECTION: LIFETIME EARNINGS CARD --- */}
          <section className="animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="w-full aspect-[1.586] rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-800 dark:from-violet-800 dark:via-indigo-800 dark:to-slate-900 p-6 relative overflow-hidden shadow-2xl shadow-indigo-200/50 dark:shadow-none group transition-transform hover:scale-[1.02]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-10 -translate-y-10 group-hover:translate-x-8 transition-transform duration-700"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl transform -translate-x-10 translate-y-10"></div>
                <div className="relative z-10 flex flex-col justify-between h-full text-white">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 opacity-90">
                         <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                            <IconLogo className="w-5 h-5 text-white" />
                         </div>
                         <span className="font-bold tracking-wide text-sm">ChiCayo Card</span>
                      </div>
                      <div className="text-[10px] font-mono opacity-60 tracking-widest uppercase">
                         Lifetime Access
                      </div>
                   </div>
                   <div className="my-auto">
                      <div className="text-xs text-indigo-200 font-medium uppercase tracking-wider mb-1 opacity-80">{isTeamView ? 'Total Team Output' : 'Total Lifetime Earnings'}</div>
                      <div className="text-4xl font-bold tracking-tight text-white drop-shadow-sm">
                         {formatCurrency(isTeamView ? teamEarnings : lifetimeEarnings)}
                      </div>
                   </div>
                   <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                         <span className="text-[10px] text-indigo-200 uppercase tracking-widest mb-0.5">Card Holder</span>
                         <span className="font-medium tracking-wide text-sm">{isTeamView ? 'TEAM ADMIN' : 'AUTHORIZED AGENT'}</span>
                      </div>
                      <div className="w-10 h-8 rounded bg-gradient-to-br from-yellow-200 to-yellow-500 opacity-80 shadow-inner border border-yellow-600/30 flex items-center justify-center">
                         <div className="w-full h-[1px] bg-black/10 my-0.5"></div>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          {/* --- ADMIN LIVE POOL SECTION --- */}
          {isTeamView && (
             <section className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                   <IconSparkles className="w-3 h-3 text-emerald-500" /> Active Cycle Pool
                </h3>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-l-4 border-emerald-500 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-1">
                        <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{formatCurrency(teamCurrentPool)}</div>
                        <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg uppercase tracking-tighter animate-pulse">Running Total</div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Real-time team revenue for current window.</p>
                </div>
             </section>
          )}

          {/* --- MIDDLE SECTION: CURRENT ACTIVE CYCLE (AGENT) --- */}
          {!isTeamView && (
             <section className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                   <IconClock className="w-3 h-3" /> Current Cycle Status
                </h3>
                {currentWindow ? (
                   <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                      <div className="flex justify-between items-center mb-4">
                         <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(currentWindow.totalCents)}</div>
                            <div className="text-xs text-slate-500 font-medium">Earned this cycle</div>
                         </div>
                         <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100 dark:border-indigo-800">
                            {currentWindow.onboardedCount} Deals
                         </div>
                      </div>
                      <div className="space-y-2">
                         <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${calculateProgress(currentWindow)}%` }}>
                               <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"></div>
                            </div>
                         </div>
                         <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            <span>Start: {formatDate(currentWindow.startDate)}</span>
                            <span>End: {formatDate(currentWindow.endDate)}</span>
                         </div>
                      </div>
                   </div>
                ) : (
                   <div className="p-5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center">
                      <p className="text-slate-500 text-sm font-medium">No active cycle found.</p>
                   </div>
                )}
             </section>
          )}

          {/* --- BOTTOM SECTION: RECENT HISTORY --- */}
          {history.length > 0 && (
            <section className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              <div className="flex justify-between items-center mb-3 px-1">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent History</h3>
                 <button onClick={onViewAll} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">See All</button>
              </div>
              <div className="space-y-3">
                  {history.slice(0, 3).map((win) => (
                    <div key={win.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-0.5">{formatDate(win.endDate)}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">{win.onboardedCount} clients onboarded</div>
                      </div>
                      <div className="text-right">
                         <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(win.totalCents)}</div>
                         <div className="text-[9px] text-slate-400 uppercase font-bold bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded mt-1 inline-block">Closed</div>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
};

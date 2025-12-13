
import React from 'react';
import { EarningWindow } from '../types';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import { IconDollarSign, IconUsers } from './Icons';

interface EarningsPanelProps {
  currentWindow: EarningWindow | null;
  history: EarningWindow[];
  isOpen: boolean;
  onClose: () => void;
  onViewAll: () => void;
  title?: string;
  isTeamView?: boolean;
  teamEarnings?: number;
  activeCycleLabel?: string;
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
  activeCycleLabel
}) => {
  return (
    <div 
      className={`fixed inset-y-0 right-0 z-40 w-full sm:w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200 dark:border-slate-800 shadow-2xl transform transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isTeamView ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
               {isTeamView ? <IconUsers className="w-5 h-5" /> : <IconDollarSign className="w-5 h-5" />}
            </div>
            {title || (isTeamView ? 'Team Stats' : 'Earnings')}
          </h2>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {/* TEAM VIEW */}
          {isTeamView ? (
             <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Active Pay Cycle</h3>
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                  <div className="text-indigo-100 text-sm mb-1 font-medium">Total Team Earned</div>
                  <div className="text-4xl font-bold mb-4">{formatCurrency(teamEarnings)}</div>
                  
                  <div className="pt-4 border-t border-white/20">
                     <div className="text-indigo-200 text-xs mb-1">Cycle Period</div>
                     <div className="text-sm font-medium">{activeCycleLabel}</div>
                  </div>
                </div>
                
                <div className="mt-8 text-center text-sm text-slate-500">
                   View the Admin Dashboard for full analytics breakdown.
                </div>
             </section>
          ) : (
            // INDIVIDUAL AGENT VIEW
            <>
              {/* Current Window */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Current Window</h3>
                {currentWindow ? (
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                    <div className="text-indigo-100 text-sm mb-1 font-medium">Total Earned</div>
                    <div className="text-4xl font-bold mb-4">{formatCurrency(currentWindow.totalCents)}</div>
                    
                    <div className="flex justify-between items-end">
                       <div>
                         <div className="text-indigo-100 text-xs mb-1">Onboarded</div>
                         <div className="text-xl font-semibold">{currentWindow.onboardedCount}</div>
                       </div>
                       <div className="text-right">
                          <div className="text-indigo-200 text-[10px]">Ends</div>
                          <div className="text-sm font-medium">{formatDate(currentWindow.endDate)}</div>
                       </div>
                    </div>
                    {/* Progress bar simulation */}
                    <div className="mt-4 h-1.5 bg-black/20 rounded-full overflow-hidden">
                       <div className="h-full bg-white/40 w-1/2"></div> {/* Mock progress */}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center">
                    <p className="text-slate-500 text-sm">No active earnings window.</p>
                    <p className="text-slate-400 text-xs mt-1">Start onboarding to earn!</p>
                  </div>
                )}
              </section>

              {/* History */}
              {history.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Recent History</h3>
                  <div className="space-y-3">
                      {history.slice(0, 3).map((win) => (
                        <div key={win.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex justify-between items-center border border-slate-100 dark:border-slate-700/50">
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                               {formatDate(win.startDate)}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{win.onboardedCount} onboarded</div>
                          </div>
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {formatCurrency(win.totalCents)}
                          </div>
                        </div>
                      ))}
                  </div>
                  <button 
                    onClick={onViewAll}
                    className="w-full mt-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                  >
                    View Full History
                  </button>
                </section>
              )}
            </>
          )}
        </div>
        
        {!isTeamView && (
           <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-400">Next reset in approx 5 days</p>
           </div>
        )}
      </div>
    </div>
  );
};

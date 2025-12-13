
import React, { useState, useEffect } from 'react';
import { PayCycle } from '../../types';
import { formatDate, formatCurrency } from '../../utils/dateUtils';
import { IconPlus, IconCycle, IconTrash, IconDollarSign, IconChevronUp, IconChevronDown, IconEdit, IconCheck, IconX } from '../Icons';
import { CustomDatePicker } from '../CustomDatePicker';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';

interface AdminCyclesProps {
  cycles: PayCycle[];
  onAddCycle: (startDate: string, endDate: string) => void;
  onEditCycle: (id: string, startDate: string, endDate: string) => void;
  onDeleteCycle: (id: string) => void;
  commissionRate?: number;
  onUpdateCommission?: (rate: number) => void;
}

export const AdminCycles: React.FC<AdminCyclesProps> = ({ 
  cycles, 
  onAddCycle, 
  onEditCycle,
  onDeleteCycle,
  commissionRate = 200,
  onUpdateCommission
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  // Commission Edit State
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState((commissionRate / 100).toFixed(2));

  // Cycle Modal States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const handleCreate = () => {
    setError('');
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      setError('End date must be after start date.');
      return;
    }

    onAddCycle(start.toISOString(), end.toISOString());
    setStartDate('');
    setEndDate('');
  };

  const handleUpdate = () => {
      if (editId && editStart && editEnd) {
          const start = new Date(editStart);
          const end = new Date(editEnd);
          if (end <= start) {
              alert("End date must be after start date.");
              return;
          }
          onEditCycle(editId, start.toISOString(), end.toISOString());
          setEditId(null);
      }
  };

  const handleSaveRate = () => {
     if (onUpdateCommission) {
        const cents = Math.round(parseFloat(tempRate) * 100);
        onUpdateCommission(cents);
        setIsEditingRate(false);
     }
  };

  const adjustRate = (delta: number) => {
    const current = parseFloat(tempRate) || 0;
    const next = Math.max(0, current + delta);
    setTempRate(next.toFixed(2));
  };

  // Helper to determine status dynamically based on current time
  const getSmartStatus = (startStr: string, endStr: string) => {
      const now = new Date().getTime();
      const start = new Date(startStr).getTime();
      const end = new Date(endStr).setHours(23, 59, 59, 999); // End of day

      if (now < start) return 'upcoming';
      if (now > end) return 'completed';
      return 'active';
  };

  const getProgress = (startStr: string, endStr: string) => {
      const now = new Date().getTime();
      const start = new Date(startStr).getTime();
      const end = new Date(endStr).setHours(23, 59, 59, 999);

      if (now < start) return 0;
      if (now > end) return 100;

      const totalDuration = end - start;
      const elapsed = now - start;
      return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal 
         isOpen={!!deleteId}
         onClose={() => setDeleteId(null)}
         onConfirm={() => { if (deleteId) onDeleteCycle(deleteId); }}
         title="Delete Pay Cycle?"
         message="Are you sure you want to remove this pay cycle? This will affect historical earnings calculations for all agents. This action cannot be undone."
      />

      {/* Edit Modal (Inline Overlay style) */}
      {editId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Cycle Dates</h3>
                      <button onClick={() => setEditId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                          <IconX className="w-5 h-5 text-slate-500" />
                      </button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                          <CustomDatePicker value={editStart} onChange={setEditStart} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                          <CustomDatePicker value={editEnd} onChange={setEditEnd} />
                      </div>
                      
                      <div className="flex gap-3 pt-2">
                          <button onClick={() => setEditId(null)} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors">
                              Cancel
                          </button>
                          <button onClick={handleUpdate} className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200/50 dark:shadow-none transition-transform active:scale-95">
                              Save Changes
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-indigo-600 text-white rounded-2xl p-6 shadow-lg shadow-indigo-200 dark:shadow-none">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">Master Pay Cycle Tool</h2>
            <p className="text-indigo-100 text-sm max-w-lg">
              Manage automated pay cycles. Only one cycle is active at a time based on the current date.
            </p>
          </div>
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
            <IconCycle className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COMMISSION SETTINGS CARD */}
        <div className="lg:col-span-1">
           <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm h-full">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                 <IconDollarSign className="w-4 h-4" /> Commission Settings
              </h3>
              
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-center">
                 <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider mb-2">Current Global Rate</p>
                 
                 {isEditingRate ? (
                    <div className="flex items-center justify-center gap-2 mb-2 animate-in fade-in zoom-in duration-200">
                       <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 shadow-sm">
                          <span className="text-2xl font-bold text-slate-400 dark:text-slate-500 mr-1">$</span>
                          <input 
                            type="number"
                            step="0.50"
                            min="0"
                            value={tempRate}
                            onChange={(e) => setTempRate(e.target.value)}
                            className="w-20 text-3xl font-bold bg-transparent border-none text-slate-800 dark:text-white text-center focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            autoFocus
                          />
                          <div className="flex flex-col border-l border-slate-200 dark:border-slate-700 ml-2 pl-2 gap-1">
                            <button 
                              onClick={() => adjustRate(0.5)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            >
                              <IconChevronUp className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => adjustRate(-0.5)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            >
                              <IconChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div 
                      onClick={() => { setIsEditingRate(true); setTempRate((commissionRate / 100).toFixed(2)); }}
                      className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2 cursor-pointer hover:scale-105 transition-transform"
                    >
                       {formatCurrency(commissionRate)}
                    </div>
                 )}

                 <p className="text-xs text-slate-500 mb-4">Per onboarded appointment</p>

                 {isEditingRate ? (
                    <div className="flex gap-2">
                       <button 
                         onClick={() => setIsEditingRate(false)}
                         className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                       >
                         Cancel
                       </button>
                       <button 
                         onClick={handleSaveRate}
                         className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                       >
                         Apply New Rate
                       </button>
                    </div>
                 ) : (
                    <button 
                       onClick={() => { setIsEditingRate(true); setTempRate((commissionRate / 100).toFixed(2)); }}
                       className="w-full py-2 text-xs font-semibold text-emerald-600 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/50 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                       Change Rate
                    </button>
                 )}
              </div>
           </div>
        </div>

        {/* CYCLE CREATOR & LIST */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Creator */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <IconPlus className="w-4 h-4" /> Schedule New Cycle
            </h3>
            
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                    <CustomDatePicker 
                      value={startDate}
                      onChange={setStartDate}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                    <CustomDatePicker 
                      value={endDate}
                      onChange={setEndDate}
                    />
                </div>
                </div>
                
                {error && (
                <p className="text-xs text-rose-500 font-medium">{error}</p>
                )}

                <button 
                onClick={handleCreate}
                disabled={cycles.length >= 3}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                {cycles.length >= 3 ? 'Max Cycles Reached (3)' : 'Set Cycle'}
                </button>
            </div>
            </div>

            {/* List */}
            <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white px-1">Scheduled Cycles</h3>
            {cycles.length === 0 ? (
                <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 text-sm">No cycles scheduled.</p>
                </div>
            ) : (
                cycles.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map((cycle, idx) => {
                    const status = getSmartStatus(cycle.startDate, cycle.endDate);
                    const progress = getProgress(cycle.startDate, cycle.endDate);
                    
                    return (
                        <div key={cycle.id} className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border transition-all ${status === 'active' ? 'border-indigo-200 dark:border-indigo-900 ring-2 ring-indigo-50 dark:ring-indigo-900/30' : 'border-slate-200 dark:border-slate-700 opacity-90'}`}>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm
                                            ${status === 'active' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}
                                        `}>
                                            {status === 'active' ? <IconCycle className="w-5 h-5 animate-spin-slow" /> : (cycles.length - idx)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide
                                                    ${status === 'active' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 
                                                      status === 'upcoming' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 
                                                      'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}
                                                `}>
                                                    {status}
                                                </span>
                                                {status === 'active' && (
                                                    <span className="text-xs text-slate-500">{Math.round(progress)}% Complete</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => { 
                                                setEditId(cycle.id); 
                                                // Convert ISO to YYYY-MM-DD for date picker
                                                setEditStart(new Date(cycle.startDate).toLocaleDateString('en-CA'));
                                                setEditEnd(new Date(cycle.endDate).toLocaleDateString('en-CA'));
                                            }}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                            title="Edit Dates"
                                        >
                                            <IconEdit className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => setDeleteId(cycle.id)}
                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                            title="Delete Cycle"
                                        >
                                            <IconTrash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* ACTIVE CYCLE PROGRESS BAR */}
                                {status === 'active' && (
                                    <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div 
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
                                            style={{ width: `${progress}%` }}
                                        >
                                            {/* Striped Animation */}
                                            <div className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
            </div>
        </div>
      </div>
    </div>
  );
};

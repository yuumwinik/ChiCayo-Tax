
import React, { useState, useEffect } from 'react';
import { PayCycle } from '../../types';
import { formatDate, formatCurrency } from '../../utils/dateUtils';
import { IconPlus, IconCycle, IconTrash, IconDollarSign, IconChevronUp, IconChevronDown, IconEdit, IconCheck, IconX, IconClock, IconSparkles, IconLock } from '../Icons';
import { CustomDatePicker } from '../CustomDatePicker';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';

interface AdminCyclesProps {
  cycles: PayCycle[];
  onAddCycle: (startDate: string, endDate: string) => void;
  onEditCycle: (id: string, startDate: string, endDate: string) => void;
  onDeleteCycle: (id: string) => void;
  commissionRate?: number;
  selfCommissionRate?: number;
  onUpdateMasterCommissions: (std: number, self: number, syncRetroactive: boolean) => void;
}

export const AdminCycles: React.FC<AdminCyclesProps> = ({ 
  cycles, 
  onAddCycle, 
  onEditCycle,
  onDeleteCycle,
  commissionRate = 200,
  selfCommissionRate = 300, // Fixed: Default to $3
  onUpdateMasterCommissions
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const [isLocked, setIsLocked] = useState(true);
  const [tempStd, setTempStd] = useState((commissionRate / 100).toString());
  const [tempSelf, setTempSelf] = useState((selfCommissionRate / 100).toString());
  const [syncRetroactive, setSyncRetroactive] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  // Critical: Force temp state to sync with incoming DB values
  useEffect(() => {
    if (isLocked) {
      setTempStd((commissionRate / 100).toString());
      setTempSelf((selfCommissionRate / 100).toString());
    }
  }, [commissionRate, selfCommissionRate, isLocked]);

  const getSmartStatus = (startStr: string, endStr: string) => {
      const now = new Date().getTime();
      const start = new Date(startStr).getTime();
      const end = new Date(endStr).setHours(23, 59, 59, 999);
      if (now < start) return 'upcoming';
      if (now > end) return 'completed';
      return 'active';
  };

  const activeCycles = cycles.filter(c => getSmartStatus(c.startDate, c.endDate) === 'active');
  const upcomingCycles = cycles.filter(c => getSmartStatus(c.startDate, c.endDate) === 'upcoming');
  const endedCycles = cycles.filter(c => getSmartStatus(c.startDate, c.endDate) === 'completed');

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

  const handleApplySync = () => {
      onUpdateMasterCommissions(
          Math.round(parseFloat(tempStd) * 100), 
          Math.round(parseFloat(tempSelf) * 100),
          syncRetroactive
      );
      setIsLocked(true);
  };

  const getProgress = (startStr: string, endStr: string) => {
      const now = new Date().getTime();
      const start = new Date(startStr).getTime();
      const end = new Date(endStr).setHours(23, 59, 59, 999);
      if (now < start) return 0;
      if (now > end) return 100;
      return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  };

  const renderCycleCard = (cycle: PayCycle) => {
      const status = getSmartStatus(cycle.startDate, cycle.endDate);
      const progress = getProgress(cycle.startDate, cycle.endDate);
      const isHistorical = status === 'completed';

      return (
        <div key={cycle.id} className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border transition-all ${status === 'active' ? 'border-indigo-200 dark:border-indigo-900 ring-2 ring-indigo-50 dark:ring-indigo-900/30 shadow-md' : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm
                            ${status === 'active' ? 'bg-indigo-600 text-white' : status === 'upcoming' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}
                        `}>
                            {status === 'active' ? <IconCycle className="w-5 h-5 animate-spin-slow" /> : status === 'upcoming' ? <IconClock className="w-5 h-5" /> : <IconCheck className="w-5 h-5" />}
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
                                {status === 'active' && <span className="text-xs text-slate-500 font-medium">{Math.round(progress)}% Complete</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        {!isHistorical && (
                            <button 
                                onClick={() => { 
                                    setEditId(cycle.id); 
                                    setEditStart(new Date(cycle.startDate).toLocaleDateString('en-CA'));
                                    setEditEnd(new Date(cycle.endDate).toLocaleDateString('en-CA'));
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                title="Edit Dates"
                            >
                                <IconEdit className="w-4 h-4" />
                            </button>
                        )}
                        <button 
                            onClick={() => setDeleteId(cycle.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            title="Delete Cycle"
                        >
                            <IconTrash className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                {status === 'active' && (
                    <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                    </div>
                )}
            </div>
        </div>
      );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <DeleteConfirmationModal 
         isOpen={!!deleteId}
         onClose={() => setDeleteId(null)}
         onConfirm={() => { if (deleteId) onDeleteCycle(deleteId); }}
         title="Delete Pay Cycle?"
         message="Permanently remove this cycle? Note: Historical production data remains, but it will be detached from this specific window."
      />

      {editId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Cycle Dates</h3>
                      <button onClick={() => setEditId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><IconX className="w-5 h-5 text-slate-500" /></button>
                  </div>
                  <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label><CustomDatePicker value={editStart} onChange={setEditStart} /></div>
                      <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label><CustomDatePicker value={editEnd} onChange={setEditEnd} /></div>
                      <div className="flex gap-3 pt-4">
                          <button onClick={() => setEditId(null)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-2xl">Cancel</button>
                          <button onClick={handleUpdate} className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-transform active:scale-95">Save Changes</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className={`bg-white dark:bg-slate-800 p-8 rounded-[3rem] border-2 transition-all duration-500 shadow-xl relative overflow-hidden group ${isLocked ? 'border-indigo-50 dark:border-indigo-900/20' : 'border-indigo-500 ring-4 ring-indigo-500/10'}`}>
          <div className={`absolute inset-0 bg-indigo-600/5 transition-opacity duration-500 ${isLocked ? 'opacity-0' : 'opacity-100'}`}></div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
              <div className="flex items-center gap-5">
                  <button onClick={() => setIsLocked(!isLocked)} className={`p-5 rounded-[2rem] transition-all duration-500 shadow-xl ${isLocked ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white rotate-12 scale-110'}`}>
                      {isLocked ? <IconLock className="w-10 h-10" /> : <IconSparkles className="w-10 h-10" />}
                  </button>
                  <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none mb-2">Master Commission Rules</h3>
                      <p className="text-xs text-slate-500 font-medium">Locked rates prevent accidental payroll shifts. Unlock to edit.</p>
                  </div>
              </div>
              <div className="flex gap-6 items-center flex-wrap justify-center">
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Standard Transfer ($)</label>
                      <input disabled={isLocked} value={tempStd} onChange={e => setTempStd(e.target.value)} type="number" className="w-28 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-black text-center text-xl focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                  </div>
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Self-Onboard ($)</label>
                      <input disabled={isLocked} value={tempSelf} onChange={e => setTempSelf(e.target.value)} type="number" className="w-28 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-black text-center text-xl focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                  </div>
                  
                  {!isLocked && (
                      <div className="flex flex-col gap-2 items-center">
                         <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                             <span className="text-[10px] font-black uppercase text-slate-500">Sync Current Cycle?</span>
                             <button onClick={() => setSyncRetroactive(!syncRetroactive)} className={`relative w-10 h-5 rounded-full transition-colors ${syncRetroactive ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${syncRetroactive ? 'translate-x-5' : 'translate-x-0'}`} />
                             </button>
                             <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{syncRetroactive ? 'YES' : 'NO'}</span>
                         </div>
                         <button onClick={handleApplySync} className="w-full px-8 py-3.5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-xl animate-pulse text-sm">SYNC & LOCK</button>
                      </div>
                  )}
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
             <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><IconPlus className="w-5 h-5 text-indigo-600" /> Schedule Payout Cycle</h3>
             <div className="space-y-4">
                <div><label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Start Date</label><CustomDatePicker value={startDate} onChange={setStartDate} /></div>
                <div><label className="text-xs font-bold text-slate-400 uppercase mb-2 block">End Date</label><CustomDatePicker value={endDate} onChange={setEndDate} /></div>
                {error && <p className="text-xs text-rose-500 font-medium mt-2">{error}</p>}
                <button onClick={handleCreate} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-transform active:scale-95 mt-4">Create Window</button>
             </div>
           </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center px-2">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><IconCycle className="w-5 h-5 text-indigo-500" /> Active & Upcoming Windows</h3>
                <button onClick={() => setShowHistory(!showHistory)} className="text-xs font-bold text-indigo-600 hover:underline">{showHistory ? 'Hide Closed' : 'Show Cycle History'}</button>
            </div>
            
            <div className="space-y-4">
                {activeCycles.map(renderCycleCard)}
                {upcomingCycles.map(renderCycleCard)}
                {activeCycles.length === 0 && upcomingCycles.length === 0 && (
                    <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-slate-500 text-sm font-medium">No windows scheduled.</p>
                    </div>
                )}
            </div>

            {showHistory && endedCycles.length > 0 && (
                <div className="space-y-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-slate-500 text-[10px] uppercase tracking-[0.2em] px-2">Historical Records</h3>
                    {endedCycles.sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()).map(renderCycleCard)}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

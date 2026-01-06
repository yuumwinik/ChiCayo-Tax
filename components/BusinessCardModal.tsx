
import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, AppointmentStage, STAGE_LABELS, STAGE_COLORS, AE_COLORS } from '../types';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import { 
  IconX, IconPhone, IconMail, IconCopy, IconCheck, IconEdit, IconTrash, 
  IconCalendar, IconNotes, IconTrophy, IconBriefcase, IconTransfer, 
  IconClock, IconChevronLeft, IconChevronRight, IconSparkles, IconTrendingUp, IconActivity
} from './Icons';
import { ProtocolModal } from './ProtocolModal';

interface BusinessCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onEdit: (appt: Appointment, isRescheduleAction?: boolean) => void;
  onDelete: (id: string) => void;
  onMoveStage: (id: string, stage: AppointmentStage) => void;
  onSaveNotes: (id: string, notes: string) => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export const BusinessCardModal: React.FC<BusinessCardModalProps> = ({
  isOpen, onClose, appointment, onEdit, onDelete, onMoveStage, onSaveNotes,
  onNext, onPrev, hasNext, hasPrev
}) => {
  const [notes, setNotes] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedName, setCopiedName] = useState(false);

  useEffect(() => {
    if (appointment) setNotes(appointment.notes || '');
  }, [appointment]);

  const urgency = useMemo(() => {
    if (!appointment) return null;
    if (appointment.stage !== AppointmentStage.PENDING && appointment.stage !== AppointmentStage.RESCHEDULED) return null;
    
    const now = new Date().getTime();
    const scheduled = new Date(appointment.scheduledAt).getTime();
    const diffHours = (scheduled - now) / (1000 * 60 * 60);
    const horizonHours = 168; // 1 week
    
    let percent = 0;
    if (diffHours < 0) percent = 100;
    else if (diffHours > horizonHours) percent = 5; 
    else percent = Math.max(5, Math.min(100, 100 - (diffHours / horizonHours * 100)));
    
    let colorClass = 'bg-rose-500'; 
    let label = "Upcoming Soon";
    if (percent > 90) { colorClass = 'bg-emerald-500'; label = "Due Now"; }
    else if (percent > 60) { colorClass = 'bg-lime-400'; label = "Priority"; }
    else if (percent > 30) { colorClass = 'bg-amber-400'; label = "Scheduled"; }
    else { colorClass = 'bg-blue-400'; label = "Future Date"; }

    return { colorClass, percent, label, diffHours };
  }, [appointment]);

  if (!isOpen || !appointment) return null;

  const copyToClipboard = (text: string, type: 'phone' | 'email' | 'name') => {
    navigator.clipboard.writeText(text);
    if (type === 'phone') {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } else if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedName(true);
      setTimeout(() => setCopiedName(false), 2000);
    }
  };

  const handleNotesBlur = () => {
    if (appointment && notes !== appointment.notes) {
      onSaveNotes(appointment.id, notes);
    }
  };

  const isOnboarded = appointment.stage === AppointmentStage.ONBOARDED;
  const isTransferQueue = appointment.stage === AppointmentStage.TRANSFERRED;

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      
      <div className="relative bg-white dark:bg-slate-900 w-full h-[90vh] md:h-auto md:max-h-[85vh] md:max-w-4xl overflow-hidden flex flex-col md:flex-row border-0 md:border border-white/20 md:rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* Navigation - Logic & UI integrated into profile area */}
        <button onClick={onClose} className="absolute top-5 right-5 z-40 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-full transition-colors border border-slate-100 dark:border-slate-700 shadow-sm"><IconX className="w-5 h-5" /></button>
        
        {/* LEFT: IDENTITY & STATUS */}
        <div className={`w-full md:w-5/12 p-8 flex flex-col items-center text-center bg-slate-50 dark:bg-slate-800/30 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 relative transition-colors duration-500 ${isOnboarded ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}>
            
            {/* Profile Avatar with Integrated Navigation */}
            <div className="relative mb-6 flex items-center gap-4 group/nav">
                
                {/* Left Arrow Button */}
                <button 
                  disabled={!hasPrev}
                  onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
                  className={`p-2 rounded-full transition-all duration-300 ${hasPrev ? 'opacity-30 hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400' : 'opacity-0 pointer-events-none'}`}
                >
                   <IconChevronLeft className="w-6 h-6" />
                </button>

                <div className="relative">
                    <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center text-4xl font-black border-4 border-white dark:border-slate-800 shadow-2xl relative z-10 transition-all duration-500 ${isOnboarded ? 'bg-emerald-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                        {appointment.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Pulsing Status Ring */}
                    <div className={`absolute inset-0 -m-2 rounded-[3rem] border-2 animate-pulse opacity-20 ${isOnboarded ? 'border-emerald-500' : 'border-indigo-500'}`}></div>
                </div>

                {/* Right Arrow Button */}
                <button 
                  disabled={!hasNext}
                  onClick={(e) => { e.stopPropagation(); onNext?.(); }}
                  className={`p-2 rounded-full transition-all duration-300 ${hasNext ? 'opacity-30 hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400' : 'opacity-0 pointer-events-none'}`}
                >
                   <IconChevronRight className="w-6 h-6" />
                </button>
            </div>
            
            <div className="relative group/name flex items-center gap-2 mb-2">
               <h2 
                 onClick={() => copyToClipboard(appointment.name, 'name')}
                 className={`text-3xl font-black transition-colors cursor-pointer ${copiedName ? 'text-emerald-600' : 'text-slate-900 dark:text-white hover:text-indigo-600'}`}
               >
                 {appointment.name}
               </h2>
               {copiedName && <IconCheck className="w-6 h-6 text-emerald-500 animate-in zoom-in" />}
            </div>

            <div className="text-xs font-bold text-slate-400 mb-6 flex items-center gap-1.5 uppercase tracking-widest">
                <IconCalendar className="w-3.5 h-3.5" />
                <span>Captured {formatDate(appointment.createdAt)}</span>
            </div>
            
            <div className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 shadow-sm mb-8 animate-in slide-in-from-top-2 ${STAGE_COLORS[appointment.stage]}`}>
                {STAGE_LABELS[appointment.stage]}
            </div>

            {/* PROGRESS / READINESS SECTION */}
            <div className="w-full space-y-4 px-4">
                {urgency ? (
                   <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm w-full text-left">
                      <div className="flex justify-between items-center mb-3">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Readiness Factor</span>
                         <span className="text-xs font-black text-indigo-600">{urgency.label}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-50 dark:bg-slate-900 rounded-full overflow-hidden mb-2">
                         <div className={`h-full rounded-full transition-all duration-1000 ${urgency.colorClass}`} style={{ width: `${urgency.percent}%` }} />
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                         <IconClock className="w-3.5 h-3.5" />
                         {urgency.diffHours < 0 ? 'Appointment Overdue' : `Starts in ${Math.floor(urgency.diffHours / 24)}d ${Math.floor(urgency.diffHours % 24)}h`}
                      </div>
                   </div>
                ) : isOnboarded ? (
                   <div className="bg-emerald-600 p-5 rounded-3xl shadow-xl shadow-emerald-200 dark:shadow-none w-full text-left text-white relative overflow-hidden group">
                      <div className="relative z-10">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Final Outcome</div>
                        <div className="text-2xl font-black mb-4">Onboarded!</div>
                        <div className="flex justify-between items-end">
                            <div className="text-3xl font-black drop-shadow-md">{formatCurrency(appointment.earnedAmount || 200)}</div>
                            {appointment.aeName && (
                                <div className="text-right text-[10px] font-black uppercase bg-white/20 px-2 py-1 rounded-lg">AE: {appointment.aeName}</div>
                            )}
                        </div>
                      </div>
                      <IconSparkles className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10 group-hover:scale-125 transition-transform" />
                   </div>
                ) : (
                    <div className="bg-slate-100 dark:bg-slate-800 p-5 rounded-3xl w-full text-left border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Status</div>
                        <div className="text-lg font-black text-slate-700 dark:text-slate-300">{STAGE_LABELS[appointment.stage]}</div>
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT: DETAILS & ACTIONS */}
        <div className="w-full md:w-7/12 p-8 flex flex-col bg-white dark:bg-slate-900 pb-20 md:pb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group transition-all hover:border-indigo-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl"><IconPhone className="w-4 h-4" /></div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Direct Line</div>
                    </div>
                    <div className="flex items-center justify-between">
                        <ProtocolModal type="phone" value={appointment.phone}>{(trigger) => <button onClick={trigger} className="text-sm font-black text-slate-900 dark:text-white hover:text-indigo-600 transition-colors">{appointment.phone}</button>}</ProtocolModal>
                        <button onClick={() => copyToClipboard(appointment.phone, 'phone')} className={`p-1.5 transition-colors rounded-lg ${copiedPhone ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:text-indigo-600'}`}>{copiedPhone ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}</button>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group transition-all hover:border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl"><IconMail className="w-4 h-4" /></div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Route</div>
                    </div>
                    <div className="flex items-center justify-between">
                        <ProtocolModal type="email" value={appointment.email}>{(trigger) => <button onClick={trigger} className="text-sm font-black text-slate-900 dark:text-white hover:text-blue-600 transition-colors truncate max-w-[120px]">{appointment.email || 'None'}</button>}</ProtocolModal>
                        {appointment.email && <button onClick={() => copyToClipboard(appointment.email, 'email')} className={`p-1.5 transition-colors rounded-lg ${copiedEmail ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:text-blue-600'}`}>{copiedEmail ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}</button>}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5 mb-3 px-1"><IconNotes className="w-3 h-3" /> Partner Session Notes</label>
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-4 border border-slate-100 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all flex flex-col">
                  <textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    onBlur={handleNotesBlur}
                    placeholder="Document call details, specific needs, or objections here..." 
                    className="w-full flex-1 bg-transparent border-none p-2 text-sm font-medium focus:ring-0 outline-none resize-none custom-scrollbar" 
                  />
                  <div className="pt-2 text-right">
                     <span className="text-[9px] font-bold text-slate-400 uppercase">Auto-saving on blur</span>
                  </div>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-4">
                {isTransferQueue ? (
                    <button onClick={() => { onMoveStage(appointment.id, AppointmentStage.ONBOARDED); onClose(); }} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[1.5rem] shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"><IconCheck className="w-5 h-5" /> Confirm Onboard Finish</button>
                ) : !isOnboarded && (
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => { onMoveStage(appointment.id, AppointmentStage.NO_SHOW); onClose(); }} className="py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"><IconTrash className="w-4 h-4" /> Mark Failed</button>
                        <button onClick={() => { onMoveStage(appointment.id, AppointmentStage.ONBOARDED); onClose(); }} className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2"><IconTransfer className="w-4 h-4" /> Move to Transfer</button>
                    </div>
                )}
                
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        <button onClick={() => { onEdit(appointment); onClose(); }} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 rounded-xl transition-all hover:scale-110" title="Full Edit"><IconEdit className="w-5 h-5" /></button>
                        <button onClick={() => { onDelete(appointment.id); onClose(); }} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-xl transition-all hover:scale-110" title="Delete Permanent"><IconTrash className="w-5 h-5" /></button>
                    </div>

                    {/* Milestone Footer */}
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700">
                        {isOnboarded ? (
                            <>
                                <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><IconActivity className="w-4 h-4" /></div>
                                <div><div className="text-[9px] font-black text-slate-400 uppercase leading-none">Milestone</div><div className="text-[10px] font-bold text-slate-900 dark:text-white">Deal Sealed</div></div>
                            </>
                        ) : isTransferQueue ? (
                            <>
                                <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg"><IconTransfer className="w-4 h-4" /></div>
                                <div><div className="text-[9px] font-black text-slate-400 uppercase leading-none">Milestone</div><div className="text-[10px] font-bold text-slate-900 dark:text-white">Active Transfer</div></div>
                            </>
                        ) : (
                            <>
                                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><IconTrendingUp className="w-4 h-4" /></div>
                                <div><div className="text-[9px] font-black text-slate-400 uppercase leading-none">Milestone</div><div className="text-[10px] font-bold text-slate-900 dark:text-white">Warm Opportunity</div></div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

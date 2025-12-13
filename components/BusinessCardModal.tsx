
import React, { useState, useEffect, useRef } from 'react';
import { Appointment, AppointmentStage, STAGE_LABELS, STAGE_COLORS } from '../types';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import { IconX, IconPhone, IconMail, IconCopy, IconCheck, IconEdit, IconTrash, IconCalendar, IconNotes, IconTrophy, IconBriefcase, IconTransfer, IconClock, IconChevronLeft, IconChevronRight } from './Icons';
import { ProtocolModal } from './ProtocolModal';

interface BusinessCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onEdit: (appt: Appointment, isRescheduleAction?: boolean) => void;
  onDelete: (id: string) => void;
  onMoveStage: (id: string, stage: AppointmentStage) => void;
  onSaveNotes: (id: string, notes: string) => void;
  // Navigation Props
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
  
  // Swipe State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (appointment) {
      setNotes(appointment.notes || '');
      // Reset position on new appointment load
      setTranslateX(0);
      setIsDragging(false);
    }
  }, [appointment]);

  // Keyboard Navigation Support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasNext, hasPrev, onNext, onPrev, onClose]);

  // --- SWIPE HANDLERS ---
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    if (touchStart !== null) {
        const currentX = e.targetTouches[0].clientX;
        const delta = currentX - touchStart;
        setTranslateX(delta);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
        // Reset if just a tap
        setTranslateX(0);
        setIsDragging(false);
        return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && hasNext && onNext) {
        // Animate off screen left
        setTranslateX(-500); 
        setTimeout(() => onNext(), 200); // Wait for transition
    } else if (isRightSwipe && hasPrev && onPrev) {
        // Animate off screen right
        setTranslateX(500);
        setTimeout(() => onPrev(), 200);
    } else {
        // Snap back
        setTranslateX(0);
    }
    setIsDragging(false);
  };

  if (!isOpen || !appointment) return null;

  const copyToClipboard = (text: string, type: 'phone' | 'email') => {
    navigator.clipboard.writeText(text);
    if (type === 'phone') {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleNotesBlur = () => {
    if (appointment && notes !== appointment.notes) {
      onSaveNotes(appointment.id, notes);
    }
  };

  // --- LOGIC ---
  const isOnboarded = appointment.stage === AppointmentStage.ONBOARDED;
  const isLiveTransfer = appointment.type === 'transfer';
  const isTransferred = appointment.stage === AppointmentStage.TRANSFERRED;
  const isTransferQueue = (isLiveTransfer && appointment.stage === AppointmentStage.PENDING) || isTransferred;
  const isStandardPending = !isLiveTransfer && !isTransferred && (appointment.stage === AppointmentStage.PENDING || appointment.stage === AppointmentStage.RESCHEDULED);

  // Generate deterministic color based on name
  const nameHash = appointment.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    'bg-indigo-100 text-indigo-600',
    'bg-rose-100 text-rose-600',
    'bg-emerald-100 text-emerald-600',
    'bg-amber-100 text-amber-600',
    'bg-cyan-100 text-cyan-600',
    'bg-purple-100 text-purple-600',
  ];
  const colorClass = isOnboarded 
    ? 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-200/50' 
    : colors[nameHash % colors.length];

  const accentColorClass = isOnboarded ? 'bg-emerald-500' : colorClass.split(' ')[0].replace('100', '500').replace('bg-', 'bg-');
  const ringColorClass = isOnboarded ? 'ring-emerald-400/50' : 'ring-indigo-400/50';

  // Urgency / Progress Bar Logic
  const calculateUrgency = () => {
    if (!isStandardPending) return null;
    const now = new Date().getTime();
    const scheduled = new Date(appointment.scheduledAt).getTime();
    const diffHours = (scheduled - now) / (1000 * 60 * 60);
    const horizonHours = 168; 
    
    let percent = 0;
    let color = 'bg-rose-500';
    let label = 'Due Soon';

    if (diffHours < 0) {
        percent = 100;
        color = 'bg-emerald-500';
        label = 'Ready / Past Due';
    } else if (diffHours > horizonHours) {
        percent = 5;
        color = 'bg-blue-400';
        label = 'Upcoming';
    } else {
        percent = Math.max(5, Math.min(100, 100 - (diffHours / horizonHours * 100)));
        if (percent > 90) { color = 'bg-emerald-500'; label = 'Imminent'; }
        else if (percent > 60) { color = 'bg-lime-400'; label = 'Approaching'; }
        else { color = 'bg-amber-400'; label = 'Scheduled'; }
    }
    return { percent, color, label };
  };

  const urgency = calculateUrgency();

  // Dynamic Styles for Swipe Animation
  const cardStyle = {
      transform: `translateX(${translateX}px) rotate(${translateX * 0.05}deg)`,
      transition: isDragging ? 'none' : 'transform 0.3s ease-out',
      cursor: isDragging ? 'grabbing' : 'grab'
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300">
      
      {/* CARD CONTAINER - Full Screen on Mobile, Landscape Card on Tablet/Desktop */}
      <div 
        className="group relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl w-full h-full md:h-auto md:max-h-[90vh] md:w-full md:max-w-3xl overflow-hidden flex flex-col md:flex-row border-0 md:border border-white/20 dark:border-slate-700/50 md:rounded-[2rem] shadow-none md:shadow-2xl ring-0 md:ring-1 ring-black/5 animate-in zoom-in-95 duration-300"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={cardStyle}
      >
        
        {/* Top Accent Line */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${accentColorClass} z-20`}></div>

        {/* Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white/50 dark:bg-slate-800/50 rounded-full transition-colors hover:scale-110 active:scale-95 border border-slate-200 dark:border-slate-700"
        >
            <IconX className="w-5 h-5" />
        </button>

        {/* --- LEFT PANEL: IDENTITY & STATUS (Desktop 40%, Mobile 100%) --- */}
        {/* Adjusted padding and layout for mobile full screen feel */}
        <div className="w-full md:w-5/12 p-6 pt-12 md:p-8 flex flex-col items-center text-center bg-gradient-to-b from-slate-50/80 to-white/50 dark:from-slate-800/30 dark:to-slate-900/30 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800/50 relative shrink-0">
            
            {/* Mobile Drag Indicator */}
            <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full opacity-50"></div>

            {/* Avatar Row with Nav Controls (Desktop) */}
            <div className="relative mb-4 mt-2 md:mt-0 w-full flex items-center justify-center gap-4">
                
                {/* PREV BUTTON (Desktop) */}
                <button 
                  onClick={(e) => { e.stopPropagation(); onPrev && onPrev(); }}
                  disabled={!hasPrev}
                  className={`
                    hidden md:flex w-8 h-8 rounded-full items-center justify-center 
                    transition-all duration-300 shadow-sm
                    ${hasPrev 
                        ? `bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-40 hover:opacity-100 hover:scale-110 hover:ring-2 ${ringColorClass}` 
                        : 'opacity-0 cursor-default'}
                  `}
                >
                   <IconChevronLeft className="w-5 h-5" />
                </button>

                {/* Avatar Container */}
                <div className="relative">
                    {/* Pulse Ring for Transfer Queue */}
                    {isTransferQueue && (
                        <>
                            <div className="absolute inset-0 rounded-[2rem] bg-indigo-400/30 animate-ping"></div>
                            <div className="absolute -inset-2 rounded-[2.5rem] border border-indigo-500/20 animate-pulse"></div>
                        </>
                    )}
                    
                    <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-4xl font-bold transform transition-transform group-hover:scale-105 duration-500 relative z-10 ${colorClass} ${!isOnboarded && 'border-4 border-white dark:border-slate-800 shadow-xl'}`}>
                        {isOnboarded ? <IconTrophy className="w-10 h-10 animate-pulse" /> : appointment.name.charAt(0).toUpperCase()}
                        
                        {/* Type Badge */}
                        {appointment.type === 'transfer' && (
                            <div className="absolute -bottom-2 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow-md border-2 border-white dark:border-slate-800 font-bold uppercase tracking-wide flex items-center gap-1">
                                <IconTransfer className="w-3 h-3" /> Live
                            </div>
                        )}
                    </div>
                </div>

                {/* NEXT BUTTON (Desktop) */}
                <button 
                  onClick={(e) => { e.stopPropagation(); onNext && onNext(); }}
                  disabled={!hasNext}
                  className={`
                    hidden md:flex w-8 h-8 rounded-full items-center justify-center 
                    transition-all duration-300 shadow-sm
                    ${hasNext
                        ? `bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-40 hover:opacity-100 hover:scale-110 hover:ring-2 ${ringColorClass}` 
                        : 'opacity-0 cursor-default'}
                  `}
                >
                   <IconChevronRight className="w-5 h-5" />
                </button>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-1 leading-tight tracking-tight">{appointment.name}</h2>
            
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
                <IconCalendar className="w-3.5 h-3.5" />
                <span>Added {formatDate(appointment.createdAt)}</span>
            </div>

            {/* Status Pill */}
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold border mb-4 md:mb-auto ${STAGE_COLORS[appointment.stage]}`}>
                {STAGE_LABELS[appointment.stage]}
            </div>

            {/* SPECIAL ONBOARDED CARD */}
            {isOnboarded && (
                <div className="w-full mt-2 md:mt-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-800/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <IconCheck className="w-16 h-16 text-emerald-600" />
                    </div>
                    <div className="relative z-10 text-left">
                        <div className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                            <IconCheck className="w-3 h-3" /> Deal Secured
                        </div>
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Earning</span>
                                <span className="font-bold text-xl text-slate-900 dark:text-white">{formatCurrency(appointment.earnedAmount || 200)}</span>
                            </div>
                            {appointment.aeName && (
                                <div className="text-right">
                                    <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Closer</span>
                                    <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                        {appointment.aeName}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PROGRESS BAR (For Standard Pending) */}
            {isStandardPending && urgency && (
                <div className="w-full mt-2 md:mt-6 hidden md:block">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2 px-1">
                        <span className="flex items-center gap-1"><IconClock className="w-3 h-3" /> Timeline</span>
                        <span className={urgency.percent === 100 ? 'text-emerald-500' : 'text-slate-500'}>{urgency.label}</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700">
                        <div 
                            className={`h-full rounded-full ${urgency.color} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)]`} 
                            style={{ width: `${urgency.percent}%` }}
                        ></div>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400 font-medium">
                        Scheduled for {new Date(appointment.scheduledAt).toLocaleTimeString([], {weekday: 'short', hour: 'numeric', minute: '2-digit'})}
                    </div>
                </div>
            )}

            {/* WAITING QUEUE INDICATOR */}
            {isTransferQueue && (
                <div className="w-full mt-4 md:mt-6 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/10 flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 animate-pulse">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                    <span className="text-xs font-bold uppercase tracking-wide ml-2">Awaiting Closer</span>
                </div>
            )}
        </div>

        {/* --- RIGHT PANEL: DETAILS & ACTIONS (Desktop 60%, Mobile 100%) --- */}
        <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col bg-white/50 dark:bg-slate-900/50 overflow-y-auto no-scrollbar h-full">
            
            {/* Contact Info */}
            <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group/item">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <IconPhone className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mobile</div>
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{appointment.phone}</div>
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-100 md:opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <button onClick={() => copyToClipboard(appointment.phone, 'phone')} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                            {copiedPhone ? <IconCheck className="w-4 h-4 text-emerald-500" /> : <IconCopy className="w-4 h-4" />}
                        </button>
                        <ProtocolModal type="phone" value={appointment.phone}>
                            {(trigger) => (
                                <button onClick={trigger} className="p-2 text-indigo-500 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 rounded-lg transition-colors">
                                    <IconPhone className="w-4 h-4" />
                                </button>
                            )}
                        </ProtocolModal>
                    </div>
                </div>

                {appointment.email && (
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group/item">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                <IconMail className="w-5 h-5" />
                            </div>
                            <div className="truncate">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email</div>
                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{appointment.email}</div>
                            </div>
                        </div>
                        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <button onClick={() => copyToClipboard(appointment.email, 'email')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                                {copiedEmail ? <IconCheck className="w-4 h-4 text-emerald-500" /> : <IconCopy className="w-4 h-4" />}
                            </button>
                            <ProtocolModal type="email" value={appointment.email}>
                                {(trigger) => (
                                    <button onClick={trigger} className="p-2 text-blue-500 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors">
                                        <IconMail className="w-4 h-4" />
                                    </button>
                                )}
                            </ProtocolModal>
                        </div>
                    </div>
                )}
            </div>

            {/* Notes Section */}
            <div className="flex-1 mb-6 min-h-[120px] md:min-h-[100px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <IconNotes className="w-3 h-3" /> Notes & Follow-up
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={handleNotesBlur}
                    placeholder="Add follow up notes here..."
                    className="w-full h-full min-h-[120px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all placeholder:text-slate-400/70 leading-relaxed shadow-inner"
                />
            </div>

            {/* Action Bar */}
            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50 flex flex-col gap-3 pb-safe md:pb-0">
                
                {/* 1. TRANSFER QUEUE ACTIONS (Waiting for Closer) */}
                {isTransferQueue && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => { onMoveStage(appointment.id, AppointmentStage.DECLINED); onClose(); }}
                            className="flex-1 py-3.5 md:py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:hover:bg-rose-900/30 dark:text-rose-400 font-bold text-xs uppercase tracking-wide transition-colors flex items-center justify-center gap-2"
                        >
                            <IconX className="w-4 h-4" /> Decline
                        </button>
                        <button
                            onClick={() => { onMoveStage(appointment.id, AppointmentStage.ONBOARDED); onClose(); }}
                            className="flex-1 py-3.5 md:py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wide shadow-lg shadow-indigo-200/50 dark:shadow-none transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <IconCheck className="w-4 h-4" /> Onboard
                        </button>
                    </div>
                )}

                {/* 2. STANDARD PENDING ACTIONS (Agent Funnel) */}
                {isStandardPending && (
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => { onMoveStage(appointment.id, AppointmentStage.NO_SHOW); onClose(); }}
                            className="py-3.5 md:py-3 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:hover:bg-rose-900/30 dark:text-rose-400 font-bold text-[10px] uppercase tracking-wide transition-colors"
                        >
                            Failed
                        </button>
                        <button
                            onClick={() => { onEdit(appointment, true); onClose(); }}
                            className="py-3.5 md:py-3 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wide transition-colors"
                        >
                            Reschedule
                        </button>
                        <button
                            onClick={() => { onMoveStage(appointment.id, AppointmentStage.TRANSFERRED); onClose(); }}
                            className="py-3.5 md:py-3 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wide shadow-md shadow-indigo-200/50 dark:shadow-none transition-transform active:scale-95 flex items-center justify-center gap-1"
                        >
                            <IconTransfer className="w-3 h-3" /> Transfer
                        </button>
                    </div>
                )}

                <div className="flex items-center justify-between text-slate-400">
                    <div className="flex gap-1">
                        <button 
                            onClick={() => { onEdit(appointment); onClose(); }}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg hover:text-indigo-500 transition-colors"
                            title="Edit"
                        >
                            <IconEdit className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => { onDelete(appointment.id); onClose(); }}
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg hover:text-rose-500 transition-colors"
                            title="Delete"
                        >
                            <IconTrash className="w-5 h-5" />
                        </button>
                    </div>
                    {isOnboarded && (
                        <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80">
                            Completed
                        </div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

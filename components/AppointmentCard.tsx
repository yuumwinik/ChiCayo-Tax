
import React, { useState } from 'react';
import { Appointment, AppointmentStage, STAGE_COLORS, STAGE_LABELS, AvatarId } from '../types';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import { IconEdit, IconMail, IconPhone, IconTrash, getAvatarIcon, IconCopy, IconCheck, IconTransfer, IconBriefcase, IconX } from './Icons';
import { ProtocolModal } from './ProtocolModal';

interface AppointmentCardProps {
  appointment: Appointment;
  onMoveStage: (id: string, stage: AppointmentStage) => void;
  onEdit: (appointment: Appointment, isRescheduleAction?: boolean) => void;
  onView?: (appointment: Appointment) => void;
  onDelete: (id: string) => void;
  agentName?: string;
  agentAvatar?: AvatarId;
  preferredDialer?: string; // Passed from parent
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onMoveStage, onEdit, onView, onDelete, agentName, agentAvatar, preferredDialer }) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(appointment.id);
  };

  const handleCardClick = () => {
    if (onView) {
      onView(appointment);
    } else {
      onEdit(appointment);
    }
  };

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

  // Gamified Urgency Logic
  const calculateUrgency = () => {
    if (appointment.stage !== AppointmentStage.PENDING && appointment.stage !== AppointmentStage.RESCHEDULED) return null;
    
    const now = new Date().getTime();
    const scheduled = new Date(appointment.scheduledAt).getTime();
    
    const diffHours = (scheduled - now) / (1000 * 60 * 60);
    const horizonHours = 168; // 7 Days
    let percent = 0;
    
    if (diffHours < 0) {
        return { colorClass: 'bg-emerald-500', percent: 100, pulse: true };
    } else if (diffHours > horizonHours) {
        percent = 5; 
    } else {
        percent = Math.max(5, Math.min(100, 100 - (diffHours / horizonHours * 100)));
    }

    let colorClass = 'bg-rose-500'; 
    if (percent > 90) colorClass = 'bg-emerald-500';
    else if (percent > 60) colorClass = 'bg-lime-400'; 
    else if (percent > 30) colorClass = 'bg-amber-400';
    else colorClass = 'bg-rose-500';

    return { colorClass, percent, pulse: diffHours < 1 && diffHours > -24 };
  };

  const urgency = calculateUrgency();
  const isLiveTransfer = appointment.type === 'transfer';
  const isApptTransferred = appointment.stage === AppointmentStage.TRANSFERRED;

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all duration-200 group cursor-pointer relative"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white leading-tight mb-1 pr-6 flex items-center gap-2">
             {appointment.name}
          </h3>
          <div className="flex gap-2 items-center">
             <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${STAGE_COLORS[appointment.stage]}`}>
                {STAGE_LABELS[appointment.stage]}
             </span>
             
             {urgency && (
               <div className="flex flex-col justify-center h-5 w-16 ml-1" title="Readiness Bar">
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full ${urgency.colorClass} ${urgency.pulse ? 'animate-pulse' : 'transition-all duration-1000 ease-out'}`}
                      style={{ width: `${urgency.percent}%` }}
                    />
                  </div>
               </div>
             )}

             {isLiveTransfer && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                   <IconTransfer className="w-3 h-3" /> Live
                </span>
             )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
           <div className="flex items-center gap-1">
             <button 
               onClick={handleDelete}
               className="text-slate-400 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg z-10"
               title="Delete"
               type="button"
             >
               <IconTrash className="w-4 h-4" />
             </button>
             <button 
               onClick={(e) => { e.stopPropagation(); onEdit(appointment); }}
               className="text-slate-400 hover:text-indigo-500 transition-colors p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg z-10"
               title="Edit"
               type="button"
             >
               <IconEdit className="w-4 h-4" />
             </button>
           </div>
           <div className="text-xs text-slate-400 font-medium bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-full">
            {formatDate(appointment.scheduledAt)}
          </div>
        </div>
      </div>

      {appointment.aeName && (
         <div className="flex items-center gap-1.5 mb-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg w-fit">
            <IconBriefcase className="w-3.5 h-3.5" />
            <span>AE: <strong>{appointment.aeName}</strong></span>
         </div>
      )}

      {agentName && (
        <div className="flex items-center gap-2 mb-3 -mt-1">
           <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-400">
             {agentAvatar && agentAvatar !== 'initial' ? (
                <div className="w-3.5 h-3.5">{getAvatarIcon(agentAvatar)}</div>
             ) : (
                <span className="text-[9px] font-bold">{agentName.charAt(0).toUpperCase()}</span>
             )}
           </div>
           <span className="text-xs text-slate-500 dark:text-slate-400">Agent: <span className="font-medium text-slate-700 dark:text-slate-300">{agentName}</span></span>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between group/row">
          <ProtocolModal type="phone" value={appointment.phone} appName={preferredDialer}>
            {(trigger) => (
              <button 
                onClick={(e) => { e.stopPropagation(); trigger(); }}
                className="flex items-center text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors w-fit relative z-10"
              >
                <IconPhone className="w-4 h-4 mr-2 opacity-70" />
                {appointment.phone}
              </button>
            )}
          </ProtocolModal>
          
          <button 
            onClick={(e) => { e.stopPropagation(); copyToClipboard(appointment.phone, 'phone'); }}
            className={`p-1 rounded-md transition-all z-10 ${copiedPhone ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-300 hover:text-indigo-500 opacity-0 group-hover/row:opacity-100'}`}
            title="Copy phone"
            type="button"
          >
            {copiedPhone ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {appointment.email && (
           <div className="flex items-center justify-between group/row">
             <ProtocolModal type="email" value={appointment.email}>
                {(trigger) => (
                  <button 
                    onClick={(e) => { e.stopPropagation(); trigger(); }}
                    className="flex items-center text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate w-fit relative z-10 max-w-[85%]"
                  >
                    <IconMail className="w-4 h-4 mr-2 opacity-70 shrink-0" />
                    <span className="truncate">{appointment.email}</span>
                  </button>
                )}
             </ProtocolModal>
            <button 
              onClick={(e) => { e.stopPropagation(); copyToClipboard(appointment.email, 'email'); }}
              className={`p-1 rounded-md transition-all z-10 ${copiedEmail ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-300 hover:text-indigo-500 opacity-0 group-hover/row:opacity-100'}`}
              title="Copy email"
              type="button"
            >
              {copiedEmail ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}
            </button>
           </div>
        )}
      </div>

      {appointment.notes && (
        <div className="mb-4 text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg italic">
          "{appointment.notes}"
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700/50 relative z-10">
        
        {(appointment.stage === AppointmentStage.ONBOARDED || appointment.stage === AppointmentStage.NO_SHOW || appointment.stage === AppointmentStage.DECLINED) && (
             <div className="w-full flex justify-center items-center gap-2 text-xs text-slate-400 py-2">
                <span>Marked as {STAGE_LABELS[appointment.stage]}</span>
                {appointment.stage === AppointmentStage.ONBOARDED && (
                   <span className="font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                     {appointment.earnedAmount ? formatCurrency(appointment.earnedAmount) : '+$2.00'}
                   </span>
                )}
             </div>
        )}

        {((isLiveTransfer && appointment.stage === AppointmentStage.PENDING) || appointment.stage === AppointmentStage.TRANSFERRED) && (
           <>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveStage(appointment.id, AppointmentStage.DECLINED); }}
                className="flex-1 py-2 px-2 text-[10px] sm:text-xs font-medium rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/30 transition-colors flex items-center justify-center gap-1"
              >
                <IconX className="w-3 h-3" /> Decline
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveStage(appointment.id, AppointmentStage.ONBOARDED); }}
                className="flex-1 py-2 px-2 text-[10px] sm:text-xs font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none transition-colors flex items-center justify-center gap-1"
              >
                <IconCheck className="w-3 h-3" /> Onboard
              </button>
           </>
        )}

        {!isLiveTransfer && (appointment.stage === AppointmentStage.PENDING || appointment.stage === AppointmentStage.RESCHEDULED) && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveStage(appointment.id, AppointmentStage.NO_SHOW); }}
              className="flex-1 py-2 px-2 text-[10px] sm:text-xs font-medium rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/30 transition-colors"
            >
              Failed
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(appointment, true); }}
              className="flex-1 py-2 px-2 text-[10px] sm:text-xs font-medium rounded-xl text-slate-600 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              Reschedule
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveStage(appointment.id, AppointmentStage.TRANSFERRED); }}
              className="flex-1 py-2 px-2 text-[10px] sm:text-xs font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none transition-colors flex items-center justify-center gap-1"
            >
              <IconTransfer className="w-3 h-3" /> Transferred
            </button>
          </>
        )}
      </div>
    </div>
  );
};

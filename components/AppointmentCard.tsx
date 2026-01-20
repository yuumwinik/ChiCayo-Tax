
import React, { useState, useMemo } from 'react';
import { Appointment, AppointmentStage, STAGE_COLORS, STAGE_LABELS, AvatarId } from '../types';
import { formatDate, formatCurrency, getRelativeTime } from '../utils/dateUtils';
import { IconEdit, IconMail, IconPhone, IconTrash, getAvatarIcon, IconCopy, IconCheck, IconTransfer, IconBriefcase, IconX, IconNotes, IconSparkles, IconClock, IconAlertTriangle, IconAlertCircle } from './Icons';
import { ProtocolModal } from './ProtocolModal';

interface AppointmentCardProps {
  appointment: Appointment;
  onMoveStage: (id: string, stage: AppointmentStage, isManualSelfOnboard?: boolean) => void;
  onEdit: (appointment: Appointment, isRescheduleAction?: boolean) => void;
  onView?: (appointment: Appointment) => void;
  onDelete: (id: string) => void;
  agentName?: string;
  agentAvatar?: AvatarId;
  preferredDialer?: string;
  referralRate: number;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onMoveStage, onEdit, onView, onDelete, agentName, agentAvatar, preferredDialer, referralRate }) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedName, setCopiedName] = useState(false);

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

  const calculateUrgency = () => {
    if (appointment.stage !== AppointmentStage.PENDING && appointment.stage !== AppointmentStage.RESCHEDULED) return null;
    const now = new Date().getTime();
    const scheduled = new Date(appointment.scheduledAt).getTime();
    const diffHours = (scheduled - now) / (1000 * 60 * 60);
    const horizonHours = 168;
    let percent = 0;
    if (diffHours < 0) return { colorClass: 'bg-emerald-500', percent: 100, pulse: true };
    else if (diffHours > horizonHours) percent = 5;
    else percent = Math.max(5, Math.min(100, 100 - (diffHours / horizonHours * 100)));
    let colorClass = 'bg-rose-500';
    if (percent > 90) colorClass = 'bg-emerald-500';
    else if (percent > 60) colorClass = 'bg-lime-400';
    else if (percent > 30) colorClass = 'bg-amber-400';
    return { colorClass, percent, pulse: diffHours < 1 && diffHours > -24 };
  };

  const isRecentReferral = useMemo(() => {
    if (!appointment.lastReferralAt || !appointment.referralCount || appointment.referralCount === 0) return false;
    const last = new Date(appointment.lastReferralAt).getTime();
    const now = Date.now();
    return (now - last) < (48 * 60 * 60 * 1000);
  }, [appointment.lastReferralAt]);

  const urgency = calculateUrgency();
  const totalPayout = (appointment.earnedAmount || 0) + ((appointment.referralCount || 0) * referralRate);
  const relative = getRelativeTime(appointment.scheduledAt);
  const isOverdue = relative.isPast && (appointment.stage === AppointmentStage.PENDING || appointment.stage === AppointmentStage.RESCHEDULED);

  return (
    <div
      onClick={() => onView ? onView(appointment) : onEdit(appointment)}
      className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border transition-all duration-200 group cursor-pointer relative ${isRecentReferral ? 'border-rose-300 dark:border-rose-900 ring-2 ring-rose-500/10' : isOverdue ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/10' : 'border-slate-100 dark:border-slate-700/50 hover:border-indigo-100 dark:hover:border-indigo-900/50 hover:shadow-md'}`}
    >
      {isRecentReferral && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 animate-in slide-in-from-bottom-1">
          <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 dark:shadow-none whitespace-nowrap">
            <IconSparkles className="w-3 h-3" /> Recent Referral
          </span>
        </div>
      )}

      {isOverdue && (
        <div className="absolute -top-3 right-4 z-20 animate-in slide-in-from-top-1">
          <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 rounded-lg text-[8px] font-black uppercase tracking-tighter border border-rose-200 dark:border-rose-800">
            <IconAlertTriangle className="w-2.5 h-2.5" /> Overdue
          </span>
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <div className="max-w-[70%]">
          <div className="relative group/name inline-block">
            <h3
              onClick={(e) => { e.stopPropagation(); copyToClipboard(appointment.name, 'name'); }}
              className={`text-lg font-semibold leading-tight mb-1 pr-6 flex items-center gap-2 transition-colors duration-200 ${copiedName ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400'}`}
            >
              {appointment.name}
              <span className={`transition-all duration-300 ${copiedName ? 'opacity-100 scale-110 translate-x-0' : 'opacity-0 scale-50 -translate-x-2'}`}>
                <IconCheck className="w-4 h-4 text-emerald-500" />
              </span>
              <IconCopy className={`w-3 h-3 text-slate-300 absolute -right-1 top-1 transition-opacity ${copiedName ? 'opacity-0' : 'opacity-0 group-hover/name:opacity-100'}`} />
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${STAGE_COLORS[appointment.stage]}`}>
              {STAGE_LABELS[appointment.stage]}
            </span>
            {urgency && (
              <div className="flex flex-col justify-center h-5 w-16" title="Readiness Bar">
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                  <div className={`h-full rounded-full ${urgency.colorClass} ${urgency.pulse ? 'animate-pulse' : 'transition-all duration-1000 ease-out'}`} style={{ width: `${urgency.percent}%` }} />
                </div>
              </div>
            )}
            <span className={`text-[9px] font-bold ${relative.isPast ? 'text-rose-500' : 'text-slate-400'} uppercase`}>{relative.label}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onDelete(appointment.id); }} className="text-slate-400 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg z-10" title="Delete" type="button"><IconTrash className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onEdit(appointment); }} className="text-slate-400 hover:text-indigo-500 transition-colors p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg z-10" title="Edit" type="button"><IconEdit className="w-4 h-4" /></button>
          </div>
          <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-full">{formatDate(appointment.scheduledAt)}</div>
        </div>
      </div>

      {appointment.aeName && (
        <div className="flex items-center gap-1.5 mb-2 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg w-fit">
          <IconBriefcase className="w-3.5 h-3.5" />
          <span>AE: <strong>{appointment.aeName}</strong></span>
        </div>
      )}

      {agentName && (
        <div className="flex items-center gap-2 mb-3 -mt-1">
          <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">
            {agentAvatar && agentAvatar !== 'initial' ? <div className="w-3.5 h-3.5">{getAvatarIcon(agentAvatar)}</div> : <span className="text-[9px] font-bold">{(agentName?.trim() || '?').charAt(0).toUpperCase()}</span>}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Agent: <span className="font-medium text-slate-700 dark:text-slate-300">{agentName}</span></span>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between group/row">
          <ProtocolModal type="phone" value={appointment.phone} appName={preferredDialer}>
            {(trigger) => (
              <button onClick={(e) => { e.stopPropagation(); trigger(); }} className="flex items-center text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors w-fit relative z-10">
                <IconPhone className="w-4 h-4 mr-2 opacity-70" />
                {appointment.phone}
              </button>
            )}
          </ProtocolModal>
          <button onClick={(e) => { e.stopPropagation(); copyToClipboard(appointment.phone, 'phone'); }} className={`p-1 rounded-md transition-all z-10 ${copiedPhone ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-300 hover:text-indigo-500 opacity-0 group-hover/row:opacity-100'}`} title="Copy phone" type="button">
            {copiedPhone ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {appointment.email && (
          <div className="flex items-center justify-between group/row">
            <ProtocolModal type="email" value={appointment.email} templatePath={appointment.stage === AppointmentStage.ONBOARDED ? "Files/Welcome to the Community Tax – SBTPG Referral Program.oft" : undefined}>
              {(trigger) => (
                <button onClick={(e) => { e.stopPropagation(); trigger(); }} className="flex items-center text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate w-fit relative z-10 max-w-[85%]">
                  <IconMail className="w-4 h-4 mr-2 opacity-70 shrink-0" />
                  <span className="truncate">{appointment.email}</span>
                </button>
              )}
            </ProtocolModal>
            <button onClick={(e) => { e.stopPropagation(); copyToClipboard(appointment.email, 'email'); }} className={`p-1 rounded-md transition-all z-10 ${copiedEmail ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-300 hover:text-indigo-500 opacity-0 group-hover/row:opacity-100'}`} title="Copy email" type="button">
              {copiedEmail ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {appointment.notes && (
        <div className="mb-4 flex items-start gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700/30">
          <IconNotes className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
            {appointment.notes}
          </p>
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700/50 relative z-10">
        {appointment.stage === AppointmentStage.TRANSFERRED ? (
          <div className="flex items-center gap-1.5 w-full">
            <button
              onClick={(e) => { e.stopPropagation(); onMoveStage(appointment.id, AppointmentStage.NO_SHOW); }}
              title="Failed to Show (Move to No Show)"
              className="w-10 h-10 flex items-center justify-center rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 transition-all active:scale-90 border border-rose-100 dark:border-rose-900/50"
            >
              <IconAlertCircle className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onMoveStage(appointment.id, AppointmentStage.ONBOARDED); }} className="flex-1 py-2 px-2 h-10 text-[10px] font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center gap-1"><IconCheck className="w-3 h-3" /> Confirm Onboard</button>
          </div>
        ) : (appointment.stage === AppointmentStage.PENDING || appointment.stage === AppointmentStage.RESCHEDULED) ? (
          <div className="flex items-center justify-between w-full gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onMoveStage(appointment.id, AppointmentStage.NO_SHOW); }}
              title="Failed to Show (Move to No Show)"
              className="w-10 h-10 flex items-center justify-center rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 transition-all active:scale-90 border border-rose-100 dark:border-rose-900/50"
            >
              <IconAlertCircle className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(appointment, true); }}
              title="Reschedule"
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 transition-all active:scale-90"
            >
              <IconClock className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveStage(appointment.id, AppointmentStage.ONBOARDED, true); }}
              title="Direct Self-Onboard"
              className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-sm"
            >
              <IconCheck className="w-4 h-4" /> Onboard
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveStage(appointment.id, AppointmentStage.ONBOARDED, false); }}
              title="Transfer to AE"
              className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              <IconTransfer className="w-4 h-4" /> Transfer
            </button>
          </div>
        ) : (
          <div className="w-full flex justify-center items-center gap-2 text-[10px] text-slate-400 py-2">
            <span>{STAGE_LABELS[appointment.stage]}</span>
            {appointment.stage === AppointmentStage.ONBOARDED && <span className="font-bold text-emerald-500">+{formatCurrency(totalPayout)}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

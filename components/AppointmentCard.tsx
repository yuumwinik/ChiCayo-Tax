
import React, { useState, useMemo } from 'react';
import { Appointment, AppointmentStage, STAGE_COLORS, STAGE_LABELS, AvatarId, User } from '../types';
import { formatDate, formatCurrency, getRelativeTime } from '../utils/dateUtils';
import { IconEdit, IconMail, IconPhone, IconTrash, getAvatarIcon, IconCopy, IconCheck, IconTransfer, IconBriefcase, IconX, IconNotes, IconSparkles, IconClock, IconAlertTriangle, IconAlertCircle, IconRocket } from './Icons';
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
  allUsers?: User[];
  incentives?: any[];
  isAdmin?: boolean;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onMoveStage, onEdit, onView, onDelete, agentName, agentAvatar, preferredDialer, referralRate, allUsers, incentives = [], isAdmin = false }) => {
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
    // ONLY show Recent Referral badge IF the card is actually ACTIVATED
    if (appointment.stage !== AppointmentStage.ACTIVATED) return false;
    if (!appointment.lastReferralAt || !appointment.referralCount || appointment.referralCount === 0) return false;
    const last = new Date(appointment.lastReferralAt).getTime();
    const now = Date.now();
    return (now - last) < (48 * 60 * 60 * 1000);
  }, [appointment.lastReferralAt, appointment.stage, appointment.referralCount]);

  const urgency = calculateUrgency();
  const relatedIncentives = (incentives || []).filter(i => (i.relatedAppointmentId === appointment.id || i.related_appointment_id === appointment.id));
  const incentiveTotal = relatedIncentives.reduce((sum, i) => {
    const label = (i.label || i.label_text || '').toLowerCase();
    const isActivation = label.includes('activation');
    // ONLY include activation incentives if the partner is strictly in the ACTIVATED stage
    if (isActivation && appointment.stage !== AppointmentStage.ACTIVATED) return sum;
    return sum + (i.amountCents || i.amount_cents || 0);
  }, 0);

  const totalPayout = (appointment.earnedAmount || 0) + ((appointment.referralCount || 0) * (referralRate || 0)) + incentiveTotal;
  const relative = getRelativeTime(appointment.scheduledAt);
  const isOverdue = relative.isPast && (appointment.stage === AppointmentStage.PENDING || appointment.stage === AppointmentStage.RESCHEDULED);

  const isActivated = appointment.stage === AppointmentStage.ACTIVATED;
  const isOnboarded = appointment.stage === AppointmentStage.ONBOARDED;

  return (
    <div
      onClick={() => onView ? onView(appointment) : onEdit(appointment)}
      className={`bg-white dark:bg-slate-800 rounded-[2rem] p-5 shadow-sm border transition-all duration-500 group cursor-pointer relative animate-in zoom-in-95 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        isActivated
          ? 'border-sky-300 dark:border-sky-700 ring-2 ring-sky-400/20'
          : isRecentReferral
          ? 'border-emerald-500 dark:border-emerald-700 ring-2 ring-emerald-500/20'
          : isOverdue
          ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/10'
          : 'border-slate-100 dark:border-slate-700/50 hover:border-indigo-100 dark:hover:border-indigo-900/50 hover:shadow-md'
      }`}
    >
      {isActivated && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 animate-in slide-in-from-bottom-1">
          <span className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-sky-200 dark:shadow-none whitespace-nowrap">
            <IconRocket className="w-3 h-3" /> Activated Partner
          </span>
        </div>
      )}
      {!isActivated && isRecentReferral && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 animate-in slide-in-from-bottom-1">
          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 dark:shadow-none whitespace-nowrap">
            <IconRocket className="w-3 h-3" /> Partner Activated
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
            <span className={`text-[9px] font-bold ${relative.isPast ? 'text-rose-500' : 'text-slate-400'} uppercase hidden`}>{relative.label}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onDelete(appointment.id); }} className="text-slate-400 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 btn-premium z-10" title="Delete" type="button"><IconTrash className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onEdit(appointment); }} className="text-slate-400 hover:text-indigo-500 transition-colors p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 btn-premium z-10" title="Edit" type="button"><IconEdit className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-col items-end gap-1">
            {(appointment.onboardedAt || appointment.stage === AppointmentStage.ONBOARDED || appointment.stage === AppointmentStage.ACTIVATED) && (
              <div className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-tighter bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/50">
                {formatDate(appointment.onboardedAt || appointment.scheduledAt)}
              </div>
            )}
            {appointment.activatedAt && (
              <div className="text-[8px] text-sky-600 dark:text-sky-400 font-black uppercase tracking-tighter bg-sky-50 dark:bg-sky-900/40 px-2 py-0.5 rounded-full border border-sky-100 dark:border-sky-800/50">
                {formatDate(appointment.activatedAt)}
              </div>
            )}
            {!appointment.onboardedAt && !appointment.activatedAt && (
              <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-full">{formatDate(appointment.scheduledAt)}</div>
            )}
          </div>
        </div>
      </div>

      {appointment.aeName && (
        <div className="flex items-center gap-1.5 mb-2 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg w-fit">
          <IconBriefcase className="w-3.5 h-3.5" />
          <span>AE: <strong>{appointment.aeName}</strong></span>
        </div>
      )}

      {appointment.originalUserId && (
        <div className="flex flex-col gap-1 mb-2">
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg w-fit">
            <IconCheck className="w-3.5 h-3.5" />
            <span>Orig: <strong>{allUsers?.find(u => u.id === appointment.originalUserId)?.name || 'Team Member'}</strong></span>
            {appointment.originalOnboardType && (
              <span className="opacity-70 ml-1">
                ({appointment.originalOnboardType === 'self' ? 'Self' : `Transfer${appointment.originalAeName ? ` to ${appointment.originalAeName}` : ''}`})
              </span>
            )}
          </div>
          {/* Redundant reward text removed at user request */}
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

      <div className="flex gap-1.5 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700/50 relative z-10 flex-wrap">
        {/* TRANSFERRED: Confirm Onboard */}
        {appointment.stage === AppointmentStage.TRANSFERRED ? (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveStage(appointment.id, AppointmentStage.NO_SHOW); }}
              title="Failed to Show"
              className="p-2 flex items-center justify-center btn-premium text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 transition-all active:scale-90 border border-rose-100 dark:border-rose-900/50 relative z-40 w-10 h-10 flex-shrink-0"
            >
              <IconAlertCircle className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onMoveStage(appointment.id, AppointmentStage.ONBOARDED); }} 
              className="flex-1 min-h-10 px-2 text-[10px] font-bold btn-premium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center gap-1 relative z-40 whitespace-nowrap"
            >
              <IconCheck className="w-3 h-3" />
              <span className="hidden xs:inline">Confirm</span>
            </button>
          </>
        ) : (appointment.stage === AppointmentStage.PENDING || appointment.stage === AppointmentStage.RESCHEDULED) ? (
          /* PENDING/RESCHEDULED: All action buttons */
          <>
            {/* Fail Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onMoveStage(appointment.id, AppointmentStage.NO_SHOW); }}
              title="Failed to Show"
              className="p-2 flex items-center justify-center btn-premium text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 transition-all active:scale-90 border border-rose-100 dark:border-rose-900/50 relative z-40 w-10 h-10 flex-shrink-0"
            >
              <IconAlertCircle className="w-4 h-4" />
            </button>
            
            {/* Reschedule Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(appointment, true); }}
              title="Reschedule"
              className="p-2 flex items-center justify-center btn-premium text-slate-600 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 transition-all active:scale-90 relative z-40 w-10 h-10 flex-shrink-0"
            >
              <IconClock className="w-4 h-4" />
            </button>
            
            {/* Self-Onboard Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onMoveStage(appointment.id, AppointmentStage.ONBOARDED, true); }}
              title="Direct Self-Onboard"
              className="flex-1 min-h-10 px-2 min-w-max btn-premium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-sm relative z-40 flex items-center justify-center gap-1 whitespace-nowrap"
            >
              <IconCheck className="w-4 h-4" />
              <span className="hidden xs:inline sm:hidden">On</span>
              <span className="hidden sm:inline">Onboard</span>
            </button>
            
            {/* Transfer Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onMoveStage(appointment.id, AppointmentStage.ONBOARDED, false); }}
              title="Transfer to AE"
              className="flex-1 min-h-10 px-2 min-w-max btn-premium text-white bg-indigo-600 hover:bg-indigo-700 font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none relative z-40 flex items-center justify-center gap-1 whitespace-nowrap"
            >
              <IconTransfer className="w-4 h-4" />
              <span className="hidden xs:inline sm:hidden">X-fer</span>
              <span className="hidden sm:inline">Transfer</span>
            </button>
          </>
        ) : (appointment.stage === AppointmentStage.ONBOARDED || appointment.stage === AppointmentStage.ACTIVATED) ? (
          /* ONBOARDED/ACTIVATED: Activation and Status */
          <div className="w-full flex justify-between items-center min-h-[44px]">
            {appointment.stage === AppointmentStage.ONBOARDED && !appointment.activatedAt && (
              <button
                onClick={(e) => { e.stopPropagation(); onMoveStage(appointment.id, AppointmentStage.ACTIVATED); }}
                className="group/act flex items-center justify-center gap-0 w-10 h-10 hover:w-28 hover:gap-2 rounded-full text-sky-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300 font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-95 border border-sky-200/50 dark:border-sky-800/50 overflow-hidden relative z-40 whitespace-nowrap"
              >
                <IconRocket className="w-4 h-4 shrink-0 transition-transform duration-500 group-hover/act:scale-110" />
                <span className="opacity-0 w-0 group-hover/act:opacity-100 group-hover/act:w-auto transition-all duration-500 overflow-hidden">
                  Activate
                </span>
              </button>
            )}
            <div className={`flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-400 ${appointment.stage === AppointmentStage.ONBOARDED && !appointment.activatedAt ? 'ml-auto' : 'w-full justify-between'}`}>
                {appointment.stage === AppointmentStage.ACTIVATED || appointment.activatedAt ? (
                  <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-bold uppercase transition-all animate-in slide-in-from-left-2 duration-500">
                    <IconCheck className="w-3 h-3" />
                    <span className="hidden xs:inline">Activated Partner</span>
                    <span className="inline xs:hidden">✓</span>
                  </span>
                ) : null}
              <span className={`font-black ${isActivated ? 'text-sky-600' : 'text-emerald-500'} whitespace-nowrap px-2 py-1 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/20 tabular-nums border border-emerald-100/30 dark:border-emerald-800/30`}>
                +{formatCurrency(totalPayout)}
              </span>
            </div>
          </div>
        ) : (
          /* OTHER STAGES: Show stage label */
          <div className="w-full flex justify-center items-center gap-2 text-[9px] sm:text-[10px] text-slate-400 py-1">
            <span>{STAGE_LABELS[appointment.stage]}</span>
          </div>
        )}
      </div>
    </div>
  );
};

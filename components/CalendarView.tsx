
import React, { useState, useMemo } from 'react';
import { Appointment, AppointmentStage, User, PayCycle } from '../types';
import { IconChevronLeft, IconChevronRight, IconCycle, IconUsers } from './Icons';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import { CustomSelect } from './CustomSelect';

interface CalendarViewProps {
  appointments: Appointment[];
  onEdit: (appt: Appointment) => void;
  onView?: (appt: Appointment) => void;
  userRole?: string;
  users?: User[];
  activeCycle?: PayCycle;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ appointments, onEdit, onView, userRole, users = [], activeCycle }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getCycleProgress = () => {
    if (!activeCycle) return 0;
    const start = new Date(activeCycle.startDate).getTime();
    const end = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
    const now = new Date().getTime();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  };

  const progress = getCycleProgress();

  const filteredAppointments = useMemo(() => {
    let data = appointments;
    if (userRole === 'admin') data = data.filter(a => a.stage === AppointmentStage.ONBOARDED);
    if (selectedAgentId !== 'all') data = data.filter(a => a.userId === selectedAgentId);
    return data;
  }, [appointments, userRole, selectedAgentId]);

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-28 sm:h-36 bg-slate-50/50 dark:bg-slate-900/50 border-b border-r border-slate-100 dark:border-slate-800" />);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
      const dayAppts = filteredAppointments.filter(a => a.scheduledAt.startsWith(dateStr));
      
      const dailyOnboarded = dayAppts.filter(a => a.stage === AppointmentStage.ONBOARDED).length;
      const dailyEarnings = dayAppts.filter(a => a.stage === AppointmentStage.ONBOARDED).reduce((sum, a) => sum + (a.earnedAmount || 200), 0);
      
      // NEW: Referral Detection on this Day
      const dailyReferrals = dayAppts.reduce((sum, a) => sum + (a.referralCount || 0), 0);

      days.push(
        <div key={day} className="h-28 sm:h-36 border-b border-r border-slate-100 dark:border-slate-800 p-1 sm:p-2 relative group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <div className="flex justify-between items-start mb-1">
             <span className={`text-xs font-semibold p-1 rounded-full w-6 h-6 flex items-center justify-center ${new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString() ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}>{day}</span>
             
             <div className="flex gap-1 items-center">
                {dailyReferrals > 0 && (
                   <div className="relative group/ref">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200 dark:shadow-none animate-pulse"></div>
                      <div className="absolute right-0 top-full mt-1 z-50 invisible group-hover/ref:visible opacity-0 group-hover/ref:opacity-100 transition-all duration-200"><div className="bg-rose-600 text-white text-[9px] rounded-lg py-1 px-2 whitespace-nowrap shadow-xl font-black">{dailyReferrals} REFERRALS</div></div>
                   </div>
                )}
                {dailyOnboarded > 0 && (
                   <div className="relative group/tooltip">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-none cursor-help"></div>
                      <div className="absolute right-0 top-full mt-1 z-50 invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200"><div className="bg-slate-900 text-white text-[10px] rounded-lg py-1.5 px-3 whitespace-nowrap shadow-xl"><div className="font-bold mb-0.5">{dailyOnboarded} Onboarded</div><div className="text-emerald-400 font-medium">{formatCurrency(dailyEarnings)} Earned</div></div></div>
                   </div>
                )}
             </div>
          </div>
          
          <div className="mt-1 space-y-1 overflow-y-auto max-h-[calc(100%-2rem)] no-scrollbar">
            {dayAppts.map(appt => (
              <button key={appt.id} onClick={() => onView?.(appt)} className={`w-full text-left text-[10px] sm:text-xs truncate px-1.5 py-1 rounded border ${appt.stage === AppointmentStage.RESCHEDULED ? 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800' : appt.stage === AppointmentStage.ONBOARDED ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' : appt.stage === AppointmentStage.PENDING ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>{new Date(appt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {appt.name}</button>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
        <div className="flex items-center gap-4 flex-wrap">
          {activeCycle && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-indigo-100 dark:border-indigo-900/50 shadow-sm flex flex-col gap-2 min-w-[180px] animate-in fade-in slide-in-from-right-2">
                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1"><IconCycle className="w-3 h-3" /> Pay Cycle</span><span className="text-xs font-bold text-slate-700 dark:text-white">{Math.round(progress)}%</span></div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div></div>
                <div className="flex justify-between text-[9px] text-slate-400 font-medium"><span>{formatDate(activeCycle.startDate)}</span><span>{formatDate(activeCycle.endDate)}</span></div>
            </div>
          )}
          {userRole === 'admin' && (<div className="w-48"><CustomSelect options={[{value: 'all', label: 'All Agents'}, ...users.filter(u => u.role !== 'admin').map(u => ({value: u.id, label: u.name}))]} value={selectedAgentId} onChange={setSelectedAgentId} placeholder="Filter Agent..." /></div>)}
          <div className="flex gap-2 ml-auto sm:ml-0"><button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500"><IconChevronLeft className="w-5 h-5" /></button><button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500"><IconChevronRight className="w-5 h-5" /></button></div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"><div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (<div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{day}</div>))}</div><div className="grid grid-cols-7">{renderDays()}</div></div>
    </div>
  );
};

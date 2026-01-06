import React, { useMemo } from 'react';
import { Appointment, AppointmentStage, User } from '../types';
import { IconSparkles, IconTrophy, IconDollarSign, IconClock } from './Icons';
import { formatCurrency } from '../utils/dateUtils';

interface GlobalWinTickerProps {
  appointments: Appointment[];
  users: User[];
}

export const GlobalWinTicker: React.FC<GlobalWinTickerProps> = ({ appointments, users }) => {
  const tickerEvents = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const onboarded = appointments.filter(a => a.stage === AppointmentStage.ONBOARDED);
    const recentWins = [...onboarded]
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
      .slice(0, 10);

    // 1. Detailed Win Announcements
    const winMessages = recentWins.map(win => {
      const agent = users.find(u => u.id === win.userId);
      const agentFirstName = agent?.name?.split(' ')[0] || 'Agent';
      const clientFirstName = win.name.split(' ')[0];
      const amount = formatCurrency(win.earnedAmount || 0);
      return {
        type: 'win',
        text: `${agentFirstName.toUpperCase()} ONBOARDED ${clientFirstName.toUpperCase()} — WON ${amount}! 🏆`,
        icon: <IconTrophy className="w-3.5 h-3.5 text-amber-400" />
      };
    });

    // 2. Weekly Production Bank
    const weekTotalCents = onboarded
      .filter(a => new Date(a.scheduledAt) >= weekStart)
      .reduce((sum, a) => sum + (a.earnedAmount || 0), 0);
    
    const bankMessage = {
      type: 'bank',
      text: `WEEKLY TEAM PRODUCTION BANK: ${formatCurrency(weekTotalCents)} — BOOM! 💥`,
      icon: <IconDollarSign className="w-3.5 h-3.5 text-emerald-400" />
    };

    // 3. Hot Streaks
    const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const streakMap: Record<string, number> = {};
    onboarded
      .filter(a => new Date(a.scheduledAt) >= threeDaysAgo)
      .forEach(a => { streakMap[a.userId] = (streakMap[a.userId] || 0) + 1; });
    
    const streakMessages = Object.entries(streakMap)
      .filter(([_, count]) => count >= 2)
      .map(([userId, count]) => {
        const name = users.find(u => u.id === userId)?.name?.split(' ')[0] || 'Agent';
        return {
          type: 'streak',
          text: `STREAK ALERT: ${name.toUpperCase()} IS ON A ${count}-WIN TEAR! 🔥`,
          icon: <IconSparkles className="w-3.5 h-3.5 text-orange-400" />
        };
      });

    // 4. Upcoming Heat
    const next12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const upcomingHeat = appointments
      .filter(a => (a.stage === AppointmentStage.PENDING || a.stage === AppointmentStage.RESCHEDULED) && 
                   new Date(a.scheduledAt) > now && new Date(a.scheduledAt) <= next12h)
      .slice(0, 5)
      .map(a => {
        const agent = users.find(u => u.id === a.userId)?.name?.split(' ')[0] || 'Agent';
        const time = new Date(a.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          type: 'upcoming',
          text: `UPCOMING HEAT: ${agent.toUpperCase()} vs ${a.name.split(' ')[0].toUpperCase()} @ ${time} ⏱️`,
          icon: <IconClock className="w-3.5 h-3.5 text-indigo-300" />
        };
      });

    const all = [...winMessages];
    if (weekTotalCents > 0) all.push(bankMessage);
    all.push(...streakMessages);
    all.push(...upcomingHeat);
    
    return all;
  }, [appointments, users]);

  if (tickerEvents.length === 0) return null;

  return (
    <div className="w-full bg-slate-900 overflow-hidden h-11 flex items-center shrink-0 border-b border-indigo-500/20 shadow-xl relative z-[60]">
      {/* Edge Fades */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent z-20 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-900 via-slate-900/80 to-transparent z-20 pointer-events-none"></div>
      
      {/* The Rolling Strip */}
      <div className="flex animate-[scroll_80s_linear_infinite] whitespace-nowrap items-center h-full">
        {/* Double render for seamless loop */}
        {[...tickerEvents, ...tickerEvents].map((event, i) => (
          <div key={i} className="flex items-center gap-4 px-12 h-full group border-r border-slate-800/50">
            <div className={`p-2 rounded-xl transition-all duration-300 group-hover:scale-125 ${
              event.type === 'win' ? 'bg-amber-500/10' : 
              event.type === 'bank' ? 'bg-emerald-500/10' : 
              event.type === 'streak' ? 'bg-rose-500/10' : 'bg-indigo-500/10'
            }`}>
              {event.icon}
            </div>
            <span className={`text-[12px] font-black tracking-[0.1em] transition-colors ${
              event.type === 'win' ? 'text-white' : 
              event.type === 'bank' ? 'text-emerald-400' : 
              event.type === 'streak' ? 'text-rose-400' : 'text-indigo-300'
            }`}>
              {event.text}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

import React, { useMemo } from 'react';
import { Appointment, AppointmentStage, User, View } from '../types';
// Fix: Add missing IconTrendingUp import
import { IconSparkles, IconTrophy, IconDollarSign, IconClock, IconArrowRight, IconActivity, IconTrendingUp } from './Icons';
import { formatCurrency } from '../utils/dateUtils';

interface GlobalWinTickerProps {
  appointments: Appointment[];
  users: User[];
  onViewAppt?: (id: string) => void;
  onNavigate?: (view: View) => void;
}

// Fix: Define interface for ticker events to handle optional properties and avoid type inference errors
interface TickerEvent {
  type: string;
  text: string;
  icon: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
}

export const GlobalWinTicker: React.FC<GlobalWinTickerProps> = ({ appointments, users, onViewAppt, onNavigate }) => {
  // Fix: Explicitly type the memoized array to ensure type safety for optional action members
  const tickerEvents = useMemo<TickerEvent[]>(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const onboarded = appointments.filter(a => a.stage === AppointmentStage.ONBOARDED);
    const recentWins = [...onboarded]
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
      .slice(0, 10);

    // 1. Detailed Win Announcements with Action Link
    const winMessages: TickerEvent[] = recentWins.map(win => {
      const agent = users.find(u => u.id === win.userId);
      const agentFirstName = agent?.name?.split(' ')[0] || 'Agent';
      const clientFirstName = win.name.split(' ')[0];
      const amount = formatCurrency(win.earnedAmount || 0);
      return {
        type: 'win',
        text: `${agentFirstName.toUpperCase()} ONBOARDED ${clientFirstName.toUpperCase()} — WON ${amount}!`,
        icon: <IconTrophy className="w-3.5 h-3.5 text-amber-400" />,
        action: () => onViewAppt?.(win.id),
        actionLabel: 'VIEW CARD'
      };
    });

    // 2. Weekly Production Bank
    const weekTotalCents = onboarded
      .filter(a => new Date(a.scheduledAt) >= weekStart)
      .reduce((sum, a) => sum + (a.earnedAmount || 0), 0);
    
    const bankMessage: TickerEvent = {
      type: 'bank',
      text: `WEEKLY TEAM PRODUCTION BANK: ${formatCurrency(weekTotalCents)} — BOOM! 💥`,
      icon: <IconDollarSign className="w-3.5 h-3.5 text-emerald-400" />,
      action: () => onNavigate?.('earnings-full'),
      actionLabel: 'HISTORY'
    };

    // 3. Goal Tracking
    const nextMilestone = Math.ceil((weekTotalCents / 100) / 50) * 50;
    const distance = nextMilestone - (weekTotalCents / 100);
    const goalMessage: TickerEvent = {
        type: 'goal',
        text: `ONLY $${distance.toFixed(0)} AWAY FROM THE $${nextMilestone} TEAM GOAL! 🎯`,
        icon: <IconActivity className="w-3.5 h-3.5 text-indigo-400" />
    };

    // 4. Hot Streaks
    const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const streakMap: Record<string, number> = {};
    onboarded
      .filter(a => new Date(a.scheduledAt) >= threeDaysAgo)
      .forEach(a => { streakMap[a.userId] = (streakMap[a.userId] || 0) + 1; });
    
    const streakMessages: TickerEvent[] = Object.entries(streakMap)
      .filter(([_, count]) => count >= 2)
      .map(([userId, count]) => {
        const name = users.find(u => u.id === userId)?.name?.split(' ')[0] || 'Agent';
        return {
          type: 'streak',
          text: `STREAK ALERT: ${name.toUpperCase()} IS ON A ${count}-WIN TEAR! 🔥`,
          icon: <IconSparkles className="w-3.5 h-3.5 text-orange-400" />
        };
      });

    // 5. Closing Potential (Sum of Pending)
    const pending = appointments.filter(a => a.stage === AppointmentStage.PENDING || a.stage === AppointmentStage.RESCHEDULED);
    const potentialCents = pending.length * 200; // Estimated 
    const potentialMessage: TickerEvent = {
        type: 'potential',
        text: `CLOSING POTENTIAL: ${formatCurrency(potentialCents)} IN PENDING DEALS! 🚀`,
        icon: <IconTrendingUp className="w-3.5 h-3.5 text-blue-400" />,
        action: () => onNavigate?.('dashboard'),
        actionLabel: 'GO TO FUNNEL'
    };

    // 6. Encouragement
    const encouragements: TickerEvent[] = [
        "KEEP CRUSHING THE PHONES! ☎️",
        "WIN THE DAY, ONE DIAL AT A TIME!",
        "THE NEXT CALL IS THE ONE!",
        "TEAM WORK MAKES THE DREAM WORK!"
    ].map(t => ({ type: 'encouragement', text: t, icon: <IconSparkles className="w-3.5 h-3.5 text-indigo-300" /> }));

    // Combine and Randomly Shuffle
    const all = [...winMessages, bankMessage, goalMessage, ...streakMessages, potentialMessage, ...encouragements]
        .sort(() => Math.random() - 0.5);
    
    return all;
  }, [appointments, users, onViewAppt, onNavigate]);

  if (tickerEvents.length === 0) return null;

  return (
    <div className="w-full bg-slate-900 overflow-hidden h-11 flex items-center shrink-0 border-b border-indigo-500/20 shadow-xl relative z-[60] group/ticker">
      {/* Edge Fades */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent z-20 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-900 via-slate-900/80 to-transparent z-20 pointer-events-none"></div>
      
      {/* The Rolling Strip - Reversed Direction (Left to Right). Duration slowed to 180s */}
      <div className="flex animate-[scroll_180s_linear_infinite] whitespace-nowrap items-center h-full hover:[animation-play-state:paused]">
        {/* Triple render for super long seamless loop */}
        {[...tickerEvents, ...tickerEvents, ...tickerEvents].map((event, i) => (
          <div key={i} className="flex items-center gap-4 px-12 h-full border-r border-slate-800/50">
            <div className={`p-2 rounded-xl transition-all duration-300 hover:scale-125 ${
              event.type === 'win' ? 'bg-amber-500/10' : 
              event.type === 'bank' ? 'bg-emerald-500/10' : 
              event.type === 'streak' ? 'bg-rose-500/10' : 
              event.type === 'potential' ? 'bg-blue-500/10' : 'bg-indigo-500/10'
            }`}>
              {event.icon}
            </div>
            <span className={`text-[12px] font-black tracking-[0.1em] transition-colors ${
              event.type === 'win' ? 'text-white' : 
              event.type === 'bank' ? 'text-emerald-400' : 
              event.type === 'streak' ? 'text-rose-400' : 
              event.type === 'potential' ? 'text-blue-300' : 'text-indigo-300'
            }`}>
              {event.text}
            </span>
            {/* Fix: Type narrowing ensures event.action and event.actionLabel are accessible */}
            {event.action && (
                <button 
                  onClick={event.action}
                  className="px-2 py-0.5 rounded bg-indigo-600 text-[9px] font-black text-white hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-1"
                >
                    {event.actionLabel}
                    <IconArrowRight className="w-2.5 h-2.5" />
                </button>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

import React, { useMemo } from 'react';
import { Appointment, AppointmentStage, User, View, PayCycle } from '../types';
import { IconSparkles, IconTrophy, IconDollarSign, IconClock, IconArrowRight, IconActivity, IconTrendingUp } from './Icons';
import { formatCurrency } from '../utils/dateUtils';

interface GlobalWinTickerProps {
  appointments: Appointment[];
  users: User[];
  activeCycle?: PayCycle;
  onViewAppt?: (id: string) => void;
  onNavigate?: (view: View) => void;
  visible: boolean;
  onToggle: () => void;
}

interface TickerEvent {
  type: string;
  text: string;
  icon: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
}

export const GlobalWinTicker: React.FC<GlobalWinTickerProps> = ({ appointments, users, activeCycle, onViewAppt, onNavigate, visible, onToggle }) => {
  const tickerEvents = useMemo<TickerEvent[]>(() => {
    if (!activeCycle) return [];

    const start = new Date(activeCycle.startDate).getTime();
    const end = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);

    const onboarded = appointments.filter(a => {
      if (a.stage !== AppointmentStage.ONBOARDED && a.stage !== AppointmentStage.ACTIVATED) return false;
      const onboardedTime = new Date(a.onboardedAt || a.scheduledAt).getTime();
      return onboardedTime >= start && onboardedTime <= end;
    });

    if (onboarded.length === 0) return [];

    const recentWins = [...onboarded]
      .sort((a, b) => new Date(b.onboardedAt || b.scheduledAt).getTime() - new Date(a.onboardedAt || a.scheduledAt).getTime())
      .slice(0, 5);

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
        actionLabel: 'VIEW'
      };
    });

    const cycleTotalCents = onboarded.reduce((sum, a) => sum + (a.earnedAmount || 0), 0);
    const bankMessage: TickerEvent = {
      type: 'bank',
      text: `ACTIVE CYCLE PRODUCTION: ${formatCurrency(cycleTotalCents)} — BOOM! 💥`,
      icon: <IconDollarSign className="w-3.5 h-3.5 text-emerald-400" />,
      action: () => onNavigate?.('earnings-full'),
      actionLabel: 'STATS'
    };

    return [...winMessages, bankMessage].sort(() => Math.random() - 0.5);
  }, [appointments, users, activeCycle, onViewAppt, onNavigate]);

  if (!visible || tickerEvents.length === 0) return null;

  return (
    <div className="w-full bg-slate-900 overflow-hidden h-11 flex items-center shrink-0 border-b border-indigo-500/20 shadow-xl relative z-[60] group/ticker">
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent z-20 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-900 via-slate-900/80 to-transparent z-20 pointer-events-none"></div>

      <div className="flex animate-[scroll_120s_linear_infinite] whitespace-nowrap items-center h-full hover:[animation-play-state:paused]">
        {[...tickerEvents, ...tickerEvents, ...tickerEvents, ...tickerEvents].map((event, i) => (
          <div key={i} className="flex items-center gap-4 px-12 h-full border-r border-slate-800/50">
            <div className={`p-2 rounded-xl transition-all duration-300 hover:scale-125 ${event.type === 'win' ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
              {event.icon}
            </div>
            <span className={`text-[12px] font-black tracking-[0.1em] transition-colors ${event.type === 'win' ? 'text-white' : 'text-emerald-400'}`}>
              {event.text}
            </span>
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
          0% { transform: translateX(-25%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
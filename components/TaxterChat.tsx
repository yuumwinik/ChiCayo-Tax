
import React, { useState, useRef, useEffect } from 'react';
import { IconBot, IconSend, IconX, IconCopy, IconCheck, IconExternalLink, IconArrowRight, IconSparkles, IconClock } from './Icons';
import { Appointment, EarningWindow, PayCycle, User, View, AppointmentStage } from '../types';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import { calculateSuccessProbability, generateCoachingInsights } from '../utils/analyticsUtils';
import { TRAINING_CONTENT } from '../utils/trainingData';

interface TaxterChatProps {
  user: User;
  allAppointments: Appointment[];
  allEarnings: EarningWindow[];
  payCycles: PayCycle[];
  allUsers: User[];
  onOpenAppointment?: (id: string) => void;
  onNavigate?: (view: View) => void;
  activeCycle?: PayCycle;
  commissionRate: number;
  selfCommissionRate: number;
  referralCommissionRate: number;
  reminders: any[];
  allIncentives: any[];
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const processBold = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-extrabold text-slate-900 dark:text-white drop-shadow-sm">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const MarkdownText = ({ content }: { content: string }) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        // Headers
        if (line.trim().startsWith('### ')) {
          return <h3 key={i} className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.15em] mt-6 mb-3 flex items-center gap-2">
            <div className="w-1 h-3 bg-indigo-500 rounded-full" />
            {line.replace('### ', '')}
          </h3>;
        }
        // Bullets
        if (line.trim().startsWith('• ') || line.trim().startsWith('- ')) {
          const clean = line.trim().replace(/^[•-]\s+/, '');
          return (
            <div key={i} className="flex gap-3 items-start ml-2 py-0.5">
              <span className="text-indigo-400 font-black mt-0.5">•</span>
              <span className="text-sm font-medium leading-relaxed">{processBold(clean)}</span>
            </div>
          );
        }
        // General line
        if (!line.trim()) return <div key={i} className="h-2" />;
        return <div key={i} className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{processBold(line)}</div>;
      })}
    </div>
  );
};

export const RichMessageRenderer = ({ text, onOpenAppointment, onNavigate }: { text: string, onOpenAppointment?: (id: string) => void, onNavigate?: (view: View) => void }) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedText(txt);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const parts = text.split(/(\[\[(?:COPY_PHONE|OPEN_APPT|NAV|STAT):[^\]]+\]\])/g);

  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('[[COPY_PHONE:')) {
          const content = part.replace('[[COPY_PHONE:', '').replace(']]', '');
          const isCopied = copiedText === content;
          return (
            <button key={i} onClick={() => handleCopy(content)} className="inline-flex items-center gap-1.5 mx-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-200 dark:border-indigo-800 shadow-sm">
              {isCopied ? <IconCheck className="w-3 h-3" /> : <IconCopy className="w-3 h-3" />}
              {content}
            </button>
          );
        } else if (part.startsWith('[[OPEN_APPT:')) {
          const raw = part.replace('[[OPEN_APPT:', '').replace(']]', '');
          const [id, name] = raw.split(':', 2);
          return (
            <button key={i} onClick={() => onOpenAppointment && onOpenAppointment(id)} className="inline-flex items-center gap-1.5 mx-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-200 dark:border-emerald-800 shadow-sm">
              <IconExternalLink className="w-3 h-3" /> View {name || 'Details'}
            </button>
          );
        } else if (part.startsWith('[[NAV:')) {
          const view = part.replace('[[NAV:', '').replace(']]', '') as View;
          let label = 'View Page';
          if (view === 'earnings-full') label = 'View Full Wallet';
          else if (view === 'user-analytics') label = 'View My Stats';
          else if (view === 'admin-dashboard') label = 'Team Dashboard';
          else if (view === 'onboarded') label = 'Trophy Case';
          else if (view === 'calendar') label = 'Calendar';
          return (
            <button key={i} onClick={() => onNavigate && onNavigate(view)} className="flex items-center gap-2 my-4 px-6 py-3.5 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-indigo-200 dark:shadow-none items-center justify-center w-full">
              {label} <IconArrowRight className="w-3 h-3" />
            </button>
          );
        } else if (part.startsWith('[[STAT:')) {
          const raw = part.replace('[[STAT:', '').replace(']]', '');
          const [label, value] = raw.split(':', 2);
          return (
            <span key={i} className="inline-flex flex-col items-start mx-1 my-2 align-middle bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 shadow-md min-w-[120px] transition-transform hover:scale-105">
              <span className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-black mb-1">{label}</span>
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{value}</span>
            </span>
          );
        }
        return <MarkdownText key={i} content={part} />;
      })}
    </div>
  );
};

export const TaxterChat: React.FC<TaxterChatProps> = ({
  user, allAppointments, allEarnings, payCycles, allUsers, onOpenAppointment, onNavigate, activeCycle, commissionRate, selfCommissionRate, referralCommissionRate, reminders, allIncentives
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [lastTopic, setLastTopic] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: user.role === 'admin'
        ? `### Team Financial Intelligence\nHello Admin! I'm Taxter. I've been upgraded with **Real-Time Data Awareness**. I can analyze team revenue, agent pacing, and historical cycles.\n\nType **"Team Pacing"** or **"Top Agent"** to begin.`
        : `### Your Personal Strategy Desk\nHi ${(user?.name || 'Agent').split(' ')[0]}! I'm Taxter. I've been upgraded with your **Live Cycle Data**. I can calculate your projected pay, track your activations, and explain your commission math.\n\nWhat can I calculate for you today?`
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleCloseChatCompletely = () => {
    // Full kill chat
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: user.role === 'admin'
          ? `Hello Admin! I'm Taxter. I can analyze team-wide metrics and visualize revenue across cycles. How can I assist you?`
          : `Hi ${(user?.name || 'Agent').split(' ')[0]}! I'm Taxter. I track your leads, your commissions, and your performance. Ask me anything!`
      }
    ]);
    setIsOpen(false);
    setIsMinimized(false);
    setInput('');
    setIsTyping(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleMaximize = () => {
    setIsMinimized(false);
    setIsOpen(true);
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  const getDynamicSuggestions = (ctx: any) => {
    const chips: string[] = [];
    const isAtEnd = ctx.timeContext.daysRemaining <= 3;
    const hasActivations = ctx.performance.currentCycle.activationCount > 0;
    const hasOnboards = ctx.performance.currentCycle.wins > 0;
    
    if (user.role === 'admin') {
      chips.push("Team Pacing", "Top Agent", "Revenue Split", "Active Growth");
    } else {
      if (isAtEnd) chips.push("Projected Payout", "Pacing Check");
      if (hasActivations) chips.push("Activation Earnings");
      if (hasOnboards && !hasActivations) chips.push("How to Activate?");
      if (!hasOnboards) chips.push("How to get first win?");
      
      chips.push("My Stats", "Cycle Info", "Commission Math");
    }
    return chips.slice(0, 4);
  };

  const getTopicContext = () => {
    const ctx = JSON.parse(prepareContextData());
    return ctx;
  };

  const prepareContextData = () => {
    const relevantAppointments = user.role === 'admin' ? allAppointments : allAppointments.filter(a => a.userId === user.id);
    const now = new Date();
    const nowTimestamp = now.getTime();

    // Separate Upcoming vs Past
    const upcomingEvents = relevantAppointments
      .filter(a => {
        const date = new Date(a.scheduledAt).getTime();
        return date > nowTimestamp && (a.stage === AppointmentStage.PENDING || a.stage === AppointmentStage.RESCHEDULED);
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 10)
      .map(a => ({
        id: a.id,
        name: a.name,
        time: a.scheduledAt,
        stage: a.stage,
        type: a.type || 'appointment'
      }));

    const recentPastEvents = relevantAppointments
      .filter(a => {
        const date = new Date(a.onboardedAt || a.scheduledAt).getTime();
        return date <= nowTimestamp;
      })
      .sort((a, b) => new Date(b.onboardedAt || b.scheduledAt || b.createdAt).getTime() - new Date(a.onboardedAt || a.scheduledAt || a.createdAt).getTime())
      .slice(0, 20)
      .map(a => ({
        id: a.id,
        name: a.name,
        time: a.onboardedAt || a.scheduledAt,
        stage: a.stage,
        ae: a.aeName,
        amt: formatCurrency(a.earnedAmount || 0)
      }));

    let currentCycleTotal = 0;
    let currentCycleWins = 0;
    if (activeCycle) {
      const s = new Date(activeCycle.startDate).getTime();
      const e = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
      relevantAppointments.forEach(a => {
        if (a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED) {
          const rawDate = a.onboardedAt || a.scheduledAt;
          if (!rawDate) return;
          const d = new Date(rawDate).getTime();
          if (isNaN(d)) return;

          if (d >= s && d <= e) {
            const agent = allUsers.find(u => u.id === a.userId);
            const defaultRate = (a.aeName === agent?.name) ? selfCommissionRate : commissionRate;
            currentCycleTotal += (a.earnedAmount || defaultRate);
            currentCycleWins++;
          }
        }
      });
    }

    // Calc Activations for current user/cycle
    const userIncentives = allIncentives.filter(i => (user.role === 'admin' ? true : i.userId === user.id));
    let currentCycleActivationCents = 0;
    let currentCycleActivationCount = 0;
    
    if (activeCycle) {
       const cycleInc = userIncentives.filter(i => i.appliedCycleId === activeCycle.id && i.label.toLowerCase().includes('activat'));
       currentCycleActivationCents = cycleInc.reduce((s, i) => s + i.amountCents, 0);
       currentCycleActivationCount = cycleInc.length;
       currentCycleTotal += currentCycleActivationCents;
    }

    const lifetimeOnboarded = relevantAppointments.filter(a => a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED);
    const lifetimeIncentives = userIncentives.reduce((s, i) => s + i.amountCents, 0);
    const lifetimeEarnings = lifetimeOnboarded.reduce((sum, a) => {
      return sum + (a.earnedAmount || 0);
    }, 0) + lifetimeIncentives;

    const daysElapsed = Math.max(1, Math.floor((nowTimestamp - (activeCycle ? new Date(activeCycle.startDate).getTime() : nowTimestamp)) / (1000 * 60 * 60 * 24)));
    const totalDays = activeCycle ? Math.ceil((new Date(activeCycle.endDate).getTime() - new Date(activeCycle.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 1;

    const context = {
      user: { name: user.name, role: user.role },
      timeContext: {
        nowISO: now.toISOString(),
        localTime: now.toLocaleString(),
        daysElapsed,
        totalDays,
        daysRemaining: activeCycle ? Math.ceil((new Date(activeCycle.endDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24)) : 0,
        activeCycle: activeCycle ? {
          id: activeCycle.id,
          label: `${formatDate(activeCycle.startDate)} - ${formatDate(activeCycle.endDate)}`,
        } : null
      },
      performance: {
        currentCycle: {
          totalCents: currentCycleTotal,
          formatted: formatCurrency(currentCycleTotal),
          wins: currentCycleWins,
          activationEarnings: formatCurrency(currentCycleActivationCents),
          activationCount: currentCycleActivationCount,
          onboardWins: currentCycleWins - currentCycleActivationCount
        },
        lifetime: {
          earnings: formatCurrency(lifetimeEarnings),
          cents: lifetimeEarnings,
          count: lifetimeOnboarded.length
        }
      },
      pacing: {
        projectedCents: Math.round((currentCycleTotal / daysElapsed) * totalDays),
        formatted: formatCurrency(Math.round((currentCycleTotal / daysElapsed) * totalDays))
      },
      upcomingEvents,
      recentPastEvents,
      reminders: (user.role === 'admin' ? reminders : reminders.filter(r => r.userId === user.id)).map(r => ({
        name: r.name,
        time: r.callBackAt,
        notes: r.notes
      }))
    };

    return JSON.stringify(context);
  };

  const handleLocalQuery = (text: string): string | null => {
    const lower = text.toLowerCase();
    const ctx = JSON.parse(prepareContextData());
    const isFollowUp = lastTopic !== null && (lower.includes('how much') || lower.includes('more info') || lower.includes('detail') || lower.includes('tell me') || lower.includes('why'));

    // --- FINANCIAL CALCULATOR ENGINE ---

    // 1. PROJECTED PAYOUT & PACING
    if (lower.includes('project') || lower.includes('pace') || lower.includes('expect') || lower.includes('forecast')) {
      setLastTopic('pacing');
      const projected = ctx.pacing.formatted;
      const daysLeft = ctx.timeContext.daysRemaining;
      return `### Financial Projection\nBased on your current performance of [[STAT:Cycle Total:${ctx.performance.currentCycle.formatted}]] over ${ctx.timeContext.daysElapsed} days, you are on pace for:\n\n[[STAT:Projected Payout:${projected}]]\n\nThere are **${daysLeft} days remaining** in this window. Would you like a breakdown of how this is calculated?\n\n[[NAV:user-analytics]]`;
    }

    // 2. ACTIVATIONS (Detailed awareness)
    if (lower.includes('activat') || (isFollowUp && lastTopic === 'earning')) {
      setLastTopic('activation');
      const count = ctx.performance.currentCycle.activationCount;
      const rev = ctx.performance.currentCycle.activationEarnings;
      if (count === 0) return `### Activation Status\nYou don't have any activations recorded for the current cycle yet.\n\n**Strategy:** Follow up with your **${ctx.performance.currentCycle.onboardWins} Onboarded partners** to get their first referral. That's worth [[STAT:Activation Bonus:$10.00]] per deal!`;
      return `### Activation Deep-Dive\nIn this cycle, you've secured [[STAT:Activations:${count}]] worth [[STAT:Earned:${rev}]].\n\nThese are tracked separately from your onboarding commissions to ensure accurate cycle attribution. Keep pushing for that first referral from every onboard!`;
    }

    // 3. COMMISSION MATH & RULES
    if (lower.includes('commission') || lower.includes('math') || lower.includes('payout') || lower.includes('rule') || lower.includes('how do i earn')) {
      setLastTopic('math');
      return `### Commission Structure\nHere is how your earnings are calculated at Community Tax:\n\n• **Standard Onboard:** [[STAT:Basic:$20.00]] per partner\n• **Self-Onboard:** [[STAT:Expert:$21.00]] (If you handle the AE call)\n• **Partner Activation:** [[STAT:Momentum:$10.00]] (First referral from a partner)\n\nActivations are locked to the cycle when the **first referral is received**, not when you onboard them.`;
    }

    // 4. OVERALL STATS & WALLET
    if (lower.includes('stat') || lower.includes('summary') || lower.includes('wallet') || lower.includes('earning') || lower.includes('made')) {
      setLastTopic('earning');
      return `### Performance Snapshot\nHere is your real-time standing:\n\n• **Active Cycle:** [[STAT:Current:${ctx.performance.currentCycle.formatted}]]\n• **Cycle Wins:** [[STAT:Total:${ctx.performance.currentCycle.wins} Deals]]\n• **Lifetime Reach:** [[STAT:Total:${ctx.performance.lifetime.earnings}]]\n\nYou're making great progress. Want to see the full historical ledger?\n\n[[NAV:earnings-full]]`;
    }

    // 5. CONVERSION & COACHING
    if (lower.includes('conversion') || lower.includes('percentage') || lower.includes('how am i doing') || lower.includes('coaching')) {
      setLastTopic('coaching');
      const total = ctx.performance.lifetime.count;
      const act = ctx.performance.currentCycle.activationCount;
      const rate = total > 0 ? Math.round((act / total) * 100) : 0;
      return `### Coaching Insights\nYour conversion rate from Onboard to Activated is roughly [[STAT:Conversion:${rate}%]].\n\n**Elite Benchmark:** Top agents maintain a **35%+ activation rate**. \n\n**Pro Tip:** Use the "Nurture Strategy" in your dashboard to follow up with partners who have been dormant for more than 48 hours. [[NAV:dashboard]]`;
    }

    // 6. SCHEDULE & CALENDAR
    if (lower.includes('upcoming') || lower.includes('next') || lower.includes('today') || lower.includes('tomorrow') || lower.includes('schedule')) {
      setLastTopic('schedule');
      if (ctx.upcomingEvents.length === 0) return `### Schedule Empty\nYou have no upcoming leads scheduled. Time to dive into the 'Referral Activation' call block!`;
      const list = ctx.upcomingEvents.slice(0, 3).map((a: any) => `• **${a.name}** (${formatDate(a.time)})\n [[OPEN_APPT:${a.id}:${a.name}]]`).join('\n');
      return `### Scheduled Operations\nYou have [[STAT:Next Up:${ctx.upcomingEvents.length} Leads]] on deck:\n\n${list}\n\n[[NAV:calendar]]`;
    }

    // 7. REMINDERS
    if (lower.includes('reminder') || lower.includes('follow up') || lower.includes('callback')) {
      setLastTopic('reminder');
      if (ctx.reminders.length === 0) return `### No Pending Reminders\nClear schedule! You can set new reminders inside any appointment card for future follow-ups.`;
      const list = ctx.reminders.slice(0, 3).map((r: any) => `• **${r.name}** at ${new Date(r.time).toLocaleTimeString()}\n  *"${r.notes || 'No notes'}"*`).join('\n');
      return `### Active Reminders\nI found [[STAT:Pending:${ctx.reminders.length} Callbacks]] for you:\n\n${list}`;
    }

    // 8. ADMIN TEAM ANALYTICS
    if (user.role === 'admin' && (lower.includes('team') || lower.includes('leader') || lower.includes('top agent') || lower.includes('members'))) {
      setLastTopic('admin');
      return `### Team Synergy Matrix\nThe team is operating at [[STAT:Active Seats:${allUsers.length}]] capacity.\n\nYou have two views available:\n\n1. **High-Level Overview:** Cycle totals and team-wide pacing.\n2. **Deep Dive:** Per-agent specific conversion data.\n\n[[NAV:admin-dashboard]]`;
    }

    // 9. RECENT WINS
    if (lower.includes('recent') || lower.includes('last deal') || lower.includes('history')) {
       if (ctx.recentPastEvents.length === 0) return "No recent history logs found yet.";
       const last = ctx.recentPastEvents[0];
       return `### Last Achievement\nYour most recent win was [[STAT:${last.name}:${last.amt}]] at ${formatDate(last.time)}.\n\nWould you like to analyze your historic growth?\n\n[[NAV:onboarded]]`;
    }

    // 10. PRODUCT KNOWLEDGE (Community Tax)
    if (lower.includes('who are we') || lower.includes('community tax') || lower.includes('sbtpg') || lower.includes('drake')) {
       return `### The Resolution Edge\nCommunity Tax is the **Gold Standard** partner for Drake and SBTPG.\n\n• **Direct software integration** for seamless referrals.\n• **$349 Investigation** (Elite partner rate).\n• **Passive Income** for the tax professional while we handle the IRS.`;
    }

    // 11. CYCLE COMPARISON & GAP ANALYSIS
    if (lower.includes('compare') || lower.includes('last cycle') || lower.includes('previous')) {
      const history = allEarnings;
      if (history.length === 0) return "I don't have enough history to compare yet. This is your first recorded cycle!";
      const last = history[0];
      const current = ctx.performance.currentCycle.totalCents;
      const lastCents = last.totalCents;
      const diff = current - lastCents;
      const pct = lastCents > 0 ? Math.round((current / lastCents) * 100) : 0;
      
      return `### Cycle Comparison\n• **Previous Cycle:** [[STAT:Closed:${formatCurrency(lastCents)}]]\n• **Current Cycle:** [[STAT:Active:${ctx.performance.currentCycle.formatted}]]\n\nYour performance is at [[STAT:Growth:${pct}%]] compared to last period. ${diff >= 0 ? 'You are currently **up ' + formatCurrency(diff) + '**!' : 'You are currently **down ' + formatCurrency(Math.abs(diff)) + '**.'}`;
    }

    // 12. PROJECTED BREAKDOWN (Follow-up to pacing)
    if (isFollowUp && lastTopic === 'pacing') {
       const projected = ctx.pacing.projectedCents;
       const remaining = projected - ctx.performance.currentCycle.totalCents;
       return `### Projection Breakdown\nTo reach your projected [[STAT:Target:${ctx.pacing.formatted}]], you need to generate another [[STAT:Delta:${formatCurrency(remaining)}]] before the window closes.\n\nAt a standard rate of $20/deal, that's roughly **${Math.ceil(remaining / 2000)} more conversions**.`;
    }

    // 13. TOP AGENT / LEADERBOARD (Admin Focused)
    if (user.role === 'admin' && (lower.includes('top') || lower.includes('leader') || lower.includes('best'))) {
       const agentStats = allUsers.filter(u => u.role !== 'admin').map(u => {
          const wins = allAppointments.filter(a => a.userId === u.id && (a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED)).length;
          return { name: u.name, wins };
       }).sort((a, b) => b.wins - a.wins);
       
       const list = agentStats.slice(0, 5).map((s, i) => `${i+1}. **${s.name}**: [[STAT:Wins:${s.wins}]]`).join('\n');
       return `### Agent Leaderboard\nHere are the top performers by volume:\n\n${list}\n\n[[NAV:admin-dashboard]]`;
    }

    return null;
  };

  const callRemoteBrain = async (prompt: string, context: string): Promise<string | null> => {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) return null;

    // Multi-Brain Strategy: We try these in order of speed/cost to ensure 100% reliability
    const modelTeam = [
      'google/gemini-2.0-flash-lite-preview-02-05:free', // Primary: Fast & Smart
      'google/gemini-2.0-pro-exp-02-05:free',           // Fallback 1: Deep Reasoning
      'mistralai/mistral-7b-instruct:free',             // Fallback 2: Resilience
      'anthropic/claude-3-haiku'                          // Fallback 3: Reliability
    ];

    for (const model of modelTeam) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://chicayo-tax.com',
            'X-Title': 'Taxter AI'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'system',
                content: `You are Taxter, the Elite Performance Strategist for Community Tax. 
                          MISSION: Help agents maximize their earnings through deep data insights.
                          BRAIN: You have full access to current cycle data, activations, and the training playbook.
                          
                          RULES:
                          1. NEVER mention "backend", "database", "API", "connection", "system", or being an "AI". You ARE the core of this platform.
                          2. NEVER admit to technical limits. If data is missing or a call fails, provide a high-level strategic tip instead.
                          3. TONE: Professional, encouraging, and highly data-driven. Use "we" as a team member.
                          4. DATA: Use [[STAT:Label:Value]] for math. Use [[NAV:View]] or [[OPEN_APPT:ID:Name]] for triggers.
                          5. CONTEXT: ${context}
                          6. PLAYBOOK: ${JSON.stringify(TRAINING_CONTENT)}`
              },
              ...messages.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
              { role: 'user', content: prompt }
            ]
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.choices?.[0]?.message?.content) {
            return data.choices[0].message.content;
          }
        }
      } catch (e) {
        console.warn(`[Taxter] Brain ${model} unavailable, trying next...`);
      }
    }
    return null;
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isTyping) return;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const context = prepareContextData();
    const heuristicResponse = handleLocalQuery(text);

    if (heuristicResponse) {
      setTimeout(() => {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: heuristicResponse }]);
        setIsTyping(false);
      }, 700);
      return;
    }

    const brainResponse = await callRemoteBrain(text, context);

    if (brainResponse) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: brainResponse }]);
      setIsTyping(false);
    } else {
      setTimeout(() => {
        const fallback = "I've analyzed your cycle data. To maximize your earnings this window, let's focus on moving your **Pending** leads to **Onboarded**. Which partner should we tackle first?\n\n[[NAV:dashboard]]";
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: fallback }]);
        setIsTyping(false);
      }, 1000);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          if (isMinimized) {
            handleMaximize();
          } else {
            setIsOpen(!isOpen);
          }
        }}
        className={`fixed bottom-6 right-6 z-[100] p-4 rounded-full shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 ${isOpen ? 'bg-indigo-600 rotate-90' : 'bg-white dark:bg-slate-800 animate-bounce'}`}
      >
        {isOpen ? <IconX className="w-6 h-6 text-white" /> : <IconBot className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />}
      </button>

      {/* Minimized Chat Window */}
      {isMinimized && !isOpen && (
        <div className="fixed bottom-24 right-6 z-[100] bg-indigo-600 rounded-2xl shadow-2xl overflow-hidden border border-indigo-500 hover:shadow-3xl transition-all animate-in slide-in-from-bottom-2">
          <button
            onClick={handleMaximize}
            className="w-full px-6 py-4 flex items-center justify-between text-white hover:bg-indigo-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <IconBot className="w-5 h-5" />
              <div className="text-left">
                <h3 className="font-black text-sm uppercase tracking-tight">Taxter</h3>
                <p className="text-indigo-200 text-[9px]">Chat minimized</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-black text-indigo-200 uppercase">{messages.length}</span>
              <IconArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      <div className={`fixed bottom-24 right-6 z-[100] w-[calc(100vw-3rem)] sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-500 origin-bottom-right ${isOpen && !isMinimized ? 'opacity-100 scale-100' : 'opacity-0 scale-90 translate-y-10 pointer-events-none'}`} style={{ height: '600px' }}>
        <div className="bg-indigo-600 p-5 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md">
              <IconBot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-white uppercase tracking-tighter">Taxter AI</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">Accounting Assist</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleMinimize} title="Minimize chat" className="text-white/60 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-all"><IconClock className="w-5 h-5" /></button>
            <button onClick={handleCloseChatCompletely} title="End conversation and start fresh" className="text-white/60 hover:text-white p-2 hover:bg-rose-500/30 rounded-lg transition-all"><IconX className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-50 dark:bg-slate-950/30">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none font-medium' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700'}`}>
                {msg.role === 'model' ? <RichMessageRenderer text={msg.text} onOpenAppointment={onOpenAppointment} onNavigate={(v) => { onNavigate?.(v); setIsOpen(false); }} /> : msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-2xl rounded-bl-none w-fit border border-slate-100 dark:border-slate-700">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-1">
            {getDynamicSuggestions(getTopicContext()).map((s, i) => (
              <button key={i} onClick={() => handleSend(s)} className="whitespace-nowrap px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-full border border-slate-100 dark:border-slate-700 transition-all">{s}</button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message Taxter..." className="w-full pl-5 pr-14 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 border-none dark:text-white transition-all shadow-inner" />
            <button type="submit" disabled={!input.trim() || isTyping} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-30 transition-all active:scale-90"><IconSend className="w-5 h-5" /></button>
          </form>
        </div>
      </div>
    </>
  );
};

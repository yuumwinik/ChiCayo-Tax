
import React, { useState, useRef, useEffect } from 'react';
import { IconBot, IconSend, IconX, IconCopy, IconCheck, IconExternalLink, IconArrowRight, IconSparkles } from './Icons';
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
  user, allAppointments, allEarnings, payCycles, allUsers, onOpenAppointment, onNavigate, activeCycle, commissionRate, selfCommissionRate, referralCommissionRate, reminders
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: user.role === 'admin'
        ? `Hello Admin! I'm Taxter. I can analyze team-wide metrics and visualize revenue across cycles. How can I assist you?`
        : `Hi ${(user?.name || 'Agent').split(' ')[0]}! I'm Taxter. I track your leads, your commissions, and your performance. Ask me anything!`
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  const suggestions = user.role === 'admin'
    ? ["Team revenue this cycle", "Who is the top agent?", "Analyze team peak times"]
    : ["Daily total", "Total this week", "Coaching tips", "Recent onboards"];

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

    const lifetimeOnboarded = relevantAppointments.filter(a => a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED);
    const lifetimeEarnings = lifetimeOnboarded.reduce((sum, a) => {
      const agent = allUsers.find(u => u.id === a.userId);
      const defaultRate = (a.aeName === agent?.name) ? selfCommissionRate : commissionRate;
      return sum + (a.earnedAmount || defaultRate);
    }, 0) + lifetimeOnboarded.reduce((sum, a) => sum + (a.referralCount || 0) * referralCommissionRate, 0);

    const context = {
      timeContext: {
        nowISO: now.toISOString(),
        localTime: now.toLocaleString(),
        todayDate: now.toLocaleDateString('en-CA'),
        activeCycle: activeCycle ? {
          label: `${formatDate(activeCycle.startDate)} - ${formatDate(activeCycle.endDate)}`,
          daysRemaining: Math.ceil((new Date(activeCycle.endDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24))
        } : 'No Active Cycle'
      },
      performance: {
        currentCycle: {
          totalCents: currentCycleTotal,
          formatted: formatCurrency(currentCycleTotal),
          wins: currentCycleWins
        },
        lifetime: {
          earnings: formatCurrency(lifetimeEarnings),
          count: lifetimeOnboarded.length
        }
      },
      upcomingEvents,
      teamSummary: user.role === 'admin' ? allUsers.filter(u => u.role !== 'admin').map(u => ({
        name: u.name,
        wins: allAppointments.filter(a => a.userId === u.id && (a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED)).length
      })) : [],
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

    // 1. Revenue & Earnings (High Precision)
    if (lower.includes('earning') || lower.includes('revenue') || lower.includes('made') || lower.includes('money') || lower.includes('pay') || lower.includes('total')) {
      const cycleRev = ctx.performance.currentCycle.formatted;
      const cycleWins = ctx.performance.currentCycle.wins;
      return `### Performance Metrics\nI've analyzed your cycle data. You've generated [[STAT:Cycle Revenue:${cycleRev}]] across [[STAT:Active Wins:${cycleWins} Wins]] this period.\n\nYour lifetime achievement is currently at [[STAT:Lifetime:${ctx.performance.lifetime.earnings}]]. Would you like to view the full ledger?\n\n[[NAV:earnings-full]]`;
    }

    // 2. Upcoming Schedule (Proactive)
    if (lower.includes('upcoming') || lower.includes('scheduled') || lower.includes('next') || lower.includes('calendar') || lower.includes('future') || lower.includes('today') || lower.includes('tomorrow')) {
      if (ctx.upcomingEvents.length === 0) return "### Schedule Empty\nYou don't have any upcoming leads scheduled right now. This is a great time to start a 'Referral Activation' call block! [[NAV:dashboard]]";
      const list = ctx.upcomingEvents.slice(0, 5).map((a: any) => `• **${a.name}** at ${new Date(a.time).toLocaleString()}\n  - Stage: ${a.stage} \n  [[OPEN_APPT:${a.id}:${a.name}]]`).join('\n\n');
      return `### Your Upcoming Schedule\nI found [[STAT:Next Up:${ctx.upcomingEvents.length} Leads]] on the horizon:\n\n${list}\n\n[[NAV:calendar]]`;
    }

    // 3. Past Events & History
    if (lower.includes('past') || lower.includes('recent') || lower.includes('yesterday') || lower.includes('history') || lower.includes('last')) {
      if (ctx.recentPastEvents.length === 0) return "No recent history logs found for this cycle.";
      const list = ctx.recentPastEvents.slice(0, 5).map((a: any) => `• **${a.name}** - ${a.stage} (${a.amt})\n  [[OPEN_APPT:${a.id}:${a.name}]]`).join('\n\n');
      return `### Recent Activity Log\nHere are your last [[STAT:Count:${ctx.recentPastEvents.length} Events]]:\n\n${list}`;
    }

    // 4. Brand & Process Knowledge (SBTPG / Investigation / Compensation)
    if (lower.includes('investigation') || lower.includes('process') || lower.includes('step') || lower.includes('representation')) {
      const p = (TRAINING_CONTENT as any).theProcess;
      return `### The Resolution Process\nWe use a specialized 2-step approach to handle IRS debt:\n\n**1. ${p.step1.title}:** ${p.step1.actions[0]} and ${p.step1.actions[1]} (${p.step1.duration}).\n**2. ${p.step2.title}:** ${p.step2.actions[0]} and stopping IRS enforcement.\n\nWe negotiate based on what the client can realistically afford. [[NAV:education]]`;
    }

    if (lower.includes('drake') || lower.includes('sbtpg') || lower.includes('partner') || lower.includes('payout') || lower.includes('commission') || lower.includes('who are we')) {
      return `### Brand & Compensation\nCommunity Tax is the gold-standard partner for **SBTPG, Drake, and EPS**.\n\n• **Direct Payout:** [[STAT:Direct Partner:$400]] / [[STAT:SBTPG:$350]]\n• **Client Cost:** Investigations discounted to [[STAT:Partner Rate:$349]]\n• **Elite Status:** Nationwide authority for 15+ years.\n\n[[NAV:education]]`;
    }

    if (lower.includes('webinar') || lower.includes('ce') || lower.includes('credit') || lower.includes('training')) {
      const next = (TRAINING_CONTENT as any).webinars[0];
      return `### Upcoming Training\nOur next CE Webinar is on **${next.date}** at **${next.time}**.\n\n**Topic:** ${next.topic}\n\nYou can view the full schedule in the Education Center. [[NAV:education]]`;
    }

    // 5. Objection Handlers (The "Local Guy" / "Afford")
    if (lower.includes('objection') || lower.includes('no') || lower.includes('already') || lower.includes('local') || lower.includes('afford')) {
      const handlers = TRAINING_CONTENT.objectionHandlers;
      let response = "### Professional Objection Response\n";
      if (lower.includes('local')) {
        response += `**Objection:** 'I have a local guy.'\n\n**Rebuttal:** ${handlers[0].rebuttal}`;
      } else if (lower.includes('afford')) {
        response += `**Objection:** 'My clients can't afford this.'\n\n**Rebuttal:** ${handlers[1].rebuttal}`;
      } else {
        response += `**Objection Specialist:** 'I'll just do it myself.'\n\n**Rebuttal:** ${handlers[2].rebuttal}`;
      }
      return response;
    }

    // 6. Scripts (What to say)
    if (lower.includes('script') || lower.includes('say') || lower.includes('opening') || lower.includes('call')) {
      const script = TRAINING_CONTENT.scripts[0];
      const opening = script.sections[0].lines?.[0]?.text;
      return `### Pro-Agent Scripting\nWhen opening a call with a partner, keep it crisp:\n\n*"${opening}"*\n\nFocus on the **Official Resolution Partner** status with Drake/SBTPG. [[NAV:education]]`;
    }

    // 7. Team Summary (Admin Only)
    if (user.role === 'admin' && (lower.includes('team') || lower.includes('top agent') || lower.includes('members') || lower.includes('synergy'))) {
      const sorted = [...ctx.teamSummary].sort((a: any, b: any) => b.wins - a.wins);
      const top = sorted[0];
      return `### Team Performance Report\nThe team is firing on all cylinders. \n\n• **Front Runner:** [[STAT:Top Performer:${top?.name || 'N/A'}]] at [[STAT:Wins:${top?.wins || 0}]]\n• **Capacity Tracking:** [[STAT:Active Agents:${ctx.teamSummary.length}]]\n\nWould you like to analyze the full Synergy Matrix?\n\n[[NAV:admin-dashboard]]`;
    }

    // 8. Cycle info
    if (lower.includes('cycle') || lower.includes('deadline') || lower.includes('remaining') || lower.includes('when') || lower.includes('active')) {
      return `### Current Pay Cycle\nWe are currently in the **${ctx.timeContext.activeCycle.label}** window.\n\nYou have [[STAT:Time Remaining:${ctx.timeContext.activeCycle.daysRemaining} Days]] to finalize your onboardings and activations. Grind hard!`;
    }

    return null;
  };

  const callOllama = async (prompt: string, context: string): Promise<string | null> => {
    try {
      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          model: 'llama3',
          messages: [
            {
              role: 'system',
              content: `You are Taxter, the elite Accounting & Performance Strategist for Community Tax.
                        GOAL: Provide clear, conversational, and expert-level insights by analyzing the agent's LIVE DATABASE and our COMPANY PLAYBOOK.
                        TONE: Highly conversational, encouraging, professional but approachable. Use "we" as you are part of their team.
                        KNOWLEDGE: You know every client name, every dollar earned, every upcoming reminder, and every partner onboarding.
                        RULES:
                        1. ALWAYS use [[STAT:Label:Value]] for data points to make them pop.
                        2. ALWAYS use [[NAV:View]] or [[OPEN_APPT:ID:Name]] to offer direct helpful actions.
                        3. NEVER mention system limits or "context data". Just "I've analyzed your cycle..." or "Looking at your calendar...".
                        4. DATA INSIGHTS: Connect metrics. E.g., if they have many "Activated" partners but low referrals, suggest a follow-up script.
                        5. LIVE CONTEXT: ${context}
                        6. TRAINING MANUAL: ${JSON.stringify(TRAINING_CONTENT)}`
            },
            ...messages.slice(-4).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
            { role: 'user', content: prompt }
          ],
          stream: false
        })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.message.content;
    } catch (e) {
      console.warn("[Taxter] Ollama not reached.", e);
      return null;
    }
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
      }, 800);
      return;
    }

    const ollamaResponse = await callOllama(text, context);

    if (ollamaResponse) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: ollamaResponse }]);
      setIsTyping(false);
    } else {
      setTimeout(() => {
        const fallback = "I'm focusing on your active cycle and the Community Tax playbook. Ask me about your revenue, the 2-step investigation process, or for a script to handle a specific partner objection.";
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: fallback }]);
        setIsTyping(false);
      }, 1000);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[100] p-4 rounded-full shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 ${isOpen ? 'bg-indigo-600 rotate-90' : 'bg-white dark:bg-slate-800 animate-bounce'}`}
      >
        {isOpen ? <IconX className="w-6 h-6 text-white" /> : <IconBot className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />}
      </button>

      <div className={`fixed bottom-24 right-6 z-[100] w-[calc(100vw-3rem)] sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-500 origin-bottom-right ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 translate-y-10 pointer-events-none'}`} style={{ height: '600px' }}>
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
          <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white p-2"><IconX className="w-5 h-5" /></button>
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
            {suggestions.map((s, i) => (
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

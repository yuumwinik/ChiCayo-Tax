
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
    if (!ctx) return ["Current Pacing", "My Stats", "How do I earn?"];
    
    const hasActivations = ctx.performance.currentCycle.activationCount > 0;
    const hasOnboards = ctx.performance.currentCycle.wins > 0;
    const latestPartner = ctx.partners.onboarded[0]?.name;
    
    if (user.role === 'admin') {
      chips.push("Team Pacing", "Top Agent", "Revenue Split", "Active Growth");
    } else {
      if (latestPartner) chips.push(`Status of ${latestPartner}`);
      if (hasOnboards) chips.push("Current Cycle Earnings");
      if (ctx.performance.history.length > 0) chips.push("Past Earnings");
      if (hasActivations) chips.push("Activation Proof");
      
      if (chips.length < 4) chips.push("My Stats", "Commission Math");
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

    // Specific Partners Summary
    const onboardedPartners = relevantAppointments
      .filter(a => a.stage === AppointmentStage.ONBOARDED || a.stage === AppointmentStage.ACTIVATED)
      .sort((a, b) => new Date(b.onboardedAt || 0).getTime() - new Date(a.onboardedAt || 0).getTime())
      .map(a => ({
        id: a.id,
        name: a.name,
        date: formatDate(a.onboardedAt || a.scheduledAt),
        status: a.stage === AppointmentStage.ACTIVATED ? 'Activated' : 'Pending Activation',
        earnings: formatCurrency((a.earnedAmount || 0) + ((a.referralCount || 0) * referralCommissionRate))
      }));

    // Historical Cycle Breakdown
    const cycleHistory = allEarnings.map(win => ({
      label: `${formatDate(win.startDate)} - ${formatDate(win.endDate)}`,
      total: formatCurrency(win.totalCents),
      count: win.onboardedCount,
      status: win.isClosed ? 'Closed' : 'Active'
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
          if (d >= s && d <= e) {
            const agent = allUsers.find(u => u.id === a.userId);
            const defaultRate = (a.aeName === agent?.name) ? selfCommissionRate : commissionRate;
            currentCycleTotal += (a.earnedAmount || defaultRate);
            currentCycleWins++;
          }
        }
      });
    }

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
    const lifetimeEarnings = lifetimeOnboarded.reduce((sum, a) => sum + (a.earnedAmount || 0), 0) + lifetimeIncentives;

    const daysElapsed = Math.max(1, Math.floor((nowTimestamp - (activeCycle ? new Date(activeCycle.startDate).getTime() : nowTimestamp)) / (1000 * 60 * 60 * 24)));
    const totalDays = activeCycle ? Math.ceil((new Date(activeCycle.endDate).getTime() - new Date(activeCycle.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 1;

    return JSON.stringify({
      user: { name: user.name, role: user.role },
      timeContext: {
        now: now.toLocaleString(),
        daysElapsed,
        daysRemaining: activeCycle ? Math.ceil((new Date(activeCycle.endDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24)) : 0,
        activeCycle: activeCycle ? { label: `${formatDate(activeCycle.startDate)} - ${formatDate(activeCycle.endDate)}` } : null
      },
      performance: {
        currentCycle: {
          total: formatCurrency(currentCycleTotal),
          cents: currentCycleTotal,
          wins: currentCycleWins,
          activations: currentCycleActivationCount
        },
        history: cycleHistory,
        lifetime: { total: formatCurrency(lifetimeEarnings), count: lifetimeOnboarded.length }
      },
      partners: {
        onboarded: onboardedPartners.slice(0, 15)
      },
      pacing: {
        projected: formatCurrency(Math.round((currentCycleTotal / daysElapsed) * totalDays))
      }
    });
  };

  const handleLocalQuery = (text: string): string | null => {
    const lower = text.toLowerCase();
    const rawCtx = prepareContextData();
    const ctx = JSON.parse(rawCtx);
    const isFollowUp = lastTopic !== null && (lower.includes('show') || lower.includes('more') || lower.includes('tell') || lower.includes('who') || lower.includes('what'));

    // 1. PROJECTED PAYOUT & PACING
    if (lower.includes('project') || lower.includes('pace') || lower.includes('forecast')) {
      setLastTopic('pacing');
      return `### Financial Projection\nWe are currently on pace for a cycle finish of **${ctx.pacing.projected}**.\n\n[[STAT:Current:${ctx.performance.currentCycle.total}]]\n[[STAT:Projected:${ctx.pacing.projected}]]\n\nYou have **${ctx.timeContext.daysRemaining} days** left to push your numbers higher.`;
    }

    // 2. PARTNER STATUS SEARCH
    const mentionedPartner = ctx.partners.onboarded.find((p: any) => lower.includes(p.name.toLowerCase()));
    if (mentionedPartner || (lower.includes('partner') && lower.includes('status'))) {
      setLastTopic('partners');
      const p = mentionedPartner || ctx.partners.onboarded[0];
      if (!p) return "I don't see any onboarded partners in your records yet. Let's get that first win!";
      return `### Partner Intelligence\n**${p.name}**\n• **Status:** ${p.status}\n• **Onboarded:** ${p.date}\n• **Total Value:** [[STAT:Earnings:${p.earnings}]]\n\n${p.status === 'Activated' ? 'This partner is a Premium Asset.' : 'We should focus on getting their first referral to lock in the activation bonus.'}`;
    }

    // 3. CURRENT CYCLE EARNINGS
    if (lower.includes('current cycle') || (lower.includes('this') && lower.includes('cycle')) || lower.includes('current earning')) {
      setLastTopic('earning');
      return `### Cycle Breakdown\nIn the current window (**${ctx.timeContext.activeCycle?.label || 'Active'}**), you've secured:\n\n• **Total Volume:** [[STAT:Revenue:${ctx.performance.currentCycle.total}]]\n• **Deals Closed:** [[STAT:Wins:${ctx.performance.currentCycle.wins}]]\n• **Activations:** [[STAT:Active:${ctx.performance.currentCycle.activations}]]\n\nYou're currently at **${ctx.performance.currentCycle.total}** for this period.`;
    }

    // 4. PAST EARNINGS / HISTORY
    if (lower.includes('past') || lower.includes('history') || lower.includes('last cycle') || lower.includes('previous')) {
      setLastTopic('history');
      if (ctx.performance.history.length === 0) return "I don't have enough historical data to show past cycles yet. Keep crushing it!";
      const list = ctx.performance.history.slice(0, 3).map((h: any) => `• **${h.label}**: ${h.total} (${h.count} deals)`).join('\n');
      return `### Historical Performance\nHere are your most recent completed cycles:\n\n${list}\n\n[[NAV:earnings-full]]`;
    }

    // 5. LIFETIME / TOTALS
    if (lower.includes('lifetime') || lower.includes('total') || lower.includes('overall')) {
      setLastTopic('lifetime');
      return `### Legacy Metrics\nSince you started, you've generated a total of:\n\n[[STAT:Lifetime Total:${ctx.performance.lifetime.total}]]\n[[STAT:Total Wins:${ctx.performance.lifetime.count} Partners]]\n\nThis is a solid track record. Want to see your full trophy collection?\n\n[[NAV:onboarded]]`;
    }

    // 6. COMMISSION RULES
    if (lower.includes('commission') || lower.includes('math') || lower.includes('rate') || lower.includes('how much')) {
      return `### Earning Roadmap\nYour current commission tiers are:\n\n• **Standard Onboard:** [[STAT:Rate:$20.00]]\n• **Expert Self-Onboard:** [[STAT:Rate:$21.00]]\n• **Activation Momentum:** [[STAT:Bonus:$10.00]]\n\nWould you like me to calculate your projection based on these rates?`;
    }

    // 7. DATES & WINDOWS
    if (lower.includes('date') || lower.includes('when') || lower.includes('window') || lower.includes('remaining')) {
      return `### Cycle Timeline\nThe current window is scheduled as follows:\n\n• **Cycle Label:** ${ctx.timeContext.activeCycle?.label || 'Active'}\n• **Time Spent:** [[STAT:Days Elapsed:${ctx.timeContext.daysElapsed} days]]\n• **Time Remaining:** [[STAT:Days Left:${ctx.timeContext.daysRemaining} days]]\n\nWe specify all earnings to the exact date the referral or onboard was recorded.`;
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
                          1. NEVER mention technical jargon like "backend", "API", or "database".
                          2. STYLE: Keep responses under 3-4 short sentences. Use bolding for impact.
                          3. VISUALS: Mandatory use of [[STAT:Label:Value]] for any metric.
                          4. NAVIGATION: Use [[NAV:View]] or [[OPEN_APPT:ID:Name]] to guide the user.
                          5. DATA GROUNDING: Use the provided JSON context as the absolute source of truth.
                          6. PERSONA: You are a high-level Accounting Strategist. You help agents get RICH.
                          
                          CONTEXT: ${context}
                          PLAYBOOK: ${JSON.stringify(TRAINING_CONTENT)}`
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


import React, { useState, useRef, useEffect } from 'react';
import { IconBot, IconSend, IconX, IconCopy, IconCheck, IconExternalLink, IconArrowRight, IconSparkles } from './Icons';
import { Appointment, EarningWindow, PayCycle, User, View, AppointmentStage } from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { formatCurrency } from '../utils/dateUtils';
import { calculateSuccessProbability, generateCoachingInsights } from '../utils/analyticsUtils';

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
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const RichMessageRenderer = ({ text, onOpenAppointment, onNavigate }: { text: string, onOpenAppointment?: (id: string) => void, onNavigate?: (view: View) => void }) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedText(txt);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const parts = text.split(/(\[\[(?:COPY_PHONE|OPEN_APPT|NAV|STAT):[^\]]+\]\])/g);

  return (
    <div className="space-y-2">
      <span className="whitespace-pre-wrap leading-relaxed">
        {parts.map((part, i) => {
          if (part.startsWith('[[COPY_PHONE:')) {
            const content = part.replace('[[COPY_PHONE:', '').replace(']]', '');
            const isCopied = copiedText === content;
            return (
              <button key={i} onClick={() => handleCopy(content)} className="inline-flex items-center gap-1.5 mx-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-200 dark:border-indigo-800">
                {isCopied ? <IconCheck className="w-3 h-3" /> : <IconCopy className="w-3 h-3" />}
                {content}
              </button>
            );
          } else if (part.startsWith('[[OPEN_APPT:')) {
            const raw = part.replace('[[OPEN_APPT:', '').replace(']]', '');
            const [id, name] = raw.split(':', 2);
            return (
              <button key={i} onClick={() => onOpenAppointment && onOpenAppointment(id)} className="inline-flex items-center gap-1.5 mx-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors border border-emerald-200 dark:border-emerald-800">
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
              <button key={i} onClick={() => onNavigate && onNavigate(view)} className="inline-flex items-center gap-2 my-2 mr-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-200 dark:shadow-none">
                {label} <IconArrowRight className="w-3 h-3" />
              </button>
            );
          } else if (part.startsWith('[[STAT:')) {
            const raw = part.replace('[[STAT:', '').replace(']]', '');
            const [label, value] = raw.split(':', 2);
            return (
              <span key={i} className="inline-flex flex-col items-start mx-1 my-1 align-middle bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 shadow-sm min-w-[100px]">
                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-black mb-0.5">{label}</span>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{value}</span>
              </span>
            );
          }
          return part;
        })}
      </span>
    </div>
  );
};

export const TaxterChat: React.FC<TaxterChatProps> = ({
  user, allAppointments, allEarnings, payCycles, allUsers, onOpenAppointment, onNavigate, activeCycle, commissionRate, selfCommissionRate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: user.role === 'admin'
        ? `Hello Admin! I'm Taxter. I can analyze team-wide metrics and visualize revenue across cycles. How can I assist you?`
        : `Hi ${user.name.split(' ')[0]}! I'm Taxter. I track your leads, your commissions, and your performance. Ask me anything!`
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

    let currentCycleTotal = 0;
    let currentCycleWins = 0;
    if (activeCycle) {
      const s = new Date(activeCycle.startDate).getTime();
      const e = new Date(activeCycle.endDate).setHours(23, 59, 59, 999);
      relevantAppointments.forEach(a => {
        if (a.stage === AppointmentStage.ONBOARDED) {
          const d = new Date(a.onboardedAt || a.scheduledAt).getTime();
          if (d >= s && d <= e) {
            const agent = allUsers.find(u => u.id === a.userId);
            const defaultRate = (a.aeName === agent?.name) ? selfCommissionRate : commissionRate;
            currentCycleTotal += (a.earnedAmount || defaultRate);
            currentCycleWins++;
          }
        }
      });
    }

    // Historical Cycle Summary (Last 12 Cycles)
    const history = payCycles
      .filter(c => new Date(c.endDate).getTime() < now.getTime())
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
      .slice(0, 12)
      .map(c => {
        const cycleAppts = relevantAppointments.filter(a => {
          const d = new Date(a.onboardedAt || a.scheduledAt).getTime();
          return d >= new Date(c.startDate).getTime() && d <= new Date(c.endDate).setHours(23, 59, 59, 999);
        });
        const cycleWins = cycleAppts.filter(a => a.stage === AppointmentStage.ONBOARDED);
        const cycleRev = cycleWins.reduce((sum, a) => {
          const agent = allUsers.find(u => u.id === a.userId);
          const defaultRate = (a.aeName === agent?.name) ? selfCommissionRate : commissionRate;
          return sum + (a.earnedAmount || defaultRate) + (a.referralCount || 0) * 200;
        }, 0);
        return {
          id: c.id,
          label: `${new Date(c.startDate).toLocaleDateString()} - ${new Date(c.endDate).toLocaleDateString()}`,
          wins: cycleWins.length,
          revenue: formatCurrency(cycleRev),
          revCents: cycleRev
        };
      });

    const lifetimeOnboarded = relevantAppointments.filter(a => a.stage === AppointmentStage.ONBOARDED);

    const referralData = lifetimeOnboarded.filter(a => (a.referralCount || 0) > 0).map(p => ({
      name: p.name,
      count: p.referralCount,
      last: p.lastReferralAt
    })).sort((a, b) => (b.count || 0) - (a.count || 0));

    const lifetimeEarnings = lifetimeOnboarded.reduce((sum, a) => {
      const agent = allUsers.find(u => u.id === a.userId);
      const defaultRate = (a.aeName === agent?.name) ? selfCommissionRate : commissionRate;
      return sum + (a.earnedAmount || defaultRate);
    }, 0) + lifetimeOnboarded.reduce((sum, a) => sum + (a.referralCount || 0) * (200), 0);

    const context = {
      meta: {
        currentUser: { id: user.id, name: user.name, role: user.role },
        nowISO: now.toISOString(),
        todayDate: now.toLocaleDateString('en-CA'),
        activeRules: { standard: commissionRate, self: selfCommissionRate },
        activeCycle: activeCycle ? {
          id: activeCycle.id,
          start: activeCycle.startDate,
          end: activeCycle.endDate,
          currentTotalCents: currentCycleTotal,
          currentTotalFormatted: formatCurrency(currentCycleTotal),
          winCount: currentCycleWins
        } : null,
        lifetime: {
          earnings: formatCurrency(lifetimeEarnings),
          onboardedCount: lifetimeOnboarded.length,
          totalApps: relevantAppointments.length,
          topReferralPartners: referralData.slice(0, 3)
        },
        historicalPerformance: history
      },
      recentAppointments: relevantAppointments.sort((a, b) => new Date(b.onboardedAt || b.scheduledAt).getTime() - new Date(a.onboardedAt || a.scheduledAt).getTime()).slice(0, 50).map(a => ({
        name: a.name, time: a.onboardedAt || a.scheduledAt, stage: a.stage, ae: a.aeName, amt: formatCurrency(a.earnedAmount || 0)
      })),
      teamMembers: user.role === 'admin' ? allUsers.filter(u => u.role !== 'admin').map(u => ({
        name: u.name,
        role: u.role,
        wins: allAppointments.filter(a => a.userId === u.id && a.stage === AppointmentStage.ONBOARDED).length
      })) : []
    };
    return JSON.stringify(context);
  };
  const handleSend = async (text: string = input) => {
    if (!text.trim() || isTyping) return;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
      const genAI = new GoogleGenerativeAI(apiKey);

      const coaching = generateCoachingInsights(allAppointments);

      const chatHistory = messages.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Taxter'}: ${m.text}`).join('\n');

      const systemPrompt = `You are Taxter, the proactive performance coach and statistical AI for ChiCayo Tax.
        GOAL: Provide instant data-driven insights and suggest high-value habits.
        
        CONTEXT AWARENESS:
        - Recent Conversation: ${chatHistory}
        - Coaching Insights: ${coaching.join(' | ')}
        - Last 12 Cycles: ${prepareContextData()}

        CAPABILITIES:
        - Predict 'Success Probability' using peak time data. 
        - Track daily totals and historical growth.
        - Give habit advice like "Follow up faster on transfers" based on Coaching Insights.

        FORMATTING: Use [[STAT:Label:Value]] for key metrics. Use [[NAV:View]] or [[OPEN_APPT:ID:Name]] to assist navigation.
        STYLE: Professional, encouraging, and razor-sharp with numbers.`;

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent(text);
      const response = result.response;
      const responseText = response.text();

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: responseText || "I was unable to calculate that right now." }]);
    } catch (e) {
      console.error("AI Error:", e);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: "I'm having trouble reaching my processing center. Please ensure your API Key is valid." }]);
    } finally { setIsTyping(false); }
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

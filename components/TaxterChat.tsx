import React, { useState, useRef, useEffect } from 'react';
import { IconBot, IconSend, IconX, IconCopy, IconCheck, IconExternalLink, IconArrowRight } from './Icons';
import { Appointment, EarningWindow, PayCycle, User, View } from '../types';
import { GoogleGenAI } from "@google/genai";

interface TaxterChatProps {
  user: User;
  allAppointments: Appointment[];
  allEarnings: EarningWindow[];
  payCycles: PayCycle[];
  allUsers: User[];
  onOpenAppointment?: (id: string) => void;
  onNavigate?: (view: View) => void;
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

  // Regex to match our custom tags
  const parts = text.split(/(\[\[(?:COPY_PHONE|OPEN_APPT|NAV|STAT):[^\]]+\]\])/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('[[COPY_PHONE:')) {
          const content = part.replace('[[COPY_PHONE:', '').replace(']]', '');
          const isCopied = copiedText === content;
          return (
            <button 
              key={i} 
              onClick={() => handleCopy(content)}
              className="inline-flex items-center gap-1.5 mx-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-100 transition-colors border border-indigo-200 dark:border-indigo-800"
            >
              {isCopied ? <IconCheck className="w-3 h-3" /> : <IconCopy className="w-3 h-3" />}
              {content}
            </button>
          );
        } else if (part.startsWith('[[OPEN_APPT:')) {
          const raw = part.replace('[[OPEN_APPT:', '').replace(']]', '');
          const [id, name] = raw.split(':', 2);
          return (
            <button 
              key={i} 
              onClick={() => onOpenAppointment && onOpenAppointment(id)}
              className="inline-flex items-center gap-1.5 mx-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-100 transition-colors border border-emerald-200 dark:border-emerald-800"
            >
              <IconExternalLink className="w-3 h-3" />
              View {name || 'Details'}
            </button>
          );
        } else if (part.startsWith('[[NAV:')) {
           const view = part.replace('[[NAV:', '').replace(']]', '') as View;
           const label = view === 'earnings-full' ? 'Earnings' : view === 'user-analytics' ? 'My Stats' : view.charAt(0).toUpperCase() + view.slice(1);
           return (
              <button
                key={i}
                onClick={() => onNavigate && onNavigate(view)}
                className="inline-flex items-center gap-1.5 mx-1 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                 Go to {label} <IconArrowRight className="w-3 h-3" />
              </button>
           );
        } else if (part.startsWith('[[STAT:')) {
           const raw = part.replace('[[STAT:', '').replace(']]', '');
           const [label, value] = raw.split(':', 2);
           return (
              <span key={i} className="inline-block mx-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 shadow-sm">
                 <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
                 <span className="block text-sm font-bold text-indigo-600 dark:text-indigo-400">{value}</span>
              </span>
           );
        }
        return part;
      })}
    </span>
  );
};

export const TaxterChat: React.FC<TaxterChatProps> = ({ 
  user, 
  allAppointments, 
  allEarnings, 
  payCycles, 
  allUsers,
  onOpenAppointment,
  onNavigate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'welcome', 
      role: 'model', 
      text: user.role === 'admin' 
        ? `Hello Admin! I'm Taxter. I can analyze team metrics, track cycle payouts, and compare agent performance from the live database. How can I help?`
        : `Hi ${user.name.split(' ')[0]}! I'm Taxter. I'm connected to your live stats. Ask me about your earnings, schedule, or transfers!` 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isTyping]);

  const getSuggestedPrompts = () => {
    if (user.role === 'admin') {
      return [
        "Total team earnings?",
        "Top performing agent?",
        "Payout for current cycle?",
        "Compare onboarded stats"
      ];
    }
    return [
      "How much have I earned?",
      "Any appointments due today?",
      "Onboarded count?",
      "My Live Transfers?"
    ];
  };

  const prepareContextData = () => {
    const relevantAppointments = user.role === 'admin' 
      ? allAppointments 
      : allAppointments.filter(a => a.userId === user.id);

    const relevantEarnings = user.role === 'admin' 
      ? allEarnings 
      : allEarnings.filter(e => e.userId === user.id);

    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // AE Breakdown
    const aeStats: Record<string, number> = {};
    relevantAppointments.filter(a => a.type === 'transfer' && a.stage === 'ONBOARDED' && a.aeName).forEach(a => {
        aeStats[a.aeName!] = (aeStats[a.aeName!] || 0) + 1;
    });

    // Optimize Context Size: Limit to recent appointments and earnings to avoid token limits
    // Sort by scheduledAt desc and take top 100
    const optimizedAppointments = relevantAppointments
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
        .slice(0, 100)
        .map(a => ({
            id: a.id,
            name: a.name,
            phone: a.phone,
            formattedLocalTime: new Date(a.scheduledAt).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }),
            stage: a.stage,
            type: a.type || 'appointment',
            aeName: a.aeName,
            earned: a.earnedAmount,
            ownerId: a.userId
        }));

    const optimizedEarnings = relevantEarnings
        .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
        .slice(0, 20);

    const context = {
      meta: {
        currentUser: { id: user.id, name: user.name, role: user.role },
        currentDateTimeISO: now.toISOString(),
        tomorrowDateISO: tomorrow.toISOString().split('T')[0],
        userTimeZone: userTimeZone
      },
      activePayCycles: payCycles,
      aePerformanceSummary: aeStats,
      appointments: optimizedAppointments,
      earningsHistory: optimizedEarnings,
      teamMembers: user.role === 'admin' ? allUsers.map(u => ({ id: u.id, name: u.name })) : []
    };
    
    return JSON.stringify(context);
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemPrompt = `
        You are Taxter, a friendly and precise accounting AI assistant for ChiCayo Tax.
        ChiCayo is a PWA-first appointment tracker for call-center agents.
        
        DATA SOURCE:
        - You have access to the LIVE backend Supabase database records provided in the JSON context.
        - You are analyzing real-time agent activities, earnings, and appointments.
        - The 'appointments' list in context is limited to the 100 most recent records for performance.
        
        PERSONA:
        - Friendly, encouraging, professional.
        - Use the user's first name occasionally.
        - Be concise but helpful.
        
        KEY RULES:
        1. **Admin Logs:** If an appointment has an 'aeName' that matches the Admin or a Closer, but the 'ownerId' is different, that means the Admin logged it ON BEHALF of the owner. The credit goes to the 'ownerId' agent.
        2. **Earnings:** When calculating earnings, sum the 'earned' property of ONBOARDED appointments. If 'earned' is missing, assume 200 cents.
        3. **Cycles:** Always respect the 'activePayCycles' dates when asked about "Current Cycle".
        4. **Time Accuracy:** The 'appointments' list contains a 'formattedLocalTime' field. **ALWAYS** use this string when mentioning times to the user. Do NOT attempt to convert the ISO string or do timezone math yourself. The 'formattedLocalTime' is pre-calculated to match the user's dashboard perfectly.
        
        RICH UI ACTIONS (Use these!):
        1. [[COPY_PHONE:123-456-7890]] -> Renders a copy button.
        2. [[OPEN_APPT:id:Name]] -> Renders a view details button.
        3. [[NAV:view_id]] -> Renders a navigation button. Valid IDs: 'dashboard', 'calendar', 'earnings-full', 'onboarded', 'user-analytics'.
        4. [[STAT:Label:Value]] -> Renders a styled stat pill. Example: [[STAT:Earnings:$200]]
        
        Context Data:
        ${prepareContextData()}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: text,
        config: { systemInstruction: systemPrompt },
      });

      const replyText = response.text || "I'm having trouble calculating that right now.";
      
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: replyText }]);

    } catch (error) {
      console.error("Taxter Error:", error);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: "Connection error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center
          ${isOpen ? 'bg-indigo-600 rotate-90' : 'bg-white dark:bg-slate-800 animate-bounce'}
        `}
      >
        {isOpen ? <IconX className="w-6 h-6 text-white" /> : <IconBot className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />}
      </button>

      <div 
        className={`fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom-right
          ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none'}
        `}
        style={{ height: '500px', maxHeight: '80vh' }}
      >
        <div className="bg-indigo-600 p-4 flex items-center gap-3">
           <div className="bg-white/20 p-2 rounded-xl"><IconBot className="w-6 h-6 text-white" /></div>
           <div><h3 className="font-bold text-white text-lg">Taxter AI</h3><p className="text-indigo-200 text-xs">Accounting Assistant</p></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-50 dark:bg-slate-950/50">
           {messages.map((msg) => (
             <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm
                   ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700'}
                 `}>
                 {msg.role === 'model' ? <RichMessageRenderer text={msg.text} onOpenAppointment={onOpenAppointment} onNavigate={onNavigate} /> : msg.text}
               </div>
             </div>
           ))}
           
           {/* TYPING INDICATOR */}
           {isTyping && (
             <div className="flex justify-start">
               <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
               </div>
             </div>
           )}
           
           <div ref={messagesEndRef} />
        </div>

        {!isTyping && (
           <div className="px-4 pb-2 pt-2 flex gap-2 overflow-x-auto no-scrollbar">
              {getSuggestedPrompts().map((prompt, i) => (
                <button key={i} onClick={() => handleSend(prompt)} className="whitespace-nowrap px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-100 dark:border-indigo-800">{prompt}</button>
              ))}
           </div>
        )}

        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
           <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Taxter anything..." className="w-full pl-4 pr-12 py-3 bg-slate-100 dark:bg-slate-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
              <button type="submit" disabled={!input.trim() || isTyping} className="absolute right-1.5 top-1.5 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><IconSend className="w-4 h-4" /></button>
           </form>
        </div>
      </div>
    </>
  );
};
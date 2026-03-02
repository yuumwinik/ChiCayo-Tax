
import React, { useState, useEffect, useRef } from 'react';
import { TRAINING_CONTENT, ScriptLine, ScriptSection } from '../utils/trainingData';
import {
    IconBook,
    IconChevronDown,
    IconChevronUp,
    IconCopy,
    IconCheck,
    IconSparkles,
    IconBriefcase,
    IconInfo,
    IconArrowRight,
    IconMic,
    IconMicOff,
    IconX,
    IconSend,
    IconBot,
    IconActivity,
    IconSidebarToggle,
    IconLayout
} from './Icons';
import { RichMessageRenderer } from './TaxterChat';
import { formatCurrency } from '../utils/dateUtils';
import { useUser } from '../contexts/UserContext';

interface Message {
    id: string;
    role: 'user' | 'model' | 'live';
    text: string;
}

export const EducationCenter: React.FC = () => {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<'scripts' | 'info' | 'faq' | 'battlecard'>('scripts');
    const [expandedSections, setExpandedSections] = useState<string[]>(['onboard_script-intro']);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Assistant State
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'model', text: `Welcome back, **${user?.name || 'Agent'}**. I'm your AI Performance Coach. I'm listening to your cycle and the training manual. Start 'Live Assist' during a call for real-time tips.` }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const toggleSection = (id: string) => {
        setExpandedSections(prev =>
            prev.includes(id) ? [] : [id]
        );
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleLocalQuery = (text: string): string | null => {
        const lower = text.toLowerCase();

        // 1. Script Lookups
        if (lower.includes('script') || lower.includes('say') || lower.includes('opening') || lower.includes('call')) {
            const script = TRAINING_CONTENT.scripts[0];
            const opening = script.sections[0].lines?.[0]?.text;
            return `### Pro-Agent Scripting\nWhen opening a call with a partner, keep it crisp:\n\n*"${opening}"*\n\nFocus on the **Official Resolution Partner** status with Drake/SBTPG. [[NAV:education]]`;
        }

        // 2. Product/Process/Partner Details
        if (lower.includes('investigation') || lower.includes('process') || lower.includes('representation') || lower.includes('step')) {
            const p = (TRAINING_CONTENT as any).theProcess;
            return `### The Resolution Process\nWe handle IRS debt in two key stages:\n\n**1. ${p.step1.title}:** ${p.step1.actions[0]} and ${p.step1.actions[1]}.\n**2. ${p.step2.title}:** ${p.step2.actions[0]} and stopping IRS enforcement.\n\nThis makes us a true **Full-Service Resolution Department** for our partners.`;
        }

        if (lower.includes('sbtpg') || lower.includes('drake') || lower.includes('partnership') || lower.includes('commission')) {
            return `### Partner Knowledge\nCommunity Tax is the direct partner for **SBTPG, Drake, and EPS**.\n\n- **Requirement:** Debt must be [[STAT:IRS/State Debt:$7,000+]]\n- **Compensation:** $350 - $400 depending on the integrated channel.\n- **Direct Benefit:** We provide CE credits and monthly webinars.`;
        }

        // 3. Objections
        if (lower.includes('objection') || lower.includes('no') || lower.includes('cost') || lower.includes('expensive')) {
            const handlers = TRAINING_CONTENT.objectionHandlers;
            return `### Handling Objections\nCommon hurdle: "It's too expensive."\n\n**Response:** ${handlers[1].rebuttal}`;
        }

        return null;
    };

    const callOllama = async (prompt: string): Promise<string | null> => {
        try {
            const res = await fetch('http://localhost:11434/api/chat', {
                method: 'POST',
                body: JSON.stringify({
                    model: 'llama3',
                    messages: [
                        {
                            role: 'system',
                            content: `You are the master Performance Coach for Community Tax.
                            GOAL: Masterfully guide agents through scripts, the 2-step resolution process, and partner compensation.
                            KNOWLEDGE: You have access to the full training manual (scripts, compensation, process) AND the user's current performance data.
                            RULES: Never mention being in 'Local Mode' or system limitations. You are simply the master coach.
                            TRAINING MANUAL: ${JSON.stringify(TRAINING_CONTENT)}`
                        },
                        ...messages.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
                        { role: 'user', content: prompt }
                    ],
                    stream: false
                })
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.message.content;
        } catch (e) {
            console.warn("[Coach] Ollama not reached.", e);
            return null;
        }
    };

    const handleSend = async (text: string = input) => {
        if (!text.trim() || isTyping) return;
        const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        const localResponse = handleLocalQuery(text);

        if (localResponse) {
            setTimeout(() => {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: localResponse }]);
                setIsTyping(false);
            }, 800);
            return;
        }

        const ollamaResponse = await callOllama(text);

        if (ollamaResponse) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: ollamaResponse }]);
            setIsTyping(false);
        } else {
            setTimeout(() => {
                const fallback = "I'm ready to help you master our process. Try asking about our **2-step investigation**, **partner commissions**, or for a specific **script** from the tabs above.";
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: fallback }]);
                setIsTyping(false);
            }, 1000);
        }
    };

    // Live Listening 
    const recognitionRef = useRef<any>(null);

    const toggleListening = () => {
        if (!isListening) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            if (!SpeechRecognition) {
                alert("Speech recognition is not supported in this browser. Please use Chrome.");
                return;
            }

            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                const results = event.results;
                const lastResult = results[results.length - 1];

                if (lastResult.isFinal) {
                    const transcript = lastResult[0].transcript.toLowerCase();
                    console.log("[Live Assist] Heard:", transcript);

                    // Robust Keyword Detection
                    const keywords = [
                        { keys: ["commission", "how much", "pay me", "reward"], query: "Tell me about SBTPG and Drake commissions for partners." },
                        { keys: ["local cpa", "local guy", "my own", "already have"], query: "How do I handle the 'Local CPA' objection?" },
                        { keys: ["cost", "expensive", "how much", "fee"], query: "What is the pricing for the investigation and resolution phases?" },
                        { keys: ["investigation", "step 1", "first step"], query: "Explain Phase 1: Investigation process in detail." },
                        { keys: ["sbtpg", "drake", "pathward", "eps"], query: "What are the benefits of the SBTPG and Drake integration?" },
                        { keys: ["owes", "debt", "irs", "state"], query: "What is the minimum debt requirement for a referral?" }
                    ];

                    for (const kw of keywords) {
                        if (kw.keys.some(k => transcript.includes(k))) {
                            handleSend(`[LIVE ASSIST] Detected: "${transcript}". ${kw.query}`);
                            break;
                        }
                    }
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech Recognition Error:", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current.start();
            setIsListening(true);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'live', text: "Active Listening... Talk naturally to receive tips." }]);
        } else {
            recognitionRef.current?.stop();
            setIsListening(false);
        }
    };

    const renderScriptLine = (line: ScriptLine, index: number, sectionId: string) => {
        const lineId = `${sectionId}-line-${index}`;
        const isCopied = copiedId === lineId;

        if (line.role === 'note') {
            return (
                <div key={lineId} className="bg-amber-50/50 dark:bg-amber-900/10 border-l-4 border-amber-400 p-4 rounded-r-2xl italic text-xs text-amber-700 dark:text-amber-300">
                    {line.text}
                </div>
            );
        }

        const processedText = line.text
            .replace(/\[User Name\]/g, user?.name || 'an expert')
            .replace(/\[My Name\]/g, user?.name || 'an expert')
            .replace(/\[Your Name\]/g, user?.name || 'an expert');

        return (
            <div key={lineId} className="group relative bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-4 rounded-2xl transition-all hover:shadow-md">
                <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${line.role === 'agent' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                {line.role === 'agent' ? 'YOU SAY' : 'PARTNER'}
                            </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            {processedText}
                        </p>
                    </div>
                    {line.isQuickCopy && (
                        <button
                            onClick={() => copyToClipboard(processedText, lineId)}
                            className={`shrink-0 p-2 rounded-xl transition-all ${isCopied ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600'}`}
                        >
                            {isCopied ? <IconCheck className="w-4 h-4" /> : <IconCopy className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#020617] overflow-hidden">
            {/* Top Bar */}
            <header className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 z-20">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl text-white shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] transition-transform hover:scale-110">
                        <IconBook className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Education Center</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400">Master Tools & Live Assist</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Live Assist Toggle */}
                    <button
                        onClick={toggleListening}
                        className={`group flex items-center gap-3 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95 border ${isListening ? 'bg-rose-500 border-rose-400 text-white animate-pulse' : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400'}`}
                    >
                        <div className={`p-1.5 rounded-lg transition-colors ${isListening ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-900 group-hover:bg-indigo-50'}`}>
                            <IconMic className={`w-4 h-4 ${isListening ? 'text-white' : 'text-slate-500 group-hover:text-indigo-600'}`} />
                        </div>
                        {isListening ? 'Listening Live...' : 'Start Live Assist'}
                    </button>

                    <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl flex gap-1 border border-slate-200/50 dark:border-slate-700/50">
                        {(['scripts', 'battlecard', 'info', 'faq'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-md scale-[1.05]' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Dual-Pane Content */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* AI Assistant - NOW ON LEFT and Collapsible */}
                <div className={`h-full shrink-0 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.1)] z-10 relative overflow-hidden transition-all duration-500 ease-in-out ${isCollapsed ? 'w-0 -translate-x-full opacity-0' : 'w-full lg:w-[400px] border-r'}`}>
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -z-1" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl -z-1" />

                    <div className="p-8 bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-between shadow-xl relative z-20">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner group transition-transform hover:rotate-12">
                                <IconBot className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Coach Assist</h3>
                                <div className="flex items-center gap-2 text-[9px] text-indigo-100 font-bold uppercase tracking-widest mt-0.5">
                                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)] ${isListening ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400 opacity-50'}`} />
                                    {isListening ? 'Live Assist Active' : 'Performance Ready'}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsCollapsed(true)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                        >
                            <IconX className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-slate-50/10 dark:bg-slate-950/20 relative z-10">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                                <div className={`max-w-[90%] rounded-[1.5rem] px-5 py-4 text-sm shadow-sm transition-all hover:shadow-md ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-200 dark:shadow-none'
                                    : msg.role === 'live'
                                        ? 'bg-gradient-to-br from-rose-500 to-orange-500 text-white border-2 border-rose-400 px-6 py-5 rounded-3xl w-full shadow-2xl shadow-rose-200 dark:shadow-none flex flex-col gap-3 font-black uppercase tracking-tight'
                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700 font-medium leading-relaxed'
                                    }`}>
                                    {msg.role === 'live' && (
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                                <span className="text-[10px] font-black tracking-[0.2em] opacity-90">Live Intelligence Ping</span>
                                            </div>
                                            <IconSparkles className="w-4 h-4 opacity-80" />
                                        </div>
                                    )}
                                    {msg.role === 'model' || msg.role === 'live' ? (
                                        <RichMessageRenderer text={msg.text} />
                                    ) : (
                                        msg.text
                                    )}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-2xl rounded-bl-none w-fit border border-slate-100 dark:border-slate-700 shadow-sm animate-pulse">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 relative z-20">
                        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative group/form">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask Coach for tips..."
                                className="w-full pl-6 pr-16 py-5 bg-slate-100 dark:bg-slate-800/50 rounded-[1.5rem] text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 border-2 border-transparent focus:border-indigo-500/30 dark:text-white transition-all shadow-inner outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isTyping}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 disabled:opacity-30 transition-all active:scale-90"
                            >
                                <IconSend className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Floating Expand Button when Collapsed */}
                {isCollapsed && (
                    <button
                        onClick={() => setIsCollapsed(false)}
                        className="fixed bottom-32 left-8 z-[100] p-4 bg-indigo-600 text-white rounded-2xl shadow-2xl hover:scale-110 transition-all flex items-center gap-3 animate-in fade-in zoom-in duration-500 border border-white/20"
                    >
                        <IconBot className="w-6 h-6" />
                        <span className="text-xs font-black uppercase tracking-widest pr-2">Coach Assist</span>
                    </button>
                )}

                {/* Right Panel: Knowledge Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-gradient-to-br from-indigo-50/20 via-transparent to-purple-50/20">
                    <div className="max-w-4xl mx-auto">
                        {activeTab === 'scripts' && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {TRAINING_CONTENT.scripts.map(script => (
                                    <React.Fragment key={script.id}>
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl shadow-inner border border-indigo-100/50 dark:border-indigo-800/50">
                                                    {script.icon === 'IconActivity' ? <IconActivity className="w-6 h-6" /> : <IconBriefcase className="w-6 h-6" />}
                                                </div>
                                                <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{script.title}</h2>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4">
                                                {script.sections.map(section => {
                                                    const sectionId = `${script.id}-${section.id}`;
                                                    const isExpanded = expandedSections.includes(sectionId);

                                                    return (
                                                        <div key={sectionId} className={`bg-white dark:bg-slate-900 rounded-[2rem] border transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'border-indigo-500/40 ring-8 ring-indigo-500/5 shadow-2xl scale-[1.01]' : 'border-slate-100 dark:border-slate-800 shadow-sm hover:border-slate-200 dark:hover:border-slate-700'}`}>
                                                            <button
                                                                onClick={() => toggleSection(sectionId)}
                                                                className="w-full px-8 py-6 flex items-center justify-between group text-left"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${isExpanded ? 'bg-indigo-500 scale-150 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-300'}`} />
                                                                    <span className={`font-black uppercase tracking-widest text-xs transition-colors duration-300 ${isExpanded ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-300'}`}>{section.title}</span>
                                                                </div>
                                                                <div className={`p-2 rounded-xl transition-all duration-500 ${isExpanded ? 'bg-indigo-50 text-indigo-600 rotate-180' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                                                                    <IconChevronDown className="w-4 h-4" />
                                                                </div>
                                                            </button>

                                                            <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                                                <div className="px-8 pb-8 pt-2">
                                                                    {section.content && (
                                                                        <div className="mb-6 p-5 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/30 dark:border-indigo-800/30 text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                                                            {section.content}
                                                                        </div>
                                                                    )}
                                                                    <div className="space-y-4">
                                                                        {section.lines?.map((line, idx) => renderScriptLine(line, idx, sectionId))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent my-12" />
                                    </React.Fragment>
                                ))}
                            </div>
                        )}

                        {activeTab === 'battlecard' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {TRAINING_CONTENT.oneLiners?.map((item, i) => (
                                        <div key={i} className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl flex flex-col justify-between group hover:rotate-1 transition-transform">
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">{item.category} Pitch</span>
                                            <p className="text-sm font-bold leading-relaxed">{item.text}</p>
                                            <button onClick={() => copyToClipboard(item.text, `one-liner-${i}`)} className="mt-4 self-end p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                                                {copiedId === `one-liner-${i}` ? <IconCheck className="w-4 h-4" /> : <IconCopy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest px-4">Master Objection Handling</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {TRAINING_CONTENT.objectionHandlers?.map((obj, i) => (
                                            <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-indigo-500/30 transition-all">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-black text-xs">!</div>
                                                    <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{obj.title}</h4>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[1.5rem] border-l-4 border-indigo-500 relative">
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed">"{obj.rebuttal}"</p>
                                                    <button onClick={() => copyToClipboard(obj.rebuttal, `rebuttal-${i}`)} className="absolute bottom-4 right-4 p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                                                        {copiedId === `rebuttal-${i}` ? <IconCheck className="w-4 h-4" /> : <IconCopy className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'info' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 transition-transform group-hover:scale-110">
                                            <IconInfo className="w-16 h-16" />
                                        </div>
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 mb-6 flex items-center gap-2">
                                            Step 1: {TRAINING_CONTENT.theProcess.step1.title}
                                        </h3>
                                        <div className="space-y-4">
                                            {TRAINING_CONTENT.theProcess.step1.actions.map((action: string, i: number) => (
                                                <div key={i} className="flex gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                                                    <span className="text-indigo-400 font-black">•</span>
                                                    {action}
                                                </div>
                                            ))}
                                            <div className="mt-6 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl text-xs font-bold text-indigo-600 dark:text-indigo-300 italic">
                                                Final Result: {TRAINING_CONTENT.theProcess.step1.output}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 transition-transform group-hover:scale-110">
                                            <IconSparkles className="w-16 h-16" />
                                        </div>
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 mb-6 flex items-center gap-2">
                                            Step 2: {TRAINING_CONTENT.theProcess.step2.title}
                                        </h3>
                                        <div className="space-y-4">
                                            {TRAINING_CONTENT.theProcess.step2.actions.map((action: string, i: number) => (
                                                <div key={i} className="flex gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                                                    <span className="text-emerald-400 font-black">•</span>
                                                    {action}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617] rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden group border border-white/5">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                                    <h2 className="text-3xl font-black tracking-tight mb-8">Partner Compensation Matrix</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {TRAINING_CONTENT.compensation.map((c: any, i: number) => (
                                            <div key={i} className="p-8 bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all group/card">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-2 opacity-60">{c.partner}</h4>
                                                <div className="text-2xl font-black text-white mb-2">{c.amount}</div>
                                                <p className="text-xs text-slate-400 font-medium leading-relaxed">{c.breakdown}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative mb-12">
                                    <h3 className="text-xl font-black tracking-tight mb-8">Service Pricing Matrix</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                                            <div className="text-[10px] font-black uppercase text-indigo-500 mb-2">Phase 1: Investigation</div>
                                            <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">{TRAINING_CONTENT.pricing.investigation.standard}</div>
                                            <p className="text-xs text-slate-500 font-medium">Standard Pricing based on debt amount.</p>
                                            <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-xl border border-emerald-100/50">
                                                Partner Discounted Rate: {TRAINING_CONTENT.pricing.investigation.partnerDiscounted}
                                            </div>
                                        </div>
                                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
                                            <div className="text-[10px] font-black uppercase text-indigo-500 mb-2">Phase 2: Resolution</div>
                                            <div className="text-xl font-black text-slate-900 dark:text-white italic">"Custom Flat Fee"</div>
                                            <p className="text-xs text-slate-500 font-medium mt-2">Quoted based on strategy developed in Step 1.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative">
                                    <h3 className="text-xl font-black tracking-tight mb-8">Integrated Partner Portals</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {TRAINING_CONTENT.portals.map((portal: any, i: number) => (
                                            <a
                                                key={i}
                                                href={`https://${portal.url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-500/30 transition-all group"
                                            >
                                                <span className="text-xs font-black text-slate-800 dark:text-white mb-1">{portal.name}</span>
                                                <span className="text-[8px] font-bold text-slate-400 group-hover:text-indigo-500 transition-colors uppercase tracking-widest">Open Portal</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'faq' && (
                            <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {TRAINING_CONTENT.faqs.map((faq, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden relative">
                                        <div className="absolute -top-4 -right-4 p-10 text-slate-50 dark:text-slate-800/20 font-black text-[10rem] leading-none pointer-events-none transition-transform group-hover:scale-110 duration-700">?</div>
                                        <div className="relative z-10 flex items-start gap-8">
                                            <div className="w-16 h-16 rounded-[2rem] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-black text-3xl shadow-inner border border-indigo-100/50 dark:border-indigo-800/50">Q</div>
                                            <div className="space-y-6 pt-2">
                                                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{faq.q}</h3>
                                                <div className="flex items-start gap-5 p-6 bg-slate-50/50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                                                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-black text-sm">A</div>
                                                    <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{faq.a}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

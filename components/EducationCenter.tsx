
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
    IconBot
} from './Icons';
import { Groq } from "groq-sdk";
import { formatCurrency } from '../utils/dateUtils';

interface Message {
    id: string;
    role: 'user' | 'model' | 'live';
    text: string;
}

export const EducationCenter: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'scripts' | 'info' | 'faq' | 'battlecard'>('scripts');
    const [expandedSections, setExpandedSections] = useState<string[]>(['onboard_script-opening']);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Assistant State
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'model', text: "Welcome to the Community Tax Education Center. I'm your AI Performance Coach. I can help you master our scripts, clarify resolution product details, or provide live coaching tips. Type a question below or start 'Live Assist' during your call." }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isListening, setIsListening] = useState(false);
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

    const handleSend = async (text: string = input) => {
        if (!text.trim() || isTyping) return;
        const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) throw new Error("Missing VITE_GROQ_API_KEY");

            const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

            const systemPrompt = `You are the Performance Coach for the ChiCayo Tax application.
            The company name is Community Tax.
            Your job is to help agents master the scripts and product for Tax Debt Resolution.
            
            KNOWLEDGE BASE:
            - Business: Community Tax (Partners of Santa Barbara TPG, Drake, Password, EPS).
            - Services: IRS/State debt negotiation, Offer in Compromise, Penalty Abatement, Representation.
            - Target Client: Owes $7,000+ in IRS/State tax debt.
            - Partner Commissions: $350 (SBTPG) or $400 (Direct Partners).
            - Agent Commissions: $3 (Self Onboard), $2 (AE Transfer), $10 (Referral Activation callback).
            
            SCRIPTS: ${JSON.stringify(TRAINING_CONTENT)}
            
            STYLE: Encouraging, concise, and professional. Always provide specific script lines when asked how to handle a situation. Mention Community Tax, not any other company name.`;

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system" as const, content: systemPrompt },
                    ...messages.filter(m => m.role !== 'live').slice(-5).map(m => ({
                        role: (m.role === 'model' ? 'assistant' : 'user') as "assistant" | "user",
                        content: m.text
                    })),
                    { role: "user" as const, content: text }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
            });

            const res = completion.choices[0]?.message?.content || "I'm not sure about that. Try checking the FAQ section.";
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: res }]);
        } catch (e: any) {
            console.error("Coach Assist Error:", e);
            const errorMsg = e.message?.includes("API key")
                ? "API Key missing or invalid. Please check your .env file."
                : "Service temporarily unavailable. Please check the scripts manually.";
            setMessages(prev => [...prev, { id: 'err', role: 'model', text: errorMsg }]);
        } finally {
            setIsTyping(false);
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
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map((result: any) => result.transcript)
                    .join('');

                // If it looks like a complete sentence and has keywords
                const lastResult = event.results[event.results.length - 1];
                if (lastResult.isFinal) {
                    const text = lastResult[0].transcript.toLowerCase();
                    if (text.includes("commission") || text.includes("how much") || text.includes("owe") || text.includes("partnership") ||
                        text.includes("sbtpg") || text.includes("drake") || text.includes("local cpa") || text.includes("cost") ||
                        text.includes("IRS") || text.includes("qualified")) {
                        handleSend(`The partner just said: "${text}". Provide a coaching tip.`);
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
                            {line.text}
                        </p>
                    </div>
                    {line.isQuickCopy && (
                        <button
                            onClick={() => copyToClipboard(line.text, lineId)}
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
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Left Panel: Knowledge & Scripts */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-gradient-to-br from-indigo-50/20 via-transparent to-purple-50/20">
                    <div className="max-w-4xl mx-auto">
                        {activeTab === 'scripts' && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {TRAINING_CONTENT.scripts.map(script => (
                                    <React.Fragment key={script.id}>
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl shadow-inner border border-indigo-100/50 dark:border-indigo-800/50">
                                                    {script.icon === 'IconBriefcase' ? <IconBriefcase className="w-6 h-6" /> : <IconSparkles className="w-6 h-6" />}
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
                                                                        {section.lines?.map((line: any, idx: number) => renderScriptLine(line as any, idx, sectionId))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {TRAINING_CONTENT.scripts.length > 1 && TRAINING_CONTENT.scripts[0] === script && <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent my-12" />}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}

                        {activeTab === 'battlecard' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {/* One-Liners Section */}
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

                                {/* Objections Drill-Down */}
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

                                {/* Call Quality Checklist */}
                                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-10 rounded-[3rem] text-white border border-white/5 shadow-2xl">
                                    <h3 className="text-xl font-black uppercase tracking-tight mb-8 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30"><IconCheck className="w-6 h-6" /></div>
                                        Expert Call Checklist
                                    </h3>
                                    <div className="space-y-4">
                                        {(TRAINING_CONTENT as any).callQualityChecklist?.map((item: string, i: number) => (
                                            <div key={i} className="flex items-center gap-6 p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                                                <span className="text-indigo-400 font-black text-lg">0{i + 1}</span>
                                                <p className="text-base font-bold text-indigo-50">{item}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'info' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617] rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden group border border-white/5">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="p-4 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl">
                                                <IconSparkles className="w-10 h-10 text-indigo-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-4xl font-black tracking-tight">{TRAINING_CONTENT.productInfo.title}</h2>
                                                <div className="inline-flex items-center gap-3 px-6 py-2 bg-indigo-500/20 backdrop-blur-xl rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-500/30 mt-2">
                                                    Target: <span className="text-emerald-400">{TRAINING_CONTENT.productInfo.debtThreshold} IRS/STATE Debt</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                                            {TRAINING_CONTENT.productInfo.keyPoints.map((point, i) => (
                                                <div key={i} className="p-8 bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all group/card hover:scale-[1.02] duration-300">
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-3 opacity-60">{point.title}</h3>
                                                    <p className="text-xl font-bold leading-tight group-hover/card:translate-x-1 transition-transform">{point.detail}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Comparison Table */}
                                        <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 overflow-hidden">
                                            <div className="px-8 py-6 border-b border-white/10 bg-white/5">
                                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Market Advantage Comparison</h3>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr className="border-b border-white/5 bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-400">
                                                            <th className="px-8 py-4">Feature</th>
                                                            <th className="px-8 py-4 text-indigo-400">Community Tax</th>
                                                            <th className="px-8 py-4">Local CPA / Firm</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {TRAINING_CONTENT.productInfo.comparisons?.map((row, i) => (
                                                            <tr key={i} className="group/row hover:bg-white/5 transition-colors">
                                                                <td className="px-8 py-5 font-bold text-slate-400">{row.feature}</td>
                                                                <td className="px-8 py-5 font-black text-indigo-300">{row.communityTax}</td>
                                                                <td className="px-8 py-5 text-slate-500">{row.localCPA}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
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

                {/* Right Panel: AI Assistant */}
                <div className="w-full lg:w-[400px] h-[400px] lg:h-full shrink-0 bg-white dark:bg-[#0f172a] border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.1)] z-10 relative overflow-hidden">
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
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                    Active Coaching Mode
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-slate-50/10 dark:bg-slate-950/20 relative z-10">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                                <div className={`max-w-[85%] rounded-[1.5rem] px-5 py-4 text-sm shadow-sm transition-all hover:shadow-md ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-200 dark:shadow-none'
                                    : msg.role === 'live'
                                        ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/30 dark:border-rose-800 text-[10px] font-black uppercase tracking-[0.2em] w-full text-center py-3'
                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700 font-medium leading-relaxed'
                                    }`}>
                                    {msg.text}
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
            </div>
        </div>
    );
};

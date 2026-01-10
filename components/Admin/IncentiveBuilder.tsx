
import React, { useState } from 'react';
import { IconSparkles, IconSend, IconUsers, IconTrophy, IconCheck, IconTrash, IconClock, IconTimer, IconActivity, IconBot, IconBonusMachine, IconDollarSign } from '../Icons';
import { GoogleGenAI, Type } from "@google/genai";
import { TeamMember, PayCycle, IncentiveRule } from '../../types';
import { formatCurrency } from '../../utils/dateUtils';

interface IncentiveBuilderProps {
  onApply: (rule: Partial<IncentiveRule>) => void;
  onDeleteRule: (id: string) => void;
  members: TeamMember[];
  activeCycle?: PayCycle;
  rules: IncentiveRule[];
}

export const IncentiveBuilder: React.FC<IncentiveBuilderProps> = ({ onApply, onDeleteRule, members, activeCycle, rules }) => {
  const [selfPrompt, setSelfPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const processIncentive = async () => {
    if (!selfPrompt.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: selfPrompt,
        config: {
          systemInstruction: `You are the Achievement Engine for ChiCayo. Parse the admin's request into a structured rule.
          MEMBERS: ${members.map(m => `${m.name} (id:${m.id})`).join(', ')}. 
          
          Rule Types:
          1. 'one_time': Immediate cash payout.
          2. 'per_deal': Extra $ bonus for EVERY deal in a timeframe or specific agent (Rush Hour).
          3. 'up_for_grabs': Team Challenge pool. A limited number of bonuses available for anyone (e.g., "The next 5 onboards are $8"). Set 'targetCount' for the limit.
          
          Parsing advanced timing:
          - If "Monday", "Next cycle", or "8pm" is mentioned, set ISO startTime/endTime appropriately.
          
          Output JSON schema only.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              userId: { type: Type.STRING, description: 'Member ID or "team"' },
              type: { type: Type.STRING, enum: ['one_time', 'per_deal', 'up_for_grabs'] },
              valueCents: { type: Type.NUMBER, description: 'Bonus amount in cents' },
              label: { type: Type.STRING, description: 'Catchy name' },
              startTime: { type: Type.STRING, description: 'ISO date' },
              endTime: { type: Type.STRING, description: 'ISO date' },
              targetCount: { type: Type.NUMBER, description: 'Limit for up_for_grabs' }
            },
            required: ['userId', 'type', 'valueCents', 'label']
          }
        },
      });

      const result = JSON.parse(response.text);
      onApply(result);
      setSelfPrompt('');
    } catch (e) {
      console.error(e);
      alert('Calibration error. Try: "Next 5 team onboards get $2 extra"');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-full animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-transform hover:scale-110">
                    <IconBonusMachine className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xs">Achievement Engine</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bonus & Incentive Lab</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setSelfPrompt("Next 5 team onboards get $3 extra up for grabs")} className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-indigo-50 transition-colors" title="Team Challenge">🔥</button>
                <button onClick={() => setSelfPrompt("Give the team $5 for Pizza Friday")} className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-indigo-50 transition-colors" title="One-Time Bonus">🍕</button>
            </div>
        </div>
        
        <div className="relative mb-6">
            <textarea 
              value={selfPrompt}
              onChange={e => setSelfPrompt(e.target.value)}
              placeholder="e.g. Next 10 team onboards get $2 extra today..."
              className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 pb-12 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium resize-none h-28 placeholder-slate-400 transition-all shadow-inner"
            />
            <button 
              onClick={processIncentive}
              disabled={isProcessing || !selfPrompt.trim()}
              className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-xs font-bold px-4"
            >
                {isProcessing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <IconSparkles className="w-4 h-4" />}
                Run Rule
            </button>
        </div>

        {/* CONDITIONALLY RENDER LIST */}
        {rules.length > 0 && (
          <div className="flex-1 space-y-4 animate-in slide-in-from-bottom-2">
               <div className="flex items-center justify-between px-1">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Challenges</h5>
                  <span className="text-[9px] bg-emerald-50 text-emerald-500 px-1.5 py-0.5 rounded font-bold">{rules.length} LIVE</span>
               </div>
               
               <div className="space-y-2 max-h-[180px] overflow-y-auto no-scrollbar pr-1">
                  {rules.slice().reverse().map(rule => (
                      <div key={rule.id} className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 group relative shadow-sm">
                          <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${rule.type === 'up_for_grabs' ? 'bg-orange-100 text-orange-600' : rule.type === 'per_deal' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                  {rule.type === 'up_for_grabs' ? <IconTrophy className="w-4.5 h-4.5" /> : rule.type === 'per_deal' ? <IconClock className="w-4.5 h-4.5" /> : <IconCheck className="w-4.5 h-4.5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                      <h6 className="text-xs font-black text-slate-900 dark:text-white truncate pr-6">{rule.label}</h6>
                                      <button onClick={() => onDeleteRule(rule.id)} className="absolute top-2 right-2 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><IconTrash className="w-3.5 h-3.5" /></button>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] font-black text-emerald-600">+{formatCurrency(rule.valueCents)}</span>
                                      <span className="text-[9px] text-slate-400 font-bold uppercase">• {rule.userId === 'team' ? 'TEAM' : members.find(m => m.id === rule.userId)?.name || 'Agent'}</span>
                                      {rule.targetCount && <span className="text-[9px] text-orange-500 font-black uppercase">• {rule.targetCount - (rule.currentCount || 0)} LEFT</span>}
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
               </div>
          </div>
        )}
    </div>
  );
};

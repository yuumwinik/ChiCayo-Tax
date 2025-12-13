
import React, { useState, useEffect } from 'react';
import { Appointment, AppointmentStage, AE_COLORS, User, EarningWindow } from '../types';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import { IconTrophy, IconTrash, IconCopy, IconCheck, IconArrowRight, IconSparkles, getAvatarIcon, IconPhone, IconMail, IconBriefcase } from './Icons';
import { CustomSelect } from './CustomSelect';
import { ProtocolModal } from './ProtocolModal';

interface OnboardedViewProps {
  appointments: Appointment[];
  searchQuery: string;
  onEdit: (appt: Appointment) => void;
  onView?: (appt: Appointment) => void;
  onDelete: (id: string) => void;
  userRole?: string;
  users?: User[];
  preferredDialer?: string;
  currentWindow?: EarningWindow | null; // For Cycle gamification
}

export const OnboardedView: React.FC<OnboardedViewProps> = ({ 
  appointments, 
  searchQuery, 
  onEdit, 
  onView,
  onDelete, 
  userRole, 
  users = [], 
  preferredDialer,
  currentWindow
}) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activePopup, setActivePopup] = useState<'level13' | 'level21' | null>(null);

  const getCardStats = (id: string) => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const speed = ['Speed Run', 'Steady Hand', 'Power Close', 'Clean Sweep', 'Epic Win'][hash % 5];
    const quality = ['Perfect', 'Legendary', 'Rare', 'Epic', 'Common'][(hash + 2) % 5];
    return { speed, quality };
  };

  const getAgentColor = (userId: string) => {
     const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
     const colors = [
        'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800',
        'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
        'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-800',
        'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:border-fuchsia-800',
        'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
     ];
     return colors[hash % colors.length];
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleCardClick = (appt: Appointment) => {
    if (onView) {
      onView(appt);
    } else {
      onEdit(appt);
    }
  };

  const filtered = appointments
    .filter(a => a.stage === AppointmentStage.ONBOARDED)
    .filter(a => {
      const q = searchQuery.toLowerCase();
      const agent = users.find(u => u.id === a.userId);
      return (
        a.name.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.notes?.toLowerCase().includes(q) ||
        (userRole === 'admin' && agent?.name.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.scheduledAt).getTime();
      const dateB = new Date(b.scheduledAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  // Gamification Logic
  useEffect(() => {
    if (userRole === 'admin' || !currentWindow) return;

    // Check for Cycle Level 13
    const seenCycleKey13 = `chicayo_game_seen_level13_${currentWindow.id}`;
    const seenLevel13 = localStorage.getItem(seenCycleKey13);
    
    if (!seenLevel13 && currentWindow.onboardedCount >= 13) {
       setActivePopup('level13');
       return; // Prioritize 13 if both happen? No, 21 is higher, but usually hit 13 first.
    }

    // Check for Cycle Level 21
    const seenCycleKey21 = `chicayo_game_seen_level21_${currentWindow.id}`;
    const seenLevel21 = localStorage.getItem(seenCycleKey21);
    
    if (!seenLevel21 && currentWindow.onboardedCount >= 21) {
       setActivePopup('level21');
    }
  }, [currentWindow, userRole]);

  const handleDismissPopup = () => {
     if (currentWindow) {
        if (activePopup === 'level13') {
            localStorage.setItem(`chicayo_game_seen_level13_${currentWindow.id}`, 'true');
        } else if (activePopup === 'level21') {
            localStorage.setItem(`chicayo_game_seen_level21_${currentWindow.id}`, 'true');
        }
     }
     setActivePopup(null);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* LEVEL 13 POPUP */}
      {activePopup === 'level13' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in zoom-in duration-500">
           <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-8 rounded-3xl shadow-2xl max-w-sm text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
              <div className="relative z-10">
                 <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-yellow-500/50 animate-bounce">
                    <IconTrophy className="w-12 h-12 text-yellow-900" />
                 </div>
                 <h2 className="text-3xl font-extrabold mb-2">NEW LEVEL UNLOCKED!</h2>
                 <p className="text-indigo-100 mb-6 font-medium">You've hit 13 Onboarded Clients this cycle! That's legendary status.</p>
                 <p className="text-sm bg-white/20 p-3 rounded-xl mb-6 italic">"Bro, go ask for a little something extra! You deserve it!"</p>
                 <button 
                   onClick={handleDismissPopup}
                   className="w-full py-3 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
                 >
                   Let's Keep Going!
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* LEVEL 21 CYCLE POPUP */}
      {activePopup === 'level21' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in zoom-in duration-500">
           <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-8 rounded-3xl shadow-2xl max-w-sm text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
              <div className="relative z-10">
                 <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/50 animate-spin-slow">
                    <IconSparkles className="w-12 h-12 text-emerald-600" />
                 </div>
                 <h2 className="text-3xl font-extrabold mb-2">CYCLE MASTER!</h2>
                 <p className="text-emerald-100 mb-6 font-medium">21 Onboards this cycle! You are absolutely crushing it.</p>
                 <button 
                   onClick={handleDismissPopup}
                   className="w-full py-3 bg-white text-emerald-800 font-bold rounded-xl hover:bg-emerald-50 transition-colors shadow-lg"
                 >
                   Dominating!
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl text-yellow-600 dark:text-yellow-400 shadow-sm">
             <IconTrophy className="w-6 h-6" />
          </div>
          <div>
             {userRole === 'admin' ? 'Team Trophy Case' : 'Trophy Collection'}
             <span className="block text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                {filtered.length} Clients Collected
             </span>
          </div>
        </h2>
        
        <div className="w-40">
          <CustomSelect 
            options={[{value: 'desc', label: 'Newest First'}, {value: 'asc', label: 'Oldest First'}]}
            value={sortOrder}
            onChange={(val) => setSortOrder(val as 'asc' | 'desc')}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
           <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 text-slate-400">
              <IconTrophy className="w-8 h-8 opacity-50" />
           </div>
           <p className="text-slate-500 font-medium">No trophies earned yet.</p>
           <p className="text-xs text-slate-400 mt-1">Start onboarding clients to fill your collection!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(appt => {
            const stats = getCardStats(appt.id);
            const agent = users.find(u => u.id === appt.userId);
            
            // Check if Self-Owned (AE Name matches Owner Name)
            const isSelfOwned = appt.aeName && agent && appt.aeName === agent.name;
            
            const aeColorClass = appt.aeName ? (AE_COLORS[appt.aeName] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300') : 'bg-slate-100 text-slate-600';
            const agentColorClass = userRole === 'admin' && agent ? getAgentColor(agent.id) : '';

            return (
              <div 
                key={appt.id} 
                onClick={() => handleCardClick(appt)}
                className={`group relative bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-none border-2 transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer ${userRole === 'admin' ? 'border-transparent hover:border-slate-300 dark:hover:border-slate-600' : 'border-transparent hover:border-indigo-500 dark:hover:border-indigo-500'}`}
              >
                <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl transition-all ${isSelfOwned ? 'bg-amber-500/20 group-hover:bg-amber-500/30' : 'bg-indigo-500/10 group-hover:bg-indigo-500/20'}`}></div>

                {userRole === 'admin' && agent && (
                   <div className={`absolute top-0 left-0 right-0 h-1.5 ${agentColorClass.split(' ')[0]}`}></div>
                )}

                <div className="flex justify-between items-start mb-4 relative z-10">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg dark:shadow-none transform group-hover:rotate-12 transition-transform ${isSelfOwned ? 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-orange-200' : 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-orange-200'}`}>
                      {isSelfOwned ? <IconSparkles className="w-6 h-6" /> : <IconTrophy className="w-6 h-6" />}
                   </div>
                   <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                      {appt.earnedAmount ? formatCurrency(appt.earnedAmount) : '+$2.00'}
                   </div>
                </div>

                <div className="mb-4">
                   <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{appt.name}</h3>
                   
                   {userRole === 'admin' && agent && (
                      <div className={`mt-2 flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-bold w-fit ${agentColorClass}`}>
                         <div className="w-4 h-4 rounded-full bg-white/50 flex items-center justify-center overflow-hidden">
                            {agent.avatarId && agent.avatarId !== 'initial' ? (
                               <div className="w-3 h-3">{getAvatarIcon(agent.avatarId)}</div>
                            ) : (
                               <span>{agent.name.charAt(0)}</span>
                            )}
                         </div>
                         {agent.name}
                      </div>
                   )}

                   <div className="flex flex-col gap-1.5 mt-2">
                      <div className="flex items-center gap-2">
                        <ProtocolModal type="phone" value={appt.phone} appName={preferredDialer}>
                            {(trigger) => (
                                <button 
                                onClick={(e) => { e.stopPropagation(); trigger(); }}
                                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors w-fit"
                                >
                                <IconPhone className="w-3 h-3" />
                                {appt.phone}
                                </button>
                            )}
                        </ProtocolModal>
                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(appt.phone)}} className="text-slate-300 hover:text-indigo-500"><IconCopy className="w-3 h-3"/></button>
                      </div>

                      {appt.email && (
                        <div className="flex items-center gap-2">
                            <ProtocolModal type="email" value={appt.email}>
                                {(trigger) => (
                                    <button 
                                    onClick={(e) => { e.stopPropagation(); trigger(); }}
                                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors w-fit truncate max-w-[150px]"
                                    >
                                    <IconMail className="w-3 h-3" />
                                    {appt.email}
                                    </button>
                                )}
                            </ProtocolModal>
                            <button onClick={(e) => { e.stopPropagation(); copyToClipboard(appt.email)}} className="text-slate-300 hover:text-indigo-500"><IconCopy className="w-3 h-3"/></button>
                        </div>
                      )}
                   </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 mb-4 space-y-2">
                   <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      <span>Journey</span>
                      <span>Completed</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                      <div className="h-0.5 flex-1 bg-slate-200 dark:bg-slate-700"></div>
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                      <div className="h-0.5 flex-1 bg-indigo-500"></div>
                      {isSelfOwned ? <IconCheck className="w-3 h-3 text-indigo-500" /> : <IconArrowRight className="w-3 h-3 text-indigo-500" />}
                   </div>
                   <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{isSelfOwned ? 'Self Closed' : (appt.type === 'transfer' ? 'Transfer' : 'Set')}</span>
                      {appt.aeName ? (
                         <span className={`px-1.5 py-0.5 rounded font-bold ${isSelfOwned ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300' : aeColorClass} text-[10px]`}>
                            {appt.aeName}
                         </span>
                      ) : (
                         <span className="font-medium text-slate-700 dark:text-slate-300">Self</span>
                      )}
                   </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
                   <div className="flex gap-2">
                      <span className="text-[10px] font-bold px-2 py-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300 rounded border border-indigo-100 dark:border-indigo-800">
                         {stats.quality}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-1 bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300 rounded border border-purple-100 dark:border-purple-800">
                         {stats.speed}
                      </span>
                   </div>
                   
                   <div className="flex gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(appt); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                      >
                         <IconSparkles className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(appt.id); }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                      >
                         <IconTrash className="w-4 h-4" />
                      </button>
                   </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

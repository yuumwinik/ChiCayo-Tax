import React, { useState, useEffect } from 'react';
import { AppointmentStage, ACCOUNT_EXECUTIVES, User } from '../types';
import { IconX, IconBriefcase, IconSparkles, IconCheck, IconPhone, IconMail, IconCalendar, IconBot, IconArrowRight, IconActivity } from './Icons';
import { CustomSelect } from './CustomSelect';
import { CustomDatePicker } from './CustomDatePicker';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isAdminMode?: boolean;
  agentOptions?: User[];
  currentUserName?: string;
  commissionRate: number;
  selfCommissionRate: number;
}

export const CreateModal: React.FC<CreateModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isAdminMode = false,
  agentOptions = [],
  currentUserName,
  commissionRate,
  selfCommissionRate
}) => {
  const [isSelfOnboard, setIsSelfOnboard] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    date: new Date().toLocaleDateString('en-CA'),
    notes: '',
    aeName: ''
  });

  useEffect(() => {
    if (isOpen) {
        setIsSelfOnboard(false);
        setTargetUserId('');
        setFormData({ 
            name: '', 
            phone: '', 
            email: '', 
            date: new Date().toLocaleDateString('en-CA'), 
            notes: '', 
            aeName: '' 
        });
    }
  }, [isOpen]);

  // When Self-Onboard is toggled, set AE to selected Agent
  useEffect(() => {
    if (isSelfOnboard && targetUserId) {
        const agent = agentOptions.find(u => u.id === targetUserId);
        if (agent) setFormData(prev => ({ ...prev, aeName: agent.name }));
    } else if (!isSelfOnboard) {
        setFormData(prev => ({ ...prev, aeName: '' }));
    }
  }, [isSelfOnboard, targetUserId, agentOptions]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAdminMode && !targetUserId) {
        alert("Please select the Agent to credit this deal to.");
        return;
    }

    const dateBase = formData.date || new Date().toLocaleDateString('en-CA');
    const scheduledAt = new Date(dateBase + 'T12:00:00').toISOString();
    
    onSubmit({
      ...formData,
      scheduledAt,
      stage: AppointmentStage.ONBOARDED,
      targetUserId: targetUserId || undefined
    });
    onClose();
  };

  const aeOptions = [...ACCOUNT_EXECUTIVES];
  // Filter out Master Admin from selection to ensure "Master Admin" is never labeled as the agent
  const agentSelection = agentOptions.filter(u => u.role !== 'admin').map(u => ({ value: u.id, label: u.name }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl animate-in zoom-in-95 duration-300 flex flex-col overflow-hidden border border-white/10">
        
        {/* Header - Styled to match screenshot */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-4">
             <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 shadow-sm">
                <IconSparkles className="w-5 h-5" />
             </div>
             <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                Log Onboarded Partner
             </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
            <IconX className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
             
             {/* LEFT COLUMN: CLIENT DETAILS */}
             <div className="space-y-8">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] pb-3 border-b border-slate-50 dark:border-slate-800 flex items-center gap-2">
                    CLIENT DETAILS
                </h3>
                
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Client Name</label>
                    <input 
                        required 
                        name="name" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        type="text" 
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none text-slate-900 dark:text-white placeholder-slate-400 transition-all focus:ring-2 focus:ring-indigo-500 shadow-inner" 
                        placeholder="John Doe" 
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Phone</label>
                    <input 
                        required 
                        name="phone" 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                        type="tel" 
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none text-slate-900 dark:text-white placeholder-slate-400 transition-all focus:ring-2 focus:ring-indigo-500 shadow-inner" 
                        placeholder="(555) 123-4567" 
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email</label>
                    <div className="relative">
                        <input 
                            name="email" 
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})} 
                            type="email" 
                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none text-slate-900 dark:text-white placeholder-slate-400 transition-all focus:ring-2 focus:ring-indigo-500 shadow-inner" 
                            placeholder="client@email.com" 
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2">
                            <IconActivity className="w-5 h-5 text-slate-300" />
                        </div>
                    </div>
                </div>
             </div>

             {/* RIGHT COLUMN: DEAL CREDIT */}
             <div className="space-y-8">
                <div className="flex justify-between items-end pb-3 border-b border-slate-50 dark:border-slate-800">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        DEAL CREDIT & DETAILS
                    </h3>
                    
                    {/* SELF-ONBOARD TOGGLE */}
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SELF-ONBOARD</span>
                        <button 
                            type="button"
                            onClick={() => setIsSelfOnboard(!isSelfOnboard)}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${isSelfOnboard ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${isSelfOnboard ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Credit Deal To (Agent)</label>
                        <CustomSelect 
                            options={agentSelection} 
                            value={targetUserId} 
                            onChange={setTargetUserId} 
                            placeholder="Select Agent..." 
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Account Executive (Closer)</label>
                        <div className={`${isSelfOnboard ? 'opacity-50 pointer-events-none' : ''}`}>
                            <CustomSelect 
                                options={aeOptions} 
                                value={formData.aeName} 
                                onChange={val => setFormData({...formData, aeName: val})} 
                                placeholder="Select AE..." 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Onboard Date</label>
                        <CustomDatePicker value={formData.date} onChange={val => setFormData({...formData, date: val})} required />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notes</label>
                        <textarea 
                            value={formData.notes} 
                            onChange={e => setFormData({...formData, notes: e.target.value})} 
                            rows={3} 
                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none text-slate-900 dark:text-white placeholder-slate-400 transition-all focus:ring-2 focus:ring-indigo-500 shadow-inner resize-none custom-scrollbar" 
                            placeholder="Optional notes..." 
                        />
                    </div>
                </div>
             </div>
          </div>

          <button 
            type="submit" 
            className="w-full mt-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
          >
             <IconSparkles className="w-5 h-5" /> Log Onboarded Partner
          </button>
        </form>
      </div>
    </div>
  );
};
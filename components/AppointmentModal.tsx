import React, { useState, useEffect } from 'react';
import { Appointment, AppointmentStage, STAGE_LABELS, ACCOUNT_EXECUTIVES } from '../types';
import { IconX, IconTrash, IconBriefcase, IconCheck, IconSparkles, IconTransfer, IconActivity, IconClock, IconNotes, IconCalendar } from './Icons';
import { CustomSelect } from './CustomSelect';
import { CustomDatePicker } from './CustomDatePicker';
import { US_TIMEZONES, getTimeZoneFromPhone, dateFromClientTime } from '../utils/timeZoneData';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onDelete?: (id: string) => void;
  initialData?: Appointment | null;
  isRescheduling?: boolean;
  agentName?: string;
  commissionRate: number;
  selfCommissionRate: number;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  onDelete,
  initialData,
  isRescheduling = false,
  agentName,
  commissionRate,
  selfCommissionRate
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    date: '',
    notes: '',
    stage: AppointmentStage.PENDING,
    aeName: '',
    type: 'appointment' as 'appointment' | 'transfer'
  });

  const [isSelfOnboard, setIsSelfOnboard] = useState(false);
  const [timeHour, setTimeHour] = useState('9');
  const [timeMinute, setTimeMinute] = useState('00');
  const [timeAmPm, setTimeAmPm] = useState('AM');
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [detectedZoneBadge, setDetectedZoneBadge] = useState<string | null>(null);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
  const stageOptions = Object.values(AppointmentStage).map(stage => ({ value: stage, label: STAGE_LABELS[stage] }));

  const aeOptions = [...ACCOUNT_EXECUTIVES];
  if (agentName && !aeOptions.includes(agentName)) {
      aeOptions.push(agentName);
  }

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const d = new Date(initialData.scheduledAt);
        const dateStr = d.toLocaleDateString('en-CA');
        let h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        setTimeHour(h.toString());
        setTimeMinute(m);
        setTimeAmPm(ampm);
        setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        setIsSelfOnboard(initialData.aeName === agentName);
        setFormData({
          name: initialData.name,
          phone: initialData.phone,
          email: initialData.email,
          date: dateStr,
          notes: initialData.notes || '',
          stage: isRescheduling ? AppointmentStage.RESCHEDULED : initialData.stage,
          aeName: initialData.aeName || '',
          type: initialData.type || 'appointment'
        });
      } else {
        setFormData({ name: '', phone: '', email: '', date: new Date().toLocaleDateString('en-CA'), notes: '', stage: AppointmentStage.PENDING, aeName: '', type: 'appointment' });
        setTimeHour('9'); setTimeMinute('00'); setTimeAmPm('AM');
        setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        setIsSelfOnboard(false);
      }
      setDetectedZoneBadge(null);
    }
  }, [isOpen, initialData, isRescheduling, agentName]);

  useEffect(() => {
      if (isSelfOnboard && agentName) {
          setFormData(prev => ({ ...prev, aeName: agentName }));
      } else if (!isSelfOnboard && formData.aeName === agentName) {
          setFormData(prev => ({ ...prev, aeName: '' }));
      }
  }, [isSelfOnboard, agentName]);

  if (!isOpen) return null;

  const handlePhoneBlur = () => {
     const detected = getTimeZoneFromPhone(formData.phone);
     if (detected) {
       setTimeZone(detected);
       const shortCode = US_TIMEZONES.find(tz => tz.value === detected)?.short || 'Local';
       setDetectedZoneBadge(shortCode);
       setTimeout(() => { setDetectedZoneBadge(null); }, 3000);
     }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let scheduledAt: string;
    if (formData.type === 'transfer') {
        scheduledAt = new Date().toISOString();
    } else {
        let hourInt = parseInt(timeHour);
        if (timeAmPm === 'PM' && hourInt !== 12) hourInt += 12;
        if (timeAmPm === 'AM' && hourInt === 12) hourInt = 0;
        const timeStr = `${hourInt.toString().padStart(2, '0')}:${timeMinute.padStart(2, '0')}`;
        const dateObj = dateFromClientTime(formData.date, timeStr, timeZone);
        scheduledAt = dateObj.toISOString();
    }
    
    if (formData.type === 'transfer' && !isSelfOnboard && !formData.aeName) {
       alert("Please select an Account Executive for this transfer.");
       return;
    }

    let finalStage = formData.stage;
    let finalAeName = formData.aeName;

    if (formData.type === 'transfer') {
        finalStage = isSelfOnboard ? AppointmentStage.ONBOARDED : AppointmentStage.TRANSFERRED;
    } else {
        // Appointments don't have AEs assigned yet
        finalAeName = '';
    }

    onSubmit({
      ...formData,
      aeName: finalAeName,
      scheduledAt,
      stage: finalStage,
      id: initialData?.id 
    });
    onClose();
  };

  const getModalTitle = () => {
    if (initialData) return 'Update Record';
    if (formData.type === 'transfer') {
      return isSelfOnboard ? 'Log Self Onboard' : 'Log Live Transfer';
    }
    return 'Set New Appointment';
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg md:max-w-4xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90dvh] overflow-hidden border border-white/10">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-600 text-white rounded-lg">
                {formData.type === 'transfer' ? <IconTransfer className="w-5 h-5" /> : <IconActivity className="w-5 h-5" />}
             </div>
             <h2 className="text-lg font-bold text-slate-900 dark:text-white">{getModalTitle()}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"><IconX className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8 space-y-8">
          <div className="flex justify-center mb-4">
             <div className="bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl flex gap-1">
                <button type="button" onClick={() => setFormData({...formData, type: 'appointment'})} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'appointment' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Appointment</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'transfer'})} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'transfer' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'text-slate-400 hover:text-slate-600'}`}>Live Transfer</button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="space-y-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pb-2 border-b border-slate-50 dark:border-slate-700">Client Details</h3>
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Client Name</label>
                    <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} type="text" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white shadow-inner" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Phone</label>
                    <div className="relative">
                        <input required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} onBlur={handlePhoneBlur} type="tel" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white shadow-inner" placeholder="(555) 123-4567" />
                        {detectedZoneBadge && <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-in fade-in zoom-in duration-300"><span className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold shadow-sm">{detectedZoneBadge}</span></div>}
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email (Optional)</label>
                    <input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} type="email" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white shadow-inner" placeholder="client@example.com" />
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex justify-between items-end pb-2 border-b border-slate-50 dark:border-slate-700">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {formData.type === 'transfer' ? 'Logistics' : 'Schedule'}
                    </h3>
                    {formData.type === 'transfer' && (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Self-Onboard</span>
                            <button type="button" onClick={() => setIsSelfOnboard(!isSelfOnboard)} className={`relative w-10 h-5 rounded-full transition-all duration-300 ${isSelfOnboard ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'}`}><div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${isSelfOnboard ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    {/* ACCOUNT EXECUTIVE DROPDOWN: ONLY SHOWN FOR TRANSFERS */}
                    {formData.type === 'transfer' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Account Executive (Closer)</label>
                            <div className={`${isSelfOnboard ? 'opacity-50 pointer-events-none' : ''}`}>
                                <CustomSelect options={aeOptions} value={formData.aeName} onChange={(val) => setFormData(prev => ({ ...prev, aeName: val }))} placeholder="Select AE..." />
                            </div>
                        </div>
                    )}

                    {formData.type === 'appointment' ? (
                        <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Appointment Date</label>
                                <CustomDatePicker value={formData.date} onChange={(val) => setFormData(prev => ({...prev, date: val}))} required />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Time ({US_TIMEZONES.find(t => t.value === timeZone)?.short || 'Local'})</label>
                                <div className="flex gap-2">
                                    <div className="flex-1"><CustomSelect options={hours} value={timeHour} onChange={setTimeHour} /></div>
                                    <span className="self-center font-bold text-slate-400">:</span>
                                    <div className="flex-1"><CustomSelect options={minutes} value={timeMinute} onChange={setTimeMinute} /></div>
                                    <div className="flex-1"><CustomSelect options={["AM", "PM"]} value={timeAmPm} onChange={setTimeAmPm} /></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5"><IconNotes className="w-3 h-3" /> Context & Notes</label>
                            <textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={5} className="w-full px-5 py-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none shadow-inner custom-scrollbar" placeholder="Lead details for the AE..." />
                        </div>
                    )}

                    {initialData && !isRescheduling && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Update Stage</label>
                        <CustomSelect options={stageOptions} value={formData.stage} onChange={(val) => setFormData(prev => ({ ...prev, stage: val as AppointmentStage }))} />
                      </div>
                    )}
                </div>
             </div>
          </div>

          {formData.type === 'appointment' && (
            <div className="space-y-2 animate-in fade-in">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Context & Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={4} className="w-full px-5 py-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none shadow-inner" placeholder="Specific needs or deal details..." />
            </div>
          )}

          <div className="flex gap-3 pt-4">
             {initialData && !isRescheduling && (
                <button type="button" onClick={() => initialData?.id && onDelete?.(initialData.id)} className="px-6 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl transition-colors font-bold"><IconTrash className="w-5 h-5" /></button>
             )}
             <button type="submit" className="flex-1 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95 uppercase tracking-widest text-sm">
                {initialData ? 'Save Record Changes' : (formData.type === 'transfer' ? (isSelfOnboard ? 'Log Self Onboard' : 'Initiate Live Transfer') : 'Confirm Appointment')}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};
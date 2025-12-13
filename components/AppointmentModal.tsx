
import React, { useState, useEffect } from 'react';
import { Appointment, AppointmentStage, STAGE_LABELS, ACCOUNT_EXECUTIVES } from '../types';
import { IconX, IconTrash, IconBriefcase, IconCheck } from './Icons';
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
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  onDelete,
  initialData,
  isRescheduling = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    date: '',
    notes: '',
    stage: AppointmentStage.PENDING,
    aeName: ''
  });

  // Custom 12h Time Picker State
  const [timeHour, setTimeHour] = useState('9');
  const [timeMinute, setTimeMinute] = useState('00');
  const [timeAmPm, setTimeAmPm] = useState('AM');
  
  // Time Zone Support
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [detectedZoneBadge, setDetectedZoneBadge] = useState<string | null>(null);
  const [highlightTimeZone, setHighlightTimeZone] = useState(false);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
  const stageOptions = Object.values(AppointmentStage).map(stage => ({ value: stage, label: STAGE_LABELS[stage] }));

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const d = new Date(initialData.scheduledAt);
        const dateStr = d.toISOString().split('T')[0];
        
        // Parse ISO time to 12h format
        // NOTE: initialData.scheduledAt is ISO (UTC). 
        // When we edit, we usually see it in LOCAL time unless we stored the zone.
        // For simplicity in this demo, we initialize in User's Local Time (which corresponds to Browser Time).
        let h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        
        h = h % 12;
        h = h ? h : 12; // convert 0 to 12

        setTimeHour(h.toString());
        setTimeMinute(m);
        setTimeAmPm(ampm);
        
        // Default to Browser Timezone when editing existing, as we don't store the original TZ in DB
        setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);

        setFormData({
          name: initialData.name,
          phone: initialData.phone,
          email: initialData.email,
          date: dateStr,
          notes: initialData.notes || '',
          stage: isRescheduling ? AppointmentStage.RESCHEDULED : initialData.stage,
          aeName: initialData.aeName || ''
        });
      } else {
        // Reset defaults
        setFormData({
            name: '',
            phone: '',
            email: '',
            date: '',
            notes: '',
            stage: AppointmentStage.PENDING,
            aeName: ''
        });
        setTimeHour('9');
        setTimeMinute('00');
        setTimeAmPm('AM');
        setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      }
      setDetectedZoneBadge(null);
      setHighlightTimeZone(false);
    }
  }, [isOpen, initialData, isRescheduling]);

  if (!isOpen) return null;

  const handlePhoneBlur = () => {
     // Only detect if it's a new entry or user explicitly changed phone
     const detected = getTimeZoneFromPhone(formData.phone);
     if (detected) {
       // Always update and show feedback to confirm detection works
       setTimeZone(detected);
       const shortCode = US_TIMEZONES.find(tz => tz.value === detected)?.short || 'Local';
       setDetectedZoneBadge(shortCode);
       setHighlightTimeZone(true);
       setTimeout(() => {
           setDetectedZoneBadge(null);
           setHighlightTimeZone(false);
       }, 3000);
     }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Require AE if Onboarded
    if (formData.stage === AppointmentStage.ONBOARDED && !formData.aeName) {
       alert("Please select an Account Executive to mark as Onboarded.");
       return;
    }
    
    // Convert Client Time -> UTC using helper
    // 1. Construct 24h Time String "HH:MM"
    let hourInt = parseInt(timeHour);
    if (timeAmPm === 'PM' && hourInt !== 12) hourInt += 12;
    if (timeAmPm === 'AM' && hourInt === 12) hourInt = 0;
    
    const paddedMinute = timeMinute.padStart(2, '0');
    const timeStr = `${hourInt.toString().padStart(2, '0')}:${paddedMinute}`;
    
    // 2. Date String
    const dateBase = formData.date; // already YYYY-MM-DD from picker
    
    // 3. Convert via Helper
    const dateObj = dateFromClientTime(dateBase, timeStr, timeZone);
    const scheduledAt = dateObj.toISOString();
    
    onSubmit({
      ...formData,
      scheduledAt,
      id: initialData?.id 
    });
    onClose();
  };

  const handleDelete = () => {
    if (initialData?.id && onDelete) {
       onDelete(initialData.id);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleMinuteBlur = () => {
    let val = parseInt(timeMinute);
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;
    if (val > 59) val = 59;
    setTimeMinute(val.toString().padStart(2, '0'));
  };

  // Show AE selector if Transfer OR Onboarding
  const shouldShowAE = initialData?.type === 'transfer' || formData.stage === AppointmentStage.ONBOARDED;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg md:max-w-3xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85dvh] md:h-auto md:max-h-none md:overflow-visible overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-3xl shrink-0">
          <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white">
            {initialData ? (isRescheduling ? 'Reschedule Appointment' : (initialData.type === 'transfer' ? 'Edit Transfer' : 'Edit Appointment')) : 'New Appointment'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
            <IconX className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-5 overflow-y-auto md:overflow-visible no-scrollbar pb-10 md:pb-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
             
             {/* LEFT COLUMN */}
             <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:block border-b border-slate-100 dark:border-slate-700/50 pb-2">Client Details</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Client Name</label>
                  <input
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    placeholder="John Doe"
                  />
                </div>
                
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
                  <input
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handlePhoneBlur}
                    type="tel"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    placeholder="(555) 123-4567"
                  />
                  {detectedZoneBadge && (
                    <div className="absolute right-3 top-9 animate-in fade-in zoom-in duration-300">
                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold">
                           <IconCheck className="w-3 h-3" /> {detectedZoneBadge}
                        </span>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                  <input
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    type="email"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    placeholder="john@example.com"
                  />
                </div>
             </div>

             {/* RIGHT COLUMN */}
             <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:block border-b border-slate-100 dark:border-slate-700/50 pb-2">Appointment Details</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date</label>
                  <CustomDatePicker 
                    value={formData.date} 
                    onChange={(val) => setFormData(prev => ({...prev, date: val}))}
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                         Time
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all duration-500 ${highlightTimeZone ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 animate-pulse ring-1 ring-emerald-500' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                           {US_TIMEZONES.find(t => t.value === timeZone)?.short || 'Local'}
                         </span>
                      </label>
                  </div>
                  <div className="flex gap-2">
                      <div className="w-20 sm:w-24">
                        <CustomSelect options={hours} value={timeHour} onChange={setTimeHour} className="text-center" />
                      </div>
                      <span className="self-center font-bold text-slate-400">:</span>
                      <div className="w-20 sm:w-24">
                        <CustomSelect 
                            options={minutes} 
                            value={timeMinute} 
                            onChange={setTimeMinute} 
                            editable 
                            onBlur={handleMinuteBlur}
                            className="text-center"
                        />
                      </div>
                      <div className="w-20 sm:w-24">
                        <CustomSelect options={["AM", "PM"]} value={timeAmPm} onChange={setTimeAmPm} className="text-center" />
                      </div>
                  </div>
                </div>

                {initialData && !isRescheduling && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Stage</label>
                    <CustomSelect 
                      options={stageOptions}
                      value={formData.stage}
                      onChange={(val) => setFormData(prev => ({ ...prev, stage: val as AppointmentStage }))}
                    />
                  </div>
                )}

                {shouldShowAE && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                         <IconBriefcase className="w-4 h-4 text-indigo-500" /> Account Executive
                      </label>
                      <CustomSelect 
                        options={ACCOUNT_EXECUTIVES}
                        value={formData.aeName}
                        onChange={(val) => setFormData(prev => ({ ...prev, aeName: val }))}
                        placeholder="Select Account Executive..."
                      />
                  </div>
                )}

                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
                   <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none placeholder-slate-400 custom-scrollbar"
                      placeholder="Optional notes..."
                   />
                </div>
             </div>
          </div>

          <div className="pt-2 flex gap-3">
            {initialData && !isRescheduling && (
               <button
                 type="button"
                 onClick={handleDelete}
                 className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 dark:text-rose-400 font-semibold rounded-xl transition-colors"
                 title="Delete"
               >
                 <IconTrash className="w-5 h-5" />
               </button>
            )}
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-transform active:scale-95"
            >
              {initialData ? 'Save Changes' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

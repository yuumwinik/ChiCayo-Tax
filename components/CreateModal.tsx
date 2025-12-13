
import React, { useState, useEffect } from 'react';
import { AppointmentStage, ACCOUNT_EXECUTIVES, User } from '../types';
import { IconX, IconTransfer, IconBriefcase, IconSparkles, IconCalendar, IconCheck } from './Icons';
import { CustomSelect } from './CustomSelect';
import { CustomDatePicker } from './CustomDatePicker';
import { US_TIMEZONES, getTimeZoneFromPhone, dateFromClientTime } from '../utils/timeZoneData';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isAdminMode?: boolean;
  agentOptions?: User[];
  currentUserEmail?: string;
  currentUserName?: string;
}

export const CreateModal: React.FC<CreateModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isAdminMode = false,
  agentOptions = [],
  currentUserEmail,
  currentUserName
}) => {
  const [isTransfer, setIsTransfer] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    date: '',
    notes: '',
    aeName: ''
  });

  // Time Picker State (12h format)
  const [timeHour, setTimeHour] = useState('9');
  const [timeMinute, setTimeMinute] = useState('00');
  const [timeAmPm, setTimeAmPm] = useState('AM');
  
  // Time Zone State
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [detectedZoneBadge, setDetectedZoneBadge] = useState<string | null>(null);
  const [highlightTimeZone, setHighlightTimeZone] = useState(false);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  // 5 minute increments for dropdown
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  // Derived display for the badge
  const currentZoneShort = US_TIMEZONES.find(tz => tz.value === timeZone)?.short || 'Local';

  // Check if User is Self-Onboarding
  const isSelfOnboard = currentUserName && formData.aeName === currentUserName;

  // Reset state when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
        setIsTransfer(false); // Default to standard
        setTargetUserId('');
        setFormData({ name: '', phone: '', email: '', date: '', notes: '', aeName: '' });
        setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        setDetectedZoneBadge(null);
        setHighlightTimeZone(false);
        
        // Auto-detect AE for Admin Mode
        if (isAdminMode && currentUserEmail) {
            const emailLower = currentUserEmail.toLowerCase();
            if (emailLower.includes('joshua')) setFormData(prev => ({...prev, aeName: 'Joshua'}));
            else if (emailLower.includes('jorge')) setFormData(prev => ({...prev, aeName: 'Jorge'}));
            else if (emailLower.includes('andrew')) setFormData(prev => ({...prev, aeName: 'Andrew'}));
        }
    }
  }, [isOpen, isAdminMode, currentUserEmail]);

  if (!isOpen) return null;

  const handlePhoneBlur = () => {
    const detected = getTimeZoneFromPhone(formData.phone);
    if (detected) {
      // Always update and show feedback to confirm detection works, even if same zone
      setTimeZone(detected);
      const shortCode = US_TIMEZONES.find(tz => tz.value === detected)?.short || 'Local';
      setDetectedZoneBadge(shortCode);
      setHighlightTimeZone(true);
      setTimeout(() => {
          setDetectedZoneBadge(null);
          setHighlightTimeZone(false);
      }, 3000); // Hide animation after 3s
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation for Admin Mode
    if (isAdminMode) {
        if (!targetUserId) {
            alert("Please select the Agent to credit this deal to.");
            return;
        }
        if (!formData.aeName) {
            alert("Please select the Account Executive.");
            return;
        }
    }

    let scheduledAt: string;

    if (isTransfer) {
        // LIVE TRANSFER: Logged at current real-time
        scheduledAt = new Date().toISOString();
    } else {
        // APPOINTMENT: Convert Client Time -> UTC using helper
        // 1. Construct 24h Time String "HH:MM"
        let hourInt = parseInt(timeHour);
        if (timeAmPm === 'PM' && hourInt !== 12) hourInt += 12;
        if (timeAmPm === 'AM' && hourInt === 12) hourInt = 0;
        
        const paddedMinute = timeMinute.padStart(2, '0');
        const timeStr = `${hourInt.toString().padStart(2, '0')}:${paddedMinute}`;
        
        // 2. Get Date String (YYYY-MM-DD)
        const dateBase = formData.date || new Date().toLocaleDateString('en-CA');
        
        // 3. Convert via Helper
        const dateObj = dateFromClientTime(dateBase, timeStr, timeZone);
        scheduledAt = dateObj.toISOString();
    }
    
    // Determine Stage
    let stage = AppointmentStage.PENDING;
    if (isAdminMode) stage = AppointmentStage.ONBOARDED;
    if (isSelfOnboard) stage = AppointmentStage.ONBOARDED; // Self-Onboard goes direct to Onboarded

    onSubmit({
      ...formData,
      scheduledAt,
      stage,
      createdAt: new Date().toISOString(),
      type: isTransfer ? 'transfer' : 'appointment',
      aeName: (isTransfer || isAdminMode) ? formData.aeName : undefined,
      targetUserId: isAdminMode ? targetUserId : undefined
    });
    
    onClose();
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

  // Build AE Options: List + Current User
  const aeOptions = [...ACCOUNT_EXECUTIVES];
  if (currentUserName && !aeOptions.includes(currentUserName)) {
      aeOptions.push(currentUserName);
  }

  // Visual Theme Logic
  const isSparkleMode = isAdminMode || isSelfOnboard;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg md:max-w-3xl animate-in zoom-in-95 duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col max-h-[85dvh] md:h-auto md:max-h-none md:overflow-visible overflow-hidden">
        
        {/* HEADER */}
        <div className={`px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-3xl shrink-0 ${isSparkleMode ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
          <div className="flex items-center gap-4">
             <div className={`p-2 rounded-xl ${isSparkleMode ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : isTransfer ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                {isSparkleMode ? <IconSparkles className="w-5 h-5" /> : isTransfer ? <IconTransfer className="w-5 h-5" /> : <IconCalendar className="w-5 h-5" />}
             </div>
             <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white">
                {isAdminMode ? 'Log Onboarded Partner' : (isSelfOnboard ? 'Log Your Onboard' : (isTransfer ? 'Log Live Transfer' : 'New Appointment'))}
             </h2>
             
             {/* MODE TOGGLE SWITCH - Hidden in Admin Mode */}
             {!isAdminMode && (
                <label className="relative inline-flex items-center cursor-pointer ml-2">
                    <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={isTransfer}
                    onChange={() => setIsTransfer(!isTransfer)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {isTransfer ? 'Transfer' : 'Standard'}
                    </span>
                </label>
             )}
          </div>
          
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
            <IconX className="w-5 h-5" />
          </button>
        </div>
        
        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-5 overflow-y-auto md:overflow-visible custom-scrollbar pb-10 md:pb-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
             
             {/* LEFT COLUMN: CLIENT INFO */}
             <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:block border-b border-slate-100 dark:border-slate-700/50 pb-2">Client Details</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Client Name</label>
                  <input
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
                    placeholder="John Doe"
                  />
                </div>
                
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handlePhoneBlur}
                    type="tel"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
                    placeholder="(555) 123-4567"
                  />
                  {detectedZoneBadge && (
                    <div className="absolute right-3 top-9 animate-in fade-in zoom-in duration-300">
                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold shadow-sm">
                           <IconCheck className="w-3 h-3" /> {detectedZoneBadge}
                        </span>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    type="email"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
                    placeholder="client@email.com"
                  />
                </div>
             </div>

             {/* RIGHT COLUMN: SCHEDULING & CREDIT */}
             <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:block border-b border-slate-100 dark:border-slate-700/50 pb-2">
                   {isAdminMode ? 'Deal Credit & Details' : (isSelfOnboard ? 'Self Onboard Details' : (isTransfer ? 'Transfer Details' : 'Scheduling'))}
                </h3>

                {/* ADMIN MODE FIELDS */}
                {isAdminMode && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Credit Deal To (Agent)</label>
                            <CustomSelect 
                                options={agentOptions.map(u => ({ value: u.id, label: u.name }))}
                                value={targetUserId}
                                onChange={setTargetUserId}
                                placeholder="Select Agent..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account Executive (Closer)</label>
                            <CustomSelect 
                                options={aeOptions}
                                value={formData.aeName}
                                onChange={(val) => setFormData(prev => ({ ...prev, aeName: val }))}
                                placeholder="Select AE..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Onboard Date</label>
                            <CustomDatePicker 
                                value={formData.date} 
                                onChange={(val) => setFormData(prev => ({...prev, date: val}))}
                                required
                            />
                        </div>
                    </div>
                )}

                {/* TRANSFER MODE FIELDS */}
                {!isAdminMode && isTransfer && (
                   <div className="animate-in fade-in slide-in-from-top-2">
                       <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                          <IconBriefcase className="w-4 h-4 text-indigo-500" /> Transferred To (AE)
                       </label>
                       <CustomSelect 
                          options={aeOptions}
                          value={formData.aeName}
                          onChange={(val) => setFormData(prev => ({ ...prev, aeName: val }))}
                          placeholder="Select Account Executive..."
                       />
                       {isSelfOnboard ? (
                          <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg flex items-center gap-2 animate-in fade-in">
                             <IconSparkles className="w-4 h-4" /> You are closing this deal yourself!
                          </div>
                       ) : (
                          <p className="text-xs text-slate-500 mt-2 ml-1">Live transfers are logged at the current time.</p>
                       )}
                   </div>
                )}

                {/* STANDARD APPOINTMENT FIELDS */}
                {!isAdminMode && !isTransfer && (
                   <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                        <CustomDatePicker 
                          value={formData.date} 
                          onChange={(val) => setFormData(prev => ({...prev, date: val}))}
                          required
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                               Time 
                               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all duration-500 ${highlightTimeZone ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 animate-pulse ring-1 ring-emerald-500' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                  {currentZoneShort}
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
                   </div>
                )}

                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                   <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={isAdminMode || isTransfer ? 3 : 3}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none placeholder-slate-400 custom-scrollbar"
                      placeholder="Optional notes..."
                   />
                </div>
             </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3.5 px-4 font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${isSparkleMode ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200/50 dark:shadow-none text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none'}`}
            >
              {isAdminMode ? (
                  <>
                    <IconSparkles className="w-5 h-5" /> Log Onboarded Partner
                  </>
              ) : isSelfOnboard ? (
                  <>
                    <IconSparkles className="w-5 h-5" /> Confirm Self Onboard
                  </>
              ) : (
                  <>
                    {isTransfer && <IconTransfer className="w-5 h-5" />}
                    {isTransfer ? 'Log Live Transfer' : 'Set Appointment'}
                  </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

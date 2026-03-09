
import React, { useState, useEffect } from 'react';
import { Reminder, AppointmentStage } from '../types';
import { IconPlus, IconX, IconCalendar, IconCheck, IconTransfer, IconActivity } from './Icons';
import { CustomDatePicker } from './CustomDatePicker';
import { CustomSelect } from './CustomSelect';
import { US_TIMEZONES, getTimeZoneFromPhone, dateFromClientTime } from '../utils/timeZoneData';
import { generateId } from '../utils/dateUtils';

interface ReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Reminder>) => Promise<void>;
    onConvert?: (data: Partial<Reminder>, stage: AppointmentStage) => Promise<void>;
    editingReminder: Reminder | null;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose, onSave, onConvert, editingReminder }) => {
    const [formData, setFormData] = useState<Partial<Reminder>>({
        name: '',
        phone: '',
        email: '',
        notes: '',
        isPendingActivation: false
    });

    // Scheduler State
    const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
    const [timeHour, setTimeHour] = useState('9');
    const [timeMinute, setTimeMinute] = useState('00');
    const [timeAmPm, setTimeAmPm] = useState('AM');
    const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [detectedZoneBadge, setDetectedZoneBadge] = useState<string | null>(null);

    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
    const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

    useEffect(() => {
        if (isOpen) {
            if (editingReminder) {
                setFormData({ ...editingReminder });
                const d = new Date(editingReminder.callBackAt);
                setDate(d.toLocaleDateString('en-CA'));
                let h = d.getHours();
                const ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12;
                h = h ? h : 12;
                setTimeHour(h.toString());
                setTimeMinute(d.getMinutes().toString().padStart(2, '0'));
                setTimeAmPm(ampm);
            } else {
                setFormData({ name: '', phone: '', email: '', notes: '', isPendingActivation: false });
                setDate(new Date().toLocaleDateString('en-CA'));
                setTimeHour('9');
                setTimeMinute('00');
                setTimeAmPm('AM');
            }
            setDetectedZoneBadge(null);
        }
    }, [isOpen, editingReminder]);

    const handlePhoneBlur = () => {
        const detected = getTimeZoneFromPhone(formData.phone || '');
        if (detected) {
            setTimeZone(detected);
            const shortCode = US_TIMEZONES.find(tz => tz.value === detected)?.short || 'Local';
            setDetectedZoneBadge(shortCode);
            setTimeout(() => { setDetectedZoneBadge(null); }, 3000);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let hourInt = parseInt(timeHour);
        if (timeAmPm === 'PM' && hourInt !== 12) hourInt += 12;
        if (timeAmPm === 'AM' && hourInt === 12) hourInt = 0;
        const timeStr = `${hourInt.toString().padStart(2, '0')}:${timeMinute.padStart(2, '0')}`;
        const isoDate = dateFromClientTime(date, timeStr, timeZone).toISOString();

        await onSave({
            ...formData,
            callBackAt: isoDate,
            id: editingReminder?.id
        });
        onClose();
    };

    const handleConvert = async (stage: AppointmentStage) => {
        if (!onConvert) return;
        let hourInt = parseInt(timeHour);
        if (timeAmPm === 'PM' && hourInt !== 12) hourInt += 12;
        if (timeAmPm === 'AM' && hourInt === 12) hourInt = 0;
        const timeStr = `${hourInt.toString().padStart(2, '0')}:${timeMinute.padStart(2, '0')}`;
        const isoDate = dateFromClientTime(date, timeStr, timeZone).toISOString();
        await onConvert({ ...formData, callBackAt: isoDate, id: editingReminder?.id || generateId() }, stage);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60 animate-in fade-in duration-300 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-xl p-8 md:p-10 border border-white/20 relative animate-in zoom-in-95 duration-300 my-auto">
                <button onClick={onClose} className="absolute top-8 right-8 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-all z-10"><IconX className="w-6 h-6" /></button>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100/50">
                        <IconPlus className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                            {editingReminder ? 'Update Reminder' : 'Log a Reminder'}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">Quick log for account review or callback requests.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Lead Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold"
                                placeholder="Client Full Name"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Phone Number</label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    onBlur={handlePhoneBlur}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold"
                                    placeholder="555-555-5555"
                                />
                                {detectedZoneBadge && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-in fade-in zoom-in duration-300">
                                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold shadow-sm">
                                            {detectedZoneBadge}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email (Optional)</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold"
                            placeholder="client@email.com"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Callback Date</label>
                            <CustomDatePicker value={date} onChange={setDate} required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Time ({US_TIMEZONES.find(t => t.value === timeZone)?.short || 'Local'})</label>
                            <div className="flex gap-2">
                                <div className="flex-1"><CustomSelect options={hours} value={timeHour} onChange={setTimeHour} /></div>
                                <span className="self-center font-bold text-slate-400">:</span>
                                <div className="flex-1"><CustomSelect options={minutes} value={timeMinute} onChange={setTimeMinute} /></div>
                                <div className="flex-1"><CustomSelect options={["AM", "PM"]} value={timeAmPm} onChange={setTimeAmPm} /></div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Action Notes</label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold resize-none"
                            placeholder="What needs to happen?"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Pending Activation</span>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isPendingActivation: !formData.isPendingActivation })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isPendingActivation ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isPendingActivation ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                    >
                        {editingReminder ? 'Save Changes' : 'Confirm Reminder'}
                    </button>
                </form>
            </div>
        </div>
    );
};

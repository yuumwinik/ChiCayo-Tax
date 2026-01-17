
import React, { useState, useEffect, useMemo } from 'react';
import { PayCycle, Appointment, User, AppointmentStage, ReferralHistoryEntry } from '../../types';
import { formatDate, formatCurrency } from '../../utils/dateUtils';
import * as XLSX from 'xlsx';
import { IconPlus, IconCycle, IconTrash, IconDollarSign, IconChevronUp, IconChevronDown, IconEdit, IconCheck, IconX, IconClock, IconSparkles, IconLock, IconUsers, IconDownload, IconCalendar, IconBot, IconSearch, IconActivity, IconTransfer, IconBriefcase } from '../Icons';
import { CustomDatePicker } from '../CustomDatePicker';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { GoogleGenAI, Type } from "@google/genai";
import { CustomSelect } from '../CustomSelect';

interface AdminCyclesProps {
    cycles: PayCycle[];
    onAddCycle: (startDate: string, endDate: string) => void;
    onEditCycle: (id: string, startDate: string, endDate: string) => void;
    onDeleteCycle: (id: string) => void;
    commissionRate?: number;
    selfCommissionRate?: number;
    referralRate?: number;
    onUpdateMasterCommissions: (std: number, self: number, referral: number, syncRetroactive: boolean) => void;
    onImportReferrals?: (rows: { name: string, phone: string, referrals: number, date: string }[]) => void;
    appointments?: Appointment[];
    allUsers?: User[];
    onManualReferral?: (clientId: string, count: number) => void;
    onDeleteReferral?: (clientId: string, entryId: string) => void;
}

export const AdminCycles: React.FC<AdminCyclesProps> = ({
    cycles, onAddCycle, onEditCycle, onDeleteCycle,
    commissionRate = 200, selfCommissionRate = 300, referralRate = 200,
    onUpdateMasterCommissions,
    onImportReferrals,
    appointments = [],
    allUsers = [],
    onManualReferral,
    onDeleteReferral
}) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLocked, setIsLocked] = useState(true);
    const [tempStd, setTempStd] = useState((commissionRate / 100).toString());
    const [tempSelf, setTempSelf] = useState((selfCommissionRate / 100).toString());
    const [tempReferral, setTempReferral] = useState((referralRate / 100).toString());
    const [syncRetroactive, setSyncRetroactive] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [lookupQuery, setLookupQuery] = useState('');
    const [selectedAgentFilter, setSelectedAgentFilter] = useState('all');
    const [aiInput, setAiInput] = useState('');
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [showManualSync, setShowManualSync] = useState(false);
    const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
    const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});

    // PREVIEW MODAL STATE
    const [previewData, setPreviewData] = useState<{ rows: any[], source: 'ai' | 'file' } | null>(null);

    useEffect(() => {
        if (isLocked) {
            setTempStd((commissionRate / 100).toString());
            setTempSelf((selfCommissionRate / 100).toString());
            setTempReferral((referralRate / 100).toString());
        }
    }, [commissionRate, selfCommissionRate, referralRate, isLocked]);

    const handleApplySync = () => {
        onUpdateMasterCommissions(
            Math.round(parseFloat(tempStd) * 100),
            Math.round(parseFloat(tempSelf) * 100),
            Math.round(parseFloat(tempReferral) * 100),
            syncRetroactive
        );
        setIsLocked(true);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

        reader.onload = async (event) => {
            if (isExcel) {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

                const referrals = rows.filter(r =>
                    (r.Type && String(r.Type).toLowerCase().includes('referral')) ||
                    (r.type && String(r.type).toLowerCase().includes('referral'))
                );

                if (referrals.length > 0) {
                    setIsAiProcessing(true);
                    await runAiAudit(referrals);
                    setIsAiProcessing(false);
                } else {
                    alert("No 'Referral' types found in this sheet.");
                }
            } else {
                // Legacy CSV path
                const text = event.target?.result as string;
                const rows = text.split('\n').slice(1).filter(r => r.trim());
                const parsedData = rows.map(row => {
                    const cols = row.split(',').map(c => c.replace(/^"|"$/g, '').trim());
                    return { date: cols[1] || cols[0], name: cols[4] || '', phone: cols[5] || '', referrals: parseInt(cols[9] || '0') };
                }).filter(d => (d.name || d.phone) && !isNaN(d.referrals));

                if (parsedData.length > 0) {
                    setPreviewData({ rows: parsedData, source: 'file' });
                }
            }
        };

        if (isExcel) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
        e.target.value = '';
    };

    const runAiAudit = async (referralRows: any[]) => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const onboarded = appointments.filter(a => a.stage === AppointmentStage.ONBOARDED);

            // Prepare a clean list of referral candidates from the file
            const candidates = referralRows.map(r => ({
                name: r.Name || r.name || 'Unknown',
                phone: r["Referrer Phone"] || r.phone || '',
                commission: r[" Commission "] || r.commission || 0
            }));

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: `Review these referral records from an Excel export and match them to our database clients. 
              Each referral must belong to an Agent who owns the onboarded client.
              
              EXCEL RECORDS:
              ${JSON.stringify(candidates)}
              
              DATABASE CLIENTS:
              ${onboarded.map(a => `${a.name} (ID:${a.id}, Phone:${a.phone}, Agent:${allUsers.find(u => u.id === a.userId)?.name || 'Unknown'})`).join('\n')}
              
              RULES:
              1. A commission of 2 ($2.00) equals 1 referral.
              2. Match Excel "Name" or "Referrer Phone" to Database "Name" or "Phone" (fuzzy matching allowed).
              3. Only include rows that match a database client who is already ONBOARDED.
              4. Return the new referral count to ADD (so for commission 2, add 1).
              5. Identify the Agent (Name) who owns this client.
              
              Output JSON only as an array of objects.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                clientId: { type: Type.STRING },
                                name: { type: Type.STRING },
                                delta: { type: Type.NUMBER },
                                agentName: { type: Type.STRING },
                                originalRowIndex: { type: Type.NUMBER }
                            },
                            required: ['clientId', 'name', 'delta']
                        }
                    }
                }
            });

            const results = JSON.parse(response.text);
            if (results.length > 0) {
                setPreviewData({
                    rows: results.map((r: any) => {
                        const target = appointments.find(a => a.id === r.clientId);
                        return {
                            name: r.name,
                            delta: r.delta,
                            clientId: r.clientId,
                            referrals: (target?.referralCount || 0) + r.delta,
                            phone: target?.phone || '',
                            agentName: allUsers.find(u => u.id === target?.userId)?.name || r.agentName
                        };
                    }),
                    source: 'ai'
                });
            } else {
                alert("AI couldn't find any clear matches for these referrals.");
            }
        } catch (e) {
            console.error(e);
            alert("AI Audit failed. Please check your API key and file format.");
        }
    };

    const handleAiIntake = async () => {
        if (!aiInput.trim() || isAiProcessing) return;
        setIsAiProcessing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const onboarded = appointments.filter(a => a.stage === AppointmentStage.ONBOARDED);

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: aiInput,
                config: {
                    systemInstruction: `You are the Referral Auditor. Parse natural language into a manual referral update.
                  CLIENTS IN DB: ${onboarded.map(a => `${a.name} (id:${a.id}, Agent:${allUsers.find(u => u.id === a.userId)?.name || 'Unknown'})`).join(', ')}.
                  RULES:
                  1. Identify all clients mentioned and their referral counts.
                  2. For each, find the closest name match from the DB.
                  3. Identify the Agent assigned to each client.
                  Output JSON only as an array of objects.`,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                clientId: { type: Type.STRING },
                                newReferralCount: { type: Type.NUMBER },
                                name: { type: Type.STRING },
                                agentName: { type: Type.STRING }
                            },
                            required: ['clientId', 'newReferralCount']
                        }
                    }
                }
            });

            const results = JSON.parse(response.text);
            if (results.length > 0) {
                setPreviewData({
                    rows: results.map((res: any) => {
                        const target = appointments.find(a => a.id === res.clientId);
                        return {
                            name: target?.name || res.name,
                            phone: target?.phone || '',
                            referrals: (target?.referralCount || 0) + res.newReferralCount,
                            delta: res.newReferralCount,
                            clientId: res.clientId,
                            agentName: allUsers.find(u => u.id === target?.userId)?.name || res.agentName
                        };
                    }),
                    source: 'ai'
                });
            }
        } catch (e) {
            alert("Taxter couldn't decipher that. Try: 'Client John Doe referred 2 today.'");
        } finally {
            setIsAiProcessing(false);
        }
    };

    const confirmSync = async () => {
        if (!previewData) return;
        if (previewData.source === 'file') {
            if (onImportReferrals) onImportReferrals(previewData.rows);
        } else {
            // Process ALL rows for AI source
            for (const entry of previewData.rows) {
                if (onManualReferral) onManualReferral(entry.clientId, entry.referrals);
            }
            setAiInput('');
        }
        setPreviewData(null);
    };

    const onboardedList = useMemo(() => {
        let list = appointments.filter(a => a.stage === AppointmentStage.ONBOARDED);
        if (lookupQuery) {
            list = list.filter(a => a.name.toLowerCase().includes(lookupQuery.toLowerCase()) || a.phone.includes(lookupQuery));
        }
        if (selectedAgentFilter !== 'all') {
            list = list.filter(a => a.userId === selectedAgentFilter);
        }
        if (!lookupQuery && selectedAgentFilter === 'all') {
            return [...list].sort(() => Math.random() - 0.5).slice(0, 10);
        }
        return list.slice(0, 10);
    }, [appointments, lookupQuery, selectedAgentFilter]);

    const now = new Date().getTime();
    const activeAndUpcoming = cycles.filter(c => {
        const end = new Date(c.endDate).setHours(23, 59, 59, 999);
        return end >= now;
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(a.startDate).getTime());

    const agentOptions = useMemo(() => {
        return [{ value: 'all', label: 'All Agents' }, ...allUsers.filter(u => u.role !== 'admin').map(u => ({ value: u.id, label: u.name }))];
    }, [allUsers]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <DeleteConfirmationModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) onDeleteCycle(deleteId); }} title="Delete Pay Cycle?" message="Permanently remove this cycle? Note: Historical production data remains, but it will be detached from this specific window." />

            {/* PREVIEW MODAL */}
            {previewData && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden border border-white/10 flex flex-col">
                        <div className="px-10 py-8 border-b dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <IconSparkles className="w-6 h-6 text-indigo-600" />
                                    Review Ledger Sync
                                </h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Found {previewData.rows.length} pending updates</p>
                            </div>
                            <button onClick={() => setPreviewData(null)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><IconX className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[400px] p-10 space-y-4 no-scrollbar">
                            {previewData.rows.map((row, i) => (
                                <div key={i} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group">
                                    <div>
                                        <h4 className="font-black text-slate-900 dark:text-white text-sm">{row.name}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{row.phone}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-emerald-600">+{row.delta || row.referrals} Leads</div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">+{formatCurrency((row.delta || row.referrals) * (referralRate || 0))}</div>
                                        {row.agentName && (
                                            <div className="text-[9px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-lg mt-1 inline-block">
                                                {row.agentName}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-10 border-t dark:border-slate-800 flex gap-4">
                            <button onClick={() => setPreviewData(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl text-xs uppercase tracking-widest transition-all">Cancel</button>
                            <button onClick={confirmSync} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all">Confirm & Sync Ledger</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Commission Controls */}
            <div className={`bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-2 transition-all duration-500 shadow-xl relative overflow-hidden group ${isLocked ? 'border-transparent' : 'border-indigo-500 ring-4 ring-indigo-500/10'}`}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-10 relative z-10">
                    <div className="flex items-center gap-6">
                        <button onClick={() => setIsLocked(!isLocked)} className={`p-5 rounded-3xl transition-all duration-500 shadow-lg ${isLocked ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white shadow-indigo-200 dark:shadow-none rotate-6 scale-110'}`}>
                            {isLocked ? <IconLock className="w-8 h-8" /> : <IconSparkles className="w-8 h-8" />}
                        </button>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none mb-1">Commission Controls</h3>
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.15em]">Manage Global Payout Variables</p>
                        </div>
                    </div>
                    <div className="flex gap-6 items-center">
                        <div className="space-y-1.5 text-center">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Standard</label>
                            <input disabled={isLocked} value={tempStd} onChange={e => setTempStd(e.target.value)} type="number" className="w-24 px-3 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-center text-lg focus:ring-2 focus:ring-indigo-500 transition-all" />
                        </div>
                        <div className="space-y-1.5 text-center">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Self-Close</label>
                            <input disabled={isLocked} value={tempSelf} onChange={e => setTempSelf(e.target.value)} type="number" className="w-24 px-3 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-center text-lg focus:ring-2 focus:ring-indigo-500 transition-all" />
                        </div>
                        <div className="space-y-1.5 text-center">
                            <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Referral</label>
                            <input disabled={isLocked} value={tempReferral} onChange={e => setTempReferral(e.target.value)} type="number" className="w-24 px-3 py-3 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border-none font-black text-center text-lg text-rose-600 focus:ring-2 focus:ring-rose-500 transition-all" />
                        </div>
                        {!isLocked && <button onClick={handleApplySync} className="px-8 py-3.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 shadow-2xl transition-all animate-in zoom-in-95">Sync & Lock</button>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* New Window */}
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white mb-8 uppercase tracking-widest flex items-center gap-4"><IconPlus className="w-5 h-5 text-indigo-500" /> New Management Window</h3>
                    <div className="space-y-8 flex-1">
                        <div className="grid grid-cols-2 gap-6">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Start Date</label><CustomDatePicker value={startDate} onChange={setStartDate} /></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-widest">End Date</label><CustomDatePicker value={endDate} onChange={setEndDate} /></div>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-4">
                            <IconClock className="w-6 h-6 text-indigo-600" />
                            <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 leading-relaxed">Appointments scheduled within this timeframe will automatically be grouped into this payout ledger.</p>
                        </div>
                        <button onClick={() => { if (startDate && endDate) onAddCycle(startDate, endDate); setStartDate(''); setEndDate(''); }} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-3xl shadow-xl transition-all active:scale-95 mt-auto">Establish Payout Window</button>
                    </div>
                </div>

                {/* Active Windows */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-4"><IconCycle className="w-5 h-5 text-indigo-500" /> Active Windows</h3>
                    </div>
                    <div className="space-y-4">
                        {activeAndUpcoming.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-16 text-center">
                                <IconCalendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Active Windows Scheduled</p>
                            </div>
                        ) : (
                            activeAndUpcoming.map(cycle => {
                                const isActive = now >= new Date(cycle.startDate).getTime() && now <= new Date(cycle.endDate).setHours(23, 59, 59, 999);
                                return (
                                    <div key={cycle.id} className={`p-6 rounded-[2rem] border transition-all flex justify-between items-center group ${isActive ? 'bg-indigo-600 text-white border-indigo-400 shadow-xl shadow-indigo-200 dark:shadow-none' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm'}`}>
                                        <div className="flex items-center gap-6">
                                            <div className={`p-3 rounded-2xl shadow-sm ${isActive ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-800 text-indigo-500'}`}><IconClock className="w-6 h-6" /></div>
                                            <div>
                                                <p className={`text-sm font-black ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}</p>
                                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>{isActive ? 'LIVE ACTIVE SESSION' : 'UPCOMING WINDOW'}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => setDeleteId(cycle.id)} className={`p-3 rounded-xl transition-all ${isActive ? 'hover:bg-white/20 text-white/60 hover:text-white' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}><IconTrash className="w-5 h-5" /></button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Referral Sync Center */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-xl space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-50 dark:border-slate-800 pb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                            <div className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-200 dark:shadow-none"><IconUsers className="w-6 h-6" /></div>
                            Referral Sync Center
                        </h3>
                        <p className="text-xs text-slate-500 font-bold mt-1">Intelligent intake: Sync reports, AI Joe Auditor, or manual ledger lookup.</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl flex gap-1">
                        <button onClick={() => setShowManualSync(false)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!showManualSync ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400'}`}>Report Sync</button>
                        <button onClick={() => setShowManualSync(true)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showManualSync ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400'}`}>Manual Lookup</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {!showManualSync ? (
                        <>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legacy Report Upload</label>
                                <div className="bg-slate-50 dark:bg-slate-950 rounded-[2rem] p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col justify-center items-center text-center group hover:border-indigo-400 transition-all cursor-pointer relative overflow-hidden">
                                    <input type="file" accept=".csv, .xlsx, .xls, .doc, .docx, .pdf, .txt" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm"><IconDownload className="w-6 h-6" /></div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1">Batch Report Intake</h4>
                                    <p className="text-[9px] text-slate-500 font-bold max-w-[200px]">Drop CSV spreadsheets to match and sync thousands of partner referrals at once.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Taxter AI Auditor</label>
                                <div className="relative">
                                    <textarea
                                        value={aiInput}
                                        onChange={e => setAiInput(e.target.value)}
                                        placeholder="e.g. Mary Jane referred 2 people today"
                                        className="w-full h-[180px] bg-indigo-50 dark:bg-indigo-950/20 p-6 rounded-[2rem] border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white placeholder-indigo-300 resize-none shadow-inner transition-all outline-none"
                                    />
                                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                                        <button
                                            onClick={handleAiIntake}
                                            disabled={!aiInput.trim() || isAiProcessing}
                                            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 z-20"
                                        >
                                            {isAiProcessing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <IconBot className="w-4 h-4" />}
                                            Sync with AI
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex flex-col md:flex-row items-center gap-4">
                                    <div className="relative flex-1 group w-full">
                                        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                                        <input
                                            value={lookupQuery}
                                            onChange={e => setLookupQuery(e.target.value)}
                                            placeholder="Search Onboarded History (Name/Phone)..."
                                            className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none focus:ring-2 focus:ring-rose-500 text-sm font-bold text-slate-900 dark:text-white shadow-inner outline-none"
                                        />
                                    </div>
                                    <div className="w-full md:w-64">
                                        <CustomSelect
                                            options={agentOptions}
                                            value={selectedAgentFilter}
                                            onChange={setSelectedAgentFilter}
                                            placeholder="Filter by Agent..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {onboardedList.map(appt => {
                                        const agent = allUsers.find(u => u.id === appt.userId);
                                        const isSelfOnboard = appt.aeName === agent?.name;
                                        const totalEarned = (appt.earnedAmount || 0) + ((appt.referralCount || 0) * referralRate);
                                        const isExpanded = expandedClientId === appt.id;

                                        return (
                                            <div key={appt.id} className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 flex flex-col gap-4 group transition-all hover:border-rose-300 hover:shadow-xl hover:shadow-rose-100 dark:hover:shadow-none relative h-fit">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-black text-slate-500 shadow-sm">{appt.name.charAt(0)}</div>
                                                        <div>
                                                            <h5 className="font-black text-slate-900 dark:text-white text-sm leading-none mb-1">{appt.name}</h5>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Agent: {agent?.name || 'Unknown'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total Payout</span>
                                                        <span className="block text-sm font-black text-emerald-600 tabular-nums animate-in zoom-in-95" key={totalEarned}>
                                                            {formatCurrency(totalEarned)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Type</span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            {isSelfOnboard ? <IconSparkles className="w-3 h-3 text-amber-500" /> : <IconTransfer className="w-3 h-3 text-indigo-500" />}
                                                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{isSelfOnboard ? 'Self Onboard' : `AE: ${appt.aeName || 'Assisted'}`}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Onboarded</span>
                                                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold text-slate-500">
                                                            <IconCalendar className="w-3 h-3" />
                                                            {new Date(appt.scheduledAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 flex justify-between items-center transition-all hover:bg-rose-100/50 dark:hover:bg-rose-900/30">
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Active Partner Refs</span>
                                                            <span className="text-xl font-black text-rose-600 tabular-nums animate-in zoom-in-95" key={appt.referralCount}>{appt.referralCount || 0}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="relative group/input">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={addAmounts[appt.id] || "1"}
                                                                    onChange={(e) => setAddAmounts({ ...addAmounts, [appt.id]: e.target.value })}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-16 px-3 py-2 bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-900/50 rounded-xl text-center font-black text-rose-600 text-xs focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all outline-none"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const amount = parseInt(addAmounts[appt.id] || "1");
                                                                    if (amount > 0) {
                                                                        onManualReferral?.(appt.id, (appt.referralCount || 0) + amount);
                                                                        setAddAmounts({ ...addAmounts, [appt.id]: "1" });
                                                                    }
                                                                }}
                                                                className="p-2.5 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 px-4"
                                                            >
                                                                <IconPlus className="w-4 h-4" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Add</span>
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setExpandedClientId(isExpanded ? null : appt.id); }}
                                                                className={`p-2.5 rounded-xl transition-all shadow-sm ${isExpanded ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white dark:bg-slate-700 text-slate-400 hover:text-indigo-600'}`}
                                                            >
                                                                <IconActivity className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="mt-2 space-y-2 animate-in slide-in-from-top-2 duration-300">
                                                        <div className="flex justify-between items-center px-1 mb-2">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">Ledger History</span>
                                                            <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">TEST DATA AUDITABLE</span>
                                                        </div>
                                                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto no-scrollbar pr-1">
                                                            {appt.referralHistory?.slice().reverse().map((entry: ReferralHistoryEntry) => (
                                                                <div key={entry.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group/entry">
                                                                    <div>
                                                                        <div className="text-[10px] font-black text-slate-900 dark:text-white">+{entry.count} Lead(s)</div>
                                                                        <div className="text-[8px] text-slate-400 font-bold uppercase">{new Date(entry.date).toLocaleDateString()}</div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => onDeleteReferral?.(appt.id, entry.id)}
                                                                        className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover/entry:opacity-100 transition-all hover:bg-rose-50 rounded"
                                                                    >
                                                                        <IconTrash className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {(!appt.referralHistory || appt.referralHistory.length === 0) && (
                                                                <div className="py-4 text-center text-[10px] text-slate-400 font-bold italic">No history entries found.</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {onboardedList.length === 0 && (
                                        <div className="col-span-full py-16 text-center text-slate-400 font-bold italic bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                                            No matching onboarded clients found in history.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

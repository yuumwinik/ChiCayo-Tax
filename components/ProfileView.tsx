
import React, { useState } from 'react';
import { User, AvatarId, NotificationSettings } from '../types';
import { formatCurrency } from '../utils/dateUtils';
import { IconWallet, getAvatarIcon, IconTrash, IconLayout, IconBot, IconPhone, IconInfo, IconBell } from './Icons';
import { AvatarSelector } from './AvatarSelector';
import { CustomSelect } from './CustomSelect';
import { useUser } from '../contexts/UserContext';

interface ProfileViewProps {
  onReplayTutorial?: () => void;
  totalEarnings?: number;
  totalOnboarded?: number;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onReplayTutorial,
  totalEarnings = 0, totalOnboarded = 0
}) => {
  const { user, updateProfile } = useUser();
  if (!user) return null;

  const [name, setName] = useState(user.name);
  const [isEditing, setIsEditing] = useState(false);
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);

  const notifEnabled = user.notificationSettings?.enabled ?? true;
  const [dialerApp, setDialerApp] = useState(user.preferredDialer || 'System Default');

  const DIALER_OPTIONS = [
    { value: 'System Default', label: 'System Default' }, { value: 'Genesys', label: 'Genesys Cloud' },
    { value: 'Nextiva', label: 'Nextiva' }, { value: 'Skype', label: 'Skype' },
    { value: 'RingCentral', label: 'RingCentral' }, { value: 'Google Voice', label: 'Google Voice' },
    { value: 'Zoom', label: 'Zoom Phone' }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col items-center justify-center text-center">
        <button onClick={() => setIsAvatarSelectorOpen(true)} className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 flex items-center justify-center text-4xl font-bold border-4 border-white dark:border-slate-800 shadow-xl mb-4 overflow-hidden group">
          {user.avatarId && user.avatarId !== 'initial' ? <div className="w-16 h-16 group-hover:scale-110 transition-transform">{getAvatarIcon(user.avatarId)}</div> : name.charAt(0).toUpperCase()}
        </button>
        <div className="space-y-2 w-full max-w-sm">
          {isEditing ? (
            <div className="flex gap-2"><input value={name} onChange={(e) => setName(e.target.value)} className="w-full text-center text-2xl font-bold bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2 border-none" autoFocus /><button onClick={() => { updateProfile(name, user.avatarId, user.notificationSettings, dialerApp, user.showFailedSection); setIsEditing(false); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium">Save</button></div>
          ) : (
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setIsEditing(true)}>{name}</h2>
          )}
          <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-white/20 rounded-xl"><IconWallet className="w-6 h-6" /></div><span className="font-medium text-indigo-100">Performance Snapshot</span></div><div className="text-5xl font-bold mb-6 tracking-tight">{formatCurrency(totalEarnings)}</div><div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-6"><div><div className="text-indigo-200 text-sm mb-1 uppercase tracking-widest font-black text-[9px]">Lifetime Onboards</div><div className="text-2xl font-black">{totalOnboarded}</div></div><div><div className="text-indigo-200 text-sm mb-1 uppercase tracking-widest font-black text-[9px]">Cycle Payouts</div><div className="text-2xl font-black">{formatCurrency(totalEarnings)}</div></div></div></div>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="flex items-center gap-3"><div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl"><IconLayout className="w-5 h-5" /></div><h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Interface</h4></div>
              <div className="flex items-center justify-between">
                <div><div className="text-sm font-bold text-slate-900 dark:text-white">Show Failed Funnel</div><div className="text-[10px] text-slate-500">Includes Declined cards.</div></div>
                <button onClick={() => updateProfile(name, user.avatarId, user.notificationSettings, dialerApp, !user.showFailedSection)} className={`relative w-12 h-7 rounded-full transition-colors ${user.showFailedSection ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}><div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${user.showFailedSection ? 'translate-x-5' : 'translate-x-0'}`}></div></button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3"><div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl"><IconBell className="w-5 h-5" /></div><h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Engagement</h4></div>
              <div className="flex items-center justify-between">
                <div><div className="text-sm font-bold text-slate-900 dark:text-white">Pulse Alerts</div><div className="text-[10px] text-slate-500">Smart today-only alerts.</div></div>
                <button onClick={() => updateProfile(name, user.avatarId, { enabled: !notifEnabled, thresholdMinutes: 15 }, dialerApp, user.showFailedSection)} className={`relative w-12 h-7 rounded-full transition-colors ${notifEnabled ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}><div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${notifEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div></button>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl"><IconPhone className="w-5 h-5" /></div><h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Communication</h4></div>
            <div className="max-w-xs"><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Default Dialer</div><CustomSelect options={DIALER_OPTIONS} value={dialerApp} onChange={(val) => updateProfile(name, user.avatarId, user.notificationSettings, val, user.showFailedSection)} /></div>
          </div>
        </div>

        {onReplayTutorial && (
          <div className="flex justify-center">
            <button
              onClick={onReplayTutorial}
              className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-indigo-600 transition-colors flex items-center gap-2"
            >
              <IconInfo className="w-3.5 h-3.5" />
              Replay App Introduction
            </button>
          </div>
        )}
      </div>
      <AvatarSelector isOpen={isAvatarSelectorOpen} onClose={() => setIsAvatarSelectorOpen(false)} onSelect={(id) => updateProfile(name, id, user.notificationSettings, dialerApp, user.showFailedSection)} currentId={user.avatarId} userName={name} />
    </div>
  );
};

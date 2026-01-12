import React, { useState } from 'react';
import { User, AvatarId, NotificationSettings } from '../types';
import { formatCurrency } from '../utils/dateUtils';
import { IconWallet, getAvatarIcon, IconTrash, IconLayout, IconBot, IconPhone, IconInfo } from './Icons';
import { AvatarSelector } from './AvatarSelector';
import { CustomSelect } from './CustomSelect';
import { useUser } from '../contexts/UserContext';

interface ProfileViewProps {
  showFailedSection?: boolean;
  onToggleFailedSection?: (show: boolean) => void;
  onReplayTutorial?: () => void;
  totalEarnings?: number; // kept as optional in case we still want to pass it
  totalOnboarded?: number;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  showFailedSection = true, onToggleFailedSection, onReplayTutorial,
  totalEarnings = 0, totalOnboarded = 0
}) => {
  const { user, updateProfile } = useUser();
  if (!user) return null;

  const [name, setName] = useState(user.name);
  const [isEditing, setIsEditing] = useState(false);
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);

  const [notifEnabled, setNotifEnabled] = useState(user.notificationSettings?.enabled ?? true);
  const [notifThreshold, setNotifThreshold] = useState(user.notificationSettings?.thresholdMinutes?.toString() ?? '15');
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
        <button onClick={() => setIsAvatarSelectorOpen(true)} className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 flex items-center justify-center text-4xl font-bold border-4 border-white dark:border-slate-800 shadow-xl mb-4 overflow-hidden">
          {user.avatarId && user.avatarId !== 'initial' ? <div className="w-16 h-16">{getAvatarIcon(user.avatarId)}</div> : name.charAt(0).toUpperCase()}
        </button>
        <div className="space-y-2 w-full max-w-sm">
          {isEditing ? (
            <div className="flex gap-2"><input value={name} onChange={(e) => setName(e.target.value)} className="w-full text-center text-2xl font-bold bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2 border-none" autoFocus /><button onClick={() => { updateProfile(name, user.avatarId, user.notificationSettings, dialerApp); setIsEditing(false); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium">Save</button></div>
          ) : (
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setIsEditing(true)}>{name}</h2>
          )}
          <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
        </div>
        <div className="mt-4 flex gap-2"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${user.role === 'admin' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>{user.role === 'admin' ? 'Administrator' : 'Verified Agent'}</span></div>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-white/20 rounded-xl"><IconWallet className="w-6 h-6" /></div><span className="font-medium text-indigo-100">My Wallet</span></div><div className="text-5xl font-bold mb-6 tracking-tight">{formatCurrency(totalEarnings)}</div><div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-6"><div><div className="text-indigo-200 text-sm mb-1">Onboarded</div><div className="text-2xl font-bold">{totalOnboarded}</div></div><div><div className="text-indigo-200 text-sm mb-1">Total Payouts</div><div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div></div></div></div>
      </div>

      <div className="space-y-4">
        {onToggleFailedSection && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm"><div className="flex items-center gap-3 mb-4"><div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl"><IconLayout className="w-6 h-6" /></div><h3 className="text-xl font-bold text-slate-900 dark:text-white">Dashboard Layout</h3></div><div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl"><div><div className="font-semibold text-slate-900 dark:text-white">Show Failed Appointments</div><div className="text-sm text-slate-500">Display "Failed" and "Declined" columns.</div></div><button onClick={() => onToggleFailedSection(!showFailedSection)} className={`relative w-14 h-8 rounded-full transition-colors ${showFailedSection ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}><div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-sm transition-transform ${showFailedSection ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div></div>
        )}

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm"><div className="flex items-center gap-3 mb-4"><div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600"><IconBot className="w-6 h-6" /></div><h3 className="text-xl font-bold text-slate-900 dark:text-white">Alerts & Notifications</h3></div><div className="space-y-4"><div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl"><div><div className="font-semibold text-slate-900 dark:text-white">Notification Pods</div><div className="text-sm text-slate-500">Show reminder bubbles in header.</div></div><button onClick={() => updateProfile(name, user.avatarId, { enabled: !notifEnabled, thresholdMinutes: parseInt(notifThreshold) }, dialerApp)} className={`relative w-14 h-8 rounded-full transition-colors ${notifEnabled ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}><div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform ${notifEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div>{notifEnabled && <div className="pt-2"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Show alert within:</label><CustomSelect options={[{ value: '5', label: '5 Minutes' }, { value: '10', label: '10 Minutes' }, { value: '15', label: '15 Minutes' }, { value: '30', label: '30 Minutes' }]} value={notifThreshold} onChange={(val) => updateProfile(name, user.avatarId, { enabled: true, thresholdMinutes: parseInt(val) }, dialerApp)} /></div>}</div></div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm"><div className="flex items-center gap-3 mb-4"><div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600"><IconPhone className="w-6 h-6" /></div><h3 className="text-xl font-bold text-slate-900 dark:text-white">Calling Preferences</h3></div><div className="space-y-4"><div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Default Dialer App</label><CustomSelect options={DIALER_OPTIONS} value={dialerApp} onChange={(val) => updateProfile(name, user.avatarId, user.notificationSettings, val)} /></div></div></div>

        {onReplayTutorial && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4"><div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl"><IconInfo className="w-6 h-6" /></div><h3 className="text-xl font-bold text-slate-900 dark:text-white">Instructions</h3></div>
            <button
              onClick={onReplayTutorial}
              className="w-full py-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-bold rounded-2xl transition-all border border-indigo-100 dark:border-indigo-800 flex items-center justify-center gap-2"
            >
              Replay App Introduction
            </button>
          </div>
        )}
      </div>
      <AvatarSelector isOpen={isAvatarSelectorOpen} onClose={() => setIsAvatarSelectorOpen(false)} onSelect={(id) => updateProfile(name, id, user.notificationSettings, dialerApp)} currentId={user.avatarId} userName={name} />
    </div>
  );
};

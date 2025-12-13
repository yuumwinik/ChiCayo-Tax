
import React, { useState, useEffect } from 'react';
import { User, AvatarId, NotificationSettings } from '../types';
import { formatCurrency } from '../utils/dateUtils';
import { IconCheck, IconUser, IconWallet, IconUserPlus, IconLock, getAvatarIcon, IconTrash, IconLayout, IconBot, IconPhone } from './Icons';
import { AvatarSelector } from './AvatarSelector';
import { CustomSelect } from './CustomSelect';

interface ProfileViewProps {
  user: User;
  onUpdateUser: (name: string, avatarId?: AvatarId, notificationSettings?: NotificationSettings, preferredDialer?: string) => void;
  onCreateAdmin?: (user: User) => void;
  onDeleteAccount?: () => void;
  totalEarnings: number;
  totalOnboarded: number;
  showFailedSection?: boolean;
  onToggleFailedSection?: (show: boolean) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ 
  user, 
  onUpdateUser, 
  onCreateAdmin, 
  onDeleteAccount, 
  totalEarnings, 
  totalOnboarded,
  showFailedSection = true,
  onToggleFailedSection
}) => {
  const [name, setName] = useState(user.name);
  const [isEditing, setIsEditing] = useState(false);
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);
  
  // Settings State
  const [notifEnabled, setNotifEnabled] = useState(user.notificationSettings?.enabled ?? true);
  const [notifThreshold, setNotifThreshold] = useState(user.notificationSettings?.thresholdMinutes?.toString() ?? '15');
  const [dialerApp, setDialerApp] = useState(user.preferredDialer || 'System Default');

  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });
  const [adminMessage, setAdminMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    setName(user.name);
    setNotifEnabled(user.notificationSettings?.enabled ?? true);
    setNotifThreshold(user.notificationSettings?.thresholdMinutes?.toString() ?? '15');
    setDialerApp(user.preferredDialer || 'System Default');
  }, [user]);

  const handleSaveName = () => {
    onUpdateUser(name, user.avatarId, user.notificationSettings, dialerApp);
    setIsEditing(false);
  };

  const handleSelectAvatar = (id: AvatarId) => {
    onUpdateUser(name, id, user.notificationSettings, dialerApp);
  };

  const handleUpdateSettings = (
      nEnabled: boolean, 
      nThreshold: string, 
      pDialer: string
  ) => {
    const settings: NotificationSettings = {
        enabled: nEnabled,
        thresholdMinutes: parseInt(nThreshold)
    };
    
    // Update local state immediately for UI response
    setNotifEnabled(nEnabled);
    setNotifThreshold(nThreshold);
    setDialerApp(pDialer);

    // Persist
    onUpdateUser(name, user.avatarId, settings, pDialer);
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateAdmin) return;

    const newAdmin: User = {
      id: crypto.randomUUID(),
      name: adminForm.name,
      email: adminForm.email,
      role: 'admin',
      avatarId: 'crown',
      createdAt: new Date().toISOString(),
      hasSeenTutorial: false
    };

    onCreateAdmin(newAdmin);
    setAdminForm({ name: '', email: '', password: '' });
    setAdminMessage({ text: 'New Admin created successfully!', type: 'success' });
    setTimeout(() => setAdminMessage({ text: '', type: '' }), 3000);
  };

  const handleSelfDelete = () => {
      if (onDeleteAccount) {
          onDeleteAccount();
      }
  }

  const DIALER_OPTIONS = [
      { value: 'System Default', label: 'System Default' },
      { value: 'Genesys', label: 'Genesys Cloud' },
      { value: 'Nextiva', label: 'Nextiva' },
      { value: 'Skype', label: 'Skype' },
      { value: 'RingCentral', label: 'RingCentral' },
      { value: 'Google Voice', label: 'Google Voice' },
      { value: 'Zoom', label: 'Zoom Phone' }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col items-center justify-center text-center">
         <button 
           onClick={() => setIsAvatarSelectorOpen(true)}
           className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-4xl font-bold border-4 border-white dark:border-slate-800 shadow-xl mb-4 overflow-hidden hover:scale-105 transition-transform"
         >
            {user.avatarId && user.avatarId !== 'initial' ? (
               <div className="w-16 h-16">{getAvatarIcon(user.avatarId)}</div>
            ) : (
               name.charAt(0).toUpperCase()
            )}
         </button>
         
         <div className="space-y-2 w-full max-w-sm">
           {isEditing ? (
             <div className="flex gap-2">
               <input 
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="w-full text-center text-2xl font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2 border-none focus:ring-2 focus:ring-indigo-500"
                 autoFocus
               />
               <button 
                 onClick={handleSaveName}
                 className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-200 dark:shadow-none"
               >
                 Save
               </button>
             </div>
           ) : (
             <h2 className="text-2xl font-bold text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setIsEditing(true)}>
               {name}
             </h2>
           )}
           <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
         </div>
         
         <div className="mt-4 flex gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${user.role === 'admin' ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-900' : 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-900'}`}>
               {user.role === 'admin' ? 'Administrator' : 'Verified Agent'}
            </span>
         </div>
      </div>

      {/* Wallet Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-300 dark:shadow-none relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/4 -translate-y-1/4">
            <IconWallet className="w-64 h-64" />
         </div>
         
         <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                 <IconWallet className="w-6 h-6" />
               </div>
               <span className="font-medium text-indigo-100">My Wallet</span>
            </div>
            
            <div className="text-5xl font-bold mb-6 tracking-tight">
               {formatCurrency(totalEarnings)}
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-6">
               <div>
                  <div className="text-indigo-200 text-sm mb-1">Onboarded Clients</div>
                  <div className="text-2xl font-bold">{totalOnboarded}</div>
               </div>
               <div>
                  <div className="text-indigo-200 text-sm mb-1">Current Balance</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
               </div>
            </div>
         </div>
      </div>

      {/* SETTINGS AREA */}
      <div className="space-y-4">
        
        {/* DASHBOARD PREFERENCES */}
        {onToggleFailedSection && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
                    <IconLayout className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Dashboard Layout</h3>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">Show Failed Appointments</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Display "Failed to Show" and "Declined" columns.</div>
                </div>
                
                <button 
                    onClick={() => onToggleFailedSection(!showFailedSection)}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${showFailedSection ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                    <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-sm transition-transform duration-300 ${showFailedSection ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
            </div>
            </div>
        )}

        {/* NOTIFICATION SETTINGS */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
                    <IconBot className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Alerts & Notifications</h3>
            </div>
            
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                    <div>
                        <div className="font-semibold text-slate-900 dark:text-white">Notification Pods</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Show reminder bubbles in dashboard header.</div>
                    </div>
                    <button 
                        onClick={() => handleUpdateSettings(!notifEnabled, notifThreshold, dialerApp)}
                        className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${notifEnabled ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-sm transition-transform duration-300 ${notifEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>

                {notifEnabled && (
                   <div className="animate-in fade-in slide-in-from-top-2 pt-2">
                       <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 pl-1">
                          Show alert when appointment is within:
                       </label>
                       <CustomSelect 
                         options={[
                            { value: '5', label: '5 Minutes' },
                            { value: '10', label: '10 Minutes' },
                            { value: '15', label: '15 Minutes' },
                            { value: '30', label: '30 Minutes' }
                         ]}
                         value={notifThreshold}
                         onChange={(val) => handleUpdateSettings(true, val, dialerApp)}
                       />
                   </div>
                )}
            </div>
        </div>

        {/* DIALER CONFIGURATION */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <IconPhone className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Calling Preferences</h3>
            </div>
            
            <div className="space-y-4">
               <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Default Dialer App
                   </label>
                   <p className="text-xs text-slate-500 mb-3">Choose the app you use to make calls. This will customize your action buttons.</p>
                   <CustomSelect 
                      options={DIALER_OPTIONS}
                      value={dialerApp}
                      onChange={(val) => handleUpdateSettings(notifEnabled, notifThreshold, val)}
                   />
               </div>
            </div>
        </div>

      </div>

      {/* ADMIN ONLY: Create New Admin Section */}
      {user.role === 'admin' && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-rose-100 dark:border-rose-900/30 shadow-lg shadow-rose-100/50 dark:shadow-none">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
                 <IconUserPlus className="w-6 h-6" />
              </div>
              <div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create Admin Access</h3>
                 <p className="text-sm text-slate-500">Note: The new admin must sign up with this email first, then this action will promote them.</p>
              </div>
           </div>
           
           <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Admin Name</label>
                    <input 
                      type="text" 
                      required
                      value={adminForm.name}
                      onChange={e => setAdminForm({...adminForm, name: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                    <input 
                      type="email" 
                      required
                      value={adminForm.email}
                      onChange={e => setAdminForm({...adminForm, email: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
                    />
                 </div>
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                 <div className="relative">
                   <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input 
                     type="password" 
                     required
                     minLength={6}
                     value={adminForm.password}
                     onChange={e => setAdminForm({...adminForm, password: e.target.value})}
                     className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
                     placeholder="Secure password"
                   />
                 </div>
              </div>

              {adminMessage.text && (
                 <div className={`p-3 rounded-xl text-sm font-medium ${adminMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-50 text-rose-600'}`}>
                    {adminMessage.text}
                 </div>
              )}

              <button 
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-200 dark:shadow-none transition-transform active:scale-95"
              >
                 Create/Promote Admin
              </button>
           </form>
        </div>
      )}

      {/* DANGER ZONE - Delete Account */}
      {user.role !== 'admin' && onDeleteAccount && (
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-rose-600 dark:text-rose-500 mb-2">Danger Zone</h3>
              <p className="text-sm text-slate-500 mb-4">Deleting your account is permanent and cannot be undone.</p>
              <button 
                  onClick={handleSelfDelete}
                  className="px-6 py-3 border border-rose-200 dark:border-rose-900/50 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/10 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                  <IconTrash className="w-4 h-4" />
                  Delete My Account
              </button>
          </div>
      )}

      <AvatarSelector 
         isOpen={isAvatarSelectorOpen} 
         onClose={() => setIsAvatarSelectorOpen(false)}
         onSelect={handleSelectAvatar}
         currentId={user.avatarId}
         userName={name}
      />
    </div>
  );
};

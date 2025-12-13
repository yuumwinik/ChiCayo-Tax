
import React from 'react';
import { View, UserRole, AvatarId } from '../types';
import { IconCalendar, IconLayout, IconUsers, IconDollarSign, IconLogo, IconLogout, IconSidebarToggle, IconLock, getAvatarIcon, IconActivity } from './Icons';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  isOpen: boolean;
  isCollapsed: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
  onLogout: () => void;
  userRole: UserRole;
  userAvatar?: AvatarId;
  userName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onChangeView, 
  isOpen, 
  isCollapsed,
  onCloseMobile,
  onToggleCollapse,
  onLogout,
  userRole,
  userAvatar,
  userName
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: IconLayout, role: 'all' },
    { id: 'user-analytics', label: 'My Stats', icon: IconActivity, role: 'agent' },
    { id: 'calendar', label: 'Calendar', icon: IconCalendar, role: 'all' },
    { id: 'onboarded', label: 'Onboarded', icon: IconUsers, role: 'all' },
    { id: 'earnings-full', label: 'Earnings', icon: IconDollarSign, role: 'all' },
    { id: 'admin-dashboard', label: 'Team Stats', icon: IconLock, role: 'admin' },
  ] as const;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed top-0 left-0 bottom-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
          transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          lg:translate-x-0 lg:static lg:h-screen lg:sticky lg:top-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          w-64
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`h-16 flex items-center shrink-0 border-b border-slate-100 dark:border-slate-800 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-between px-5'}`}>
            
            {/* Logo Section - Visible only when EXPANDED */}
            {!isCollapsed && (
                <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                    <div className="bg-indigo-600 text-white p-1.5 rounded-lg shrink-0">
                        <IconLogo className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-lg text-slate-900 dark:text-white animate-in fade-in duration-300">
                        ChiCayo Tax
                    </span>
                </div>
            )}

            {/* Toggle Button - Visible in both states */}
            <button 
              onClick={onToggleCollapse}
              className={`hidden lg:flex p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400`}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <IconSidebarToggle className="w-5 h-5" />
            </button>

            {/* Mobile Close Button - Replaces toggle on mobile */}
             <button 
              onClick={onCloseMobile}
              className={`lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800`}
            >
              <IconSidebarToggle className="w-5 h-5 rotate-180" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto no-scrollbar">
             {!isCollapsed && (
               <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3 transition-opacity duration-300 lg:block hidden">
                 {userRole === 'admin' ? 'Admin Menu' : 'Main Menu'}
               </div>
             )}
             
             {navItems.filter(item => item.role === 'all' || item.role === userRole).map(item => {
               const Icon = item.icon;
               const isActive = currentView === item.id;
               return (
                 <button
                   key={item.id}
                   onClick={() => {
                     onChangeView(item.id as View);
                     onCloseMobile();
                   }}
                   title={isCollapsed ? item.label : undefined}
                   className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative
                     ${isActive 
                       ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' 
                       : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                     }
                     ${isCollapsed ? 'justify-center lg:px-0' : ''}
                   `}
                 >
                   <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                   <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'block'}`}>
                     {item.label}
                   </span>
                 </button>
               )
             })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
             
             {/* Logo - Visible only when COLLAPSED (above logout) */}
             {isCollapsed && (
                <div className="hidden lg:flex justify-center mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                     <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
                        <IconLogo className="w-5 h-5" />
                     </div>
                </div>
             )}

             {/* Role Indicator */}
             {!isCollapsed && (
                <div className="mb-2 px-2 flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                      {userAvatar && userAvatar !== 'initial' ? (
                         <div className="w-5 h-5 text-indigo-600 dark:text-indigo-400">{getAvatarIcon(userAvatar)}</div>
                      ) : (
                         <span className="text-xs font-bold text-slate-500">{userName?.charAt(0).toUpperCase()}</span>
                      )}
                   </div>
                   <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{userName}</span>
                      <span className="text-xs text-slate-400">{userRole === 'admin' ? 'Admin' : 'Agent'}</span>
                   </div>
                </div>
             )}

             <button 
                onClick={onLogout}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
                title="Log out"
             >
                <IconLogout className="w-5 h-5 shrink-0" />
                <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'block'}`}>
                   Log out
                </span>
             </button>
          </div>
        </div>
      </aside>
    </>
  );
};

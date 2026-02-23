
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconPhone, IconMail, IconX } from './Icons';

interface ProtocolModalProps {
  type: 'phone' | 'email';
  value: string;
  appName?: string;
  templatePath?: string;
  children: (trigger: () => void) => React.ReactNode; // Render prop for the trigger button
}

export const ProtocolModal: React.FC<ProtocolModalProps> = ({ type, value, appName = 'System Default', templatePath, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [remember, setRemember] = useState(false);

  // Storage Key: chicayo_protocol_phone or chicayo_protocol_email
  const storageKey = `chicayo_protocol_${type}_always_allow`;

  const executeAction = () => {
    if (type === 'email' && templatePath) {
      // Try Electron-specific Outlook opening with template
      try {
        const isElectron = typeof window !== 'undefined' && (window as any).require;
        if (isElectron) {
          const { exec } = (window as any).require('child_process');
          const path = (window as any).require('path');

          // Resolve the template path. 
          // In development, it's relative to the project root.
          const absolutePath = path.resolve(templatePath);

          console.log(`📡 ProtocolModal: Attempting to open Outlook template at ${absolutePath} for ${value}`);

          // Command for Outlook: /t for template, /m for recipient
          const command = `start outlook.exe /t "${absolutePath}" /m "${value}"`;

          exec(command, (err: any) => {
            if (err) {
              console.warn('Outlook template failed, falling back to mailto:', err);
              window.location.href = `mailto:${value}`;
            }
          });
          setIsOpen(false);
          return;
        }
      } catch (err) {
        console.error('Template logic error:', err);
      }
    }

    const protocol = type === 'phone' ? 'tel:' : 'mailto:';
    window.location.href = `${protocol}${value}`;
    setIsOpen(false);
  };

  const handleTrigger = () => {
    // Check if user has previously set "Always allow"
    const alwaysAllow = localStorage.getItem(storageKey);
    if (alwaysAllow === 'true') {
      executeAction();
    } else {
      setIsOpen(true);
    }
  };

  const handleConfirm = () => {
    if (remember) {
      localStorage.setItem(storageKey, 'true');
    }
    executeAction();
  };

  const displayName = appName && appName !== 'System Default' ? appName : (type === 'phone' ? 'Phone' : 'Mail');

  // Using Portal to break out of stacking contexts (z-index hell)
  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 border border-slate-200 dark:border-slate-700">

        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${type === 'phone' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
            {type === 'phone' ? <IconPhone className="w-7 h-7" /> : <IconMail className="w-7 h-7" />}
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Open {displayName}?</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
            {type === 'phone' ? 'Start a call to ' : 'Draft an email to '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{value}</span>
            {templatePath ? (
              <div className="mt-2 block">
                <div className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full font-black uppercase tracking-widest inline-block border border-indigo-100 dark:border-indigo-800 animate-pulse">
                  SBTPG Template Integrated
                </div>
              </div>
            ) : '?'}
          </p>

          {/* Remember Checkbox */}
          <label className="flex items-center gap-2 mb-6 cursor-pointer group">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span className="text-xs text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
              Don't ask again for {displayName}
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200/50 dark:shadow-none transition-transform active:scale-95 text-sm"
            >
              Open {displayName}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  if (!isOpen) return children(handleTrigger);

  const target = typeof document !== 'undefined' ? document.body : null;
  if (!target) return children(handleTrigger);

  return (
    <>
      {children(handleTrigger)}
      {createPortal(modalContent, target)}
    </>
  );
};

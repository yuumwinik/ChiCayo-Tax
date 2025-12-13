
import React from 'react';
import { IconInfo, IconAlertCircle, IconCheck } from './Icons';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error';
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen, onClose, title, message, type = 'info'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <IconCheck className="w-8 h-8" />;
      case 'error': return <IconAlertCircle className="w-8 h-8" />;
      default: return <IconInfo className="w-8 h-8" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'error': return 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400';
    }
  };

  const buttonColor = () => {
    switch (type) {
        case 'success': return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200';
        case 'error': return 'bg-rose-600 hover:bg-rose-700 shadow-rose-200';
        default: return 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200';
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 border border-slate-100 dark:border-slate-700">
        <div className="flex flex-col items-center text-center">
           <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${getColors()}`}>
             {getIcon()}
           </div>
           
           <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
           <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-sm">{message}</p>
           
           <button 
             onClick={onClose}
             className={`w-full py-3 px-4 text-white font-bold rounded-2xl shadow-lg dark:shadow-none transition-transform active:scale-95 text-sm ${buttonColor()}`}
           >
             Got it
           </button>
        </div>
      </div>
    </div>
  );
};

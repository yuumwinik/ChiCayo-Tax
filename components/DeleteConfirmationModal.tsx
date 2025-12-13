import React from 'react';
import { IconTrash } from './Icons';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen, onClose, onConfirm, title, message
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 border border-slate-100 dark:border-slate-700">
        <div className="flex flex-col items-center text-center">
           <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-4 text-rose-600 dark:text-rose-400">
             <IconTrash className="w-8 h-8" />
           </div>
           
           <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
           <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-sm">{message}</p>
           
           <div className="flex gap-3 w-full">
             <button 
               onClick={onClose}
               className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-2xl transition-colors text-sm"
             >
               Cancel
             </button>
             <button 
               onClick={() => { onConfirm(); onClose(); }}
               className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-2xl shadow-lg shadow-rose-200 dark:shadow-none transition-transform active:scale-95 text-sm"
             >
               Delete
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};
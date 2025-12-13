
import React, { useState } from 'react';
import { ACCOUNT_EXECUTIVES } from '../types';
import { CustomSelect } from './CustomSelect';
import { IconBriefcase, IconX, IconCheck } from './Icons';

interface AESelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (aeName: string) => void;
}

export const AESelectionModal: React.FC<AESelectionModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [selectedAE, setSelectedAE] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!selectedAE) {
      setError(true);
      return;
    }
    onConfirm(selectedAE);
    setSelectedAE(''); // Reset
    setError(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 border border-slate-100 dark:border-slate-700 relative overflow-visible">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <IconX className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
           <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 shadow-sm">
             <IconBriefcase className="w-7 h-7" />
           </div>
           <h3 className="text-xl font-bold text-slate-900 dark:text-white">Who closed this deal?</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select the Account Executive to complete onboarding.</p>
        </div>

        <div className="space-y-4">
           <div>
              <CustomSelect 
                options={ACCOUNT_EXECUTIVES}
                value={selectedAE}
                onChange={(val) => { setSelectedAE(val); setError(false); }}
                placeholder="Select Account Executive..."
                className="w-full"
              />
              {error && (
                <p className="text-xs text-rose-500 font-medium mt-2 ml-1">Please select an AE to proceed.</p>
              )}
           </div>

           <button 
             onClick={handleSubmit}
             className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-transform active:scale-95 flex items-center justify-center gap-2"
           >
             <IconCheck className="w-5 h-5" />
             Confirm Onboard
           </button>
        </div>
      </div>
    </div>
  );
};

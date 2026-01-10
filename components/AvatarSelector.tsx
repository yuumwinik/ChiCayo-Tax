
import React from 'react';
import { AvatarId } from '../types';
import { getAvatarIcon, IconX } from './Icons';

interface AvatarSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: AvatarId) => void;
  currentId?: AvatarId;
  userName?: string;
}

const AVATARS: AvatarId[] = ['initial', 'robot', 'alien', 'ghost', 'fire', 'zap', 'crown', 'star', 'smile'];

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ isOpen, onClose, onSelect, currentId, userName }) => {
  if (!isOpen) return null;

  const initialLetter = userName ? userName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-full max-w-sm relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <IconX className="w-6 h-6" />
        </button>
        
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">Choose your Avatar</h3>
        
        <div className="grid grid-cols-3 gap-4">
          {AVATARS.map((id) => (
            <button
              key={id}
              onClick={() => { onSelect(id); onClose(); }}
              className={`aspect-square rounded-2xl flex items-center justify-center border-2 transition-all hover:scale-110 ${
                currentId === id 
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' 
                  : 'border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
              }`}
            >
              {id === 'initial' ? (
                <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{initialLetter}</span>
              ) : (
                <div className="w-8 h-8 text-indigo-600 dark:text-indigo-400">
                  {getAvatarIcon(id)}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

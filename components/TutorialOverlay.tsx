
import React, { useState } from 'react';
import { UserRole } from '../types';
import { IconArrowRight, IconBot, IconCycle, IconDollarSign, IconLayout, IconSparkles, IconDownload, IconTrendingUp, IconTransfer } from './Icons';

interface TutorialOverlayProps {
  isOpen: boolean;
  userRole: UserRole;
  onComplete: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ isOpen, userRole, onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slides = userRole === 'admin' ? [
    { title: "Master Command Center", description: "Welcome to Community Tax Admin. This app is designed to align your call center agents with high-performing Account Executives.", icon: <IconSparkles className="w-16 h-16 text-rose-500" />, color: "bg-rose-50 dark:bg-rose-900/20" },
    { title: "Managing Pay Cycles", description: "Under 'Pay Cycles', schedule up to 3 reoccurring windows. Earnings are calculated automatically based on onboarding dates.", icon: <IconCycle className="w-16 h-16 text-orange-500" />, color: "bg-orange-50 dark:bg-orange-900/20" },
    { title: "Adjusting Global Payroll", description: "Increase or decrease commission rates per deal instantly. Changes reflect globally for all agents.", icon: <IconDollarSign className="w-16 h-16 text-emerald-500" />, color: "bg-emerald-50 dark:bg-emerald-900/20" },
    { title: "Team Auditing", description: "View the full 'Audit Log' to track agent activity, or export the 'Master Team CSV' for payroll processing.", icon: <IconDownload className="w-16 h-16 text-blue-500" />, color: "bg-blue-50 dark:bg-blue-900/20" },
    { title: "Taxter AI", description: "Taxter is connected to your entire database. Ask it 'Who is my top agent?' or 'What is the total payout expected?'", icon: <IconBot className="w-16 h-16 text-purple-500" />, color: "bg-purple-50 dark:bg-purple-900/20" }
  ] : [
    { title: "Your Sales Funnel", description: "Community Tax tracks your client's journey from first contact to signed partner. Log every call here.", icon: <IconSparkles className="w-16 h-16 text-indigo-500" />, color: "bg-indigo-50 dark:bg-indigo-900/20" },
    { title: "Dynamic Kanban", description: "Manage your day by moving cards. Pro-tip: Drag a card to the bottom trash can to quickly remove it.", icon: <IconLayout className="w-16 h-16 text-blue-500" />, color: "bg-blue-50 dark:bg-blue-900/20" },
    { title: "Live Transfers", description: "When you have a live transfer, select the AE taking the call. We track closing performance per AE.", icon: <IconTransfer className="w-16 h-16 text-orange-500" />, color: "bg-orange-50 dark:bg-orange-900/20" },
    { title: "Personal Analytics", description: "Check 'My Stats' to see your conversion rate, golden hour, and cycle performance breakdown.", icon: <IconTrendingUp className="w-16 h-16 text-rose-500" />, color: "bg-rose-50 dark:bg-rose-900/20" },
    { title: "Meet Taxter AI", description: "Your accounting assistant is always ready. Ask 'How much have I earned this week?' to save time.", icon: <IconBot className="w-16 h-16 text-purple-500" />, color: "bg-purple-50 dark:bg-purple-900/20" }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) setCurrentSlide(currentSlide + 1);
    else onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative">
        <div className="p-10 text-center flex flex-col items-center">
           <div className={`w-32 h-32 rounded-[2rem] flex items-center justify-center mb-8 ${slides[currentSlide].color}`}>
              {slides[currentSlide].icon}
           </div>
           <h2 key={currentSlide} className="text-2xl font-bold text-slate-900 dark:text-white mb-4 animate-in slide-in-from-bottom-2">
              {slides[currentSlide].title}
           </h2>
           <p key={`d-${currentSlide}`} className="text-slate-500 dark:text-slate-400 mb-8 text-sm font-medium animate-in slide-in-from-bottom-3">
              {slides[currentSlide].description}
           </p>
           <button onClick={handleNext} className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95">
             {currentSlide === slides.length - 1 ? "Start Crushing It" : "Next Step"}
             <IconArrowRight className="w-4 h-4" />
           </button>
           {currentSlide < slides.length - 1 && (
             <button onClick={onComplete} className="mt-4 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Skip Introduction</button>
           )}
        </div>
      </div>
    </div>
  );
};

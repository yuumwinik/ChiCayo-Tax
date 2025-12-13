
import React, { useState } from 'react';
import { UserRole } from '../types';
import { IconArrowRight, IconBot, IconChartBar, IconCheck, IconCycle, IconDollarSign, IconLayout, IconSparkles } from './Icons';

interface TutorialOverlayProps {
  isOpen: boolean;
  userRole: UserRole;
  onComplete: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ isOpen, userRole, onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const AGENT_SLIDES = [
    {
      title: "Welcome to ChiCayo!",
      description: "Your all-in-one appointment and earnings tracker. Let's show you around.",
      icon: <IconSparkles className="w-16 h-16 text-indigo-500" />,
      color: "bg-indigo-50 dark:bg-indigo-900/20"
    },
    {
      title: "Track Your Funnel",
      description: "Manage appointments from Pending to Onboarded. Move cards effortlessly to track your progress.",
      icon: <IconLayout className="w-16 h-16 text-blue-500" />,
      color: "bg-blue-50 dark:bg-blue-900/20"
    },
    {
      title: "Watch Earnings Grow",
      description: "Earn commission for every client you onboard. Your wallet updates instantly.",
      icon: <IconDollarSign className="w-16 h-16 text-emerald-500" />,
      color: "bg-emerald-50 dark:bg-emerald-900/20"
    },
    {
      title: "Meet Taxter AI",
      description: "Your personal data assistant. Ask Taxter about your schedule, earnings, or client details anytime.",
      icon: <IconBot className="w-16 h-16 text-purple-500" />,
      color: "bg-purple-50 dark:bg-purple-900/20"
    }
  ];

  const ADMIN_SLIDES = [
    {
      title: "Welcome, Admin!",
      description: "You have full control over the team's performance and pay cycles. Let's get started.",
      icon: <IconSparkles className="w-16 h-16 text-rose-500" />,
      color: "bg-rose-50 dark:bg-rose-900/20"
    },
    {
      title: "Master Pay Cycles",
      description: "Set up automated pay windows. Earnings are calculated dynamically based on your cycle dates.",
      icon: <IconCycle className="w-16 h-16 text-orange-500" />,
      color: "bg-orange-50 dark:bg-orange-900/20"
    },
    {
      title: "Deep Analytics",
      description: "View real-time team stats, conversion rates, and funnel breakdowns in your dashboard.",
      icon: <IconChartBar className="w-16 h-16 text-indigo-500" />,
      color: "bg-indigo-50 dark:bg-indigo-900/20"
    },
    {
      title: "AI-Powered Insights",
      description: "Ask Taxter to analyze team data, compare agents, or calculate total payouts instantly.",
      icon: <IconBot className="w-16 h-16 text-purple-500" />,
      color: "bg-purple-50 dark:bg-purple-900/20"
    }
  ];

  const slides = userRole === 'admin' ? ADMIN_SLIDES : AGENT_SLIDES;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative">
        
        {/* Progress Bar */}
        <div className="h-1 bg-slate-100 dark:bg-slate-800 w-full">
           <div 
             className="h-full bg-indigo-600 transition-all duration-300"
             style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
           />
        </div>

        <div className="p-8 text-center flex flex-col items-center h-[400px]">
           <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300 ${slides[currentSlide].color} rounded-full`}>
              {slides[currentSlide].icon}
           </div>

           <h2 key={`t-${currentSlide}`} className="text-2xl font-bold text-slate-900 dark:text-white mb-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
              {slides[currentSlide].title}
           </h2>
           
           <p key={`d-${currentSlide}`} className="text-slate-500 dark:text-slate-400 leading-relaxed animate-in slide-in-from-bottom-3 fade-in duration-500">
              {slides[currentSlide].description}
           </p>

           <div className="mt-auto w-full flex gap-3">
             {currentSlide < slides.length - 1 && (
               <button 
                 onClick={onComplete}
                 className="px-4 py-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-medium text-sm transition-colors"
               >
                 Skip
               </button>
             )}
             
             <button
               onClick={handleNext}
               className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-transform active:scale-95 ml-auto"
             >
               {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
               <IconArrowRight className="w-4 h-4" />
             </button>
           </div>
        </div>

        {/* Indicators */}
        <div className="absolute top-4 right-4 flex gap-1">
           {slides.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-2 h-2 rounded-full transition-colors ${idx === currentSlide ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`}
              />
           ))}
        </div>
      </div>
    </div>
  );
};

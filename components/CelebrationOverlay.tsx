import React, { useEffect } from 'react';
import { IconTrophy, IconSparkles, IconActivity, IconX } from './Icons';

interface CelebrationOverlayProps {
    type: '100_ONBOARDS' | '100_SELF' | '500_EARNINGS' | '100_SINGLE_CYCLE' | 'STREAK_5_HOUR';
    onClose: () => void;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({ type, onClose }) => {
    const config = {
        '100_ONBOARDS': {
            title: "Century Mark!",
            subtitle: "100 Lifetime Onboards",
            icon: <IconTrophy className="w-20 h-20 text-amber-500" />,
            color: "from-amber-500 to-orange-600"
        },
        '100_SELF': {
            title: "Super Closer",
            subtitle: "100 Self-Onboards",
            icon: <IconActivity className="w-20 h-20 text-indigo-500" />,
            color: "from-indigo-500 to-purple-600"
        },
        '500_EARNINGS': {
            title: "Elite Earner",
            subtitle: "$500 Lifetime Profit reached",
            icon: <IconSparkles className="w-20 h-20 text-emerald-500" />,
            color: "from-emerald-500 to-teal-600"
        },
        '100_SINGLE_CYCLE': {
            title: "Weekly Legend",
            subtitle: "Earned $100 in a single cycle!",
            icon: <IconTrophy className="w-20 h-20 text-rose-500" />,
            color: "from-rose-500 to-pink-600"
        },
        'STREAK_5_HOUR': {
            title: "On Fire!",
            subtitle: "5 Wins in under 1 Hour - Unstoppable",
            icon: <IconSparkles className="w-20 h-20 text-orange-500" />,
            color: "from-orange-500 to-yellow-600"
        }
    }[type];

    useEffect(() => {
        const timer = setTimeout(onClose, 6000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-1000 cursor-pointer" onClick={onClose} />

            <div className="relative animate-in zoom-in slide-in-from-bottom-20 duration-1000 flex flex-col items-center">
                {/* Simulated Confetti (Pure CSS) */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2">
                    <div className="flex gap-2">
                        {[...Array(12)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full animate-bounce`}
                                style={{
                                    backgroundColor: ['#f59e0b', '#10b981', '#6366f1', '#ec4899'][i % 4],
                                    animationDelay: `${i * 0.1}s`
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div className={`p-1 bg-gradient-to-br ${config.color} rounded-[4rem] shadow-2xl`}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3.8rem] p-12 text-center relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="absolute top-8 right-8 z-50 p-2 text-slate-400 hover:text-rose-500 transition-colors pointer-events-auto hover:bg-slate-100 rounded-full"
                        >
                            <IconX className="w-6 h-6" />
                        </button>
                        <div className="mb-6 scale-125 animate-in zoom-in duration-500 delay-300">
                            {config.icon}
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{config.title}</h2>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{config.subtitle}</p>
                    </div>
                </div>

                <div className="mt-8 px-6 py-3 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/20">
                    Achievement Unlocked
                </div>
            </div>
        </div>
    );
};

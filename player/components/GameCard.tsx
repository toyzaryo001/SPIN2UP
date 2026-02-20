"use client";

import { Gamepad2, Dices, Play, Flame, Sparkles, Star } from 'lucide-react';

const GameCard = ({ title, provider, image, color, hot, isNew, type, onPlay }: any) => {
    const hasImage = image && image !== "";

    const handleClick = () => {
        if (onPlay) {
            onPlay();
        }
    };

    return (
        <div onClick={handleClick} className="group relative rounded-lg md:rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] transition-all duration-300 transform hover:-translate-y-1 md:hover:-translate-y-2">
            <div className={`aspect-[4/5] md:aspect-[3/4] w-full relative overflow-hidden ${!hasImage ? (color || 'bg-slate-800') : ''}`}>
                {hasImage ? (
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${image})` }}></div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        {type === 'slot'
                            ? <Gamepad2 size={48} className="text-white/20 group-hover:text-white/60 transition-colors duration-500" />
                            : <Dices size={48} className="text-white/20 group-hover:text-white/60 transition-colors duration-500" />
                        }
                    </div>
                )}

                {/* Hover Action Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-300 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleClick(); }}
                        className="btn-green w-12 h-12 rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100"
                    >
                        <Play fill="white" className="ml-1" size={20} />
                    </button>
                    <span className="text-xs font-bold text-white tracking-widest translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-150">เล่นเลย</span>
                </div>

                {/* Hot Badge */}
                {hot && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-red-600 to-transparent pl-4 pr-1 py-1">
                        <div className="flex items-center gap-1 text-white text-[10px] font-black uppercase italic pr-1">
                            <Flame size={12} fill="white" className="animate-pulse" /> HOT
                        </div>
                    </div>
                )}
                {/* New Badge */}
                {isNew && (
                    <div className="absolute top-0 left-0 bg-gradient-to-r from-blue-500 to-transparent pr-4 pl-1 py-1">
                        <div className="flex items-center gap-1 text-white text-[10px] font-black uppercase italic pl-1">
                            <Sparkles size={12} fill="white" className="animate-pulse" /> NEW
                        </div>
                    </div>
                )}
            </div>

            {/* Card Details */}
            <div className="bg-[#1e293b] p-3 border-t border-white/5 relative z-20 group-hover:bg-[#253248] transition-colors">
                <h3 className="text-slate-100 font-bold text-sm truncate group-hover:text-yellow-400 transition-colors font-sans">{title}</h3>
                <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">{provider}</span>
                    <div className="flex gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={8} fill={i <= 4 ? "#fbbf24" : "none"} className={i <= 4 ? "text-yellow-400" : "text-slate-600"} />)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameCard;

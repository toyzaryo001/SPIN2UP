"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, Menu, User, Gamepad2, Dices, Trophy, Gift, Wallet,
  ChevronRight, Play, CreditCard, Smartphone, Flame, Star, Users, X,
  MonitorPlay, Sparkles
} from 'lucide-react';
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// --- 1. VISUAL COMPONENTS (Premium UI) ---

const Header = ({ onLogin, onRegister, user, onLogout }: any) => (
  <header className="sticky top-0 z-50 glass-card border-b-0">
    <div className="max-w-7xl mx-auto px-2 md:px-4 h-16 md:h-20 flex items-center justify-between">
      {/* Logo Area */}
      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.location.href = '/'}>
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-400 blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <Gamepad2 className="w-10 h-10 text-gradient-gold relative z-10" />
        </div>
        <div>
          <h1 className="text-xl md:text-3xl font-black italic tracking-tighter text-white">
            GOLDEN<span className="text-gradient-gold">BET</span>
          </h1>
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
        </div>
      </div>

      {/* Modern Search */}
      <div className="flex-1 max-w-lg mx-8 hidden md:block relative group">
        <div className="absolute inset-0 bg-blue-500/10 blur-md rounded-full group-hover:bg-blue-500/20 transition-all"></div>
        <input
          type="text"
          placeholder="ค้นหาเกมโปรดของคุณ..."
          className="w-full bg-[#0f172a]/80 text-white border border-white/10 rounded-full py-3 pl-12 pr-4 focus:outline-none focus:border-blue-500/50 transition-all relative z-10 placeholder-slate-500"
        />
        <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5 z-20 group-hover:text-blue-400 transition-colors" />
      </div>

      {/* Auth / User Area */}
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-4 bg-white/5 rounded-full p-1.5 pr-6 border border-white/10 hover:border-white/20 transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 p-0.5 shadow-lg">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                <User size={20} className="text-yellow-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Vip Level 1</span>
              <span className="text-sm font-black text-white group-hover:text-yellow-400 transition-colors">{user.username}</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
            <div className="text-right">
              <span className="text-xs text-green-400 block">Balance</span>
              <span className="font-mono font-bold text-gradient-gold text-lg">฿{Number(user.balance).toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={onLogin} className="px-3 md:px-6 py-1.5 md:py-2.5 rounded-full font-bold text-xs md:text-base text-white hover:text-yellow-400 transition-colors relative group overflow-hidden border border-white/10 md:border-0">
              <span className="relative z-10">เข้าสู่ระบบ</span>
              <div className="absolute inset-0 bg-white/5 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </button>
            <button onClick={onRegister} className="btn-gold px-3 md:px-8 py-1.5 md:py-2.5 rounded-full relative overflow-hidden group shadow-md">
              <span className="relative z-10 flex items-center gap-1 md:gap-2 text-xs md:text-base whitespace-nowrap">สมัครสมาชิก <ChevronRight size={14} className="hidden md:block" /></span>
              <div className="absolute inset-0 bg-white/20 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </button>
          </div>
        )}
        <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden hover:scale-110 transition-transform cursor-pointer shadow-lg">
          <img src="https://flagcdn.com/w80/th.png" alt="TH" className="w-full h-full object-cover opacity-80 hover:opacity-100" />
        </div>
      </div>
    </div>
  </header>
);

const NavBar = ({ activeTab, setActiveTab }: any) => {
  const menus = [
    { id: 'home', label: 'หน้าหลัก', icon: <Play size={18} /> },
    { id: 'slots', label: 'สล็อต', icon: <Gamepad2 size={18} /> },
    { id: 'casino', label: 'คาสิโนสด', icon: <Dices size={18} /> },
    { id: 'sports', label: 'กีฬา', icon: <Trophy size={18} /> },
    { id: 'lotto', label: 'หวย', icon: <Gift size={18} /> },
    { id: 'promotions', label: 'โปรโมชั่น', icon: <Star size={18} /> },
  ];

  return (
    <nav className="sticky top-20 z-40 bg-[#0f172a]/90 backdrop-blur-md border-b border-white/5 py-2 overflow-x-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 min-w-max">
          {menus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => setActiveTab(menu.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-all duration-300 font-bold text-sm tracking-wide
                ${activeTab === menu.id
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-[0_0_20px_rgba(250,204,21,0.4)] scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {menu.icon}
              <span className="font-sans">{menu.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

const Banner = () => (
  <div className="relative rounded-2xl md:rounded-3xl overflow-hidden h-full min-h-[180px] md:min-h-[300px] flex items-center group border border-white/10">
    {/* Cinematic Background */}
    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-[10s] group-hover:scale-110"></div>
    <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/80 to-transparent"></div>
    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent"></div>

    {/* Floating Particles */}
    <div className="absolute inset-0 opacity-30">
      <Sparkles className="absolute top-10 right-20 text-yellow-400 animate-pulse" size={40} />
      <div className="absolute bottom-20 right-40 w-32 h-32 bg-blue-500 rounded-full blur-[100px] animate-float"></div>
    </div>

    {/* Content */}
    <div className="relative z-10 px-8 max-w-lg">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4 animate-slide-up">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
        <span className="text-xs font-bold text-green-400 tracking-wider">โปรโมชั่นสุดฮิต</span>
      </div>

      <h2 className="text-3xl md:text-5xl font-black text-white leading-[0.9] mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        สมัครใหม่รับ <br />
        <span className="text-gradient-gold">โบนัส 100%</span>
      </h2>

      <p className="text-slate-300 text-xs md:text-base mb-4 md:mb-6 font-light animate-slide-up" style={{ animationDelay: '0.2s' }}>
        ฝากครั้งแรกรับโบนัสทันที สูงสุด 5,000 บาท
      </p>

      <div className="flex items-center gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <button className="btn-green px-6 py-3 rounded-xl text-base shadow-lg hover:shadow-green-500/30 flex items-center gap-2 group/btn">
          รับโบนัสเลย <ChevronRight className="group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  </div>
);

const InviteCard = () => (
  <div className="glass-card h-full rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between group border border-white/10">
    <div className="absolute top-0 right-0 p-4 opacity-50">
      <Users size={80} className="text-white/5" />
    </div>

    <div>
      <div className="flex items-center gap-2 mb-2">
        <Users className="text-blue-400" />
        <h3 className="text-xl font-bold text-white">ชวนเพื่อนรับรายได้</h3>
      </div>
      <p className="text-slate-400 text-sm">รับคอมมิชชั่น 0.8% ทุกยอดเล่น</p>
    </div>

    <div className="bg-[#0f172a]/50 p-4 rounded-xl border border-white/5 mt-4">
      <p className="text-[10px] text-slate-500 mb-2 uppercase font-bold">ลิงค์แนะนำของคุณ</p>
      <div className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2 border border-white/5">
        <span className="text-xs text-yellow-500 font-mono">goldenbet.com/u/user888</span>
        <Gift size={16} className="text-yellow-500 cursor-pointer hover:scale-110 transition-transform" />
      </div>
    </div>
  </div>
);

// --- PREMIUM GAME CARD (Fixes the "dry" look) ---
// --- PREMIUM GAME CARD ---
const GameCard = ({ title, provider, image, color, hot, type }: any) => {
  const hasImage = image && image !== "";
  return (
    <div className="group relative rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] transition-all duration-300 transform hover:-translate-y-2">
      <div className={`h-40 w-full relative overflow-hidden ${!hasImage ? (color || 'bg-slate-800') : ''}`}>
        {hasImage ? (
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${image})` }}></div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Premium Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            {type === 'slot'
              ? <Gamepad2 size={48} className="text-white/20 group-hover:text-white/60 transition-colors duration-500" />
              : <Dices size={48} className="text-white/20 group-hover:text-white/60 transition-colors duration-500" />
            }
          </div>
        )}

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
          <button className="btn-green w-12 h-12 rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100">
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

const Sidebar = ({ title, items, active, setActive }: any) => (
  <div className="glass-card rounded-2xl overflow-hidden sticky top-36">
    <div className="p-5 border-b border-white/10 bg-white/5">
      <h3 className="text-lg font-black text-white border-l-4 border-yellow-500 pl-3 uppercase italic tracking-wider">{title}</h3>
    </div>
    <div className="p-3 flex flex-col gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
      {items.map((item: any, idx: number) => (
        <button
          key={idx}
          onClick={() => setActive && setActive(item)}
          className={`px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between w-full group relative overflow-hidden
            ${active === item
              ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
        >
          <div className="flex items-center gap-3 relative z-10">
            {active === item && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>}
            <span>{item}</span>
          </div>
          {active === item && <ChevronRight size={16} className="text-yellow-400" />}
          {active !== item && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>}
        </button>
      ))}
    </div>
  </div>
);

const JackpotBar = () => {
  const [jackpot, setJackpot] = useState(48291045.50);

  useEffect(() => {
    const interval = setInterval(() => { setJackpot(prev => prev + (Math.random() * 25)); }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden mb-16 bg-black border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.15)] group">
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between px-8 py-6 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/50">
            <Trophy className="text-yellow-400 animate-bounce" />
          </div>
          <div>
            <h3 className="text-yellow-500 font-bold tracking-[0.3em] text-xs mb-1">MEGA JACKPOT</h3>
            <div className="text-5xl md:text-6xl font-black font-mono text-gradient-gold tracking-tighter tabular-nums drop-shadow-lg">
              ฿ {jackpot.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex -space-x-2 mb-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-slate-700"></div>
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-slate-800 flex items-center justify-center text-[10px] text-white font-bold">+99</div>
          </div>
          <div className="text-green-400 text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
            Recent Winners
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 3. MAIN LOGIC & MODALS ---

const TopBanner = () => (
  <div className="w-full relative rounded-2xl md:rounded-3xl overflow-hidden mb-6 group border border-white/10 shadow-2xl">
    <div className="aspect-[1920/500] w-full relative">
      {/* Placeholder Image 1920x500 */}
      <img
        src="https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1920&h=500&auto=format&fit=crop"
        alt="Main Banner"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent"></div>

      {/* Text Content */}
      <div className="absolute bottom-0 left-0 p-4 md:p-12 max-w-3xl">
        <div className="inline-block px-3 py-1 rounded-full bg-red-600 text-white text-[10px] md:text-sm font-bold mb-2 animate-pulse">
          HOT EVENT
        </div>
        <h2 className="text-2xl md:text-5xl font-black text-white italic tracking-tighter mb-2 text-shadow-lg">
          มหกรรมคาสิโนออนไลน์ <span className="text-yellow-400">อันดับ 1</span>
        </h2>
        <p className="text-slate-200 text-xs md:text-lg font-light hidden md:block">
          ร่วมสนุกกับกิจกรรมพิเศษลุ้นรับของรางวัลมากมายมูลค่ากว่า 10,000,000 บาท
        </p>
      </div>
    </div>
  </div>
);

const HomeContent = ({ games }: any) => {
  const providers = ["PG Soft", "Joker", "Pragmatic", "Jili", "Spadegaming", "Red Tiger", "Habanero", "Blueprint"];

  // Mock Games with Strict Green/Yellow/Blue Palette
  const MOCK_GAMES = [
    { title: "Treasures of Aztec", provider: "PG Soft", color: "bg-gradient-to-br from-green-800 to-green-950", hot: true, type: 'slot' },
    { title: "Roma Legacy", provider: "Joker", color: "bg-gradient-to-br from-yellow-700 to-yellow-900", hot: true, type: 'slot' },
    { title: "Sweet Bonanza", provider: "Pragmatic", color: "bg-gradient-to-br from-blue-600 to-blue-900", hot: true, type: 'slot' },
    { title: "Lucky Neko", provider: "PG Soft", color: "bg-gradient-to-br from-yellow-600 to-yellow-800", hot: false, type: 'slot' },
    { title: "Baccarat Live", provider: "SA Gaming", color: "bg-gradient-to-br from-blue-800 to-slate-900", hot: true, type: 'casino' },
    { title: "Sexy Gaming", provider: "AE Sexy", color: "bg-gradient-to-br from-green-700 to-green-900", hot: false, type: 'casino' },
    { title: "Mahjong Ways 2", provider: "PG Soft", color: "bg-gradient-to-br from-red-900 to-slate-900", hot: true, type: 'slot' }, // Keep red for variety but dark
    { title: "Fortune Ox", provider: "PG Soft", color: "bg-gradient-to-br from-yellow-500 to-orange-700", hot: true, type: 'slot' },
  ];

  const displayGames = games && games.length > 0 ? games.map((g: any, i: number) => ({
    title: g.name,
    provider: g.provider?.name || "Game",
    image: g.thumbnail,
    color: MOCK_GAMES[i % MOCK_GAMES.length].color,
    hot: g.isHot,
    type: 'slot'
  })) : MOCK_GAMES;

  return (
    <div className="animate-fade-in space-y-6 md:space-y-8">
      {/* Top Main Banner 1920x500 */}
      <TopBanner />

      {/* Hero Grid System */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Banner />
        </div>
        <div className="md:col-span-1">
          <InviteCard />
        </div>
      </div>

      <JackpotBar />

      <div className="relative">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-white italic tracking-tighter flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
              <Flame className="text-orange-500 fill-orange-500 animate-pulse" />
            </div>
            เกมยอดฮิต <span className="text-sm font-normal text-slate-500 not-italic tracking-normal self-end mb-1 custom-font">ยอดนิยมวันนี้</span>
          </h2>
          <button className="text-sm font-bold text-yellow-500 hover:text-white transition-colors flex items-center gap-1 group">
            ดูทั้งหมด <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {displayGames.slice(0, 10).map((game: any, i: number) => (
            <GameCard key={i} {...game} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 hidden md:block">
          <Sidebar title="ค่ายเกมชั้นนำ" items={providers} active={null} />
        </div>
        <div className="md:col-span-3">
          <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
            <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
              <Trophy className="text-yellow-400" size={32} />
              ผู้ชนะล่าสุด
              <span className="text-xs font-bold bg-green-500 text-black px-2 py-1 rounded ml-auto">LIVE FEED</span>
            </h3>

            <div className="space-y-4 max-h-[500px] overflow-hidden relative">
              <div className="absolute top-0 w-full h-10 bg-gradient-to-b from-[#0f172a] to-transparent z-10 pointer-events-none"></div>
              <div className="absolute bottom-0 w-full h-10 bg-gradient-to-t from-[#0f172a] to-transparent z-10 pointer-events-none"></div>

              {/* Vertical Marquee simulation */}
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:border-yellow-500/30 transition-all group hover:bg-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center relative">
                      <User className="text-blue-400 group-hover:text-white transition-colors" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] font-bold text-black border-2 border-[#0f172a]">#{i}</div>
                    </div>
                    <div>
                      <div className="text-white font-bold tracking-wide">User888***{i}</div>
                      <div className="text-xs text-slate-400">{i % 2 === 0 ? "Mahjong Ways 2" : "Baccarat"}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gradient-green font-mono font-black text-xl">+฿{(Math.random() * 50000).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className="text-[10px] text-slate-500">Just now</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SlotsContent = () => {
  const [activeProvider, setActiveProvider] = useState("PG Soft");
  const providers = ["PG Soft", "Joker", "Pragmatic", "Jili", "XO Slot", "Relax Gaming", "No Limit City"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
      <div className="md:col-span-1 hidden md:block">
        <Sidebar title="ค่ายสล็อต" items={providers} active={activeProvider} setActive={setActiveProvider} />
      </div>
      <div className="md:hidden col-span-1">
        <select
          className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-3 outline-none focus:border-yellow-500 font-sans"
          value={activeProvider}
          onChange={(e) => setActiveProvider(e.target.value)}
        >
          {providers.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="md:col-span-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 bg-[#1e293b] p-4 rounded-xl border border-slate-700 gap-4 shadow-md">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 font-sans">
              <Gamepad2 className="text-yellow-400" />
              เกมสล็อต: <span className="text-green-400">{activeProvider}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-sans">เกมทั้งหมด 148 เกม</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700 font-sans">ล่าสุด</button>
            <button className="px-4 py-1.5 text-xs bg-yellow-500 text-slate-900 rounded-lg font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-colors font-sans">ยอดนิยม</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <GameCard
              key={i}
              title={`${activeProvider} Game ${i + 1}`}
              provider={activeProvider}
              image={null}
              color={`bg-gradient-to-br from-slate-700 to-slate-800`}
              hot={i % 3 === 0}
              type="slot"
            />
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <button className="px-8 py-2.5 border border-slate-600 text-slate-400 rounded-full text-xs font-bold hover:text-white hover:border-white transition-all uppercase tracking-wider font-sans">
            โหลดเพิ่มเติม
          </button>
        </div>
      </div>
    </div>
  );
};

const CasinoContent = () => {
  const [activeProvider, setActiveProvider] = useState("SA Gaming");
  const providers = ["SA Gaming", "AE Sexy", "Evolution", "Dream Gaming", "WM Casino", "Pretty Gaming"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
      <div className="md:col-span-1 hidden md:block">
        <Sidebar title="ค่ายคาสิโน" items={providers} active={activeProvider} setActive={setActiveProvider} />
      </div>
      <div className="md:hidden col-span-1">
        <select
          className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-3 outline-none focus:border-yellow-500 font-sans"
          value={activeProvider}
          onChange={(e) => setActiveProvider(e.target.value)}
        >
          {providers.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="md:col-span-3">
        <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 rounded-xl p-6 mb-6 border border-blue-800/50 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-20 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2 font-sans">
              {activeProvider} Live <span className="px-2 py-0.5 bg-red-600 text-[10px] rounded text-white animate-pulse shadow-lg shadow-red-600/40 font-sans">LIVE</span>
            </h2>
            <p className="text-blue-200 text-sm max-w-lg font-light font-sans">สัมผัสประสบการณ์คาสิโนสดจาก {activeProvider} ส่งตรงจากต่างประเทศ ภาพคมชัดระดับ 4K</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {['Baccarat A01', 'Baccarat A02', 'Roulette R1', 'Dragon Tiger', 'SicBo', 'Blackjack'].map((room, i) => (
            <div key={i} className="bg-[#1e293b] rounded-xl overflow-hidden border border-slate-700 group hover:border-green-500/50 transition-all cursor-pointer shadow-lg">
              <div className="h-44 bg-black relative group-hover:brightness-110 transition-all">
                {/* Live Badge */}
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1.5 border border-white/10 z-10 font-sans">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                  <span>User: {(Math.random() * 1000).toFixed(0)}</span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
                  <MonitorPlay size={48} className="text-slate-600 group-hover:text-slate-500 transition-colors" />
                </div>

                {/* Mock Card Result */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-8">
                  <div className="flex justify-between items-end">
                    <div className="flex gap-1">
                      {[...Array(6)].map((_, idx) => (
                        <div key={idx} className={`w-4 h-4 rounded-full border-2 border-slate-800 shadow-sm flex items-center justify-center text-[7px] font-bold text-white ${Math.random() > 0.5 ? 'bg-blue-600' : 'bg-red-600'}`}>
                          {Math.random() > 0.5 ? 'P' : 'B'}
                        </div>
                      ))}
                    </div>
                    <span className="text-white/70 font-mono text-xs">Room {i + 1}</span>
                  </div>
                </div>
              </div>
              <div className="p-3 flex justify-between items-center bg-[#1e293b] border-t border-slate-700">
                <div>
                  <h3 className="text-white font-bold text-sm font-sans">{room}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Limit: 20 - 50k</p>
                </div>
                <button className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold shadow-lg shadow-green-600/20 transition-all transform hover:-translate-y-0.5 font-sans">
                  เล่นเลย
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- 3. MAIN LOGIC & MODALS ---

const Footer = () => (
  <footer className="bg-[#0b1120] border-t border-slate-800 text-slate-400 py-16 mt-20 relative overflow-hidden">
    {/* Background Glow */}
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px]"></div>
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-600/10 rounded-full blur-[128px]"></div>

    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-6">
            <Gamepad2 className="text-yellow-400" size={32} />
            <h3 className="text-2xl font-black text-white italic tracking-tighter">
              GOLDEN<span className="text-gradient-gold">BET</span>
            </h3>
          </div>
          <p className="text-sm font-light leading-7 text-slate-500 mb-6">
            คาสิโนออนไลน์ชั้นนำระดับโลก ได้รับใบอนุญาตและกำกับดูแลอย่างถูกต้อง สัมผัสประสบการณ์แห่งชัยชนะได้ที่นี่
          </p>
          <div className="flex gap-4">
            {/* Social Icons Mockup */}
            {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-white/10 transition-colors cursor-pointer border border-white/5"></div>)}
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest text-gradient-gold w-fit">แพลตฟอร์ม</h4>
          <ul className="space-y-4 text-sm font-medium">
            {['สล็อตออนไลน์', 'คาสิโนสด', 'เดิมพันกีฬา', 'หวย', 'โปรโมชั่น'].map(item => (
              <li key={item} className="hover:text-yellow-400 cursor-pointer transition-colors flex items-center gap-2 group">
                <div className="w-1 h-1 rounded-full bg-slate-600 group-hover:bg-yellow-400 transition-colors"></div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest text-gradient-green w-fit">ช่วยเหลือ</h4>
          <ul className="space-y-4 text-sm font-medium">
            {['ศูนย์ช่วยเหลือ', 'วิธีการฝากถอน', 'VIP คลับ', 'ติดต่อเรา', 'เงื่อนไขการใช้งาน'].map(item => (
              <li key={item} className="hover:text-green-400 cursor-pointer transition-colors flex items-center gap-2 group">
                <div className="w-1 h-1 rounded-full bg-slate-600 group-hover:bg-green-400 transition-colors"></div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest text-blue-400 w-fit">การชำระเงินที่ปลอดภัย</h4>
          <div className="grid grid-cols-3 gap-3">
            {['KBANK', 'SCB', 'BBL', 'KTB', 'TRUE', 'VISA'].map(bank => (
              <div key={bank} className="h-10 bg-[#1e293b] rounded flex items-center justify-center text-[10px] font-bold border border-slate-700 hover:border-white transition-all hover:scale-105 cursor-pointer shadow-sm">
                {bank}
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 bg-green-900/10 rounded-xl border border-green-500/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="text-green-400 text-lg">🔒</span>
            </div>
            <div>
              <div className="text-xs font-bold text-green-400">SSL ENCRYPTED</div>
              <div className="text-[10px] text-green-500/70">100% ปลอดภัย & มั่นคง</div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center text-xs text-slate-600 font-medium">
        <p>&copy; 2026 GoldenBet. สงวนลิขสิทธิ์.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <span>นโยบายความเป็นส่วนตัว</span>
          <span>การเล่นเกมอย่างรับผิดชอบ</span>
        </div>
      </div>
    </div>
  </footer>
);

function HomePageLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('home');
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // Auth & Data State
  const [user, setUser] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Forms
  const [loginForm, setLoginForm] = useState({ phone: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    fullName: "", phone: "", bankName: "KBANK", bankAccount: "", password: "", confirmPassword: "", lineId: "", referrer: "",
  });

  // Fetch Games
  useEffect(() => {
    const fetchData = async () => {
      try {
        const gameRes = await axios.get(`${API_URL}/public/games`);
        if (Array.isArray(gameRes.data)) setGames(gameRes.data);
      } catch (err) { console.error("Failed to fetch games", err); }
    };
    fetchData();
  }, []);

  // Check Auth
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (token && userData && userData !== "undefined") {
      try { setUser(JSON.parse(userData)); }
      catch (e) { localStorage.removeItem("user"); }
    }
  }, []);

  // Handle URL Actions
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "login") { setShowLogin(true); setShowRegister(false); }
    else if (action === "register") { setShowRegister(true); setShowLogin(false); }
  }, [searchParams]);

  // Actions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, loginForm);
      if (res.data.success) {
        localStorage.setItem("token", res.data.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.data.user));
        setUser(res.data.data.user);
        setShowLogin(false);
        router.replace("/");
      }
    } catch (err: any) { setError(err.response?.data?.message || "Login failed"); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (registerForm.password !== registerForm.confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/register`, { ...registerForm });
      if (res.data.success) {
        setSuccess("Registration successful!");
        setShowRegister(false);
        setShowLogin(true);
      }
    } catch (err: any) { setError(err.response?.data?.message || "Registration failed"); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.reload();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeContent games={games} />;
      case 'slots': return <SlotsContent />;
      case 'casino': return <CasinoContent />;
      default: return (
        <div className="flex flex-col items-center justify-center py-32 text-slate-500 min-h-[50vh]">
          <div className="relative">
            <Gamepad2 size={80} className="mb-4 opacity-10" />
            <div className="absolute -top-2 -right-2 bg-yellow-500 text-slate-900 text-[10px] px-2 py-0.5 rounded font-bold">SOON</div>
          </div>
          <h2 className="text-xl font-bold text-slate-400 font-sans">Coming Soon</h2>
          <p className="mt-2 text-xs text-slate-600 font-sans">{activeTab} category is under construction.</p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 font-sans selection:bg-yellow-500 selection:text-black pb-20">
      <Header onLogin={() => setShowLogin(true)} onRegister={() => setShowRegister(true)} user={user} onLogout={handleLogout} />

      <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="w-full px-2 md:px-4 py-4 md:py-8 max-w-7xl mx-auto">
        {renderContent()}
      </main>

      <Footer />

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-800 px-2 py-1 z-50 pb-safe">
        <div className="grid grid-cols-5 gap-1 items-end h-[60px]">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center justify-center h-full rounded-lg transition-colors ${activeTab === 'home' ? 'text-yellow-400' : 'text-slate-500'}`}>
            <Play size={20} className={activeTab === 'home' ? 'fill-current' : ''} />
            <span className="text-[10px] mt-1 font-medium font-sans">หน้าหลัก</span>
          </button>
          <button onClick={() => setActiveTab('slots')} className={`flex flex-col items-center justify-center h-full rounded-lg transition-colors ${activeTab === 'slots' ? 'text-yellow-400' : 'text-slate-500'}`}>
            <Gamepad2 size={20} className={activeTab === 'slots' ? 'fill-current' : ''} />
            <span className="text-[10px] mt-1 font-medium font-sans">สล็อต</span>
          </button>
          <div className="relative flex justify-center h-full items-center">
            <button onClick={() => !user ? setShowLogin(true) : null} className="absolute -top-6 w-14 h-14 rounded-full bg-gradient-to-r from-green-500 to-green-600 border-4 border-[#0b1120] flex items-center justify-center text-white shadow-lg shadow-green-500/40 transform active:scale-95 transition-transform hover:scale-105">
              <Wallet size={24} />
            </button>
            <span className="text-[10px] text-slate-400 mt-8 font-medium font-sans">กระเป๋า</span>
          </div>
          <button onClick={() => setActiveTab('casino')} className={`flex flex-col items-center justify-center h-full rounded-lg transition-colors ${activeTab === 'casino' ? 'text-yellow-400' : 'text-slate-500'}`}>
            <Dices size={20} className={activeTab === 'casino' ? 'fill-current' : ''} />
            <span className="text-[10px] mt-1 font-medium font-sans">คาสิโน</span>
          </button>
          <button onClick={() => !user ? setShowLogin(true) : null} className="flex flex-col items-center justify-center h-full rounded-lg text-slate-500 hover:text-white transition-colors">
            <User size={20} />
            <span className="text-[10px] mt-1 font-medium font-sans">บัญชี</span>
          </button>
        </div>
      </div>

      {/* LOGIN MODAL */}
      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowLogin(false)}>
          <div className="glass-card w-full max-w-md p-8 rounded-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24} /></button>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-white italic tracking-tighter">ยินดีต้อนรับกลับมา</h2>
              <p className="text-slate-400 text-sm mt-2">ลงชื่อเข้าใช้เพื่อดำเนินการต่อ</p>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-6 text-sm text-center font-bold">{error}</div>}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-slate-400 text-xs font-bold ml-1 mb-1 block">เบอร์โทรศัพท์</label>
                <input type="tel" placeholder="08x-xxx-xxxx" className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:outline-none transition-colors" value={loginForm.phone} onChange={e => setLoginForm({ ...loginForm, phone: e.target.value })} required />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-bold ml-1 mb-1 block">รหัสผ่าน</label>
                <input type="password" placeholder="••••••••" className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:outline-none transition-colors" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required />
              </div>
              <button type="submit" disabled={loading} className="btn-gold w-full py-4 rounded-xl text-lg font-black tracking-wide uppercase mt-4">
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบทันที"}
              </button>
            </form>

            <div className="text-center mt-8 pt-6 border-t border-white/5">
              <span className="text-slate-500 text-sm">ยังไม่มีบัญชี? </span>
              <button onClick={() => { setShowLogin(false); setShowRegister(true) }} className="text-yellow-500 font-bold hover:underline ml-1">สมัครสมาชิกที่นี่</button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER MODAL */}
      {showRegister && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowRegister(false)}>
          <div className="glass-card w-full max-w-lg p-8 rounded-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowRegister(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24} /></button>

            <div className="text-center mb-6">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600 italic tracking-tighter">สร้างบัญชีใหม่</h2>
              <p className="text-slate-400 text-sm mt-2">สมัครวันนี้รับโบนัส 100%</p>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-6 text-sm text-center font-bold">{error}</div>}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-xs font-bold ml-1 mb-1 block">เบอร์โทรศัพท์</label>
                  <input type="tel" placeholder="08x-xxx-xxxx" className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none" value={registerForm.phone} onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })} required />
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-bold ml-1 mb-1 block">ชื่อ - นามสกุล</label>
                  <input type="text" placeholder="ชื่อภาษาไทย" className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none" value={registerForm.fullName} onChange={e => setRegisterForm({ ...registerForm, fullName: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-xs font-bold ml-1 mb-1 block">ธนาคาร</label>
                  <select className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none appearance-none" value={registerForm.bankName} onChange={e => setRegisterForm({ ...registerForm, bankName: e.target.value })}>
                    <option value="KBANK">KBANK</option>
                    <option value="SCB">SCB</option>
                    <option value="BBL">BBL</option>
                    <option value="KTB">KTB</option>
                    <option value="TRUE">TRUE WALLET</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-bold ml-1 mb-1 block">เลขบัญชี</label>
                  <input type="text" placeholder="xxx-x-xxxxx-x" className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none" value={registerForm.bankAccount} onChange={e => setRegisterForm({ ...registerForm, bankAccount: e.target.value })} required />
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-bold ml-1 mb-1 block">รหัสผ่าน</label>
                <input type="password" placeholder="••••••••" className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none" value={registerForm.password} onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })} required />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-bold ml-1 mb-1 block">ยืนยันรหัสผ่าน</label>
                <input type="password" placeholder="••••••••" className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none" value={registerForm.confirmPassword} onChange={e => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })} required />
              </div>

              <div className="pt-2">
                <button type="submit" disabled={loading} className="btn-green w-full py-4 rounded-xl text-lg font-black tracking-wide uppercase shadow-green-500/20 transform active:scale-[0.98] transition-transform">
                  {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
                </button>
              </div>
            </form>
            <div className="text-center mt-6 text-sm text-slate-400 font-sans">
              มีบัญชีแล้ว? <button onClick={() => { setShowRegister(false); setShowLogin(true) }} className="text-green-500 font-bold hover:underline ml-1">เข้าสู่ระบบ</button>
            </div>
          </div >
        </div >
      )}

    </div >
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center text-white font-sans">Loading...</div>}>
      <HomePageLogic />
    </Suspense>
  );
}
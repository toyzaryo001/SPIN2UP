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
  <header className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-50 shadow-2xl shadow-black/50">
    <div className="w-full px-4 h-16 flex items-center justify-between gap-4" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Logo Area */}
      <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.location.href = '/'}>
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.4)] group-hover:shadow-[0_0_25px_rgba(234,179,8,0.6)] transition-all duration-300">
          <Gamepad2 className="text-white w-6 h-6 drop-shadow-md" />
        </div>
        <div className="hidden md:block">
          <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300 drop-shadow-sm tracking-tight font-sans">
            GOLDEN<span className="text-green-400">BET</span>
          </h1>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl hidden md:block px-4">
        <div className="relative group">
          <input
            type="text"
            placeholder="ค้นหาเกมโปรดของคุณ..."
            className="w-full bg-slate-900/80 text-slate-200 border border-slate-700 rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all placeholder-slate-500 shadow-inner font-sans"
          />
          <Search className="absolute left-4 top-3 text-slate-500 w-4 h-4 group-hover:text-green-400 transition-colors" />
        </div>
      </div>

      {/* Auth Buttons */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="hidden md:flex flex-col items-end mr-1">
              <span className="text-[10px] text-slate-400 font-sans uppercase tracking-wider">Welcome</span>
              <span className="text-sm font-bold text-yellow-400 font-sans leading-none">{user.username || user.phone}</span>
            </div>
            <div className="flex items-center gap-2 bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-1.5 rounded-full border border-slate-700 shadow-inner">
              <span className="text-green-400 text-sm font-bold font-mono">฿{Number(user.balance || 0).toLocaleString()}</span>
            </div>
            <button onClick={onLogout} className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all bg-slate-800 rounded-lg border border-slate-700">
              <User size={20} />
            </button>
          </div>
        ) : (
          <>
            <button onClick={onLogin} className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-slate-900 bg-gradient-to-b from-yellow-300 to-yellow-500 hover:from-yellow-200 hover:to-yellow-400 shadow-[0_4px_12px_rgba(234,179,8,0.2)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 font-sans">
              <User size={18} />
              <span>เข้าสู่ระบบ</span>
            </button>
            <button onClick={onRegister} className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-white bg-gradient-to-b from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 shadow-[0_4px_12px_rgba(34,197,94,0.3)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 font-sans">
              <Wallet size={18} />
              <span>สมัครสมาชิก</span>
            </button>
          </>
        )}
        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-slate-700 ml-1 cursor-pointer hover:border-white transition-all shadow-md">
          <img src="https://flagcdn.com/w40/th.png" alt="TH" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  </header>
);

const NavBar = ({ activeTab, setActiveTab }: any) => {
  const menus = [
    { id: 'home', label: 'หน้าหลัก', icon: <Play size={20} /> },
    { id: 'slots', label: 'สล็อต', icon: <Gamepad2 size={20} /> },
    { id: 'casino', label: 'คาสิโน', icon: <Dices size={20} /> },
    { id: 'sports', label: 'กีฬา', icon: <Trophy size={20} /> },
    { id: 'lotto', label: 'หวย', icon: <Gift size={20} /> },
    { id: 'promotions', label: 'โปรโมชั่น', icon: <Star size={20} /> },
  ];

  return (
    <nav className="bg-[#1e293b] border-b border-slate-700 shadow-lg sticky top-16 z-40">
      <div className="w-full px-4" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="flex overflow-x-auto no-scrollbar scroll-smooth">
          {menus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => setActiveTab(menu.id)}
              className={`flex flex-col md:flex-row items-center justify-center gap-2 px-6 py-4 min-w-[100px] md:min-w-0 transition-all border-b-[3px] flex-shrink-0 relative overflow-hidden group
                ${activeTab === menu.id
                  ? 'border-yellow-500 text-yellow-400 bg-slate-800'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
            >
              <div className={`transition-transform duration-300 ${activeTab === menu.id ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110'}`}>
                {menu.icon}
              </div>
              <span className="text-sm font-bold whitespace-nowrap font-sans">{menu.label}</span>
              {activeTab === menu.id && <div className="absolute inset-0 bg-yellow-400/5 z-0 animate-pulse"></div>}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

const Banner = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div className="md:col-span-2 relative h-56 md:h-72 rounded-2xl overflow-hidden shadow-2xl group cursor-pointer border border-blue-900/50">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-[#0f172a] to-[#0f172a] z-0"></div>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-600/30 rounded-full blur-[80px]"></div>
      <div className="absolute top-10 right-20 w-40 h-40 bg-purple-600/20 rounded-full blur-[60px]"></div>

      <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-12 transition-transform group-hover:scale-[1.01] duration-500">
        <span className="inline-flex items-center px-3 py-1 bg-yellow-500 text-slate-900 text-[10px] font-black tracking-wider uppercase rounded-sm w-fit mb-3 animate-pulse font-sans">
          <Flame size={12} className="mr-1" /> Hot Promotion
        </span>
        <h2 className="text-4xl md:text-6xl font-black text-white mb-2 drop-shadow-xl italic tracking-tighter font-sans">
          สมัครใหม่รับ <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">100%</span>
        </h2>
        <p className="text-blue-100/80 mb-8 max-w-lg text-sm md:text-base font-light leading-relaxed font-sans">
          ฝากครั้งแรกรับโบนัสทันที สูงสุด 5,000 บาท ทำเทิร์นน้อย ถอนไม่อั้น การันตีความมั่นคง
        </p>
        <button className="w-fit px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold rounded-lg shadow-lg shadow-green-500/30 transition-all flex items-center gap-2 transform group-hover:translate-x-2 font-sans">
          รับโบนัสเลย <ChevronRight size={20} />
        </button>
      </div>
    </div>

    <div className="relative h-56 md:h-72 bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 flex flex-col group hover:border-blue-500 transition-all cursor-pointer shadow-lg">
      <div className="p-6 relative z-10 flex flex-col h-full justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2 font-sans">
            <div className="p-2 bg-blue-500/20 rounded-lg"><Users className="text-blue-400" size={20} /></div>
            ชวนเพื่อนรับรายได้
          </h3>
          <p className="text-slate-400 text-xs mt-2 leading-relaxed font-sans">
            เพียงแชร์ลิงค์ชวนเพื่อน รับคอมมิชชั่น 0.8% จากทุกยอดการเล่นของเพื่อน สร้างรายได้มหาศาล
          </p>
        </div>

        <div className="mt-4 p-4 bg-slate-900/80 rounded-xl border border-slate-700 backdrop-blur-sm">
          <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider font-bold font-sans">Your Affiliate Link</p>
          <div className="flex items-center justify-between bg-black/30 rounded-lg p-3 border border-slate-700 group-hover:border-slate-500 transition-colors">
            <span className="text-green-400 text-sm font-mono truncate">goldenbet.com/u/user888</span>
            <button className="text-slate-400 hover:text-white transition-colors">
              <Gift size={18} />
            </button>
          </div>
        </div>
      </div>
      <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
        <Users size={180} className="text-white" />
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-900/50 to-transparent"></div>
    </div>
  </div>
);

// --- PREMIUM GAME CARD (Fixes the "dry" look) ---
const GameCard = ({ title, provider, image, color, hot, type }: any) => {
  // Logic to determine background: if image fails or missing, use the gradient color
  const hasImage = image && image !== "";

  return (
    <div className="group relative bg-[#1e293b] rounded-xl overflow-hidden border border-slate-700 hover:border-yellow-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(0,0,0,0.4)] cursor-pointer">
      {/* Image/Placeholder Area */}
      <div className={`h-36 w-full relative overflow-hidden ${!hasImage ? (color || 'bg-slate-800') : ''}`}>

        {hasImage ? (
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url(${image})` }}></div>
        ) : (
          <>
            {/* Fallback Premium Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br opacity-80 from-white/10 to-transparent pointer-events-none"></div>
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>

            {/* Icon in Center */}
            <div className="absolute inset-0 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
              {type === 'slot'
                ? <Gamepad2 size={56} className="text-white/20 group-hover:text-white/40 drop-shadow-lg transition-colors" />
                : <Dices size={56} className="text-white/20 group-hover:text-white/40 drop-shadow-lg transition-colors" />
              }
            </div>
          </>
        )}

        {/* Overlay Darken on Hover */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>

        {/* Hot Badge */}
        {hot && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-red-600 to-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg animate-pulse flex items-center gap-1 z-10 font-sans">
            <Flame size={10} fill="white" /> HOT
          </div>
        )}

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100 backdrop-blur-[1px]">
          <button className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full p-3 shadow-lg shadow-green-500/40 border border-green-400/50">
            <Play size={24} className="ml-1 fill-white" />
          </button>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-3 bg-[#1e293b] relative z-20">
        <h3 className="text-white font-bold text-sm truncate group-hover:text-yellow-400 transition-colors font-sans">{title}</h3>
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-sans truncate max-w-[60%]">{provider}</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} size={8} className={`${i <= 4 ? "text-yellow-500 fill-yellow-500" : "text-slate-600"} drop-shadow-sm`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ title, items, active, setActive }: any) => (
  <div className="bg-[#1e293b] rounded-xl overflow-hidden border border-slate-700 h-fit sticky top-36 shadow-lg">
    <div className="p-4 bg-[#0f172a] border-b border-slate-700 flex justify-between items-center">
      <h3 className="text-lg font-bold text-white border-l-4 border-yellow-500 pl-3 font-sans">{title}</h3>
      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 font-sans">{items.length} ค่าย</span>
    </div>
    <div className="p-2 grid grid-cols-2 md:grid-cols-1 gap-1 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
      {items.map((item: any, idx: number) => (
        <button
          key={idx}
          onClick={() => setActive && setActive(item)}
          className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between w-full group
            ${active === item
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md border border-blue-500/50'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
            }`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold shrink-0 transition-colors
                ${active === item ? 'bg-white text-blue-700' : 'bg-slate-700 text-slate-300 group-hover:bg-slate-600'}`}>
              {item.substring(0, 2).toUpperCase()}
            </div>
            <span className="truncate font-sans">{item}</span>
          </div>
          {active === item && <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>}
        </button>
      ))}
    </div>
  </div>
);

const JackpotBar = () => {
  const [jackpot, setJackpot] = useState(48291045.50);

  useEffect(() => {
    const interval = setInterval(() => {
      setJackpot(prev => prev + (Math.random() * 25));
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative bg-[#0b1120] py-5 mb-8 border-y border-yellow-500/20 overflow-hidden group">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

      {/* Moving Light Effect */}
      <div className="absolute top-0 left-[-100%] w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-70 animate-[slideRight_3s_linear_infinite]"></div>
      <div className="absolute bottom-0 right-[-100%] w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-70 animate-[slideLeft_3s_linear_infinite]"></div>

      <div className="w-full px-4 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-1.5 rounded-full border border-slate-700 backdrop-blur-md">
          <Trophy className="text-yellow-400 animate-bounce" size={20} />
          <div className="flex flex-col">
            <span className="text-yellow-500 font-black text-[10px] tracking-[0.2em] uppercase leading-none font-sans">Progressive</span>
            <span className="text-white text-xs font-bold leading-none font-sans">JACKPOT</span>
          </div>
        </div>

        <div className="font-mono text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-400 to-yellow-700 drop-shadow-[0_2px_10px_rgba(234,179,8,0.3)] tracking-tighter tabular-nums">
          ฿ {jackpot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-green-400 bg-green-900/20 px-3 py-1 rounded-full border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)] font-sans">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
          REAL-TIME PAYOUTS
        </div>
      </div>
    </div>
  );
}

// --- Content Sections ---

const HomeContent = ({ games }: any) => {
  const providers = ["PG Soft", "Joker", "Pragmatic", "Jili", "Spadegaming", "Red Tiger", "Habanero", "Blueprint"];

  // Mock Games with Gradient Colors fallback
  const MOCK_GAMES = [
    { title: "Treasures of Aztec", provider: "PG Soft", color: "bg-gradient-to-br from-[#166534] to-[#022c22]", hot: true, type: 'slot' },
    { title: "Roma Legacy", provider: "Joker", color: "bg-gradient-to-br from-[#991b1b] to-[#450a0a]", hot: true, type: 'slot' },
    { title: "Sweet Bonanza", provider: "Pragmatic", color: "bg-gradient-to-br from-[#9d174d] to-[#4c0519]", hot: true, type: 'slot' },
    { title: "Lucky Neko", provider: "PG Soft", color: "bg-gradient-to-br from-[#ea580c] to-[#7c2d12]", hot: false, type: 'slot' },
    { title: "Baccarat Live", provider: "SA Gaming", color: "bg-gradient-to-br from-[#1e40af] to-[#1e3a8a]", hot: true, type: 'casino' },
    { title: "Sexy Gaming", provider: "AE Sexy", color: "bg-gradient-to-br from-[#6b21a8] to-[#581c87]", hot: false, type: 'casino' },
    { title: "Mahjong Ways 2", provider: "PG Soft", color: "bg-gradient-to-br from-[#15803d] to-[#14532d]", hot: true, type: 'slot' },
    { title: "Fortune Ox", provider: "PG Soft", color: "bg-gradient-to-br from-[#854d0e] to-[#422006]", hot: true, type: 'slot' },
    { title: "Caishen Wins", provider: "PG Soft", color: "bg-gradient-to-br from-[#b91c1c] to-[#7f1d1d]", hot: false, type: 'slot' },
    { title: "Wild Bandito", provider: "PG Soft", color: "bg-gradient-to-br from-[#be185d] to-[#831843]", hot: true, type: 'slot' },
    { title: "Dragon Hatch", provider: "PG Soft", color: "bg-gradient-to-br from-[#1d4ed8] to-[#1e3a8a]", hot: false, type: 'slot' },
    { title: "Ganesha Gold", provider: "PG Soft", color: "bg-gradient-to-br from-[#7e22ce] to-[#581c87]", hot: false, type: 'slot' },
  ];

  // Merge Data
  const displayGames = games && games.length > 0 ? games.map((g: any, i: number) => ({
    title: g.name,
    provider: g.provider?.name || "Game",
    image: g.thumbnail,
    color: MOCK_GAMES[i % MOCK_GAMES.length].color,
    hot: g.isHot,
    type: 'slot'
  })) : MOCK_GAMES;

  return (
    <div className="animate-fade-in">
      <Banner />
      <JackpotBar />

      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 font-sans">
            <div className="p-1.5 bg-orange-500/20 rounded-lg border border-orange-500/30">
              <Flame className="text-orange-500 fill-orange-500" size={20} />
            </div>
            เกมฮิตช่วงนี้
          </h2>
          <button className="text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full transition-all flex items-center gap-1 border border-slate-700 font-sans">
            ดูทั้งหมด <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
          {displayGames.slice(0, 12).map((game: any, i: number) => (
            <GameCard key={i} {...game} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 hidden md:block">
          <Sidebar title="ค่ายเกมยอดฮิต" items={providers} active={null} />
        </div>
        <div className="md:col-span-3">
          <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Trophy size={150} />
            </div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2 font-sans">
                <Trophy className="text-yellow-400" /> ผู้โชคดีล่าสุด
              </h3>
              <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-500/30 flex items-center gap-1 font-sans">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Real-time
              </span>
            </div>

            <div className="space-y-3 relative z-10">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between bg-[#0f172a] p-3 rounded-lg border border-slate-800 hover:border-green-500/30 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold group-hover:border-yellow-500/50 group-hover:text-yellow-500 transition-all">
                      <User size={18} />
                    </div>
                    <div>
                      <div className="text-slate-200 text-sm font-bold font-sans">user08**{i}</div>
                      <div className="text-[10px] text-slate-500 font-sans">Mahjong Ways 2</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-mono font-bold text-lg drop-shadow-sm">+฿{(Math.random() * 50000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1 font-sans">
                      ถอนสำเร็จ <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    </div>
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

// --- Main App Logic (with Modals) ---

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
      } catch (err) {
        console.error("Failed to fetch games", err);
      }
    };
    fetchData();
  }, []);

  // Check Auth
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (token && userData && userData !== "undefined") {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error("Failed to parse user data", e);
        localStorage.removeItem("user");
      }
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
    } catch (err: any) {
      setError(err.response?.data?.message || "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (registerForm.password !== registerForm.confirmPassword) { setError("รหัสผ่านไม่ตรงกัน"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/register`, { ...registerForm });
      if (res.data.success) {
        setSuccess("สมัครสมาชิกสำเร็จ!");
        setShowRegister(false);
        setShowLogin(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
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
          <p className="mt-2 text-xs text-slate-600 font-sans">หมวดหมู่ {activeTab} กำลังเปิดให้บริการเร็วๆ นี้</p>
        </div>
      );
    }
  };

  // Styles for Modal
  const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(5px)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px"
  };
  const modalStyle: React.CSSProperties = {
    background: "#1e293b", borderRadius: "16px", padding: "32px", width: "100%",
    maxWidth: "420px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)", position: "relative", border: "1px solid #334155"
  };
  const inputStyle = {
    width: "100%", padding: "12px 14px", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px",
    color: "#fff", fontSize: "14px", marginBottom: "16px", outline: "none", fontFamily: 'sans-serif', transition: 'border-color 0.2s'
  };
  const btnPrimary = {
    width: "100%", padding: "14px", background: "linear-gradient(to right, #eab308, #ca8a04)",
    color: "#000", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold" as const, cursor: "pointer",
    fontFamily: 'sans-serif', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)'
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 font-sans selection:bg-yellow-500 selection:text-black">
      <Header
        onLogin={() => setShowLogin(true)}
        onRegister={() => setShowRegister(true)}
        user={user}
        onLogout={handleLogout}
      />

      <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="w-full px-4 py-6 pb-28 md:pb-12 max-w-7xl mx-auto">
        {renderContent()}
      </main>

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
            <span className="text-[10px] text-slate-400 mt-8 font-medium font-sans">ฝาก-ถอน</span>
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

      {/* Footer */}
      <footer className="bg-[#0f172a] border-t border-slate-800 text-slate-400 py-12 hidden md:block mt-12">
        <div className="w-full px-4 grid grid-cols-4 gap-12" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div>
            <h3 className="text-white font-bold mb-6 flex items-center gap-2 text-lg font-sans">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-slate-900 shadow-lg shadow-yellow-500/20"><Gamepad2 size={18} /></div>
              GOLDENBET
            </h3>
            <p className="text-sm leading-7 text-slate-500 font-sans">
              เว็บพนันออนไลน์อันดับ 1 มั่นคง ปลอดภัย ฝาก-ถอน รวดเร็วด้วยระบบอัตโนมัติ 24 ชั่วโมง รองรับทุกธนาคารชั้นนำ
            </p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider border-b border-slate-700 pb-2 w-fit font-sans">บริการ</h3>
            <ul className="text-sm space-y-3 text-slate-500 font-sans">
              <li className="hover:text-yellow-400 cursor-pointer transition-colors flex items-center gap-2"><ChevronRight size={12} /> สล็อตออนไลน์</li>
              <li className="hover:text-yellow-400 cursor-pointer transition-colors flex items-center gap-2"><ChevronRight size={12} /> คาสิโนสด</li>
              <li className="hover:text-yellow-400 cursor-pointer transition-colors flex items-center gap-2"><ChevronRight size={12} /> เดิมพันกีฬา</li>
              <li className="hover:text-yellow-400 cursor-pointer transition-colors flex items-center gap-2"><ChevronRight size={12} /> หวยออนไลน์</li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider border-b border-slate-700 pb-2 w-fit font-sans">ช่วยเหลือ</h3>
            <ul className="text-sm space-y-3 text-slate-500 font-sans">
              <li className="hover:text-white cursor-pointer transition-colors">เกี่ยวกับเรา</li>
              <li className="hover:text-white cursor-pointer transition-colors">เงื่อนไขการใช้งาน</li>
              <li className="hover:text-white cursor-pointer transition-colors">นโยบายความเป็นส่วนตัว</li>
              <li className="hover:text-white cursor-pointer transition-colors">ติดต่อเรา</li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider border-b border-slate-700 pb-2 w-fit font-sans">ธนาคารที่รองรับ</h3>
            <div className="flex gap-2 flex-wrap">
              {['KBANK', 'SCB', 'BBL', 'KTB', 'TRUE'].map((bank) => (
                <div key={bank} className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center text-slate-400 text-[10px] font-bold border border-slate-700 hover:border-white hover:text-white transition-all cursor-pointer shadow-sm font-sans">
                  {bank}
                </div>
              ))}
            </div>
            <div className="mt-6">
              <div className="text-xs text-slate-500 mb-2 font-sans">ปลอดภัย 100%</div>
              <div className="flex items-center gap-2 text-slate-600">
                <div className="h-6 w-10 bg-slate-800 rounded"></div>
                <div className="h-6 w-10 bg-slate-800 rounded"></div>
                <div className="h-6 w-10 bg-slate-800 rounded"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center mt-12 pt-8 border-t border-slate-800 text-xs font-sans text-slate-600">
          © 2024 GoldenBet. All rights reserved. Gambling involves risk. Please play responsibly.
        </div>
      </footer>

      {/* Modals */}
      {showLogin && (
        <div style={overlayStyle} onClick={() => setShowLogin(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
            <h2 className="text-3xl font-black text-yellow-500 text-center mb-8 tracking-tight font-sans">เข้าสู่ระบบ</h2>
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm text-center font-sans">{error}</div>}
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block ml-1 font-sans">เบอร์โทรศัพท์</label>
                  <input type="tel" placeholder="08x-xxx-xxxx" style={inputStyle} value={loginForm.phone} onChange={e => setLoginForm({ ...loginForm, phone: e.target.value })} required />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block ml-1 font-sans">รหัสผ่าน</label>
                  <input type="password" placeholder="••••••••" style={{ ...inputStyle, marginBottom: '24px' }} value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required />
                </div>
              </div>
              <button type="submit" style={btnPrimary} disabled={loading} className="transform active:scale-[0.98] transition-transform">
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </button>
            </form>
            <div className="text-center mt-6 text-sm text-slate-400 font-sans">
              ยังไม่มีบัญชี? <button onClick={() => { setShowLogin(false); setShowRegister(true) }} className="text-yellow-500 font-bold hover:underline ml-1">สมัครสมาชิก</button>
            </div>
          </div>
        </div>
      )}

      {showRegister && (
        <div style={overlayStyle} onClick={() => setShowRegister(false)}>
          <div style={{ ...modalStyle, maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowRegister(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
            <h2 className="text-3xl font-black text-green-500 text-center mb-8 tracking-tight font-sans">สมัครสมาชิก</h2>
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm text-center font-sans">{error}</div>}
            <form onSubmit={handleRegister} className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="ชื่อ-นามสกุล" style={inputStyle} className="col-span-2" value={registerForm.fullName} onChange={e => setRegisterForm({ ...registerForm, fullName: e.target.value })} />
              <input type="tel" placeholder="เบอร์โทรศัพท์" style={inputStyle} className="col-span-2" value={registerForm.phone} onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })} />
              <input type="text" placeholder="เลขบัญชี" style={inputStyle} className="col-span-2" value={registerForm.bankAccount} onChange={e => setRegisterForm({ ...registerForm, bankAccount: e.target.value })} />
              <input type="password" placeholder="รหัสผ่าน" style={inputStyle} value={registerForm.password} onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })} />
              <input type="password" placeholder="ยืนยันรหัส" style={inputStyle} value={registerForm.confirmPassword} onChange={e => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })} />
              <button type="submit" style={{ ...btnPrimary, background: "linear-gradient(to right, #22c55e, #16a34a)", color: "white", boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)' }} className="col-span-2 transform active:scale-[0.98] transition-transform" disabled={loading}>
                {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
              </button>
            </form>
            <div className="text-center mt-6 text-sm text-slate-400 font-sans">
              มีบัญชีแล้ว? <button onClick={() => { setShowRegister(false); setShowLogin(true) }} className="text-green-500 font-bold hover:underline ml-1">เข้าสู่ระบบ</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center text-white font-sans">Loading...</div>}>
      <HomePageLogic />
    </Suspense>
  );
}
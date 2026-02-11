"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, Menu, User, Gamepad2, Dices, Trophy, Gift, Wallet, Home,
  ChevronRight, Play, CreditCard, Smartphone, Flame, Star, Users, X,
  MonitorPlay, Sparkles, LogOut, Loader2
} from 'lucide-react';
import axios from "axios";
import ContactDrawer from "@/components/ContactDrawer";
import { useToast } from "@/components/Toast";
import BankSelectDropdown from "@/components/BankSelectDropdown";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api";

// --- 1. VISUAL COMPONENTS (Premium UI) ---

const Header = ({ onLogin, onRegister, user, onLogout, settings }: any) => {
  const siteName = settings?.siteName;
  const logoUrl = settings?.logoUrl;

  return (
    <header className="sticky top-0 z-50 glass-card border-b-0 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3 md:py-0 md:h-20 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0 relative">

        {/* Logo Area */}
        <div className="w-full md:w-auto flex justify-center md:justify-start relative cursor-pointer group z-10" onClick={() => window.location.href = '/'}>
          {logoUrl ? (
            <img src={logoUrl} alt={siteName || "Logo"} className="h-20 md:h-24 object-contain animate-fade-in drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
          ) : siteName ? (
            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-400 blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <Gamepad2 className="w-8 h-8 md:w-10 md:h-10 text-gradient-gold relative z-10" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white uppercase">
                  {siteName}
                  {/* <span className="text-gradient-gold">BET</span> removed to support full custom name */}
                </h1>
                <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
              </div>
            </div>
          ) : (
            <div className="h-10 w-32 bg-white/5 rounded animate-pulse" />
          )}
        </div>

        {/* Mobile Language Flag (Absolute Right) */}
        <div className="md:hidden absolute right-4 top-4 z-20">
          <div className="w-7 h-7 rounded-full border border-white/10 overflow-hidden shadow-lg">
            <img src="https://flagcdn.com/w80/th.png" alt="TH" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Central Navigation (Desktop Only) */}
        <div className="flex-1 hidden md:flex items-center justify-center gap-2 lg:gap-8">
          {[
            { label: 'หน้าหลัก', href: '/', icon: Home },
            { label: 'ฝาก/ถอน', href: '/deposit', icon: Wallet },
            { label: 'กิจกรรม', href: '/activity', icon: Gift },
            { label: 'โปรไฟล์', href: '/profile', icon: User },
          ].map((item, index) => (
            <button
              key={index}
              onClick={() => window.location.href = item.href}
              className="flex items-center gap-2 text-slate-300 hover:text-white hover:bg-white/5 py-2 px-4 rounded-full transition-all group"
            >
              <item.icon className="w-4 h-4 text-slate-400 group-hover:text-yellow-400 transition-colors" />
              <span className="font-bold text-sm lg:text-base">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Auth / User Area */}
        <div className="w-full md:w-auto z-10">
          {user ? (
            <div className="flex items-center justify-between md:justify-end gap-4 bg-white/5 rounded-full p-1.5 pr-6 border border-white/10 hover:border-white/20 transition-all cursor-pointer group">
              {/* ... User Logged in state ... */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 p-0.5 shadow-lg">
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                    <User size={20} className="text-yellow-400" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Vip Level 1</span>
                  <span className="text-sm font-black text-white group-hover:text-yellow-400 transition-colors">{user.username}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-green-400 block">Balance</span>
                <span className="font-mono font-bold text-gradient-gold text-lg">฿{Number(user.balance).toLocaleString()}</span>
              </div>
              {/* Logout Button */}
              <button onClick={(e) => { e.stopPropagation(); onLogout(); }} className="ml-2 p-2 rounded-full bg-red-500/10 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 transition-all" title="ออกจากระบบ">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 w-full md:flex md:items-center mt-1 md:mt-0">
              {/* Login Button (Blue) */}
              <button onClick={onLogin} className="w-full md:w-auto px-4 py-2.5 rounded-xl md:rounded-full font-bold text-sm md:text-base text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:to-blue-500 transition-all shadow-lg shadow-blue-500/20 border border-blue-500/50">
                เข้าสู่ระบบ
              </button>
              {/* Register Button (Green) - Primary Priority */}
              <button onClick={onRegister} className="w-full md:w-auto px-4 py-2.5 rounded-xl md:rounded-full font-bold text-sm md:text-base text-white bg-gradient-to-r from-green-500 to-green-600 hover:to-green-400 transition-all shadow-lg shadow-green-500/30 border border-green-400/50">
                สมัครสมาชิก
              </button>
            </div>
          )}
        </div>

        {/* Desktop Language Flag */}
        <div className="hidden md:block ml-4 w-10 h-10 rounded-full border border-white/10 overflow-hidden hover:scale-110 transition-transform cursor-pointer shadow-lg">
          <img src="https://flagcdn.com/w80/th.png" alt="TH" className="w-full h-full object-cover opacity-80 hover:opacity-100" />
        </div>

      </div>
    </header>
  );
};

const NavBar = ({ activeTab, setActiveTab, categories }: any) => {
  // Static Home + Dynamic Categories
  const navItems = [
    { id: 'home', label: 'หน้าหลัก', icon: <Play size={18} /> },
    ...(categories || []).map((cat: any) => ({
      id: cat.slug || cat.id.toString(), // Use slug if available for URL friendliness, else ID
      label: cat.name,
      icon: cat.slug === 'casino' ? <Dices size={18} /> :
        cat.slug === 'sport' ? <Trophy size={18} /> :
          cat.slug === 'lotto' ? <Gift size={18} /> :
            <Gamepad2 size={18} />, // Default icon
      original: cat // Keep original object for reference
    }))
  ];

  return (
    <nav className="hidden md:block sticky top-20 z-40 bg-[#0f172a]/90 backdrop-blur-md border-b border-white/5 py-2 overflow-x-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 min-w-max">
          {navItems.map((menu) => (
            <button
              key={menu.id}
              onClick={() => setActiveTab(menu.id)}
              className={`flex items-center gap-2 px-4 py-1.5 md:px-6 md:py-2.5 rounded-full transition-all duration-300 font-bold text-xs md:text-sm tracking-wide whitespace-nowrap
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

const Banner = ({ banners }: { banners: any[] }) => {
  // Use first active banner or fallback
  const mainBanner = banners && banners.length > 0 ? banners[0] : null;

  return (
    <div className="relative rounded-2xl md:rounded-3xl overflow-hidden h-full min-h-[160px] md:min-h-[300px] flex items-center group border border-white/10">
      {/* Cinematic Background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[10s] group-hover:scale-110"
        style={{ backgroundImage: `url('${mainBanner ? mainBanner.imageUrl : "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=2070&auto=format&fit=crop"}')` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/80 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent"></div>

      {/* Floating Particles */}
      <div className="absolute inset-0 opacity-30">
        <Sparkles className="absolute top-10 right-20 text-yellow-400 animate-pulse" size={40} />
        <div className="absolute bottom-20 right-40 w-32 h-32 bg-blue-500 rounded-full blur-[100px] animate-float"></div>
      </div>

      {/* Content */}
      {/* Content Removed as per user request to hide text overlay */}
      {/* <div className="relative z-10 px-3 md:px-8 max-w-lg"> ... </div> */}
    </div>
  );
};

const InviteCard = () => (
  // Min size reduced for mobile
  <div className="glass-card h-full rounded-2xl md:rounded-3xl p-3 md:p-6 relative overflow-hidden flex flex-col justify-between group border border-white/10 min-h-[160px]">
    <div className="absolute top-0 right-0 p-2 md:p-4 opacity-50">
      <Users size={60} className="text-white/5" />
    </div>

    <div>
      <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
        <Users className="text-blue-400 w-4 h-4 md:w-6 md:h-6" />
        <h3 className="text-xs md:text-xl font-bold text-white">ชวนเพื่อน</h3>
      </div>
      <p className="text-slate-400 text-[10px] md:text-sm">คอมมิชชั่น 0.8%</p>
    </div>

    <div className="bg-[#0f172a]/50 p-2 md:p-4 rounded-lg md:rounded-xl border border-white/5 mt-2 md:mt-4">
      <div className="flex items-center justify-between bg-black/30 rounded md:rounded-lg px-2 py-1 md:px-3 md:py-2 border border-white/5">
        <span className="text-[8px] md:text-xs text-yellow-500 font-mono truncate">goldenbet...</span>
        <Gift size={12} className="text-yellow-500 cursor-pointer md:w-4 md:h-4" />
      </div>
    </div>
  </div>
);

// --- PREMIUM GAME CARD (Fixes the "dry" look) ---
// --- PREMIUM GAME CARD ---
const GameCard = ({ title, provider, image, color, hot, isNew, type, onPlay }: any) => {
  const hasImage = image && image !== "";

  const handleClick = () => {
    console.log('🎮 GameCard clicked:', { title, provider });
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
            {/* Premium Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            {type === 'slot'
              ? <Gamepad2 size={48} className="text-white/20 group-hover:text-white/60 transition-colors duration-500" />
              : <Dices size={48} className="text-white/20 group-hover:text-white/60 transition-colors duration-500" />
            }
          </div>
        )}

        {/* Hover Action Overlay - pointer-events-none when hidden */}
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
        {!hot && isNew && (
          <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-500 to-transparent pl-4 pr-1 py-1">
            <div className="flex items-center gap-1 text-white text-[10px] font-black uppercase italic pr-1">
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

const Sidebar = ({ title, items, active, setActive }: any) => (
  <div className="glass-card rounded-2xl overflow-hidden sticky top-36">
    <div className="p-4 border-b border-white/10 bg-white/5">
      <h3 className="text-base font-black text-white border-l-4 border-yellow-500 pl-3 uppercase italic tracking-wider">{title}</h3>
    </div>
    <div className="p-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
      {/* 2 Column Grid Layout */}
      <div className="grid grid-cols-2 gap-2">
        {items.map((item: any, idx: number) => {
          const name = typeof item === 'object' ? item.name : item;
          const logo = typeof item === 'object' ? item.logo : null;
          const isActive = active === name;
          const isLobby = typeof item === 'object' && item.isLobbyMode;

          return (
            <button
              key={idx}
              onClick={() => setActive && setActive(name)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-end transition-all relative overflow-hidden group
              ${isActive
                  ? 'ring-2 ring-blue-400 scale-[1.02] shadow-lg'
                  : 'hover:ring-2 hover:ring-white/30'
                }`}
            >
              {/* Full Background Logo */}
              {logo ? (
                <div className="absolute inset-0">
                  <img src={logo} alt={name} className="w-full h-full object-cover" />
                  {/* Gradient Overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                </div>
              ) : (
                <div className={`absolute inset-0 flex items-center justify-center ${isActive ? 'bg-gradient-to-br from-blue-600 to-blue-800' : 'bg-white/5'}`}>
                  <Gamepad2 size={40} className={`${isActive ? 'text-white' : 'text-slate-500'}`} />
                </div>
              )}

              {/* Lobby Badge */}
              {isLobby && (
                <div className="absolute top-1 right-1 bg-yellow-500/90 text-[8px] font-bold text-black px-1.5 py-0.5 rounded z-10">
                  LOBBY
                </div>
              )}

              {/* Provider Name - Bottom */}
              <div className="relative z-10 w-full p-2 text-center">
                <span className={`text-[10px] font-bold text-white drop-shadow-lg line-clamp-1`}>
                  {name}
                </span>
              </div>

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-green-400 animate-pulse z-10"></div>
              )}

              {/* Hover Effect */}
              {!isActive && (
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
              )}
            </button>
          );
        })}
      </div>
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
            <div className="text-3xl md:text-6xl font-black font-mono text-gradient-gold tracking-tighter tabular-nums drop-shadow-lg">
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

const TopBanner = ({ banners }: { banners: any[] }) => {
  const [current, setCurrent] = useState(0);

  // Filter only TOP banners (or all if no position defined, assuming passed banners are already filtered or we filter here)
  // The parent likely passes all banners, so let's filter just in case, or use as is if strictly passed.
  // Based on usage: <TopBanner banners={banners} /> in HomeContent, likely raw list.
  // But strictly, we should safe check.
  const displayBanners = banners?.length > 0 ? banners.filter(b => !b.position || b.position === 'TOP') : [];

  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % displayBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [displayBanners.length]);

  if (displayBanners.length === 0) return null;

  return (
    <div className="w-full relative rounded-xl md:rounded-3xl overflow-hidden mb-4 md:mb-6 mt-4 md:mt-0 group border border-white/10 shadow-2xl">
      {/* Aspect Ratio 1200/400 = 3/1 */}
      <div className="aspect-[3/1] w-full relative">
        <div
          className="flex transition-transform duration-700 ease-out h-full"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {displayBanners.map((banner, idx) => (
            <div key={idx} className="min-w-full h-full relative">
              <img
                src={banner.image || "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&h=400&auto=format&fit=crop"}
                alt={banner.title || "Main Banner"}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent"></div>
            </div>
          ))}
        </div>

        {/* Navigation Dots */}
        {displayBanners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {displayBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all ${current === idx ? "bg-yellow-400 w-4 md:w-6" : "bg-white/50 hover:bg-white"
                  }`}
              />
            ))}
          </div>
        )}

        {/* Arrays (Desktop Only) */}
        {displayBanners.length > 1 && (
          <>
            <button
              onClick={() => setCurrent((curr) => (curr === 0 ? displayBanners.length - 1 : curr - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"
            >
              <ChevronRight className="rotate-180" size={24} />
            </button>
            <button
              onClick={() => setCurrent((curr) => (curr + 1) % displayBanners.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const HomeContent = ({ games, banners, providers, onPlay }: any) => {
  // Helper to get providers names
  const providerNames = providers.map((p: any) => p.name);

  // Fallback Mock Games if API fails or empty (initially)
  const MOCK_GAMES = [
    { title: "Treasures of Aztec", provider: "PG Soft", color: "bg-gradient-to-br from-green-800 to-green-950", hot: true, type: 'slot' },
    { title: "Roma Legacy", provider: "Joker", color: "bg-gradient-to-br from-yellow-700 to-yellow-900", hot: true, type: 'slot' },
    { title: "Sweet Bonanza", provider: "Pragmatic", color: "bg-gradient-to-br from-blue-600 to-blue-900", hot: true, type: 'slot' },
    { title: "Lucky Neko", provider: "PG Soft", color: "bg-gradient-to-br from-yellow-600 to-yellow-800", hot: false, type: 'slot' },
  ];

  const displayGames = games && games.length > 0 ? games.map((g: any, i: number) => ({
    title: g.name,
    provider: g.provider?.name || "Game",
    image: g.thumbnail || g.image || "", // Use thumbnail from DB
    color: MOCK_GAMES[i % MOCK_GAMES.length].color, // Keep styling logic
    hot: g.isHot,
    isNew: g.isNew,
    slug: g.slug,
    providerCode: g.provider?.slug,
    type: 'slot' // Default to slot for home mix
  })) : MOCK_GAMES;

  return (
    <div className="animate-fade-in space-y-6 md:space-y-8">
      {/* Top Main Banner - Dynamic from API */}
      <TopBanner banners={banners} />

      {/* Secondary Banner & Activity Board Section */}
      {(() => {
        const sideBanners = banners ? banners.filter((b: any) => b.position === 'SIDE') : [];
        const hasSideBanners = sideBanners.length > 0;

        return (
          <div className={`grid grid-cols-1 ${hasSideBanners ? 'md:grid-cols-4' : 'md:grid-cols-1'} gap-3 md:gap-4 mb-8 md:mb-12 animate-fade-in`}>

            {/* Left: Secondary Banners (Only show if exists) */}
            {hasSideBanners && (
              <div className="md:col-span-3 h-full min-h-[160px]">
                {(() => {
                  const count = sideBanners.length;
                  const gridCols = count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2' : 'grid-cols-3';

                  return (
                    <div className={`grid ${gridCols} gap-2 h-full`}>
                      {/* Show up to 3 banners, filling height */}
                      {sideBanners.slice(0, 3).map((banner: any, idx: number) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden group border border-white/10 shadow-lg hover:shadow-yellow-500/20 transition-all cursor-pointer md:h-full md:min-h-[120px]" onClick={() => banner.link && window.open(banner.link, '_blank')}>
                          <img src={banner.image} alt={banner.title} className="w-full h-auto md:absolute md:inset-0 md:h-full md:object-cover transform group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-blue-900/10 group-hover:bg-transparent transition-colors"></div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Right: Activity Buttons Grid (Adapts based on banner existence) */}
            <div className={`${hasSideBanners ? 'md:col-span-1 grid-cols-2' : 'w-full grid-cols-2 md:grid-cols-4'} grid gap-2 md:gap-3 h-full`}>

              {/* 1. แนะนำเพื่อน */}
              <button onClick={() => window.location.href = '/commission'} className={`h-20 ${hasSideBanners ? 'md:h-auto md:aspect-square' : 'md:h-28'} flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-900/40 border border-blue-500/30 hover:border-blue-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all group`}>
                <Users className="text-blue-400 mb-1 group-hover:scale-110 transition-transform" size={24} />
                <span className="text-[10px] md:text-xs font-bold text-blue-100 group-hover:text-white">แนะนำเพื่อน</span>
              </button>

              {/* 2. ฝากต่อเนื่อง */}
              <button onClick={() => window.location.href = '/streak'} className={`h-20 ${hasSideBanners ? 'md:h-auto md:aspect-square' : 'md:h-28'} flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-br from-green-600/20 to-green-900/40 border border-green-500/30 hover:border-green-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all group`}>
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📅</span>
                <span className="text-[10px] md:text-xs font-bold text-green-100 group-hover:text-white">ฝากต่อเนื่อง</span>
              </button>

              {/* 3. คืนยอดเสีย */}
              <button onClick={() => window.location.href = '/cashback'} className={`h-20 ${hasSideBanners ? 'md:h-auto md:aspect-square' : 'md:h-28'} flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-br from-red-600/20 to-red-900/40 border border-red-500/30 hover:border-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all group`}>
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">💸</span>
                <span className="text-[10px] md:text-xs font-bold text-red-100 group-hover:text-white">คืนยอดเสีย</span>
              </button>

              {/* 4. RANK */}
              <button onClick={() => window.location.href = '/rank'} className={`h-20 ${hasSideBanners ? 'md:h-auto md:aspect-square' : 'md:h-28'} flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-br from-yellow-600/20 to-yellow-900/40 border border-yellow-500/30 hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all group`}>
                <Trophy className="text-yellow-400 mb-1 group-hover:scale-110 transition-transform" size={24} />
                <span className="text-[10px] md:text-xs font-bold text-yellow-100 group-hover:text-white">RANK</span>
              </button>
            </div>

          </div>
        );
      })()}

      {/* Mobile: Category Game Sections */}
      <div className="md:hidden space-y-6 animate-fade-in-up">
        {/* สล็อต ยอดนิยม */}
        {(() => {
          const slotGames = games.filter((g: any) => {
            const catSlug = g.provider?.category?.slug || g.category?.slug || '';
            return catSlug === 'slots' || catSlug === 'slot' || g.type === 'SLOT';
          });
          // If no category-filtered games, show first 10
          const displaySlots = slotGames.length > 0 ? slotGames.slice(0, 10) : displayGames.slice(0, 10);
          return displaySlots.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-3 bg-[#1e293b] p-2.5 rounded-lg border border-slate-700">
                <Gamepad2 className="text-yellow-400" size={18} />
                <h2 className="text-sm font-bold text-white">สล็อต ยอดนิยม</h2>
              </div>
              <div className="grid grid-cols-5 gap-1.5 stagger-children">
                {displaySlots.map((game: any, i: number) => (
                  <div key={i} onClick={() => onPlay && onPlay(game)} className="group relative rounded-lg overflow-hidden cursor-pointer shadow-md">
                    <div className="aspect-[4/5] w-full relative bg-slate-800">
                      {(game.thumbnail || game.image) ? (
                        <img src={game.thumbnail || game.image} alt={game.name || game.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                          <Gamepad2 size={20} className="text-slate-600" />
                        </div>
                      )}
                    </div>
                    <div className="bg-[#1e293b] p-1 text-center">
                      <span className="text-[8px] text-slate-300 line-clamp-1">{game.name || game.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        {/* คาสิโน ยอดนิยม */}
        {(() => {
          const casinoGames = games.filter((g: any) => {
            const catSlug = g.provider?.category?.slug || g.category?.slug || '';
            return catSlug === 'casino' || catSlug === 'live-casino' || g.type === 'CASINO';
          });
          return casinoGames.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-3 bg-gradient-to-r from-green-900/40 to-green-800/20 p-2.5 rounded-lg border border-green-700/40">
                <Dices className="text-green-400" size={18} />
                <h2 className="text-sm font-bold text-white">คาสิโน ยอดนิยม</h2>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {casinoGames.slice(0, 5).map((game: any, i: number) => (
                  <div key={i} onClick={() => onPlay && onPlay(game)} className="group relative rounded-lg overflow-hidden cursor-pointer shadow-md">
                    <div className="aspect-[4/5] w-full relative bg-slate-800">
                      {(game.thumbnail || game.image) ? (
                        <img src={game.thumbnail || game.image} alt={game.name || game.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-900 to-slate-800">
                          <Dices size={20} className="text-green-600" />
                        </div>
                      )}
                    </div>
                    <div className="bg-[#1e293b] p-1 text-center">
                      <span className="text-[8px] text-slate-300 line-clamp-1">{game.name || game.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}
      </div>

      {/* Desktop: Original Hot Games Section */}
      <div className="hidden md:block">
        <JackpotBar />
      </div>

      <div className="relative hidden md:block">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-white italic tracking-tighter flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
              <Flame className="text-orange-500 fill-orange-500 animate-pulse" />
            </div>
            เกมยอดฮิต <span className="text-sm font-normal text-slate-500 not-italic tracking-normal self-end mb-1 custom-font">ยอดนิยมวันนี้</span>
          </h2>
          <button className="text-sm font-bold text-yellow-500 hover:text-white transition-colors flex items-center gap-1 group">
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {displayGames.slice(0, 10).map((game: any, i: number) => (
            <GameCard key={i} {...game} onPlay={() => onPlay && onPlay(game)} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 hidden md:block">
          {/* Display Providers with Logos */}
          <Sidebar title="ค่ายเกมชั้นนำ" items={providers.slice(0, 10)} active={null} />
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

const SlotsContent = ({ games, category, providers: globalProviders, onPlay }: any) => {
  // Optimize: Use category.providers directly if available (already filtered by backend relations)
  const displayProviders = (category?.providers && category.providers.length > 0)
    ? category.providers
    : (globalProviders || []);

  const firstProviderName = displayProviders.length > 0 ? displayProviders[0].name : "PG Soft";
  const [activeProvider, setActiveProvider] = useState(firstProviderName);
  const [isLoading, setIsLoading] = useState(false);

  // Update active provider if the list changes and current one isn't in it?
  // For simplicity, just rely on initial state or user selection. 
  // But if 'activeProvider' is invalid, we should ideally switch. 
  // React state doesn't auto-update on re-render of defaults.

  const handleProviderChange = (providerName: string) => {
    setIsLoading(true);
    setActiveProvider(providerName);
    setTimeout(() => setIsLoading(false), 500);
  };

  // Provider Names/Objects List
  // Optimization: use displayProviders which already contains full objects
  const providerList = displayProviders;

  // Filter Games by Active Provider
  const filteredGames = games.filter((g: any) =>
    (g.provider?.name === activeProvider || !activeProvider) &&
    (g.provider?.categoryId === category?.id)
  );

  // Check if current provider is lobby mode
  const currentProvider = providerList.find((p: any) => p.name === activeProvider);
  const isLobbyProvider = currentProvider?.isLobbyMode === true;

  // Handle lobby entrance
  const handleEnterLobby = () => {
    if (onPlay && currentProvider) {
      onPlay({
        slug: `${currentProvider.slug}-lobby`,
        name: `${currentProvider.name} Lobby`,
        provider: currentProvider,
        isLobby: true
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
      <div className="md:col-span-1 hidden md:block">
        <Sidebar title={`ค่าย${category?.name || 'สล็อต'}`} items={providerList} active={activeProvider} setActive={handleProviderChange} />
      </div>
      {/* Mobile Provider Selector - Horizontal Scroll */}
      <div className="md:hidden col-span-1 -mx-4 px-4 overflow-x-auto pb-3">
        <div className="flex gap-2 min-w-max">
          {providerList.length > 0 ? providerList.map((p: any) => (
            <button
              key={p.name}
              onClick={() => handleProviderChange(p.name)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all
                ${activeProvider === p.name
                  ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg ring-2 ring-blue-400'
                  : 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-blue-500/50'
                }`}
            >
              {/* Provider Logo */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden
                ${activeProvider === p.name ? 'bg-white/20' : 'bg-white/10'}`}>
                {p.logo ? (
                  <img src={p.logo} alt={p.name} className="w-6 h-6 object-contain" />
                ) : (
                  <Gamepad2 size={16} className="text-slate-400" />
                )}
              </div>
              <span className="text-sm font-bold whitespace-nowrap">{p.name}</span>
              {p.isLobbyMode && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">🎮</span>}
            </button>
          )) : (
            <div className="text-slate-500 text-sm py-2">ไม่มีค่ายเกม</div>
          )}
        </div>
      </div>

      <div className="md:col-span-3">
        <div className="flex flex-row items-center justify-between mb-3 md:mb-6 bg-[#1e293b] p-2 md:p-4 rounded-lg md:rounded-xl border border-slate-700 gap-2 md:gap-4 shadow-md">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm md:text-xl font-bold text-white flex items-center gap-1 md:gap-2 font-sans">
              <Gamepad2 className="text-yellow-400 w-4 h-4 md:w-6 md:h-6 flex-shrink-0" />
              <span className="truncate">{activeProvider}</span>
              {isLobbyProvider && <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px] md:text-xs flex-shrink-0">LOBBY</span>}
            </h2>
            <p className="text-[10px] md:text-xs text-slate-400 mt-0.5 md:mt-1 font-sans">
              {isLobbyProvider ? 'กดเพื่อเข้าห้องเกม' : `${filteredGames.length > 0 ? filteredGames.length : 0} เกม`}
            </p>
          </div>
          {!isLobbyProvider && (
            <div className="hidden md:flex gap-2">
              <button className="px-4 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700 font-sans">ล่าสุด</button>
              <button className="px-4 py-1.5 text-xs bg-yellow-500 text-slate-900 rounded-lg font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-colors font-sans">ยอดนิยม</button>
            </div>
          )}
        </div>

        {isLobbyProvider ? (
          // Show single lobby card for lobby providers
          <div className="flex justify-center py-12">
            <div
              onClick={handleEnterLobby}
              className="cursor-pointer group relative rounded-2xl overflow-hidden shadow-2xl hover:shadow-[0_0_40px_rgba(250,204,21,0.5)] transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-yellow-500/50 w-full max-w-md"
            >
              <div className="p-10 flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Gamepad2 size={48} className="text-yellow-400" />
                </div>
                <h3 className="text-2xl text-white font-bold text-center mb-2">{activeProvider}</h3>
                <p className="text-slate-400 text-sm mb-4">เลือกเกมจากห้อง Lobby</p>
                <span className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-full text-sm font-bold shadow-lg">
                  🎮 เข้าสู่ LOBBY
                </span>
              </div>
            </div>
          </div>
        ) : (
          // Show individual games
          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 min-h-[300px]">
            {isLoading ? (
              <div className="col-span-full flex flex-col items-center justify-center h-64 text-slate-400">
                <Loader2 size={40} className="animate-spin text-yellow-500 mb-2" />
                <span className="animate-pulse text-xs">กำลังโหลดเกม...</span>
              </div>
            ) : filteredGames.length > 0 ? filteredGames.map((game: any, i: number) => (
              <GameCard
                key={i}
                title={game.name}
                provider={activeProvider}
                image={game.thumbnail || game.image}
                color={`bg-gradient-to-br from-slate-700 to-slate-800`}
                hot={game.isHot}
                isNew={game.isNew}
                type="slot"
                onPlay={() => onPlay && onPlay(game)}
              />
            )) : (
              <div className="col-span-full py-20 text-center text-slate-500 bg-white/5 rounded-xl border border-white/5">
                <Gamepad2 size={48} className="mx-auto mb-4 opacity-20" />
                <p>ไม่พบเกมในหมวดหมู่นี้</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const CasinoContent = ({ games, category, providers: globalProviders, onPlay }: any) => {
  // Optimize: Use category.providers directly if available
  const displayProviders = (category?.providers && category.providers.length > 0)
    ? category.providers
    : (globalProviders || []);
  const firstProviderName = displayProviders.length > 0 ? displayProviders[0].name : "SA Gaming";

  // Ensure activeProvider is initialized to a valid one
  const [activeProvider, setActiveProvider] = useState(firstProviderName);
  const [isLoading, setIsLoading] = useState(false);

  const handleProviderChange = (providerName: string) => {
    setIsLoading(true);
    setActiveProvider(providerName);
    setTimeout(() => setIsLoading(false), 500);
  };

  // If local list updates, we might want to reset activeProvider, but for now relies on initial render.

  const providerList = displayProviders;

  // Filter Casino Games
  const filteredGames = games.filter((g: any) =>
    (g.provider?.name === activeProvider || !activeProvider) &&
    (g.provider?.categoryId === category?.id)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
      <div className="md:col-span-1 hidden md:block">
        <Sidebar title={`ค่าย${category?.name || 'คาสิโน'}`} items={providerList} active={activeProvider} setActive={handleProviderChange} />
      </div>
      <div className="md:hidden col-span-1">
        <select
          className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-3 outline-none focus:border-yellow-500 font-sans"
          value={activeProvider}
          onChange={(e) => handleProviderChange(e.target.value)}
        >
          {providerList.length > 0 ? providerList.map((p: any) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          )) : <option>ไม่มีค่ายเกม</option>}
        </select>
      </div>

      <div className="md:col-span-3">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 bg-[#1e293b] p-4 rounded-xl border border-slate-700 gap-4 shadow-md">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 font-sans">
              <Dices className="text-yellow-400" />
              เกม: <span className="text-green-400">{activeProvider}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-sans">เกมทั้งหมด {filteredGames.length > 0 ? filteredGames.length : 0} เกม</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700 font-sans">ล่าสุด</button>
            <button className="px-4 py-1.5 text-xs bg-yellow-500 text-slate-900 rounded-lg font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-colors font-sans">ยอดนิยม</button>
          </div>
        </div>

        {/* Hero Banner for Casino */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 rounded-xl p-6 mb-6 border border-blue-800/50 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-20 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2 font-sans">
              {activeProvider} Live <span className="px-2 py-0.5 bg-red-600 text-[10px] rounded text-white animate-pulse shadow-lg shadow-red-600/40 font-sans">LIVE</span>
            </h2>
            <p className="text-blue-200 text-sm max-w-lg font-light font-sans">สัมผัสประสบการณ์คาสิโนสดจาก {activeProvider} ส่งตรงจากต่างประเทศ</p>
          </div>
        </div>

        {/* Display Casino Tables/Games from API */}
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 min-h-[300px]">
          {isLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 size={40} className="animate-spin text-green-500 mb-2" />
              <span className="animate-pulse text-xs">กำลังเชื่อมต่อสัญญาณสด...</span>
            </div>
          ) : filteredGames.length > 0 ? filteredGames.map((game: any, i: number) => (
            <GameCard
              key={i}
              title={game.name}
              provider={activeProvider}
              image={game.thumbnail || game.image}
              color={`bg-gradient-to-br from-slate-700 to-slate-800`}
              hot={game.isHot}
              isNew={game.isNew}
              type="casino"
              onPlay={() => onPlay && onPlay(game)}
            />
          )) : (
            <div className="col-span-full py-20 text-center text-slate-500 bg-white/5 rounded-xl border border-white/5">
              <Dices size={48} className="mx-auto mb-4 opacity-20" />
              <p>ไม่พบเกมในหมวดหมู่นี้</p>
              <p className="text-xs mt-2 text-slate-600">โปรดลองเลือกค่ายอื่น</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- ARCADE CONTENT (For Lobby-based providers like FUNKY) ---
const ArcadeContent = ({ category, providers: globalProviders, onPlay }: any) => {
  // Get providers in this category (arcade)
  const arcadeProviders = (category?.providers && category.providers.length > 0)
    ? category.providers
    : (globalProviders || []).filter((p: any) => p.categoryId === category?.id);

  const handleEnterLobby = (provider: any) => {
    // Send a "lobby" game request - backend will handle opening lobby URL
    if (onPlay) {
      onPlay({
        slug: `${provider.slug}-lobby`,
        name: `${provider.name} Lobby`,
        provider: provider,
        isLobby: true
      });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 bg-[#1e293b] p-4 rounded-xl border border-slate-700 gap-4 shadow-md">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 font-sans">
            <Gamepad2 className="text-yellow-400" />
            {category?.name || 'Arcade'} - เกมห้อง Lobby
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">กดเลือกค่ายเพื่อเข้าสู่ห้องเกม</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {arcadeProviders.length > 0 ? arcadeProviders.map((provider: any) => (
          <div
            key={provider.id}
            onClick={() => handleEnterLobby(provider)}
            className="group relative rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-[0_0_25px_rgba(250,204,21,0.4)] transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-yellow-500/50"
          >
            <div className="p-6 flex flex-col items-center justify-center min-h-[180px]">
              {provider.logo ? (
                <img src={provider.logo} alt={provider.name} className="w-16 h-16 object-contain mb-3" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-3">
                  <Gamepad2 size={32} className="text-yellow-400" />
                </div>
              )}
              <h3 className="text-white font-bold text-center mb-2">{provider.name}</h3>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold">
                🎮 เข้า LOBBY
              </span>
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-yellow-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <Play fill="white" className="text-white" size={48} />
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center text-slate-500 bg-white/5 rounded-xl border border-white/5">
            <Gamepad2 size={48} className="mx-auto mb-4 opacity-20" />
            <p>ยังไม่มีค่ายเกมในหมวด Arcade</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MOBILE GAME BROWSER (Full-screen mobile game page) ---
const MobileGameBrowser = ({ games, categories, providers, onPlay, onClose }: any) => {
  const [activeCat, setActiveCat] = useState<string>(categories?.[0]?.slug || 'slots');
  const [activeProvider, setActiveProvider] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Get providers for active category
  const activeCatObj = categories?.find((c: any) => c.slug === activeCat || c.id?.toString() === activeCat);
  const catProviders = activeCatObj?.providers && activeCatObj.providers.length > 0
    ? activeCatObj.providers
    : providers.filter((p: any) => p.categoryId === activeCatObj?.id);

  // Auto-select first provider when category changes
  useEffect(() => {
    if (catProviders.length > 0 && !catProviders.find((p: any) => p.name === activeProvider)) {
      setActiveProvider(catProviders[0].name);
    }
  }, [activeCat, catProviders.length]);

  const handleProviderChange = (providerName: string) => {
    setIsLoading(true);
    setActiveProvider(providerName);
    setTimeout(() => setIsLoading(false), 500);
  };

  // Filter games
  const filteredGames = games.filter((g: any) => {
    const matchProvider = !activeProvider || g.provider?.name === activeProvider;
    const matchCategory = !activeCatObj || g.provider?.categoryId === activeCatObj?.id;
    return matchProvider && matchCategory;
  });

  // Check if provider is lobby mode
  const currentProvider = catProviders.find((p: any) => p.name === activeProvider);
  const isLobbyProvider = currentProvider?.isLobbyMode === true;

  return (
    <div className="fixed inset-0 z-[99] bg-[#0b1120] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#0f172a] border-b border-slate-800">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Gamepad2 className="text-yellow-400" size={18} />
          เลือกเกม
        </h2>
        <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 px-3 py-2 bg-[#0f172a]/80 overflow-x-auto border-b border-slate-800/50">
        {(categories || []).map((cat: any) => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.slug || cat.id.toString())}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeCat === (cat.slug || cat.id.toString())
              ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-lg'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Provider Tabs */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto bg-[#0f172a]/50">
        {catProviders.map((p: any) => (
          <button
            key={p.id || p.name}
            onClick={() => handleProviderChange(p.name)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeProvider === p.name
              ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500'
              : 'bg-slate-800/60 text-slate-500 border border-slate-700/50'
              }`}
          >
            {p.logo && <img src={p.logo} alt={p.name} className="w-4 h-4 rounded object-contain" />}
            <span className="whitespace-nowrap">{p.name}</span>
            {p.isLobbyMode && <span className="text-[8px] text-yellow-400">🎮</span>}
          </button>
        ))}
      </div>

      {/* Game Grid */}
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Loader2 size={40} className="animate-spin text-yellow-500 mb-2" />
            <span className="animate-pulse text-xs">กำลังโหลดเกม...</span>
          </div>
        ) : isLobbyProvider ? (
          <div className="flex justify-center py-12">
            <div
              onClick={() => {
                if (onPlay && currentProvider) {
                  onPlay({
                    slug: `${currentProvider.slug}-lobby`,
                    name: `${currentProvider.name} Lobby`,
                    provider: currentProvider,
                    isLobby: true
                  });
                }
              }}
              className="cursor-pointer rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-yellow-500/30 p-8 flex flex-col items-center w-full max-w-xs"
            >
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-3">
                <Gamepad2 size={32} className="text-yellow-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-1">{activeProvider}</h3>
              <span className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-full text-xs font-bold">
                🎮 เข้าสู่ LOBBY
              </span>
            </div>
          </div>
        ) : filteredGames.length > 0 ? (
          <div className="grid grid-cols-4 gap-1.5">
            {filteredGames.map((game: any, i: number) => (
              <div key={i} onClick={() => onPlay && onPlay(game)} className="rounded-lg overflow-hidden cursor-pointer shadow-md active:scale-95 transition-transform">
                <div className="aspect-[4/5] w-full relative bg-slate-800">
                  {(game.thumbnail || game.image) ? (
                    <img src={game.thumbnail || game.image} alt={game.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                      <Gamepad2 size={20} className="text-slate-600" />
                    </div>
                  )}
                </div>
                <div className="bg-[#1e293b] p-1 text-center">
                  <span className="text-[8px] text-slate-300 line-clamp-1">{game.name}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Gamepad2 size={48} className="opacity-20 mb-3" />
            <p className="text-sm">ไม่พบเกมในหมวดนี้</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 3. MAIN LOGIC & MODALS ---

const Footer = ({ settings }: any) => (
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
              {settings?.siteName || "GOLDENBET"}
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
        <p>&copy; 2026 {settings?.siteName || "GOLDENBET"}. สงวนลิขสิทธิ์.</p>
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
  const toast = useToast();

  // Read initial tab from URL query param
  const tabFromUrl = searchParams.get('tab') || 'home';
  const [activeTab, setActiveTabState] = useState(tabFromUrl);

  // Sync activeTab with URL
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    // Update URL without full page reload
    const url = tab === 'home' ? '/' : `/?tab=${tab}`;
    window.history.pushState({}, '', url);
  };

  // Listen for browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') || 'home';
      setActiveTabState(tab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showMobileGames, setShowMobileGames] = useState(false);
  const [loadingGame, setLoadingGame] = useState(false);

  // Auth & Data State
  // Auth & Data State
  const [user, setUser] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Forms
  const [loginForm, setLoginForm] = useState({ phone: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    fullName: "", phone: "", bankName: "KBANK", bankAccount: "", password: "", confirmPassword: "", lineId: "", referrer: "",
  });

  // Fetch Games & Public Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gameRes, bannerRes, providerRes, catRes, settingRes] = await Promise.all([
          axios.get(`${API_URL}/public/games`),
          axios.get(`${API_URL}/public/banners`),
          axios.get(`${API_URL}/public/providers`),
          axios.get(`${API_URL}/public/categories`),
          axios.get(`${API_URL}/public/settings`)
        ]);

        if (Array.isArray(gameRes.data)) setGames(gameRes.data);
        if (Array.isArray(bannerRes.data)) setBanners(bannerRes.data);
        if (Array.isArray(providerRes.data)) setProviders(providerRes.data);
        if (Array.isArray(catRes.data)) setCategories(catRes.data);
        if (settingRes.data && settingRes.data.settings) setSettings(settingRes.data.settings);
      } catch (err) { console.error("Failed to fetch public data", err); }
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
      // Map 'referrer' from state to 'referrerCode' for backend
      const payload = { ...registerForm, referrerCode: registerForm.referrer };
      delete (payload as any).referrer; // Clean up excess field

      const res = await axios.post(`${API_URL}/auth/register`, payload);
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

  const handlePlayGame = async (game?: any) => {
    if (!user) {
      setShowLogin(true);
      return;
    }

    if (!game) {
      console.error('No game data provided');
      return;
    }

    // Show loading toast
    const loadingId = toast.loading('กำลังเปิดเกม...', game.name || 'โปรดรอสักครู่');

    try {
      const payload = {
        providerCode: game.providerCode || game.provider?.slug,
        gameCode: game.slug || game.code
      };

      console.log("Launching game with payload:", payload);

      const res = await axios.post(`${API_URL}/games/launch`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Remove loading toast
      toast.removeToast(loadingId);

      if (res.data.success && res.data.data.url) {
        toast.success('เปิดเกมสำเร็จ!', 'กำลังเปิดหน้าต่างเกม...');
        window.open(res.data.data.url, '_blank');
      } else {
        toast.error('เกิดข้อผิดพลาด', res.data.message || 'ไม่สามารถเปิดเกมได้');
      }
    } catch (err: any) {
      toast.removeToast(loadingId);
      console.error("Launch error:", err);
      const errorMsg = err.response?.data?.message || 'ไม่สามารถเชื่อมต่อระบบเกมได้';
      toast.error('เกิดข้อผิดพลาด', errorMsg);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeContent games={games} banners={banners} providers={providers} onPlay={handlePlayGame} />;
      case 'slots': return <SlotsContent games={games} providers={providers} onPlay={handlePlayGame} />;
      case 'casino': return <CasinoContent games={games} providers={providers} onPlay={handlePlayGame} />;
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
      <Header onLogin={() => setShowLogin(true)} onRegister={() => setShowRegister(true)} user={user} onLogout={handleLogout} settings={settings} />

      <NavBar activeTab={activeTab} setActiveTab={setActiveTab} categories={categories} />

      <main className="w-full px-2 md:px-4 py-4 md:py-8 max-w-7xl mx-auto">
        {activeTab === 'home' && <HomeContent games={games} banners={banners} providers={providers} onPlay={handlePlayGame} />}

        {/* Render Dynamic Categories */}
        {categories.map(cat => {
          if (activeTab === (cat.slug || cat.id.toString()) && (cat.slug === 'slots' || cat.slug === 'slot')) {
            return <SlotsContent key={cat.id} games={games} category={cat} providers={providers} onPlay={handlePlayGame} />;
          }
          if (activeTab === (cat.slug || cat.id.toString()) && (cat.slug === 'casino' || cat.slug === 'live-casino')) {
            return <CasinoContent key={cat.id} games={games} category={cat} providers={providers} onPlay={handlePlayGame} />;
          }
          if (activeTab === (cat.slug || cat.id.toString()) && cat.slug === 'fishing') {
            return <SlotsContent key={cat.id} games={games} category={cat} providers={providers} onPlay={handlePlayGame} />;
          }
          if (activeTab === (cat.slug || cat.id.toString()) && cat.slug === 'table') {
            return <SlotsContent key={cat.id} games={games} category={cat} providers={providers} onPlay={handlePlayGame} />;
          }
          if (activeTab === (cat.slug || cat.id.toString()) && cat.slug === 'arcade') {
            return <ArcadeContent key={cat.id} category={cat} providers={providers} onPlay={handlePlayGame} />;
          }
          // Default generic category view can be added here if needed
          return null;
        })}

        {/* Fallback for hardcoded tabs if API fails or specific slugs match */}
        {activeTab === 'slots' && !categories.some(c => c.slug === 'slots') && <SlotsContent games={games} providers={providers} onPlay={handlePlayGame} />}
        {activeTab === 'casino' && !categories.some(c => c.slug === 'casino') && <CasinoContent games={games} providers={providers} onPlay={handlePlayGame} />}

        {/* Fallback for New Tabs (Deposit, Profile, etc.) */}
        {!['home', 'slots', 'casino'].includes(activeTab) && !categories.some(c => c.slug === activeTab) && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 min-h-[50vh] animate-fade-in">
            <div className="relative">
              <Gamepad2 size={64} className="mb-4 opacity-10" />
              <div className="absolute -top-2 -right-2 bg-yellow-500 text-slate-900 text-[10px] px-2 py-0.5 rounded font-bold">SOON</div>
            </div>
            <h2 className="text-xl font-bold text-slate-400 font-sans">Coming Soon</h2>
            <p className="mt-2 text-xs text-slate-600 font-sans">{activeTab} page is under development.</p>
          </div>
        )}
      </main>

      <Footer settings={settings} />

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-800 px-2 py-1 z-50 pb-safe">
        <div className="grid grid-cols-5 gap-1 items-end h-[60px]">

          {/* 1. Home */}
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center justify-center h-full rounded-lg transition-colors ${activeTab === 'home' ? 'text-yellow-400' : 'text-slate-500 hover:text-white'}`}>
            <Home size={20} className={activeTab === 'home' ? 'fill-current' : ''} />
            <span className="text-[10px] mt-1 font-medium font-sans">หน้าหลัก</span>
          </button>

          {/* 2. Deposit/Withdraw — Navigate to actual /deposit page */}
          <button onClick={() => !user ? setShowLogin(true) : router.push('/deposit')} className={`flex flex-col items-center justify-center h-full rounded-lg transition-colors text-slate-500 hover:text-white`}>
            <Wallet size={20} />
            <span className="text-[10px] mt-1 font-medium font-sans">ฝากถอน</span>
          </button>

          {/* 3. Play Game (Center Prominent) */}
          <div className="relative flex justify-center h-full items-center">
            <button
              onClick={() => {
                setLoadingGame(true);
                setTimeout(() => {
                  setShowMobileGames(true);
                  setLoadingGame(false);
                }, 800);
              }}
              disabled={loadingGame}
              className="absolute -top-5 w-14 h-14 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 border-4 border-[#0b1120] flex flex-col items-center justify-center text-black shadow-[0_0_15px_rgba(250,204,21,0.5)] transform active:scale-95 transition-transform hover:scale-105 hover:-translate-y-1 disabled:opacity-80 disabled:cursor-not-allowed"
            >
              {loadingGame ? (
                <Loader2 size={24} className="animate-spin text-black" />
              ) : (
                <Gamepad2 size={24} className="animate-pulse" />
              )}
              <span className="text-[8px] font-black mt-0.5">{loadingGame ? 'รอสักครู่' : 'เล่นเกม'}</span>
            </button>
          </div>

          {/* 4. Activities — Navigate to actual /activity page */}
          <button onClick={() => router.push('/activity')} className={`flex flex-col items-center justify-center h-full rounded-lg transition-colors text-slate-500 hover:text-white`}>
            <Gift size={20} />
            <span className="text-[10px] mt-1 font-medium font-sans">กิจกรรม</span>
          </button>

          {/* 5. Profile / Logout */}
          {user ? (
            <button onClick={handleLogout} className="flex flex-col items-center justify-center h-full rounded-lg transition-colors text-red-400 hover:text-red-300">
              <LogOut size={20} />
              <span className="text-[10px] mt-1 font-medium font-sans">ออก</span>
            </button>
          ) : (
            <button onClick={() => setShowLogin(true)} className="flex flex-col items-center justify-center h-full rounded-lg transition-colors text-slate-500 hover:text-white">
              <User size={20} />
              <span className="text-[10px] mt-1 font-medium font-sans">โปรไฟล์</span>
            </button>
          )}

        </div>
      </div>

      {/* LOGIN MODAL */}
      {
        showLogin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowLogin(false)}>
            <div className="glass-card w-full max-w-md p-8 rounded-2xl relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24} /></button>

              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-white italic tracking-tighter">เข้าสู่ระบบ</h2>
                <p className="text-slate-400 text-sm mt-2">กรอกเบอร์โทรศัพท์และรหัสผ่าน</p>
              </div>

              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-6 text-sm text-center font-bold">{error}</div>}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="text-slate-400 text-xs font-bold ml-1 mb-1 block">เบอร์โทรศัพท์</label>
                  <input type="tel" inputMode="numeric" pattern="[0-9]*" placeholder="0xxxxxxxxx" className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:outline-none transition-colors" value={loginForm.phone} onChange={e => setLoginForm({ ...loginForm, phone: e.target.value.replace(/[^0-9]/g, '') })} required />
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
        )
      }

      {/* REGISTER MODAL */}
      {
        showRegister && (
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
                    <BankSelectDropdown
                      value={registerForm.bankName}
                      onChange={(code) => setRegisterForm({ ...registerForm, bankName: code })}
                    />
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
            </div>
          </div>
        )
      }



      {/* Global Contact Button */}
      <button
        onClick={() => setShowContact(true)}
        style={{
          position: "fixed",
          bottom: "80px",
          right: "16px",
          width: "56px",
          height: "56px",
          borderRadius: "14px",
          background: "#21262D",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "2px",
          zIndex: 90
        }}
      >
        <span style={{ fontSize: "24px" }}>💬</span>
        <span style={{ fontSize: "9px", fontWeight: 600, color: "#8B949E" }}>ติดต่อ</span>
      </button>

      {/* Contact Drawer */}
      <ContactDrawer isOpen={showContact} onClose={() => setShowContact(false)} />

      {/* Mobile Game Browser */}
      {showMobileGames && (
        <MobileGameBrowser
          games={games}
          categories={categories}
          providers={providers}
          onPlay={(game: any) => { setShowMobileGames(false); handlePlayGame(game); }}
          onClose={() => setShowMobileGames(false)}
        />
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
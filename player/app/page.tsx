"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import {
  Gamepad2, Dices, Trophy, Gift, Flame, ChevronRight, Sparkles,
  Star, Users, User, Play
} from 'lucide-react';
import axios from "axios";
import ContactDrawer from "@/components/ContactDrawer";
import BottomNav from "@/components/BottomNav";
import { API_URL } from "@/lib/api";
import Header from "@/components/Header";
import GameCard from "@/components/GameCard";
import AuthModals from "@/components/AuthModals";
import { useGameLauncher } from "@/components/GameLauncher";

// --- Sidebar (Desktop only: Provider list for home) ---
const Sidebar = ({ title, items, active }: any) => (
  <div className="glass-card rounded-2xl overflow-hidden sticky top-36">
    <div className="p-4 border-b border-white/10 bg-white/5">
      <h3 className="text-base font-black text-white border-l-4 border-yellow-500 pl-3 uppercase italic tracking-wider">{title}</h3>
    </div>
    <div className="p-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
      <div className="grid grid-cols-2 gap-2">
        {items.map((item: any, idx: number) => {
          const name = typeof item === 'object' ? item.name : item;
          const logo = typeof item === 'object' ? item.logo : null;
          return (
            <div key={idx} className="aspect-square rounded-xl flex flex-col items-center justify-end relative overflow-hidden group hover:ring-2 hover:ring-white/30">
              {logo ? (
                <div className="absolute inset-0">
                  <img src={logo} alt={name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                  <Gamepad2 size={40} className="text-slate-500" />
                </div>
              )}
              <div className="relative z-10 w-full p-2 text-center">
                <span className="text-[10px] font-bold text-white drop-shadow-lg line-clamp-1">{name}</span>
              </div>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// --- JackpotBar ---
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
            {[1, 2, 3, 4].map(i => (<div key={i} className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-slate-700"></div>))}
            <div className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-slate-800 flex items-center justify-center text-[10px] text-white font-bold">+99</div>
          </div>
          <div className="text-green-400 text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span> Recent Winners
          </div>
        </div>
      </div>
    </div>
  );
};

// --- TopBanner ---
const TopBanner = ({ banners }: { banners: any[] }) => {
  const [current, setCurrent] = useState(0);
  const displayBanners = banners?.length > 0 ? banners.filter(b => !b.position || b.position === 'TOP') : [];

  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const timer = setInterval(() => { setCurrent((prev) => (prev + 1) % displayBanners.length); }, 5000);
    return () => clearInterval(timer);
  }, [displayBanners.length]);

  if (displayBanners.length === 0) return null;

  return (
    <div className="w-full relative rounded-xl md:rounded-3xl overflow-hidden mb-4 md:mb-6 mt-4 md:mt-0 group border border-white/10 shadow-2xl">
      <div className="aspect-[3/1] w-full relative">
        <div className="flex transition-transform duration-700 ease-out h-full" style={{ transform: `translateX(-${current * 100}%)` }}>
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
        {displayBanners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {displayBanners.map((_, idx) => (
              <button key={idx} onClick={() => setCurrent(idx)} className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all ${current === idx ? "bg-yellow-400 w-4 md:w-6" : "bg-white/50 hover:bg-white"}`} />
            ))}
          </div>
        )}
        {displayBanners.length > 1 && (
          <>
            <button onClick={() => setCurrent((curr) => (curr === 0 ? displayBanners.length - 1 : curr - 1))} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
              <ChevronRight className="rotate-180" size={24} />
            </button>
            <button onClick={() => setCurrent((curr) => (curr + 1) % displayBanners.length)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// --- Footer ---
const Footer = ({ settings }: any) => (
  <footer className="bg-[#0b1120] border-t border-slate-800 text-slate-400 py-16 mt-20 relative overflow-hidden">
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px]"></div>
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-600/10 rounded-full blur-[128px]"></div>
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-6">
            <Gamepad2 className="text-yellow-400" size={32} />
            <h3 className="text-2xl font-black text-white italic tracking-tighter">{settings?.siteName || "GOLDENBET"}</h3>
          </div>
          <p className="text-sm font-light leading-7 text-slate-500 mb-6">คาสิโนออนไลน์ชั้นนำระดับโลก ได้รับใบอนุญาตและกำกับดูแลอย่างถูกต้อง สัมผัสประสบการณ์แห่งชัยชนะได้ที่นี่</p>
          <div className="flex gap-4">
            {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-white/10 transition-colors cursor-pointer border border-white/5"></div>)}
          </div>
        </div>
        <div>
          <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest text-gradient-gold w-fit">แพลตฟอร์ม</h4>
          <ul className="space-y-4 text-sm font-medium">
            {['สล็อตออนไลน์', 'คาสิโนสด', 'เดิมพันกีฬา', 'หวย', 'โปรโมชั่น'].map(item => (
              <li key={item} className="hover:text-yellow-400 cursor-pointer transition-colors flex items-center gap-2 group">
                <div className="w-1 h-1 rounded-full bg-slate-600 group-hover:bg-yellow-400 transition-colors"></div>{item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest text-gradient-green w-fit">ช่วยเหลือ</h4>
          <ul className="space-y-4 text-sm font-medium">
            {['ศูนย์ช่วยเหลือ', 'วิธีการฝากถอน', 'VIP คลับ', 'ติดต่อเรา', 'เงื่อนไขการใช้งาน'].map(item => (
              <li key={item} className="hover:text-green-400 cursor-pointer transition-colors flex items-center gap-2 group">
                <div className="w-1 h-1 rounded-full bg-slate-600 group-hover:bg-green-400 transition-colors"></div>{item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest text-blue-400 w-fit">การชำระเงินที่ปลอดภัย</h4>
          <div className="grid grid-cols-3 gap-3">
            {['KBANK', 'SCB', 'BBL', 'KTB', 'TRUE', 'VISA'].map(bank => (
              <div key={bank} className="h-10 bg-[#1e293b] rounded flex items-center justify-center text-[10px] font-bold border border-slate-700 hover:border-white transition-all hover:scale-105 cursor-pointer shadow-sm">{bank}</div>
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

// --- HomeContent (Banners + Featured Games) ---
const HomeContent = ({ games, banners, providers, onPlay }: any) => {
  const router = useRouter();
  const popularSlots = (games || []).filter((g: any) => {
    const catSlug = g.provider?.category?.slug || g.category?.slug || '';
    const isSlot = catSlug === 'slots' || catSlug === 'slot' || g.type === 'SLOT';
    return isSlot && (g.isHot || g.isNew);
  }).slice(0, 10);

  const popularCasino = (games || []).filter((g: any) => {
    const catSlug = g.provider?.category?.slug || g.category?.slug || '';
    const isCasino = catSlug === 'casino' || catSlug === 'live-casino' || g.type === 'CASINO';
    return isCasino && (g.isHot || g.isNew);
  }).slice(0, 10);

  // Fallback for general featured games
  const featuredGames = (games || []).slice(0, 10);

  const formatGameData = (g: any) => ({
    title: g.name,
    provider: g.provider?.name || "Game",
    image: g.thumbnail || g.image || "",
    hot: g.isHot,
    isNew: g.isNew,
    slug: g.slug,
    providerCode: g.provider?.slug,
    type: (g.provider?.category?.slug?.includes('casino') || g.type === 'CASINO') ? 'casino' : 'slot'
  });

  const categories = [
    { name: "สล็อต", slug: "slots", icon: Gamepad2, color: "from-yellow-500/20 to-yellow-600/5", border: "border-yellow-500/20", iconColor: "text-yellow-400" },
    { name: "คาสิโนสด", slug: "casino", icon: Dices, color: "from-green-500/20 to-green-600/5", border: "border-green-500/20", iconColor: "text-green-400" },
    { name: "ยิงปลา", slug: "fishing", icon: Sparkles, color: "from-blue-500/20 to-blue-600/5", border: "border-blue-500/20", iconColor: "text-blue-400" },
    { name: "กีฬา", slug: "sports", icon: Trophy, color: "from-red-500/20 to-red-600/5", border: "border-red-500/20", iconColor: "text-red-400" }
  ];

  return (
    <div className="animate-fade-in space-y-6 md:space-y-8">
      <TopBanner banners={banners} />

      {/* Categories Navigation (MANUAL TABS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-8 animate-fade-in-up">
        {categories.map((cat, i) => (
          <div
            key={i}
            onClick={() => router.push(`/games?category=${cat.slug}`)}
            className={`relative p-4 md:p-6 rounded-2xl md:rounded-3xl bg-gradient-to-br ${cat.color} ${cat.border} border border-white/5 hover:border-white/20 transition-all cursor-pointer group overflow-hidden shadow-xl`}
          >
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <cat.icon size={100} />
            </div>
            <div className="relative z-10 flex flex-col items-start gap-2">
              <div className={`p-2 rounded-xl bg-black/40 ${cat.iconColor}`}>
                <cat.icon size={24} />
              </div>
              <h3 className="text-base md:text-xl font-black text-white italic tracking-tighter uppercase">{cat.name}</h3>
              <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">หมวดหมู่ทั้งหมด</span>
            </div>
          </div>
        ))}
      </div>

      {/* Side Banners + Activity Buttons */}
      {(() => {
        const sideBanners = banners ? banners.filter((b: any) => b.position === 'SIDE') : [];
        const hasSideBanners = sideBanners.length > 0;
        return (
          <div className={`grid grid-cols-1 ${hasSideBanners ? 'md:grid-cols-4' : 'md:grid-cols-1'} gap-3 md:gap-4 mb-4 md:mb-8 animate-fade-in`}>
            {hasSideBanners && (
              <div className="md:col-span-3 h-full min-h-[160px]">
                {(() => {
                  const count = sideBanners.length;
                  const gridCols = count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2' : 'grid-cols-3';
                  return (
                    <div className={`grid ${gridCols} gap-2 h-full`}>
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
            <div className={`${hasSideBanners ? 'md:col-span-1 grid-cols-4 md:grid-cols-2' : 'w-full grid-cols-4'} grid gap-2 md:gap-3 h-full`}>
              <button onClick={() => router.push('/referral')} className={`h-22 ${hasSideBanners ? 'md:h-auto md:aspect-square' : 'md:h-28'} flex flex-col items-center justify-center p-2 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-900/40 border border-blue-500/30 hover:border-blue-400 transition-all group shadow-lg`}>
                <Users className="text-blue-400 mb-1 group-hover:scale-110 transition-transform" size={24} />
                <span className="text-[8px] md:text-xs font-bold text-blue-100 uppercase tracking-widest text-center">แนะนำเพื่อน</span>
              </button>
              <button onClick={() => router.push('/streak')} className={`h-22 ${hasSideBanners ? 'md:h-auto md:aspect-square' : 'md:h-28'} flex flex-col items-center justify-center p-2 rounded-xl md:rounded-2xl bg-gradient-to-br from-green-600/20 to-green-900/40 border border-green-500/30 hover:border-green-400 transition-all group shadow-lg`}>
                <span className="text-xl md:text-2xl mb-1 group-hover:scale-110 transition-transform">📅</span>
                <span className="text-[8px] md:text-xs font-bold text-green-100 uppercase tracking-widest text-center">ฝากต่อเนื่อง</span>
              </button>
              <button onClick={() => router.push('/cashback')} className={`h-22 ${hasSideBanners ? 'md:h-auto md:aspect-square' : 'md:h-28'} flex flex-col items-center justify-center p-2 rounded-xl md:rounded-2xl bg-gradient-to-br from-red-600/20 to-red-900/40 border border-red-500/30 hover:border-red-400 transition-all group shadow-lg`}>
                <span className="text-xl md:text-2xl mb-1 group-hover:scale-110 transition-transform">💸</span>
                <span className="text-[8px] md:text-xs font-bold text-red-100 uppercase tracking-widest text-center">คืนยอดเสีย</span>
              </button>
              <button onClick={() => router.push('/rank')} className={`h-22 ${hasSideBanners ? 'md:h-auto md:aspect-square' : 'md:h-28'} flex flex-col items-center justify-center p-2 rounded-xl md:rounded-2xl bg-gradient-to-br from-yellow-600/20 to-yellow-900/40 border border-yellow-500/30 hover:border-yellow-400 transition-all group shadow-lg`}>
                <Trophy className="text-yellow-400 mb-1 group-hover:scale-110 transition-transform" size={24} />
                <span className="text-[8px] md:text-xs font-bold text-yellow-100 uppercase tracking-widest text-center">RANKING</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Mobile: Quick Featured Games */}
      <div className="md:hidden space-y-6 animate-fade-in-up">
        {popularSlots.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 bg-[#1e293b] p-2.5 rounded-lg border border-slate-700">
              <Gamepad2 className="text-yellow-400" size={18} />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">สล็อตยอดฮิต</h2>
            </div>
            <div className="grid grid-cols-5 gap-1.5 stagger-children">
              {popularSlots.map((game: any, i: number) => (
                <div key={i} onClick={() => onPlay && onPlay(game)} className="group relative rounded-lg overflow-hidden cursor-pointer shadow-md">
                  <div className="aspect-[4/5] w-full relative bg-slate-800">
                    {(game.thumbnail || game.image) ? (
                      <img src={game.thumbnail || game.image} alt={game.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                        <Gamepad2 size={20} className="text-slate-600" />
                      </div>
                    )}
                    {game.isHot && (
                      <div className="absolute top-0 right-0 bg-red-600/90 px-1 py-0.5 rounded-bl">
                        <div className="flex items-center gap-0.5 text-white text-[7px] font-black">
                          <Flame size={8} fill="white" /> HOT
                        </div>
                      </div>
                    )}
                    {game.isNew && (
                      <div className="absolute top-0 left-0 bg-blue-500/90 px-1 py-0.5 rounded-br">
                        <div className="flex items-center gap-0.5 text-white text-[7px] font-black">
                          <Sparkles size={8} fill="white" /> NEW
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-[#1e293b] p-1 text-center">
                    <span className="text-[8px] text-slate-300 line-clamp-1 font-bold">{game.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {popularCasino.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 bg-gradient-to-r from-green-900/40 to-green-800/20 p-2.5 rounded-lg border border-green-700/40">
              <Dices className="text-green-400" size={18} />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">คาสิโนยอดฮิต</h2>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {popularCasino.map((game: any, i: number) => (
                <div key={i} onClick={() => onPlay && onPlay(game)} className="group relative rounded-lg overflow-hidden cursor-pointer shadow-md">
                  <div className="aspect-[4/5] w-full relative bg-slate-800">
                    {(game.thumbnail || game.image) ? (
                      <img src={game.thumbnail || game.image} alt={game.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-900 to-slate-800">
                        <Dices size={20} className="text-green-600" />
                      </div>
                    )}
                    {game.isHot && (
                      <div className="absolute top-0 right-0 bg-red-600/90 px-1 py-0.5 rounded-bl">
                        <div className="flex items-center gap-0.5 text-white text-[7px] font-black">
                          <Flame size={8} fill="white" /> HOT
                        </div>
                      </div>
                    )}
                    {game.isNew && (
                      <div className="absolute top-0 left-0 bg-blue-500/90 px-1 py-0.5 rounded-br">
                        <div className="flex items-center gap-0.5 text-white text-[7px] font-black">
                          <Sparkles size={8} fill="white" /> NEW
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-[#1e293b] p-1 text-center">
                    <span className="text-[8px] text-slate-300 line-clamp-1 font-bold">{game.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Jackpot */}
      <div className="hidden md:block"><JackpotBar /></div>

      {/* Desktop: Popular Slots */}
      {popularSlots.length > 0 && (
        <div className="relative hidden md:block">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-white italic tracking-tighter flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">
                <Gamepad2 className="text-yellow-500 fill-yellow-500" />
              </div>
              สล็อตยอดฮิต <span className="text-sm font-normal text-slate-500 not-italic tracking-normal self-end mb-1 custom-font">ยอดนิยมวันนี้</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {popularSlots.map((game: any, i: number) => (
              <GameCard key={i} {...formatGameData(game)} onPlay={() => onPlay && onPlay(game)} />
            ))}
          </div>
        </div>
      )}

      {/* Desktop: Popular Casino */}
      {popularCasino.length > 0 && (
        <div className="relative hidden md:block mt-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-white italic tracking-tighter flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                <Dices className="text-green-500 fill-green-500" />
              </div>
              คาสิโนยอดฮิต <span className="text-sm font-normal text-slate-500 not-italic tracking-normal self-end mb-1 custom-font">ยอดนิยมวันนี้</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {popularCasino.map((game: any, i: number) => (
              <GameCard key={i} {...formatGameData(game)} onPlay={() => onPlay && onPlay(game)} />
            ))}
          </div>
        </div>
      )}

      {/* Fallback Featured Games Section */}
      {(popularSlots.length === 0 && popularCasino.length === 0) && (
        <div className="relative hidden md:block">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-white italic tracking-tighter flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                <Flame className="text-indigo-400 fill-indigo-400" />
              </div>
              เกมแนะนำ <span className="text-sm font-normal text-slate-500 not-italic tracking-normal self-end mb-1 custom-font">FEATURED GAMES</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {featuredGames.map((game: any, i: number) => (
              <GameCard key={i} {...formatGameData(game)} onPlay={() => onPlay && onPlay(game)} />
            ))}
          </div>
        </div>
      )}

      {/* Desktop Layout Bottom Sections */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-20">
        <div className="md:col-span-1 hidden md:block">
          <Sidebar title="ค่ายเกมชั้นนำ" items={providers.slice(0, 10)} active={null} />
        </div>
        <div className="md:col-span-3">
          <div className="glass-card rounded-2xl p-8 relative overflow-hidden h-full">
            <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
              <Trophy className="text-yellow-400" size={32} />
              ผู้ชนะล่าสุด
              <span className="text-xs font-bold bg-green-500 text-black px-2 py-1 rounded ml-auto">LIVE FEED</span>
            </h3>
            <div className="space-y-4 max-h-[500px] overflow-hidden relative">
              <div className="absolute top-0 w-full h-10 bg-gradient-to-b from-[#0f172a] to-transparent z-10 pointer-events-none"></div>
              <div className="absolute bottom-0 w-full h-10 bg-gradient-to-t from-[#0f172a] to-transparent z-10 pointer-events-none"></div>
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



// --- MAIN PAGE LOGIC ---
function HomePageLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [refreshingBalance, setRefreshingBalance] = useState(false);

  const handlePlayGame = useGameLauncher(() => setShowLogin(true));

  // Fetch Public Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gameRes, bannerRes, providerRes, settingRes] = await Promise.all([
          axios.get(`${API_URL}/public/games`),
          axios.get(`${API_URL}/public/banners`),
          axios.get(`${API_URL}/public/providers`),
          axios.get(`${API_URL}/public/settings`)
        ]);
        if (Array.isArray(gameRes.data)) setGames(gameRes.data);
        if (Array.isArray(bannerRes.data)) setBanners(bannerRes.data);
        if (Array.isArray(providerRes.data)) setProviders(providerRes.data);
        if (settingRes.data && settingRes.data.settings) setSettings(settingRes.data.settings);
      } catch (err) { console.error("Failed to fetch public data", err); }
    };
    fetchData();
  }, []);

  // Check Auth & Poll User Data
  const fetchUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setRefreshingBalance(true);
    try {
      const res = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setUser(res.data.data);
        localStorage.setItem("user", JSON.stringify(res.data.data));
      }
    } catch (err) { console.error("Failed to fetch user:", err); }
    finally { setRefreshingBalance(false); }
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData && userData !== "undefined") {
      try { setUser(JSON.parse(userData)); } catch (e) { localStorage.removeItem("user"); }
    }
    fetchUser();
    const interval = setInterval(fetchUser, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle URL Actions
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "login") { setShowLogin(true); setShowRegister(false); }
    else if (action === "register") { setShowRegister(true); setShowLogin(false); }
  }, [searchParams]);

  const handleLogout = async () => {
    // Call backend to clear sessionToken
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await axios.post(`${API_URL}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) { /* ignore */ }
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 font-sans selection:bg-yellow-500 selection:text-black pb-20">
      <Header
        onLogin={() => setShowLogin(true)}
        onRegister={() => setShowRegister(true)}
        user={user}
        onLogout={handleLogout}
        settings={settings}
        onRefresh={fetchUser}
        isRefreshing={refreshingBalance}
      />

      <main className="w-full px-2 md:px-4 py-4 md:py-8 max-w-7xl mx-auto">
        <HomeContent games={games} banners={banners} providers={providers} onPlay={handlePlayGame} />
      </main>

      <Footer settings={settings} />
      <BottomNav />

      {/* Auth Modals */}
      <AuthModals
        showLogin={showLogin}
        showRegister={showRegister}
        onCloseLogin={() => setShowLogin(false)}
        onCloseRegister={() => setShowRegister(false)}
        onSwitchToRegister={() => setShowRegister(true)}
        onSwitchToLogin={() => setShowLogin(true)}
        onLoginSuccess={(u) => setUser(u)}
      />

      {/* Contact Button */}
      <button
        onClick={() => setShowContact(true)}
        style={{
          position: "fixed", bottom: "80px", right: "16px", width: "56px", height: "56px",
          borderRadius: "14px", background: "#21262D", border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)", cursor: "pointer", display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px", zIndex: 90
        }}
      >
        <span style={{ fontSize: "24px" }}>💬</span>
        <span style={{ fontSize: "9px", fontWeight: 600, color: "#8B949E" }}>ติดต่อ</span>
      </button>
      <ContactDrawer isOpen={showContact} onClose={() => setShowContact(false)} />
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
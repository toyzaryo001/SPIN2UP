"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from "next/navigation";
import {
    Gamepad2, Dices, Trophy, Gift, Play, Loader2, X
} from 'lucide-react';
import axios from "axios";
import { API_URL } from "@/lib/api";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ContactDrawer from "@/components/ContactDrawer";
import GameCard from "@/components/GameCard";
import AuthModals from "@/components/AuthModals";
import { useGameLauncher } from "@/components/GameLauncher";

// --- Sidebar Component ---
const Sidebar = ({ title, items, active, setActive }: any) => (
    <div className="glass-card rounded-2xl overflow-hidden sticky top-36">
        <div className="p-4 border-b border-white/10 bg-white/5">
            <h3 className="text-base font-black text-white border-l-4 border-yellow-500 pl-3 uppercase italic tracking-wider">{title}</h3>
        </div>
        <div className="p-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
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
              ${isActive ? 'ring-2 ring-blue-400 scale-[1.02] shadow-lg' : 'hover:ring-2 hover:ring-white/30'}`}
                        >
                            {logo ? (
                                <div className="absolute inset-0">
                                    <img src={logo} alt={name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                </div>
                            ) : (
                                <div className={`absolute inset-0 flex items-center justify-center ${isActive ? 'bg-gradient-to-br from-blue-600 to-blue-800' : 'bg-white/5'}`}>
                                    <Gamepad2 size={40} className={`${isActive ? 'text-white' : 'text-slate-500'}`} />
                                </div>
                            )}
                            {isLobby && (
                                <div className="absolute top-1 right-1 bg-yellow-500/90 text-[8px] font-bold text-black px-1.5 py-0.5 rounded z-10">LOBBY</div>
                            )}
                            <div className="relative z-10 w-full p-2 text-center">
                                <span className="text-[10px] font-bold text-white drop-shadow-lg line-clamp-1">{name}</span>
                            </div>
                            {isActive && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-green-400 animate-pulse z-10"></div>}
                            {!isActive && <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>}
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
);

// --- Slots/Generic Content ---
const SlotsContent = ({ games, category, providers: globalProviders, onPlay }: any) => {
    const displayProviders = (category?.providers && category.providers.length > 0)
        ? category.providers
        : (globalProviders || []);

    const firstProviderName = displayProviders.length > 0 ? displayProviders[0].name : "PG Soft";
    const [activeProvider, setActiveProvider] = useState(firstProviderName);
    const [isLoading, setIsLoading] = useState(false);

    const handleProviderChange = (providerName: string) => {
        setIsLoading(true);
        setActiveProvider(providerName);
        setTimeout(() => setIsLoading(false), 500);
    };

    const providerList = displayProviders;
    const filteredGames = games.filter((g: any) =>
        (g.provider?.name === activeProvider || !activeProvider) &&
        (g.provider?.categoryId === category?.id)
    );

    const currentProvider = providerList.find((p: any) => p.name === activeProvider);
    const isLobbyProvider = currentProvider?.isLobbyMode === true;

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
            {/* Mobile Provider Selector */}
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
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden ${activeProvider === p.name ? 'bg-white/20' : 'bg-white/10'}`}>
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
                    {isLoading && (
                        <div className="flex items-center gap-2 text-yellow-400">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-xs">กำลังโหลด...</span>
                        </div>
                    )}
                </div>

                {isLobbyProvider ? (
                    <div className="flex justify-center py-12">
                        <div onClick={handleEnterLobby} className="cursor-pointer group relative rounded-2xl overflow-hidden shadow-2xl hover:shadow-[0_0_40px_rgba(250,204,21,0.5)] transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-yellow-500/50 w-full max-w-md">
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
                            <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500">
                                <Gamepad2 size={48} className="mb-2 opacity-20" />
                                <p>ไม่พบเกมในหมวดนี้</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Casino Content ---
const CasinoContent = ({ games, category, providers: globalProviders, onPlay }: any) => {
    const displayProviders = (category?.providers && category.providers.length > 0)
        ? category.providers
        : (globalProviders || []);
    const firstProviderName = displayProviders.length > 0 ? displayProviders[0].name : "SA Gaming";
    const [activeProvider, setActiveProvider] = useState(firstProviderName);
    const [isLoading, setIsLoading] = useState(false);

    const handleProviderChange = (providerName: string) => {
        setIsLoading(true);
        setActiveProvider(providerName);
        setTimeout(() => setIsLoading(false), 500);
    };

    const providerList = displayProviders;
    const currentProvider = providerList.find((p: any) => p.name === activeProvider);
    const isLobbyProvider = currentProvider?.isLobbyMode === true;

    const handleEnterLobby = () => {
        if (currentProvider && onPlay) {
            onPlay({
                slug: `${currentProvider.slug}-lobby`,
                name: `${currentProvider.name} Lobby`,
                provider: currentProvider,
                isLobby: true
            });
        }
    };

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
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 bg-[#1e293b] p-4 rounded-xl border border-slate-700 gap-4 shadow-md">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 font-sans">
                            <Dices className="text-yellow-400" />
                            เกม: <span className="text-green-400">{activeProvider}</span>
                            {isLobbyProvider && <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px] md:text-xs flex-shrink-0">LOBBY</span>}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1 font-sans">
                            {isLobbyProvider ? 'กดเพื่อเข้าห้องเกม' : `เกมทั้งหมด ${filteredGames.length > 0 ? filteredGames.length : 0} เกม`}
                        </p>
                    </div>
                </div>

                {/* Casino Hero Banner */}
                <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 rounded-xl p-6 mb-6 border border-blue-800/50 relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-20 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2 font-sans">
                            {activeProvider} Live <span className="px-2 py-0.5 bg-red-600 text-[10px] rounded text-white animate-pulse shadow-lg shadow-red-600/40 font-sans">LIVE</span>
                        </h2>
                        <p className="text-blue-200 text-sm max-w-lg font-light font-sans">สัมผัสประสบการณ์คาสิโนสดจาก {activeProvider} ส่งตรงจากต่างประเทศ</p>
                    </div>
                </div>

                {isLobbyProvider ? (
                    <div className="flex justify-center items-center min-h-[300px]">
                        <div className="bg-gradient-to-br from-blue-900/80 to-slate-900 rounded-2xl p-8 text-center cursor-pointer hover:scale-[1.02] transition-all duration-300 border border-blue-500/30 max-w-md w-full shadow-2xl shadow-blue-500/10" onClick={handleEnterLobby}>
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                                <Dices size={40} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 font-sans">{activeProvider}</h3>
                            <p className="text-slate-400 text-sm mb-6 font-sans">เข้าสู่ห้องคาสิโนสดเพื่อเลือกโต๊ะเกม</p>
                            <button className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 rounded-xl font-bold text-lg hover:from-yellow-400 hover:to-yellow-500 transition-all shadow-lg shadow-yellow-500/30 font-sans">
                                🎮 เข้าสู่ LOBBY
                            </button>
                        </div>
                    </div>
                ) : (
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
                )}
            </div>
        </div>
    );
};

// --- Arcade Content ---
const ArcadeContent = ({ category, providers: globalProviders, onPlay }: any) => {
    const arcadeProviders = (category?.providers && category.providers.length > 0)
        ? category.providers
        : (globalProviders || []).filter((p: any) => p.categoryId === category?.id);

    const handleEnterLobby = (provider: any) => {
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

// --- NavBar (Category Tabs) ---
const NavBar = ({ activeTab, setActiveTab, categories }: any) => {
    const navItems = [
        ...(categories || []).map((cat: any) => ({
            id: cat.slug || cat.id.toString(),
            label: cat.name,
            icon: cat.slug === 'casino' ? <Dices size={18} /> :
                cat.slug === 'sport' ? <Trophy size={18} /> :
                    cat.slug === 'lotto' ? <Gift size={18} /> :
                        <Gamepad2 size={18} />,
        }))
    ];

    return (
        <>
            {/* Desktop NavBar */}
            <nav className="hidden md:block sticky top-20 z-40 bg-[#0f172a]/90 backdrop-blur-md border-b border-white/5 py-2 overflow-x-auto">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center gap-2 min-w-max">
                        {navItems.map((menu) => (
                            <button
                                key={menu.id}
                                onClick={() => setActiveTab(menu.id)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-all duration-300 font-bold text-sm tracking-wide whitespace-nowrap
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

            {/* Mobile Category Tabs */}
            <div className="md:hidden sticky top-[100px] z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-white/5 px-3 py-2 overflow-x-auto">
                <div className="flex gap-1.5 min-w-max">
                    {navItems.map((menu) => (
                        <button
                            key={menu.id}
                            onClick={() => setActiveTab(menu.id)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all
              ${activeTab === menu.id
                                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-lg'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                        >
                            {menu.icon}
                            {menu.label}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
};

// --- Main Games Page Logic ---
function GamesPageLogic() {
    const searchParams = useSearchParams();
    const tabFromUrl = searchParams.get('tab') || '';

    const [activeTab, setActiveTabState] = useState(tabFromUrl);
    const [showLogin, setShowLogin] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const [showContact, setShowContact] = useState(false);

    const [games, setGames] = useState<any[]>([]);
    const [providers, setProviders] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    const handlePlayGame = useGameLauncher(() => setShowLogin(true));

    const setActiveTab = (tab: string) => {
        setActiveTabState(tab);
        const url = `/games?tab=${tab}`;
        window.history.pushState({}, '', url);
    };

    // Listen for browser back/forward
    useEffect(() => {
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab') || '';
            setActiveTabState(tab);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [gameRes, providerRes, catRes] = await Promise.all([
                    axios.get(`${API_URL}/public/games`),
                    axios.get(`${API_URL}/public/providers`),
                    axios.get(`${API_URL}/public/categories`)
                ]);

                if (Array.isArray(gameRes.data)) setGames(gameRes.data);
                if (Array.isArray(providerRes.data)) setProviders(providerRes.data);
                if (Array.isArray(catRes.data)) {
                    setCategories(catRes.data);
                    // Auto-select first category if no tab specified
                    if (!tabFromUrl && catRes.data.length > 0) {
                        const firstSlug = catRes.data[0].slug || catRes.data[0].id.toString();
                        setActiveTabState(firstSlug);
                        window.history.replaceState({}, '', `/games?tab=${firstSlug}`);
                    }
                }
            } catch (err) { console.error("Failed to fetch game data", err); }
        };
        fetchData();
    }, []);

    const renderContent = () => {
        const cat = categories.find(c => (c.slug || c.id.toString()) === activeTab);
        if (!cat) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 min-h-[50vh]">
                    <Loader2 size={40} className="animate-spin text-yellow-500 mb-4" />
                    <p className="text-sm">กำลังโหลดหมวดหมู่เกม...</p>
                </div>
            );
        }

        if (cat.slug === 'casino' || cat.slug === 'live-casino') {
            return <CasinoContent games={games} category={cat} providers={providers} onPlay={handlePlayGame} />;
        }
        if (cat.slug === 'arcade') {
            return <ArcadeContent category={cat} providers={providers} onPlay={handlePlayGame} />;
        }
        // Default: SlotsContent for slots, fishing, table, etc.
        return <SlotsContent games={games} category={cat} providers={providers} onPlay={handlePlayGame} />;
    };

    return (
        <div className="min-h-screen bg-[#0b1120] text-slate-200 font-sans selection:bg-yellow-500 selection:text-black pb-20">
            <Header
                onLogin={() => setShowLogin(true)}
                onRegister={() => setShowRegister(true)}
            />

            <NavBar activeTab={activeTab} setActiveTab={setActiveTab} categories={categories} />

            <main className="w-full px-2 md:px-4 py-4 md:py-8 max-w-7xl mx-auto">
                {renderContent()}
            </main>

            <BottomNav />

            {/* Auth Modals */}
            <AuthModals
                showLogin={showLogin}
                showRegister={showRegister}
                onCloseLogin={() => setShowLogin(false)}
                onCloseRegister={() => setShowRegister(false)}
                onSwitchToRegister={() => setShowRegister(true)}
                onSwitchToLogin={() => setShowLogin(true)}
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

export default function GamesPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center text-white font-sans">Loading...</div>}>
            <GamesPageLogic />
        </Suspense>
    );
}

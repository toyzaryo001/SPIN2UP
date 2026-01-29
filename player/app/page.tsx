"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  Search,
  Menu,
  User,
  Gamepad2,
  Dices,
  Trophy,
  Gift,
  Wallet,
  ChevronRight,
  Play,
  CreditCard,
  Smartphone,
  Flame,
  Star,
  Users,
  X
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// --- Components from ex.txt (Strict) ---

const Header = ({ onLogin, onRegister, user, onLogout }: any) => (
  <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
    <div className="w-full max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      {/* Logo Area */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20">
          <Gamepad2 className="text-white w-6 h-6" />
        </div>
        <div className="hidden md:block">
          <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300 drop-shadow-md">
            GOLDEN<span className="text-green-400">BET</span>
          </h1>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl mx-4 hidden md:block">
        <div className="relative group">
          <input
            type="text"
            placeholder="ค้นหาเกม..."
            className="w-full bg-slate-800 text-slate-200 border border-slate-600 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all"
          />
          <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4 group-hover:text-green-400 transition-colors" />
        </div>
      </div>

      {/* Auth Buttons */}
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-xs text-slate-400">ยินดีต้อนรับ,</span>
              <span className="text-sm font-bold text-yellow-400">{user.username || user.phone}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
              <span className="text-yellow-400 text-sm font-bold">฿{Number(user.balance || 0).toLocaleString()}</span>
            </div>
            <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-slate-800 rounded-lg border border-slate-700">
              <User size={20} />
            </button>
          </>
        ) : (
          <>
            <button onClick={onLogin} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-slate-900 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 shadow-lg shadow-yellow-500/20 transition-all transform hover:scale-105">
              <User size={18} />
              เข้าสู่ระบบ
            </button>
            <button onClick={onRegister} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 shadow-lg shadow-green-500/20 transition-all transform hover:scale-105">
              <Wallet size={18} />
              สมัครสมาชิก
            </button>
          </>
        )}
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-600 ml-2">
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
    <nav className="bg-slate-800 border-b border-slate-700 shadow-md">
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="flex overflow-x-auto no-scrollbar">
          {menus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => setActiveTab(menu.id)}
              className={`flex flex-col md:flex-row items-center justify-center gap-2 px-6 py-4 min-w-[100px] md:min-w-0 transition-all border-b-2 
                ${activeTab === menu.id
                  ? 'border-yellow-500 text-yellow-400 bg-slate-700/50'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
            >
              {menu.icon}
              <span className="text-sm font-medium whitespace-nowrap">{menu.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

const Banner = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
    <div className="md:col-span-2 relative h-48 md:h-64 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/10 group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-slate-900 z-0"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-8">
        <span className="inline-block px-3 py-1 bg-yellow-500 text-slate-900 text-xs font-bold rounded-full w-fit mb-2 animate-pulse">
          HOT PROMOTION
        </span>
        <h2 className="text-3xl md:text-5xl font-black text-white mb-2 drop-shadow-lg">
          สมัครใหม่รับ <span className="text-yellow-400">100%</span>
        </h2>
        <p className="text-blue-200 mb-6 max-w-md">
          ฝากครั้งแรกรับโบนัสทันที สูงสุด 5,000 บาท ทำเทิร์นน้อย ถอนไม่อั้น
        </p>
        <button className="w-fit px-6 py-2 bg-green-500 hover:bg-green-400 text-white font-bold rounded-lg shadow-lg shadow-green-500/30 transition-all flex items-center gap-2">
          รับโบนัสเลย <ChevronRight size={18} />
        </button>
      </div>

      {/* Decoration */}
      <div className="absolute right-0 bottom-0 w-64 h-64 bg-gradient-to-tl from-blue-600 to-transparent opacity-20 rounded-full blur-3xl transform translate-x-1/4 translate-y-1/4"></div>
    </div>

    <div className="relative h-48 md:h-64 bg-slate-800 rounded-2xl overflow-hidden p-6 border border-slate-700 flex flex-col justify-between group hover:border-blue-500 transition-all">
      <div>
        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Users className="text-blue-400" /> ชวนเพื่อนรับรายได้
        </h3>
        <p className="text-slate-400 text-sm">รับคอมมิชชั่น 0.8% ทุกยอดเล่น</p>
      </div>

      <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
        <p className="text-xs text-slate-400 mb-1">ลิงค์แนะนำของคุณ</p>
        <div className="flex items-center justify-between bg-slate-800 rounded p-2">
          <span className="text-green-400 text-sm font-mono truncate">goldenbet.com/u/user888</span>
          <button className="text-yellow-400 hover:text-yellow-300">
            <Gift size={16} />
          </button>
        </div>
      </div>

      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Users size={100} className="text-white" />
      </div>
    </div>
  </div>
);

const GameCard = ({ title, provider, image, color, hot, type }: any) => (
  <div className="group relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-yellow-500 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-yellow-500/20 cursor-pointer">
    {/* Image Placeholder */}
    <div className={`h-32 md:h-40 w-full ${color} relative overflow-hidden`}>
      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all"></div>
      {image ? (
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-110" style={{ background: `url(${image}) center/cover` }}></div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">
          {type === 'slot' ? <Gamepad2 size={48} className="text-white" /> : <Dices size={48} className="text-white" />}
        </div>
      )}

      {hot && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg animate-bounce">
          HOT
        </div>
      )}
    </div>

    <div className="p-3">
      <h3 className="text-white font-bold text-sm truncate">{title}</h3>
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-slate-400">{provider}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(i => <Star key={i} size={8} className="text-yellow-500 fill-yellow-500" />)}
        </div>
      </div>
    </div>

    {/* Hover Overlay */}
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
      <button className="bg-green-500 text-white rounded-full p-3 transform scale-0 group-hover:scale-110 transition-transform duration-300 hover:bg-green-400 shadow-lg shadow-green-500/50">
        <Play size={24} className="ml-1" />
      </button>
    </div>
  </div>
);

const Sidebar = ({ title, items, active, setActive }: any) => (
  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 h-fit">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-bold text-white border-l-4 border-yellow-500 pl-3">{title}</h3>
      <span className="text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded">{items.length} ค่าย</span>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
      {items.map((item: any, idx: number) => (
        <button
          key={idx}
          onClick={() => setActive && setActive(item)}
          className={`p-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3
            ${active === item
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
        >
          <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs overflow-hidden shrink-0">
            {item.substring(0, 2)}
          </div>
          <span className="truncate">{item}</span>
        </button>
      ))}
    </div>
  </div>
);

const JackpotBar = () => {
  const [jackpot, setJackpot] = useState(48291045.50);

  useEffect(() => {
    const interval = setInterval(() => {
      setJackpot(prev => prev + (Math.random() * 10));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-y border-yellow-500/30 py-3 mb-6">
      <div className="w-full max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Trophy className="text-yellow-400 animate-pulse" />
          <span className="text-white font-bold uppercase tracking-wider">Progressive Jackpot</span>
        </div>
        <div className="font-mono text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-sm">
          ฿ {jackpot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="flex items-center gap-2 text-xs text-green-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
          Live Payouts
        </div>
      </div>
    </div>
  );
}

// --- Main Pages Content ---

const HomeContent = ({ games }: any) => {
  const providers = ["PG Soft", "Joker", "Pragmatic", "Jili", "Spadegaming", "Red Tiger", "Habanero", "Blueprint"];
  // Mock Data from ex.txt including colors!
  const MOCK_GAMES = [
    { title: "Treasures of Aztec", provider: "PG Soft", color: "bg-gradient-to-br from-green-800 to-slate-900", hot: true, type: 'slot' },
    { title: "Roma Legacy", provider: "Joker", color: "bg-gradient-to-br from-red-900 to-slate-900", hot: true, type: 'slot' },
    { title: "Sweet Bonanza", provider: "Pragmatic", color: "bg-gradient-to-br from-pink-800 to-purple-900", hot: true, type: 'slot' },
    { title: "Lucky Neko", provider: "PG Soft", color: "bg-gradient-to-br from-yellow-700 to-orange-900", hot: false, type: 'slot' },
    { title: "Baccarat Live", provider: "SA Gaming", color: "bg-gradient-to-br from-blue-800 to-slate-900", hot: true, type: 'casino' },
    { title: "Sexy Gaming", provider: "AE Sexy", color: "bg-gradient-to-br from-purple-800 to-slate-900", hot: false, type: 'casino' },
    // Fill remaining to limit 12
    { title: "Mahjong Ways 2", provider: "PG Soft", color: "bg-gradient-to-br from-green-800 to-slate-900", hot: true, type: 'slot' },
    { title: "Caishen Wins", provider: "PG Soft", color: "bg-gradient-to-br from-red-900 to-slate-900", hot: false, type: 'slot' },
    { title: "Fortune Ox", provider: "PG Soft", color: "bg-gradient-to-br from-yellow-700 to-orange-900", hot: false, type: 'slot' },
    { title: "Wild Bandito", provider: "PG Soft", color: "bg-gradient-to-br from-pink-800 to-purple-900", hot: true, type: 'slot' },
    { title: "Dragon Hatch", provider: "PG Soft", color: "bg-gradient-to-br from-blue-800 to-slate-900", hot: false, type: 'slot' },
    { title: "Ganesha Gold", provider: "PG Soft", color: "bg-gradient-to-br from-purple-800 to-slate-900", hot: false, type: 'slot' },
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
    <div className="animate-fade-in">
      <Banner />
      <JackpotBar />

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Flame className="text-orange-500" /> เกมฮิตช่วงนี้
          </h2>
          <button className="text-sm text-green-400 hover:text-green-300 underline">ดูทั้งหมด</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {displayGames.map((game: any, i: number) => (
            <GameCard key={i} {...game} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 hidden md:block">
          <Sidebar title="ค่ายเกมยอดฮิต" items={providers} active={null} />
        </div>
        <div className="md:col-span-3">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="text-yellow-400" /> อันดับผู้ชนะล่าสุด
            </h3>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800 hover:border-green-500/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-xs">U{i}8</div>
                    <span className="text-slate-300 text-sm">user08**{i}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-mono font-bold">+ ฿{(Math.random() * 50000).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500">Mahjong Ways 2</div>
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
      <div className="md:col-span-1">
        <Sidebar title="ค่ายสล็อต" items={providers} active={activeProvider} setActive={setActiveProvider} />
      </div>
      <div className="md:col-span-3">
        <div className="flex items-center justify-between mb-6 bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold text-white">
            เกมสล็อต: <span className="text-green-400">{activeProvider}</span>
          </h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs bg-slate-700 text-white rounded hover:bg-slate-600">ล่าสุด</button>
            <button className="px-3 py-1 text-xs bg-yellow-500 text-black rounded font-bold">ยอดนิยม</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <GameCard
              key={i}
              title={`${activeProvider} Game ${i + 1}`}
              provider={activeProvider}
              color={`bg-slate-700`}
              hot={i % 3 === 0}
              type="slot"
            />
          ))}
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
      <div className="md:col-span-1">
        <Sidebar title="ค่ายคาสิโน" items={providers} active={activeProvider} setActive={setActiveProvider} />
      </div>
      <div className="md:col-span-3">
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-xl p-6 mb-6 border border-blue-800">
          <h2 className="text-2xl font-bold text-white mb-2">{activeProvider} Live</h2>
          <p className="text-blue-200 text-sm">สัมผัสประสบการณ์คาสิโนสด ส่งตรงจากต่างประเทศ ภาพคมชัดระดับ 4K</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {['Baccarat A01', 'Baccarat A02', 'Roulette R1', 'Dragon Tiger', 'SicBo', 'Blackjack'].map((room, i) => (
            <div key={i} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 group hover:border-green-500 transition-all">
              <div className="h-48 bg-slate-900 relative">
                <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div> LIVE
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Dices size={40} className="text-slate-600" />
                </div>
                {/* Mock UI for cards */}
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-end justify-between">
                  <div className="flex gap-1">
                    <div className="w-4 h-4 bg-blue-600 rounded-full border border-white/20"></div>
                    <div className="w-4 h-4 bg-red-600 rounded-full border border-white/20"></div>
                    <div className="w-4 h-4 bg-blue-600 rounded-full border border-white/20"></div>
                  </div>
                  <span className="text-white font-mono text-sm">Room {i + 1}</span>
                </div>
              </div>
              <div className="p-4 flex justify-between items-center bg-slate-800">
                <div>
                  <h3 className="text-white font-bold">{room}</h3>
                  <p className="text-xs text-slate-400">Limit: 20 - 50k</p>
                </div>
                <button className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-green-600/20">
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

// --- Main App Logic ---

export default function HomePage() {
  return (
    <Suspense fallback={<div className="bg-[#0a0f1e] min-h-screen text-white flex items-center justify-center">Loading...</div>}>
      <HomePageLogic />
    </Suspense>
  );
}

function HomePageLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('home');
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loginForm, setLoginForm] = useState({ phone: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    fullName: "", phone: "", bankName: "KBANK", bankAccount: "", password: "", confirmPassword: "", lineId: "", referrer: "",
  });
  const [user, setUser] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);

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

  // Auth Status
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
  }, []); // Run only once on mount

  // URL Actions
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "login") {
      setShowLogin(true);
      setShowRegister(false);
    } else if (action === "register") {
      setShowRegister(true);
      setShowLogin(false);
    }
  }, [searchParams]);

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, loginForm);
      if (res.data.success) {
        localStorage.setItem("token", res.data.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.data.user));
        setUser(res.data.data.user);
        setShowLogin(false);
        window.dispatchEvent(new Event('user-login'));
        router.replace("/");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.reload();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (registerForm.password !== registerForm.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
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
    } finally {
      setLoading(false);
    }
  };

  // Render Content Switcher
  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeContent games={games} />;
      case 'slots': return <SlotsContent />;
      case 'casino': return <CasinoContent />;
      default: return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Gamepad2 size={64} className="mb-4 opacity-50" />
          <h2 className="text-xl font-bold">Coming Soon</h2>
          <p>หมวดหมู่ {activeTab} กำลังเปิดให้บริการเร็วๆ นี้</p>
        </div>
      );
    }
  };

  // Styles for Modals (Consistent with Dark Theme)
  const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px"
  };
  const modalStyle: React.CSSProperties = {
    background: "#1e293b", borderRadius: "16px", padding: "24px", width: "100%",
    maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", position: "relative", border: "1px solid #334155"
  };
  const inputStyle = {
    width: "100%", padding: "12px 14px", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px",
    color: "#fff", fontSize: "14px", marginBottom: "12px", outline: "none"
  };
  const btnPrimary = {
    width: "100%", padding: "12px", background: "linear-gradient(to right, #eab308, #ca8a04)",
    color: "#000", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "bold" as const, cursor: "pointer"
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] font-sans text-slate-200">
      <Header
        onLogin={() => setShowLogin(true)}
        onRegister={() => setShowRegister(true)}
        user={user}
        onLogout={handleLogout}
      />

      <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="w-full max-w-7xl mx-auto px-4 py-6 pb-24">
        {renderContent()}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-4 py-2 z-50">
        <div className="grid grid-cols-5 gap-1">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center p-2 rounded ${activeTab === 'home' ? 'text-yellow-400' : 'text-slate-500'}`}>
            <Play size={20} />
            <span className="text-[10px] mt-1">หน้าหลัก</span>
          </button>
          <button onClick={() => setActiveTab('slots')} className={`flex flex-col items-center p-2 rounded ${activeTab === 'slots' ? 'text-yellow-400' : 'text-slate-500'}`}>
            <Gamepad2 size={20} />
            <span className="text-[10px] mt-1">สล็อต</span>
          </button>
          <div className="relative -top-6 flex justify-center">
            <button onClick={() => user ? router.push('/deposit') : setShowLogin(true)} className="w-14 h-14 rounded-full bg-gradient-to-r from-green-500 to-green-600 border-4 border-[#0a0f1e] flex items-center justify-center text-white shadow-lg shadow-green-500/40">
              <Wallet size={24} />
            </button>
          </div>
          <button onClick={() => setActiveTab('casino')} className={`flex flex-col items-center p-2 rounded ${activeTab === 'casino' ? 'text-yellow-400' : 'text-slate-500'}`}>
            <Dices size={20} />
            <span className="text-[10px] mt-1">คาสิโน</span>
          </button>
          <button onClick={() => user ? null : setShowLogin(true)} className="flex flex-col items-center p-2 text-slate-500">
            <User size={20} />
            <span className="text-[10px] mt-1">บัญชี</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-10 hidden md:block">
        <div className="w-full max-w-7xl mx-auto px-4 grid grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold mb-4">GOLDENBET</h3>
            <p className="text-sm">เว็บพนันออนไลน์อันดับ 1 มั่นคง ปลอดภัย ฝาก-ถอน รวดเร็วด้วยระบบอัตโนมัติ 24 ชั่วโมง</p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4">บริการ</h3>
            <ul className="text-sm space-y-2">
              <li>สล็อตออนไลน์</li>
              <li>คาสิโนสด</li>
              <li>เดิมพันกีฬา</li>
              <li>หวยออนไลน์</li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4">ช่วยเหลือ</h3>
            <ul className="text-sm space-y-2">
              <li>เกี่ยวกับเรา</li>
              <li>เงื่อนไขการใช้งาน</li>
              <li>นโยบายความเป็นส่วนตัว</li>
              <li>ติดต่อเรา</li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4">ธนาคารที่รองรับ</h3>
            <div className="flex gap-2">
              <div className="w-10 h-10 bg-green-600 rounded flex items-center justify-center text-white text-xs">KBANK</div>
              <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center text-white text-xs">SCB</div>
              <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white text-xs">BBL</div>
            </div>
          </div>
        </div>
        <div className="text-center mt-10 pt-6 border-t border-slate-800 text-xs">
          © 2024 GoldenBet. All rights reserved.
        </div>
      </footer>

      {/* LOGIN MODAL */}
      {showLogin && (
        <div style={overlayStyle} onClick={() => setShowLogin(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24} /></button>
            <h2 className="text-2xl font-bold text-yellow-500 text-center mb-6">เข้าสู่ระบบ</h2>
            {error && <div className="bg-red-500/10 text-red-500 p-3 rounded mb-4 text-sm text-center">{error}</div>}
            <form onSubmit={handleLogin}>
              <input type="tel" placeholder="เบอร์โทรศัพท์" style={inputStyle} value={loginForm.phone} onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })} required />
              <input type="password" placeholder="รหัสผ่าน" style={inputStyle} value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
              <button type="submit" style={btnPrimary} disabled={loading}>{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
            </form>
            <div className="text-center mt-4 text-sm text-slate-400">
              ยังไม่มีบัญชี? <button onClick={() => { setShowLogin(false); setShowRegister(true); }} className="text-yellow-500 font-bold hover:underline ml-1">สมัครสมาชิก</button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER MODAL */}
      {showRegister && (
        <div style={overlayStyle} onClick={() => setShowRegister(false)}>
          <div style={{ ...modalStyle, maxWidth: "500px" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowRegister(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24} /></button>
            <h2 className="text-2xl font-bold text-green-500 text-center mb-6">สมัครสมาชิก</h2>
            {error && <div className="bg-red-500/10 text-red-500 p-3 rounded mb-4 text-sm text-center">{error}</div>}
            <form onSubmit={handleRegister} className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="ชื่อ-นามสกุล" style={inputStyle} value={registerForm.fullName} onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })} className="col-span-2" />
              <input type="tel" placeholder="เบอร์โทรศัพท์" style={inputStyle} value={registerForm.phone} onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })} className="col-span-2" />
              <input type="text" placeholder="เลขบัญชี" style={inputStyle} value={registerForm.bankAccount} onChange={(e) => setRegisterForm({ ...registerForm, bankAccount: e.target.value })} className="col-span-2" />
              <input type="password" placeholder="รหัสผ่าน" style={inputStyle} value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} />
              <input type="password" placeholder="ยืนยันรหัส" style={inputStyle} value={registerForm.confirmPassword} onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })} />
              <button type="submit" style={{ ...btnPrimary, background: "linear-gradient(to right, #22c55e, #16a34a)", color: "white" }} className="col-span-2" disabled={loading}>{loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}</button>
            </form>
            <div className="text-center mt-4 text-sm text-slate-400">
              มีบัญชีแล้ว? <button onClick={() => { setShowRegister(false); setShowLogin(true); }} className="text-green-500 font-bold hover:underline ml-1">เข้าสู่ระบบ</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

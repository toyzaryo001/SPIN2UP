"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import PlayerLayout from "@/components/PlayerLayout";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface GameCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string;
}

interface Game {
  id: number;
  name: string;
  slug: string;
  thumbnail?: string;
  isHot: boolean;
  isNew: boolean;
  provider?: { id: number; name: string; categoryId: number };
}

const gameGradients = [
  "linear-gradient(135deg, #FF6B6B, #FF8E53)",
  "linear-gradient(135deg, #667eea, #764ba2)",
  "linear-gradient(135deg, #f093fb, #f5576c)",
  "linear-gradient(135deg, #4facfe, #00f2fe)",
  "linear-gradient(135deg, #43e97b, #38f9d7)",
  "linear-gradient(135deg, #fa709a, #fee140)",
];

const quickLinks = [
  { label: "แชร์รับรายได้", icon: "👥", color: "#4FC3F7", path: "/referral" },
  { label: "ค่าคอม 4 ชั้น", icon: "🎁", color: "#FFB74D", path: "/commission" },
  { label: "คืนยอดเสีย", icon: "💰", color: "#F06292", path: "/cashback" },
  { label: "VIP", icon: "👑", color: "#BA68C8", path: "/rank" },
];

const thBanks = [
  { value: "KBANK", label: "กสิกรไทย (KBANK)" },
  { value: "SCB", label: "ไทยพาณิชย์ (SCB)" },
  { value: "BBL", label: "กรุงเทพ (BBL)" },
  { value: "KTB", label: "กรุงไทย (KTB)" },
  { value: "TTB", label: "ทหารไทยธนชาต (TTB)" },
  { value: "BAY", label: "กรุงศรี (BAY)" },
  { value: "GSB", label: "ออมสิน (GSB)" },
  { value: "BAAC", label: "ธ.ก.ส. (BAAC)" },
  { value: "GHB", label: "อาคารสงเคราะห์ (GHB)" },
  { value: "CIMB", label: "ซีไอเอ็มบี (CIMB)" },
  { value: "UOB", label: "ยูโอบี (UOB)" },
  { value: "TISCO", label: "ทิสโก้ (TISCO)" },
  { value: "KKP", label: "เกียรตินาคินภัทร (KKP)" },
  { value: "LH", label: "แลนด์ แอนด์ เฮ้าส์ (LH)" },
  { value: "ICBC", label: "ไอซีบีซี (ICBC)" },
  { value: "SME", label: "SME Bank" },
  { value: "ISBT", label: "อิสลามแห่งประเทศไทย (ISBT)" },
  { value: "TRUEWALLET", label: "True Wallet" },
];

// Wrapper component to handle Suspense
export default function HomePage() {
  return (
    <Suspense fallback={<PlayerLayout><div style={{ textAlign: "center", padding: "40px" }}>กำลังโหลด...</div></PlayerLayout>}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(false);

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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loginForm, setLoginForm] = useState({ phone: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    fullName: "", phone: "", bankName: "KBANK", bankAccount: "", password: "", confirmPassword: "", lineId: "", referrer: "",
  });
  const [user, setUser] = useState<any>(null);

  // Check login status
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

  // Game data from API
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, gameRes] = await Promise.all([
          axios.get(`${API_URL}/public/categories`),
          axios.get(`${API_URL}/public/games`)
        ]);
        if (Array.isArray(catRes.data)) setCategories(catRes.data);
        if (Array.isArray(gameRes.data)) setGames(gameRes.data);
      } catch (err) {
        console.error("Failed to fetch games", err);
      } finally {
        setGamesLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredGames = selectedCategory ? games.filter(g => g.provider?.categoryId === selectedCategory) : games;

  /* CONFIG FETCHING */
  const [config, setConfig] = useState({ prefix: 'check24m', name: 'CHECK24M', protocol: 'https' });
  const [referralLink, setReferralLink] = useState('https://check24m.com/?prefix=check24m&action=register&refer_code=...');

  useEffect(() => {
    const fetchConfig = async () => {
      const hostname = window.location.hostname;

      const applyFallback = () => {
        const parts = hostname.split('.');
        if (parts.length >= 2) {
          const mainDomain = parts[parts.length - 2].toLowerCase();
          if (mainDomain !== 'localhost') {
            const newConfig = { prefix: mainDomain, name: mainDomain.toUpperCase() };
            setConfig({ ...newConfig, protocol: window.location.protocol.replace(':', '') });
            setReferralLink(`${window.location.protocol}//${window.location.host}/?prefix=${newConfig.prefix}&action=register&refer_code=...`);
          }
        }
      };

      try {
        const { default: axios } = await import("axios");
        const res = await axios.get(`${API_URL}/auth/config?domain=${hostname}`);

        if (res.data.success) {
          const newConfig = {
            prefix: res.data.data.code?.toLowerCase() || 'prefix',
            name: res.data.data.name
          };
          setConfig({ ...newConfig, protocol: window.location.protocol.replace(':', '') });
          setReferralLink(`${window.location.protocol}//${window.location.host}/?prefix=${newConfig.prefix}&action=register&refer_code=...`);
        } else {
          applyFallback();
        }
      } catch (error) {
        console.error("Config fetch error", error);
        applyFallback();
      }
    };
    fetchConfig();
  }, []);

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

    // Custom validation in Thai
    if (!registerForm.fullName.trim()) {
      setError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    if (!registerForm.phone.trim()) {
      setError("กรุณากรอกเบอร์โทรศัพท์");
      return;
    }
    if (!registerForm.bankAccount.trim()) {
      setError("กรุณากรอกเลขบัญชีธนาคาร");
      return;
    }
    if (!registerForm.password) {
      setError("กรุณากรอกรหัสผ่าน");
      return;
    }
    if (registerForm.password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/register`, {
        fullName: registerForm.fullName,
        phone: registerForm.phone,
        bankName: registerForm.bankName,
        bankAccount: registerForm.bankAccount,
        password: registerForm.password,
        confirmPassword: registerForm.confirmPassword,
        lineId: registerForm.lineId || undefined,
        referrerCode: registerForm.referrer || undefined,
      });
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

  const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px"
  };

  const modalStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.98)", borderRadius: "20px", padding: "24px", width: "100%",
    maxWidth: "360px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", position: "relative"
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", border: "2px solid #E8E8E8", borderRadius: "10px",
    fontSize: "14px", marginBottom: "10px", outline: "none", background: "#FAFAFA"
  };

  const btnPrimary: React.CSSProperties = {
    width: "100%", padding: "12px", background: "linear-gradient(135deg, #FF9500, #FF7A00)",
    color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 700, cursor: "pointer"
  };

  return (
    <PlayerLayout>
      {/* LOGIN MODAL */}
      {showLogin && (
        <div style={overlayStyle} onClick={() => setShowLogin(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowLogin(false)} style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#999" }}>✕</button>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <span style={{ fontSize: "48px" }}>🐕</span>
              <h2 style={{ marginTop: "6px", fontSize: "20px", fontWeight: 800, color: "#FF9500" }}>เข้าสู่ระบบ</h2>
            </div>
            {error && <div style={{ background: "#FFEBEE", color: "#C62828", padding: "10px", borderRadius: "8px", marginBottom: "12px", fontSize: "13px" }}>{error}</div>}
            {success && <div style={{ background: "#E8F5E9", color: "#2E7D32", padding: "10px", borderRadius: "8px", marginBottom: "12px", fontSize: "13px" }}>{success}</div>}
            <form onSubmit={handleLogin}>
              <input type="tel" placeholder="📱 เบอร์โทรศัพท์" style={inputStyle} value={loginForm.phone} onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })} required />
              <input type="password" placeholder="🔒 รหัสผ่าน" style={inputStyle} value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
              <button type="submit" style={btnPrimary} disabled={loading}>{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
            </form>
            <p style={{ textAlign: "center", marginTop: "12px", fontSize: "13px", color: "#666" }}>
              ยังไม่มีบัญชี? <button onClick={() => { setShowLogin(false); setShowRegister(true); setError(""); }} style={{ color: "#FF9500", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>สมัครสมาชิก</button>
            </p>
          </div>
        </div>
      )}

      {/* REGISTER MODAL */}
      {showRegister && (
        <div style={overlayStyle} onClick={() => setShowRegister(false)}>
          <div style={{ ...modalStyle, maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowRegister(false)} style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#999" }}>✕</button>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <span style={{ fontSize: "48px" }}>🐕</span>
              <h2 style={{ marginTop: "6px", fontSize: "20px", fontWeight: 800, color: "#FF9500" }}>สมัครสมาชิก</h2>
            </div>
            {error && <div style={{ background: "#FFEBEE", color: "#C62828", padding: "10px", borderRadius: "8px", marginBottom: "12px", fontSize: "13px" }}>{error}</div>}
            <form onSubmit={handleRegister}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <input type="text" placeholder="👤 ชื่อ-นามสกุล" style={inputStyle} value={registerForm.fullName} onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })} />
                <input type="tel" placeholder="📱 เบอร์โทรศัพท์" style={inputStyle} value={registerForm.phone} onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })} />
                <select style={{ ...inputStyle, cursor: "pointer" }} value={registerForm.bankName} onChange={(e) => setRegisterForm({ ...registerForm, bankName: e.target.value })}>
                  {thBanks.map((bank) => (<option key={bank.value} value={bank.value}>{bank.label}</option>))}
                </select>
                <input type="text" placeholder="💳 เลขบัญชีธนาคาร" style={inputStyle} value={registerForm.bankAccount} onChange={(e) => setRegisterForm({ ...registerForm, bankAccount: e.target.value })} />
                <input type="password" placeholder="🔒 รหัสผ่าน" style={inputStyle} value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} />
                <input type="password" placeholder="🔒 ยืนยันรหัสผ่าน" style={inputStyle} value={registerForm.confirmPassword} onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })} />
                <input type="text" placeholder="💬 ID LINE (ถ้ามี)" style={inputStyle} value={registerForm.lineId} onChange={(e) => setRegisterForm({ ...registerForm, lineId: e.target.value })} />
                <input type="text" placeholder="👥 รหัสแนะนำ (ถ้ามี)" style={inputStyle} value={registerForm.referrer} onChange={(e) => setRegisterForm({ ...registerForm, referrer: e.target.value })} />
              </div>
              <button type="submit" style={{ ...btnPrimary, marginTop: "8px" }} disabled={loading}>{loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}</button>
            </form>
            <p style={{ textAlign: "center", marginTop: "12px", fontSize: "13px", color: "#666" }}>
              มีบัญชีแล้ว? <button onClick={() => { setShowRegister(false); setShowLogin(true); setError(""); }} style={{ color: "#FF9500", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>เข้าสู่ระบบ</button>
            </p>
          </div>
        </div>
      )}

      {/* QUICK LINKS ROW */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {quickLinks.map((item) => (
          <button
            key={item.label}
            onClick={() => item.path && router.push(item.path)}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div
              className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg"
              style={{ background: item.color }}
            >
              {item.icon}
            </div>
            <span className="text-[10px] md:text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* REFERRAL SECTION */}
        <div className="bg-white/95 backdrop-blur rounded-2xl p-4 shadow-lg border border-white/20">
          <p className="text-xs md:text-sm text-gray-600 font-bold mb-2 flex items-center gap-2">
            🔗 ลิงก์ชวนเพื่อน
          </p>
          <div className="flex gap-2">
            <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 truncate font-mono">
              {referralLink}
            </div>
            <button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs md:text-sm font-bold px-4 py-2 rounded-lg shadow-md transition-all whitespace-nowrap">
              คัดลอก
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white/95 backdrop-blur rounded-2xl p-4 shadow-lg border border-white/20 flex items-center gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
            <input
              type="text"
              placeholder="ค้นหาเกมที่นี่..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#FFD700] outline-none transition-all"
            />
          </div>
          <button className="bg-gradient-to-r from-[#FFD700] to-[#FFC000] text-[#0D1117] font-bold text-sm px-6 py-2 rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
            ค้นหา
          </button>
        </div>
      </div>

      <div className="bg-white/95 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row gap-4 md:gap-6">
        {/* LEFT SIDEBAR - Dynamic Categories */}
        <div className="w-full md:w-48 flex-shrink-0 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 flex flex-col md:flex-row items-center gap-2 p-3 rounded-xl transition-all ${!selectedCategory
              ? "bg-orange-500/10 border border-orange-500/30 text-orange-500"
              : "hover:bg-gray-100 text-gray-600"
              }`}
          >
            <span className="text-xl">🏠</span>
            <span className="text-xs md:text-sm font-bold">ทั้งหมด</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 flex flex-col md:flex-row items-center gap-2 p-3 rounded-xl transition-all ${selectedCategory === cat.id
                ? "bg-orange-500/10 border border-orange-500/30 text-orange-500"
                : "hover:bg-gray-100 text-gray-600"
                }`}
            >
              {cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('data:') || cat.icon.startsWith('/')) ? (
                <img src={cat.icon} alt="" className="w-6 h-6 rounded-md object-cover" />
              ) : (
                <span className="text-xl">{cat.icon || "🎮"}</span>
              )}
              <span className="text-xs md:text-sm font-bold whitespace-nowrap">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* GAME GRID - Dynamic from API */}
        <div className="flex-1">
          <h2 className="text-sm md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            🎰 {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : "รวมเกมฮิต"}
          </h2>
          {gamesLoading ? (
            <div className="text-center p-8 text-gray-400">กำลังโหลด...</div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center p-8 text-gray-400">ยังไม่มีเกม</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {filteredGames.map((game, i) => (
                <div key={game.id} className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer bg-gray-100">
                  <div
                    className="aspect-square w-full relative group-hover:scale-110 transition-transform duration-500"
                    style={{
                      background: game.thumbnail ? `url(${game.thumbnail}) center/cover` : gameGradients[i % gameGradients.length],
                    }}
                  >
                    {!game.thumbnail && (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl opacity-40">🎮</span>
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                    {game.isHot && (
                      <span className="bg-red-500 text-white text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                        🔥 HOT
                      </span>
                    )}
                    {game.isNew && (
                      <span className="bg-blue-500 text-white text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                        NEW
                      </span>
                    )}
                  </div>

                  {/* Fav Button */}
                  <button className="absolute top-2 right-2 w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/90 hover:bg-white text-red-500 flex items-center justify-center shadow-sm z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    ❤️
                  </button>

                  {/* Overlay Content */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-8 text-white translate-y-2 group-hover:translate-y-0 transition-transform">
                    <p className="text-[10px] md:text-sm font-bold truncate leading-tight">{game.name}</p>
                    {game.provider && <p className="text-[9px] md:text-xs text-gray-300 opacity-80">{game.provider.name}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PlayerLayout>
  );
}

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
        {quickLinks.map((item) => (
          <button
            key={item.label}
            onClick={() => item.path && router.push(item.path)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              background: "none",
              border: "none",
              cursor: "pointer"
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                background: item.color,
                boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
              }}
            >
              {item.icon}
            </div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#ccc" }}>{item.label}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: "12px", marginBottom: "20px" }}>
        {/* REFERRAL SECTION */}
        <div style={{
          background: "rgba(22, 27, 34, 0.6)",
          borderRadius: "16px",
          padding: "16px",
          border: "1px solid rgba(255, 255, 255, 0.05)"
        }}>
          <p style={{ fontSize: "12px", color: "#FFD700", fontWeight: 700, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            🔗 ลิงก์ชวนเพื่อน
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{
              flex: 1,
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "12px",
              color: "#aaa",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontFamily: "monospace"
            }}>
              {referralLink}
            </div>
            <button style={{
              background: "linear-gradient(135deg, #FF9500, #FF7A00)",
              color: "white",
              border: "none",
              fontSize: "12px",
              fontWeight: 700,
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer"
            }}>
              คัดลอก
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div style={{
          background: "rgba(22, 27, 34, 0.6)",
          borderRadius: "16px",
          padding: "12px",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          gap: "10px",
          alignItems: "center"
        }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "16px" }}>🔍</span>
            <input
              type="text"
              placeholder="ค้นหาเกม..."
              style={{
                width: "100%",
                padding: "8px 8px 8px 36px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                fontSize: "13px",
                color: "white",
                outline: "none"
              }}
            />
          </div>
          <button style={{
            background: "linear-gradient(135deg, #FFD700, #FFC000)",
            color: "#0D1117",
            border: "none",
            fontWeight: 700,
            fontSize: "13px",
            padding: "8px 16px",
            borderRadius: "10px",
            cursor: "pointer"
          }}>
            ค้นหา
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* CATEGORIES - Horizontal Scroll */}
        <div style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "4px",
          scrollbarWidth: "none"
        }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "50px",
              border: !selectedCategory ? "1px solid #FFD700" : "1px solid rgba(255,255,255,0.1)",
              background: !selectedCategory ? "#FFD700" : "rgba(22, 27, 34, 0.6)",
              color: !selectedCategory ? "#0D1117" : "#888",
              cursor: "pointer"
            }}
          >
            <span style={{ fontSize: "16px" }}>🏠</span>
            <span style={{ fontSize: "12px", fontWeight: 700 }}>ทั้งหมด</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "50px",
                border: selectedCategory === cat.id ? "1px solid #FFD700" : "1px solid rgba(255,255,255,0.1)",
                background: selectedCategory === cat.id ? "#FFD700" : "rgba(22, 27, 34, 0.6)",
                color: selectedCategory === cat.id ? "#0D1117" : "#888",
                cursor: "pointer"
              }}
            >
              {cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('data:') || cat.icon.startsWith('/')) ? (
                <img src={cat.icon} alt="" style={{ width: "20px", height: "20px", borderRadius: "4px", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "16px" }}>{cat.icon || "🎮"}</span>
              )}
              <span style={{ fontSize: "12px", fontWeight: 700 }}>{cat.name}</span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "white", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            🎰 {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : "รวมเกมฮิต"}
          </h2>
          {gamesLoading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#666" }}>กำลังโหลด...</div>
          ) : filteredGames.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#666" }}>ยังไม่มีเกม</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {filteredGames.map((game, i) => (
                <div key={game.id} style={{
                  position: "relative",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                  background: "#161B22",
                  border: "1px solid rgba(255,255,255,0.05)",
                  cursor: "pointer"
                }}>
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1/1",
                      background: game.thumbnail ? `url(${game.thumbnail}) center/cover` : gameGradients[i % gameGradients.length],
                      position: "relative"
                    }}
                  >
                    {!game.thumbnail && (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: "32px", opacity: 0.4 }}>🎮</span>
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div style={{ position: "absolute", top: "6px", left: "6px", display: "flex", flexDirection: "column", gap: "4px", zIndex: 10 }}>
                    {game.isHot && (
                      <span style={{ background: "#FF4444", color: "white", fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px" }}>
                        🔥 HOT
                      </span>
                    )}
                    {game.isNew && (
                      <span style={{ background: "#2196F3", color: "white", fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px" }}>
                        NEW
                      </span>
                    )}
                  </div>

                  {/* Fav Button */}
                  <button className="absolute top-2 right-2 w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/90 hover:bg-white text-red-500 flex items-center justify-center shadow-sm z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    ❤️
                  </button>

                  {/* Overlay Content */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
                    padding: "30px 8px 8px 8px"
                  }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{game.name}</p>
                    {game.provider && <p style={{ fontSize: "9px", color: "#aaa" }}>{game.provider.name}</p>}
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

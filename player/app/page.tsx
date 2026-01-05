"use client";

import { useState, useEffect } from "react";
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

export default function HomePage() {
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
      <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "12px" }}>
        {quickLinks.map((item) => (
          <button
            key={item.label}
            onClick={() => item.path && router.push(item.path)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              background: "transparent",
              border: "none",
              cursor: "pointer"
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: item.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
              }}
            >
              {item.icon}
            </div>
            <span style={{ fontSize: "10px", color: "#444", fontWeight: 600 }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* REFERRAL SECTION */}
      <div style={{
        background: "rgba(255,255,255,0.95)",
        borderRadius: "16px",
        padding: "14px",
        marginBottom: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
      }}>
        <p style={{ fontSize: "13px", color: "#555", marginBottom: "8px", fontWeight: 600 }}>🔗 ลิงก์ชวนเพื่อน</p>
        <div style={{
          background: "#E3F2FD",
          padding: "10px 12px",
          borderRadius: "10px",
          fontSize: "11px",
          color: "#1565C0",
          marginBottom: "10px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          border: "1px solid #BBDEFB"
        }}>
          https://golden456.co/?prefix=golden456&action=register&refer_code=...
        </div>
        <button style={{
          width: "100%",
          background: "linear-gradient(135deg, #FF9500, #FF7A00)",
          color: "white",
          border: "none",
          padding: "12px",
          borderRadius: "25px",
          fontWeight: 700,
          fontSize: "14px",
          cursor: "pointer",
          boxShadow: "0 4px 15px rgba(255,149,0,0.3)"
        }}>
          » กดเพื่อคัดลอกลิ้งชวนเพื่อน «
        </button>
      </div>

      {/* SEARCH BAR */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "18px" }}>🐕</span>
          <input
            type="text"
            placeholder="ค้นหาเกมที่นี่"
            style={{
              width: "100%",
              padding: "12px 12px 12px 44px",
              border: "none",
              borderRadius: "25px",
              fontSize: "14px",
              background: "white",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)"
            }}
          />
        </div>
        <button style={{
          background: "linear-gradient(135deg, #FF9500, #FF7A00)",
          color: "white",
          border: "none",
          padding: "0 24px",
          borderRadius: "25px",
          fontWeight: 700,
          fontSize: "14px",
          cursor: "pointer",
          boxShadow: "0 4px 15px rgba(255,149,0,0.3)"
        }}>
          ค้นหา
        </button>
      </div>

      {/* SIDEBAR + GAME GRID */}
      <div style={{
        background: "rgba(255,255,255,0.95)",
        borderRadius: "16px",
        padding: "12px",
        display: "flex",
        gap: "10px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
      }}>
        {/* LEFT SIDEBAR - Dynamic Categories */}
        <div style={{ width: "60px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              padding: "8px 4px",
              background: !selectedCategory ? "rgba(255,149,0,0.15)" : "transparent",
              border: !selectedCategory ? "1px solid rgba(255,149,0,0.3)" : "none",
              borderRadius: "10px",
              cursor: "pointer"
            }}
          >
            <span style={{ fontSize: "18px" }}>🏠</span>
            <span style={{ fontSize: "9px", color: !selectedCategory ? "#FF9500" : "#666", fontWeight: 600 }}>ทั้งหมด</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3px",
                padding: "8px 4px",
                background: selectedCategory === cat.id ? "rgba(255,149,0,0.15)" : "transparent",
                border: selectedCategory === cat.id ? "1px solid rgba(255,149,0,0.3)" : "none",
                borderRadius: "10px",
                cursor: "pointer"
              }}
            >
              <span style={{ fontSize: "18px" }}>{cat.icon || "🎮"}</span>
              <span style={{ fontSize: "9px", color: selectedCategory === cat.id ? "#FF9500" : "#666", fontWeight: 600 }}>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* GAME GRID - Dynamic from API */}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#333", marginBottom: "10px" }}>
            🎰 {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : "รวมเกมฮิต"}
          </h2>
          {gamesLoading ? (
            <div style={{ textAlign: "center", padding: "24px", color: "#888" }}>กำลังโหลด...</div>
          ) : filteredGames.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px", color: "#888" }}>ยังไม่มีเกม</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {filteredGames.map((game, i) => (
                <div key={game.id} style={{ borderRadius: "12px", overflow: "hidden", boxShadow: "0 3px 12px rgba(0,0,0,0.12)", cursor: "pointer", position: "relative" }}>
                  <div style={{
                    aspectRatio: "1",
                    background: game.thumbnail ? `url(${game.thumbnail}) center/cover` : gameGradients[i % gameGradients.length],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative"
                  }}>
                    {!game.thumbnail && <span style={{ fontSize: "32px", opacity: 0.4 }}>🎮</span>}
                    {game.isHot && (
                      <span style={{ position: "absolute", top: "4px", left: "4px", background: "#FF4444", color: "white", fontSize: "7px", fontWeight: 700, padding: "2px 5px", borderRadius: "4px" }}>
                        🔥 HOT
                      </span>
                    )}
                    {game.isNew && (
                      <span style={{ position: "absolute", top: game.isHot ? "22px" : "4px", left: "4px", background: "#2196F3", color: "white", fontSize: "7px", fontWeight: 700, padding: "2px 5px", borderRadius: "4px" }}>
                        ✨ NEW
                      </span>
                    )}
                    <button style={{ position: "absolute", top: "4px", right: "4px", width: "22px", height: "22px", borderRadius: "50%", background: "white", border: "none", cursor: "pointer", fontSize: "10px", color: "#FF6B6B", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      ♥
                    </button>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", padding: "10px 6px 6px", color: "white" }}>
                      <p style={{ fontSize: "10px", fontWeight: 700, marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{game.name}</p>
                      {game.provider && <p style={{ fontSize: "8px", opacity: 0.8 }}>{game.provider.name}</p>}
                    </div>
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

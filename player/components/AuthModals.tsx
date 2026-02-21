"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import BankSelectDropdown from "@/components/BankSelectDropdown";

interface AuthModalsProps {
    showLogin: boolean;
    showRegister: boolean;
    onCloseLogin: () => void;
    onCloseRegister: () => void;
    onSwitchToRegister: () => void;
    onSwitchToLogin: () => void;
    onLoginSuccess?: (user: any) => void;
}

export default function AuthModals({
    showLogin, showRegister, onCloseLogin, onCloseRegister,
    onSwitchToRegister, onSwitchToLogin, onLoginSuccess
}: AuthModalsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [loginForm, setLoginForm] = useState({ phone: "", password: "" });
    const [registerForm, setRegisterForm] = useState({
        fullName: "", phone: "", bankName: "KBANK", bankAccount: "", password: "", confirmPassword: "", lineId: "", referrer: "",
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/auth/login`, loginForm);
            if (res.data.success) {
                localStorage.setItem("token", res.data.data.token);
                localStorage.setItem("user", JSON.stringify(res.data.data.user));
                onCloseLogin();
                if (onLoginSuccess) onLoginSuccess(res.data.data.user);
                router.replace("/");
            }
        } catch (err: any) {
            if (err.response?.status === 409 && err.response?.data?.code === 'DUPLICATE_LOGIN') {
                setError('⚠️ บัญชีนี้มีการใช้งานอยู่ ทั้งสองเซสชั่นถูกบังคับออก กรุณาเข้าสู่ระบบใหม่');
            } else {
                setError(err.response?.data?.message || "Login failed");
            }
        }
        finally { setLoading(false); }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (registerForm.password !== registerForm.confirmPassword) { setError("Passwords do not match"); return; }
        setLoading(true);
        try {
            const payload = { ...registerForm, referrerCode: registerForm.referrer };
            delete (payload as any).referrer;

            const res = await axios.post(`${API_URL}/auth/register`, payload);
            if (res.data.success) {
                onCloseRegister();
                onSwitchToLogin();
            }
        } catch (err: any) { setError(err.response?.data?.message || "Registration failed"); }
        finally { setLoading(false); }
    };

    return (
        <>
            {/* LOGIN MODAL */}
            {showLogin && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onCloseLogin}>
                    <div className="glass-card w-full max-w-md p-8 rounded-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={onCloseLogin} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24} /></button>

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
                            <button onClick={() => { onCloseLogin(); onSwitchToRegister(); }} className="text-yellow-500 font-bold hover:underline ml-1">สมัครสมาชิกที่นี่</button>
                        </div>
                    </div>
                </div>
            )}

            {/* REGISTER MODAL */}
            {showRegister && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onCloseRegister}>
                    <div className="glass-card w-full max-w-lg p-8 rounded-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                        <button onClick={onCloseRegister} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24} /></button>

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
                            มีบัญชีแล้ว? <button onClick={() => { onCloseRegister(); onSwitchToLogin(); }} className="text-green-500 font-bold hover:underline ml-1">เข้าสู่ระบบ</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

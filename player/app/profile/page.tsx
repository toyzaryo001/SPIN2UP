"use client";

import { useState, useEffect } from "react";
import PlayerLayout from "@/components/PlayerLayout";
import { LogOut, ChevronRight, Eye, EyeOff, X } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const BANK_NAMES: Record<string, string> = {
    KBANK: "กสิกรไทย (KBANK)",
    SCB: "ไทยพาณิชย์ (SCB)",
    KTB: "กรุงไทย (KTB)",
    BBL: "กรุงเทพ (BBL)",
    TMB: "ทหารไทยธนชาต (TTB)",
    GSB: "ออมสิน (GSB)",
    BAY: "กรุงศรี (BAY)",
};

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/?action=login");
                return;
            }

            const res = await axios.get(`${API_URL}/users/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setUser(res.data.data);
                localStorage.setItem("user", JSON.stringify(res.data.data));
            }
        } catch (error) {
            console.error("Fetch user error:", error);
            // Use localStorage fallback
            const userData = localStorage.getItem("user");
            if (userData && userData !== "undefined") {
                try {
                    setUser(JSON.parse(userData));
                } catch (e) {
                    router.push("/?action=login");
                }
            } else {
                router.push("/?action=login");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event('user-logout'));
        router.push("/");
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError("รหัสผ่านใหม่ไม่ตรงกัน");
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setPasswordError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
            return;
        }

        setPasswordLoading(true);
        try {
            const token = localStorage.getItem("token");
            await axios.put(`${API_URL}/users/me/password`, {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setPasswordSuccess(true);
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                setPasswordSuccess(false);
            }, 2000);
        } catch (error: any) {
            setPasswordError(error.response?.data?.message || "เกิดข้อผิดพลาด");
        } finally {
            setPasswordLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <PlayerLayout>
                <div style={{ paddingTop: "100px", textAlign: "center" }}>
                    <p style={{ color: "#888" }}>กำลังโหลด...</p>
                </div>
            </PlayerLayout>
        );
    }

    if (!user) {
        return (
            <PlayerLayout>
                <div style={{ paddingTop: "100px", textAlign: "center" }}>
                    <p style={{ color: "#888" }}>กรุณาเข้าสู่ระบบ...</p>
                </div>
            </PlayerLayout>
        );
    }

    return (
        <PlayerLayout>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Banner */}
                <div style={{
                    background: "linear-gradient(135deg, #FFD700 0%, #FFC000 100%)",
                    borderRadius: "16px",
                    padding: "20px",
                    color: "#0D1117",
                    boxShadow: "0 4px 20px rgba(255, 215, 0, 0.3)",
                    display: "flex", alignItems: "center", gap: "12px"
                }}>
                    <span style={{ fontSize: "40px" }}>👤</span>
                    <div>
                        <h1 style={{ fontSize: "22px", fontWeight: 900, margin: 0, textShadow: "1px 1px 2px rgba(0,0,0,0.1)" }}>โปรไฟล์ของฉัน</h1>
                        <p style={{ fontSize: "14px", opacity: 0.9, marginTop: "4px" }}>ข้อมูลบัญชีของคุณ</p>
                    </div>
                </div>

                {/* User Info Details */}
                <div style={{
                    background: "#21262D",
                    borderRadius: "16px",
                    padding: "20px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.1)"
                }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                        📋 ข้อมูลส่วนตัว
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <InfoRow label="ชื่อ-นามสกุล" value={user.fullName} />
                        <InfoRow label="Username" value={user.username} />
                        <InfoRow label="เบอร์โทรศัพท์" value={user.phone} />
                        <InfoRow label="LINE ID" value={user.lineId || "-"} />
                        <InfoRow label="รหัสชวนเพื่อน" value={user.referrerCode || "-"} highlight />
                    </div>
                </div>

                {/* Bank Info */}
                <div style={{
                    background: "#21262D",
                    borderRadius: "16px",
                    padding: "20px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.1)"
                }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                        💳 ข้อมูลธนาคาร
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <InfoRow label="ธนาคาร" value={BANK_NAMES[user.bankName] || user.bankName} />
                        <InfoRow label="เลขบัญชี" value={user.bankAccount} />
                    </div>
                </div>

                {/* Account Info */}
                <div style={{
                    background: "#21262D",
                    borderRadius: "16px",
                    padding: "20px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.1)"
                }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                        📊 ข้อมูลบัญชี
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <InfoRow label="ยอดเงิน" value={`฿${Number(user.balance || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`} />
                        <InfoRow label="โบนัส" value={`฿${Number(user.bonusBalance || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`} />
                        <InfoRow label="สถานะ" value={user.status === 'ACTIVE' ? '✅ ใช้งานปกติ' : '⛔ ระงับ'} />
                        <InfoRow label="สมัครเมื่อ" value={user.createdAt ? formatDate(user.createdAt) : "-"} />
                        <InfoRow label="เข้าสู่ระบบล่าสุด" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "-"} />
                    </div>
                </div>

                {/* Change Password Button */}
                <div style={{
                    background: "#21262D",
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.1)"
                }}>
                    <button
                        onClick={() => setShowPasswordModal(true)}
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "16px",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer"
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ fontSize: "22px" }}>🔐</span>
                            <span style={{ fontWeight: 600, color: "#FFFFFF", fontSize: "14px" }}>เปลี่ยนรหัสผ่าน</span>
                        </div>
                        <ChevronRight size={20} color="#8B949E" />
                    </button>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    style={{
                        width: "100%",
                        background: "#21262D",
                        borderRadius: "14px",
                        padding: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        cursor: "pointer",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.15)"
                    }}
                >
                    <LogOut size={20} color="#EF4444" />
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#EF4444" }}>ออกจากระบบ</span>
                </button>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 100,
                    padding: "20px"
                }}>
                    <div style={{
                        background: "#21262D",
                        borderRadius: "20px",
                        padding: "24px",
                        width: "100%",
                        maxWidth: "400px",
                        border: "1px solid rgba(255,255,255,0.1)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>🔐 เปลี่ยนรหัสผ่าน</h3>
                            <button onClick={() => setShowPasswordModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                                <X size={24} color="#8B949E" />
                            </button>
                        </div>

                        {passwordSuccess ? (
                            <div style={{ textAlign: "center", padding: "40px 0" }}>
                                <span style={{ fontSize: "48px" }}>✅</span>
                                <p style={{ fontSize: "16px", fontWeight: 600, color: "#22c55e", marginTop: "12px" }}>เปลี่ยนรหัสผ่านสำเร็จ!</p>
                            </div>
                        ) : (
                            <form onSubmit={handleChangePassword}>
                                {passwordError && (
                                    <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "12px", borderRadius: "10px", marginBottom: "16px", fontSize: "14px" }}>
                                        {passwordError}
                                    </div>
                                )}

                                <div style={{ marginBottom: "16px" }}>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#8B949E", marginBottom: "6px" }}>รหัสผ่านปัจจุบัน</label>
                                    <div style={{ position: "relative" }}>
                                        <input
                                            type={showCurrentPassword ? "text" : "password"}
                                            required
                                            value={passwordForm.currentPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                            style={{
                                                width: "100%",
                                                padding: "12px",
                                                paddingRight: "44px",
                                                border: "1px solid #ddd",
                                                borderRadius: "10px",
                                                fontSize: "14px",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}>
                                            {showCurrentPassword ? <EyeOff size={18} color="#888" /> : <Eye size={18} color="#888" />}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ marginBottom: "16px" }}>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#8B949E", marginBottom: "6px" }}>รหัสผ่านใหม่</label>
                                    <div style={{ position: "relative" }}>
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            required
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                            style={{
                                                width: "100%",
                                                padding: "12px",
                                                paddingRight: "44px",
                                                border: "1px solid #ddd",
                                                borderRadius: "10px",
                                                fontSize: "14px",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}>
                                            {showNewPassword ? <EyeOff size={18} color="#888" /> : <Eye size={18} color="#888" />}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ marginBottom: "20px" }}>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#8B949E", marginBottom: "6px" }}>ยืนยันรหัสผ่านใหม่</label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "12px",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: "10px",
                                            fontSize: "14px",
                                            boxSizing: "border-box",
                                            background: "rgba(255,255,255,0.05)",
                                            color: "#FFFFFF"
                                        }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    style={{
                                        width: "100%",
                                        background: "linear-gradient(135deg, #FFD700, #FFC000)",
                                        color: "#0D1117",
                                        padding: "14px",
                                        border: "none",
                                        borderRadius: "12px",
                                        fontSize: "16px",
                                        fontWeight: 700,
                                        cursor: passwordLoading ? "not-allowed" : "pointer",
                                        opacity: passwordLoading ? 0.7 : 1
                                    }}
                                >
                                    {passwordLoading ? "กำลังดำเนินการ..." : "เปลี่ยนรหัสผ่าน"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </PlayerLayout>
    );
}

// Info Row Component
function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px",
            background: highlight ? "rgba(255, 215, 0, 0.1)" : "rgba(255,255,255,0.05)",
            borderRadius: "10px",
            border: highlight ? "1px solid rgba(255, 215, 0, 0.3)" : "1px solid rgba(255,255,255,0.1)"
        }}>
            <span style={{ fontSize: "13px", color: "#8B949E" }}>{label}</span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: highlight ? "#FFD700" : "#FFFFFF" }}>{value}</span>
        </div>
    );
}

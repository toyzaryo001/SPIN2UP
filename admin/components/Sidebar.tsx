"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Users,
  CreditCard,
  Wallet,
  FileText,
  Bell,
  Tag,
  Settings,
  UserCog,
  ShieldCheck,
  HandCoins,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import api from "@/lib/api";

type PermissionCheck = {
  category: string;
  action: string | string[];
};

type SubMenuItem = {
  label: string;
  href: string;
  permissionCheck?: PermissionCheck;
};

type MenuItem = {
  icon: any;
  label: string;
  href?: string;
  submenu?: SubMenuItem[];
  permissionKey?: string;
};

type PermissionValue = boolean | { view?: boolean; manage?: boolean };
type Permissions = Record<string, Record<string, PermissionValue>>;

const allMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "แดชบอร์ด", href: "/" },
  {
    icon: Users,
    label: "สมาชิก",
    permissionKey: "members",
    submenu: [
      { label: "จัดการสมาชิก", href: "/members", permissionCheck: { category: "members", action: "list" } },
      { label: "สมัครสมาชิก", href: "/members/register", permissionCheck: { category: "members", action: "register" } },
      { label: "ประวัติการแก้ไข", href: "/members/history", permissionCheck: { category: "members", action: "history" } },
    ],
  },
  {
    icon: HandCoins,
    label: "จัดการ Manual",
    permissionKey: "manual",
    submenu: [
      { label: "ฝาก-ถอน (manual)", href: "/manual", permissionCheck: { category: "manual", action: ["deposit", "withdraw"] } },
      { label: "รายการรถถอน", href: "/manual/withdrawals", permissionCheck: { category: "manual", action: "withdrawals" } },
      { label: "ประวัติรายการ", href: "/manual/history", permissionCheck: { category: "manual", action: "history" } },
    ],
  },
  {
    icon: Wallet,
    label: "รายการธุรกรรม",
    permissionKey: "reports",
    submenu: [
      { label: "รายงานฝากเงิน", href: "/reports/deposit", permissionCheck: { category: "reports", action: "deposits" } },
      { label: "รายงานถอนเงิน", href: "/reports/withdraw", permissionCheck: { category: "reports", action: "withdrawals" } },
      { label: "ฝากล้มเหลว", href: "/reports/failed-deposit", permissionCheck: { category: "reports", action: "failed_deposits" } },
      { label: "ถอนล้มเหลว", href: "/reports/failed-withdraw", permissionCheck: { category: "reports", action: "failed_withdrawals" } },
    ],
  },
  {
    icon: FileText,
    label: "รายงานต่างๆ",
    permissionKey: "reports",
    submenu: [
      { label: "รายงานสมัครใหม่", href: "/reports/new-users", permissionCheck: { category: "reports", action: "new_users" } },
      { label: "รายงานสมัครใหม่ฝากเงิน", href: "/reports/new-users-deposit", permissionCheck: { category: "reports", action: "new_users_deposit" } },
      { label: "รายงานสมัครไม่ฝาก", href: "/reports/new-users-no-deposit", permissionCheck: { category: "reports", action: "new_users_no_deposit" } },
      { label: "รายงานโบนัส", href: "/reports/bonus", permissionCheck: { category: "reports", action: "bonus" } },
      { label: "รายงานกำไรขาดทุน", href: "/reports/profit-loss", permissionCheck: { category: "reports", action: "profit" } },
      { label: "รายงานยูสไม่ออนไลน์", href: "/reports/inactive-users", permissionCheck: { category: "reports", action: "inactive_users" } },
      { label: "รายงานแพ้-ชนะ", href: "/reports/win-lose", permissionCheck: { category: "reports", action: "win_lose" } },
    ],
  },
  {
    icon: CreditCard,
    label: "บัญชีหน้าเว็บ",
    permissionKey: "settings",
    submenu: [
      { label: "บัญชีธนาคาร", href: "/bank-accounts", permissionCheck: { category: "settings", action: "banks" } },
      { label: "TrueMoney", href: "/bank-accounts/truemoney", permissionCheck: { category: "settings", action: "truemoney" } },
      { label: "LogoBank", href: "/bank-accounts/logobank", permissionCheck: { category: "settings", action: "logobank" } },
      { label: "ระบบชำระเงิน", href: "/payment", permissionCheck: { category: "settings", action: "payment" } },
    ],
  },
  {
    icon: Settings,
    label: "ตั้งค่า",
    permissionKey: "settings",
    submenu: [
      { label: "ตั้งค่าทั่วไป", href: "/settings", permissionCheck: { category: "settings", action: "general" } },
      { label: "ควบคุมฟีเจอร์", href: "/settings/features", permissionCheck: { category: "settings", action: "features" } },
      { label: "ช่องทางติดต่อ", href: "/settings/contacts", permissionCheck: { category: "settings", action: "contacts" } },
      { label: "แจ้งเตือน (Line/TG)", href: "/settings/notify", permissionCheck: { category: "settings", action: "notify" } },
    ],
  },
  {
    icon: Bell,
    label: "แจ้งเตือน/ประกาศ",
    permissionKey: "banners",
    submenu: [
      { label: "แบนเนอร์", href: "/notifications/banners", permissionCheck: { category: "banners", action: "banners" } },
      { label: "ประกาศ (Popup)", href: "/notifications/announcements", permissionCheck: { category: "banners", action: "announcements" } },
    ],
  },
  {
    icon: Tag,
    label: "โปรโมชั่น",
    permissionKey: "promotions",
    submenu: [
      { label: "จัดการโปรโมชั่น", href: "/promotions", permissionCheck: { category: "promotions", action: "list" } },
      { label: "ประวัติการรับโปร", href: "/promotions/history", permissionCheck: { category: "promotions", action: "list" } },
    ],
  },
  {
    icon: Tag,
    label: "กิจกรรม",
    permissionKey: "activities",
    submenu: [
      { label: "ตั้งค่ายอดเสีย", href: "/activities/cashback", permissionCheck: { category: "activities", action: "cashback" } },
      { label: "ตั้งค่าฝากสะสม", href: "/activities/streak", permissionCheck: { category: "activities", action: "streak" } },
      { label: "ตั้งค่าคอมมิชชั่น", href: "/activities/commission", permissionCheck: { category: "activities", action: "commission" } },
      { label: "ประวัติการรับรางวัล", href: "/activities/history", permissionCheck: { category: "activities", action: "history" } },
      { label: "จัดการแนะนำเพื่อน", href: "/activities/referral", permissionCheck: { category: "activities", action: "referral" } },
      { label: "จัดการ Rank", href: "/activities/ranks", permissionCheck: { category: "activities", action: "ranks" } },
    ],
  },
  {
    icon: UserCog,
    label: "จัดการ Agent",
    permissionKey: "agents",
    submenu: [
      { label: "ตั้งค่า Agent", href: "/agents", permissionCheck: { category: "agents", action: "settings" } },
      { label: "ดึงข้อมูลเกม", href: "/agents/import", permissionCheck: { category: "agents", action: "import" } },
      { label: "หมวดหมู่เกม", href: "/agents/categories", permissionCheck: { category: "agents", action: "categories" } },
      { label: "ค่ายเกม", href: "/agents/providers", permissionCheck: { category: "agents", action: "providers" } },
      { label: "จัดการเกม", href: "/agents/games", permissionCheck: { category: "agents", action: "games" } },
      { label: "ตั้งค่าบอร์ดเกม (Mix)", href: "/agents/mix-board", permissionCheck: { category: "agents", action: "mix_board" } },
      { label: "ทดสอบเชื่อมต่อ", href: "/agents/connection-test", permissionCheck: { category: "agents", action: "connection_test" } },
    ],
  },
  {
    icon: ShieldCheck,
    label: "พนักงาน",
    permissionKey: "staff",
    submenu: [
      { label: "จัดการแอดมิน", href: "/staff/list", permissionCheck: { category: "staff", action: "admins" } },
      { label: "สิทธิ์การเข้าถึง", href: "/staff/roles", permissionCheck: { category: "staff", action: "roles" } },
      { label: "ประวัติแอดมิน", href: "/staff/logs", permissionCheck: { category: "staff", action: "logs" } },
    ],
  },
];

let sidebarScrollPosition = 0;

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [brandName, setBrandName] = useState("ADMIN");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({ pendingWithdraw: 0, unmatchedDeposit: 0 });
  const [mounted, setMounted] = useState(false);

  const hasSpecificPermission = (category: string, action: string) => {
    if (isSuperAdmin) return true;
    const perm = permissions?.[category]?.[action];
    if (!perm) return false;
    if (typeof perm === "boolean") return perm === true;
    return !!perm.view || !!perm.manage;
  };

  const canAccessSubmenu = (sub: SubMenuItem) => {
    if (isSuperAdmin) return true;
    if (!sub.permissionCheck) return true;
    const actions = Array.isArray(sub.permissionCheck.action)
      ? sub.permissionCheck.action
      : [sub.permissionCheck.action];
    return actions.some((action) => hasSpecificPermission(sub.permissionCheck!.category, action));
  };

  const hasAnyPermissionIn = (key: string) => {
    if (isSuperAdmin) return true;
    if (!permissions || !permissions[key]) return false;
    return Object.values(permissions[key]).some((value) => {
      if (typeof value === "boolean") return value === true;
      if (value && typeof value === "object") return !!value.view || !!value.manage;
      return false;
    });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const permRes = await api.get("/admin/me");
        if (permRes.data.success && permRes.data.data) {
          const adminData = permRes.data.data;
          setPermissions(adminData.permissions || {});
          setIsSuperAdmin(adminData.isSuperAdmin === true || adminData.role?.name === "SUPER_ADMIN");
          console.log("[Sidebar] Admin Access:", {
            isSuperAdmin: adminData.isSuperAdmin,
            permissions: adminData.permissions,
          });
        }

        const hostname = window.location.hostname;
        const configRes = await api.get(`/auth/config?domain=${hostname}`);
        if (configRes.data.success && configRes.data.data) {
          const siteName = configRes.data.data.name;
          setBrandName(siteName ? `${siteName} ADMIN` : "ADMIN");
          setLogoUrl(configRes.data.data.logo || null);
        } else {
          setBrandName("ADMIN");
        }
      } catch (error) {
        console.error("Failed to fetch sidebar data:", error);
        setPermissions({});
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    const fetchStats = async () => {
      try {
        const res = await api.get("/admin/transactions/stats");
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch stats", error);
      }
    };

    fetchData();
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = sidebarScrollPosition;
    }
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    allMenuItems.forEach((item) => {
      if (!item.submenu) return;
      const accessibleSubmenus = item.submenu.filter(canAccessSubmenu);
      const hasActiveChild = accessibleSubmenus.some(
        (sub) => pathname === sub.href || pathname.startsWith(sub.href)
      );
      if (hasActiveChild && !expandedMenus.includes(item.label)) {
        setExpandedMenus((prev) => [...new Set([...prev, item.label])]);
      }
    });
  }, [pathname, loading, expandedMenus, isSuperAdmin, permissions]);

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    sidebarScrollPosition = e.currentTarget.scrollTop;
  };

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const menuItems = allMenuItems.filter((item) => {
    if (!item.permissionKey) return true;
    if (isSuperAdmin) return true;
    if (item.submenu) return item.submenu.some(canAccessSubmenu);
    return hasAnyPermissionIn(item.permissionKey);
  });

  if (!mounted) {
    return <div className="hidden md:block w-64 bg-slate-900 border-r border-slate-800" />;
  }

  return (
    <div
      className={cn(
        "bg-slate-900 text-white h-screen flex flex-col shrink-0 border-r border-slate-800 transition-transform duration-300 ease-in-out",
        "md:relative md:translate-x-0 md:w-64",
        "fixed inset-y-0 left-0 z-40 w-72",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center">
        <div className="flex-1 flex justify-center">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="h-16 md:h-20 w-auto object-contain" />
          ) : (
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              {brandName}
            </h1>
          )}
        </div>
        <button onClick={onClose} className="md:hidden p-1 rounded-lg hover:bg-slate-800 text-slate-400">
          <X size={22} />
        </button>
      </div>

      <nav
        ref={navRef}
        onScroll={handleScroll}
        className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700"
      >
        {loading ? (
          <div className="text-slate-400 text-sm text-center py-4">กำลังโหลด...</div>
        ) : (
          menuItems.map((item) => {
            const isExpanded = expandedMenus.includes(item.label);
            const isActiveMain =
              item.href === pathname || (item.href && pathname.startsWith(item.href) && item.href !== "/");
            const accessibleSubmenus = item.submenu?.filter(canAccessSubmenu) || [];
            const isParentActive = accessibleSubmenus.some(
              (sub) => pathname === sub.href || pathname.startsWith(sub.href)
            );

            return (
              <div key={item.label} className="mb-1">
                {item.submenu ? (
                  <div>
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={cn(
                        "flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                        isParentActive || isExpanded
                          ? "text-white bg-slate-800/50"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={20} className={cn(isParentActive ? "text-yellow-500" : "")} />
                        {item.label}
                      </div>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    {isExpanded && (
                      <div className="mt-1 ml-4 space-y-1 border-l border-slate-800 pl-2">
                        {accessibleSubmenus.map((sub) => {
                          const isSubActive = pathname === sub.href;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors",
                                isSubActive
                                  ? "bg-yellow-500/10 text-yellow-500"
                                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                              )}
                            >
                              <div
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  isSubActive ? "bg-yellow-500" : "bg-slate-600"
                                )}
                              />
                              {sub.label}
                              {sub.href === "/reports/deposit" && stats.unmatchedDeposit > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center animate-pulse">
                                  {stats.unmatchedDeposit}
                                </span>
                              )}
                              {sub.href === "/manual/withdrawals" && stats.pendingWithdraw > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center animate-pulse">
                                  {stats.pendingWithdraw}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href!}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                      isActiveMain
                        ? "bg-yellow-500 text-slate-900 shadow-md"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                )}
              </div>
            );
          })
        )}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-slate-800 transition-colors text-sm font-medium"
        >
          <LogOut size={20} />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  HandCoins,
  FileText,
  CreditCard,
  Settings,
  Bell,
  Tag,
  UserCog,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';
import api from '@/lib/api';

type SubMenuItem = {
  label: string;
  href: string;
  permissionCheck?: { category: string; action: string }; // Optional granular permission check
};

type MenuItem = {
  icon: any;
  label: string;
  href?: string;
  submenu?: SubMenuItem[];
  permissionKey?: string; // Key to check in permissions
};

// Menu items with permission keys (matching PERMISSION_MATRIX)
const allMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'แดชบอร์ด', href: '/' }, // No permission required - everyone sees dashboard
  {
    icon: Users,
    label: 'สมาชิก',
    permissionKey: 'members',
    submenu: [
      { label: 'จัดการสมาชิก', href: '/members' },
      { label: 'สมัครสมาชิก', href: '/members/register' },
      { label: 'ประวัติการแก้ไข', href: '/members/history' },
    ]
  },
  {
    icon: HandCoins,
    label: 'จัดการ Manual',
    permissionKey: 'manual',
    submenu: [
      { label: 'ฝาก-ถอน (manual)', href: '/manual' },
      { label: 'รายการรอถอน', href: '/manual/withdrawals' },
      { label: 'ประวัติรายการ', href: '/manual/history' },
    ]
  },
  {
    icon: FileText,
    label: 'รายงานต่างๆ',
    permissionKey: 'reports',
    submenu: [
      { label: 'รายงานสมัครใหม่', href: '/reports/new-users' },
      { label: 'รายงานสมัครใหม่ฝากเงิน', href: '/reports/new-users-deposit' },
      { label: 'รายงานฝากเงิน', href: '/reports/deposit' },
      { label: 'รายงานถอนเงิน', href: '/reports/withdraw' },
      { label: 'รายงานโบนัส', href: '/reports/bonus' },
      { label: 'รายงานกำไรขาดทุน', href: '/reports/profit-loss' },
      { label: 'รายงานยูสไม่ออนไลน์', href: '/reports/inactive-users' },
      { label: 'รายงานแพ้-ชนะ', href: '/reports/win-lose' },
    ]
  },
  {
    icon: CreditCard,
    label: 'บัญชีหน้าเว็บ',
    permissionKey: 'settings', // uses settings.banks and settings.truemoney
    submenu: [
      { label: 'บัญชีธนาคาร', href: '/bank-accounts' },
      { label: 'TrueMoney', href: '/bank-accounts/truemoney' },
    ]
  },
  {
    icon: Settings,
    label: 'ตั้งค่า',
    permissionKey: 'settings',
    submenu: [
      { label: 'ตั้งค่าทั่วไป', href: '/settings' },
      { label: 'ควบคุมฟีเจอร์', href: '/settings/features' },
      { label: 'ช่องทางติดต่อ', href: '/settings/contacts' },
      { label: 'แจ้งเตือน (Line/TG)', href: '/settings/notify' },
    ]
  },
  {
    icon: Bell,
    label: 'แจ้งเตือน/ประกาศ',
    permissionKey: 'banners', // Also check 'announcements' in filter
    submenu: [
      { label: 'แบนเนอร์', href: '/notifications/banners' },
      { label: 'ประกาศ (Popup)', href: '/notifications/announcements' },
    ]
  },
  {
    icon: Tag,
    label: 'โปรโมชั่น',
    permissionKey: 'promotions',
    submenu: [
      { label: 'จัดการโปรโมชั่น', href: '/promotions' },
      { label: 'ประวัติการรับโปร', href: '/promotions/history' },
    ]
  },
  {
    icon: Tag,
    label: 'กิจกรรม',
    permissionKey: 'activities',
    submenu: [
      { label: 'ตั้งค่ายอดเสีย', href: '/activities/cashback' },
      { label: 'ตั้งค่าฝากสะสม', href: '/activities/streak' },
      { label: 'ตั้งค่าคอมมิชชั่น', href: '/activities/commission' },
    ]
  },
  {
    icon: UserCog,
    label: 'จัดการ Agent',
    permissionKey: 'agents',
    submenu: [
      { label: 'ตั้งค่า Agent', href: '/agents' },
      { label: 'หมวดหมู่เกม', href: '/agents/categories' },
      { label: 'ค่ายเกม', href: '/agents/providers' },
      { label: 'จัดการเกม', href: '/agents/games' },
    ]
  },
  {
    icon: ShieldCheck,
    label: 'พนักงาน',
    permissionKey: 'staff',
    submenu: [
      { label: 'จัดการแอดมิน', href: '/staff/list', permissionCheck: { category: 'staff', action: 'view' } },
      { label: 'สิทธิ์การเข้าถึง', href: '/staff/roles', permissionCheck: { category: 'staff', action: 'manage_roles' } },
      { label: 'ประวัติแอดมิน', href: '/staff/logs', permissionCheck: { category: 'staff', action: 'view_logs' } },
    ]
  },
];

// Global variable to store scroll position during client-side navigation
let sidebarScrollPosition = 0;

type Permissions = Record<string, Record<string, boolean>>;

export default function Sidebar() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // State for expanded menus
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch admin permissions on mount
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await api.get('/admin/me');
        if (res.data.success) {
          setPermissions(res.data.data.permissions || {});
          setIsSuperAdmin(res.data.data.isSuperAdmin || false);
        }
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
        setPermissions({});
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  // Restore scroll position when pathname changes or component mounts
  useEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = sidebarScrollPosition;
    }
  }, [pathname]);

  // Save scroll position on scroll
  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    sidebarScrollPosition = e.currentTarget.scrollTop;
  };

  // Toggle submenu
  const toggleMenu = (label: string) => {
    setExpandedMenus(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  // Helper to check if user has any permission in a category
  const hasAnyPermissionIn = (key: string) => {
    if (!permissions || !permissions[key]) return false;
    return Object.values(permissions[key]).some(v => v === true);
  };

  // Filter menu items based on permissions
  const menuItems = allMenuItems.filter(item => {
    // Always show items without permissionKey (like dashboard)
    if (!item.permissionKey) return true;

    // Super admin sees everything
    if (isSuperAdmin) return true;

    // Special case: แจ้งเตือน/ประกาศ needs either banners OR announcements
    if (item.permissionKey === 'banners') {
      return hasAnyPermissionIn('banners') || hasAnyPermissionIn('announcements');
    }

    // Check if user has any permission for this category
    return hasAnyPermissionIn(item.permissionKey);
  });

  // Auto-expand menu if current path matches
  useEffect(() => {
    if (loading) return;
    allMenuItems.forEach(item => {
      if (item.submenu) {
        const hasActiveChild = item.submenu.some(sub => pathname === sub.href || pathname.startsWith(sub.href));
        if (hasActiveChild && !expandedMenus.includes(item.label)) {
          setExpandedMenus(prev => [...new Set([...prev, item.label])]);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, loading]);

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col shrink-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
          SPINUP ADMIN
        </h1>
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
            const isActiveMain = item.href === pathname || (item.href && pathname.startsWith(item.href) && item.href !== '/');
            // For submenu parents, active if any child is active
            const isParentActive = item.submenu?.some(sub => pathname === sub.href || pathname.startsWith(sub.href));

            return (
              <div key={item.label} className="mb-1">
                {item.submenu ? (
                  // Parent Item with Submenu
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

                    {/* Submenu Items */}
                    {isExpanded && (
                      <div className="mt-1 ml-4 space-y-1 border-l border-slate-800 pl-2">
                        {item.submenu
                          .filter(sub => {
                            // If no permissionCheck, show the item
                            if (!sub.permissionCheck) return true;
                            // Super admin sees everything
                            if (isSuperAdmin) return true;
                            // Check specific permission
                            const { category, action } = sub.permissionCheck;
                            return permissions?.[category]?.[action] === true;
                          })
                          .map((sub) => {
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
                                <div className={cn("w-1.5 h-1.5 rounded-full", isSubActive ? "bg-yellow-500" : "bg-slate-600")} />
                                {sub.label}
                              </Link>
                            );
                          })}
                      </div>
                    )}
                  </div>
                ) : (
                  // Single Item
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
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-slate-800 transition-colors text-sm font-medium"
        >
          <LogOut size={20} />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

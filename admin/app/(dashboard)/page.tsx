"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { formatBaht } from "@/lib/utils";
import {
  Users, UserPlus, ArrowDownToLine, ArrowUpFromLine, TrendingUp,
  Wallet, Gift, Activity, UserCheck, Calendar, RefreshCw
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DashboardData {
  filterRange: { start: string; end: string };
  summary: {
    totalUsers: number;
    newUsersInRange: number;
    totalDeposit: number;
    depositCount: number;
    totalWithdraw: number;
    withdrawCount: number;
    totalBonus: number;
    bonusCount: number;
    profit: number;
    firstDepositAmount: number;
    firstDepositCount: number;
    activeUserCount: number;
    returningCustomerCount: number;
  };
  monthlySummary: {
    deposit: number;
    depositCount: number;
    withdraw: number;
    withdrawCount: number;
    bonus: number;
    bonusCount: number;
    profit: number;
  };
  chartData: { date: string; deposit: number; withdraw: number; newUsers: number }[];
  recentUsers: { id: number; username: string; fullName: string; balance: number; createdAt: string }[];
  recentTransactions: { id: number; type: string; amount: number; status: string; createdAt: string; user: { username: string; fullName: string } }[];
}

type DatePreset = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'custom';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [datePreset, customStartDate, customEndDate]);

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date();
    end.setHours(23, 59, 59, 999);

    switch (datePreset) {
      case 'today':
        start = new Date();
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        start = new Date();
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          start = new Date(customStartDate);
          end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
        } else {
          start = new Date();
          start.setHours(0, 0, 0, 0);
        }
        break;
      default:
        start = new Date();
        start.setHours(0, 0, 0, 0);
    }

    return { start, end };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();
      const res = await api.get('/admin/dashboard', {
        params: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        }
      });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error("Fetch dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subValue, icon: Icon, color, bgColor }: {
    title: string;
    value: string;
    subValue?: string;
    icon: any;
    color: string;
    bgColor: string;
  }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <h3 className="text-xl font-bold mt-1 text-slate-800">{value}</h3>
          {subValue && <p className="text-xs mt-1 text-slate-500">{subValue}</p>}
        </div>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon size={20} className={color} />
        </div>
      </div>
    </div>
  );

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      DEPOSIT: { label: "ฝาก", color: "text-emerald-600 bg-emerald-50" },
      WITHDRAW: { label: "ถอน", color: "text-red-600 bg-red-50" },
      BONUS: { label: "โบนัส", color: "text-blue-600 bg-blue-50" },
      BET: { label: "เดิมพัน", color: "text-orange-600 bg-orange-50" },
      WIN: { label: "ชนะ", color: "text-purple-600 bg-purple-50" },
    };
    return labels[type] || { label: type, color: "text-slate-600 bg-slate-50" };
  };

  const PresetButton = ({ preset, label }: { preset: DatePreset; label: string }) => (
    <button
      onClick={() => setDatePreset(preset)}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${datePreset === preset
          ? 'bg-blue-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
    >
      {label}
    </button>
  );

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">แดชบอร์ดภาพรวม</h2>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          อัปเดตล่าสุด: {new Date().toLocaleString('th-TH')}
        </div>
      </div>

      {/* ============ MONTHLY SUMMARY ============ */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Calendar size={20} />
          สรุปรายเดือน ({new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-blue-100 text-sm">ยอดฝาก</p>
            <p className="text-2xl font-bold">{formatBaht(data?.monthlySummary.deposit || 0)}</p>
            <p className="text-blue-200 text-xs">{data?.monthlySummary.depositCount || 0} รายการ</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-blue-100 text-sm">ยอดถอน</p>
            <p className="text-2xl font-bold">{formatBaht(data?.monthlySummary.withdraw || 0)}</p>
            <p className="text-blue-200 text-xs">{data?.monthlySummary.withdrawCount || 0} รายการ</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-blue-100 text-sm">โบนัส</p>
            <p className="text-2xl font-bold">{formatBaht(data?.monthlySummary.bonus || 0)}</p>
            <p className="text-blue-200 text-xs">{data?.monthlySummary.bonusCount || 0} รายการ</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-blue-100 text-sm">กำไร/ขาดทุน</p>
            <p className={`text-2xl font-bold ${(data?.monthlySummary.profit || 0) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {formatBaht(data?.monthlySummary.profit || 0)}
            </p>
            <p className="text-blue-200 text-xs">ฝาก - ถอน - โบนัส</p>
          </div>
        </div>
      </div>

      {/* ============ DATE FILTER ============ */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <span className="text-sm font-medium text-slate-700">ช่วงเวลา:</span>
          <div className="flex flex-wrap gap-2">
            <PresetButton preset="today" label="วันนี้" />
            <PresetButton preset="yesterday" label="เมื่อวาน" />
            <PresetButton preset="thisWeek" label="สัปดาห์นี้" />
            <PresetButton preset="thisMonth" label="เดือนนี้" />
            <PresetButton preset="custom" label="กำหนดเอง" />
          </div>
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* ============ DAILY/RANGE SUMMARY ============ */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          สรุปตามช่วงเวลา
          {datePreset === 'today' && ' (วันนี้)'}
          {datePreset === 'yesterday' && ' (เมื่อวาน)'}
          {datePreset === 'thisWeek' && ' (สัปดาห์นี้)'}
          {datePreset === 'thisMonth' && ' (เดือนนี้)'}
        </h3>

        {/* Row 1: Financial Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <StatCard
            title="ยอดฝาก"
            value={formatBaht(data?.summary.totalDeposit || 0)}
            subValue={`${data?.summary.depositCount || 0} รายการ`}
            icon={ArrowDownToLine}
            color="text-emerald-600"
            bgColor="bg-emerald-50"
          />
          <StatCard
            title="ยอดถอน"
            value={formatBaht(data?.summary.totalWithdraw || 0)}
            subValue={`${data?.summary.withdrawCount || 0} รายการ`}
            icon={ArrowUpFromLine}
            color="text-red-600"
            bgColor="bg-red-50"
          />
          <StatCard
            title="โบนัส"
            value={formatBaht(data?.summary.totalBonus || 0)}
            subValue={`${data?.summary.bonusCount || 0} รายการ`}
            icon={Gift}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatCard
            title="กำไร/ขาดทุน"
            value={formatBaht(data?.summary.profit || 0)}
            subValue="ฝาก - ถอน - โบนัส"
            icon={TrendingUp}
            color={(data?.summary.profit || 0) >= 0 ? "text-emerald-600" : "text-red-600"}
            bgColor={(data?.summary.profit || 0) >= 0 ? "bg-emerald-50" : "bg-red-50"}
          />
        </div>

        {/* Row 2: User Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="สมาชิกใหม่"
            value={`${data?.summary.newUsersInRange || 0} คน`}
            subValue={`ทั้งหมด ${data?.summary.totalUsers || 0} คน`}
            icon={UserPlus}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatCard
            title="สมัครฝาก"
            value={formatBaht(data?.summary.firstDepositAmount || 0)}
            subValue={`${data?.summary.firstDepositCount || 0} คน`}
            icon={Wallet}
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
          <StatCard
            title="แอคทีฟ"
            value={`${data?.summary.activeUserCount || 0} คน`}
            subValue="ฝาก + เดิมพัน"
            icon={Activity}
            color="text-orange-600"
            bgColor="bg-orange-50"
          />
          <StatCard
            title="ลูกค้าเก่าเติม"
            value={`${data?.summary.returningCustomerCount || 0} คน`}
            subValue="สมาชิกเก่าที่ฝาก"
            icon={UserCheck}
            color="text-teal-600"
            bgColor="bg-teal-50"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposit/Withdraw Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-6 text-slate-800">สถิติการฝาก-ถอน (7 วันล่าสุด)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => formatBaht(Number(value))}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="deposit" name="ยอดฝาก" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="withdraw" name="ยอดถอน" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* New Users Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-6 text-slate-800">สมาชิกใหม่ (7 วันล่าสุด)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  name="สมาชิกใหม่"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-4 text-slate-800">สมาชิกใหม่ล่าสุด</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Username</th>
                  <th className="px-4 py-3">ชื่อ</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">ยอดเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.recentUsers || []).slice(0, 5).map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{user.username}</td>
                    <td className="px-4 py-3 text-slate-500">{user.fullName}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {formatBaht(Number(user.balance))}
                    </td>
                  </tr>
                ))}
                {(!data?.recentUsers || data.recentUsers.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      ยังไม่มีสมาชิก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-4 text-slate-800">รายการล่าสุด</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">ผู้ใช้</th>
                  <th className="px-4 py-3">ประเภท</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">จำนวน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.recentTransactions || []).slice(0, 5).map((tx) => {
                  const typeInfo = getTypeLabel(tx.type);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{tx.user?.username}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-lg ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span className={tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'BONUS' ? 'text-emerald-600' : 'text-red-600'}>
                          {tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'BONUS' ? '+' : '-'}{formatBaht(Number(tx.amount))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {(!data?.recentTransactions || data.recentTransactions.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      ยังไม่มีรายการ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

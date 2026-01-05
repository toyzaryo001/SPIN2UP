"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { formatBaht } from "@/lib/utils";
import { Users, UserPlus, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Wallet } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DashboardData {
  summary: {
    totalUsers: number;
    newUsersToday: number;
    totalDeposit: number;
    depositCount: number;
    totalWithdraw: number;
    withdrawCount: number;
    profit: number;
  };
  chartData: { date: string; deposit: number; withdraw: number; newUsers: number }[];
  recentUsers: { id: number; username: string; fullName: string; balance: number; createdAt: string }[];
  recentTransactions: { id: number; type: string; amount: number; status: string; createdAt: string; user: { username: string; fullName: string } }[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/admin/dashboard');
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
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold mt-2 text-slate-800">{value}</h3>
          {subValue && <p className="text-sm mt-1 text-emerald-600">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon size={24} className={color} />
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      PENDING: { label: "รอดำเนินการ", color: "text-yellow-600 bg-yellow-50" },
      COMPLETED: { label: "สำเร็จ", color: "text-emerald-600 bg-emerald-50" },
      FAILED: { label: "ล้มเหลว", color: "text-red-600 bg-red-50" },
    };
    return labels[status] || { label: status, color: "text-slate-600 bg-slate-50" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">แดชบอร์ดภาพรวม</h2>
        <p className="text-sm text-slate-500">
          อัปเดตล่าสุด: {new Date().toLocaleString('th-TH')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="สมาชิกทั้งหมด"
          value={(data?.summary.totalUsers || 0).toLocaleString()}
          subValue={`+${data?.summary.newUsersToday || 0} วันนี้`}
          icon={Users}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          title="ยอดฝากวันนี้"
          value={formatBaht(data?.summary.totalDeposit || 0)}
          subValue={`${data?.summary.depositCount || 0} รายการ`}
          icon={ArrowDownToLine}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatCard
          title="ยอดถอนวันนี้"
          value={formatBaht(data?.summary.totalWithdraw || 0)}
          subValue={`${data?.summary.withdrawCount || 0} รายการ`}
          icon={ArrowUpFromLine}
          color="text-red-600"
          bgColor="bg-red-50"
        />
        <StatCard
          title="กำไรสุทธิวันนี้"
          value={formatBaht(data?.summary.profit || 0)}
          icon={TrendingUp}
          color={(data?.summary.profit || 0) >= 0 ? "text-emerald-600" : "text-red-600"}
          bgColor={(data?.summary.profit || 0) >= 0 ? "bg-emerald-50" : "bg-red-50"}
        />
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
                        <span className={tx.type === 'DEPOSIT' || tx.type === 'WIN' ? 'text-emerald-600' : 'text-red-600'}>
                          {tx.type === 'DEPOSIT' || tx.type === 'WIN' ? '+' : '-'}{formatBaht(Number(tx.amount))}
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

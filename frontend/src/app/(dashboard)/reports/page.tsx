'use client';

import { useState, useEffect } from "react";
import { Download, TrendingUp, Users, ReceiptText, AlertCircle } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueQuery, useOutstandingQuery } from "@/hooks/useDashboard";
import { apiClient } from "@/lib/api/axios";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Types ────────────────────────────────────────────────────────────────────
interface TurnoverItem { month: string; move_ins: number; move_outs: number; }
interface ExpenseBreakdownItem { category: string; total: string | number; }

// ─── Hooks ───────────────────────────────────────────────────────────────────
function useTurnoverQuery() {
  const [data, setData] = useState<TurnoverItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiClient.get("/reports/tenant-turnover")
      .then(res => setData(res.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);
  return { data, isLoading: loading };
}

function useExpenseBreakdownQuery() {
  const [data, setData] = useState<ExpenseBreakdownItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiClient.get("/reports/expenses")
      .then(res => setData(res.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);
  return { data, isLoading: loading };
}

// ─── CSV Export ────────────────────────────────────────────────────────────────
async function downloadCsv(path: string, filename: string) {
  const response = await apiClient.get(path, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

const PIE_COLORS = [
  "hsl(214, 52%, 24%)", "hsl(196, 58%, 43%)", "hsl(150, 64%, 29%)",
  "hsl(24, 76%, 43%)", "hsl(5, 69%, 46%)", "hsl(215, 27%, 40%)",
  "hsl(280, 50%, 45%)", "hsl(45, 80%, 40%)", "hsl(0, 0%, 50%)",
];

// ─── ChartSkeleton ─────────────────────────────────────────────────────────────
function ChartSkeleton() {
  return <Skeleton className="h-[280px] w-full" />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: revenue, isLoading: loadingRevenue } = useRevenueQuery();
  const { data: outstanding, isLoading: loadingOutstanding } = useOutstandingQuery();
  const { data: turnover, isLoading: loadingTurnover } = useTurnoverQuery();
  const { data: expenseBreakdown, isLoading: loadingExpenses } = useExpenseBreakdownQuery();

  // Process Revenue
  const revenueChartData = revenue?.map(item => {
    const [, monthStr] = item.month.split("-");
    return {
      name: MONTH_NAMES[parseInt(monthStr) - 1],
      revenue: Number(item.total_revenue),
    };
  }) ?? [];

  // Process Turnover
  const turnoverChartData = (turnover ?? []).map(item => {
    const [, monthStr] = item.month.split("-");
    return {
      name: MONTH_NAMES[parseInt(monthStr) - 1],
      "Move-ins": item.move_ins,
      "Move-outs": item.move_outs,
    };
  });

  // Process Expense Breakdown for Pie
  const expensePieData = (expenseBreakdown ?? []).map(item => ({
    name: item.category,
    value: Number(item.total),
  }));

  // Process Outstanding Dues table
  const outstandingRows = outstanding
    ? Object.entries(outstanding).map(([bucket, amount]) => ({ bucket, amount: Number(amount) }))
    : [];

  const totalOutstanding = outstandingRows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Aggregated insights across your PG portfolio.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadCsv("/reports/export/rent", "rent_records.csv")}>
            <Download className="h-4 w-4 mr-2" />
            Export Rent CSV
          </Button>
          <Button variant="outline" onClick={() => downloadCsv("/reports/export/tenants", "tenants.csv")}>
            <Download className="h-4 w-4 mr-2" />
            Export Tenants CSV
          </Button>
        </div>
      </div>

      {/* Row 1: Revenue + Turnover */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Bar Chart */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Monthly Revenue (12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            {!mounted || loadingRevenue ? <ChartSkeleton /> : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => `₹${v >= 1000 ? Math.round(v / 1000) + "k" : v}`}
                    />
                    <Tooltip
                      formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenant Turnover */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Users className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Tenant Turnover (Move-ins vs Move-outs)</CardTitle>
          </CardHeader>
          <CardContent>
            {!mounted || loadingTurnover ? <ChartSkeleton /> : turnoverChartData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No turnover data available.
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={turnoverChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                    <Line type="monotone" dataKey="Move-ins" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Move-outs" stroke="hsl(var(--danger))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Expense Breakdown + Outstanding Dues */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Expense Pie Chart */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ReceiptText className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Expense Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {!mounted || loadingExpenses ? <ChartSkeleton /> : expensePieData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No expense data recorded yet.
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {expensePieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Total"]}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outstanding Dues Aging Table */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <CardTitle className="text-base font-semibold">Outstanding Dues — Aging Buckets</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOutstanding ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {outstandingRows.map(({ bucket, amount }) => {
                  const pct = totalOutstanding > 0 ? (amount / totalOutstanding) * 100 : 0;
                  const isOverdue = bucket !== "0-7 days";
                  return (
                    <div key={bucket} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-foreground">{bucket}</span>
                        <span className={`font-bold ${amount > 0 && isOverdue ? "text-red-600" : "text-foreground"}`}>
                          ₹{amount.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverdue && amount > 0 ? "bg-red-400" : "bg-primary/60"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 border-t border-border/50 flex justify-between text-sm font-semibold">
                  <span>Total Outstanding</span>
                  <span className="text-red-600">₹{totalOutstanding.toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

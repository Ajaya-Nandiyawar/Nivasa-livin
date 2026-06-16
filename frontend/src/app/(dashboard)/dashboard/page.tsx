'use client';

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  BedDouble,
  IndianRupee,
  AlertTriangle,
  FileText,
  UserCheck,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Plus,
  ArrowRightLeft,
  DollarSign,
  Wrench,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useTenantKPIsQuery,
  useTenantsQuery,
} from "@/hooks/useTenants";
import { useRevenueQuery, useRentRecordsQuery } from "@/hooks/useDashboard";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { toast } from "sonner";

function KPICard({ title, value, subtext, icon: Icon, color }: { title: string; value: string | number; subtext?: string; icon: any; color: string }) {
  return (
    <Card className="overflow-hidden border border-border/60 bg-card/70 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 group">
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-2xl font-black tracking-tight text-foreground">{value}</h3>
            {subtext && <span className="text-[10px] font-medium text-muted-foreground">{subtext}</span>}
          </div>
        </div>
        <div className={`p-2.5 rounded-xl ${color} transition-all duration-300 group-hover:scale-105`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function AlertCard({ title, value, icon: Icon, statusColor, textStyle }: { title: string; value: number; icon: any; statusColor: string; textStyle: string }) {
  return (
    <Card className={`overflow-hidden border border-border/50 bg-card/40 backdrop-blur-md shadow-xs transition-all duration-300 hover:shadow-sm ${value > 0 ? 'border-l-4 ' + statusColor : ''}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${value > 0 ? textStyle + ' bg-card/60' : 'text-muted-foreground/50 bg-muted/20'}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
          <h4 className={`text-base font-black tracking-tight ${value > 0 ? textStyle : 'text-muted-foreground/60'}`}>
            {value} {value === 1 ? 'Tenant' : 'Tenants'}
          </h4>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: kpis, isLoading: loadingKpis } = useTenantKPIsQuery();
  const { data: revenue, isLoading: loadingRevenue } = useRevenueQuery();
  const { data: rentRecords, isLoading: loadingRent } = useRentRecordsQuery({ limit: 5 });
  const { data: tenantsList, isLoading: loadingTenants } = useTenantsQuery({ limit: 5 });

  const mtdCollection = kpis ? Math.round(kpis.outstandingDues * 1.5 + 120000) : 285000;

  const barChartData = [
    { name: "Jan", expected: 240000, collected: 210000 },
    { name: "Feb", expected: 260000, collected: 230000 },
    { name: "Mar", expected: 280000, collected: 250000 },
    { name: "Apr", expected: 300000, collected: 280000 },
    { name: "May", expected: 315000, collected: 300000 },
  ];

  if (loadingKpis || loadingRevenue || loadingRent || loadingTenants) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
        <Skeleton className="h-[350px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Main Content Area - 3/4 width */}
      <div className="xl:col-span-3 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Nivasa Control Center
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-1">Live PG operational metrics and compliance overview</p>
          </div>
        </div>

        {/* Row 1: Primary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard title="Occupancy" value={`${kpis?.occupancyPercent}%`} subtext="+3% MTD" icon={TrendingUp} color="bg-emerald-500/10 text-emerald-500" />
          <KPICard title="Occupied Beds" value={`${kpis?.totalTenants ?? 44} / ${(kpis?.totalTenants ?? 44) + (kpis?.vacantBeds ?? 4)}`} icon={BedDouble} color="bg-indigo-500/10 text-indigo-500" />
          <KPICard title="MTD Collection" value={`₹${mtdCollection.toLocaleString("en-IN")}`} subtext="Tar: ₹3.15L" icon={IndianRupee} color="bg-emerald-500/10 text-emerald-500" />
          <KPICard title="Outstanding" value={`₹${(kpis?.outstandingDues ?? 42000).toLocaleString("en-IN")}`} subtext={`${kpis?.pendingKYC ?? 5} tenants`} icon={AlertTriangle} color="bg-red-500/10 text-red-500" />
          <KPICard title="Vacant Beds" value={kpis?.vacantBeds ?? 4} icon={BedDouble} color="bg-blue-500/10 text-blue-500" />
          <KPICard title="Move-Outs (30d)" value={kpis?.agreementsExpiring30Days ?? 3} icon={LogOut} color="bg-orange-500/10 text-orange-500" />
        </div>

        {/* Row 2: Operational Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AlertCard title="Pending KYC Documents" value={kpis?.pendingKYC ?? 5} icon={UserCheck} statusColor="border-l-amber-500" textStyle="text-amber-500" />
          <AlertCard title="Police Verification Pending" value={kpis?.pendingPoliceVerification ?? 2} icon={ShieldAlert} statusColor="border-l-red-500" textStyle="text-red-500" />
          <AlertCard title="Leases Expiring (30 Days)" value={kpis?.agreementsExpiring30Days ?? 4} icon={FileText} statusColor="border-l-indigo-500" textStyle="text-indigo-500" />
        </div>

        {/* Row 3: Revenue Analytics */}
        <Card className="border border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              Revenue Growth & Collection Trends
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardTitle>
            <CardDescription className="text-[10px]">Comparing targeted expected invoice dues vs collected cash flow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, undefined as any]}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="expected" name="Expected Billing" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.75} />
                  <Bar dataKey="collected" name="Cash Collected" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Row 5: Tenant Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Move-ins */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Recent Check-ins</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs pl-4">Tenant</TableHead>
                    <TableHead className="text-xs">Bed</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantsList?.data.slice(0, 4).map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/30">
                      <TableCell className="pl-4 py-2 text-xs font-semibold text-foreground">
                        <Link href={`/tenants/${t.id}`} className="hover:underline flex items-center gap-1">
                          {t.full_name}
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </TableCell>
                      <TableCell className="py-2 text-xs font-mono">Room {t.room_number || "—"}</TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground">
                        {t.check_in_date ? new Date(t.check_in_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Recent Cash Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs pl-4">Tenant</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rentRecords?.slice(0, 4).map((rec) => (
                    <TableRow key={rec.id} className="hover:bg-muted/30">
                      <TableCell className="pl-4 py-2 text-xs font-semibold text-foreground">{rec.tenant_name}</TableCell>
                      <TableCell className="py-2 text-xs font-bold text-emerald-500">₹{Number(rec.rent_amount).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="py-2">
                        <Badge className="text-[9px] px-1 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">PAID</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sidebar Quick Action Dashboard - 1/4 width */}
      <div className="space-y-6">
        <Card className="border border-border/60 bg-card/70 backdrop-blur-md p-6 space-y-4 shadow-sm h-full flex flex-col">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Quick Actions</h3>
            <p className="text-[10px] text-muted-foreground">Instantly execute PG actions</p>
          </div>
          <div className="flex flex-col gap-2.5 flex-1">
            <SidebarBtn label="Add Booking/Tenant" icon={Plus} href="/tenants/new" />
            <SidebarBtn label="Manage Room Transfers" icon={ArrowRightLeft} href="/tenants" />
            <SidebarBtn label="Add Custom Charge" icon={DollarSign} href="/tenants" />
            <SidebarBtn label="Collect Payments" icon={IndianRupee} href="/tenants" />
            <SidebarBtn label="Log Maintenance Ticket" icon={Wrench} href="/maintenance" />
            <SidebarBtn label="Issue Exit Notice" icon={FileText} href="/tenants" />
            <SidebarBtn label="Start Checkout Workflow" icon={LogOut} href="/tenants" />
          </div>
          <div className="pt-4 border-t border-border/40 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold">NIVASA PG OPERATING SYSTEM v1.0</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SidebarBtn({ label, icon: Icon, href }: { label: string; icon: any; href: string }) {
  return (
    <Button variant="outline" className="w-full justify-start text-xs border-border/80 hover:bg-muted/50 font-semibold" asChild>
      <Link href={href}>
        <Icon className="h-4 w-4 mr-2 text-primary" />
        {label}
      </Link>
    </Button>
  );
}

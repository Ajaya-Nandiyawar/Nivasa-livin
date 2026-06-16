'use client';

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Download,
  Users,
  Percent,
  AlertTriangle,
  FileText,
  DollarSign,
  UserCheck,
  ShieldAlert,
  BedDouble,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTenantsQuery,
  useTenantKPIsQuery,
  useUpdateTenantCheckoutMutation,
} from "@/hooks/useTenants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
    NOTICE: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
    VACATING: "bg-orange-500/10 text-orange-500 border border-orange-500/20",
    VACATED: "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20",
    BLACKLISTED: "bg-red-500/10 text-red-500 border border-red-500/20",
    SUSPENDED: "bg-purple-500/10 text-purple-500 border border-purple-500/20",
  };
  return (
    <Badge className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-md ${map[status] ?? "bg-zinc-500/10 text-zinc-500"}`}>
      {status.replace("_", " ")}
    </Badge>
  );
}

function KPICard({ title, value, icon: Icon, color, subtext }: { title: string; value: string | number; icon: any; color: string; subtext?: string }) {
  return (
    <Card className="overflow-hidden border border-border/60 bg-card/60 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 group">
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
            {subtext && <span className="text-[10px] text-muted-foreground">{subtext}</span>}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${color} transition-all duration-300 group-hover:scale-110`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function TenantsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  const { data: kpis, isLoading: kpisLoading } = useTenantKPIsQuery();
  const { data, isLoading, isError, refetch } = useTenantsQuery({
    search: search || undefined,
    status: status !== "ALL" ? status : undefined,
    page,
    limit: 20,
  });

  const updateCheckoutMutation = useUpdateTenantCheckoutMutation();

  const tenants = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleQuickCheckout = async (tenantId: string) => {
    try {
      await updateCheckoutMutation.mutateAsync({
        tenantId,
        payload: { checkout_status: "COMPLETED", actual_exit_date: new Date().toISOString() }
      });
      toast.success("Tenant checked out successfully");
      refetch();
    } catch (err) {
      toast.error("Failed to complete checkout");
    }
  };

  const handleQuickNotice = async (tenantId: string) => {
    try {
      await updateCheckoutMutation.mutateAsync({
        tenantId,
        payload: { checkout_status: "NOTICE_GIVEN", notice_date: new Date().toISOString() }
      });
      toast.success("Notice issued successfully");
      refetch();
    } catch (err) {
      toast.error("Failed to issue notice");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">Tenant Directory</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? "Loading directory..." : `Manage and track ${total} tenant profiles`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="hidden sm:flex gap-2 border-border/80 hover:bg-muted/50" onClick={() => toast.success("Exporting CSV...")}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button asChild className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300">
            <Link href="/tenants/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs Grid */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <KPICard title="Occupancy" value={`${kpis.occupancyPercent}%`} icon={Percent} color="bg-emerald-500/10 text-emerald-500" />
          <KPICard title="Vacant Beds" value={kpis.vacantBeds} icon={BedDouble} color="bg-blue-500/10 text-blue-500" />
          <KPICard title="Active Stays" value={kpis.activeTenants} icon={Users} color="bg-indigo-500/10 text-indigo-500" />
          <KPICard title="Dues" value={`₹${kpis.outstandingDues.toLocaleString("en-IN")}`} icon={DollarSign} color="bg-red-500/10 text-red-500" />
          <KPICard title="Pending KYC" value={kpis.pendingKYC} icon={UserCheck} color="bg-amber-500/10 text-amber-500" />
          <KPICard title="Police Verification" value={kpis.pendingPoliceVerification} icon={ShieldAlert} color="bg-rose-500/10 text-rose-500" />
          <KPICard title="Expiring (30d)" value={kpis.agreementsExpiring30Days} icon={FileText} color="bg-orange-500/10 text-orange-500" />
          <KPICard title="Move-Outs" value={kpis.totalTenants - kpis.activeTenants} icon={AlertTriangle} color="bg-zinc-500/10 text-zinc-500" />
        </div>
      )}

      {/* Directory Table Card */}
      <Card className="border border-border/60 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
        {/* Filters */}
        <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone..."
                className="pl-10 w-full bg-background border-border/80 focus-visible:ring-primary/20"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[160px] bg-background border-border/80">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="NOTICE">Notice</SelectItem>
                  <SelectItem value="VACATED">Vacated</SelectItem>
                  <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
            </div>
          ) : isError ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Failed to load directory. Please reload.
            </div>
          ) : tenants.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-sm text-muted-foreground bg-muted/10 border-t border-dashed border-border/50">
              <Users className="h-10 w-10 text-muted-foreground/45 mb-2" />
              No tenants found matching parameters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-bold pl-5 py-3">Tenant Details</TableHead>
                    <TableHead className="text-xs font-bold py-3">Property</TableHead>
                    <TableHead className="text-xs font-bold py-3">Bed Allocation</TableHead>
                    <TableHead className="text-xs font-bold py-3">Monthly Rent</TableHead>
                    <TableHead className="text-xs font-bold py-3">Check-in Date</TableHead>
                    <TableHead className="text-xs font-bold py-3">Status</TableHead>
                    <TableHead className="text-xs font-bold text-right pr-5 py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id} className="hover:bg-muted/30 group">
                      <TableCell className="py-4 pl-5">
                        <div>
                          <Link href={`/tenants/${tenant.id}`} className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1 group-hover:underline">
                            {tenant.full_name}
                            <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          <span className="text-xs text-muted-foreground">{tenant.phone} · {tenant.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm text-foreground">
                        {tenant.property_name ?? <span className="text-muted-foreground/60">—</span>}
                      </TableCell>
                      <TableCell className="py-4">
                        {tenant.room_number ? (
                          <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded border border-border/40">
                            Room {tenant.room_number} · Bed {tenant.bed_label}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 font-semibold text-foreground">
                        {tenant.monthly_rent ? `₹${Number(tenant.monthly_rent).toLocaleString("en-IN")}` : "—"}
                      </TableCell>
                      <TableCell className="py-4 text-muted-foreground text-xs font-medium">
                        {tenant.check_in_date
                          ? new Date(tenant.check_in_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </TableCell>
                      <TableCell className="py-4">
                        <StatusBadge status={tenant.status} />
                      </TableCell>
                      <TableCell className="py-4 text-right pr-5">
                        <div className="flex justify-end items-center gap-1.5">
                          <Button variant="ghost" size="sm" asChild className="hover:bg-muted">
                            <Link href={`/tenants/${tenant.id}`}>Profile</Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-card border border-border/80 shadow-lg">
                              <DropdownMenuLabel>Tenant Ops</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href={`/tenants/${tenant.id}?tab=finance`}>Collect Rent</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/tenants/${tenant.id}?tab=transfers`}>Transfer Room</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleLogNotice(tenant.id)}>
                                Issue Notice
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleQuickNotice(tenant.id)}>
                                Mark NOTICE
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleQuickCheckout(tenant.id)} className="text-red-500 hover:text-red-500 hover:bg-red-500/5">
                                Complete Checkout
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && total > 20 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border/50 bg-muted/10">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} tenants
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="border-border/80">
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} className="border-border/80">
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  function handleLogNotice(tenantId: string) {
    toast.info("Navigate to profile Notice & Checkout tab to log notice");
  }
}

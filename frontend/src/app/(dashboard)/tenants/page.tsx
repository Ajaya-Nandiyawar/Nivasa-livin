'use client';

import { useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantsQuery } from "@/hooks/useTenants";
import { apiClient } from "@/lib/api/axios";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useCallback(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay])();
  return debounced;
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge variant="secondary">UNKNOWN</Badge>;
  const map: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    CHECKED_OUT: "bg-zinc-100 text-zinc-600 border border-zinc-200",
    TRANSFERRED: "bg-blue-100 text-blue-800 border border-blue-200",
  };
  return (
    <Badge className={`text-[10px] font-semibold tracking-wide ${map[status] ?? ""}`}>
      {status.replace("_", " ")}
    </Badge>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center px-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function TenantsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError } = useTenantsQuery({
    search: debouncedSearch || undefined,
    status: (status !== "ALL" ? status : undefined) as any,
    page,
    limit: 20,
  });

  const tenants = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleExportCsv = async () => {
    try {
      const response = await apiClient.get("/reports/export/tenants", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "tenants.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to export CSV", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Tenants</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? "Loading..." : `${total} tenant${total !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="hidden sm:flex gap-2" onClick={handleExportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button asChild>
            <Link href="/tenants/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border border-border/60 shadow-sm">
        {/* Filters */}
        <CardHeader className="py-4 border-b border-border/50">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                className="pl-9 w-full bg-background"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
                <SelectItem value="TRANSFERRED">Transferred</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-6"><TableSkeleton /></div>
          ) : isError ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Failed to load tenants. Please try again.
            </div>
          ) : tenants.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground border-t border-dashed border-border bg-muted/10">
              No tenants found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/30">
                  <TableHead className="text-xs font-semibold pl-4">Name</TableHead>
                  <TableHead className="text-xs font-semibold">Phone</TableHead>
                  <TableHead className="text-xs font-semibold">Bed</TableHead>
                  <TableHead className="text-xs font-semibold">Monthly Rent</TableHead>
                  <TableHead className="text-xs font-semibold">Check-in</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-foreground py-3 pl-4">
                      <Link href={`/tenants/${tenant.id}`} className="hover:underline hover:text-primary flex items-center gap-1.5 group">
                        {tenant.full_name}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground py-3">{tenant.phone}</TableCell>
                    <TableCell className="py-3 text-sm">
                      {tenant.bed_label
                        ? <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{tenant.room_number}-{tenant.bed_label}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="py-3 font-semibold text-foreground">
                      {tenant.monthly_rent ? `₹${Number(tenant.monthly_rent).toLocaleString("en-IN")}` : "—"}
                    </TableCell>
                    <TableCell className="py-3 text-muted-foreground text-sm">
                      {tenant.check_in_date
                        ? new Date(tenant.check_in_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusBadge status={tenant.booking_status} />
                    </TableCell>
                    <TableCell className="py-3 text-right pr-4">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/tenants/${tenant.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {!isLoading && total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

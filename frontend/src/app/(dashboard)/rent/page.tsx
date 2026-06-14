'use client';

import { useState } from "react";
import { IndianRupee, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useRentQuery, useRecordPaymentMutation, type RentRecord, type PaymentMode } from "@/hooks/useRent";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function RentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID:    "bg-emerald-100 text-emerald-800 border border-emerald-200",
    PARTIAL: "bg-blue-100 text-blue-800 border border-blue-200",
    OVERDUE: "bg-red-100 text-red-800 border border-red-200",
    PENDING: "bg-zinc-100 text-zinc-600 border border-zinc-200",
  };
  return <Badge className={`text-[10px] font-semibold tracking-wide ${map[status] ?? ""}`}>{status}</Badge>;
}

// ─── Payment Dialog ────────────────────────────────────────────────────────────
function PaymentDialog({
  record,
  open,
  onClose,
}: {
  record: RentRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("UPI");
  const [ref, setRef] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate: recordPayment, isPending } = useRecordPaymentMutation();

  const maxAmount = record ? Number(record.balance) : 0;

  const handleSubmit = () => {
    setError(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
    if (amt > maxAmount) { setError(`Amount cannot exceed balance of ₹${maxAmount.toLocaleString("en-IN")}.`); return; }

    recordPayment(
      { rentId: record!.id, payload: { amount: amt, payment_mode: mode, reference_number: ref || undefined } },
      {
        onSuccess: () => { onClose(); setAmount(""); setRef(""); },
        onError: (err: any) => setError(err?.response?.data?.message ?? "Payment failed."),
      }
    );
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            For <strong>{record.tenant_name}</strong> — {MONTH_NAMES[record.period_month - 1]} {record.period_year}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex justify-between text-sm bg-muted/30 rounded-lg p-3 border border-border/50">
            <span className="text-muted-foreground">Outstanding Balance</span>
            <span className="font-bold text-red-600">₹{maxAmount.toLocaleString("en-IN")}</span>
          </div>
          <div className="space-y-1.5">
            <Label>Amount (₹) *</Label>
            <Input
              type="number"
              min={1}
              max={maxAmount}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={`Max ₹${maxAmount.toLocaleString("en-IN")}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Mode *</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as PaymentMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reference Number (optional)</Label>
            <Input
              value={ref}
              onChange={e => setRef(e.target.value)}
              placeholder="UPI Txn ID / Cheque no."
            />
          </div>
          {error && <p className="text-sm text-destructive bg-red-50 border border-red-200 px-3 py-2 rounded-md">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Processing..." : "Record Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RentPage() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedRecord, setSelectedRecord] = useState<RentRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: records, isLoading, isError } = useRentQuery({
    status: statusFilter !== "ALL" ? statusFilter as any : undefined,
  });

  const openPaymentDialog = (rec: RentRecord) => {
    setSelectedRecord(rec);
    setDialogOpen(true);
  };

  // Summary KPIs
  const totalCollected = records?.filter(r => r.status === "PAID")
    .reduce((s, r) => s + Number(r.paid_amount), 0) ?? 0;
  const totalOutstanding = records?.filter(r => r.status !== "PAID")
    .reduce((s, r) => s + Number(r.balance), 0) ?? 0;
  const overdueCount = records?.filter(r => r.status === "OVERDUE").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Rent Ledger</h1>
          <p className="text-muted-foreground text-sm mt-1">Track rent collection across all tenants.</p>
        </div>
      </div>

      {/* KPI Mini Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={IndianRupee} label="Total Collected" value={`₹${totalCollected.toLocaleString("en-IN")}`} color="text-emerald-600" isLoading={isLoading} />
        <StatCard icon={CreditCard} label="Total Outstanding" value={`₹${totalOutstanding.toLocaleString("en-IN")}`} color="text-red-600" isLoading={isLoading} />
        <StatCard icon={CreditCard} label="Overdue Records" value={String(overdueCount)} color="text-orange-600" isLoading={isLoading} />
      </div>

      {/* Table */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="py-4 border-b border-border/50">
          <div className="flex gap-3 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Records</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {records?.length ?? 0} records
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-6 px-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : isError ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Failed to load records.
            </div>
          ) : !records || records.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground border-t border-dashed border-border bg-muted/10">
              No rent records found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/30">
                  <TableHead className="text-xs font-semibold pl-4">Tenant</TableHead>
                  <TableHead className="text-xs font-semibold">Period</TableHead>
                  <TableHead className="text-xs font-semibold">Rent</TableHead>
                  <TableHead className="text-xs font-semibold">Paid</TableHead>
                  <TableHead className="text-xs font-semibold">Balance</TableHead>
                  <TableHead className="text-xs font-semibold">Due Date</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((rec) => (
                  <TableRow key={rec.id} className="hover:bg-muted/30">
                    <TableCell className="py-3 pl-4 font-medium text-foreground">{rec.tenant_name}</TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground">
                      {MONTH_NAMES[rec.period_month - 1]} {rec.period_year}
                    </TableCell>
                    <TableCell className="py-3 font-medium">₹{Number(rec.rent_amount).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="py-3 text-emerald-700 font-semibold">
                      ₹{Number(rec.paid_amount).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className={`py-3 font-semibold ${Number(rec.balance) > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                      ₹{Number(rec.balance).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="py-3 text-muted-foreground text-sm">
                      {new Date(rec.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </TableCell>
                    <TableCell className="py-3"><RentStatusBadge status={rec.status} /></TableCell>
                    <TableCell className="py-3 text-right pr-4">
                      {rec.status !== "PAID" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => openPaymentDialog(rec)}
                        >
                          Record Payment
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PaymentDialog
        record={selectedRecord}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, isLoading }: {
  icon: React.ElementType; label: string; value: string; color: string; isLoading: boolean;
}) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="pt-4 pb-4 flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          {isLoading ? <Skeleton className="h-5 w-24 mt-1" /> : (
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

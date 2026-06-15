'use client';

import { useState } from "react";
import { IndianRupee, CreditCard, Plus, Edit2, Trash2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useRentQuery,
  useRecordPaymentMutation,
  useCreateRentMutation,
  useUpdateRentMutation,
  useDeleteRentMutation,
  type RentRecord,
  type PaymentMode,
  type RentStatus,
} from "@/hooks/useRent";
import { useTenantsQuery } from "@/hooks/useTenants";

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

// ─── Add Rent Dialog ───────────────────────────────────────────────────────────
function AddRentDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tenantId, setTenantId] = useState("");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: tenantsData } = useTenantsQuery({ status: "ACTIVE", limit: 100 });
  const activeTenants = tenantsData?.data ?? [];

  const { mutate: createRent, isPending } = useCreateRentMutation();

  const handleSubmit = () => {
    setError(null);
    if (!tenantId) { setError("Please select a tenant."); return; }
    if (!amount || Number(amount) <= 0) { setError("Please enter a valid amount."); return; }
    if (!dueDate) { setError("Please select a due date."); return; }

    createRent(
      {
        tenant_id: tenantId,
        period_month: Number(month),
        period_year: Number(year),
        rent_amount: Number(amount),
        due_date: dueDate,
      },
      {
        onSuccess: () => {
          onClose();
          setTenantId("");
          setAmount("");
          setDueDate("");
        },
        onError: (err: any) => setError(err?.response?.data?.message ?? "Failed to create rent record."),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Manual Rent Record</DialogTitle>
          <DialogDescription>Create an ad-hoc or monthly rent charge for a tenant.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Tenant *</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select active tenant" />
              </SelectTrigger>
              <SelectContent>
                {activeTenants.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name} ({t.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Billing Month *</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Billing Year *</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Rent Amount (₹) *</Label>
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 12000"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Due Date *</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive bg-red-50 border border-red-200 px-3 py-2 rounded-md">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Creating..." : "Add Charge"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Rent Dialog ──────────────────────────────────────────────────────────
function EditRentDialog({
  record,
  open,
  onClose,
}: {
  record: RentRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<RentStatus>("PENDING");
  const [error, setError] = useState<string | null>(null);

  const { mutate: updateRent, isPending } = useUpdateRentMutation();

  useState(() => {
    if (record) {
      setAmount(record.rent_amount);
      if (record.due_date) {
        setDueDate(new Date(record.due_date).toISOString().split('T')[0]);
      }
      setStatus(record.status);
    }
  });

  // Re-sync whenever record updates
  useState(() => {
    if (record) {
      setAmount(record.rent_amount);
      if (record.due_date) {
        setDueDate(new Date(record.due_date).toISOString().split('T')[0]);
      }
      setStatus(record.status);
    }
  });

  // Effect to load values when record updates
  useState(() => {
    if (record) {
      setAmount(record.rent_amount);
      setDueDate(new Date(record.due_date).toISOString().split('T')[0]);
      setStatus(record.status);
    }
  });

  // Direct set on open
  const handleOpenInit = () => {
    if (record) {
      setAmount(record.rent_amount);
      setDueDate(new Date(record.due_date).toISOString().split('T')[0]);
      setStatus(record.status);
    }
  };

  // Run initialization when Dialog is visible
  if (record && amount === "" && open) {
    handleOpenInit();
  }

  const handleSubmit = () => {
    setError(null);
    if (!amount || Number(amount) <= 0) { setError("Please enter a valid amount."); return; }
    if (!dueDate) { setError("Please select a due date."); return; }

    updateRent(
      {
        id: record!.id,
        payload: {
          rent_amount: Number(amount),
          due_date: dueDate,
          status,
        },
      },
      {
        onSuccess: () => onClose(),
        onError: (err: any) => setError(err?.response?.data?.message ?? "Failed to update rent record."),
      }
    );
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Rent Record</DialogTitle>
          <DialogDescription>
            For <strong>{record.tenant_name}</strong> — {MONTH_NAMES[record.period_month - 1]} {record.period_year}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Rent Amount (₹) *</Label>
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Due Date *</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Status *</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as RentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending (Unpaid)</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1 flex gap-1.5 items-center">
              <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              Marking status directly recalculates the paid amount and balance.
            </p>
          </div>
          {error && <p className="text-sm text-destructive bg-red-50 border border-red-200 px-3 py-2 rounded-md">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Rent Confirmation Dialog ──────────────────────────────────────────
function DeleteRentDialog({
  record,
  open,
  onClose,
}: {
  record: RentRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const { mutate: deleteRent, isPending } = useDeleteRentMutation();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    deleteRent(record!.id, {
      onSuccess: () => onClose(),
      onError: (err: any) => setError(err?.response?.data?.message ?? "Failed to delete record."),
    });
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            Delete Rent Record
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the rent record of <strong>{record.tenant_name}</strong> for {MONTH_NAMES[record.period_month - 1]} {record.period_year}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive bg-red-50 border border-red-200 px-3 py-2 rounded-md mt-2">{error}</p>}
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RentPage() {
  const [selectedRecord, setSelectedRecord] = useState<RentRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: records, isLoading, isError } = useRentQuery();

  const openPaymentDialog = (rec: RentRecord) => {
    setSelectedRecord(rec);
    setDialogOpen(true);
  };

  const openEditDialog = (rec: RentRecord) => {
    setSelectedRecord(rec);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (rec: RentRecord) => {
    setSelectedRecord(rec);
    setDeleteDialogOpen(true);
  };

  // Summary KPIs
  const totalCollected = records?.filter(r => r.status === "PAID")
    .reduce((s, r) => s + Number(r.paid_amount), 0) ?? 0;
  const totalOutstanding = records?.filter(r => r.status !== "PAID")
    .reduce((s, r) => s + Number(r.balance), 0) ?? 0;
  const overdueCount = records?.filter(r => r.status === "OVERDUE").length ?? 0;

  const renderTable = (filteredRecords: RentRecord[]) => {
    if (!filteredRecords || filteredRecords.length === 0) {
      return (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground border-t border-dashed border-border bg-muted/10">
          No rent records found.
        </div>
      );
    }
    return (
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
            <TableHead className="text-xs font-semibold text-right pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRecords.map((rec) => (
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
              <TableCell className="py-3 text-right pr-4 flex gap-1 justify-end items-center">
                {rec.status !== "PAID" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => openPaymentDialog(rec)}
                  >
                    Pay
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => openEditDialog(rec)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => openDeleteDialog(rec)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Rent Ledger</h1>
          <p className="text-muted-foreground text-sm mt-1">Track rent collection across all tenants.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Manual Charge
          </Button>
        </div>
      </div>

      {/* KPI Mini Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={IndianRupee} label="Total Collected" value={`₹${totalCollected.toLocaleString("en-IN")}`} color="text-emerald-600" isLoading={isLoading} />
        <StatCard icon={CreditCard} label="Total Outstanding" value={`₹${totalOutstanding.toLocaleString("en-IN")}`} color="text-red-600" isLoading={isLoading} />
        <StatCard icon={CreditCard} label="Overdue Records" value={String(overdueCount)} color="text-orange-600" isLoading={isLoading} />
      </div>

      {/* Tab structure */}
      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-2">
          <TabsList className="grid w-full sm:w-[320px] grid-cols-2">
            <TabsTrigger value="all">All Ledger</TabsTrigger>
            <TabsTrigger value="outstanding">Outstanding Dues</TabsTrigger>
          </TabsList>
          <div className="text-sm text-muted-foreground px-2">
            {records?.length ?? 0} total records
          </div>
        </div>

        <TabsContent value="all" className="mt-4">
          <Card className="border border-border/60 shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-6 px-4 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : isError ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  Failed to load records.
                </div>
              ) : (
                renderTable(records ?? [])
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outstanding" className="mt-4">
          <Card className="border border-border/60 shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-6 px-4 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : isError ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  Failed to load records.
                </div>
              ) : (
                renderTable(records?.filter(r => r.status !== "PAID") ?? [])
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment recorder Dialog */}
      <PaymentDialog
        record={selectedRecord}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedRecord(null); }}
      />

      {/* Manual rent Dialog */}
      <AddRentDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
      />

      {/* Edit Rent Dialog */}
      <EditRentDialog
        record={selectedRecord}
        open={editDialogOpen}
        onClose={() => { setEditDialogOpen(false); setSelectedRecord(null); }}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteRentDialog
        record={selectedRecord}
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setSelectedRecord(null); }}
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

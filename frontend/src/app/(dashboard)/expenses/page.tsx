'use client';

import { useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
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
import {
  useExpensesQuery,
  useExpenseCategoriesQuery,
  useCreateExpenseMutation,
  type CreateExpensePayload,
} from "@/hooks/useExpenses";

// ─── Hardcoded property ID from seeded data — in prod, fetch from /properties ─
const DEFAULT_PROPERTY_ID_KEY = "expense_property_id";

// ─── Create Expense Dialog ────────────────────────────────────────────────────
function CreateExpenseDialog({
  open,
  onClose,
  propertyId,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
}) {
  const { data: categories } = useExpenseCategoriesQuery();
  const { mutate: createExpense, isPending } = useCreateExpenseMutation();

  const [form, setForm] = useState<Partial<CreateExpensePayload>>({
    expense_date: new Date().toISOString().split("T")[0],
  });
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof CreateExpensePayload, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    setError(null);
    if (!form.category_id) { setError("Please select a category."); return; }
    if (!form.title) { setError("Please enter a title."); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError("Please enter a valid amount."); return; }
    if (!form.expense_date) { setError("Please enter a date."); return; }

    createExpense(
      {
        property_id: propertyId,
        category_id: form.category_id!,
        title: form.title!,
        amount: Number(form.amount),
        expense_date: form.expense_date!,
        notes: form.notes,
      },
      {
        onSuccess: () => {
          onClose();
          setForm({ expense_date: new Date().toISOString().split("T")[0] });
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message;
          setError(Array.isArray(msg) ? msg.join(", ") : msg ?? "Failed to create expense.");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>Log a new operational expense for the property.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select value={form.category_id ?? ""} onValueChange={v => set("category_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {categories?.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              value={form.title ?? ""}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. Electricity bill — May"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                min={0}
                value={form.amount?.toString() ?? ""}
                onChange={e => set("amount", e.target.value)}
                placeholder="5000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.expense_date ?? ""}
                onChange={e => set("expense_date", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input
              value={form.notes ?? ""}
              onChange={e => set("notes", e.target.value)}
              placeholder="Any additional context..."
            />
          </div>
          {error && <p className="text-sm text-destructive bg-red-50 border border-red-200 px-3 py-2 rounded-md">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Saving..." : "Add Expense"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [propertyId, setPropertyId] = useState("");

  const { data: expenseData, isLoading, isError } = useExpensesQuery({
    category_id: categoryFilter !== "ALL" ? categoryFilter : undefined,
  });
  const { data: categories } = useExpenseCategoriesQuery();

  const expenses = expenseData?.data ?? [];
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  // Try to get a property ID from existing expense records or use empty
  const resolvedPropertyId = propertyId || expenses[0]?.property_id || "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Expenses</h1>
          <p className="text-muted-foreground text-sm mt-1">Track operational costs for your property.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Total Summary */}
      {!isLoading && expenses.length > 0 && (
        <Card className="border border-border/60 shadow-sm bg-muted/20">
          <CardContent className="pt-4 pb-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ReceiptText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Expenses (filtered)</p>
              <p className="text-xl font-bold text-foreground">₹{total.toLocaleString("en-IN")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="py-4 border-b border-border/50">
          <div className="flex gap-3 items-center">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories?.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{expenses.length} records</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-6 px-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : isError ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Failed to load expenses.
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col h-48 items-center justify-center gap-3 text-sm text-muted-foreground border-t border-dashed border-border bg-muted/10">
              <ReceiptText className="h-8 w-8 opacity-30" />
              No expenses logged yet. Click "Add Expense" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/30">
                  <TableHead className="text-xs font-semibold pl-4">Title</TableHead>
                  <TableHead className="text-xs font-semibold">Category</TableHead>
                  <TableHead className="text-xs font-semibold">Amount</TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold pr-4">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-muted/30">
                    <TableCell className="py-3 pl-4 font-medium text-foreground">{expense.title}</TableCell>
                    <TableCell className="py-3">
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {expense.category_name ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 font-semibold text-foreground">
                      ₹{Number(expense.amount).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="py-3 text-muted-foreground text-sm">
                      {new Date(expense.expense_date).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="py-3 text-muted-foreground text-sm pr-4">
                      {expense.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateExpenseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        propertyId={resolvedPropertyId}
      />
    </div>
  );
}

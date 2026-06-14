'use client';

import { useState } from "react";
import { Plus, Wrench } from "lucide-react";
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
  useMaintenanceQuery,
  useCreateMaintenanceMutation,
  usePatchMaintenanceMutation,
  type MaintenanceTicket,
  type TicketStatus,
  type TicketPriority,
  type CreateTicketPayload,
} from "@/hooks/useMaintenance";

// ─── Badge Helpers ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    URGENT: "bg-red-500 text-white",
    HIGH:   "bg-orange-500 text-white",
    MEDIUM: "bg-blue-500 text-white",
    LOW:    "bg-zinc-200 text-zinc-700 border border-zinc-300",
  };
  return <Badge className={`text-[10px] font-semibold px-2 py-0.5 ${map[priority] ?? ""}`}>{priority}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN:        "bg-amber-100 text-amber-800 border border-amber-200",
    IN_PROGRESS: "bg-sky-100 text-sky-800 border border-sky-200",
    RESOLVED:    "bg-emerald-100 text-emerald-800 border border-emerald-200",
    CANCELLED:   "bg-zinc-100 text-zinc-600 border border-zinc-200",
  };
  return (
    <Badge className={`text-[10px] font-semibold ${map[status] ?? ""}`}>
      {status.replace("_", " ")}
    </Badge>
  );
}

// ─── Create Ticket Dialog ─────────────────────────────────────────────────────
function CreateTicketDialog({
  open,
  onClose,
  propertyId,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
}) {
  const { mutate: create, isPending } = useCreateMaintenanceMutation();
  const [form, setForm] = useState<Partial<CreateTicketPayload>>({ priority: "MEDIUM" });
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof CreateTicketPayload, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    setError(null);
    if (!form.title) { setError("Title is required."); return; }
    if (!form.description) { setError("Description is required."); return; }
    if (!propertyId) { setError("Property ID unavailable. Try again after data loads."); return; }

    create(
      {
        property_id: propertyId,
        title: form.title!,
        description: form.description!,
        priority: form.priority as TicketPriority ?? "MEDIUM",
      },
      {
        onSuccess: () => { onClose(); setForm({ priority: "MEDIUM" }); },
        onError: (err: any) => {
          const msg = err?.response?.data?.message;
          setError(Array.isArray(msg) ? msg.join(", ") : msg ?? "Failed to create ticket.");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Maintenance Ticket</DialogTitle>
          <DialogDescription>Report a new maintenance issue.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              value={form.title ?? ""}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. AC not cooling in Room 101"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Input
              value={form.description ?? ""}
              onChange={e => set("description", e.target.value)}
              placeholder="Describe the issue in detail..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Priority *</Label>
            <Select value={form.priority ?? "MEDIUM"} onValueChange={v => set("priority", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive bg-red-50 border border-red-200 px-3 py-2 rounded-md">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Creating..." : "Create Ticket"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Update Status Dialog ─────────────────────────────────────────────────────
function UpdateStatusDialog({
  ticket,
  open,
  onClose,
}: {
  ticket: MaintenanceTicket | null;
  open: boolean;
  onClose: () => void;
}) {
  const { mutate: patch, isPending } = usePatchMaintenanceMutation();
  const [status, setStatus] = useState<TicketStatus>(ticket?.status ?? "OPEN");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    patch(
      { id: ticket!.id, payload: { status } },
      {
        onSuccess: () => onClose(),
        onError: (err: any) => setError(err?.response?.data?.message ?? "Update failed."),
      }
    );
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
          <DialogDescription>{ticket.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Select value={status} onValueChange={v => setStatus(v as TicketStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Updating..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [updateTicket, setUpdateTicket] = useState<MaintenanceTicket | null>(null);

  const { data: response, isLoading, isError } = useMaintenanceQuery({
    status: statusFilter !== "ALL" ? statusFilter as TicketStatus : undefined,
    priority: priorityFilter !== "ALL" ? priorityFilter as TicketPriority : undefined,
  });

  const tickets = response?.data ?? [];
  const propertyId = tickets[0]?.property_id ?? "";

  const openCount = tickets.filter(t => t.status === "OPEN").length;
  const inProgressCount = tickets.filter(t => t.status === "IN_PROGRESS").length;
  const urgentCount = tickets.filter(t => t.priority === "URGENT").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Maintenance</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage property maintenance tickets.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Open Tickets", value: openCount, color: "text-amber-600" },
          { label: "In Progress", value: inProgressCount, color: "text-sky-600" },
          { label: "Urgent", value: urgentCount, color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border border-border/60 shadow-sm">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Wrench className={`h-5 w-5 ${color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                {isLoading ? <Skeleton className="h-5 w-8 mt-1" /> : (
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="py-4 border-b border-border/50">
          <div className="flex gap-3 flex-wrap items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priority</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{tickets.length} tickets</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-6 px-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : isError ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Failed to load tickets.
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col h-48 items-center justify-center gap-3 text-sm text-muted-foreground border-t border-dashed border-border bg-muted/10">
              <Wrench className="h-8 w-8 opacity-30" />
              No tickets found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/30">
                  <TableHead className="text-xs font-semibold pl-4">Title</TableHead>
                  <TableHead className="text-xs font-semibold">Property / Room</TableHead>
                  <TableHead className="text-xs font-semibold">Priority</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold">Reported</TableHead>
                  <TableHead className="text-xs font-semibold text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-muted/30">
                    <TableCell className="py-3 pl-4">
                      <div className="font-medium text-foreground">{ticket.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ticket.description}</div>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground">
                      <div className="font-medium text-foreground">{ticket.property_name ?? "—"}</div>
                      {ticket.room_number && <div className="text-xs">Room {ticket.room_number}</div>}
                    </TableCell>
                    <TableCell className="py-3"><PriorityBadge priority={ticket.priority} /></TableCell>
                    <TableCell className="py-3"><StatusBadge status={ticket.status} /></TableCell>
                    <TableCell className="py-3 text-muted-foreground text-sm">
                      {new Date(ticket.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short",
                      })}
                    </TableCell>
                    <TableCell className="py-3 text-right pr-4">
                      {ticket.status !== "RESOLVED" && ticket.status !== "CANCELLED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setUpdateTicket(ticket)}
                        >
                          Update Status
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

      <CreateTicketDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        propertyId={propertyId}
      />
      <UpdateStatusDialog
        ticket={updateTicket}
        open={!!updateTicket}
        onClose={() => setUpdateTicket(null)}
      />
    </div>
  );
}

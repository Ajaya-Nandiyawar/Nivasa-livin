'use client';

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  User,
  Shield,
  FileText,
  DollarSign,
  Plus,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings,
  Trash,
  Info,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useTenantQuery,
  useTenantNotesQuery,
  useAddTenantNoteMutation,
  useTenantChargesQuery,
  useAddTenantChargeMutation,
  useUpdateTenantChargeStatusMutation,
  useTenantPaymentsQuery,
  useAddTenantPaymentMutation,
  useTenantDepositTransactionsQuery,
  useAddTenantDepositTransactionMutation,
  useTenantAgreementsQuery,
  useCreateTenantAgreementMutation,
  useTenantStaysQuery,
  useTenantTransfersQuery,
  useTenantCheckoutQuery,
  useUpdateTenantCheckoutMutation,
  useTenantTagsQuery,
  useAddTenantTagMutation,
  useRemoveTenantTagMutation,
  useTenantActivitiesQuery,
  useTenantDocumentsQuery,
  useVerifyTenantDocumentMutation,
  useLogTenantCommunicationMutation,
  useTenantCommunicationLogsQuery,
} from "@/hooks/useTenants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export default function TenantProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Queries
  const { data: tenant, isLoading: loadingTenant } = useTenantQuery(id);
  const { data: notes, refetch: refetchNotes } = useTenantNotesQuery(id);
  const { data: charges, refetch: refetchCharges } = useTenantChargesQuery(id);
  const { data: payments, refetch: refetchPayments } = useTenantPaymentsQuery(id);
  const { data: deposits, refetch: refetchDeposits } = useTenantDepositTransactionsQuery(id);
  const { data: agreements, refetch: refetchAgreements } = useTenantAgreementsQuery(id);
  const { data: stays } = useTenantStaysQuery(id);
  const { data: transfers } = useTenantTransfersQuery(id);
  const { data: checkout, refetch: refetchCheckout } = useTenantCheckoutQuery(id);
  const { data: tags, refetch: refetchTags } = useTenantTagsQuery(id);
  const { data: activities, refetch: refetchActivities } = useTenantActivitiesQuery(id);
  const { data: documents, refetch: refetchDocs } = useTenantDocumentsQuery(id);
  const { data: commLogs, refetch: refetchCommLogs } = useTenantCommunicationLogsQuery(id);

  // Mutations
  const addNoteMutation = useAddTenantNoteMutation();
  const addChargeMutation = useAddTenantChargeMutation();
  const updateChargeStatusMutation = useUpdateTenantChargeStatusMutation();
  const addPaymentMutation = useAddTenantPaymentMutation();
  const addDepositTxMutation = useAddTenantDepositTransactionMutation();
  const createAgreementMutation = useCreateTenantAgreementMutation();
  const updateCheckoutMutation = useUpdateTenantCheckoutMutation();
  const addTagMutation = useAddTenantTagMutation();
  const removeTagMutation = useRemoveTenantTagMutation();
  const verifyDocMutation = useVerifyTenantDocumentMutation();
  const logCommMutation = useLogTenantCommunicationMutation();

  // Local state for modals/forms
  const [noteText, setNoteText] = useState("");
  const [tagText, setTagText] = useState("");
  const [chargeType, setChargeType] = useState("RENT");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeDueDate, setChargeDueDate] = useState("");
  
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState("RENT");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [paymentRef, setPaymentRef] = useState("");

  const [depositAmount, setDepositAmount] = useState("");
  const [depositTxType, setDepositTxType] = useState("DEPOSIT_RECEIVED");
  const [depositRemarks, setDepositRemarks] = useState("");

  const [commChannel, setCommChannel] = useState("WHATSAPP");
  const [commDirection, setCommDirection] = useState("OUTBOUND");
  const [commMsg, setCommMsg] = useState("");

  // Helpers
  const initials = tenant?.full_name
    ? tenant.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const totalCharged = charges?.reduce((sum, c) => c.status !== 'WAIVED' ? sum + Number(c.amount) : sum, 0) || 0;
  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const outstanding = charges?.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + Number(c.amount), 0) || 0;
  const depositHeld = deposits?.reduce((sum, d) => {
    if (d.transaction_type === 'DEPOSIT_RECEIVED') return sum + Number(d.amount);
    if (d.transaction_type === 'DEPOSIT_REFUND' || d.transaction_type === 'DEPOSIT_ADJUSTMENT') return sum - Number(d.amount);
    return sum;
  }, 0) || 0;

  // Reliability Score Calculation
  const totalDueBills = charges?.filter(c => c.charge_type === 'RENT').length || 0;
  const onTimePaidBills = charges?.filter(c => c.charge_type === 'RENT' && c.status === 'PAID').length || 0;
  const reliabilityScore = totalDueBills > 0 ? Math.round((onTimePaidBills / totalDueBills) * 100) : 100;

  // Actions
  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await addNoteMutation.mutateAsync({ tenantId: id, note: noteText });
      toast.success("Note added successfully");
      setNoteText("");
      refetchNotes();
      refetchActivities();
    } catch {
      toast.error("Failed to add note");
    }
  };

  const handleAddTag = async () => {
    if (!tagText.trim()) return;
    try {
      await addTagMutation.mutateAsync({ tenantId: id, tag: tagText.trim().toUpperCase() });
      toast.success("Tag added");
      setTagText("");
      refetchTags();
    } catch {
      toast.error("Failed to add tag");
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTagMutation.mutateAsync({ tenantId: id, tagId });
      toast.success("Tag removed");
      refetchTags();
    } catch {
      toast.error("Failed to remove tag");
    }
  };

  const handleAddCharge = async () => {
    if (!chargeAmount || !chargeDueDate) return;
    try {
      await addChargeMutation.mutateAsync({
        tenantId: id,
        payload: { charge_type: chargeType, amount: Number(chargeAmount), due_date: chargeDueDate }
      });
      toast.success("Charge added successfully");
      setChargeAmount("");
      refetchCharges();
      refetchActivities();
    } catch {
      toast.error("Failed to add charge");
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount) return;
    try {
      await addPaymentMutation.mutateAsync({
        tenantId: id,
        payload: {
          amount: Number(paymentAmount),
          payment_type: paymentType,
          payment_mode: paymentMode,
          reference_number: paymentRef || undefined,
          payment_date: new Date().toISOString().split('T')[0]
        }
      });
      toast.success("Payment logged successfully");
      setPaymentAmount("");
      setPaymentRef("");
      refetchPayments();
      refetchCharges();
      refetchActivities();
    } catch {
      toast.error("Failed to add payment");
    }
  };

  const handleAddDepositTx = async () => {
    if (!depositAmount) return;
    try {
      await addDepositTxMutation.mutateAsync({
        tenantId: id,
        payload: {
          transaction_type: depositTxType,
          amount: Number(depositAmount),
          remarks: depositRemarks || undefined
        }
      });
      toast.success("Deposit ledger updated");
      setDepositAmount("");
      setDepositRemarks("");
      refetchDeposits();
      refetchActivities();
    } catch {
      toast.error("Failed to update deposit ledger");
    }
  };

  const handleVerifyDoc = async (docId: string, currentStatus: boolean) => {
    try {
      await verifyDocMutation.mutateAsync({ tenantId: id, docId, verified: !currentStatus });
      toast.success("Document verification updated");
      refetchDocs();
      refetchActivities();
    } catch {
      toast.error("Failed to update verification status");
    }
  };

  const handleLogComm = async () => {
    if (!commMsg.trim()) return;
    try {
      await logCommMutation.mutateAsync({
        tenantId: id,
        payload: { channel: commChannel, direction: commDirection, message: commMsg }
      });
      toast.success("Communication logged successfully");
      setCommMsg("");
      refetchCommLogs();
    } catch {
      toast.error("Failed to log communication");
    }
  };

  const handleCheckoutUpdate = async (newStatus: string) => {
    try {
      await updateCheckoutMutation.mutateAsync({
        tenantId: id,
        payload: { checkout_status: newStatus }
      });
      toast.success(`Status updated to: ${newStatus}`);
      refetchCheckout();
      refetchActivities();
    } catch {
      toast.error("Failed to update checkout workflow");
    }
  };

  if (loadingTenant) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Profile Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="hover:bg-muted border border-border/40">
            <Link href="/tenants"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tenant Profile</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 backdrop-blur-md border border-border/60 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-2xl font-black ring-4 ring-primary/5 shadow-inner">
              {initials}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-foreground">{tenant?.full_name}</h1>
                <StatusBadge status={tenant?.status || "ACTIVE"} />
                {tags?.map(t => (
                  <Badge key={t.id} variant="outline" className="text-[9px] bg-muted/50 border-border/80 flex items-center gap-1">
                    {t.tag}
                    <button onClick={() => handleRemoveTag(t.id)} className="text-muted-foreground hover:text-red-500 font-bold ml-0.5">×</button>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {tenant?.phone}</span>
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {tenant?.email}</span>
                {tenant?.room_number && (
                  <span className="bg-primary/5 text-primary px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-primary/10">
                    {tenant.property_name} · Room {tenant.room_number} · Bed {tenant.bed_label}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                placeholder="Add Operational Tag..."
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                className="h-9 w-40 text-xs"
              />
            </div>
            <Button size="sm" variant="outline" asChild className="border-border/80">
              <Link href={`/tenants/${id}/edit`}>Edit Details</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Multi-Tab Display */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto p-1 bg-muted/40 border border-border/40 rounded-xl max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="text-xs rounded-lg py-2">Overview</TabsTrigger>
          <TabsTrigger value="personal" className="text-xs rounded-lg py-2">Personal & Guardian</TabsTrigger>
          <TabsTrigger value="kyc" className="text-xs rounded-lg py-2">KYC & Documents</TabsTrigger>
          <TabsTrigger value="stays" className="text-xs rounded-lg py-2">Stay History</TabsTrigger>
          <TabsTrigger value="finance" className="text-xs rounded-lg py-2">Finance Ledger</TabsTrigger>
          <TabsTrigger value="agreements" className="text-xs rounded-lg py-2">Agreements</TabsTrigger>
          <TabsTrigger value="notices" className="text-xs rounded-lg py-2">Checkout Workflow</TabsTrigger>
          <TabsTrigger value="communication" className="text-xs rounded-lg py-2">Communication Logs</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs rounded-lg py-2">Internal Notes</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Financial Ledger Widget */}
            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  Financial Ledger Summary
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                </CardTitle>
                <CardDescription className="text-[11px]">Aggregates for the current lease term</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Charged</p>
                    <p className="text-lg font-black text-foreground">₹{totalCharged.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Paid</p>
                    <p className="text-lg font-black text-emerald-500">₹{totalPaid.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Outstanding</p>
                    <p className={`text-lg font-black ${outstanding > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                      ₹{outstanding.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Deposit Held</p>
                    <p className="text-lg font-black text-indigo-500">₹{depositHeld.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Widget */}
            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  Compliance & KYC Check
                  <Shield className="h-4 w-4 text-indigo-500" />
                </CardTitle>
                <CardDescription className="text-[11px]">Legal and verification checks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs py-1 border-b border-border/40">
                  <span className="font-semibold text-muted-foreground">KYC Status</span>
                  <Badge className={`text-[10px] ${tenant?.kyc_status === 'VERIFIED' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                    {tenant?.kyc_status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-border/40">
                  <span className="font-semibold text-muted-foreground">Police Verification</span>
                  <Badge className={`text-[10px] ${tenant?.police_verification_status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                    {tenant?.police_verification_status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="font-semibold text-muted-foreground">Payment Reliability</span>
                  <span className="font-bold text-foreground">{reliabilityScore}% On-Time</span>
                </div>
              </CardContent>
            </Card>

            {/* Occupancy stay summary */}
            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  Stay Details
                  <Calendar className="h-4 w-4 text-primary" />
                </CardTitle>
                <CardDescription className="text-[11px]">Current property occupancy parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="font-semibold text-muted-foreground">Check-in Date</span>
                  <span className="font-bold text-foreground">
                    {tenant?.check_in_date ? new Date(tenant.check_in_date).toLocaleDateString("en-IN") : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="font-semibold text-muted-foreground">Lead Source</span>
                  <span className="font-bold uppercase text-foreground">{tenant?.lead_source || "WALK_IN"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-semibold text-muted-foreground">Staying Bed</span>
                  <span className="font-mono font-bold text-primary">Room {tenant?.room_number} (Bed {tenant?.bed_label})</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-card/60 backdrop-blur-md border border-border/60 p-6 rounded-3xl space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Quick Operations Dashboard
            </h3>
            <div className="flex flex-wrap gap-3">
              {/* Add Charge Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-border/85 hover:bg-muted"><Plus className="h-4 w-4 mr-1.5" /> Add Charge</Button>
                </DialogTrigger>
                <DialogContent className="bg-card border border-border/80">
                  <DialogHeader>
                    <DialogTitle>Add Charge Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Type</label>
                      <Select value={chargeType} onValueChange={setChargeType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RENT">Rent</SelectItem>
                          <SelectItem value="FOOD">Food</SelectItem>
                          <SelectItem value="ELECTRICITY">Electricity</SelectItem>
                          <SelectItem value="LAUNDRY">Laundry</SelectItem>
                          <SelectItem value="LATE_FEE">Late Fee</SelectItem>
                          <SelectItem value="DAMAGE">Damage</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Amount (INR)</label>
                      <Input type="number" placeholder="Enter amount" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Due Date</label>
                      <Input type="date" value={chargeDueDate} onChange={(e) => setChargeDueDate(e.target.value)} />
                    </div>
                    <Button onClick={handleAddCharge} className="w-full">Create Charge</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Add Payment Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-border/85 hover:bg-muted"><DollarSign className="h-4 w-4 mr-1.5" /> Add Payment Ledger</Button>
                </DialogTrigger>
                <DialogContent className="bg-card border border-border/80">
                  <DialogHeader>
                    <DialogTitle>Log Payment Transaction</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Amount Paid</label>
                      <Input type="number" placeholder="Amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Payment Type</label>
                      <Select value={paymentType} onValueChange={setPaymentType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RENT">Rent</SelectItem>
                          <SelectItem value="DEPOSIT">Security Deposit</SelectItem>
                          <SelectItem value="UTILITY">Utility</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Payment Mode</label>
                      <Select value={paymentMode} onValueChange={setPaymentMode}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="BANK">Bank Transfer</SelectItem>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="CARD">Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Reference / Transaction Number</label>
                      <Input placeholder="Txn Ref" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
                    </div>
                    <Button onClick={handleAddPayment} className="w-full">Submit Payment</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Deposit Adjustments */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-border/85 hover:bg-muted"><Info className="h-4 w-4 mr-1.5" /> Deposit Adjustment</Button>
                </DialogTrigger>
                <DialogContent className="bg-card border border-border/80">
                  <DialogHeader>
                    <DialogTitle>Deposit Transaction Adjustments</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Adjustment Type</label>
                      <Select value={depositTxType} onValueChange={setDepositTxType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DEPOSIT_RECEIVED">Deposit Received</SelectItem>
                          <SelectItem value="DEPOSIT_ADJUSTMENT">Damage Deduction (Adjustment)</SelectItem>
                          <SelectItem value="DEPOSIT_REFUND">Deposit Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Amount (INR)</label>
                      <Input type="number" placeholder="Amount" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Remarks</label>
                      <Textarea placeholder="Explain reasoning..." value={depositRemarks} onChange={(e) => setDepositRemarks(e.target.value)} />
                    </div>
                    <Button onClick={handleAddDepositTx} className="w-full">Post Transaction</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Personal & Guardian Details */}
        <TabsContent value="personal" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Personal Particulars</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoItem label="Email ID" value={tenant?.email} />
                <InfoItem label="Mobile Number" value={tenant?.phone} />
                <InfoItem label="Gender" value={tenant?.gender} />
                <InfoItem label="DOB" value={tenant?.date_of_birth ? new Date(tenant.date_of_birth).toLocaleDateString("en-IN") : "—"} />
                <InfoItem label="Occupation" value={tenant?.occupation} />
                <InfoItem label="Company / College" value={tenant?.company_college} />
                <InfoItem label="Permanent Address" value={tenant?.permanent_address} />
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Guardian & Emergency Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoItem label="Guardian Name" value={tenant?.guardian_name} />
                <InfoItem label="Guardian Mobile" value={tenant?.guardian_mobile} />
                <InfoItem label="Relation to Tenant" value={tenant?.guardian_relation} />
                <InfoItem label="Emergency Contact Name" value={tenant?.emergency_contact_name} />
                <InfoItem label="Emergency Contact Mobile" value={tenant?.emergency_contact_phone} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: KYC & Documents */}
        <TabsContent value="kyc" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Verification Compliances</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-xs py-2 border-b border-border/40">
                  <span className="font-semibold text-muted-foreground">KYC Identity Status</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant={tenant?.kyc_status === 'VERIFIED' ? "default" : "outline"} onClick={async () => {
                      await updateCheckoutMutation.mutateAsync({ tenantId: id, payload: { kyc_status: 'VERIFIED' } as any });
                      toast.success("KYC Verified");
                    }}>VERIFIED</Button>
                    <Button size="sm" variant={tenant?.kyc_status === 'PENDING' ? "default" : "outline"} onClick={async () => {
                      await updateCheckoutMutation.mutateAsync({ tenantId: id, payload: { kyc_status: 'PENDING' } as any });
                      toast.success("KYC Pending");
                    }}>PENDING</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs py-2 border-b border-border/40">
                  <span className="font-semibold text-muted-foreground">Police Verification Compliance</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant={tenant?.police_verification_status === 'APPROVED' ? "default" : "outline"} onClick={async () => {
                      await updateCheckoutMutation.mutateAsync({ tenantId: id, payload: { police_verification_status: 'APPROVED' } as any });
                      toast.success("Police Verification Approved");
                    }}>APPROVED</Button>
                    <Button size="sm" variant={tenant?.police_verification_status === 'NOT_STARTED' ? "default" : "outline"} onClick={async () => {
                      await updateCheckoutMutation.mutateAsync({ tenantId: id, payload: { police_verification_status: 'NOT_STARTED' } as any });
                      toast.success("Police Verification Reset");
                    }}>NOT STARTED</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold">KYC Uploads</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {documents && documents.length > 0 ? (
                  documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between text-xs p-3 rounded-lg border border-border/40 bg-muted/20">
                      <div>
                        <p className="font-bold text-foreground uppercase text-[10px]">{doc.document_type}</p>
                        <p className="text-[10px] text-muted-foreground">{doc.file_name || "Doc URL Link"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <a href={doc.file_url} target="_blank">View File</a>
                        </Button>
                        <Button size="sm" variant={doc.verified ? "default" : "outline"} onClick={() => handleVerifyDoc(doc.id, doc.verified)}>
                          {doc.verified ? "Verified" : "Verify"}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No documents uploaded.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: Stay History */}
        <TabsContent value="stays" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Occupancy Stay Logs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stays && stays.length > 0 ? (
                  stays.map((stay) => (
                    <div key={stay.id} className="relative border-l-2 border-primary/40 pl-4 py-1.5 space-y-1">
                      <span className="absolute -left-[5px] top-2 bg-primary h-2 w-2 rounded-full" />
                      <p className="text-xs font-bold text-foreground">{stay.property_name} · Room {stay.room_number}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(stay.start_date).toLocaleDateString("en-IN")} &mdash; {stay.end_date ? new Date(stay.end_date).toLocaleDateString("en-IN") : "Present"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No stays found.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Room Transfer History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {transfers && transfers.length > 0 ? (
                  transfers.map((tx) => (
                    <div key={tx.id} className="text-xs border border-border/40 p-3 rounded-lg bg-muted/10 space-y-1">
                      <p className="font-bold text-foreground">Room Transfer completed</p>
                      <p className="text-[10px] text-muted-foreground">{tx.reason || "Operational reason"}</p>
                      <p className="text-[9px] text-muted-foreground">{new Date(tx.transferred_at).toLocaleDateString("en-IN")}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No transfers recorded.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 5: Finance Ledger */}
        <TabsContent value="finance" className="mt-6 space-y-6">
          {/* Charges Table */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Charges Ledger</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs pl-5">Type</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Due Date</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right pr-5">Quick Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charges?.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="pl-5 font-bold text-xs uppercase">{c.charge_type}</TableCell>
                      <TableCell className="text-xs font-semibold">₹{Number(c.amount).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(c.due_date).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${
                          c.status === 'PAID' ? "bg-emerald-500/10 text-emerald-500" :
                          c.status === 'WAIVED' ? "bg-zinc-500/10 text-zinc-500" : "bg-red-500/10 text-red-500"
                        }`}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-5">
                        {c.status === 'PENDING' && (
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => {
                              updateChargeStatusMutation.mutateAsync({ tenantId: id, chargeId: c.id, status: 'PAID' });
                              toast.success("Marked Paid");
                            }}>Mark Paid</Button>
                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => {
                              updateChargeStatusMutation.mutateAsync({ tenantId: id, chargeId: c.id, status: 'WAIVED' });
                              toast.success("Waived Charge");
                            }}>Waive</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Payments Table */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Payments Ledger</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs pl-5">Date</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Mode</TableHead>
                    <TableHead className="text-xs">Reference No.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-5 text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell className="text-xs font-bold text-emerald-500">₹{Number(p.amount).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs uppercase font-medium">{p.payment_type}</TableCell>
                      <TableCell className="text-xs font-medium">{p.payment_mode}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{p.reference_number || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Security Deposits Ledger */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Deposit Transactions Ledger</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs pl-5">Date</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Action Type</TableHead>
                    <TableHead className="text-xs">Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits?.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="pl-5 text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell className={`text-xs font-bold ${d.transaction_type === 'DEPOSIT_RECEIVED' ? "text-indigo-500" : "text-red-500"}`}>
                        ₹{Number(d.amount).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-xs font-semibold uppercase">{d.transaction_type.replace('_', ' ')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.remarks || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Agreements */}
        <TabsContent value="agreements" className="mt-6">
          <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Lease Agreements</CardTitle>
                <CardDescription className="text-[11px]">Historical agreements and active leases</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> New Agreement</Button>
                </DialogTrigger>
                <DialogContent className="bg-card border border-border/80">
                  <DialogHeader>
                    <DialogTitle>Create New Lease Agreement</DialogTitle>
                  </DialogHeader>
                  <AgreementForm tenantId={id} createAgreement={createAgreementMutation} refetch={refetchAgreements} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs pl-5">Agreement No.</TableHead>
                    <TableHead className="text-xs">Term (Dates)</TableHead>
                    <TableHead className="text-xs">Rent</TableHead>
                    <TableHead className="text-xs">Deposit</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agreements?.map((agr) => (
                    <TableRow key={agr.id}>
                      <TableCell className="pl-5 text-xs font-bold font-mono">{agr.agreement_number}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(agr.start_date).toLocaleDateString("en-IN")} &mdash; {new Date(agr.end_date).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell className="text-xs">₹{Number(agr.rent_amount).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs">₹{Number(agr.deposit_amount).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] uppercase ${agr.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
                          {agr.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 7: Checkout Workflow */}
        <TabsContent value="notices" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Checkout Workflow Status</CardTitle>
                <CardDescription className="text-[11px]">Manage checkouts and notices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-xs py-2 border-b border-border/40">
                  <span className="font-semibold text-muted-foreground">Checkout Step</span>
                  <Badge className="text-[10px] bg-primary/10 text-primary border border-primary/20">
                    {checkout?.checkout_status || "NOT STARTED"}
                  </Badge>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-bold text-foreground">Operational Triggers</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleCheckoutUpdate("NOTICE_GIVEN")}>NOTICE GIVEN</Button>
                    <Button size="sm" variant="outline" onClick={() => handleCheckoutUpdate("INSPECTION_PENDING")}>INSPECTION PENDING</Button>
                    <Button size="sm" variant="outline" onClick={() => handleCheckoutUpdate("SETTLEMENT_PENDING")}>SETTLEMENT PENDING</Button>
                    <Button size="sm" variant="outline" onClick={() => handleCheckoutUpdate("READY_TO_VACATE")}>READY TO VACATE</Button>
                    <Button size="sm" variant="default" onClick={() => handleCheckoutUpdate("COMPLETED")}>COMPLETE CHECKOUT</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Checklist & Inspection Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <ChecklistRow label="Keys Returned" checked={checkout?.keys_returned} onClick={async () => {
                    await updateCheckoutMutation.mutateAsync({ tenantId: id, payload: { keys_returned: !checkout?.keys_returned } });
                    refetchCheckout();
                  }} />
                  <ChecklistRow label="Room Inspected" checked={checkout?.room_inspected} onClick={async () => {
                    await updateCheckoutMutation.mutateAsync({ tenantId: id, payload: { room_inspected: !checkout?.room_inspected } });
                    refetchCheckout();
                  }} />
                  <ChecklistRow label="Damage Found" checked={checkout?.damage_found} onClick={async () => {
                    await updateCheckoutMutation.mutateAsync({ tenantId: id, payload: { damage_found: !checkout?.damage_found } });
                    refetchCheckout();
                  }} />
                  <ChecklistRow label="Deposit Refund Settled" checked={checkout?.deposit_refunded} onClick={async () => {
                    await updateCheckoutMutation.mutateAsync({ tenantId: id, payload: { deposit_refunded: !checkout?.deposit_refunded } });
                    refetchCheckout();
                  }} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 8: Communication Logs */}
        <TabsContent value="communication" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Log Interaction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Channel</label>
                    <Select value={commChannel} onValueChange={setCommChannel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="CALL">Call</SelectItem>
                        <SelectItem value="EMAIL">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Direction</label>
                    <Select value={commDirection} onValueChange={setCommDirection}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OUTBOUND">Outbound (Sent)</SelectItem>
                        <SelectItem value="INBOUND">Inbound (Received)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Message Summary</label>
                  <Textarea value={commMsg} onChange={(e) => setCommMsg(e.target.value)} placeholder="Rent reminder sent, complaint follow-up, etc..." />
                </div>
                <Button onClick={handleLogComm} className="w-full">Log Interaction</Button>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Interactions history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[300px] overflow-y-auto">
                {commLogs && commLogs.length > 0 ? (
                  commLogs.map((log) => (
                    <div key={log.id} className="text-xs border-b border-border/40 pb-2.5 space-y-1">
                      <div className="flex justify-between items-center">
                        <Badge variant="outline" className="text-[9px] uppercase font-bold">{log.channel} · {log.direction}</Badge>
                        <span className="text-[9px] text-muted-foreground">{new Date(log.created_at).toLocaleDateString("en-IN")}</span>
                      </div>
                      <p className="text-foreground">{log.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No interactions logged.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 9: Internal Notes & Activities */}
        <TabsContent value="notes" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Manager-Only Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Type private operational notes..." className="text-xs min-h-[80px]" />
                  <Button onClick={handleAddNote} size="sm">Add Private Note</Button>
                </div>

                <div className="space-y-3 pt-3 border-t border-border/40">
                  {notes && notes.length > 0 ? (
                    notes.map((n) => (
                      <div key={n.id} className="text-xs bg-muted/20 border border-border/40 p-3 rounded-lg space-y-1">
                        <p className="text-foreground font-medium">{n.note}</p>
                        <span className="text-[9px] text-muted-foreground">Logged at {new Date(n.created_at).toLocaleDateString("en-IN")}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No notes logged yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold">System Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
                {activities && activities.length > 0 ? (
                  activities.map((act) => (
                    <div key={act.id} className="relative border-l border-border pl-4 pb-4 last:pb-0">
                      <span className="absolute -left-[5px] top-1.5 bg-primary/40 h-2.5 w-2.5 rounded-full" />
                      <p className="text-xs font-bold text-foreground uppercase tracking-wide text-[9px]">{act.activity_type.replace('_', ' ')}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(act.created_at).toLocaleDateString("en-IN")} · {new Date(act.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "numeric" })}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No activities found.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="text-xs py-1.5 border-b border-border/40 last:border-b-0 flex justify-between">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value || "—"}</span>
    </div>
  );
}

function ChecklistRow({ label, checked, onClick }: { label: string; checked?: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between text-xs py-2 border-b border-border/40 last:border-b-0">
      <span className="font-medium text-foreground">{label}</span>
      <Button size="sm" variant={checked ? "default" : "outline"} onClick={onClick}>
        {checked ? "Done" : "Mark Done"}
      </Button>
    </div>
  );
}

function AgreementForm({ tenantId, createAgreement, refetch }: { tenantId: string; createAgreement: any; refetch: () => void }) {
  const [num, setNum] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");

  const handleSubmit = async () => {
    if (!start || !end || !rent || !deposit) return;
    try {
      await createAgreement.mutateAsync({
        tenantId,
        payload: {
          agreement_number: num || undefined,
          start_date: start,
          end_date: end,
          rent_amount: Number(rent),
          deposit_amount: Number(deposit)
        }
      });
      toast.success("Lease Agreement created!");
      refetch();
    } catch {
      toast.error("Failed to create lease agreement");
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground">Agreement Number (Optional)</label>
        <Input placeholder="AGR-XXXX" value={num} onChange={(e) => setNum(e.target.value)} />
      </div>
      <div className="flex gap-4">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">Start Date</label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">End Date</label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">Rent Amount</label>
          <Input type="number" placeholder="Rent" value={rent} onChange={(e) => setRent(e.target.value)} />
        </div>
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">Deposit Amount</label>
          <Input type="number" placeholder="Deposit" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
        </div>
      </div>
      <Button onClick={handleSubmit} className="w-full">Create Agreement</Button>
    </div>
  );
}

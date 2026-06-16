'use client';

import { useState } from 'react';
import {
  CalendarDays,
  Search,
  ArrowRightLeft,
  LogOut,
  Info,
  CheckCircle2,
  Phone,
  Mail,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  useBookingsQuery,
  useBookingDetailQuery,
  useCheckoutMutation,
  useTransferMutation,
  BookingStatus
} from '@/hooks/useBookings';
import { usePropertiesQuery, useRoomsQuery } from '@/hooks/useRooms';

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState<BookingStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  
  // Dialog controls
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Form states for checkout
  const [checkoutDate, setCheckoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [checkoutResult, setCheckoutResult] = useState<any>(null);

  // Form states for transfer
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedBedId, setSelectedBedId] = useState<string>('');

  // Fetch bookings data
  const { data: bookingsData, isLoading, refetch } = useBookingsQuery({
    status: activeTab === 'ALL' ? undefined : activeTab,
    limit: 100, // Load a large batch to search locally
  });

  // Fetch single booking detail when selected
  const { data: bookingDetail, isLoading: isLoadingDetail } = useBookingDetailQuery(
    selectedBookingId || undefined
  );

  // Fetch properties and rooms/beds for transfer
  const { data: properties } = usePropertiesQuery();
  const { data: rooms } = useRoomsQuery(selectedPropertyId || undefined);

  // Mutations
  const checkoutMutation = useCheckoutMutation();
  const transferMutation = useTransferMutation();

  // Statistics calculation based on loaded data or standard static stats
  const bookings = bookingsData?.data || [];
  const activeCount = bookings.filter((b) => b.status === 'ACTIVE').length;
  const checkedOutCount = bookings.filter((b) => b.status === 'CHECKED_OUT').length;
  const transferredCount = bookings.filter((b) => b.status === 'TRANSFERRED').length;

  // Search filter
  const filteredBookings = bookings.filter((b) =>
    b.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.property_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.room_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDetail = (id: string) => {
    setSelectedBookingId(id);
    setIsDetailOpen(true);
  };

  const handleOpenCheckout = (id: string) => {
    setSelectedBookingId(id);
    setCheckoutDate(new Date().toISOString().split('T')[0]);
    setCheckoutNotes('');
    setCheckoutResult(null);
    setIsCheckoutOpen(true);
  };

  const handleOpenTransfer = (id: string) => {
    setSelectedBookingId(id);
    setTransferDate(new Date().toISOString().split('T')[0]);
    setSelectedPropertyId('');
    setSelectedBedId('');
    setIsTransferOpen(true);
  };

  const handleProcessCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId) return;

    try {
      const result = await checkoutMutation.mutateAsync({
        id: selectedBookingId,
        payload: {
          check_out_date: checkoutDate,
          notes: checkoutNotes,
        },
      });
      setCheckoutResult(result);
      toast.success('Checkout completed successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to process checkout');
    }
  };

  const handleProcessTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId || !selectedBedId) {
      toast.error('Please select a property and a vacant bed');
      return;
    }

    try {
      await transferMutation.mutateAsync({
        id: selectedBookingId,
        payload: {
          new_bed_id: selectedBedId,
          transfer_date: transferDate,
        },
      });
      toast.success('Bed transfer processed successfully');
      setIsTransferOpen(false);
      setIsDetailOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to process bed transfer');
    }
  };

  // Find all vacant beds in the selected property
  const vacantBeds = rooms?.flatMap((room) =>
    room.beds
      .filter((bed) => bed.status === 'VACANT')
      .map((bed) => ({
        id: bed.id,
        label: `${room.roomNumber} - Bed ${bed.label}`,
        rent: room.rent
      }))
  ) || [];

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20">Active</Badge>;
      case 'TRANSFERRED':
        return <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20">Transferred</Badge>;
      case 'CHECKED_OUT':
        return <Badge className="bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 hover:bg-zinc-500/20">Checked Out</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Bookings Command</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage check-outs, room transfers, and audit tenant occupancy histories.</p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-border/60 bg-card/70 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Bookings</p>
              <h3 className="text-2xl font-black tracking-tight text-foreground">
                {isLoading ? <Skeleton className="h-7 w-12" /> : bookings.length}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/70 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Occupants</p>
              <h3 className="text-2xl font-black tracking-tight text-emerald-500">
                {isLoading ? <Skeleton className="h-7 w-12" /> : activeCount}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/70 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Transferred</p>
              <h3 className="text-2xl font-black tracking-tight text-amber-500">
                {isLoading ? <Skeleton className="h-7 w-12" /> : transferredCount}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/70 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Checked Out</p>
              <h3 className="text-2xl font-black tracking-tight text-zinc-500">
                {isLoading ? <Skeleton className="h-7 w-12" /> : checkedOutCount}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-500/10 text-zinc-500">
              <LogOut className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Table & Filters */}
      <Card className="border border-border/60 bg-card/40 backdrop-blur-md shadow-sm">
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold">Booking Logs</CardTitle>
            <CardDescription className="text-xs">Filter and perform operations on guest records.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenant, property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            {/* Quick Status Select Tabs */}
            <div className="flex bg-muted/60 p-1 rounded-lg border border-border/30 w-full sm:w-auto">
              {(['ALL', 'ACTIVE', 'TRANSFERRED', 'CHECKED_OUT'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-md uppercase transition-all tracking-wider ${
                    activeTab === tab
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No bookings found matching filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/40 hover:bg-transparent">
                  <TableHead className="w-[200px] text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tenant</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Property</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Room & Bed</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Check-in</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Check-out</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                    <TableCell className="font-semibold text-xs py-3">{booking.tenant_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{booking.property_name}</TableCell>
                    <TableCell className="text-xs text-foreground font-mono">
                      {booking.room_number} ({booking.bed_label})
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(booking.check_in_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {booking.check_out_date
                        ? new Date(booking.check_out_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </TableCell>
                    <TableCell className="py-2">{getStatusBadge(booking.status)}</TableCell>
                    <TableCell className="text-right py-2 space-x-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-muted"
                        onClick={() => handleOpenDetail(booking.id)}
                        title="View Details"
                      >
                        <Info className="h-4 w-4 text-primary" />
                      </Button>
                      {booking.status === 'ACTIVE' && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-500 text-amber-500/80"
                            onClick={() => handleOpenTransfer(booking.id)}
                            title="Transfer Bed"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500 text-red-500/80"
                            onClick={() => handleOpenCheckout(booking.id)}
                            title="Check Out"
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Booking Details Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md border border-border/60 bg-card/95 backdrop-blur-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Booking Summary
            </DialogTitle>
          </DialogHeader>
          {isLoadingDetail || !bookingDetail ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="space-y-5 text-xs">
              <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg border border-border/30">
                <div>
                  <h4 className="font-bold text-sm text-foreground">{bookingDetail.tenant_name}</h4>
                  <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {bookingDetail.tenant_phone || 'N/A'}</span>
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {bookingDetail.tenant_email || 'N/A'}</span>
                  </div>
                </div>
                {getStatusBadge(bookingDetail.status)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Property</label>
                  <span className="font-semibold text-foreground">{bookingDetail.property_name}</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Room & Bed</label>
                  <span className="font-semibold text-foreground font-mono">{bookingDetail.room_number} ({bookingDetail.bed_label})</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Check-in Date</label>
                  <span className="font-semibold text-foreground">
                    {new Date(bookingDetail.check_in_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Check-out Date</label>
                  <span className="font-semibold text-foreground">
                    {bookingDetail.check_out_date
                      ? new Date(bookingDetail.check_out_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                      : 'Active Stay'}
                  </span>
                </div>
              </div>

              <hr className="border-border/40" />

              <div className="grid grid-cols-3 gap-2 text-center bg-muted/20 p-2.5 rounded-lg border border-border/20">
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Monthly Rent</label>
                  <span className="font-black text-sm text-foreground">₹{Number(bookingDetail.monthly_rent).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Security Deposit</label>
                  <span className="font-black text-sm text-foreground">₹{Number(bookingDetail.security_deposit).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Billing Cycle</label>
                  <span className="font-black text-sm text-foreground">{bookingDetail.billing_date}st / mo</span>
                </div>
              </div>

              {bookingDetail.notes && (
                <div className="bg-muted/40 p-2.5 rounded-lg border border-border/20">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Stay Notes</label>
                  <p className="text-muted-foreground italic">{bookingDetail.notes}</p>
                </div>
              )}

              {bookingDetail.status === 'ACTIVE' && (
                <DialogFooter className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="h-8 text-xs flex items-center gap-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-500/5"
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleOpenTransfer(bookingDetail.id);
                    }}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer Bed
                  </Button>
                  <Button
                    className="h-8 text-xs flex items-center gap-1.5 bg-red-500 text-white hover:bg-red-600"
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleOpenCheckout(bookingDetail.id);
                    }}
                  >
                    <LogOut className="h-3.5 w-3.5" /> Check Out
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Processing Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md border border-border/60 bg-card/95 backdrop-blur-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-500">
              <LogOut className="h-5 w-5" /> Process Check-Out
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirm exit date, record checkout notes, and compute final deposit refund details.
            </DialogDescription>
          </DialogHeader>

          {checkoutResult ? (
            <div className="space-y-4 py-2">
              <div className="bg-emerald-500/10 text-emerald-500 p-4 rounded-xl border border-emerald-500/20 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2" />
                <h4 className="font-bold text-sm">Checkout Processed</h4>
                <p className="text-xs mt-0.5">Summary receipt successfully recorded and sent to guest.</p>
              </div>

              <div className="space-y-2 bg-muted/40 p-4 rounded-xl border border-border/40 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Security Deposit Held:</span>
                  <span className="font-bold">₹{checkoutResult.security_deposit.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>Less: Unpaid Dues/Deductions:</span>
                  <span className="font-bold">- ₹{checkoutResult.total_deductions.toLocaleString('en-IN')}</span>
                </div>
                <hr className="border-border/60 my-2" />
                <div className="flex justify-between text-sm font-black text-foreground">
                  <span>Net Refund Amount:</span>
                  <span>₹{checkoutResult.refund_amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <DialogFooter>
                <Button className="w-full text-xs h-9" onClick={() => setIsCheckoutOpen(false)}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleProcessCheckout} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="checkoutDate" className="text-xs font-bold">Check-Out Date</Label>
                <Input
                  id="checkoutDate"
                  type="date"
                  value={checkoutDate}
                  onChange={(e) => setCheckoutDate(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkoutNotes" className="text-xs font-bold">Checkout & Damage Inspection Notes</Label>
                <Textarea
                  id="checkoutNotes"
                  placeholder="Mention key returns, utility bills clearance status, or room inspection damage notes..."
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  className="text-xs min-h-[80px]"
                />
              </div>

              <div className="bg-amber-500/10 text-amber-500/90 text-xs p-3 rounded-lg border border-amber-500/20 flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  This action releases the bed space and marks the booking status as Checked Out. Unpaid dues will be automatically deducted from the deposit ledger.
                </p>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs"
                  onClick={() => setIsCheckoutOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={checkoutMutation.isPending}
                  className="h-9 text-xs bg-red-500 text-white hover:bg-red-600"
                >
                  {checkoutMutation.isPending ? 'Processing...' : 'Confirm Check-Out'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Bed Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-md border border-border/60 bg-card/95 backdrop-blur-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" /> Bed Transfer Workflow
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Transfer this tenant to another property or room. Only vacant beds are displayed.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleProcessTransfer} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="transferDate" className="text-xs font-bold">Transfer Effective Date</Label>
              <Input
                id="transferDate"
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Target Property</Label>
              <Select value={selectedPropertyId} onValueChange={(val) => {
                setSelectedPropertyId(val);
                setSelectedBedId('');
              }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id} className="text-xs">
                      {prop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPropertyId && (
              <div className="space-y-2">
                <Label className="text-xs font-bold">Available Beds</Label>
                <Select value={selectedBedId} onValueChange={setSelectedBedId}>
                  <SelectTrigger className="h-9 text-xs font-mono">
                    <SelectValue placeholder="Select vacant room & bed" />
                  </SelectTrigger>
                  <SelectContent>
                    {vacantBeds.length === 0 ? (
                      <div className="text-center py-2 text-xs text-muted-foreground">
                        No vacant beds found in this property.
                      </div>
                    ) : (
                      vacantBeds.map((bed) => (
                        <SelectItem key={bed.id} value={bed.id} className="text-xs font-mono">
                          {bed.label} ({bed.rent})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 text-xs"
                onClick={() => setIsTransferOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={transferMutation.isPending || !selectedBedId}
                className="h-9 text-xs"
              >
                {transferMutation.isPending ? 'Transferring...' : 'Execute Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

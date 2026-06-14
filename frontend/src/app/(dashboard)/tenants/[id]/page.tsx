'use client';

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantQuery } from "@/hooks/useTenants";
import { useRentQuery } from "@/hooks/useRent";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function RentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    PARTIAL: "bg-blue-100 text-blue-800 border border-blue-200",
    OVERDUE: "bg-red-100 text-red-800 border border-red-200",
    PENDING: "bg-zinc-100 text-zinc-600 border border-zinc-200",
  };
  return (
    <Badge className={`text-[10px] font-semibold tracking-wide ${map[status] ?? ""}`}>
      {status}
    </Badge>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TenantProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: tenant, isLoading: loadingTenant } = useTenantQuery(id);
  const { data: rentRecords, isLoading: loadingRent } = useRentQuery({ tenant_id: id });

  const initials = tenant?.full_name
    ? tenant.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenants"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          {loadingTenant ? (
            <ProfileSkeleton />
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl font-bold">
                {initials}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                  {tenant?.full_name}
                  <Badge className={`text-[10px] ${
                    tenant?.booking_status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                  }`}>
                    {tenant?.booking_status ?? "UNKNOWN"}
                  </Badge>
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {tenant?.phone}
                  {tenant?.room_number && (
                    <> &mdash; Room {tenant.room_number}, Bed {tenant.bed_label} · {tenant.property_name}</>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
        <Button variant="outline" asChild>
          <Link href={`/tenants/${id}/edit`}>Edit Tenant</Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="rent">Rent History</TabsTrigger>
          <TabsTrigger value="booking">Booking</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          <Card className="border border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTenant ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InfoItem icon={Mail} label="Email" value={tenant?.email} />
                  <InfoItem icon={Phone} label="Phone" value={tenant?.phone} />
                  <InfoItem icon={Briefcase} label="Occupation" value={tenant?.occupation ?? "—"} />
                  <InfoItem icon={Calendar} label="Date of Birth"
                    value={tenant?.date_of_birth
                      ? new Date(tenant.date_of_birth).toLocaleDateString("en-IN")
                      : "—"}
                  />
                  <InfoItem icon={Phone} label="Emergency Contact"
                    value={tenant?.emergency_contact_name
                      ? `${tenant.emergency_contact_name} (${tenant.emergency_contact_phone})`
                      : "—"}
                  />
                  <InfoItem icon={MapPin} label="Permanent Address" value={tenant?.permanent_address ?? "—"} />
                  {tenant?.aadhaar_number && (
                    <InfoItem icon={null} label="Aadhaar" value={`XXXX XXXX ${tenant.aadhaar_number.slice(-4)}`} />
                  )}
                  {tenant?.pan_number && (
                    <InfoItem icon={null} label="PAN" value={tenant.pan_number} />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rent History Tab */}
        <TabsContent value="rent" className="mt-6">
          <Card className="border border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Rent History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingRent ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : !rentRecords || rentRecords.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  No rent records found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30">
                      <TableHead className="text-xs font-semibold pl-4">Period</TableHead>
                      <TableHead className="text-xs font-semibold">Rent</TableHead>
                      <TableHead className="text-xs font-semibold">Paid</TableHead>
                      <TableHead className="text-xs font-semibold">Balance</TableHead>
                      <TableHead className="text-xs font-semibold">Due Date</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rentRecords.map((rec) => (
                      <TableRow key={rec.id} className="hover:bg-muted/30">
                        <TableCell className="py-3 pl-4 font-medium">
                          {MONTH_NAMES[rec.period_month - 1]} {rec.period_year}
                        </TableCell>
                        <TableCell className="py-3">₹{Number(rec.rent_amount).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="py-3 text-emerald-700 font-semibold">
                          ₹{Number(rec.paid_amount).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className={`py-3 font-semibold ${Number(rec.balance) > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                          ₹{Number(rec.balance).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="py-3 text-muted-foreground text-sm">
                          {new Date(rec.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </TableCell>
                        <TableCell className="py-3">
                          <RentStatusBadge status={rec.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Tab */}
        <TabsContent value="booking" className="mt-6">
          <Card className="border border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Current Booking</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTenant ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-56" />
                </div>
              ) : tenant?.booking_id ? (
                <div className="relative border-l-2 border-primary/40 ml-3 pl-6 space-y-6">
                  <div className="relative">
                    <span className="absolute -left-[31px] bg-primary h-4 w-4 rounded-full ring-4 ring-background" />
                    <h3 className="font-semibold text-foreground">
                      {tenant.property_name} — Room {tenant.room_number}, Bed {tenant.bed_label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Check-in: {tenant.check_in_date
                        ? new Date(tenant.check_in_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                        : "—"
                      } &mdash; Present
                    </p>
                    <p className="text-sm mt-1.5">
                      Monthly Rent: <span className="font-semibold">₹{Number(tenant.monthly_rent).toLocaleString("en-IN")}</span>
                    </p>
                    <Badge className="mt-2 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px]">
                      {tenant.booking_status}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No active booking found.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <p className="text-sm font-medium text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}

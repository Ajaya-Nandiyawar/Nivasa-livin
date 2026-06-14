'use client';

import { Users, BedDouble, IndianRupee, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useOccupancyQuery,
  useOutstandingQuery,
  useRevenueQuery,
} from "@/hooks/useDashboard";

interface KPICardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ElementType;
  isLoading?: boolean;
}

function KPICard({ title, value, subtext, icon: Icon, isLoading }: KPICardProps) {
  if (isLoading) {
    return (
      <Card className="border border-border/60 shadow-sm bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      </CardContent>
    </Card>
  );
}

export function KPICards() {
  const { data: occupancy, isLoading: loadingOccupancy } = useOccupancyQuery();
  const { data: outstanding, isLoading: loadingOutstanding } = useOutstandingQuery();
  const { data: revenue, isLoading: loadingRevenue } = useRevenueQuery();

  // MTD calculations: take the latest month in the revenue series
  const mtdRevenue = (() => {
    if (!revenue || revenue.length === 0) return 0;
    const latest = revenue[revenue.length - 1];
    return Number(latest.total_revenue || 0);
  })();

  // Outstanding calculations: sum all aging buckets
  const totalOutstanding = (() => {
    if (!outstanding) return 0;
    return Object.values(outstanding).reduce((sum, current) => sum + Number(current || 0), 0);
  })();

  const isGlobalLoading = loadingOccupancy || loadingOutstanding || loadingRevenue;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Total Active Tenants"
        value={occupancy?.occupied_beds ?? 0}
        subtext={`Occupying ${occupancy?.occupied_beds ?? 0} of ${occupancy?.total_beds ?? 0} beds`}
        icon={Users}
        isLoading={isGlobalLoading}
      />
      <KPICard
        title="Occupancy Rate"
        value={`${(occupancy?.occupancy_rate ?? 0).toFixed(1)}%`}
        subtext="Beds filled in all active properties"
        icon={BedDouble}
        isLoading={isGlobalLoading}
      />
      <KPICard
        title="Rent Collected (MTD)"
        value={`₹${mtdRevenue.toLocaleString('en-IN')}`}
        subtext="Current month total payments"
        icon={IndianRupee}
        isLoading={isGlobalLoading}
      />
      <KPICard
        title="Outstanding Dues"
        value={`₹${totalOutstanding.toLocaleString('en-IN')}`}
        subtext="Sum of all overdue payments"
        icon={AlertCircle}
        isLoading={isGlobalLoading}
      />
    </div>
  );
}

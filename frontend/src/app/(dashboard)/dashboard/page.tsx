import { KPICards } from "@/components/dashboard/KPICards";
import { Charts } from "@/components/dashboard/Charts";
import { QuickLedger } from "@/components/dashboard/QuickLedger";
import { MaintenanceTable } from "@/components/dashboard/MaintenanceTable";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard Overview</h1>
      </div>
      
      {/* Top Row: KPI Cards */}
      <KPICards />

      {/* Second Row: Charts */}
      <Charts />

      {/* Third Row: Recent Payments & Upcoming Dues */}
      <QuickLedger />

      {/* Bottom Row: Maintenance Tickets */}
      <MaintenanceTable />
    </div>
  );
}

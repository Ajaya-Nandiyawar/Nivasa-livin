'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  DoorClosed, 
  CalendarDays, 
  IndianRupee, 
  ReceiptText, 
  Wrench, 
  UserPlus, 
  LineChart, 
  Settings 
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tenants", href: "/tenants", icon: Users },
  { name: "Rooms", href: "/rooms", icon: DoorClosed },
  { name: "Bookings", href: "/bookings", icon: CalendarDays },
  { name: "Rent", href: "/rent", icon: IndianRupee },
  { name: "Expenses", href: "/expenses", icon: ReceiptText },
  { name: "Maintenance", href: "/maintenance", icon: Wrench },
  { name: "Visitors", href: "/visitors", icon: UserPlus },
  { name: "Reports", href: "/reports", icon: LineChart },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center px-6 py-4">
        <h1 className="text-xl font-bold text-primary">Nivasa PG</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            A
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">Admin User</span>
            <span className="text-xs text-muted-foreground mt-1">SUPER_ADMIN</span>
          </div>
        </div>
      </div>
    </div>
  );
}

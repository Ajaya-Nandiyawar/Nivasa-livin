'use client';

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Bell, LogOut, Settings, ChevronDown } from "lucide-react";
import Cookies from "js-cookie";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/axios";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Generate breadcrumbs from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, idx) => {
    const href = '/' + pathSegments.slice(0, idx + 1).join('/');
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    return { label, href };
  });

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.error("Logout API call failed, proceeding to clear token client-side", err);
    } finally {
      Cookies.remove('accessToken');
      router.push('/login');
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-8 relative">
      <div className="flex flex-1 items-center gap-4">
        {/* Dynamic Breadcrumbs */}
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground font-medium transition-colors">
            Nivasa PG
          </Link>
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-2">
              <span>/</span>
              <Link
                href={crumb.href}
                className={`transition-colors hover:text-foreground ${
                  idx === breadcrumbs.length - 1
                    ? "text-foreground font-semibold"
                    : "font-medium"
                }`}
              >
                {crumb.label}
              </Link>
            </span>
          ))}
          {breadcrumbs.length === 0 && (
            <span className="flex items-center gap-2">
              <span>/</span>
              <span className="text-foreground font-semibold">Dashboard</span>
            </span>
          )}
        </div>

        <div className="relative w-full max-w-md ml-0 md:ml-8">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search tenants, rooms, or properties..."
            className="w-full bg-background pl-9 border-border text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></span>
        </Button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground p-1.5 rounded-md transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
              A
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
          </button>

          {dropdownOpen && (
            <>
              {/* Overlay helper to close dropdown when clicking outside */}
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setDropdownOpen(false)}
              />
              
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-popover text-popover-foreground shadow-md z-40 py-1">
                <div className="px-4 py-2 border-b border-border">
                  <p className="text-sm font-medium leading-none">Admin User</p>
                  <p className="text-xs text-muted-foreground mt-1">admin@nivasalivin.com</p>
                </div>
                
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useMaintenanceTicketsQuery } from "@/hooks/useDashboard";

export function MaintenanceTable() {
  // Fetch tickets. The API defaults to sorting by created_at desc.
  const { data: response, isLoading } = useMaintenanceTicketsQuery({ limit: 10 });
  const tickets = response?.data || [];

  if (isLoading) {
    return (
      <Card className="border border-border/60 shadow-sm bg-card">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Helper to color-code priority badges
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white font-medium text-[10px] tracking-wide px-2 py-0.5">URGENT</Badge>;
      case "HIGH":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-medium text-[10px] tracking-wide px-2 py-0.5">HIGH</Badge>;
      case "MEDIUM":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-medium text-[10px] tracking-wide px-2 py-0.5">MEDIUM</Badge>;
      case "LOW":
      default:
        return <Badge variant="outline" className="text-muted-foreground border-border text-[10px] tracking-wide px-2 py-0.5">LOW</Badge>;
    }
  };

  // Helper to color-code status badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <Badge className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 font-semibold text-[10px] tracking-wide px-2 py-0.5">
            OPEN
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge className="bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-200 font-semibold text-[10px] tracking-wide px-2 py-0.5">
            IN PROGRESS
          </Badge>
        );
      case "RESOLVED":
        return (
          <Badge className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-200 font-semibold text-[10px] tracking-wide px-2 py-0.5">
            RESOLVED
          </Badge>
        );
      case "CANCELLED":
      default:
        return (
          <Badge variant="secondary" className="text-muted-foreground font-semibold text-[10px] tracking-wide px-2 py-0.5">
            CANCELLED
          </Badge>
        );
    }
  };

  return (
    <Card className="border border-border/60 shadow-sm bg-card w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
          Open Maintenance Tickets
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md bg-muted/20">
            No active maintenance tickets
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">Property</TableHead>
                <TableHead className="text-xs font-semibold">Room</TableHead>
                <TableHead className="text-xs font-semibold">Title</TableHead>
                <TableHead className="text-xs font-semibold">Priority</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Reported</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => {
                const dateObj = new Date(ticket.created_at);
                const formattedDate = dateObj.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <TableRow key={ticket.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-foreground py-3">
                      {ticket.property_name || "Nivasa Property"}
                    </TableCell>
                    <TableCell className="text-foreground py-3">
                      {ticket.room_number ? `Room ${ticket.room_number}` : "N/A"}
                    </TableCell>
                    <TableCell className="font-medium text-foreground py-3">
                      <div className="flex flex-col">
                        <span>{ticket.title}</span>
                        <span className="text-xs text-muted-foreground font-normal mt-0.5 line-clamp-1">
                          {ticket.description}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell className="py-3">{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="text-right text-muted-foreground py-3">
                      {formattedDate}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

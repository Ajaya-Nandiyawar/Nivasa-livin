import { CalendarDays, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function BookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Bookings</h1>
        <p className="text-muted-foreground text-sm mt-1">View and manage tenant booking history.</p>
      </div>
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CalendarDays className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Bookings Module</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm">
              Full booking lifecycle management — check-ins, check-outs, and bed transfers — will be available here.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            <Clock className="h-3 w-3" />
            Coming in next release
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

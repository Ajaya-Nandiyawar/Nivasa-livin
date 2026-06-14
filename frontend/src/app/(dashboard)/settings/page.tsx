import { Settings, User, Shield, Bell, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account, security, and preferences.</p>
      </div>

      {/* Account Overview */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="h-4 w-4" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Full Name", value: "System Administrator" },
            { label: "Email", value: "admin@nivasalivin.com" },
            { label: "Role", value: "SUPER_ADMIN", badge: true },
            { label: "Account Status", value: "Active", badge: true, variant: "success" },
          ].map(({ label, value, badge, variant }) => (
            <div key={label} className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
              {badge ? (
                <Badge className={`text-xs ${variant === "success" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-primary/10 text-primary border border-primary/20"}`}>
                  {value}
                </Badge>
              ) : (
                <p className="text-sm font-medium text-foreground">{value}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Coming Soon Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            icon: Shield,
            title: "Security Settings",
            desc: "Change password, enable 2FA, and manage session tokens.",
          },
          {
            icon: Bell,
            title: "Notification Preferences",
            desc: "Configure email alerts for overdue rent, URGENT tickets, and move-outs.",
          },
          {
            icon: Settings,
            title: "Property Configuration",
            desc: "Add new properties, manage floors and room templates.",
          },
          {
            icon: User,
            title: "User Management",
            desc: "Create Manager and Viewer accounts for your team.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="border border-border/60 shadow-sm bg-muted/20">
            <CardContent className="pt-5 pb-5 flex gap-4 items-start">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full mt-2 w-fit">
                  <Clock className="h-3 w-3" />
                  Coming soon
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

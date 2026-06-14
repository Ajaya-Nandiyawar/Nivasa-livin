import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, UserPlus, IndianRupee, Bed } from "lucide-react";

interface BedInfo {
  id: string;
  label: string;
  status: 'VACANT' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  tenant?: string;
}

export interface RoomDetail {
  id: string;
  roomNumber: string;
  type: string;
  rent: string;
  amenities: string[];
  beds: BedInfo[];
}

interface RoomDetailDrawerProps {
  room: RoomDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoomDetailDrawer({ room, open, onOpenChange }: RoomDetailDrawerProps) {
  if (!room) return null;

  const getStatusColor = (status: BedInfo['status']) => {
    switch(status) {
      case 'OCCUPIED': return 'bg-success';
      case 'VACANT': return 'bg-primary';
      case 'RESERVED': return 'bg-warning';
      case 'MAINTENANCE': return 'bg-danger';
      default: return 'bg-neutral';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              Room {room.roomNumber}
              <Badge variant="outline">{room.type}</Badge>
            </SheetTitle>
          </div>
          <SheetDescription>
            Manage room details, bed allocations, and maintenance.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Monthly Rent</p>
              <p className="font-medium text-lg">{room.rent}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Amenities</p>
              <div className="flex flex-wrap gap-1">
                {room.amenities.map(amenity => (
                  <Badge key={amenity} variant="secondary" className="text-xs">{amenity}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Bed Allocations</h3>
            <div className="space-y-3">
              {room.beds.map((bed) => (
                <div key={bed.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                      <Bed className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Bed {bed.label}</span>
                        <div className={`h-2 w-2 rounded-full ${getStatusColor(bed.status)}`} title={bed.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {bed.tenant ? bed.tenant : 'No tenant assigned'}
                      </p>
                    </div>
                  </div>
                  {bed.status === 'VACANT' && (
                    <Button size="sm" variant="outline">Assign</Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-6 space-y-3">
            <h3 className="font-semibold mb-2">Quick Actions</h3>
            <Button variant="outline" className="w-full justify-start">
              <Wrench className="h-4 w-4 mr-2" /> Mark for Maintenance
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <IndianRupee className="h-4 w-4 mr-2" /> Edit Room Rent
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <UserPlus className="h-4 w-4 mr-2" /> Add Additional Bed
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

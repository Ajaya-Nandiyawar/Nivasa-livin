'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wrench, UserPlus, IndianRupee, Bed, Check, X } from "lucide-react";
import { RoomDetail, useUpdateRoomRentMutation, useAddBedMutation, useUpdateBedStatusMutation } from "@/hooks/useRooms";
import { useCreateMaintenanceMutation } from "@/hooks/useMaintenance";

interface RoomDetailDrawerProps {
  room: RoomDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoomDetailDrawer({ room, open, onOpenChange }: RoomDetailDrawerProps) {
  const router = useRouter();
  const [isEditingRent, setIsEditingRent] = useState(false);
  const [rentInput, setRentInput] = useState("");
  const [isAddingTicket, setIsAddingTicket] = useState(false);
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketTitle, setTicketTitle] = useState("");

  const updateRentMutation = useUpdateRoomRentMutation();
  const addBedMutation = useAddBedMutation();
  const updateBedStatusMutation = useUpdateBedStatusMutation();
  const createMaintenanceMutation = useCreateMaintenanceMutation();

  if (!room) return null;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'OCCUPIED': return 'bg-success';
      case 'VACANT': return 'bg-primary';
      case 'RESERVED': return 'bg-warning';
      case 'MAINTENANCE': return 'bg-danger';
      default: return 'bg-neutral';
    }
  };

  const handleAssign = (bedId: string) => {
    onOpenChange(false);
    router.push(`/tenants/new?bed_id=${bedId}&monthly_rent=${room.monthlyRent}`);
  };

  const handleUpdateBedStatus = (bedId: string, status: 'VACANT' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE') => {
    updateBedStatusMutation.mutate({ bedId, status });
  };

  const handleAddBed = () => {
    addBedMutation.mutate(room.id);
  };

  const handleStartEditRent = () => {
    setRentInput(room.monthlyRent.toString());
    setIsEditingRent(true);
  };

  const handleSaveRent = () => {
    const rentVal = Number(rentInput);
    if (isNaN(rentVal) || rentVal <= 0) {
      alert("Please enter a valid rent amount");
      return;
    }
    updateRentMutation.mutate({ roomId: room.id, monthlyRent: rentVal }, {
      onSuccess: () => {
        setIsEditingRent(false);
      }
    });
  };

  const handleCreateTicket = () => {
    if (!ticketTitle || !ticketDescription) {
      alert("Please fill in both title and description");
      return;
    }
    createMaintenanceMutation.mutate({
      property_id: room.propertyId,
      room_id: room.id,
      title: ticketTitle,
      description: ticketDescription,
      priority: "MEDIUM"
    }, {
      onSuccess: () => {
        setIsAddingTicket(false);
        setTicketTitle("");
        setTicketDescription("");
        alert("Maintenance ticket created successfully!");
      }
    });
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
              {isEditingRent ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input 
                    type="number" 
                    value={rentInput} 
                    onChange={(e) => setRentInput(e.target.value)} 
                    className="w-24 h-8"
                  />
                  <Button size="icon" className="h-8 w-8" onClick={handleSaveRent} disabled={updateRentMutation.isPending}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditingRent(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-medium text-lg">{room.rent}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleStartEditRent}>
                    <IndianRupee className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Amenities</p>
              <div className="flex flex-wrap gap-1">
                {room.amenities.length > 0 ? (
                  room.amenities.map(amenity => (
                    <Badge key={amenity} variant="secondary" className="text-xs">{amenity}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No amenities</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Bed Allocations</h3>
            <div className="space-y-3">
              {room.beds.map((bed) => (
                <div key={bed.id} className="flex flex-col p-3 rounded-lg border border-border bg-card gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Bed className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Bed {bed.label.split('-').pop()}</span>
                          <div className={`h-2 w-2 rounded-full ${getStatusColor(bed.status)}`} title={bed.status} />
                          <Badge variant="outline" className="text-[10px] uppercase font-mono px-1 py-0">{bed.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {bed.tenant ? bed.tenant : 'No tenant assigned'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-1.5">
                      {bed.status === 'VACANT' && (
                        <>
                          <Button size="sm" onClick={() => handleAssign(bed.id)}>Assign</Button>
                          <Button size="sm" variant="outline" onClick={() => handleUpdateBedStatus(bed.id, 'MAINTENANCE')}>Maint.</Button>
                        </>
                      )}
                      {bed.status === 'MAINTENANCE' && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateBedStatus(bed.id, 'VACANT')}>Make Vacant</Button>
                      )}
                      {bed.status === 'RESERVED' && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateBedStatus(bed.id, 'VACANT')}>Release</Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-6 space-y-3">
            <h3 className="font-semibold mb-2">Quick Actions</h3>
            
            {isAddingTicket ? (
              <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground">NEW MAINTENANCE TICKET</p>
                <Input 
                  placeholder="Issue Title (e.g. AC leaking)"
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                />
                <Textarea 
                  placeholder="Describe the issue details..."
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={handleCreateTicket} disabled={createMaintenanceMutation.isPending}>
                    File Ticket
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsAddingTicket(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full justify-start" onClick={() => setIsAddingTicket(true)}>
                <Wrench className="h-4 w-4 mr-2" /> Mark for Maintenance
              </Button>
            )}

            <Button variant="outline" className="w-full justify-start" onClick={handleStartEditRent}>
              <IndianRupee className="h-4 w-4 mr-2" /> Edit Room Rent
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={handleAddBed} disabled={addBedMutation.isPending}>
              <UserPlus className="h-4 w-4 mr-2" /> Add Additional Bed
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

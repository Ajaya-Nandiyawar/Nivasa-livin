"use client"

import { useState, useEffect } from "react";
import { RoomDetailDrawer } from "@/components/rooms/RoomDetailDrawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, Loader2 } from "lucide-react";
import { usePropertiesQuery, usePropertyFloorsQuery, useRoomsQuery, useCreateRoomMutation, RoomDetail } from "@/hooks/useRooms";

export default function RoomsPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<RoomDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");

  // Add Room Form State
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newRoomType, setNewRoomType] = useState<'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'DORM'>('DOUBLE');
  const [newRent, setNewRent] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [amenityAC, setAmenityAC] = useState(false);
  const [amenityBath, setAmenityBath] = useState(false);
  const [amenityBalcony, setAmenityBalcony] = useState(false);

  // React Queries
  const { data: properties, isLoading: isLoadingProperties } = usePropertiesQuery();
  const { data: floors, isLoading: isLoadingFloors } = usePropertyFloorsQuery(selectedPropertyId);
  const { data: rooms, isLoading: isLoadingRooms } = useRoomsQuery(selectedPropertyId);
  const createRoomMutation = useCreateRoomMutation();

  // Set default property
  useEffect(() => {
    if (properties && properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  // Group rooms by floor name/number
  const roomsByFloor: Record<string, RoomDetail[]> = {};
  rooms?.forEach((room) => {
    const floorKey = room.floorName || `Floor ${room.floorNumber}`;
    if (!roomsByFloor[floorKey]) {
      roomsByFloor[floorKey] = [];
    }
    roomsByFloor[floorKey].push(room);
  });

  const floorKeys = Object.keys(roomsByFloor);

  // Set default active tab
  useEffect(() => {
    if (floorKeys.length > 0 && (!activeTab || !floorKeys.includes(activeTab))) {
      setActiveTab(floorKeys[0]);
    }
  }, [rooms, activeTab, floorKeys]);

  const openRoomDetails = (room: RoomDetail) => {
    setSelectedRoom(room);
    setIsDrawerOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'OCCUPIED': return 'bg-success';
      case 'VACANT': return 'bg-primary';
      case 'RESERVED': return 'bg-warning';
      case 'MAINTENANCE': return 'bg-danger';
      default: return 'bg-neutral';
    }
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFloorId || !newRoomNumber || !newRent) {
      alert("Please fill in all required fields.");
      return;
    }

    const rentVal = Number(newRent);
    if (isNaN(rentVal) || rentVal <= 0) {
      alert("Please enter a valid rent amount.");
      return;
    }

    const amenities: string[] = [];
    if (amenityAC) amenities.push("AC");
    if (amenityBath) amenities.push("Attached Bath");
    if (amenityBalcony) amenities.push("Balcony");

    createRoomMutation.mutate({
      property_id: selectedPropertyId,
      floor_id: selectedFloorId,
      room_number: newRoomNumber,
      room_type: newRoomType,
      monthly_rent: rentVal,
      amenities,
    }, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        setNewRoomNumber("");
        setNewRent("");
        setAmenityAC(false);
        setAmenityBath(false);
        setAmenityBalcony(false);
      },
      onError: (err: any) => {
        alert(err?.response?.data?.message || "Failed to create room.");
      }
    });
  };

  // Sync selected room details inside drawer when room data updates
  const currentSelectedRoomData = rooms?.find(r => r.id === selectedRoom?.id) || null;

  if (isLoadingProperties) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading Properties...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Room Management</h1>
          <p className="text-muted-foreground">Manage properties, rooms, and bed availability.</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Select Property" />
            </SelectTrigger>
            <SelectContent>
              {properties?.map((prop) => (
                <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => {
            if (floors && floors.length > 0) {
              setSelectedFloorId(floors[0].id);
            }
            setIsAddDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" /> Add Room
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center text-sm">
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-success"></div> Occupied</div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-primary"></div> Vacant</div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-warning"></div> Reserved</div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-danger"></div> Maintenance</div>
      </div>

      {isLoadingRooms ? (
        <div className="flex h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading Rooms...</span>
        </div>
      ) : floorKeys.length > 0 ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            {floorKeys.map((floor) => (
              <TabsTrigger key={floor} value={floor}>{floor}</TabsTrigger>
            ))}
          </TabsList>
          
          {Object.entries(roomsByFloor).map(([floor, floorRooms]) => (
            <TabsContent key={floor} value={floor}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {floorRooms.map((room) => {
                  const totalBeds = room.beds.length;
                  const occupiedBeds = room.beds.filter(b => b.status === 'OCCUPIED').length;
                  
                  return (
                    <Card 
                      key={room.id} 
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => openRoomDetails(room)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl">Room {room.roomNumber}</CardTitle>
                          <span className="text-xs font-semibold text-muted-foreground px-2 py-1 bg-muted rounded-full">
                            {room.type}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-end mt-2">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">{room.rent} / mo</p>
                            <div className="flex gap-1.5">
                              {room.beds.map((bed) => (
                                <div 
                                  key={bed.id} 
                                  className={`h-4 w-4 rounded-full ${getStatusColor(bed.status)} shadow-sm border border-border`}
                                  title={`Bed ${bed.label.split('-').pop()} - ${bed.status}`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground bg-accent px-2 py-1 rounded">
                            <Users className="h-3.5 w-3.5" />
                            <span>{occupiedBeds}/{totalBeds}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
          No rooms found for this property. Click Add Room to create one.
        </div>
      )}

      {/* Add Room Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
            <DialogDescription>
              Create a new room. Beds will be auto-generated based on the room type.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRoom} className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="floor" className="text-right">Floor *</Label>
              <div className="col-span-3">
                <Select value={selectedFloorId} onValueChange={setSelectedFloorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Floor" />
                  </SelectTrigger>
                  <SelectContent>
                    {floors?.map((floor) => (
                      <SelectItem key={floor.id} value={floor.id}>
                        {floor.floor_name || `Floor ${floor.floor_number}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="roomNumber" className="text-right">Room No. *</Label>
              <Input 
                id="roomNumber" 
                value={newRoomNumber} 
                onChange={(e) => setNewRoomNumber(e.target.value)} 
                className="col-span-3" 
                placeholder="e.g. 104"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="roomType" className="text-right">Type *</Label>
              <div className="col-span-3">
                <Select 
                  value={newRoomType} 
                  onValueChange={(val: any) => setNewRoomType(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE">Single Sharing</SelectItem>
                    <SelectItem value="DOUBLE">Double Sharing</SelectItem>
                    <SelectItem value="TRIPLE">Triple Sharing</SelectItem>
                    <SelectItem value="DORM">Dorm (4 Sharing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rent" className="text-right">Rent (₹) *</Label>
              <Input 
                id="rent" 
                type="number"
                value={newRent} 
                onChange={(e) => setNewRent(e.target.value)} 
                className="col-span-3" 
                placeholder="e.g. 12000"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right mt-1">Amenities</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="ac" 
                    checked={amenityAC} 
                    onChange={(e) => setAmenityAC(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="ac" className="text-sm">Air Conditioner (AC)</label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="bath" 
                    checked={amenityBath} 
                    onChange={(e) => setAmenityBath(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="bath" className="text-sm">Attached Bath</label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="balcony" 
                    checked={amenityBalcony} 
                    onChange={(e) => setAmenityBalcony(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="balcony" className="text-sm">Balcony</label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createRoomMutation.isPending}>
                {createRoomMutation.isPending ? "Adding..." : "Add Room"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <RoomDetailDrawer 
        room={currentSelectedRoomData} 
        open={isDrawerOpen} 
        onOpenChange={setIsDrawerOpen} 
      />
    </div>
  );
}

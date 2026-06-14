"use client"

import { useState } from "react";
import { RoomDetailDrawer, RoomDetail } from "@/components/rooms/RoomDetailDrawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";

export default function RoomsPage() {
  const [selectedRoom, setSelectedRoom] = useState<RoomDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const mockRooms: Record<string, RoomDetail[]> = {
    "floor-1": [
      {
        id: "r101", roomNumber: "101", type: "DOUBLE", rent: "₹12,000",
        amenities: ["AC", "Attached Bath", "Balcony"],
        beds: [
          { id: "b1", label: "A", status: "OCCUPIED", tenant: "Rahul Sharma" },
          { id: "b2", label: "B", status: "VACANT" }
        ]
      },
      {
        id: "r102", roomNumber: "102", type: "SINGLE", rent: "₹18,000",
        amenities: ["AC", "Attached Bath", "TV"],
        beds: [
          { id: "b3", label: "A", status: "OCCUPIED", tenant: "Priya Patel" }
        ]
      },
      {
        id: "r103", roomNumber: "103", type: "TRIPLE", rent: "₹9,000",
        amenities: ["Non-AC", "Common Bath"],
        beds: [
          { id: "b4", label: "A", status: "OCCUPIED", tenant: "Amit Kumar" },
          { id: "b5", label: "B", status: "RESERVED" },
          { id: "b6", label: "C", status: "VACANT" }
        ]
      }
    ],
    "floor-2": [
      {
        id: "r201", roomNumber: "201", type: "DOUBLE", rent: "₹12,000",
        amenities: ["AC", "Attached Bath"],
        beds: [
          { id: "b7", label: "A", status: "MAINTENANCE" },
          { id: "b8", label: "B", status: "VACANT" }
        ]
      }
    ]
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Room Management</h1>
          <p className="text-muted-foreground">Manage properties, rooms, and bed availability.</p>
        </div>
        <div className="flex items-center gap-4">
          <Select defaultValue="prop1">
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Select Property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prop1">Nivasa Elite</SelectItem>
              <SelectItem value="prop2">Nivasa Prime</SelectItem>
            </SelectContent>
          </Select>
          <Button>
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

      <Tabs defaultValue="floor-1" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="floor-1">1st Floor</TabsTrigger>
          <TabsTrigger value="floor-2">2nd Floor</TabsTrigger>
          <TabsTrigger value="floor-3">3rd Floor</TabsTrigger>
        </TabsList>
        
        {Object.entries(mockRooms).map(([floor, rooms]) => (
          <TabsContent key={floor} value={floor}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {rooms.map((room) => {
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
                                title={`Bed ${bed.label} - ${bed.status}`}
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

      <RoomDetailDrawer 
        room={selectedRoom} 
        open={isDrawerOpen} 
        onOpenChange={setIsDrawerOpen} 
      />
    </div>
  );
}

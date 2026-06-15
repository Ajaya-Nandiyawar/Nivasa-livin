'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  pincode: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Floor {
  id: string;
  property_id: string;
  floor_number: number;
  floor_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface BedInfo {
  id: string;
  label: string;
  status: 'VACANT' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  tenant?: string;
}

export interface RoomDetail {
  id: string;
  roomNumber: string;
  type: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'DORM';
  monthlyRent: number;
  rent: string;
  amenities: string[];
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  floorId: string;
  propertyId: string;
  floorNumber: number;
  floorName: string | null;
  beds: BedInfo[];
}

export interface CreateRoomPayload {
  property_id: string;
  floor_id: string;
  room_number: string;
  room_type: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'DORM';
  monthly_rent: number;
  amenities?: string[];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePropertiesQuery() {
  return useQuery<Property[]>({
    queryKey: ['properties', 'list'],
    queryFn: async () => {
      const { data } = await apiClient.get('/properties');
      return data;
    },
    staleTime: 60_000,
  });
}

export function usePropertyFloorsQuery(propertyId?: string) {
  return useQuery<Floor[]>({
    queryKey: ['properties', propertyId, 'floors'],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data } = await apiClient.get(`/properties/${propertyId}/floors`);
      return data;
    },
    enabled: !!propertyId,
    staleTime: 60_000,
  });
}

export function useRoomsQuery(propertyId?: string) {
  return useQuery<RoomDetail[]>({
    queryKey: ['rooms', 'list', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data } = await apiClient.get('/rooms', {
        params: { propertyId },
      });
      return data;
    },
    enabled: !!propertyId,
    staleTime: 30_000,
  });
}

export function useCreateRoomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRoomPayload) => {
      const { data } = await apiClient.post('/rooms', payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rooms', 'list', variables.property_id] });
    },
  });
}

export function useUpdateRoomRentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, monthlyRent }: { roomId: string; monthlyRent: number }) => {
      const { data } = await apiClient.patch(`/rooms/${roomId}/rent`, {
        monthly_rent: monthlyRent,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useAddBedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      const { data } = await apiClient.post(`/rooms/${roomId}/beds`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useUpdateBedStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bedId, status }: { bedId: string; status: BedInfo['status'] }) => {
      const { data } = await apiClient.patch(`/beds/${bedId}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

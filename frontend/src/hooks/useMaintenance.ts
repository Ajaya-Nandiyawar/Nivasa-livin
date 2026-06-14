'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';

export interface MaintenanceTicket {
  id: string;
  property_id: string;
  room_id: string | null;
  bed_id: string | null;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  reported_by: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  cost_incurred: string | null;
  created_at: string;
  updated_at: string;
  property_name?: string | null;
  room_number?: string | null;
}

export interface MaintenanceListResponse {
  data: MaintenanceTicket[];
  page: number;
  limit: number;
}

export interface MaintenanceFilterParams {
  status?: TicketStatus;
  priority?: TicketPriority;
  property_id?: string;
  page?: number;
  limit?: number;
}

export interface CreateTicketPayload {
  property_id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  room_id?: string;
  bed_id?: string;
}

export interface UpdateTicketPayload {
  status?: TicketStatus;
  assigned_to?: string;
  priority?: TicketPriority;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useMaintenanceQuery(params?: MaintenanceFilterParams) {
  return useQuery<MaintenanceListResponse>({
    queryKey: ['maintenance', 'list', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/maintenance', { params });
      return data;
    },
    staleTime: 30_000,
  });
}

export function useCreateMaintenanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTicketPayload) => {
      const { data } = await apiClient.post('/maintenance', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    },
  });
}

export function usePatchMaintenanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateTicketPayload }) => {
      const { data } = await apiClient.patch(`/maintenance/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    },
  });
}

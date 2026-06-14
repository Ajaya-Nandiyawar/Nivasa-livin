import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

export interface RevenueResponseItem {
  month: string;
  total_revenue: string | number;
}

export interface OccupancyResponse {
  total_beds: number;
  occupied_beds: number;
  occupancy_rate: number;
}

export interface OutstandingResponse {
  '0-7 days': number;
  '8-30 days': number;
  '31-60 days': number;
  '60+ days': number;
}

export interface MaintenanceTicket {
  id: string;
  property_id: string;
  room_id: string | null;
  bed_id: string | null;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
  reported_by: string;
  assigned_to: string | null;
  resolved_at: string | null;
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

export interface RentDueItem {
  id: string;
  rent_amount: string;
  balance: string;
  due_date: string;
  status: 'PENDING' | 'PARTIAL' | 'OVERDUE';
  tenant_name: string;
  tenant_phone: string;
}

export interface RentRecord {
  id: string;
  period_month: number;
  period_year: number;
  rent_amount: string;
  paid_amount: string;
  balance: string;
  due_date: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  tenant_name: string;
}

export function useRevenueQuery() {
  return useQuery<RevenueResponseItem[]>({
    queryKey: ['reports', 'revenue'],
    queryFn: async () => {
      const { data } = await apiClient.get('/reports/revenue');
      return data;
    },
  });
}

export function useOccupancyQuery() {
  return useQuery<OccupancyResponse>({
    queryKey: ['reports', 'occupancy'],
    queryFn: async () => {
      const { data } = await apiClient.get('/reports/occupancy');
      return data;
    },
  });
}

export function useOutstandingQuery() {
  return useQuery<OutstandingResponse>({
    queryKey: ['reports', 'outstanding'],
    queryFn: async () => {
      const { data } = await apiClient.get('/reports/outstanding');
      return data;
    },
  });
}

export function useMaintenanceTicketsQuery(params?: { status?: string; limit?: number }) {
  return useQuery<MaintenanceListResponse>({
    queryKey: ['maintenance', 'list', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/maintenance', { params });
      return data;
    },
  });
}

export function useRentDuesQuery() {
  return useQuery<RentDueItem[]>({
    queryKey: ['rent', 'due'],
    queryFn: async () => {
      const { data } = await apiClient.get('/rent/due');
      return data;
    },
  });
}

export function useRentRecordsQuery(params?: { limit?: number }) {
  return useQuery<RentRecord[]>({
    queryKey: ['rent', 'list', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/rent', { params });
      return data;
    },
  });
}

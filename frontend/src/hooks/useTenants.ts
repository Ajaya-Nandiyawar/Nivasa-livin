'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  aadhaar_number: string | null;
  pan_number: string | null;
  date_of_birth: string | null;
  occupation: string | null;
  permanent_address: string | null;
  created_at: string;
  // Joined from active booking
  booking_id?: string | null;
  booking_status?: 'ACTIVE' | 'CHECKED_OUT' | 'TRANSFERRED' | null;
  bed_label?: string | null;
  room_number?: string | null;
  property_name?: string | null;
  monthly_rent?: string | null;
  check_in_date?: string | null;
}

export interface TenantListResponse {
  data: Tenant[];
  total: number;
  page: number;
  limit: number;
}

export interface TenantFilterParams {
  search?: string;
  status?: 'ACTIVE' | 'CHECKED_OUT' | 'TRANSFERRED';
  page?: number;
  limit?: number;
}

export interface CreateTenantPayload {
  full_name: string;
  email: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  aadhaar_number: string;
  pan_number?: string;
  permanent_address: string;
  dob: string;
  occupation?: string;
  bed_id: string;
  security_deposit: number;
  monthly_rent: number;
  check_in_date: string;
  billing_date: number;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useTenantsQuery(params?: TenantFilterParams) {
  return useQuery<TenantListResponse>({
    queryKey: ['tenants', 'list', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/tenants', { params });
      return data;
    },
    staleTime: 30_000,
  });
}

export function useTenantQuery(id: string) {
  return useQuery<Tenant>({
    queryKey: ['tenants', 'detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenants/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTenantMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTenantPayload) => {
      // Send as JSON — document uploads are handled separately via POST /tenants/:id/documents
      const { data } = await apiClient.post('/tenants', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useTenantRentQuery(tenantId: string) {
  return useQuery({
    queryKey: ['rent', 'tenant', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get('/rent', { params: { tenant_id: tenantId } });
      return data as RentRecord[];
    },
    enabled: !!tenantId,
  });
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
  tenant_phone?: string;
}

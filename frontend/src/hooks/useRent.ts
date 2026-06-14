'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
export type PaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';

export interface RentRecord {
  id: string;
  booking_id: string;
  tenant_id: string;
  period_month: number;
  period_year: number;
  rent_amount: string;
  paid_amount: string;
  balance: string;
  due_date: string;
  status: RentStatus;
  tenant_name: string;
  tenant_phone?: string;
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

export interface RentFilterParams {
  status?: RentStatus;
  period_month?: number;
  period_year?: number;
  tenant_id?: string;
}

export interface RecordPaymentPayload {
  amount: number;
  payment_mode: PaymentMode;
  reference_number?: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useRentQuery(params?: RentFilterParams) {
  return useQuery<RentRecord[]>({
    queryKey: ['rent', 'list', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/rent', { params });
      return data;
    },
    staleTime: 30_000,
  });
}

export function useRentDueQuery() {
  return useQuery<RentDueItem[]>({
    queryKey: ['rent', 'due'],
    queryFn: async () => {
      const { data } = await apiClient.get('/rent/due');
      return data;
    },
    staleTime: 60_000,
  });
}

export function useRecordPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rentId, payload }: { rentId: string; payload: RecordPaymentPayload }) => {
      const { data } = await apiClient.post(`/rent/${rentId}/payment`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

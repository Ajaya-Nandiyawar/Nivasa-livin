'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingStatus = 'ACTIVE' | 'CHECKED_OUT' | 'TRANSFERRED';

export interface Booking {
  id: string;
  status: BookingStatus;
  check_in_date: string;
  check_out_date: string | null;
  tenant_name: string;
  bed_label: string;
  room_number: string;
  property_name: string;
}

export interface BookingsResponse {
  data: Booking[];
  page: number;
  limit: number;
}

export interface BookingDetail extends Booking {
  tenant_phone: string;
  tenant_email: string;
  room_id: string;
  monthly_rent: string;
  security_deposit: string;
  billing_date: number;
  notes: string | null;
}

export interface BookingFilterParams {
  status?: BookingStatus;
  page?: number;
  limit?: number;
}

export interface CheckoutPayload {
  check_out_date?: string;
  notes?: string;
}

export interface CheckoutResult {
  message: string;
  security_deposit: number;
  total_deductions: number;
  refund_amount: number;
}

export interface TransferPayload {
  new_bed_id: string;
  transfer_date: string;
}

export interface TransferResult {
  message: string;
  new_booking_id: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useBookingsQuery(params?: BookingFilterParams) {
  return useQuery<BookingsResponse>({
    queryKey: ['bookings', 'list', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/bookings', { params });
      return data;
    },
    staleTime: 15_000,
  });
}

export function useBookingDetailQuery(id?: string) {
  return useQuery<BookingDetail>({
    queryKey: ['bookings', 'detail', id],
    queryFn: async () => {
      if (!id) throw new Error('Booking ID is required');
      const { data } = await apiClient.get(`/bookings/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCheckoutMutation() {
  const queryClient = useQueryClient();
  return useMutation<CheckoutResult, Error, { id: string; payload: CheckoutPayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.post(`/bookings/${id}/checkout`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useTransferMutation() {
  const queryClient = useQueryClient();
  return useMutation<TransferResult, Error, { id: string; payload: TransferPayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.post(`/bookings/${id}/transfer`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

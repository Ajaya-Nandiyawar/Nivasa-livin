'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: string;
  name: string;
  property_id: string | null;
}

export interface Expense {
  id: string;
  property_id: string;
  category_id: string;
  category_name?: string;
  title: string;
  amount: string;
  expense_date: string;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface ExpenseListResponse {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
}

export interface ExpenseFilterParams {
  category_id?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CreateExpensePayload {
  property_id: string;
  category_id: string;
  title: string;
  amount: number;
  expense_date: string;
  notes?: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useExpensesQuery(params?: ExpenseFilterParams) {
  return useQuery<ExpenseListResponse>({
    queryKey: ['expenses', 'list', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/expenses', { params });
      return data;
    },
    staleTime: 30_000,
  });
}

export function useExpenseCategoriesQuery() {
  return useQuery<ExpenseCategory[]>({
    queryKey: ['expenses', 'categories'],
    queryFn: async () => {
      const { data } = await apiClient.get('/expenses/categories');
      return data;
    },
    staleTime: 300_000, // Categories rarely change
  });
}

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExpensePayload) => {
      // Create FormData to support optional receipt upload in the future
      const formData = new FormData();
      formData.append('property_id', payload.property_id);
      formData.append('category_id', payload.category_id);
      formData.append('title', payload.title);
      formData.append('amount', payload.amount.toString());
      formData.append('expense_date', payload.expense_date);
      if (payload.notes) formData.append('notes', payload.notes);

      const { data } = await apiClient.post('/expenses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['reports', 'expenses'] });
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

export interface UserProfile {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'PG_ADMIN' | 'MANAGER' | 'VIEWER';
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfilePayload {
  full_name?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export function useMeQuery() {
  return useQuery<{ user: UserProfile }>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await apiClient.get('/auth/me');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const { data } = await apiClient.patch('/auth/profile', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      const { data } = await apiClient.post('/auth/change-password', payload);
      return data;
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: async (payload: ForgotPasswordPayload) => {
      const { data } = await apiClient.post('/auth/forgot-password', payload);
      return data;
    },
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: async (payload: ResetPasswordPayload) => {
      const { data } = await apiClient.post('/auth/reset-password', payload);
      return data;
    },
  });
}

export interface CreateUserPayload {
  email: string;
  password?: string;
  full_name: string;
  phone?: string;
  role: 'SUPER_ADMIN' | 'PG_ADMIN' | 'MANAGER' | 'VIEWER';
}

export interface UpdateUserPayload {
  role?: 'SUPER_ADMIN' | 'PG_ADMIN' | 'MANAGER' | 'VIEWER';
  is_active?: boolean;
}

export function useUsersQuery(enabled = false) {
  return useQuery<{ users: UserProfile[] }>({
    queryKey: ['auth', 'users'],
    queryFn: async () => {
      const { data } = await apiClient.get('/auth/users');
      return data;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const { data } = await apiClient.post('/auth/users', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'users'] });
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateUserPayload }) => {
      const { data } = await apiClient.patch(`/auth/users/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

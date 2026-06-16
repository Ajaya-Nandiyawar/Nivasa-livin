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
  status: string;
  guardian_name: string | null;
  guardian_mobile: string | null;
  guardian_relation: string | null;
  gender: string | null;
  company_college: string | null;
  kyc_status: string;
  police_verification_status: string;
  lead_source: string | null;
  referred_by_tenant_id: string | null;
  blacklist_reason: string | null;
  blacklisted_at: string | null;
  created_at: string;
  // Joined fields
  booking_id?: string | null;
  booking_status?: 'ACTIVE' | 'CHECKED_OUT' | 'TRANSFERRED' | null;
  bed_label?: string | null;
  room_number?: string | null;
  property_name?: string | null;
  property_id?: string | null;
  monthly_rent?: number | null;
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
  status?: string;
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
  guardian_name?: string;
  guardian_mobile?: string;
  guardian_relation?: string;
  gender?: string;
  company_college?: string;
  lead_source?: string;
  referred_by_tenant_id?: string;
  bed_id: string;
  security_deposit: number;
  monthly_rent: number;
  check_in_date: string;
  billing_date: number;
}

export interface TenantNote {
  id: string;
  note: string;
  created_at: string;
  created_by: string | null;
}

export interface TenantCharge {
  id: string;
  charge_type: string;
  amount: string;
  due_date: string;
  status: 'PENDING' | 'PAID' | 'WAIVED';
  created_at: string;
}

export interface TenantPayment {
  id: string;
  amount: string;
  payment_type: string;
  payment_mode: string;
  reference_number: string | null;
  payment_date: string;
  created_at: string;
}

export interface TenantDepositTransaction {
  id: string;
  transaction_type: 'DEPOSIT_RECEIVED' | 'DEPOSIT_ADJUSTMENT' | 'DEPOSIT_REFUND';
  amount: string;
  remarks: string | null;
  created_at: string;
}

export interface TenantAgreement {
  id: string;
  agreement_number: string | null;
  start_date: string;
  end_date: string;
  rent_amount: string;
  deposit_amount: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  document_id: string | null;
  agreement_alert_sent: boolean;
}

export interface TenantStay {
  id: string;
  start_date: string;
  end_date: string | null;
  property_name: string | null;
  room_number: string | null;
  bed_label: string | null;
}

export interface TenantTransfer {
  id: string;
  from_property_id: string | null;
  from_room_id: string | null;
  from_bed_id: string | null;
  to_property_id: string | null;
  to_room_id: string | null;
  to_bed_id: string | null;
  reason: string | null;
  transferred_at: string;
}

export interface TenantCheckout {
  id: string;
  notice_date: string | null;
  planned_exit_date: string | null;
  actual_exit_date: string | null;
  keys_returned: boolean;
  room_inspected: boolean;
  damage_found: boolean;
  damage_notes: string | null;
  deposit_refunded: boolean;
  checkout_status: 'NOTICE_GIVEN' | 'INSPECTION_PENDING' | 'SETTLEMENT_PENDING' | 'READY_TO_VACATE' | 'COMPLETED';
}

export interface TenantTag {
  id: string;
  tag: string;
}

export interface TenantActivity {
  id: string;
  activity_type: string;
  metadata: any;
  created_at: string;
}

export interface TenantCommunicationLog {
  id: string;
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL' | 'CALL';
  direction: 'INBOUND' | 'OUTBOUND';
  message: string;
  created_at: string;
}

export interface TenantKPIs {
  occupancyPercent: number;
  activeTenants: number;
  totalTenants: number;
  pendingKYC: number;
  pendingPoliceVerification: number;
  agreementsExpiring30Days: number;
  outstandingDues: number;
  vacantBeds: number;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useTenantsQuery(params?: TenantFilterParams) {
  return useQuery<TenantListResponse>({
    queryKey: ['tenants', 'list', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/tenants', { params });
      return data;
    },
  });
}

export function useTenantKPIsQuery() {
  return useQuery<TenantKPIs>({
    queryKey: ['tenants', 'kpis'],
    queryFn: async () => {
      const { data } = await apiClient.get('/tenants/kpis');
      return data;
    },
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
      const { data } = await apiClient.post('/tenants', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useUpdateTenantMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CreateTenantPayload> & { status?: string, blacklist_reason?: string } }) => {
      const { data } = await apiClient.patch(`/tenants/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'detail', variables.id] });
    },
  });
}

// Sub-modules hooks
export function useTenantNotesQuery(tenantId: string) {
  return useQuery<TenantNote[]>({
    queryKey: ['tenants', 'notes', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenants/${tenantId}/notes`);
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useAddTenantNoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, note }: { tenantId: string; note: string }) => {
      const { data } = await apiClient.post(`/tenants/${tenantId}/notes`, { note });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'notes', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'activities', variables.tenantId] });
    },
  });
}

export function useTenantChargesQuery(tenantId: string) {
  return useQuery<TenantCharge[]>({
    queryKey: ['tenants', 'charges', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenants/${tenantId}/charges`);
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useAddTenantChargeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, payload }: { tenantId: string; payload: { charge_type: string; amount: number; due_date: string } }) => {
      const { data } = await apiClient.post(`/tenants/${tenantId}/charges`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'charges', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'activities', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'kpis'] });
    },
  });
}

export function useUpdateTenantChargeStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, chargeId, status }: { tenantId: string; chargeId: string; status: string }) => {
      const { data } = await apiClient.patch(`/tenants/${tenantId}/charges/${chargeId}/status`, { status });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'charges', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'activities', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'kpis'] });
    },
  });
}

export function useTenantPaymentsQuery(tenantId: string) {
  return useQuery<TenantPayment[]>({
    queryKey: ['tenants', 'payments', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenants/${tenantId}/payments`);
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useAddTenantPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, payload }: { tenantId: string; payload: { amount: number; payment_type: string; payment_mode: string; reference_number?: string; payment_date: string } }) => {
      const { data } = await apiClient.post(`/tenants/${tenantId}/payments`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'payments', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'charges', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'activities', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'kpis'] });
    },
  });
}

export function useTenantDepositTransactionsQuery(tenantId: string) {
  return useQuery<TenantDepositTransaction[]>({
    queryKey: ['tenants', 'deposit-transactions', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenants/${tenantId}/deposit-transactions`);
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useAddTenantDepositTransactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, payload }: { tenantId: string; payload: { transaction_type: string; amount: number; remarks?: string } }) => {
      const { data } = await apiClient.post(`/tenants/${tenantId}/deposit-transactions`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'deposit-transactions', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'activities', variables.tenantId] });
    },
  });
}

export function useTenantAgreementsQuery(tenantId: string) {
  return useQuery<TenantAgreement[]>({
    queryKey: ['tenants', 'agreements', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenants/${tenantId}/agreements`);
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useCreateTenantAgreementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, payload }: { tenantId: string; payload: { agreement_number?: string; start_date: string; end_date: string; rent_amount: number; deposit_amount: number; document_id?: string } }) => {
      const { data } = await apiClient.post(`/tenants/${tenantId}/agreements`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'agreements', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'activities', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'kpis'] });
    },
  });
}

export function useTenantCommunicationLogsQuery(tenantId: string) {
  return useQuery<TenantCommunicationLog[]>({
    queryKey: ['tenants', 'communication-logs', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenants/${tenantId}/communication-logs`);
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useLogTenantCommunicationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, payload }: { tenantId: string; payload: { channel: string; direction: string; message: string } }) => {
      const { data } = await apiClient.post(`/tenants/${tenantId}/communication-logs`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'communication-logs', variables.tenantId] });
    },
  });
}

export function useTenantStaysQuery(tenantId: string) {
  return useQuery<TenantStay[]>({
    queryKey: ['tenants', 'stays', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenants/${tenantId}/stays`);
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useTenantTransfersQuery(tenantId: string) {
  return useQuery<TenantTransfer[]>({
    queryKey: ['tenants', 'transfers', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenants/${tenantId}/transfers`);
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useTransferTenantRoomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, payload }: { tenantId: string; payload: { to_bed_id: string; reason?: string } }) => {
      const { data } = await apiClient.post(`/tenants/${tenantId}/transfer`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'detail', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'transfers', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'stays', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'activities', variables.tenantId] });
    },
  });
}

export function useTenantCheckoutQuery(tenantId: string) {
  return useQuery<TenantCheckout>({
    queryKey: ['tenants', 'checkout', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenants/${tenantId}/checkout`);
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useUpdateTenantCheckoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, payload }: { tenantId: string; payload: { notice_date?: string; planned_exit_date?: string; actual_exit_date?: string; keys_returned?: boolean; room_inspected?: boolean; damage_found?: boolean; damage_notes?: string; deposit_refunded?: boolean; checkout_status?: string } }) => {
      const { data } = await apiClient.post(`/tenants/${tenantId}/checkout`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'detail', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'checkout', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'activities', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'kpis'] });
    },
  });
}

export function useTenantTagsQuery(tenantId: string) {
  return useQuery<TenantTag[]>({
    queryKey: ['tenants', 'tags', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenants/${tenantId}/tags`);
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useAddTenantTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, tag }: { tenantId: string; tag: string }) => {
      const { data } = await apiClient.post(`/tenants/${tenantId}/tags`, { tag });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'tags', variables.tenantId] });
    },
  });
}

export function useRemoveTenantTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, tagId }: { tenantId: string; tagId: string }) => {
      const { data } = await apiClient.delete(`/tenants/${tenantId}/tags/${tagId}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'tags', variables.tenantId] });
    },
  });
}

export function useTenantActivitiesQuery(tenantId: string) {
  return useQuery<TenantActivity[]>({
    queryKey: ['tenants', 'activities', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenants/${tenantId}/activities`);
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useTenantDocumentsQuery(tenantId: string) {
  return useQuery({
    queryKey: ['tenants', 'documents', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenants/${tenantId}/documents`);
      return data as { id: string; document_type: string; file_url: string; file_name: string | null; verified: boolean; uploaded_at: string }[];
    },
    enabled: !!tenantId,
  });
}

export function useVerifyTenantDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, docId, verified }: { tenantId: string; docId: string; verified: boolean }) => {
      const { data } = await apiClient.patch(`/tenants/${tenantId}/documents/${docId}/verify`, { verified });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'documents', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'activities', variables.tenantId] });
    },
  });
}

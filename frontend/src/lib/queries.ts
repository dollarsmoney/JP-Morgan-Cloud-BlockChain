'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  AnalyticsSummary,
  Notification,
  Profile,
  Transaction,
  Wallet,
} from './types';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await api.get<Profile>('/users/me')).data,
  });
}

export function useWallets() {
  return useQuery({
    queryKey: ['wallets'],
    queryFn: async () => (await api.get<{ wallets: Wallet[] }>('/wallets')).data.wallets ?? [],
  });
}

export function useCreateWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { label?: string; currency?: string }) =>
      (await api.post<Wallet>('/wallets', body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useTransactions(page = 1, pageSize = 20, status?: string) {
  return useQuery({
    queryKey: ['transactions', page, pageSize, status],
    queryFn: async () =>
      (
        await api.get<{ transactions: Transaction[]; total: number }>('/transactions', {
          params: { page, pageSize, status },
        })
      ).data,
    refetchInterval: 5000, // poll so PENDING → CONFIRMED updates appear
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      fromAddress: string;
      toAddress: string;
      amount: string;
      fee?: string;
    }) => (await api.post<Transaction>('/transactions', body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => (await api.get<AnalyticsSummary>('/analytics/summary')).data,
    refetchInterval: 8000,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () =>
      (await api.get<{ notifications: Notification[]; total: number }>('/notifications')).data,
    refetchInterval: 10000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => (await api.get<{ count: number }>('/notifications/unread-count')).data.count,
    refetchInterval: 10000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/notifications/${id}/read`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useChain() {
  return useQuery({
    queryKey: ['chain'],
    queryFn: async () =>
      (await api.get<{ blocks: unknown[]; length: number }>('/blockchain/chain')).data,
  });
}

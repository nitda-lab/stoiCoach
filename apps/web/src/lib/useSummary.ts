import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { apiFetch } from './api';
import type { Item } from './types';

export interface ItemView extends Item {
  completedToday: boolean;
  streak: number;
}

export interface DashboardSummary {
  points: { today: number; week: number; month: number; total: number };
  items: ItemView[];
}

export function useSummary() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['summary'],
    enabled: !!isSignedIn,
    queryFn: () => apiFetch<DashboardSummary>('/api/summary', getToken),
  });
}

/** Manual check-off. Optimistically marks the item completedToday, then refetches. */
export function useComplete() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch(`/api/items/${itemId}/complete`, getToken, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: ['summary'] });
      const prev = queryClient.getQueryData<DashboardSummary>(['summary']);
      if (prev) {
        queryClient.setQueryData<DashboardSummary>(['summary'], {
          ...prev,
          points: {
            ...prev.points,
            today:
              prev.points.today +
              (prev.items.find((i) => i.id === itemId && !i.completedToday)?.point_weight ?? 0),
          },
          items: prev.items.map((i) =>
            i.id === itemId ? { ...i, completedToday: true, streak: i.streak + (i.completedToday ? 0 : 1) } : i,
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['summary'], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

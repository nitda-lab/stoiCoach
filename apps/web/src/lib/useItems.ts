import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { apiFetch } from './api';
import type { Item } from './types';

/** Fetch the signed-in user's active items. */
export function useItems() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['items'],
    enabled: !!isSignedIn,
    queryFn: () =>
      apiFetch<{ items: Item[] }>('/api/items', getToken).then((r) => r.items),
  });
}

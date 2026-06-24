import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';

export interface ChatAction {
  type: 'created' | 'updated' | 'completed' | 'archived';
  item?: { id: string; title: string };
}

export interface UiMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: ChatAction[];
}

interface ChatResponse {
  reply: string;
  actions: ChatAction[];
}

/** Holds the chat transcript and sends turns to POST /api/chat.
 *  On each assistant turn it invalidates the items query so the dashboard refreshes. */
export function useChat() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;
      setError(null);

      const nextHistory: UiMessage[] = [...messages, { role: 'user', content: trimmed }];
      setMessages(nextHistory);
      setPending(true);

      try {
        const wire = nextHistory.map((m) => ({ role: m.role, content: m.content }));
        const res = await apiFetch<ChatResponse>('/api/chat', getToken, {
          method: 'POST',
          body: JSON.stringify({ messages: wire }),
        });
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: res.reply, actions: res.actions },
        ]);
        if (res.actions.length > 0) {
          await queryClient.invalidateQueries({ queryKey: ['items'] });
          await queryClient.invalidateQueries({ queryKey: ['summary'] });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '送信に失敗しました');
      } finally {
        setPending(false);
      }
    },
    [messages, pending, getToken, queryClient],
  );

  return { messages, send, pending, error };
}

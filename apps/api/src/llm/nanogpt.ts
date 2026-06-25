import { config } from '../config';
import type { AssistantReply, ChatMessage, ToolCall, ToolDef } from './messages';

export interface CompleteOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}
interface OpenAIChoice {
  message: { role: string; content: string | null; tool_calls?: OpenAIToolCall[] };
  finish_reason?: string;
}
interface OpenAIResponse {
  choices: OpenAIChoice[];
}

/** Serialize our ChatMessage into the OpenAI wire shape. */
function toWire(m: ChatMessage): Record<string, unknown> {
  const base: Record<string, unknown> = { role: m.role, content: m.content };
  if (m.tool_calls?.length) {
    base.tool_calls = m.tool_calls.map((tc) => ({
      id: tc.id,
      type: 'function',
      function: { name: tc.name, arguments: tc.arguments },
    }));
  }
  if (m.tool_call_id) base.tool_call_id = m.tool_call_id;
  if (m.name) base.name = m.name;
  return base;
}

/** Call nanoGPT's OpenAI-compatible chat completions endpoint. */
export async function complete(
  messages: ChatMessage[],
  tools: ToolDef[],
  opts: CompleteOptions = {},
): Promise<AssistantReply> {
  const apiKey = opts.apiKey ?? config.nanoGptApiKey();
  const baseUrl = opts.baseUrl ?? config.nanoGptBaseUrl();
  const model = opts.model ?? config.nanoGptModel();

  const body: Record<string, unknown> = {
    model,
    messages: messages.map(toWire),
    temperature: opts.temperature ?? 0.3,
  };
  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  // Bound a single call so one slow response can't consume the whole serverless
  // budget (Vercel kills the function at its maxDuration).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 25_000);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('nanoGPT request timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`nanoGPT request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as OpenAIResponse;
  const msg = data.choices?.[0]?.message;
  const tool_calls: ToolCall[] = (msg?.tool_calls ?? []).map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: tc.function.arguments,
  }));
  return { content: msg?.content ?? '', tool_calls };
}

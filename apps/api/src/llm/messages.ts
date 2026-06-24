export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  /** Raw JSON string of arguments as returned by the model. */
  arguments: string;
}

export interface ChatMessage {
  role: Role;
  content: string;
  /** Present on assistant messages that requested tool calls. */
  tool_calls?: ToolCall[];
  /** Present on `tool` messages: which call this responds to. */
  tool_call_id?: string;
  /** Present on `tool` messages: the tool name. */
  name?: string;
}

export interface ToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AssistantReply {
  content: string;
  tool_calls: ToolCall[];
}

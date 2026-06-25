import type { AssistantReply, ChatMessage, ToolDef } from '../llm/messages';
import { complete as realComplete } from '../llm/nanogpt';
import { TOOL_DEFS, executeTool as realExecute, type ToolAction, type ToolOutcome } from '../llm/tools';

export const SYSTEM_PROMPT = `あなたは「stoiCoach」、ユーザーが理想の自分になるための生活をサポートするAIコーチです。
ストイックだが温かく、簡潔に日本語で話します。

ユーザーが目標・習慣・タスク・やめたいこと・中長期の計画を話したら、ツールを使って管理項目を作成・更新・記録します。
- 細部が曖昧でも、常識的な既定値を自分で推測してためらわずツールを呼ぶこと。根掘り葉掘り質問しない。
- tracking_type は次から最適なものを選ぶ: recurring(繰り返す習慣), one_time(一回のタスク), avoidance(やめること), progress(中長期の進捗)。
- point_weight は難易度で提案する。簡単=5前後、普通=10前後、難しい=20前後。
- 「やった」「できた」と言われたら complete_item で達成を記録する。
- 状況を尋ねられたら list_items で現状を確認してから答える。
ツール実行後は、何をしたかを一言で簡潔に伝えます（例:「朝ランを毎日の習慣に追加しました(+10pt)」）。`;

export interface RunChatDeps {
  complete?: (messages: ChatMessage[], tools: ToolDef[]) => Promise<AssistantReply>;
  execute?: (
    userId: string,
    name: string,
    args: Record<string, unknown>,
    today: string,
  ) => Promise<ToolOutcome>;
  today: string;
  maxRounds?: number;
}

export interface RunChatResult {
  reply: string;
  actions: ToolAction[];
  messages: ChatMessage[];
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/** Drive a chat turn: call the LLM, execute any tool calls, feed results back,
 *  and loop until the model returns plain text or maxRounds is hit. */
export async function runChat(
  userId: string,
  history: ChatMessage[],
  deps: RunChatDeps,
): Promise<RunChatResult> {
  const complete = deps.complete ?? ((m, t) => realComplete(m, t));
  const execute = deps.execute ?? realExecute;
  // Each round is one nanoGPT call. With local synthesis of write confirmations,
  // a normal turn finishes in 1 round; cap at 2 so total stays well under
  // Vercel's 60s function limit even if a round is slow.
  const maxRounds = deps.maxRounds ?? 2;

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
  ];
  const actions: ToolAction[] = [];

  let reply = '';
  for (let round = 0; round < maxRounds; round++) {
    const assistant = await complete(messages, TOOL_DEFS);
    messages.push({
      role: 'assistant',
      content: assistant.content,
      tool_calls: assistant.tool_calls.length ? assistant.tool_calls : undefined,
    });

    if (assistant.tool_calls.length === 0) {
      reply = assistant.content;
      return { reply, actions, messages };
    }

    const roundActions: ToolAction[] = [];
    for (const call of assistant.tool_calls) {
      const outcome = await execute(userId, call.name, parseArgs(call.arguments), deps.today);
      if (outcome.action) {
        actions.push(outcome.action);
        roundActions.push(outcome.action);
      }
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.name,
        content: JSON.stringify(outcome.result),
      });
    }

    // Write actions (create/update/complete/archive) produced a concrete result.
    // Synthesize the confirmation locally instead of paying for another LLM
    // round-trip — this halves latency on the common "add/complete" turns.
    if (roundActions.length > 0) {
      reply = synthesizeReply(roundActions);
      return { reply, actions, messages };
    }
    // Otherwise the tools were read-only (e.g. list_items); loop so the model
    // can answer using the results.
  }

  // Hit the round cap while still calling tools: ask once more for a summary.
  reply =
    reply ||
    'リクエストを処理しました。ダッシュボードで確認してください。';
  return { reply, actions, messages };
}

/** Build a short Japanese confirmation from the executed write actions,
 *  avoiding a second LLM call. */
function synthesizeReply(actions: ToolAction[]): string {
  const lines = actions.map((a) => {
    const title = a.item?.title ?? '項目';
    const pts = a.item?.point_weight;
    const ptSuffix = pts ? `(+${pts}pt)` : '';
    switch (a.type) {
      case 'created':
        return `「${title}」を追加しました${ptSuffix}。`;
      case 'completed':
        return `「${title}」の達成を記録しました${ptSuffix}。`;
      case 'updated':
        return `「${title}」を更新しました。`;
      case 'archived':
        return `「${title}」をアーカイブしました。`;
    }
  });
  return lines.join('\n');
}

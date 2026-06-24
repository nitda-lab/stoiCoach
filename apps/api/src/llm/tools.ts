import type { ToolDef } from './messages';
import type { Item } from '../db/types';
import { validateItemInput, TRACKING_TYPES } from '../domain/item';
import {
  createItem,
  updateItem,
  archiveItem,
  getItem,
  listItems,
} from '../db/itemRepo';
import { addCompletion } from '../db/completionRepo';

export interface ToolAction {
  type: 'created' | 'updated' | 'completed' | 'archived';
  item?: Item;
}

export interface ToolOutcome {
  result: unknown;
  action?: ToolAction;
}

const configSchema = {
  type: 'object',
  description:
    'tracking_typeに応じた設定。recurring:{cadence:daily|weekly|monthly,target_per_period:int}, one_time:{due_date:YYYY-MM-DD}, avoidance:{since:YYYY-MM-DD}, progress:{milestones:string[],percent:0-100}',
  additionalProperties: true,
};

export const TOOL_DEFS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'create_item',
      description:
        'ユーザーの新しい管理項目（習慣・タスク・やめること・中長期目標）を作成する。point_weightは難易度に応じて提案すること（簡単=5前後、難しい=20前後）。',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          tracking_type: { type: 'string', enum: TRACKING_TYPES },
          config: configSchema,
          point_weight: { type: 'integer', minimum: 0 },
        },
        required: ['title', 'tracking_type', 'config', 'point_weight'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_item',
      description: '既存の管理項目を修正する（名前・設定・ポイント・状態）。',
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string' },
          title: { type: 'string' },
          config: configSchema,
          point_weight: { type: 'integer', minimum: 0 },
          status: { type: 'string', enum: ['active', 'archived', 'done'] },
        },
        required: ['item_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_item',
      description:
        'ある項目の達成を記録する（チェック）。ポイントは項目のpoint_weightが自動で付与される。dateを省略すると今日。',
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD。省略時は今日' },
        },
        required: ['item_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'archive_item',
      description: '項目をアーカイブ（終了・非表示）する。',
      parameters: {
        type: 'object',
        properties: { item_id: { type: 'string' } },
        required: ['item_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_items',
      description: '現在のユーザーの管理項目一覧を取得する。状況把握に使う。',
      parameters: { type: 'object', properties: {} },
    },
  },
];

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** Execute a tool call against the user's data. Never throws on bad input —
 *  returns `{result:{error}}` so the model can recover. */
export async function executeTool(
  userId: string,
  name: string,
  args: Record<string, unknown>,
  today: string,
): Promise<ToolOutcome> {
  try {
    switch (name) {
      case 'create_item': {
        const v = validateItemInput(args);
        if (!v.ok) return { result: { error: v.error } };
        const item = await createItem(userId, v.value);
        return { result: item, action: { type: 'created', item } };
      }
      case 'update_item': {
        const id = asString(args.item_id);
        if (!id) return { result: { error: 'item_id is required' } };
        const item = await updateItem(userId, id, {
          title: asString(args.title),
          config: (args.config as Record<string, unknown>) ?? undefined,
          point_weight:
            typeof args.point_weight === 'number' ? args.point_weight : undefined,
          status: args.status as Item['status'] | undefined,
        });
        if (!item) return { result: { error: 'item not found' } };
        return { result: item, action: { type: 'updated', item } };
      }
      case 'complete_item': {
        const id = asString(args.item_id);
        if (!id) return { result: { error: 'item_id is required' } };
        const item = await getItem(userId, id);
        if (!item) return { result: { error: 'item not found' } };
        const date = asString(args.date) ?? today;
        const completion = await addCompletion(userId, id, date, item.point_weight);
        return { result: completion, action: { type: 'completed', item } };
      }
      case 'archive_item': {
        const id = asString(args.item_id);
        if (!id) return { result: { error: 'item_id is required' } };
        const item = await archiveItem(userId, id);
        if (!item) return { result: { error: 'item not found' } };
        return { result: { ok: true }, action: { type: 'archived', item } };
      }
      case 'list_items': {
        const items = await listItems(userId);
        return { result: { items } };
      }
      default:
        return { result: { error: `unknown tool: ${name}` } };
    }
  } catch (err) {
    return { result: { error: err instanceof Error ? err.message : 'tool failed' } };
  }
}

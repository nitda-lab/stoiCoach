import type { ItemView } from '../lib/useSummary';

interface Props {
  item: ItemView;
  onComplete: (id: string) => void;
  busy: boolean;
}

/** Days elapsed since a YYYY-MM-DD date, inclusive of today. */
function daysSince(since: string): number {
  const ms = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`) - Date.parse(`${since}T00:00:00Z`);
  return Math.max(0, Math.floor(ms / 86400000));
}

export function ItemCard({ item, onComplete, busy }: Props) {
  const checkable =
    item.tracking_type === 'recurring' ||
    item.tracking_type === 'avoidance' ||
    item.tracking_type === 'one_time';

  return (
    <li className={`item-card${item.completedToday ? ' item-card--done' : ''}`}>
      {checkable && (
        <input
          type="checkbox"
          checked={item.completedToday}
          disabled={busy || item.completedToday}
          onChange={() => onComplete(item.id)}
          aria-label={`${item.title}を達成`}
        />
      )}

      <div className="item-card__main">
        <span className="item-card__title">{item.title}</span>
        <span className="item-card__meta">{renderMeta(item)}</span>
      </div>

      {item.tracking_type === 'progress' && (
        <div className="progress">
          <div
            className="progress__bar"
            style={{ width: `${clampPercent(item.config.percent)}%` }}
          />
        </div>
      )}

      <span className="item-card__points">+{item.point_weight}pt</span>
    </li>
  );
}

function renderMeta(item: ItemView): string {
  switch (item.tracking_type) {
    case 'recurring':
      return item.streak > 0 ? `🔥 ${item.streak}日連続` : '繰り返し';
    case 'avoidance': {
      const since = typeof item.config.since === 'string' ? item.config.since : undefined;
      return since ? `🚫 ${daysSince(since)}日継続` : 'やめること';
    }
    case 'one_time': {
      const due = typeof item.config.due_date === 'string' ? item.config.due_date : undefined;
      return due ? `期限 ${due}` : 'タスク';
    }
    case 'progress':
      return `${clampPercent(item.config.percent)}%`;
    default:
      return '';
  }
}

function clampPercent(v: unknown): number {
  const n = typeof v === 'number' ? v : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

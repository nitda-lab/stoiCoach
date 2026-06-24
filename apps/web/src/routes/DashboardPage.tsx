import { useState } from 'react';
import { useSummary, useComplete } from '../lib/useSummary';
import { ItemCard } from '../components/ItemCard';

type Period = 'today' | 'week' | 'month';
const PERIOD_LABEL: Record<Period, string> = { today: '今日', week: '週', month: '月' };

export function DashboardPage() {
  const { data, isLoading, error } = useSummary();
  const complete = useComplete();
  const [period, setPeriod] = useState<Period>('today');

  const periodPoints = data ? data.points[period] : 0;

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <div className="dashboard__points">
          <span className="dashboard__points-period">{PERIOD_LABEL[period]} {periodPoints} pt</span>
          <span className="dashboard__points-total">🔥 累計 {data?.points.total ?? 0} pt</span>
        </div>
        <div className="dashboard__tabs">
          {(['today', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              className={`tab${p === period ? ' tab--active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p>読み込み中…</p>}
      {error && <p className="error">読み込みに失敗しました: {error.message}</p>}

      {data && data.items.length === 0 && (
        <p className="dashboard__empty">
          まだ管理項目がありません。チャットでAIに目標を伝えると、ここに表示されます。
        </p>
      )}

      <ul className="item-list">
        {data?.items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            busy={complete.isPending}
            onComplete={(id) => complete.mutate(id)}
          />
        ))}
      </ul>
    </div>
  );
}

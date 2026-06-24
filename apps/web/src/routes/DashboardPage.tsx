import { useItems } from '../lib/useItems';

export function DashboardPage() {
  const { data: items, isLoading, error } = useItems();

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <span className="dashboard__points">🔥 累計 0 pt</span>
        <div className="dashboard__tabs">
          <button className="tab tab--active">今日</button>
          <button className="tab">週</button>
          <button className="tab">月</button>
        </div>
      </div>

      {isLoading && <p>読み込み中…</p>}
      {error && <p className="error">読み込みに失敗しました: {error.message}</p>}

      {items && items.length === 0 && (
        <p className="dashboard__empty">
          まだ管理項目がありません。チャットでAIに目標を伝えると、ここに表示されます。
        </p>
      )}

      <ul className="item-list">
        {items?.map((item) => (
          <li key={item.id} className="item-card">
            <input type="checkbox" disabled />
            <span className="item-card__title">{item.title}</span>
            <span className="item-card__points">+{item.point_weight}pt</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

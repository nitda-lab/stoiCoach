import { useState, useRef, useEffect } from 'react';
import { useChat, type ChatAction } from '../lib/useChat';

const ACTION_LABEL: Record<ChatAction['type'], string> = {
  created: '追加しました',
  updated: '更新しました',
  completed: '達成を記録しました',
  archived: 'アーカイブしました',
};

export function ChatPage() {
  const { messages, send, pending, error } = useChat();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(text);
    setText('');
  };

  return (
    <div className="chat">
      <div className="chat__history">
        {messages.length === 0 && (
          <p className="chat__placeholder">
            理想の自分や、始めたい習慣・やめたいこと・目標を話しかけてみましょう。
            <br />
            例:「毎朝ランニングしたい。あと夜更かしをやめたい」
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg msg--${m.role}`}>
            <div className="msg__bubble">{m.content}</div>
            {m.actions && m.actions.length > 0 && (
              <div className="msg__chips">
                {m.actions.map((a, j) => (
                  <span key={j} className="chip">
                    ✓ {a.item?.title ? `${a.item.title}を` : ''}
                    {ACTION_LABEL[a.type]}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {pending && <div className="msg msg--assistant"><div className="msg__bubble msg__bubble--typing">考え中…</div></div>}
        {error && <p className="error">{error}</p>}
        <div ref={endRef} />
      </div>

      <form className="chat__composer" onSubmit={onSubmit}>
        <input
          className="chat__input"
          placeholder="メッセージを入力…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={pending}
        />
        <button className="chat__send" type="submit" disabled={pending || !text.trim()}>
          送信
        </button>
      </form>
    </div>
  );
}

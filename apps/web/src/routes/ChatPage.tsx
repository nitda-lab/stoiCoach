export function ChatPage() {
  return (
    <div className="chat">
      <div className="chat__history">
        <p className="chat__placeholder">
          AIに「理想の自分」や始めたい習慣・やめたいことを話しかけてみましょう。
          <br />
          （チャット機能は次のマイルストーンで実装されます）
        </p>
      </div>
      <form className="chat__composer" onSubmit={(e) => e.preventDefault()}>
        <input
          className="chat__input"
          placeholder="メッセージを入力…"
          disabled
        />
        <button className="chat__send" type="submit" disabled>
          送信
        </button>
      </form>
    </div>
  );
}

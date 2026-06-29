export function PageHeader({ title, notice, setNotice }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">Operations scheduling</p>
        <h2>{title}</h2>
      </div>
      {notice && (
        <button className="notice" onClick={() => setNotice("")}>
          {notice}
        </button>
      )}
    </header>
  );
}

export default function Loading() {
  return (
    <main aria-busy="true">
      <div className="loading-head">
        <span className="loading-logo" />
        <span className="loading-title" />
      </div>
      <div className="loading-bar" />
      <div className="rides-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="loading-card" />
        ))}
      </div>
    </main>
  );
}

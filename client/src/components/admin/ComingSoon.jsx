export default function ComingSoon({ title, note }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-nia-navy-dark mb-2">{title}</h1>
      <div className="rounded-nia-card border border-nia-border bg-white p-8 text-center text-nia-text-muted">
        <p className="font-semibold text-nia-navy mb-1">Coming soon</p>
        <p className="text-sm">{note}</p>
      </div>
    </div>
  );
}

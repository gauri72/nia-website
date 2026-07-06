export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-nia-btn bg-nia-panel-alt border border-nia-border p-1 mb-5 flex-wrap">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`relative flex items-center gap-1.5 rounded-[6px] border-0 px-3 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-nia-orange/40 ${
            active === t.key
              ? 'bg-white text-nia-navy-dark shadow-sm'
              : 'bg-transparent text-nia-text-muted hover:text-nia-navy-dark'
          }`}
        >
          {t.label}
          {t.badge > 0 && (
            <span className="bg-nia-warning text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

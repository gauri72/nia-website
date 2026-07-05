const TONES = {
  orange: { bg: 'bg-nia-orange/10', text: 'text-nia-orange' },
  navy:   { bg: 'bg-nia-navy/10', text: 'text-nia-navy' },
  green:  { bg: 'bg-nia-success/10', text: 'text-nia-success' },
  gold:   { bg: 'bg-nia-gold/15', text: 'text-nia-gold-dark' },
};

export default function StatCard({ icon: Icon, label, value, tone = 'orange' }) {
  const t = TONES[tone] || TONES.orange;
  return (
    <div className="rounded-nia-card border border-nia-border bg-white p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl ${t.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`${t.text} text-lg`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-nia-navy-dark leading-tight truncate">{value}</p>
        <p className="text-xs text-nia-text-faint">{label}</p>
      </div>
    </div>
  );
}

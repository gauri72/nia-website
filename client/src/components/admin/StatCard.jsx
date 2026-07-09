const TONES = {
  orange: { bg: 'bg-nia-orange/10', text: 'text-nia-orange' },
  navy:   { bg: 'bg-nia-navy/10', text: 'text-nia-navy' },
  green:  { bg: 'bg-nia-success/10', text: 'text-nia-success' },
  gold:   { bg: 'bg-nia-gold/15', text: 'text-nia-gold-dark' },
};

export default function StatCard({ icon: Icon, label, value, tone = 'orange', onClick, active = false }) {
  const t = TONES[tone] || TONES.orange;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`rounded-nia-card border bg-white p-5 flex items-center gap-4 text-left w-full transition-colors ${
        active ? 'border-nia-orange ring-2 ring-nia-orange/30' : 'border-nia-border'
      } ${onClick ? 'cursor-pointer hover:border-nia-orange/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-nia-orange/40' : ''}`}
    >
      <div className={`w-12 h-12 rounded-2xl ${t.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`${t.text} text-lg`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-nia-navy-dark leading-tight truncate">{value}</p>
        <p className="text-xs text-nia-text-faint">{label}</p>
      </div>
    </Tag>
  );
}

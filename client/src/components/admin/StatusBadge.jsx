const STYLES = {
  active:    { bg: 'bg-nia-success/10', text: 'text-nia-success', dot: 'bg-nia-success' },
  expired:   { bg: 'bg-nia-text-faint/10', text: 'text-nia-text-muted', dot: 'bg-nia-text-faint' },
  pending:   { bg: 'bg-nia-warning/10', text: 'text-nia-warning', dot: 'bg-nia-warning' },
  suspended: { bg: 'bg-nia-error/10', text: 'text-nia-error', dot: 'bg-nia-error' },
  canceled:  { bg: 'bg-nia-text-faint/10', text: 'text-nia-text-muted', dot: 'bg-nia-text-faint' },
  none:      { bg: 'bg-nia-panel-alt', text: 'text-nia-text-faint', dot: 'bg-nia-text-faint' },
  deleted:   { bg: 'bg-nia-error/10', text: 'text-nia-error', dot: 'bg-nia-error' },
  draft:     { bg: 'bg-nia-text-faint/10', text: 'text-nia-text-muted', dot: 'bg-nia-text-faint' },
  published: { bg: 'bg-nia-success/10', text: 'text-nia-success', dot: 'bg-nia-success' },
  'sold-out': { bg: 'bg-nia-warning/10', text: 'text-nia-warning', dot: 'bg-nia-warning' },
  past:      { bg: 'bg-nia-text-faint/10', text: 'text-nia-text-muted', dot: 'bg-nia-text-faint' },
  confirmed: { bg: 'bg-nia-success/10', text: 'text-nia-success', dot: 'bg-nia-success' },
  cancelled: { bg: 'bg-nia-error/10', text: 'text-nia-error', dot: 'bg-nia-error' },
  refunded:  { bg: 'bg-nia-error/10', text: 'text-nia-error', dot: 'bg-nia-error' },
  paid:      { bg: 'bg-nia-success/10', text: 'text-nia-success', dot: 'bg-nia-success' },
  pending_payment: { bg: 'bg-nia-warning/10', text: 'text-nia-warning', dot: 'bg-nia-warning' },
  failed:    { bg: 'bg-nia-error/10', text: 'text-nia-error', dot: 'bg-nia-error' },
};

export default function StatusBadge({ status }) {
  const key = (status || 'none').toLowerCase();
  const style = STYLES[key] || STYLES.none;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {(status || 'none').replace('_', ' ')}
    </span>
  );
}

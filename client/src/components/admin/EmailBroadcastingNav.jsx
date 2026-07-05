import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/admin/broadcasting', label: 'Templates', end: true },
  { to: '/admin/broadcasting/compose', label: 'Compose Broadcast' },
  { to: '/admin/broadcasting/history', label: 'History & Analytics' },
  { to: '/admin/broadcasting/suppression-list', label: 'Suppression List' },
];

export default function EmailBroadcastingNav() {
  return (
    <div className="flex gap-1 border-b border-nia-border mb-5">
      {TABS.map(({ to, label, end }) => (
        <NavLink
          key={to} to={to} end={end}
          className={({ isActive }) =>
            `px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              isActive ? 'border-nia-orange text-nia-navy-dark' : 'border-transparent text-nia-text-muted hover:text-nia-navy-dark'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </div>
  );
}

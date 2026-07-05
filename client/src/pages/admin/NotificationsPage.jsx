import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import adminApi from '../../services/adminApi';

const btnSecondary = 'rounded-nia-btn border border-nia-border bg-white px-4 py-2 text-sm font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors';

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    adminApi.get('/admin/notifications').then((r) => setNotifications(r.data.notifications)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleMarkAllRead() {
    await adminApi.post('/admin/notifications/mark-all-read');
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-nia-navy-dark">Notifications</h1>
        <button onClick={handleMarkAllRead} className={btnSecondary}>Mark All as Read</button>
      </div>

      {!loading && notifications.length === 0 && (
        <div className="rounded-nia-card border border-nia-border bg-white p-8 text-center text-nia-text-faint">No notifications yet.</div>
      )}

      <div className="flex flex-col gap-2">
        {notifications.map((n) => (
          <div key={n._id} className={`rounded-nia-card border p-4 flex gap-3 items-start ${n.read ? 'border-nia-border bg-white' : 'border-nia-orange/40 bg-nia-orange/5'}`}>
            <Bell className={n.read ? 'text-nia-text-faint mt-1' : 'text-nia-orange mt-1'} />
            <div>
              <p className="font-semibold text-nia-navy-dark text-sm">{n.title}</p>
              <p className="text-sm text-nia-text-muted">{n.body}</p>
              <p className="text-xs text-nia-text-faint mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

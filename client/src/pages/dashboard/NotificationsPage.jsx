import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import memberApi from '../../services/memberApi';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import Button from '../../components/admin/Button';

export default function DashboardNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    memberApi.get('/member/notifications').then((r) => setNotifications(r.data.notifications)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleMarkAllRead() {
    await memberApi.post('/member/notifications/mark-all-read');
    load();
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        actions={<Button variant="secondary" onClick={handleMarkAllRead}>Mark All as Read</Button>}
      />

      {!loading && notifications.length === 0 && (
        <Card className="text-center text-nia-text-faint">No notifications yet.</Card>
      )}

      <div className="flex flex-col gap-2">
        {notifications.map((n) => (
          <Card key={n._id} className={`flex gap-3 items-start ${n.read ? '' : 'border-nia-orange/40 bg-nia-orange/5'}`}>
            <Bell className={n.read ? 'text-nia-text-faint mt-1' : 'text-nia-orange mt-1'} />
            <div>
              <p className="font-semibold text-nia-navy-dark text-sm">{n.title}</p>
              <p className="text-sm text-nia-text-muted">{n.body}</p>
              <p className="text-xs text-nia-text-faint mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

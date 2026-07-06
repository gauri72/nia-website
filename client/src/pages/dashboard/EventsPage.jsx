import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Calendar } from 'lucide-react';
import memberApi from '../../services/memberApi';
import PageHeader from '../../components/admin/PageHeader';

const CATEGORIES = ['Cultural', 'Community', 'Workshop', 'Festival', 'Exhibition', 'Performance', 'Other'];
const selectFilterCls = 'rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20 w-auto';

export default function DashboardEventsPage() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    memberApi.get('/events', { params: { search, category } })
      .then((r) => setEvents(r.data.events))
      .finally(() => setLoading(false));
  }, [search, category]);

  return (
    <div>
      <PageHeader title="Events" />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nia-text-faint text-xs" />
          <input
            className="w-full rounded-nia-btn border border-nia-border py-2 pl-8 pr-3 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20"
            placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={selectFilterCls} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {!loading && events.length === 0 && <p className="text-nia-text-faint">No upcoming events found.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {events.map((e) => (
          <Link key={e._id} to={`/dashboard/events/${e.slug}`} className="rounded-nia-card border border-nia-border bg-white overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
            {e.coverImageUrl && <img src={e.coverImageUrl} alt={e.title} className="w-full h-36 object-cover" />}
            <div className="p-4 flex flex-col gap-1.5 flex-1">
              <span className="text-xs font-bold uppercase tracking-wide text-nia-orange">{e.category}</span>
              <h3 className="font-bold text-nia-navy-dark">{e.title}</h3>
              <p className="text-sm text-nia-text-muted flex items-center gap-1.5"><Calendar className="text-xs" />{new Date(e.startDate).toLocaleDateString()}</p>
              {e.venueCity && <p className="text-sm text-nia-text-muted flex items-center gap-1.5"><MapPin className="text-xs" />{e.venueCity}</p>}
              <div className="flex-1" />
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold text-nia-orange">{e.minPrice != null ? `From €${e.minPrice}` : 'Free'}</span>
                {e.isSoldOut && <span className="text-xs font-semibold text-nia-error">Sold Out</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

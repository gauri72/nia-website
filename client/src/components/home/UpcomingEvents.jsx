const PLACEHOLDER_EVENTS = [
  { id: 1, title: 'Diwali Celebration 2026', date: 'October 2026', location: 'Amsterdam' },
  { id: 2, title: 'Indo-Dutch Business Forum', date: 'November 2026', location: 'The Hague' },
  { id: 3, title: 'Holi Festival', date: 'March 2026', location: 'Rotterdam' },
];

export default function UpcomingEvents() {
  return (
    <section style={{ background: '#f9f9f9', padding: '4rem 2rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Upcoming Events</h2>
      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {PLACEHOLDER_EVENTS.map((event) => (
          <div key={event.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', width: '260px' }}>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>{event.title}</h3>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>{event.date} &middot; {event.location}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const PLACEHOLDER_NEWS = [
  { id: 1, title: 'NIA Launches New Mentorship Programme', date: 'June 2025' },
  { id: 2, title: 'Annual Gala Raises Record Funds for Scholarships', date: 'May 2025' },
  { id: 3, title: 'Partnership Announced with Indian Chamber of Commerce', date: 'April 2025' },
];

export default function NewsHighlights() {
  return (
    <section style={{ maxWidth: '900px', margin: '4rem auto', padding: '0 2rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Latest News</h2>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {PLACEHOLDER_NEWS.map((item) => (
          <li key={item.id} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
            <span style={{ color: '#888', fontSize: '0.85rem' }}>{item.date}</span>
            <p style={{ fontWeight: 600, marginTop: '0.25rem' }}>{item.title}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

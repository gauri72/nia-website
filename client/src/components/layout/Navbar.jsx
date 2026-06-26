export default function Navbar() {
  return (
    <nav style={{ background: '#1a1a2e', color: '#fff', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>NIA — Netherlands India Association</span>
      <ul style={{ listStyle: 'none', display: 'flex', gap: '1.5rem', margin: 0 }}>
        <li><a href="/" style={{ color: '#fff', textDecoration: 'none' }}>Home</a></li>
      </ul>
    </nav>
  );
}

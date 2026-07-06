export default function Card({ children, className = '', padded = true, ...props }) {
  return (
    <div className={`rounded-nia-card border border-nia-border bg-white overflow-hidden ${padded ? 'p-5' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}

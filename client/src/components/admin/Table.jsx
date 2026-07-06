function Table({ children, className = '', bare = false }) {
  // `bare` skips the card wrapper for tables already nested inside another
  // Card/rounded container (e.g. a "Recent Bookings" panel with its own heading) —
  // avoids a double-bordered, nested-card look.
  if (bare) return <table className={`w-full text-sm ${className}`}>{children}</table>;
  return (
    <div className={`rounded-nia-card border border-nia-border bg-white overflow-hidden overflow-x-auto ${className}`}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function Th({ children, align = 'left', className = '' }) {
  return (
    <th
      className={`py-nia-row px-4 text-[11px] font-semibold uppercase tracking-wide text-nia-text-faint border-b border-nia-border ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${className}`}
    >
      {children}
    </th>
  );
}

function HeaderRow({ children }) {
  return <tr>{children}</tr>;
}

function Row({ children, className = '' }) {
  return (
    <tr className={`border-t border-nia-border/60 ${className}`}>{children}</tr>
  );
}

function Cell({ children, align = 'left', className = '' }) {
  return (
    <td className={`py-nia-row px-4 ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}>
      {children}
    </td>
  );
}

function Empty({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-nia-text-faint">
        {children}
      </td>
    </tr>
  );
}

function Skeleton({ colSpan, rows = 5 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i} className="border-t border-nia-border/60 animate-pulse">
      <td className="px-4 py-3" colSpan={colSpan}>
        <div className="h-4 bg-nia-panel-alt rounded w-full" />
      </td>
    </tr>
  ));
}

Table.Head = ({ children }) => <thead>{children}</thead>;
Table.HeaderRow = HeaderRow;
Table.Th = Th;
Table.Body = ({ children }) => <tbody>{children}</tbody>;
Table.Row = Row;
Table.Cell = Cell;
Table.Empty = Empty;
Table.Skeleton = Skeleton;

export default Table;

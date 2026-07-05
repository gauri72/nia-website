// Single-series monthly revenue bar chart — no charting library, plain SVG.
// One hue (NIA orange) since bar height already encodes magnitude; validated
// against the light chart surface via the dataviz skill's contrast checker.
export default function RevenueChart({ data }) {
  const width = 560, height = 220;
  const padding = { top: 24, right: 12, bottom: 28, left: 12 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const max = Math.max(1, ...data.map((d) => d.amount));
  const barSlot = chartW / data.length;
  const barWidth = Math.min(24, barSlot * 0.5);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Monthly revenue chart">
      {/* Baseline */}
      <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#e8edf5" strokeWidth="1" />

      {data.map((d, i) => {
        const barHeight = (d.amount / max) * (chartH - 20);
        const x = padding.left + i * barSlot + (barSlot - barWidth) / 2;
        const y = height - padding.bottom - barHeight;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 1)} rx="4" fill="#e8641a" />
            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1a2b5e">
              {d.amount > 0 ? `€${d.amount.toLocaleString()}` : ''}
            </text>
            <text x={x + barWidth / 2} y={height - padding.bottom + 16} textAnchor="middle" fontSize="10" fill="#888">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

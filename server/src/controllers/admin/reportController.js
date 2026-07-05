const {
  getMembershipReport, getEventsReport, getRevenueReport, getBroadcastReport, toCsv, toPdfTable,
} = require('../../services/reportService');

const REPORTS = {
  membership: {
    fetch: getMembershipReport,
    toRows: (data) => data.tierBreakdown.map((t) => [t.tier, t.activeMembers]),
    headers: ['Tier', 'Active Members'],
    title: 'Membership Report',
  },
  events: {
    fetch: getEventsReport,
    toRows: (data) => data.events.map((e) => [e.title, e.category, e.status, new Date(e.startDate).toLocaleDateString(), e.capacity ?? '', e.ticketsSold, e.revenue.toFixed(2)]),
    headers: ['Title', 'Category', 'Status', 'Date', 'Capacity', 'Tickets Sold', 'Revenue (€)'],
    title: 'Events Report',
  },
  revenue: {
    fetch: getRevenueReport,
    toRows: (data) => data.monthly.map((m) => [m.month, m.amount.toFixed(2)]),
    headers: ['Month', 'Revenue (€)'],
    title: 'Revenue Report',
  },
  broadcasts: {
    fetch: getBroadcastReport,
    toRows: (data) => data.broadcasts.map((b) => [b.name, b.subject, new Date(b.sentAt).toLocaleDateString(), b.sent, `${b.openRate}%`, `${b.clickRate}%`, `${b.unsubscribeRate}%`]),
    headers: ['Name', 'Subject', 'Sent Date', 'Sent', 'Open Rate', 'Click Rate', 'Unsubscribe Rate'],
    title: 'Broadcast Report',
  },
};

// ── GET /api/admin/reports/:type ─────────────────────────────────
async function get(req, res, next) {
  try {
    const report = REPORTS[req.params.type];
    if (!report) return res.status(404).json({ error: 'Unknown report type' });
    const data = await report.fetch();
    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/reports/:type/export?format=csv|pdf ───────────
async function exportReport(req, res, next) {
  try {
    const report = REPORTS[req.params.type];
    if (!report) return res.status(404).json({ error: 'Unknown report type' });

    const data = await report.fetch();
    const rows = report.toRows(data);
    const format = req.query.format === 'pdf' ? 'pdf' : 'csv';

    if (format === 'csv') {
      const csv = toCsv(report.headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}-report.csv"`);
      return res.send(csv);
    }

    const pdfBuffer = await toPdfTable(report.title, report.headers, rows);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}-report.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { get, exportReport };

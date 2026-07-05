const PDFDocument = require('pdfkit');
const Member = require('../models/Member');
const MembershipTier = require('../models/MembershipTier');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const MembershipPayment = require('../models/MembershipPayment');
const Broadcast = require('../models/Broadcast');

// ── Membership report ────────────────────────────────────────────
async function getMembershipReport() {
  const tiers = await MembershipTier.find();
  const tierBreakdown = await Promise.all(tiers.map(async (t) => ({
    tier: t.name,
    activeMembers: await Member.countDocuments({ membershipTier: t._id, membershipStatus: 'active' }),
  })));

  const statuses = ['none', 'active', 'pending', 'expired', 'suspended', 'canceled'];
  const statusBreakdown = await Promise.all(statuses.map(async (s) => ({
    status: s, count: await Member.countDocuments({ membershipStatus: s }),
  })));

  const totalMembers = await Member.countDocuments({ status: { $ne: 'deleted' } });
  return { totalMembers, tierBreakdown, statusBreakdown };
}

// ── Events report ─────────────────────────────────────────────────
async function getEventsReport() {
  const events = await Event.find().sort('-startDate').limit(50);
  const rows = await Promise.all(events.map(async (e) => {
    const bookings = await Booking.find({ event: e._id, status: 'paid' });
    const ticketsSold = bookings.reduce((sum, b) => sum + b.lines.reduce((s, l) => s + l.quantity, 0), 0);
    const revenue = bookings.reduce((sum, b) => sum + b.amount, 0);
    return { title: e.title, category: e.category, status: e.status, startDate: e.startDate, capacity: e.capacity, ticketsSold, revenue };
  }));
  return { events: rows };
}

// ── Revenue report ──────────────────────────────────────────────
async function getRevenueReport() {
  const paidBookings = await Booking.find({ status: 'paid' }).select('amount paid_at');
  const paidMemberships = await MembershipPayment.find({ status: 'paid' }).select('amount paid_at type');

  const bookingRevenue = paidBookings.reduce((s, b) => s + b.amount, 0);
  const membershipRevenue = paidMemberships.reduce((s, m) => s + m.amount, 0);

  const monthly = {};
  const addTo = (date, amount) => {
    const d = new Date(date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = (monthly[key] || 0) + amount;
  };
  paidBookings.forEach((b) => b.paid_at && addTo(b.paid_at, b.amount));
  paidMemberships.forEach((m) => m.paid_at && addTo(m.paid_at, m.amount));

  const monthlyRows = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount }));

  return { bookingRevenue, membershipRevenue, total: bookingRevenue + membershipRevenue, monthly: monthlyRows };
}

// ── Broadcast report ──────────────────────────────────────────────
async function getBroadcastReport() {
  const broadcasts = await Broadcast.find({ status: 'sent' }).populate('template', 'name').sort('-sentAt');
  const rows = broadcasts.map((b) => {
    const rate = (n) => (b.stats.sent > 0 ? Math.round((n / b.stats.sent) * 1000) / 10 : 0);
    return {
      name: b.name, subject: b.subject, sentAt: b.sentAt, sent: b.stats.sent,
      openRate: rate(b.stats.opened), clickRate: rate(b.stats.clicked), unsubscribeRate: rate(b.stats.unsubscribed),
    };
  });
  return { broadcasts: rows };
}

// ── Generic export helpers ────────────────────────────────────────
function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function toPdfTable(title, headers, rows) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.rect(0, 0, doc.page.width, 60).fill('#0F1F4B');
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text(title, 40, 20);

      const colWidth = (doc.page.width - 80) / headers.length;
      let y = 90;
      doc.fillColor('#0F1F4B').fontSize(9).font('Helvetica-Bold');
      headers.forEach((h, i) => doc.text(String(h), 40 + i * colWidth, y, { width: colWidth - 5 }));
      y += 18;
      doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor('#e0e0e0').stroke();
      y += 8;

      doc.font('Helvetica').fillColor('#333333').fontSize(8);
      for (const row of rows) {
        if (y > doc.page.height - 60) { doc.addPage(); y = 40; }
        row.forEach((cell, i) => doc.text(String(cell ?? ''), 40 + i * colWidth, y, { width: colWidth - 5 }));
        y += 16;
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { getMembershipReport, getEventsReport, getRevenueReport, getBroadcastReport, toCsv, toPdfTable };

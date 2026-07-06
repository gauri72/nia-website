const nodemailer = require('nodemailer');
const QRCode     = require('qrcode');
const PDFDocument = require('pdfkit');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const FROM = `"NIA Netherlands" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// ── Shared HTML wrapper ───────────────────────────────────────
function htmlWrap(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: #0F1F4B; color: #fff; padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.7); }
    .body { padding: 28px 32px; color: #333; line-height: 1.6; }
    .highlight { background: #f0f4ff; border-left: 4px solid #E8641A; padding: 14px 18px; border-radius: 4px; margin: 18px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #666; }
    .value { font-weight: 600; color: #0F1F4B; }
    .amount { font-size: 22px; font-weight: 700; color: #E8641A; }
    .footer { background: #f9f9f9; padding: 18px 32px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
    .btn { display: inline-block; background: #E8641A; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .qr-block { text-align: center; margin: 24px 0; }
    .qr-block img { width: 160px; height: 160px; }
    .qr-block p { font-size: 12px; color: #888; margin: 6px 0 0; }
  </style></head><body>
  <div class="container">
    <div class="header">
      <h1>🇳🇱🇮🇳 Netherlands India Association</h1>
      <p>${title}</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">Netherlands India Association · Together Since 1950<br>This is an automated email. Please do not reply directly.</div>
  </div></body></html>`;
}

// ── QR code as base64 data URL ────────────────────────────────
async function generateQRDataURL(text) {
  return QRCode.toDataURL(text, { width: 200, margin: 1, color: { dark: '#0F1F4B', light: '#ffffff' } });
}

// ── PDF ticket generator ──────────────────────────────────────
async function generateTicketPDF(ticket) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A5', margin: 40 });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const qrDataUrl = await generateQRDataURL(ticket.ticketNumber);
      const qrBuffer  = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

      const W = doc.page.width;

      // Header bar
      doc.rect(0, 0, W, 70).fill('#0F1F4B');
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
        .text('Netherlands India Association', 40, 18);
      doc.fontSize(10).font('Helvetica')
        .text('India Independence Day — 15 August 2026', 40, 40);

      // Orange accent bar
      doc.rect(0, 70, W, 5).fill('#E8641A');

      // Ticket number block
      doc.fillColor('#0F1F4B').fontSize(13).font('Helvetica-Bold')
        .text('EVENT TICKET', 40, 95);
      doc.fontSize(20).text(ticket.ticketNumber, 40, 114);

      // Divider
      doc.moveTo(40, 150).lineTo(W - 40, 150).strokeColor('#e0e0e0').stroke();

      // Ticket details — full width, no QR alongside
      const details = [
        ['Name',       ticket.name],
        ['Email',      ticket.email],
        ['Tickets',    ticket.tickets.map(t => `${t.quantity}× ${t.ticket_type}`).join(', ')],
        ['Total Paid', `€${Number(ticket.amount).toFixed(2)}`],
        ['Payment ID', ticket.mollie_payment_id],
        ['Date',       new Date(ticket.paid_at).toLocaleDateString('nl-NL')],
      ];

      let y = 166;
      doc.fontSize(10);
      for (const [label, value] of details) {
        doc.font('Helvetica').fillColor('#888888').text(label, 40, y);
        doc.font('Helvetica-Bold').fillColor('#0F1F4B').text(value, 160, y);
        y += 24;
      }

      // Divider before QR
      y += 8;
      doc.moveTo(40, y).lineTo(W - 40, y).strokeColor('#e0e0e0').stroke();
      y += 16;

      // QR code — centred below details
      const qrSize = 130;
      const qrX = (W - qrSize) / 2;
      doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });
      doc.font('Helvetica').fillColor('#888888').fontSize(8)
        .text('Scan at event entry', 0, y + qrSize + 6, { width: W, align: 'center' });

      // Footer bar
      doc.rect(0, doc.page.height - 40, W, 40).fill('#f5f5f5');
      doc.fillColor('#999999').fontSize(8)
        .text('Please present this ticket (print or digital) at the event entrance.', 40, doc.page.height - 28);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ── Membership ────────────────────────────────────────────────
async function sendMembershipConfirmation(membership) {
  const transporter = createTransporter();
  const planLabel = membership.plan === 'patron' ? 'PATRON (€150/year)' : 'FRIEND (€60/year)';

  const body = `
    <p>Dear <strong>${membership.name}</strong>,</p>
    <p>🎉 Welcome to the Netherlands India Association! Your membership has been successfully activated.</p>
    <div class="highlight">
      <strong>Membership ID:</strong> ${membership.membershipId}<br>
      <strong>Plan:</strong> ${planLabel}
    </div>
    <p><strong>Your Membership Details:</strong></p>
    <div class="detail-row"><span class="label">Name</span><span class="value">${membership.name}</span></div>
    <div class="detail-row"><span class="label">Email</span><span class="value">${membership.email}</span></div>
    <div class="detail-row"><span class="label">Plan</span><span class="value">${planLabel}</span></div>
    <div class="detail-row"><span class="label">Amount Paid</span><span class="value amount">€${membership.amount.toFixed(2)}</span></div>
    <div class="detail-row"><span class="label">Payment ID</span><span class="value">${membership.mollie_payment_id}</span></div>
    <div class="detail-row"><span class="label">Activated On</span><span class="value">${new Date(membership.activated_at).toLocaleDateString('nl-NL')}</span></div>
    <p style="margin-top:24px;">You are now an official NIA member. Enjoy exclusive benefits at our upcoming events!</p>`;

  await transporter.sendMail({
    from: FROM,
    to: membership.email,
    subject: `✅ NIA Membership Confirmed — ${membership.membershipId}`,
    html: htmlWrap('Membership Confirmation', body),
  });
  console.log(`[Email] Membership confirmation sent to ${membership.email}`);
}

async function sendMembershipReceipt(membership) {
  const transporter = createTransporter();
  const body = `
    <p>Dear <strong>${membership.name}</strong>,</p>
    <p>This is your official payment receipt for your NIA membership.</p>
    <div class="detail-row"><span class="label">Receipt For</span><span class="value">NIA Membership — ${membership.plan.toUpperCase()}</span></div>
    <div class="detail-row"><span class="label">Membership ID</span><span class="value">${membership.membershipId}</span></div>
    <div class="detail-row"><span class="label">Amount</span><span class="value amount">€${membership.amount.toFixed(2)}</span></div>
    <div class="detail-row"><span class="label">Payment Provider</span><span class="value">Mollie</span></div>
    <div class="detail-row"><span class="label">Mollie Payment ID</span><span class="value">${membership.mollie_payment_id}</span></div>
    <div class="detail-row"><span class="label">Date</span><span class="value">${new Date(membership.paid_at).toLocaleDateString('nl-NL')}</span></div>
    <p style="margin-top:20px; font-size:13px; color:#999;">Please keep this receipt for your records.</p>`;

  await transporter.sendMail({
    from: FROM,
    to: membership.email,
    subject: `🧾 Payment Receipt — NIA Membership ${membership.membershipId}`,
    html: htmlWrap('Payment Receipt', body),
  });
  console.log(`[Email] Membership receipt sent to ${membership.email}`);
}

// ── Event Ticket ──────────────────────────────────────────────
async function sendTicketConfirmation(ticket) {
  const transporter = createTransporter();
  const ticketLines = ticket.tickets.map(t =>
    `<div class="detail-row"><span class="label">${t.ticket_type} × ${t.quantity}</span><span class="value">€${t.line_total.toFixed(2)}</span></div>`
  ).join('');

  // Generate QR as a buffer and embed as CID — data: URIs are blocked by most email clients
  const qrDataUrl = await generateQRDataURL(ticket.ticketNumber);
  const qrBuffer  = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  const qrCid     = `qr-${ticket.ticketNumber}@nia`;

  const qrBlock = `
    <div class="qr-block">
      <img src="cid:${qrCid}" alt="QR Code" width="160" height="160" style="display:block;margin:0 auto;" />
      <p>Scan at event entry — ${ticket.ticketNumber}</p>
    </div>`;

  const pdfBuffer = await generateTicketPDF(ticket);

  const body = `
    <p>Dear <strong>${ticket.name}</strong>,</p>
    <p>🎟️ Your tickets for the NIA event have been confirmed! Your PDF ticket with QR code is attached.</p>
    <div class="highlight"><strong>Ticket Number:</strong> ${ticket.ticketNumber}</div>
    <p><strong>Ticket Summary:</strong></p>
    ${ticketLines}
    ${ticket.discount_amount > 0 ? `<div class="detail-row"><span class="label">Discount Applied</span><span class="value" style="color:green;">−€${ticket.discount_amount.toFixed(2)}</span></div>` : ''}
    <div class="detail-row"><span class="label">Total Paid</span><span class="value amount">€${ticket.amount.toFixed(2)}</span></div>
    <div class="detail-row"><span class="label">Payment ID</span><span class="value">${ticket.mollie_payment_id}</span></div>
    ${qrBlock}
    <p style="margin-top:20px;">Please present your ticket (PDF or this email) at the event entrance. We look forward to seeing you! 🇮🇳🇳🇱</p>`;

  await transporter.sendMail({
    from: FROM,
    to: ticket.email,
    subject: `🎟️ NIA Event Tickets Confirmed — ${ticket.ticketNumber}`,
    html: htmlWrap('Event Ticket Confirmation', body),
    attachments: [
      {
        filename: `NIA-Ticket-${ticket.ticketNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
      {
        filename: 'ticket-qr.png',
        content: qrBuffer,
        contentType: 'image/png',
        cid: qrCid,
      },
    ],
  });
  console.log(`[Email] Ticket confirmation + PDF sent to ${ticket.email}`);
}

async function sendTicketReceipt(ticket) {
  const transporter = createTransporter();
  const body = `
    <p>Dear <strong>${ticket.name}</strong>,</p>
    <p>This is your official payment receipt for your NIA event tickets.</p>
    <div class="detail-row"><span class="label">Ticket Number</span><span class="value">${ticket.ticketNumber}</span></div>
    <div class="detail-row"><span class="label">Amount Paid</span><span class="value amount">€${ticket.amount.toFixed(2)}</span></div>
    <div class="detail-row"><span class="label">Mollie Payment ID</span><span class="value">${ticket.mollie_payment_id}</span></div>
    <div class="detail-row"><span class="label">Date</span><span class="value">${new Date(ticket.paid_at).toLocaleDateString('nl-NL')}</span></div>`;

  await transporter.sendMail({
    from: FROM,
    to: ticket.email,
    subject: `🧾 Payment Receipt — NIA Tickets ${ticket.ticketNumber}`,
    html: htmlWrap('Payment Receipt', body),
  });
  console.log(`[Email] Ticket receipt sent to ${ticket.email}`);
}

async function sendTicketRefundConfirmation(ticket) {
  const transporter = createTransporter();
  const body = `
    <p>Dear <strong>${ticket.name}</strong>,</p>
    <p>Your refund for NIA event tickets <strong>${ticket.ticketNumber}</strong> has been processed.</p>
    <div class="detail-row"><span class="label">Ticket Number</span><span class="value">${ticket.ticketNumber}</span></div>
    <div class="detail-row"><span class="label">Refund Amount</span><span class="value amount">€${Number(ticket.refund_amount ?? ticket.amount).toFixed(2)}</span></div>
    <div class="detail-row"><span class="label">Date</span><span class="value">${new Date(ticket.refunded_at || Date.now()).toLocaleDateString('nl-NL')}</span></div>
    <p style="margin-top:20px; font-size:13px; color:#999;">Please allow a few business days for the refund to appear on your original payment method.</p>`;

  await transporter.sendMail({
    from: FROM,
    to: ticket.email,
    subject: `Refund Processed — ${ticket.ticketNumber}`,
    html: htmlWrap('Refund Confirmation', body),
  });
  console.log(`[Email] Ticket refund confirmation sent to ${ticket.email}`);
}

// ── Donation ──────────────────────────────────────────────────
async function sendDonationThankYou(donation) {
  const transporter = createTransporter();
  const causeLabel = {
    general: 'General Community Fund',
    cultural_events: 'Cultural Events & Festivals',
    youth_education: 'Youth & Education Programmes',
    community_welfare: 'Community Welfare Initiatives',
  }[donation.cause] || donation.cause;

  const body = `
    <p>Dear <strong>${donation.name}</strong>,</p>
    <p>💛 Thank you for your generous donation to the Netherlands India Association! Your contribution makes a real difference to our community.</p>
    <div class="highlight">
      <strong>Donation Reference:</strong> ${donation.referenceNumber}<br>
      <strong>Amount:</strong> <span class="amount">€${donation.amount.toFixed(2)}</span>
    </div>
    <div class="detail-row"><span class="label">Cause</span><span class="value">${causeLabel}</span></div>
    <div class="detail-row"><span class="label">Donation Reference</span><span class="value">${donation.referenceNumber}</span></div>
    <div class="detail-row"><span class="label">Date</span><span class="value">${new Date(donation.paid_at).toLocaleDateString('nl-NL')}</span></div>
    <p style="margin-top:20px;">Your generosity helps us continue bridging two great cultures. Thank you for being part of the NIA family! 🙏</p>`;

  await transporter.sendMail({
    from: FROM,
    to: donation.email,
    subject: `💛 Thank You for Your Donation — NIA`,
    html: htmlWrap('Donation Received — Thank You!', body),
  });
  console.log(`[Email] Donation thank-you sent to ${donation.email}`);
}

async function sendDonationReceipt(donation) {
  const transporter = createTransporter();
  const body = `
    <p>Dear <strong>${donation.name}</strong>,</p>
    <p>This is your official donation receipt from the Netherlands India Association.</p>
    <div class="detail-row"><span class="label">Reference Number</span><span class="value">${donation.referenceNumber}</span></div>
    <div class="detail-row"><span class="label">Donation Amount</span><span class="value amount">€${donation.amount.toFixed(2)}</span></div>
    <div class="detail-row"><span class="label">Mollie Payment ID</span><span class="value">${donation.mollie_payment_id}</span></div>
    <div class="detail-row"><span class="label">Date</span><span class="value">${new Date(donation.paid_at).toLocaleDateString('nl-NL')}</span></div>
    <p style="margin-top:20px; font-size:13px; color:#999;">This receipt may be used for tax purposes. Please keep it for your records.</p>`;

  await transporter.sendMail({
    from: FROM,
    to: donation.email,
    subject: `🧾 Donation Receipt — NIA ${donation.referenceNumber}`,
    html: htmlWrap('Donation Receipt', body),
  });
  console.log(`[Email] Donation receipt sent to ${donation.email}`);
}

// ── Sponsorship ───────────────────────────────────────────────
async function sendSponsorshipConfirmation(sponsorship) {
  const transporter = createTransporter();
  const body = `
    <p>Dear <strong>${sponsorship.contactPerson}</strong>,</p>
    <p>🌟 Thank you for sponsoring the Netherlands India Association! We are thrilled to have <strong>${sponsorship.companyName || sponsorship.sponsorName}</strong> as our ${sponsorship.packageName.toUpperCase()} sponsor.</p>
    <div class="highlight">
      <strong>Sponsorship Reference:</strong> ${sponsorship.referenceNumber}<br>
      <strong>Package:</strong> ${sponsorship.packageName.toUpperCase()} — <span class="amount">€${sponsorship.amount.toFixed(2)}</span>
    </div>
    <div class="detail-row"><span class="label">Contact Person</span><span class="value">${sponsorship.contactPerson}</span></div>
    <div class="detail-row"><span class="label">Company</span><span class="value">${sponsorship.companyName || '—'}</span></div>
    <div class="detail-row"><span class="label">Package</span><span class="value">${sponsorship.packageName.toUpperCase()}</span></div>
    <div class="detail-row"><span class="label">Amount Paid</span><span class="value amount">€${sponsorship.amount.toFixed(2)}</span></div>
    <div class="detail-row"><span class="label">Payment Date</span><span class="value">${new Date(sponsorship.paid_at).toLocaleDateString('nl-NL')}</span></div>
    <p style="margin-top:20px;">Our team will be in touch shortly with sponsorship materials and logo placement details. Welcome aboard! 🎊</p>`;

  await transporter.sendMail({
    from: FROM,
    to: sponsorship.email,
    subject: `🌟 Sponsorship Confirmed — NIA ${sponsorship.referenceNumber}`,
    html: htmlWrap('Sponsorship Confirmation', body),
  });
  console.log(`[Email] Sponsorship confirmation sent to ${sponsorship.email}`);
}

async function sendSponsorshipReceipt(sponsorship) {
  const transporter = createTransporter();
  const body = `
    <p>Dear <strong>${sponsorship.contactPerson}</strong>,</p>
    <p>This is your official payment receipt for your NIA sponsorship.</p>
    <div class="detail-row"><span class="label">Reference Number</span><span class="value">${sponsorship.referenceNumber}</span></div>
    <div class="detail-row"><span class="label">Package</span><span class="value">${sponsorship.packageName.toUpperCase()}</span></div>
    <div class="detail-row"><span class="label">Amount</span><span class="value amount">€${sponsorship.amount.toFixed(2)}</span></div>
    <div class="detail-row"><span class="label">Mollie Payment ID</span><span class="value">${sponsorship.mollie_payment_id}</span></div>
    <div class="detail-row"><span class="label">Date</span><span class="value">${new Date(sponsorship.paid_at).toLocaleDateString('nl-NL')}</span></div>`;

  await transporter.sendMail({
    from: FROM,
    to: sponsorship.email,
    subject: `🧾 Sponsorship Receipt — NIA ${sponsorship.referenceNumber}`,
    html: htmlWrap('Sponsorship Receipt', body),
  });
  console.log(`[Email] Sponsorship receipt sent to ${sponsorship.email}`);
}

async function notifyAdminMembership(membership) {
  if (!ADMIN_EMAIL) return;
  const transporter = createTransporter();
  const planLabel = membership.plan === 'patron' ? 'PATRON (€150/year)' : 'FRIEND (€60/year)';
  const body = `
    <p>A new membership payment has been received.</p>
    <div class="detail-row"><span class="label">Membership ID</span><span class="value">${membership.membershipId}</span></div>
    <div class="detail-row"><span class="label">Name</span><span class="value">${membership.name}</span></div>
    <div class="detail-row"><span class="label">Email</span><span class="value">${membership.email}</span></div>
    <div class="detail-row"><span class="label">Plan</span><span class="value">${planLabel}</span></div>
    <div class="detail-row"><span class="label">Amount</span><span class="value amount">€${membership.amount.toFixed(2)}</span></div>
    <div class="detail-row"><span class="label">Mollie ID</span><span class="value">${membership.mollie_payment_id}</span></div>
    <div class="detail-row"><span class="label">Date</span><span class="value">${new Date(membership.paid_at).toLocaleDateString('nl-NL')}</span></div>`;

  await transporter.sendMail({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `🆕 New Membership — ${planLabel} — ${membership.name}`,
    html: htmlWrap('New Membership Payment Received', body),
  });
  console.log(`[Email] Admin membership notification sent to ${ADMIN_EMAIL}`);
}

async function notifyAdminTicket(ticket) {
  if (!ADMIN_EMAIL) return;
  const transporter = createTransporter();
  const ticketLines = ticket.tickets.map(t =>
    `<div class="detail-row"><span class="label">${t.ticket_type} × ${t.quantity}</span><span class="value">€${t.line_total.toFixed(2)}</span></div>`
  ).join('');
  const body = `
    <p>A new event ticket purchase has been received.</p>
    <div class="detail-row"><span class="label">Ticket Number</span><span class="value">${ticket.ticketNumber}</span></div>
    <div class="detail-row"><span class="label">Name</span><span class="value">${ticket.name}</span></div>
    <div class="detail-row"><span class="label">Email</span><span class="value">${ticket.email}</span></div>
    ${ticketLines}
    ${ticket.discount_amount > 0 ? `<div class="detail-row"><span class="label">Discount</span><span class="value" style="color:green;">−€${ticket.discount_amount.toFixed(2)}</span></div>` : ''}
    <div class="detail-row"><span class="label">Total Paid</span><span class="value amount">€${ticket.amount.toFixed(2)}</span></div>
    <div class="detail-row"><span class="label">Mollie ID</span><span class="value">${ticket.mollie_payment_id}</span></div>
    <div class="detail-row"><span class="label">Date</span><span class="value">${new Date(ticket.paid_at).toLocaleDateString('nl-NL')}</span></div>`;

  await transporter.sendMail({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `🎟️ New Ticket Purchase — ${ticket.ticketNumber} — ${ticket.name}`,
    html: htmlWrap('New Event Ticket Purchase', body),
  });
  console.log(`[Email] Admin ticket notification sent to ${ADMIN_EMAIL}`);
}

async function notifyAdminDonation(donation) {
  if (!ADMIN_EMAIL) return;
  const transporter = createTransporter();
  const causeLabel = {
    general: 'General Community Fund',
    cultural_events: 'Cultural Events & Festivals',
    youth_education: 'Youth & Education Programmes',
    community_welfare: 'Community Welfare Initiatives',
  }[donation.cause] || donation.cause;
  const body = `
    <p>A new donation has been received.</p>
    <div class="detail-row"><span class="label">Reference</span><span class="value">${donation.referenceNumber}</span></div>
    <div class="detail-row"><span class="label">Name</span><span class="value">${donation.name}</span></div>
    <div class="detail-row"><span class="label">Email</span><span class="value">${donation.email}</span></div>
    <div class="detail-row"><span class="label">Cause</span><span class="value">${causeLabel}</span></div>
    <div class="detail-row"><span class="label">Amount</span><span class="value amount">€${donation.amount.toFixed(2)}</span></div>
    <div class="detail-row"><span class="label">Mollie ID</span><span class="value">${donation.mollie_payment_id}</span></div>
    <div class="detail-row"><span class="label">Date</span><span class="value">${new Date(donation.paid_at).toLocaleDateString('nl-NL')}</span></div>`;

  await transporter.sendMail({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `💛 New Donation — €${donation.amount.toFixed(2)} — ${donation.name}`,
    html: htmlWrap('New Donation Received', body),
  });
  console.log(`[Email] Admin donation notification sent to ${ADMIN_EMAIL}`);
}

async function notifyAdminSponsorship(sponsorship) {
  if (!ADMIN_EMAIL) return;
  const transporter = createTransporter();
  const body = `
    <p>A new sponsorship payment has been received.</p>
    <div class="detail-row"><span class="label">Reference</span><span class="value">${sponsorship.referenceNumber}</span></div>
    <div class="detail-row"><span class="label">Sponsor</span><span class="value">${sponsorship.sponsorName}</span></div>
    <div class="detail-row"><span class="label">Company</span><span class="value">${sponsorship.companyName || '—'}</span></div>
    <div class="detail-row"><span class="label">Contact</span><span class="value">${sponsorship.contactPerson}</span></div>
    <div class="detail-row"><span class="label">Email</span><span class="value">${sponsorship.email}</span></div>
    <div class="detail-row"><span class="label">Package</span><span class="value">${sponsorship.packageName.toUpperCase()}</span></div>
    <div class="detail-row"><span class="label">Amount</span><span class="value amount">€${sponsorship.amount.toFixed(2)}</span></div>
    <div class="detail-row"><span class="label">Mollie ID</span><span class="value">${sponsorship.mollie_payment_id}</span></div>`;

  await transporter.sendMail({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `🚨 New Sponsorship Payment — ${sponsorship.packageName.toUpperCase()} — €${sponsorship.amount.toFixed(2)}`,
    html: htmlWrap('New Sponsorship Received', body),
  });
  console.log(`[Email] Admin sponsorship notification sent to ${ADMIN_EMAIL}`);
}

// ── Booking (event ticketing, account-linked) PDF ─────────────
async function generateBookingPDF(booking) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A5', margin: 40 });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const qrDataUrl = await generateQRDataURL(booking.bookingNumber);
      const qrBuffer  = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

      const W = doc.page.width;
      const eventTitle = booking.event?.title || 'NIA Event';
      const eventDate = booking.event?.startDate ? new Date(booking.event.startDate).toLocaleString('nl-NL') : '';
      const venue = [booking.event?.venueName, booking.event?.venueCity].filter(Boolean).join(', ');

      doc.rect(0, 0, W, 70).fill('#0F1F4B');
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text(eventTitle, 40, 18, { width: W - 80 });
      doc.fontSize(10).font('Helvetica').text([eventDate, venue].filter(Boolean).join(' — '), 40, 40, { width: W - 80 });

      doc.rect(0, 70, W, 5).fill('#E8641A');

      doc.fillColor('#0F1F4B').fontSize(13).font('Helvetica-Bold').text('EVENT TICKET', 40, 95);
      doc.fontSize(20).text(booking.bookingNumber, 40, 114);

      doc.moveTo(40, 150).lineTo(W - 40, 150).strokeColor('#e0e0e0').stroke();

      const details = [
        ['Name',     `${booking.member?.firstName || ''} ${booking.member?.lastName || ''}`.trim()],
        ['Email',    booking.member?.email || ''],
        ['Tickets',  booking.lines.map(l => `${l.quantity}× ${l.name}`).join(', ')],
        ['Total Paid', `€${Number(booking.amount).toFixed(2)}`],
        ['Payment ID', booking.mollie_payment_id],
        ['Date',       booking.paid_at ? new Date(booking.paid_at).toLocaleDateString('nl-NL') : ''],
      ];

      let y = 166;
      doc.fontSize(10);
      for (const [label, value] of details) {
        doc.font('Helvetica').fillColor('#888888').text(label, 40, y);
        doc.font('Helvetica-Bold').fillColor('#0F1F4B').text(value, 160, y);
        y += 24;
      }

      y += 8;
      doc.moveTo(40, y).lineTo(W - 40, y).strokeColor('#e0e0e0').stroke();
      y += 16;

      const qrSize = 130;
      const qrX = (W - qrSize) / 2;
      doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });
      doc.font('Helvetica').fillColor('#888888').fontSize(8)
        .text('Scan at event entry', 0, y + qrSize + 6, { width: W, align: 'center' });

      doc.rect(0, doc.page.height - 40, W, 40).fill('#f5f5f5');
      doc.fillColor('#999999').fontSize(8)
        .text('Please present this ticket (print or digital) at the event entrance.', 40, doc.page.height - 28);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function sendBookingConfirmation(booking) {
  const transporter = createTransporter();
  const eventTitle = booking.event?.title || 'NIA Event';
  const eventDate = booking.event?.startDate ? new Date(booking.event.startDate).toLocaleString('nl-NL') : '';
  const venue = [booking.event?.venueName, booking.event?.venueCity].filter(Boolean).join(', ');

  const ticketLines = booking.lines.map(l =>
    `<div class="detail-row"><span class="label">${l.name} × ${l.quantity}</span><span class="value">€${l.line_total.toFixed(2)}</span></div>`
  ).join('');

  const qrDataUrl = await generateQRDataURL(booking.bookingNumber);
  const qrBuffer  = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  const qrCid     = `qr-${booking.bookingNumber}@nia`;

  const qrBlock = `
    <div class="qr-block">
      <img src="cid:${qrCid}" alt="QR Code" width="160" height="160" style="display:block;margin:0 auto;" />
      <p>Scan at event entry — ${booking.bookingNumber}</p>
    </div>`;

  const pdfBuffer = await generateBookingPDF(booking);

  const body = `
    <p>Dear <strong>${booking.member?.firstName || 'Member'}</strong>,</p>
    <p>🎟️ Your booking for <strong>${eventTitle}</strong> has been confirmed! Your PDF ticket with QR code is attached.</p>
    <div class="highlight">
      <strong>Booking Reference:</strong> ${booking.bookingNumber}<br>
      ${eventDate ? `<strong>When:</strong> ${eventDate}<br>` : ''}
      ${venue ? `<strong>Where:</strong> ${venue}` : ''}
    </div>
    <p><strong>Booking Summary:</strong></p>
    ${ticketLines}
    ${booking.discount_amount > 0 ? `<div class="detail-row"><span class="label">Discount Applied</span><span class="value" style="color:green;">−€${booking.discount_amount.toFixed(2)}</span></div>` : ''}
    <div class="detail-row"><span class="label">Total Paid</span><span class="value amount">€${booking.amount.toFixed(2)}</span></div>
    ${qrBlock}
    <p style="margin-top:20px;">Please present your ticket (PDF or this email) at the event entrance. We look forward to seeing you! 🇮🇳🇳🇱</p>`;

  await transporter.sendMail({
    from: FROM,
    to: booking.member?.email,
    subject: `🎟️ Booking Confirmed — ${eventTitle} (${booking.bookingNumber})`,
    html: htmlWrap('Booking Confirmation', body),
    attachments: [
      { filename: `NIA-Ticket-${booking.bookingNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' },
      { filename: 'ticket-qr.png', content: qrBuffer, contentType: 'image/png', cid: qrCid },
    ],
  });
  console.log(`[Email] Booking confirmation + PDF sent to ${booking.member?.email}`);
}

async function sendRefundConfirmation(booking) {
  const transporter = createTransporter();
  const eventTitle = booking.event?.title || 'NIA Event';
  const body = `
    <p>Dear <strong>${booking.member?.firstName || 'Member'}</strong>,</p>
    <p>Your refund for <strong>${eventTitle}</strong> has been processed.</p>
    <div class="detail-row"><span class="label">Booking Reference</span><span class="value">${booking.bookingNumber}</span></div>
    <div class="detail-row"><span class="label">Refund Amount</span><span class="value amount">€${Number(booking.refund_amount || booking.amount).toFixed(2)}</span></div>
    <div class="detail-row"><span class="label">Date</span><span class="value">${new Date(booking.refunded_at || Date.now()).toLocaleDateString('nl-NL')}</span></div>
    <p style="margin-top:20px; font-size:13px; color:#999;">Please allow a few business days for the refund to appear on your original payment method.</p>`;

  await transporter.sendMail({
    from: FROM,
    to: booking.member?.email,
    subject: `Refund Processed — ${booking.bookingNumber}`,
    html: htmlWrap('Refund Confirmation', body),
  });
  console.log(`[Email] Refund confirmation sent to ${booking.member?.email}`);
}

// ── Membership card PDF (Member Dashboard tiers) ──────────────
async function generateMembershipCardPDF(member, tier) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: [340, 214], margin: 0 }); // credit-card-ish proportions
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width, H = doc.page.height;
      doc.rect(0, 0, W, H).fill('#0F1F4B');
      doc.rect(0, 0, W, 8).fill('#E8641A');

      doc.fillColor('#ffffff').fontSize(13).font('Helvetica-Bold').text('Netherlands India Association', 20, 24);
      doc.fontSize(9).font('Helvetica').fillColor('rgba(255,255,255,0.7)').text('Member Card', 20, 42);

      doc.fontSize(16).font('Helvetica-Bold').fillColor('#ffffff').text(`${member.firstName} ${member.lastName}`, 20, 90);
      doc.fontSize(10).font('Helvetica').fillColor('#E8641A').text((tier?.name || 'Member').toUpperCase(), 20, 112);

      const qrDataUrl = await generateQRDataURL(member.memberId);
      const qrBuffer  = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      doc.image(qrBuffer, W - 90, H - 90, { width: 70, height: 70 });

      doc.fontSize(8).fillColor('rgba(255,255,255,0.6)').text(member.memberId, 20, H - 46);
      doc.text(member.membershipExpiresAt ? `Valid until ${new Date(member.membershipExpiresAt).toLocaleDateString('nl-NL')}` : '', 20, H - 32);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function sendMembershipPaymentConfirmation(payment) {
  const transporter = createTransporter();
  const member = payment.member;
  const tier = payment.membershipTier;
  const actionLabel = payment.type === 'upgrade' ? 'upgraded'
    : payment.type === 'new' ? 'activated'
    : payment.type === 'manual' ? 'assigned'
    : 'renewed';

  const cardBuffer = await generateMembershipCardPDF(member, tier);

  // Manual admin assignments have no Mollie payment behind them, so the
  // amount/payment-ID rows are only rendered when that data actually exists.
  const paymentRows = payment.amount != null ? `
    <div class="detail-row"><span class="label">Amount Paid</span><span class="value amount">€${Number(payment.amount).toFixed(2)}</span></div>
    <div class="detail-row"><span class="label">Payment ID</span><span class="value">${payment.mollie_payment_id}</span></div>` : '';

  const benefitsBlock = tier?.benefits?.length ? `
    <p style="margin-top:20px;"><strong>Your ${tier.name} Membership Benefits:</strong></p>
    <ul style="padding-left:20px; margin:8px 0;">
      ${tier.benefits.map((b) => `<li style="margin-bottom:4px;">${b}</li>`).join('')}
    </ul>` : '';

  const body = `
    <p>Dear <strong>${member.firstName}</strong>,</p>
    <p>🎉 Your NIA membership has been ${actionLabel}! Your digital membership card (with QR code and Membership ID) is attached.</p>
    <div class="highlight">
      <strong>Membership ID:</strong> ${member.memberId}<br>
      <strong>Tier:</strong> ${tier?.name}<br>
      <strong>Valid Until:</strong> ${member.membershipExpiresAt ? new Date(member.membershipExpiresAt).toLocaleDateString('nl-NL') : ''}
    </div>
    ${paymentRows}
    ${benefitsBlock}
    <p style="margin-top:20px;">Thank you for being part of the NIA family!</p>`;

  await transporter.sendMail({
    from: FROM,
    to: member.email,
    subject: `✅ NIA Membership ${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} — ${tier?.name}`,
    html: htmlWrap('Membership Confirmation', body),
    attachments: [{ filename: `NIA-Membership-Card-${member.memberId}.pdf`, content: cardBuffer, contentType: 'application/pdf' }],
  });
  console.log(`[Email] Membership payment confirmation sent to ${member.email}`);
}

// ── Member lifecycle emails ─────────────────────────────────────
async function sendWelcomeEmail(member) {
  const transporter = createTransporter();
  const body = `
    <p>Dear <strong>${member.firstName}</strong>,</p>
    <p>🎉 Welcome to the Netherlands India Association! We're delighted to have you as part of our community.</p>
    <div class="highlight">Explore upcoming events, manage your membership and book tickets any time from your <a href="${process.env.FRONTEND_URL}/dashboard">Member Dashboard</a>.</div>
    <p style="margin-top:20px;">Netherlands & India — Together Since 1950. We look forward to seeing you at our next event!</p>`;

  await transporter.sendMail({
    from: FROM,
    to: member.email,
    subject: `Welcome to the Netherlands India Association!`,
    html: htmlWrap('Welcome to NIA', body),
  });
  console.log(`[Email] Welcome email sent to ${member.email}`);
}

async function sendRenewalReminder(member, tier, daysRemaining) {
  const transporter = createTransporter();
  const body = `
    <p>Dear <strong>${member.firstName}</strong>,</p>
    <p>Your <strong>${tier?.name || 'NIA'}</strong> membership expires in <strong>${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</strong>, on ${new Date(member.membershipExpiresAt).toLocaleDateString('nl-NL')}.</p>
    <p style="text-align:center;"><a class="btn" href="${process.env.FRONTEND_URL}/dashboard/membership">Renew Now</a></p>
    <p style="margin-top:20px; font-size:13px; color:#999;">Renew before your expiry date to keep your membership benefits without interruption.</p>`;

  await transporter.sendMail({
    from: FROM,
    to: member.email,
    subject: `Your NIA membership expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
    html: htmlWrap('Membership Renewal Reminder', body),
  });
  console.log(`[Email] Renewal reminder sent to ${member.email}`);
}

async function sendExpiryNotice(member) {
  const transporter = createTransporter();
  const body = `
    <p>Dear <strong>${member.firstName}</strong>,</p>
    <p>Your NIA membership expired on ${new Date(member.membershipExpiresAt).toLocaleDateString('nl-NL')}. We'd love to have you back!</p>
    <p style="text-align:center;"><a class="btn" href="${process.env.FRONTEND_URL}/dashboard/membership">Renew Your Membership</a></p>`;

  await transporter.sendMail({
    from: FROM,
    to: member.email,
    subject: `Your NIA membership has expired`,
    html: htmlWrap('Membership Expired', body),
  });
  console.log(`[Email] Expiry notice sent to ${member.email}`);
}

async function sendEventReminder(booking) {
  const transporter = createTransporter();
  const event = booking.event;
  const member = booking.member;
  const venue = [event?.venueName, event?.venueCity].filter(Boolean).join(', ');

  const body = `
    <p>Dear <strong>${member?.firstName || 'Member'}</strong>,</p>
    <p>This is a friendly reminder that <strong>${event?.title}</strong> is happening in less than 24 hours!</p>
    <div class="highlight">
      <strong>When:</strong> ${event?.startDate ? new Date(event.startDate).toLocaleString('nl-NL') : ''}<br>
      ${venue ? `<strong>Where:</strong> ${venue}<br>` : ''}
      <strong>Booking Reference:</strong> ${booking.bookingNumber}
    </div>
    <p style="margin-top:20px;">Don't forget to bring your ticket (PDF or QR code from your Member Dashboard). We look forward to seeing you there!</p>`;

  await transporter.sendMail({
    from: FROM,
    to: member?.email,
    subject: `Reminder: ${event?.title} is tomorrow!`,
    html: htmlWrap('Event Reminder', body),
  });
  console.log(`[Email] Event reminder sent to ${member?.email}`);
}

// ── Member account emails ──────────────────────────────────────
async function sendMemberVerificationEmail(member, verifyUrl) {
  const transporter = createTransporter();
  const body = `
    <p>Dear <strong>${member.firstName}</strong>,</p>
    <p>Welcome to the Netherlands India Association! Please verify your email address to activate your member account.</p>
    <p style="text-align:center;">
      <a class="btn" href="${verifyUrl}">Verify My Email</a>
    </p>
    <p style="margin-top:20px; font-size:13px; color:#999;">If the button doesn't work, copy and paste this link into your browser:<br>${verifyUrl}</p>`;

  await transporter.sendMail({
    from: FROM,
    to: member.email,
    subject: `Verify your email — NIA Member Account`,
    html: htmlWrap('Verify Your Email', body),
  });
  console.log(`[Email] Verification email sent to ${member.email}`);
}

async function sendMemberPasswordResetEmail(member, resetUrl) {
  const transporter = createTransporter();
  const body = `
    <p>Dear <strong>${member.firstName}</strong>,</p>
    <p>We received a request to reset your NIA member account password. Click below to choose a new password. This link expires in 1 hour.</p>
    <p style="text-align:center;">
      <a class="btn" href="${resetUrl}">Reset My Password</a>
    </p>
    <p style="margin-top:20px; font-size:13px; color:#999;">If you didn't request this, you can safely ignore this email.</p>`;

  await transporter.sendMail({
    from: FROM,
    to: member.email,
    subject: `Reset your password — NIA`,
    html: htmlWrap('Reset Your Password', body),
  });
  console.log(`[Email] Password reset email sent to ${member.email}`);
}

async function sendAdminPasswordResetEmail(admin, resetUrl) {
  const transporter = createTransporter();
  const body = `
    <p>Dear <strong>${admin.firstName}</strong>,</p>
    <p>We received a request to reset your NIA admin account password. Click below to choose a new password. This link expires in 1 hour.</p>
    <p style="text-align:center;">
      <a class="btn" href="${resetUrl}">Reset My Password</a>
    </p>
    <p style="margin-top:20px; font-size:13px; color:#999;">If you didn't request this, you can safely ignore this email.</p>`;

  await transporter.sendMail({
    from: FROM,
    to: admin.email,
    subject: `Reset your password — NIA Admin`,
    html: htmlWrap('Reset Your Password', body),
  });
  console.log(`[Email] Admin password reset email sent to ${admin.email}`);
}

// ── Post-payment email dispatcher ─────────────────────────────
async function sendPostPaymentEmails(type, record) {
  try {
    switch (type) {
      case 'membership':
        await sendMembershipConfirmation(record);
        await sendMembershipReceipt(record);
        await notifyAdminMembership(record);
        break;
      case 'event_ticket':
        await sendTicketConfirmation(record);
        await sendTicketReceipt(record);
        await notifyAdminTicket(record);
        break;
      case 'donation':
        await sendDonationThankYou(record);
        await sendDonationReceipt(record);
        await notifyAdminDonation(record);
        break;
      case 'sponsorship':
        await sendSponsorshipConfirmation(record);
        await sendSponsorshipReceipt(record);
        await notifyAdminSponsorship(record);
        break;
      case 'booking':
        await sendBookingConfirmation(record);
        break;
      case 'membership_payment':
        await sendMembershipPaymentConfirmation(record);
        break;
    }
  } catch (err) {
    console.error(`[Email] Failed to send post-payment emails for ${type}:`, err.message);
  }
}

module.exports = {
  sendPostPaymentEmails,
  sendMemberVerificationEmail,
  sendMemberPasswordResetEmail,
  sendAdminPasswordResetEmail,
  sendBookingConfirmation,
  sendRefundConfirmation,
  generateBookingPDF,
  generateMembershipCardPDF,
  sendWelcomeEmail,
  sendRenewalReminder,
  sendExpiryNotice,
  sendEventReminder,
  sendTicketConfirmation,
  sendTicketRefundConfirmation,
  sendMembershipPaymentConfirmation,
  generateTicketPDF,
  generateQRDataURL,
};

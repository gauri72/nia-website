const path = require('path');
const PDFDocument = require('pdfkit');
const { generateQRDataURL } = require('./emailService');
const { buildTicketUnits } = require('./ticketUnitService');

const NAVY = '#0b2245';
const NAVY_LIGHT = '#16316e';
const GOLD = '#e8c84a';
const GOLD_DARK = '#c96b00';
const CREAM = '#fffdf7';
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'nia-logo.png');
const LOGO_ASPECT = 85 / 500;

const EVENT_NAME = "India's 80th Independence Day & NIA's 75th Anniversary";
const EVENT_DATE = '15 August 2026';

// One shared PDFDocument, one page per guest — same visual language as
// patronPassService's Patron Pass card. Each page encodes that guest's own
// ticket.units[i].unitNumber, so any one guest's page can be scanned and
// checked in independently of the rest of the party.
async function generateVipPassBatchPDF(ticket) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: [620, 300], margin: 0 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Defensive fallback for a batch that predates the backfill (units
      // empty) — derives the same per-guest breakdown on the fly purely for
      // rendering, without persisting it, so this never silently emits a
      // blank/incomplete PDF. VIP batches store every guest name in
      // attendee_names (no separate "buyer" slot, unlike guest checkout).
      const units = ticket.units?.length
        ? ticket.units
        : buildTicketUnits({
            ticketNumber: ticket.ticketNumber,
            tickets: ticket.tickets,
            names: (ticket.attendee_names || ticket.name).split('\n').filter(Boolean),
          });

      for (let i = 0; i < units.length; i++) {
        const unit = units[i];
        if (i > 0) doc.addPage();
        const qrDataUrl = await generateQRDataURL(unit.unitNumber);
        const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
        drawPassPage(doc, unit.attendeeName || ticket.name, qrBuffer);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function drawPassPage(doc, guestName, qrBuffer) {
  const W = doc.page.width;
  const H = doc.page.height;

  // Outer gold frame, navy card inset within it.
  doc.rect(0, 0, W, H).fill(GOLD);
  const inset = 6;
  doc.rect(inset, inset, W - inset * 2, H - inset * 2).fill(NAVY);

  // Header band with the logo on its own white card.
  const headerH = 54;
  doc.rect(inset, inset, W - inset * 2, headerH).fill(NAVY_LIGHT);

  const logoW = 200;
  const logoH = logoW * LOGO_ASPECT;
  const logoPadX = 10, logoPadY = 8;
  const logoCardW = logoW + logoPadX * 2;
  const logoCardH = logoH + logoPadY * 2;
  const logoCardX = inset + 20;
  const logoCardY = inset + (headerH - logoCardH) / 2;
  doc.roundedRect(logoCardX, logoCardY, logoCardW, logoCardH, 6).fill(CREAM);
  doc.image(LOGO_PATH, logoCardX + logoPadX, logoCardY + logoPadY, { width: logoW, height: logoH });

  // "VIP PASS" badge/ribbon.
  const badgeY = inset + 74;
  doc.roundedRect(inset + 26, badgeY, 130, 30, 15).fill(GOLD);
  doc
    .fillColor(NAVY).font('Helvetica-Bold').fontSize(13)
    .text('VIP PASS', inset + 26, badgeY + 9, { width: 130, align: 'center', characterSpacing: 0.5 });

  // Guest name.
  doc
    .fillColor('#ffffff').font('Helvetica-Bold').fontSize(24)
    .text(guestName, inset + 26, badgeY + 46, { width: 400 });

  // Event statement.
  doc
    .fillColor('rgba(255,255,255,0.85)').font('Helvetica').fontSize(11.5)
    .text('Grants complimentary entry, no ticket required, to', inset + 26, badgeY + 88, { width: 380, lineGap: 3 })
    .text(EVENT_NAME, inset + 26, undefined, { width: 380, lineGap: 3 })
    .text(EVENT_DATE, inset + 26, undefined, { width: 380 });

  // Divider before footer.
  doc
    .moveTo(inset + 26, H - inset - 40).lineTo(W - inset - 190, H - inset - 40)
    .strokeColor('rgba(255,255,255,0.15)').stroke();
  doc
    .fillColor('rgba(255,255,255,0.55)').font('Helvetica').fontSize(8.5)
    .text('Present this pass (screen or print) for scanning at the entrance.', inset + 26, H - inset - 30);

  // QR code, right side, on a cream card so it stays scannable against navy.
  const qrSize = 150;
  const qrPad = 14;
  const qrCardX = W - inset - qrSize - qrPad * 2 - 26;
  const qrCardY = (H - (qrSize + qrPad * 2)) / 2;
  doc.roundedRect(qrCardX, qrCardY, qrSize + qrPad * 2, qrSize + qrPad * 2, 10).fill(CREAM);
  doc.image(qrBuffer, qrCardX + qrPad, qrCardY + qrPad, { width: qrSize, height: qrSize });

  doc
    .fillColor(GOLD_DARK).font('Helvetica-Bold').fontSize(8)
    .text('VIP GUEST', qrCardX, qrCardY + qrSize + qrPad + 4, { width: qrSize + qrPad * 2, align: 'center', characterSpacing: 1 });
}

module.exports = { generateVipPassBatchPDF };

const path = require('path');
const PDFDocument = require('pdfkit');
const { generateQRDataURL } = require('./emailService');

const NAVY = '#0b2245';
const NAVY_LIGHT = '#16316e';
const GOLD = '#e8c84a';
const GOLD_DARK = '#c96b00';
const CREAM = '#fffdf7';
// Real logo has a white background (not transparent in practice), so it sits
// on its own white card rather than directly on the navy header band.
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'nia-logo.png');
const LOGO_ASPECT = 85 / 500;

// A landscape "VIP pass" — the QR encodes the member's own memberId
// (NIA-MBR-xxxxxxxx), the exact same code already used everywhere else in
// the app (member card, admin scan-to-check-in), so scanning this pass at an
// event door works with the existing check-in system unchanged.
async function generatePatronPassPDF(member, tier) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: [620, 300], margin: 0 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width;
      const H = doc.page.height;

      // Outer gold frame, navy card inset within it.
      doc.rect(0, 0, W, H).fill(GOLD);
      const inset = 6;
      doc.rect(inset, inset, W - inset * 2, H - inset * 2).fill(NAVY);

      // Subtle header band, with the real logo on its own white card (the
      // source image has a white background, not transparent, so it needs
      // one rather than sitting directly on the navy band).
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

      // "PATRON MEMBER" badge/ribbon.
      const badgeY = inset + 74;
      doc.roundedRect(inset + 26, badgeY, 190, 30, 15).fill(GOLD);
      doc
        .fillColor(NAVY).font('Helvetica-Bold').fontSize(13)
        .text('PATRON MEMBER', inset + 26, badgeY + 9, { width: 190, align: 'center', characterSpacing: 0.5 });

      // Name + member ID.
      doc
        .fillColor('#ffffff').font('Helvetica-Bold').fontSize(24)
        .text(`${member.firstName} ${member.lastName}`, inset + 26, badgeY + 46, { width: 340 });
      doc
        .fillColor(GOLD).font('Helvetica').fontSize(12)
        .text(member.memberId, inset + 26, badgeY + 78);

      // Benefit statement.
      const expiryText = member.membershipExpiresAt
        ? new Date(member.membershipExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'their membership expiry date';
      doc
        .fillColor('rgba(255,255,255,0.85)').font('Helvetica').fontSize(11.5)
        .text('Grants complimentary entry to all NIA events, no ticket required,', inset + 26, badgeY + 108, { width: 380, lineGap: 3 })
        .text(`valid through ${expiryText}.`, inset + 26, undefined, { width: 380 });

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

      const qrDataUrl = await generateQRDataURL(member.memberId);
      const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      doc.image(qrBuffer, qrCardX + qrPad, qrCardY + qrPad, { width: qrSize, height: qrSize });

      doc
        .fillColor(GOLD_DARK).font('Helvetica-Bold').fontSize(8)
        .text((tier?.name || 'Patron').toUpperCase(), qrCardX, qrCardY + qrSize + qrPad + 4, { width: qrSize + qrPad * 2, align: 'center', characterSpacing: 1 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePatronPassPDF };

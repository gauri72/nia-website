// Shared by every place a Ticket gets created/backfilled — expands a
// TicketLineSchema[] (ticket_type + quantity) into one sub-document per
// attendee/seat, each with its own scannable unitNumber.

// tickets: [{ticket_type, quantity, ...}], names: optional flat array (same
// order as the flattened line items) — undefined/short arrays leave
// attendeeName unset for the remaining units rather than erroring.
function buildTicketUnits({ ticketNumber, tickets, names }) {
  const flatTypes = [];
  for (const line of tickets) {
    for (let i = 0; i < line.quantity; i++) flatTypes.push(line.ticket_type);
  }
  return flatTypes.map((ticketType, i) => ({
    unitNumber: `${ticketNumber}-${i + 1}`,
    ticketType,
    attendeeName: names?.[i]?.trim() || undefined,
  }));
}

// Guest-checkout/bundle convention: the buyer is implicitly attendee #1, and
// `attendeeNames` is a newline-separated textarea of the remaining attendees
// (required client-side whenever more than one ticket is bought). Returns a
// flat name pool in the same order units get zipped against.
function parseAttendeeNamePool(buyerName, attendeeNames) {
  const extra = (attendeeNames || '')
    .split('\n')
    .map((n) => n.trim())
    .filter(Boolean);
  return [buyerName, ...extra];
}

module.exports = { buildTicketUnits, parseAttendeeNamePool };

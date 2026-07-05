const TicketType = require('../../models/TicketType');
const Event = require('../../models/Event');

// ── GET /api/admin/events/:eventId/ticket-types ───────────────────
async function list(req, res, next) {
  try {
    const ticketTypes = await TicketType.find({ event: req.params.eventId }).sort('sortOrder');
    return res.json(ticketTypes);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/events/:eventId/ticket-types ──────────────────
async function create(req, res, next) {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const { name, price, memberPrice, quantityTotal, maxPerOrder, salesStart, salesEnd, membershipDiscount, isActive, sortOrder } = req.body;
    if (!name?.trim() || price === undefined || quantityTotal === undefined) {
      return res.status(400).json({ error: 'name, price and quantityTotal are required' });
    }

    const ticketType = await TicketType.create({
      event: event._id, name: name.trim(), price, memberPrice, quantityTotal,
      maxPerOrder, salesStart, salesEnd, membershipDiscount, isActive, sortOrder,
    });

    return res.status(201).json(ticketType);
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/admin/ticket-types/:id ────────────────────────────────
async function update(req, res, next) {
  try {
    const { name, price, memberPrice, quantityTotal, maxPerOrder, salesStart, salesEnd, membershipDiscount, isActive, sortOrder } = req.body;

    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (price !== undefined) update.price = price;
    if (memberPrice !== undefined) update.memberPrice = memberPrice;
    if (quantityTotal !== undefined) update.quantityTotal = quantityTotal;
    if (maxPerOrder !== undefined) update.maxPerOrder = maxPerOrder;
    if (salesStart !== undefined) update.salesStart = salesStart;
    if (salesEnd !== undefined) update.salesEnd = salesEnd;
    if (membershipDiscount !== undefined) update.membershipDiscount = membershipDiscount;
    if (isActive !== undefined) update.isActive = isActive;
    if (sortOrder !== undefined) update.sortOrder = sortOrder;

    const ticketType = await TicketType.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!ticketType) return res.status(404).json({ error: 'Ticket type not found' });

    return res.json(ticketType);
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/admin/ticket-types/:id ──────────────────────────────
async function remove(req, res, next) {
  try {
    const ticketType = await TicketType.findById(req.params.id);
    if (!ticketType) return res.status(404).json({ error: 'Ticket type not found' });
    if (ticketType.quantitySold > 0) {
      return res.status(409).json({ error: 'Cannot delete: tickets have already been sold for this type. Deactivate it instead.' });
    }
    await ticketType.deleteOne();
    return res.json({ message: 'Ticket type deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };

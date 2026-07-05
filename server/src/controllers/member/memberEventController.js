const Event = require('../../models/Event');
const TicketType = require('../../models/TicketType');

// ── GET /api/events ──────────────────────────────────────────────
// Public: browse published, upcoming events.
async function list(req, res, next) {
  try {
    const { category, search, maxPrice, page = 1, limit = 20 } = req.query;
    const filter = { status: 'published' };
    if (category?.trim()) filter.category = category.trim();
    if (search?.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: re }, { venueCity: re }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const events = await Event.find(filter).sort('startDate').skip((pageNum - 1) * limitNum).limit(limitNum);
    const eventIds = events.map((e) => e._id);
    const ticketTypes = await TicketType.find({ event: { $in: eventIds }, isActive: true });

    const byEvent = {};
    for (const tt of ticketTypes) {
      const key = String(tt.event);
      byEvent[key] = byEvent[key] || [];
      byEvent[key].push(tt);
    }

    let result = events.map((e) => {
      const types = byEvent[String(e._id)] || [];
      const minPrice = types.length ? Math.min(...types.map((t) => t.price)) : null;
      const remaining = types.reduce((sum, t) => sum + Math.max(0, t.quantityTotal - t.quantitySold), 0);
      return { ...e.toObject(), minPrice, isSoldOut: types.length > 0 && remaining <= 0 };
    });

    if (maxPrice) result = result.filter((e) => e.minPrice === null || e.minPrice <= Number(maxPrice));

    return res.json({ events: result, page: pageNum });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/events/:slug ────────────────────────────────────────
async function getBySlug(req, res, next) {
  try {
    const event = await Event.findOne({ slug: req.params.slug, status: 'published' });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const ticketTypes = await TicketType.find({ event: event._id, isActive: true }).sort('sortOrder');
    const ticketTypesWithAvailability = ticketTypes.map((t) => ({
      ...t.toObject(),
      remaining: Math.max(0, t.quantityTotal - t.quantitySold),
    }));

    return res.json({ ...event.toObject(), ticketTypes: ticketTypesWithAvailability });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getBySlug };

const Event = require('../../models/Event');
const TicketType = require('../../models/TicketType');
const Booking = require('../../models/Booking');
const { notifyAllActiveMembers } = require('../../services/notificationService');

function slugify(title) {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

async function uniqueSlug(title, excludeId) {
  const base = slugify(title);
  let slug = base;
  let n = 1;
  while (await Event.findOne({ slug, _id: { $ne: excludeId } })) {
    slug = `${base}-${++n}`;
  }
  return slug;
}

// ── GET /api/admin/events ────────────────────────────────────────
async function list(req, res, next) {
  try {
    const { status, category, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status?.trim()) filter.status = status.trim();
    if (category?.trim()) filter.category = category.trim();
    if (search?.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: re }, { venueName: re }, { venueCity: re }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [events, total] = await Promise.all([
      Event.find(filter).sort('-startDate').skip((pageNum - 1) * limitNum).limit(limitNum),
      Event.countDocuments(filter),
    ]);

    // Attach ticket-type sold/total aggregates for "sold out" / capacity display
    const eventIds = events.map((e) => e._id);
    const ticketTypes = await TicketType.find({ event: { $in: eventIds } });
    const byEvent = {};
    for (const tt of ticketTypes) {
      const key = String(tt.event);
      byEvent[key] = byEvent[key] || { total: 0, sold: 0 };
      byEvent[key].total += tt.quantityTotal;
      byEvent[key].sold += tt.quantitySold;
    }

    const result = events.map((e) => {
      const agg = byEvent[String(e._id)] || { total: 0, sold: 0 };
      const isSoldOut = agg.total > 0 && agg.sold >= agg.total;
      const isPast = e.startDate < new Date();
      let displayStatus = e.status;
      if (e.status === 'published' && isPast) displayStatus = 'past';
      else if (e.status === 'published' && isSoldOut) displayStatus = 'sold-out';
      return { ...e.toObject(), ticketsSold: agg.sold, ticketsTotal: agg.total, displayStatus };
    });

    return res.json({ events: result, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/events/:id ─────────────────────────────────────
async function getById(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const ticketTypes = await TicketType.find({ event: event._id }).sort('sortOrder');
    return res.json({ ...event.toObject(), ticketTypes });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/events ────────────────────────────────────────
async function create(req, res, next) {
  try {
    const { title, description, shortDescription, category, startDate, endDate, timezone, venueName, venueAddress, venueCity, coverImageUrl, galleryImageUrls, capacity, memberDiscountPct, isFeatured } = req.body;

    if (!title?.trim() || !startDate) {
      return res.status(400).json({ error: 'title and startDate are required' });
    }

    const event = await Event.create({
      title: title.trim(),
      slug: await uniqueSlug(title),
      description, shortDescription, category, startDate, endDate, timezone,
      venueName, venueAddress, venueCity, coverImageUrl,
      galleryImageUrls: Array.isArray(galleryImageUrls) ? galleryImageUrls : [],
      capacity, memberDiscountPct, isFeatured,
      createdBy: req.admin.id,
      status: 'draft',
    });

    return res.status(201).json(event);
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/admin/events/:id ───────────────────────────────────
async function update(req, res, next) {
  try {
    const { title, description, shortDescription, category, startDate, endDate, timezone, venueName, venueAddress, venueCity, coverImageUrl, galleryImageUrls, capacity, memberDiscountPct, isFeatured } = req.body;

    const update = {};
    if (title !== undefined) { update.title = title.trim(); update.slug = await uniqueSlug(title, req.params.id); }
    if (description !== undefined) update.description = description;
    if (shortDescription !== undefined) update.shortDescription = shortDescription;
    if (category !== undefined) update.category = category;
    if (startDate !== undefined) update.startDate = startDate;
    if (endDate !== undefined) update.endDate = endDate;
    if (timezone !== undefined) update.timezone = timezone;
    if (venueName !== undefined) update.venueName = venueName;
    if (venueAddress !== undefined) update.venueAddress = venueAddress;
    if (venueCity !== undefined) update.venueCity = venueCity;
    if (coverImageUrl !== undefined) update.coverImageUrl = coverImageUrl;
    if (galleryImageUrls !== undefined) update.galleryImageUrls = galleryImageUrls;
    if (capacity !== undefined) update.capacity = capacity;
    if (memberDiscountPct !== undefined) update.memberDiscountPct = memberDiscountPct;
    if (isFeatured !== undefined) update.isFeatured = isFeatured;

    const event = await Event.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    return res.json(event);
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/admin/events/:id/publish ───────────────────────────
async function publish(req, res, next) {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, { status: 'published', publishedAt: new Date() }, { new: true });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    notifyAllActiveMembers('New Event Announced', `${event.title} — ${new Date(event.startDate).toLocaleDateString()}`, `/dashboard/events/${event.slug}`).catch(() => {});

    return res.json(event);
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/admin/events/:id/unpublish ─────────────────────────
async function unpublish(req, res, next) {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, { status: 'unpublished' }, { new: true });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    return res.json(event);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/events/:id/duplicate ──────────────────────────
async function duplicate(req, res, next) {
  try {
    const original = await Event.findById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Event not found' });

    const copyTitle = `${original.title} (Copy)`;
    const copy = await Event.create({
      title: copyTitle,
      slug: await uniqueSlug(copyTitle),
      description: original.description,
      shortDescription: original.shortDescription,
      category: original.category,
      startDate: original.startDate,
      endDate: original.endDate,
      timezone: original.timezone,
      venueName: original.venueName,
      venueAddress: original.venueAddress,
      venueCity: original.venueCity,
      coverImageUrl: original.coverImageUrl,
      galleryImageUrls: original.galleryImageUrls,
      capacity: original.capacity,
      memberDiscountPct: original.memberDiscountPct,
      createdBy: req.admin.id,
      status: 'draft',
    });

    const originalTicketTypes = await TicketType.find({ event: original._id });
    if (originalTicketTypes.length) {
      await TicketType.insertMany(originalTicketTypes.map((tt) => ({
        event: copy._id, name: tt.name, price: tt.price, memberPrice: tt.memberPrice,
        quantityTotal: tt.quantityTotal, quantitySold: 0, maxPerOrder: tt.maxPerOrder,
        salesStart: tt.salesStart, salesEnd: tt.salesEnd, membershipDiscount: tt.membershipDiscount,
        isActive: tt.isActive, sortOrder: tt.sortOrder,
      })));
    }

    return res.status(201).json(copy);
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/admin/events/:id ──────────────────────────────────
async function remove(req, res, next) {
  try {
    const paidCount = await Booking.countDocuments({ event: req.params.id, status: 'paid' });
    if (paidCount > 0) {
      return res.status(409).json({ error: `Cannot delete: ${paidCount} paid booking(s) exist for this event. Unpublish it instead.` });
    }

    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    await TicketType.deleteMany({ event: req.params.id });

    return res.json({ message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/events/:id/attendees ───────────────────────────
async function attendees(req, res, next) {
  try {
    const bookings = await Booking.find({ event: req.params.id, status: { $ne: 'pending_payment' } })
      .populate('member', 'firstName lastName email memberId')
      .sort('-createdAt');
    return res.json(bookings);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/events/:id/attendees/export ────────────────────
async function attendeesExportCsv(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const bookings = await Booking.find({ event: req.params.id, status: { $ne: 'pending_payment' } })
      .populate('member', 'firstName lastName email');

    const header = ['Booking Reference', 'Name', 'Email', 'Tickets', 'Total Paid', 'Status', 'Booked On'];
    const rows = bookings.map((b) => [
      b.bookingNumber, `${b.member?.firstName || ''} ${b.member?.lastName || ''}`.trim(), b.member?.email || '',
      b.lines.map((l) => `${l.quantity}x ${l.name}`).join('; '), b.amount.toFixed(2), b.status,
      b.createdAt.toISOString().slice(0, 10),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendees-${event.slug}.csv"`);
    return res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, publish, unpublish, duplicate, remove, attendees, attendeesExportCsv };

const EmailTemplate = require('../../models/EmailTemplate');

// ── GET /api/email-templates ────────────────────────────────────
async function list(req, res, next) {
  try {
    const { type, tag, search } = req.query;
    const filter = { isArchived: false };
    if (type?.trim()) filter.type = type.trim();
    if (tag?.trim()) filter.tags = tag.trim();
    if (search?.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: re }, { subject: re }];
    }

    const templates = await EmailTemplate.find(filter).sort('-updatedAt');
    return res.json(templates);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/email-templates/:id ──────────────────────────────────
async function getById(req, res, next) {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    return res.json(template);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/email-templates ─────────────────────────────────────
async function create(req, res, next) {
  try {
    const { name, type, subject, htmlContent, tags, colorScheme, generatedByAI, aiPrompt } = req.body;
    if (!name?.trim() || !type || !subject?.trim() || !htmlContent?.trim()) {
      return res.status(400).json({ error: 'name, type, subject and htmlContent are required' });
    }

    const template = await EmailTemplate.create({
      name: name.trim(), type, subject: subject.trim(), htmlContent,
      tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
      colorScheme, generatedByAI: !!generatedByAI, aiPrompt,
      createdBy: req.admin.id,
    });

    return res.status(201).json(template);
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/email-templates/:id ──────────────────────────────────
async function update(req, res, next) {
  try {
    const { name, type, subject, htmlContent, tags, colorScheme } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (type !== undefined) update.type = type;
    if (subject !== undefined) update.subject = subject.trim();
    if (htmlContent !== undefined) update.htmlContent = htmlContent;
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags.filter(Boolean) : [];
    if (colorScheme !== undefined) update.colorScheme = colorScheme;

    const template = await EmailTemplate.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    return res.json(template);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/email-templates/:id/duplicate ────────────────────────
async function duplicate(req, res, next) {
  try {
    const original = await EmailTemplate.findById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Template not found' });

    const copy = await EmailTemplate.create({
      name: `${original.name} (Copy)`, type: original.type, subject: original.subject,
      htmlContent: original.htmlContent, tags: original.tags, colorScheme: original.colorScheme,
      generatedByAI: original.generatedByAI, aiPrompt: original.aiPrompt, createdBy: req.admin.id,
    });

    return res.status(201).json(copy);
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/email-templates/:id ─────────────────────────────────
async function remove(req, res, next) {
  try {
    const template = await EmailTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    return res.json({ message: 'Template deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, duplicate, remove };

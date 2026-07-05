const { getClient } = require('../config/claude');

const MODEL = 'claude-haiku-4-5';

const SYSTEM_PROMPT = `You are an expert email designer for the Netherlands India Association (NIA), a cultural and community organisation bridging the Netherlands and India.

Generate a fully responsive HTML email template. Requirements:
- Use inline CSS only — no <style> blocks, no external stylesheets, no scripts. Email clients strip both.
- Use a table-based layout for maximum email-client compatibility.
- Maximum width of 600px, centered.
- Follow NIA's brand identity: navy #1a2b5e (headings, primary text, darker variant #0f1f4b for dark surfaces), orange #e8641a (primary CTA buttons, hover #d0561a), green #2d7d3a (secondary/success accents), saffron #ff9933 and gold #e8c84a (premium/festive accents). Use Arial or Helvetica as the font-family (web fonts like Poppins aren't reliably supported by email clients).
- Include a placeholder for the NIA logo at the top of the email: <img src="{{logo_url}}" alt="Netherlands India Association" width="160" style="display:block;">
- Include exactly one clear call-to-action button, styled as a button (padding, background color, rounded corners, white text).
- Include placeholder body text appropriate to the requested template type and prompt.
- Preserve personalization tokens literally if the prompt implies them — e.g. {{first_name}}, {{membership_tier}}, {{event_name}}, {{expiry_date}}, {{booking_reference}} — do not fill them in with example values.
- Always include a footer with the NIA name, a one-line tagline, and this literal unsubscribe link: <a href="{{unsubscribe_url}}" style="color:#888;">Unsubscribe</a>.
- Follow email accessibility best practices: alt text on every image, a clear visual hierarchy, sufficient color contrast, semantic heading sizes.
- Return ONLY the requested JSON — no markdown code fences, no explanation before or after.`;

class AIError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

// ── generateEmailTemplate({ prompt, type, colorScheme }) ──────────
async function generateEmailTemplate({ prompt, type, colorScheme }) {
  const client = getClient();
  if (!client) {
    throw new AIError('AI template generation is not configured. Set ANTHROPIC_API_KEY in the server environment.', 'AI_NOT_CONFIGURED');
  }
  if (!prompt?.trim()) {
    throw new AIError('A prompt is required to generate a template.', 'INVALID_INPUT');
  }

  const colorSchemeNote = {
    dark: 'Use a dark color scheme: navy/near-black backgrounds with light text, orange/gold accents.',
    light: 'Use a light, airy color scheme: white/very-light backgrounds, navy text, orange accents used sparingly.',
    minimal: 'Use a minimal color scheme: mostly white/neutral with a single navy or orange accent color, generous whitespace, no gradients.',
  }[colorScheme] || 'Use the default NIA brand colors (navy, orange, green, saffron/gold) as described above.';

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: `${SYSTEM_PROMPT}\n\nTemplate type requested: ${type || 'general'}.\n${colorSchemeNote}`,
      messages: [{ role: 'user', content: prompt }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              subject: { type: 'string', description: 'A compelling email subject line' },
              html: { type: 'string', description: 'The complete HTML email, inline CSS only' },
            },
            required: ['subject', 'html'],
            additionalProperties: false,
          },
        },
      },
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock) throw new AIError('AI returned no content.', 'AI_MALFORMED_RESPONSE');

    let parsed;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      throw new AIError('AI returned malformed output that could not be parsed.', 'AI_MALFORMED_RESPONSE');
    }

    return { subject: parsed.subject, html: parsed.html };
  } catch (err) {
    if (err instanceof AIError) throw err;
    if (err?.status === 429) throw new AIError('AI template generation is rate-limited. Please try again shortly.', 'AI_RATE_LIMITED');
    throw new AIError(`AI template generation failed: ${err.message}`, 'AI_REQUEST_FAILED');
  }
}

module.exports = { generateEmailTemplate, AIError };

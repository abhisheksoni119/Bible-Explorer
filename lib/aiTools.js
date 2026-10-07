// Server-only AI helpers for the Tools section.
// Each function: normalize input → check cache → call AI on miss → write cache.
// Returns shaped JSON. Throws on AI errors so callers can render a graceful
// fallback. NEVER call from a client component.

import { callOpenRouter } from './generator.js';
import { getCached, setCached, normalizeKey } from './toolCache.js';
import { consume } from './rateLimit.js';

// Per-IP, per-tool quota for AI cost protection. Cache hits do NOT count.
const AI_QUOTA = { max: 12, windowMs: 60 * 60 * 1000 }; // 12 AI calls / IP / hour / tool

function rateLimitError(toolName, clientIp) {
  const r = consume(`${toolName}:${clientIp || 'anon'}`, AI_QUOTA);
  if (r.allowed) return null;
  const minutes = Math.ceil(r.retryAfterSec / 60);
  return { error: `Too many requests from your network. Please try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`, rateLimited: true };
}

const SYSTEM_BASE =
  'You are a careful, devout Christian Bible study assistant. ' +
  'You only use the King James Version (KJV, public domain) for Scripture quotations. ' +
  'You never invent verse references. ' +
  'If you are unsure of an exact reference, you say so rather than fabricate. ' +
  'You write in clear, warm, pastoral English suitable for ordinary readers. ' +
  'You always respond with valid JSON only, no markdown fencing.';

// ─── 1. Verse Generator: topic → { verse, ref, explanation } ──────────────────
export async function generateVerseForTopic(topic, { clientIp } = {}) {
  const key = normalizeKey(topic);
  if (!key || key.length < 2 || key.length > 60) {
    return { error: 'Please enter a topic between 2 and 60 characters.' };
  }
  const cached = await getCached('verse_generator', key);
  if (cached) return { ...cached, cached: true };

  // Cache miss — apply rate limit before paying for an AI call.
  const limited = rateLimitError('verse_generator', clientIp);
  if (limited) return limited;

  const userPrompt =
    `Topic: "${key}"\n\n` +
    `Pick ONE well-known KJV Bible verse that speaks to this topic. ` +
    `Then write a 2–3 sentence pastoral explanation of how the verse applies. ` +
    `Return strictly JSON in the shape: ` +
    `{"verse": "<exact KJV text>", "ref": "<Book Chapter:Verse>", "explanation": "<2-3 sentences>"}`;

  let parsed;
  try {
    const raw = await callOpenRouter(
      [
        { role: 'system', content: SYSTEM_BASE },
        { role: 'user',   content: userPrompt },
      ],
      { json: true, maxTokens: 500 }
    );
    parsed = JSON.parse(raw);
  } catch (e) {
    return { error: 'Could not generate a verse right now. Please try a different topic or try again in a moment.' };
  }

  if (!parsed?.verse || !parsed?.ref || !parsed?.explanation) {
    return { error: 'The model returned an incomplete response. Please try again.' };
  }

  const out = { verse: String(parsed.verse), ref: String(parsed.ref), explanation: String(parsed.explanation) };
  await setCached('verse_generator', key, out);
  return out;
}

// ─── 2. Prayer Generator: situation → { prayer } ─────────────────────────────
export async function generatePrayerForSituation(situation, { clientIp } = {}) {
  const key = normalizeKey(situation);
  if (!key || key.length < 3 || key.length > 200) {
    return { error: 'Please describe the situation in 3 to 200 characters.' };
  }
  const cached = await getCached('prayer_generator', key);
  if (cached) return { ...cached, cached: true };

  const limited = rateLimitError('prayer_generator', clientIp);
  if (limited) return limited;

  const userPrompt =
    `Situation: "${key}"\n\n` +
    `Write a short, heartfelt Christian prayer (4–8 sentences) for this situation. ` +
    `Address God reverently. Reference Scripture themes if natural, but do not quote verses verbatim. ` +
    `End with "In Jesus' name, Amen." ` +
    `Return strictly JSON: {"prayer": "<the prayer text as a single string with line breaks as \\n>"}`;

  let parsed;
  try {
    const raw = await callOpenRouter(
      [
        { role: 'system', content: SYSTEM_BASE },
        { role: 'user',   content: userPrompt },
      ],
      { json: true, maxTokens: 600 }
    );
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'Could not generate a prayer right now. Please try again in a moment.' };
  }

  if (!parsed?.prayer) {
    return { error: 'The model returned an incomplete response. Please try again.' };
  }

  const out = { prayer: String(parsed.prayer) };
  await setCached('prayer_generator', key, out);
  return out;
}

// ─── 3. Chapter Summary: book + chapter → { summary, themes[] } ──────────────
export async function generateChapterSummary(book, chapter, { clientIp } = {}) {
  const key = `${normalizeKey(book)}-${chapter}`;
  const cached = await getCached('chapter_summary', key);
  if (cached) return { ...cached, cached: true };

  const limited = rateLimitError('chapter_summary', clientIp);
  if (limited) return limited;

  const userPrompt =
    `Book: ${book}\nChapter: ${chapter}\n\n` +
    `Write a faithful 4–6 sentence summary of this Bible chapter. ` +
    `Then list 3–5 key themes as short phrases. ` +
    `Return strictly JSON: {"summary": "<4-6 sentences>", "themes": ["theme one", "theme two", ...]}`;

  let parsed;
  try {
    const raw = await callOpenRouter(
      [
        { role: 'system', content: SYSTEM_BASE },
        { role: 'user',   content: userPrompt },
      ],
      { json: true, maxTokens: 700 }
    );
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'Could not generate a summary right now. Please try again in a moment.' };
  }

  if (!parsed?.summary || !Array.isArray(parsed?.themes)) {
    return { error: 'The model returned an incomplete response. Please try again.' };
  }

  const out = {
    summary: String(parsed.summary),
    themes: parsed.themes.slice(0, 6).map(String),
  };
  await setCached('chapter_summary', key, out);
  return out;
}
// step0-rebuild-marker

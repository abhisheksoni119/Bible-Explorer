// Bible reference extraction + verification against bible-api.com (KJV).
// Honest by design: any reference that cannot be verified is reported as
// unverified — nothing is silently assumed correct.

const REF_RE = /(?:^|[\s(])((?:[1-3]\s)?[A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+){0,2}\s\d+:\d+(?:[–\-]\d+)?)(?=[\s).,!?;:]|$)/g;

const MAX_REFS = 25;
const TIMEOUT_MS = 8000;

export function extractReferences(html) {
  const text = String(html || '');
  const out = [];
  let m;
  REF_RE.lastIndex = 0;
  while ((m = REF_RE.exec(text)) !== null) {
    const ref = m[1].trim();
    if (!out.includes(ref)) out.push(ref);
    if (out.length >= MAX_REFS) break;
  }
  return out;
}

function refToApiPath(ref) {
  // "Romans 8:28"            -> romans+8:28
  // "1 Corinthians 13:4-7"   -> 1+corinthians+13:4  (verify first verse of range)
  const first = ref.split(/[–\-]/)[0].trim();
  return encodeURIComponent(first.replace(/\s+/g, '+'));
}

async function verifyOne(ref) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://bible-api.com/${refToApiPath(ref)}?translation=kjv`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { ref, verified: false, reason: res.status === 400 ? 'not found in KJV source' : `source error (${res.status})` };
    }
    const data = await res.json();
    const verses = Array.isArray(data.verses) ? data.verses : [];
    const text = verses.length
      ? verses.map(v => v.text).join(' ').replace(/\s+/g, ' ').trim()
      : String(data.text || '').replace(/\s+/g, ' ').trim();
    return { ref, verified: Boolean(text), kjvText: text.slice(0, 300) };
  } catch (e) {
    clearTimeout(timer);
    return { ref, verified: false, reason: e.name === 'AbortError' ? 'source timeout' : 'source unreachable' };
  }
}

// Verifies every unique Bible reference found in an HTML article body.
// Returns { checked, verified, unverified, details }.
export async function verifyReferencesInHtml(html) {
  const refs = extractReferences(html);
  if (refs.length === 0) {
    return { checked: 0, verified: 0, unverified: [], details: [] };
  }
  const details = [];
  for (const ref of refs) {
    details.push(await verifyOne(ref));
  }
  const unverified = details.filter(d => !d.verified).map(d => d.ref + (d.reason ? ` (${d.reason})` : ''));
  return {
    checked: details.length,
    verified: details.length - unverified.length,
    unverified,
    details: details.map(d => ({ ref: d.ref, verified: d.verified })),
  };
}

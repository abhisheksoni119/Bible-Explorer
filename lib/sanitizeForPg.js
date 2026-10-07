// Strip characters that PostgreSQL refuses to store in text/JSONB columns.
//
// PostgreSQL throws  ERROR: unsupported Unicode escape sequence  on:
//   - NUL bytes (\u0000) anywhere in text or jsonb
//   - lone surrogates (e.g. \uD800 without a paired low surrogate)
//
// This helper walks strings, arrays, and plain objects and removes those
// characters before insert. C0 control bytes other than \t \n \r are also
// stripped because they tend to corrupt downstream HTML rendering.

const C0_BUT_KEEP = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const LONE_HIGH_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g;
const LONE_LOW_SURROGATE  = /(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function sanitizeStringForPg(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(C0_BUT_KEEP, '')
    .replace(LONE_HIGH_SURROGATE, '')
    .replace(LONE_LOW_SURROGATE, '$1');
}

export function sanitizeForPg(value) {
  if (value == null) return value;
  if (typeof value === 'string') return sanitizeStringForPg(value);
  if (Array.isArray(value)) return value.map(sanitizeForPg);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeForPg(v);
    return out;
  }
  return value;
}
// step0-rebuild-marker

// Lightweight unit tests for pure utilities (offline except one live KJV check).
// Usage: node scripts/test-unit.mjs
import assert from 'node:assert';
import { sanitizeForPg, sanitizeStringForPg } from '../lib/sanitizeForPg.js';
import { extractReferences, verifyReferencesInHtml } from '../lib/verseValidation.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS | ' + name); }
  catch (e) { failed++; console.log('FAIL | ' + name + ' | ' + e.message); }
}
async function testAsync(name, fn) {
  try { await fn(); passed++; console.log('PASS | ' + name); }
  catch (e) { failed++; console.log('FAIL | ' + name + ' | ' + e.message); }
}

// sanitizeForPg
test('sanitizeForPg strips NUL bytes', () => {
  assert.equal(sanitizeStringForPg('abc\u0000def'), 'abcdef');
});
test('sanitizeForPg strips lone surrogates', () => {
  assert.equal(sanitizeStringForPg('a\uD800b'), 'ab');
});
test('sanitizeForPg walks objects and arrays', () => {
  const out = sanitizeForPg({ a: ['x\u0000'], b: { c: 'y\u0000' } });
  assert.equal(out.a[0], 'x');
  assert.equal(out.b.c, 'y');
});

// verseValidation — extraction (offline)
test('extractReferences finds parenthesised and bare refs', () => {
  const refs = extractReferences('<blockquote>"Text" (John 3:16)</blockquote><p>See Romans 8:28 and 1 Corinthians 13:4-7.</p>');
  assert.deepEqual(refs, ['John 3:16', 'Romans 8:28', '1 Corinthians 13:4-7']);
});
test('extractReferences caps at 25 refs', () => {
  const html = Array.from({ length: 40 }, (_, i) => `(Romans 8:${(i % 50) + 1})`).join(' ');
  assert.equal(extractReferences(html).length, 25);
});

// Bible-grounding behaviour (one live KJV check + one fabricated ref)
await testAsync('verifyReferencesInHtml verifies a real KJV ref', async () => {
  const r = await verifyReferencesInHtml('<p>(John 3:16)</p>');
  assert.equal(r.checked, 1);
  assert.equal(r.verified, 1);
});
await testAsync('verifyReferencesInHtml flags a fabricated ref', async () => {
  const r = await verifyReferencesInHtml('<p>(Foo Bar 99:2)</p>');
  assert.equal(r.verified, 0);
  assert.ok(r.unverified[0].includes('Foo Bar 99:2'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

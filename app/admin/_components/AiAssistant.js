'use client';

import { useState, useRef, useEffect } from 'react';

// UI-ONLY module. Talks to the existing, frozen
// POST /api/admin/ai-assistant/research contract exactly as-is —
// no request/response shape changes, no engine changes.

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
];

const CATEGORY_LABELS = {
  questions: 'Questions',
  guides: 'Guides',
  topics: 'Topics',
  'bible-verses': 'Bible Verses',
  'bible-characters': 'Bible Characters',
};
const categoryLabel = (c) => CATEGORY_LABELS[c] || c || '';

const LANGUAGE_LABELS = { en: 'English', de: 'German', es: 'Spanish', fr: 'French', pt: 'Portuguese', it: 'Italian' };
const languageLabel = (l) => (l ? (LANGUAGE_LABELS[l.toLowerCase()] || l.toUpperCase()) : '');

// The API runs the whole pipeline server-side in a single request — there is
// no step-by-step progress feed (that would require changing the frozen API
// contract, which is out of scope here). These labels + durations are a
// client-side-only approximation of pipeline pacing, purely for perceived
// progress while the one request is in flight. The last real step
// ("Saving to Database") holds until the response actually arrives; the UI
// never claims a step finished before the request resolves.
const STEPS = [
  { key: 'validating',  label: 'Validating Input',       ms: 500 },
  { key: 'research',    label: 'Researching',             ms: 4200 },
  { key: 'keywords',    label: 'Discovering Keywords',    ms: 900 },
  { key: 'intent',      label: 'Detecting Intent',        ms: 3200 },
  { key: 'topic',       label: 'Generating Topic',        ms: 3600 },
  { key: 'category',    label: 'Selecting Category',      ms: 3000 },
  { key: 'slug',        label: 'Generating Slug',         ms: 600 },
  { key: 'duplicates',  label: 'Checking Duplicates',     ms: 900 },
  { key: 'saving',      label: 'Saving to Database',      ms: 999999 }, // holds here until response arrives
  { key: 'completed',   label: 'Completed',               ms: 0 },
];
const LAST_HOLD_INDEX = STEPS.length - 2; // "Saving to Database" — never auto-advances past this

// Maps whatever the API returned into a short, non-technical sentence.
// Never surfaces error.code, raw response bodies, or stack traces.
function friendlyErrorMessage(httpStatus, code) {
  if (code === 'VALIDATION_ERROR') return "That seed keyword didn't pass validation — try rephrasing it.";
  if (code === 'OPENROUTER_ERROR') return 'The AI service is temporarily unavailable. Please try again in a moment.';
  if (code === 'SUPABASE_ERROR' || code === 'CONFIGURATION_ERROR') return 'Something went wrong saving this topic. Please try again.';
  if (httpStatus === 0) return "Couldn't reach the server. Check your connection and try again.";
  return 'Something went wrong. Please try again.';
}

const S = {
  card:       { background: '#fff', border: '1px solid #e8dfc8', borderRadius: '0.875rem', padding: '1.5rem', marginBottom: '1rem' },
  label:      { display: 'block', fontWeight: '600', color: '#1e2d4a', marginBottom: '0.35rem', fontSize: '0.85rem' },
  input:      { width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #d4c5a9', borderRadius: '0.5rem', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#000' },
  btnPrimary: { background: '#1e2d4a', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.65rem 1.5rem', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost:   { background: 'transparent', color: '#1e2d4a', border: '1px solid #d4c5a9', borderRadius: '0.5rem', padding: '0.6rem 1.4rem', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' },
  btnGold:    { background: '#1e2d4a', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.4rem', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block' },
  errBox:     { background: '#fff0f0', border: '1px solid #f5c6c6', color: '#7b2020', borderRadius: '0.5rem', padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.9rem' },
  successBanner: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.25rem' },
  duplicateBanner: { background: '#fffbeb', border: '1px solid #fde68a', color: '#854d0e', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.25rem' },
  metaBox:    { background: '#fff', borderRadius: '0.5rem', padding: '0.75rem 1rem', border: '1px solid rgba(0,0,0,0.06)' },
  metaLabel:  { margin: '0 0 0.25rem', fontSize: '0.72rem', fontWeight: '700', color: '#8b7355', textTransform: 'uppercase' },
  metaVal:    { margin: 0, fontSize: '0.9rem', color: '#1e2d4a' },
  badge:      { display: 'inline-block', padding: '0.15rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '700', background: '#e8f4fd', color: '#1565c0' },
};

export default function AiAssistant() {
  const [language,  setLanguage]  = useState('en');
  const [seedQuery, setSeedQuery] = useState('');

  const [running,   setRunning]   = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error,     setError]     = useState('');
  const [result,    setResult]    = useState(null); // { status: 'proposed'|'inserted'|'duplicate', topic?, candidate, duplicate? }
  const [approving, setApproving]  = useState(false);

  const timeoutRef = useRef(null);

  // Advances stepIndex through STEPS on its own pacing while `running` is
  // true, holding at "Saving to Database" (LAST_HOLD_INDEX) until the
  // request actually resolves — see STEPS comment above.
  useEffect(() => {
    if (!running) return undefined;

    let cancelled = false;
    let i = 0;
    setStepIndex(0);

    function advance() {
      if (cancelled || i >= LAST_HOLD_INDEX) return;
      timeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        i += 1;
        setStepIndex(i);
        advance();
      }, STEPS[i].ms);
    }
    advance();

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [running]);

  function reset() {
    setResult(null); setError(''); setSeedQuery(''); setStepIndex(0);
  }

  async function handleResearch(e) {
    e.preventDefault();
    if (!seedQuery.trim()) { setError('Seed keyword is required.'); return; }
    setError(''); setResult(null); setRunning(true);

    try {
      const res = await fetch('/api/admin/ai-assistant/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedQuery: seedQuery.trim(), language }),
      });

      let data = {};
      try { data = await res.json(); } catch { /* ignore unparsable body, handled below */ }

      if (res.status === 409) {
        setStepIndex(STEPS.length - 1);
        setResult({ status: 'duplicate', candidate: data.candidate, duplicate: data.duplicate });
        return;
      }
      if (!res.ok) {
        console.error('[AiAssistant] research failed:', data); // dev console only — never rendered
        setError(friendlyErrorMessage(res.status, data.code));
        return;
      }

      setStepIndex(STEPS.length - 1);
      // Approval-first: research returns a PROPOSAL. Nothing is inserted
      // until the user clicks Approve (handleApprove below).
      setResult({ status: 'proposed', candidate: data.candidate, evidenceNote: data.evidenceNote });
    } catch (err) {
      console.error('[AiAssistant] network error:', err); // dev console only — never rendered
      setError(friendlyErrorMessage(0, null));
    } finally {
      setRunning(false);
    }
  }

  async function handleApprove() {
    if (!result?.candidate) return;
    setApproving(true); setError('');
    try {
      const res = await fetch('/api/admin/ai-assistant/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate: result.candidate }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setResult({ status: 'duplicate', candidate: result.candidate, duplicate: data.duplicate });
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Approval failed — the topic was not added.');
        return;
      }
      setResult({ status: 'inserted', topic: data.topic, candidate: result.candidate });
    } catch {
      setError(friendlyErrorMessage(0, null));
    } finally {
      setApproving(false);
    }
  }

  const showForm = !running && !result;

  return (
    <div>
      {showForm && (
        <div style={S.card}>
          <h2 style={{ fontFamily: 'Georgia,serif', margin: '0 0 0.35rem', color: '#1e2d4a', fontSize: '1.2rem' }}>
            AI Database Assistant
          </h2>
          <p style={{ margin: '0 0 1.25rem', color: '#8b7355', fontSize: '0.85rem' }}>
            Runs research → keyword discovery → intent detection → topic generation →
            category selection → slug generation → duplicate check → insert, in one pass.
            Does not write or touch articles — topics only.
          </p>

          <form onSubmit={handleResearch}>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={S.label}>Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} style={S.input}>
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Seed Keyword</label>
                <input
                  type="text" value={seedQuery} onChange={e => setSeedQuery(e.target.value)}
                  placeholder="e.g. forgiveness, David and Goliath, how to pray"
                  style={S.input}
                />
              </div>
            </div>

            {error && <div style={S.errBox}>{error}</div>}

            <button type="submit" style={S.btnPrimary}>✦ Research</button>
          </form>
        </div>
      )}

      {/* ── Progress ── */}
      {running && (
        <div style={S.card}>
          <p style={{ margin: '0 0 1.25rem', fontWeight: '700', color: '#1e2d4a' }}>
            Researching “{seedQuery}”…
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {STEPS.slice(0, -1).map((step, i) => {
              const state = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'pending';
              return (
                <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{
                    width: '1.35rem', height: '1.35rem', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: '700',
                    background: state === 'done' ? '#1e2d4a' : state === 'active' ? '#fff3cd' : '#f0ece4',
                    color:      state === 'done' ? '#fff'    : state === 'active' ? '#856404' : '#b8a07a',
                    border:     state === 'active' ? '1px solid #ffc107' : 'none',
                  }}>
                    {state === 'done' ? '✓' : state === 'active' ? '…' : ''}
                  </span>
                  <span style={{
                    fontSize: '0.9rem',
                    color: state === 'pending' ? '#b8a07a' : '#1e2d4a',
                    fontWeight: state === 'active' ? '700' : '400',
                  }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Proposal screen (approval gate — nothing saved yet) ── */}
      {result?.status === 'proposed' && !running && (
        <div style={{ ...S.card, border: '1px solid #fde68a', background: '#fffbeb' }}>
          <p style={{ margin: '0 0 0.4rem', fontWeight: '700', fontSize: '1.05rem', color: '#854d0e' }}>
            ✦ Proposed topic — nothing is saved yet
          </p>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#6b6b6b' }}>
            Review the researched suggestion below, then Approve to add it to your Topics, or Discard.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={S.metaBox}>
              <p style={S.metaLabel}>Topic Name</p>
              <p style={S.metaVal}>{result.candidate?.name}</p>
            </div>
            <div style={S.metaBox}>
              <p style={S.metaLabel}>Category</p>
              <p style={S.metaVal}><span style={S.badge}>{categoryLabel(result.candidate?.category)}</span></p>
            </div>
            <div style={S.metaBox}>
              <p style={S.metaLabel}>Suggested Slug</p>
              <p style={{ ...S.metaVal, fontFamily: 'monospace', fontSize: '0.8rem' }}>{result.candidate?.slug}</p>
            </div>
            <div style={S.metaBox}>
              <p style={S.metaLabel}>Detected Intent</p>
              <p style={S.metaVal}>{result.candidate?.intent?.type || '—'}</p>
            </div>
          </div>

          {result.candidate?.reasoning && (
            <div style={{ ...S.metaBox, marginBottom: '1rem' }}>
              <p style={S.metaLabel}>Why this topic (AI reasoning)</p>
              <p style={{ ...S.metaVal, fontSize: '0.85rem' }}>{result.candidate.reasoning}</p>
            </div>
          )}

          {result.candidate?.keywords?.length > 0 && (
            <div style={{ ...S.metaBox, marginBottom: '1rem' }}>
              <p style={S.metaLabel}>Related keywords (AI-inferred)</p>
              <p style={{ ...S.metaVal, fontSize: '0.85rem' }}>{result.candidate.keywords.join(', ')}</p>
            </div>
          )}

          <p style={{ margin: '0 0 1.25rem', fontSize: '0.78rem', color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '0.4rem', padding: '0.5rem 0.75rem' }}>
            ⚠ Evidence note: {result.evidenceNote || 'This suggestion is AI/semantic-based, not verified search demand. Any volume/difficulty figures are AI estimates.'}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={reset} style={S.btnGhost}>Discard</button>
            <button
              onClick={handleApprove}
              disabled={approving}
              style={{ ...S.btnGold, opacity: approving ? 0.6 : 1 }}
            >
              {approving ? 'Approving…' : '✓ Approve & Add Topic'}
            </button>
          </div>
        </div>
      )}

      {/* ── Success screen ── */}
      {result?.status === 'inserted' && !running && (
        <div style={S.successBanner}>
          <p style={{ margin: '0 0 1rem', fontWeight: '700', fontSize: '1.05rem' }}>✓ Topic saved successfully</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={S.metaBox}>
              <p style={S.metaLabel}>✓ Topic Name</p>
              <p style={S.metaVal}>{result.topic?.name}</p>
            </div>
            <div style={S.metaBox}>
              <p style={S.metaLabel}>✓ Category</p>
              <p style={S.metaVal}><span style={S.badge}>{categoryLabel(result.topic?.category)}</span></p>
            </div>
            <div style={S.metaBox}>
              <p style={S.metaLabel}>✓ Slug</p>
              <p style={{ ...S.metaVal, fontFamily: 'monospace', fontSize: '0.8rem' }}>{result.topic?.slug}</p>
            </div>
            <div style={S.metaBox}>
              <p style={S.metaLabel}>✓ Language</p>
              <p style={S.metaVal}>{languageLabel(result.topic?.language)}</p>
            </div>
            <div style={S.metaBox}>
              <p style={S.metaLabel}>✓ Database Status</p>
              <p style={S.metaVal}>Saved to Topics</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={reset} style={S.btnGhost}>Research Another</button>
            <a href="/admin/#topics" style={S.btnGold}>Go to Topics</a>
          </div>
        </div>
      )}

      {/* ── Duplicate screen ── */}
      {result?.status === 'duplicate' && !running && (
        <div style={S.duplicateBanner}>
          <p style={{ margin: '0 0 0.4rem', fontWeight: '700', fontSize: '1.05rem' }}>This topic already exists</p>
          <p style={{ margin: '0 0 1rem', fontSize: '0.88rem' }}>
            No changes were made — a matching topic is already in the database.
          </p>

          {result.duplicate?.matches?.[0] && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={S.metaBox}>
                <p style={S.metaLabel}>Existing Topic Name</p>
                <p style={S.metaVal}>{result.duplicate.matches[0].name}</p>
              </div>
              <div style={S.metaBox}>
                <p style={S.metaLabel}>Existing Category</p>
                <p style={S.metaVal}><span style={S.badge}>{categoryLabel(result.duplicate.matches[0].category)}</span></p>
              </div>
              <div style={S.metaBox}>
                <p style={S.metaLabel}>Existing Slug</p>
                <p style={{ ...S.metaVal, fontFamily: 'monospace', fontSize: '0.8rem' }}>{result.duplicate.matches[0].slug || '—'}</p>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href="/admin/#topics" style={S.btnGold}>Open in Topics</a>
            <button onClick={reset} style={S.btnGhost}>Research Another</button>
          </div>
        </div>
      )}
    </div>
  );
}
// step0-rebuild-marker

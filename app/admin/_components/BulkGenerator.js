'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { friendlyDuplicateCopy } from '../../../lib/duplicateCopy';

const CATEGORIES = [
  { value: 'questions',        label: 'Questions' },
  { value: 'topics',           label: 'Topics' },
  { value: 'guides',           label: 'Guides' },
  { value: 'bible-verses',     label: 'Bible Verses' },
  { value: 'bible-characters', label: 'Bible Characters' },
];

const S = {
  card:  { background: '#fff', border: '1px solid #e8dfc8', borderRadius: '1rem', padding: '2rem' },
  label: { display: 'block', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.4rem', fontSize: '0.9rem' },
  input: { width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #d4c5a9', borderRadius: '0.5rem', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#000' },
  btn:   (variant = 'primary', disabled = false) => ({
    backgroundColor: variant === 'primary' ? '#1e2d4a' : '#f5f0e8',
    color:           variant === 'primary' ? 'white'   : '#5a4a35',
    border:          variant === 'primary' ? 'none'    : '1px solid #d4c5a9',
    borderRadius: '0.5rem', padding: '0.7rem 1.5rem', fontSize: '0.95rem', fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: disabled ? 0.65 : 1,
  }),
  badge: (s) => ({
    display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600',
    background: s === 'saved'   ? '#dcf5e7' : s === 'skipped' ? '#fff3cd' : '#f5f0e8',
    color:      s === 'saved'   ? '#1b5e20' : s === 'skipped' ? '#856404' : '#8b7355',
  }),
};

const CATEGORY_LABELS = {
  questions: 'Questions', guides: 'Guides', topics: 'Topics',
  'bible-verses': 'Bible Verses', 'bible-characters': 'Bible Characters',
};
const LANGUAGE_LABELS = { en: 'English', de: 'German', es: 'Spanish', fr: 'French', pt: 'Portuguese', it: 'Italian' };
const categoryLabel = c => CATEGORY_LABELS[c] || c || 'Article';
const languageLabel = l => (l ? (LANGUAGE_LABELS[l.toLowerCase()] || l.toUpperCase()) : '');

export default function BulkGenerator({ onSaved }) {
  const [category,        setCategory]        = useState('questions');
  const [count,           setCount]           = useState(5);
  const [includeChildren, setIncludeChildren] = useState(false);
  const [childCount,      setChildCount]      = useState(3);
  const [status,          setStatus]          = useState('idle'); // idle | generating | done
  const [progress,        setProgress]        = useState({ current: 0, total: 0, topic: '' });
  const [log,             setLog]             = useState([]);
  const [summary,         setSummary]         = useState(null);
  const [error,           setError]           = useState('');
  const [counts,          setCounts]          = useState(null);
  const [countsLoading,   setCountsLoading]   = useState(true);
  const [countsError,     setCountsError]     = useState(false);
  const readerRef = useRef(null);

  const loadCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const r = await fetch('/api/admin/topics/counts', { cache: 'no-store' });
      if (!r.ok) throw new Error(`counts HTTP ${r.status}`);
      const data = await r.json();
      setCounts(data);
      setCountsError(false);
    } catch {
      setCounts(null);
      setCountsError(true);
    } finally {
      setCountsLoading(false);
    }
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  // Simple breakdown: a topic is either PUBLISHED or "needs generating".
  // Drafts are auto-replaced on the next generation, so they don't matter here.
  const cat               = counts?.categories?.[category] || null;
  const totalForCategory  = cat?.total ?? null;
  const publishedCount    = cat?.published ?? null;
  const missingCount      = cat?.missing ?? null;
  const isAllPublished    = cat ? cat.published === cat.total && cat.total > 0 : false;
  const isOutOfTopics     = isAllPublished;

  function reset() {
    setStatus('idle');
    setProgress({ current: 0, total: 0, topic: '' });
    setLog([]);
    setSummary(null);
    setError('');
  }

  async function generate() {
    reset();
    setStatus('generating');

    try {
      const res = await fetch('/api/admin/bulk-generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          category,
          count,
          saveAsDraft: true,
          includeChildren,
          childCount: includeChildren ? childCount : 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        if (res.status === 409) {
          setLog([{
            kind: 'skipped',
            title: err.existingArticle?.title || 'Already covered',
            reason: friendlyDuplicateCopy({ code: err.code, fallback: err.error }),
            existingArticle: err.existingArticle || null,
            n: 1, total: 1,
          }]);
        } else {
          setError(err.error ?? 'Bulk generation failed.');
        }
        setStatus('idle');
        return;
      }

      const reader  = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const chunk of lines) {
          const line = chunk.replace(/^data: /, '').trim();
          if (!line) continue;
          let event;
          try { event = JSON.parse(line); } catch { continue; }

          if (event.type === 'start') {
            setProgress({ current: 0, total: event.total, topic: '' });
          } else if (event.type === 'progress') {
            setProgress(p => ({ ...p, current: event.current, total: event.total, topic: event.topic }));
          } else if (event.type === 'saved') {
            setLog(prev => [...prev, {
              kind: 'saved',
              title: event.title,
              slug: event.slug,
              n: event.current,
              total: event.total,
              isChild: event.kind === 'child',
              parentTitle: event.parentTitle || null,
            }]);
            setProgress(p => ({ ...p, current: event.current }));
          } else if (event.type === 'skipped') {
            setLog(prev => [...prev, {
              kind: 'skipped',
              title: event.topic,
              reason: friendlyDuplicateCopy({ code: event.code, fallback: event.reason }),
              existingArticle: event.existingArticle || null,
              n: event.current,
              total: event.total,
              isChild: event.kind === 'child',
              parentTitle: event.parentTitle || null,
            }]);
            setProgress(p => ({ ...p, current: event.current }));
          } else if (event.type === 'done') {
            setSummary({
              generated:      event.generated,
              skipped:        event.skipped,
              childGenerated: event.childGenerated || 0,
              childSkipped:   event.childSkipped || 0,
            });
            setStatus('done');
            // refresh per-category availability so the UI reflects new state
            loadCounts();
            onSaved?.();
          } else if (event.type === 'error') {
            const friendly = event.code
              ? friendlyDuplicateCopy({ code: event.code, fallback: event.message })
              : (event.message || 'Bulk generation failed.');
            setError(friendly);
            setStatus('idle');
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        setStatus('idle');
      }
    }
  }

  const isGenerating = status === 'generating';
  const isDone       = status === 'done';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Config card ── */}
      <div style={S.card}>
        <p style={{ margin: '0 0 1.5rem', color: '#6b6b6b', fontSize: '0.9rem' }}>
          Pick a category and how many articles to generate. Articles save as drafts — review and publish them from the Dashboard tab.
          Only <strong>published</strong> articles are protected; any earlier drafts for the same topic are replaced automatically.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={S.label}>Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={S.input}
              disabled={isGenerating}
            >
              {CATEGORIES.map(c => {
                const cc = counts?.categories?.[c.value];
                if (!cc) return <option key={c.value} value={c.value}>{c.label}</option>;
                const suffix = cc.published === cc.total && cc.total > 0
                  ? `  — ✓ all ${cc.total} published`
                  : `  — ${cc.published}/${cc.total} published, ${cc.missing} to generate`;
                return <option key={c.value} value={c.value}>{c.label}{suffix}</option>;
              })}
            </select>
            {!countsLoading && cat && (
              <p style={{ margin: '0.45rem 0 0', fontSize: '0.8rem', color: '#5a4a35', lineHeight: 1.45 }}>
                <strong style={{ color: '#1b5e20' }}>{publishedCount} published</strong>
                {' · '}
                <strong>{missingCount} to generate</strong>
                {' · '}
                <span style={{ color: '#6b6b6b' }}>({totalForCategory} total topics)</span>
              </p>
            )}
            {countsError && (
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#8b7355' }}>
                Couldn’t load topic counts — you can still try generating.
              </p>
            )}
          </div>
          <div>
            <label style={S.label}>Number of articles (1–20)</label>
            <input
              type="number"
              value={count}
              onChange={e => setCount(Math.min(20, Math.max(1, Number(e.target.value))))}
              min={1} max={20}
              style={S.input}
              disabled={isGenerating}
            />
          </div>
        </div>

        {/* ── Optional child topic generation ── */}
        <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', background: '#fafaf3', borderRadius: '0.6rem', border: '1px solid #ece5d0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: isGenerating ? 'not-allowed' : 'pointer', fontSize: '0.9rem', color: '#1e2d4a', fontWeight: '600' }}>
            <input
              type="checkbox"
              checked={includeChildren}
              onChange={e => setIncludeChildren(e.target.checked)}
              disabled={isGenerating}
              style={{ width: '16px', height: '16px', cursor: isGenerating ? 'not-allowed' : 'pointer' }}
            />
            Include Child Topics
          </label>
          {includeChildren && (
            <div style={{ marginTop: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.85rem', color: '#5a4a35', fontWeight: '600' }}>How many child pages per parent?</label>
              <select
                value={childCount}
                onChange={e => setChildCount(Number(e.target.value))}
                style={{ ...S.input, width: 'auto', minWidth: '90px' }}
                disabled={isGenerating}
              >
                <option value={0}>0</option>
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
            </div>
          )}
          {includeChildren && (
            <p style={{ margin: '0.55rem 0 0', fontSize: '0.78rem', color: '#8b7355', lineHeight: 1.5 }}>
              For each parent topic that gets generated, also generate up to <strong>{childCount}</strong> of its child topics.
              Children that already have an article are skipped automatically. Children don't count toward your number above.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={generate}
            disabled={isGenerating || isOutOfTopics}
            title={isOutOfTopics ? 'Every topic in this category is already published' : ''}
            style={S.btn('primary', isGenerating || isOutOfTopics)}
          >
            {isGenerating
              ? `⟳ Generating… (${progress.current}/${progress.total || count})`
              : isAllPublished
                ? '✓ All articles published'
                : `✦ Generate ${count} Article${count !== 1 ? 's' : ''}`}
          </button>

          {isDone && !isOutOfTopics && (
            <button onClick={generate} style={S.btn('secondary')}>
              Generate more
            </button>
          )}
        </div>

        {error && (
          <div style={{ marginTop: '1rem', background: '#fff0f0', border: '1px solid #f5c6c6', color: '#7b2020', borderRadius: '0.5rem', padding: '0.65rem 0.9rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
      </div>

      {/* ── Progress bar ── */}
      {isGenerating && progress.total > 0 && (
        <div style={S.card}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: '600', color: '#1e2d4a', fontSize: '0.9rem' }}>
            Working on slot {progress.current} of {progress.total}…
          </p>
          {progress.topic && (
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#8b7355' }}>
              Current: <em>{progress.topic}</em>
            </p>
          )}
          <div style={{ background: '#f0ece4', borderRadius: '0.5rem', height: '6px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: '#1e2d4a', borderRadius: '0.5rem',
              width: `${(progress.current / progress.total) * 100}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* ── Summary ── */}
      {summary && (
        <div style={{ ...S.card, background: '#f3fbf6', border: '1px solid #b7dfc8' }}>
          <p style={{ margin: 0, fontWeight: '700', color: '#1b5e20', fontSize: '1rem' }}>
            ✓ {summary.generated + summary.skipped} processed ({summary.generated} saved, {summary.skipped} skipped)
          </p>
          {(summary.childGenerated > 0 || summary.childSkipped > 0) && (
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: '#1b5e20', fontWeight: '600' }}>
              + {summary.childGenerated} child article{summary.childGenerated === 1 ? '' : 's'} saved
              {summary.childSkipped > 0 && `, ${summary.childSkipped} child skipped`}
            </p>
          )}
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: '#4a7c59' }}>
            All saved as drafts. Go to the Dashboard tab to review and publish them.
          </p>
        </div>
      )}

      {/* ── Activity log ── */}
      {log.length > 0 && (
        <div style={S.card}>
          <p style={{ margin: '0 0 0.875rem', fontWeight: '700', color: '#1e2d4a', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Activity Log
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {log.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '0.55rem 0.75rem',
                  background: item.isChild ? '#fcfaf3' : '#f9f5ee',
                  borderRadius: '0.4rem', gap: '0.5rem',
                  marginLeft: item.isChild ? '1.5rem' : 0,
                  borderLeft: item.isChild ? '3px solid #d4c5a9' : 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.75rem', color: '#aaa', marginRight: '0.4rem' }}>{item.n}/{item.total}</span>
                  {item.isChild && (
                    <span style={{
                      display: 'inline-block', padding: '0.05rem 0.45rem', marginRight: '0.4rem',
                      borderRadius: '0.7rem', fontSize: '0.65rem', fontWeight: '700',
                      background: '#ece5d0', color: '#5a4a35', textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      Child
                    </span>
                  )}
                  <span style={{ fontWeight: '600', color: '#1e2d4a', fontSize: '0.875rem', wordBreak: 'break-word' }}>{item.title}</span>
                  {item.isChild && item.parentTitle && (
                    <div style={{ fontSize: '0.72rem', color: '#8b7355', marginTop: '0.1rem' }}>
                      child of <em>{item.parentTitle}</em>
                    </div>
                  )}
                  {item.kind === 'saved'   && item.slug   && <div style={{ fontSize: '0.73rem', color: '#8b7355', fontFamily: 'monospace', marginTop: '0.1rem' }}>{item.slug}</div>}
                  {item.kind === 'skipped' && item.reason && <div style={{ fontSize: '0.73rem', color: '#856404', marginTop: '0.1rem' }}>{item.reason}</div>}
                  {item.kind === 'skipped' && item.existingArticle && (
                    <div style={{ fontSize: '0.73rem', color: '#6b6b6b', marginTop: '0.2rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                      <span>Existing:</span>
                      <strong style={{ color: '#1e2d4a' }}>{item.existingArticle.title}</strong>
                      {item.existingArticle.category && (
                        <span style={{
                          padding: '0.05rem 0.4rem', borderRadius: '1rem', fontSize: '0.68rem', fontWeight: '700',
                          background: '#f0ece4', color: '#5a4a35',
                        }}>
                          {categoryLabel(item.existingArticle.category)}
                        </span>
                      )}
                      <span style={{
                        padding: '0.05rem 0.4rem', borderRadius: '1rem', fontSize: '0.68rem', fontWeight: '700',
                        background: item.existingArticle.status === 'published' ? '#dcf5e7' : '#fff3cd',
                        color:      item.existingArticle.status === 'published' ? '#1b5e20' : '#856404',
                      }}>
                        {item.existingArticle.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                      {item.existingArticle.language && (
                        <span style={{
                          padding: '0.05rem 0.4rem', borderRadius: '1rem', fontSize: '0.68rem', fontWeight: '700',
                          background: '#e8f4fd', color: '#1565c0',
                        }}>
                          {languageLabel(item.existingArticle.language)}
                        </span>
                      )}
                      {item.existingArticle.id && (
                        <a
                          href={`/admin/#articles?article_id=${encodeURIComponent(item.existingArticle.id)}`}
                          style={{ color: '#1e2d4a', textDecoration: 'underline', fontWeight: '600' }}
                        >
                          Edit in admin →
                        </a>
                      )}
                      {item.existingArticle.status === 'published' && item.existingArticle.slug && (
                        <a
                          href={(() => {
                            const c = item.existingArticle.category;
                            const s = item.existingArticle.slug;
                            if (c === 'questions')        return `/questions/${s}/`;
                            if (c === 'topics')           return `/topics/${s}/`;
                            if (c === 'bible-characters') return `/bible-characters/${s}/`;
                            if (c === 'bible-verses')     return `/bible-verses/${s}/`;
                            return `/guides/${s}/`;
                          })()}
                          target="_blank" rel="noreferrer"
                          style={{ color: '#5a4a35', textDecoration: 'underline', fontWeight: '500', fontSize: '0.7rem' }}
                        >
                          View live ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <span style={S.badge(item.kind)}>{item.kind === 'saved' ? 'Saved' : 'Skipped'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
// step0-rebuild-marker

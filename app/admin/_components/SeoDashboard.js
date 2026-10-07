'use client';

import { useState, useEffect, useCallback } from 'react';

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const C = {
  navy:   '#1e2d4a',
  gold:   '#d4a017',
  cream:  '#faf7f2',
  border: '#e8dfc8',
  muted:  '#8b7355',
  green:  '#2d6a4f',
  red:    '#7b2020',
  amber:  '#856404',
  blue:   '#1d4ed8',
  purple: '#4c1d95',
};

const CAT_COLORS = {
  questions:        { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
  guides:           { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  topics:           { bg: '#fefce8', border: '#fde68a', text: '#854d0e' },
  'bible-verses':   { bg: '#fdf4ff', border: '#e9d5ff', text: '#6b21a8' },
  'bible-characters':{ bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
};

const S = {
  card:    { background: '#fff', border: `1px solid ${C.border}`, borderRadius: '0.875rem', padding: '1.5rem' },
  scard:   { background: '#fff', border: `1px solid ${C.border}`, borderRadius: '0.875rem', padding: '1.25rem' },
  label:   { fontSize: '0.72rem', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 },
  section: { marginBottom: '2rem' },
  h2:      { margin: '0 0 1rem', fontSize: '1.05rem', fontWeight: '700', color: C.navy, display: 'flex', alignItems: 'center', gap: '0.4rem' },
  big:     (color) => ({ margin: '0.3rem 0 0', fontSize: '2.2rem', fontWeight: '800', color, lineHeight: 1 }),
  sub:     { fontSize: '0.8rem', color: C.muted, margin: '0.2rem 0 0' },

  btn: (v = 'default') => {
    const map = {
      default: { background: '#f0ece4', color: C.navy, border: 'none' },
      primary: { background: C.navy,    color: '#fff', border: 'none' },
      green:   { background: '#dcf5e7', color: C.green, border: 'none' },
      amber:   { background: '#fff3cd', color: C.amber, border: 'none' },
      purple:  { background: '#ede9fe', color: C.purple, border: 'none' },
      blue:    { background: '#dbeafe', color: C.blue,  border: 'none' },
      danger:  { background: '#fde8e8', color: C.red,   border: 'none' },
    };
    return {
      padding: '0.4rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.78rem',
      fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      ...(map[v] || map.default),
    };
  },

  badge: (s) => ({
    display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: '1rem',
    fontSize: '0.72rem', fontWeight: '700',
    background: s === 'published' ? '#dcf5e7' : '#fff3cd',
    color:      s === 'published' ? C.green   : C.amber,
  }),

  row:  { display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0', borderBottom: `1px solid #f5f0e8` },
  pill: (bg, color) => ({ display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: '1rem', fontSize: '0.72rem', fontWeight: '700', background: bg, color }),
};

/* ─── Toast ─────────────────────────────────────────────────────────────── */
function Toast({ toast, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  const err = toast.status === 'error';
  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 2000,
      background: err ? '#fff0f0' : '#f0fdf4',
      border: `1px solid ${err ? '#f5c6c6' : '#bbf7d0'}`,
      color: err ? C.red : C.green,
      borderRadius: '0.75rem', padding: '0.85rem 1.25rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxWidth: '400px', fontSize: '0.875rem',
    }}>
      <div style={{ fontWeight: '700', marginBottom: '0.15rem' }}>{err ? '✗ Error' : '✓ Done'}</div>
      <div>{toast.message}</div>
      <button onClick={onClose} style={{ position: 'absolute', top: '0.5rem', right: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#aaa' }}>×</button>
    </div>
  );
}

/* ─── Progress bar ───────────────────────────────────────────────────────── */
function ProgressBar({ pct, color = C.green }) {
  return (
    <div style={{ background: '#f0ece4', borderRadius: '1rem', height: '10px', overflow: 'hidden', marginTop: '0.75rem' }}>
      <div style={{
        height: '100%', borderRadius: '1rem', transition: 'width 0.6s ease',
        width: `${Math.min(pct, 100)}%`,
        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
      }} />
    </div>
  );
}

/* ─── Category pill label ────────────────────────────────────────────────── */
function CatPill({ cat }) {
  const t = (CAT_COLORS[cat] || { bg: '#f3f4f6', text: '#374151' });
  return (
    <span style={{ ...S.pill(t.bg, t.text), border: `1px solid ${t.border || t.bg}`, textTransform: 'capitalize', fontSize: '0.7rem' }}>
      {cat || '—'}
    </span>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function SeoDashboard({ onNavigate }) {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [interlinking, setInterlinking] = useState(new Set());
  const [massLinking,  setMassLinking]  = useState(false);
  const [toast,        setToast]        = useState(null);
  const [showPillars,  setShowPillars]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/seo-stats/');
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Per-article interlink ── */
  async function interlinkOne(article) {
    setInterlinking(prev => new Set([...prev, article.id]));
    try {
      const res  = await fetch(`/api/admin/articles/${article.id}/interlink/`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Interlink failed');
      setToast({ status: 'success', message: json.skipped ? json.message : `"${article.title}" — ${json.message}` });
      // Refresh low-links section
      load();
    } catch (err) {
      setToast({ status: 'error', message: err.message });
    } finally {
      setInterlinking(prev => { const s = new Set(prev); s.delete(article.id); return s; });
    }
  }

  /* ── Mass interlink weak articles ── */
  async function massInterlink() {
    if (!data?.lowLinks?.length) return;
    const ids = data.lowLinks.map(a => a.id);
    if (!ids.length) { setToast({ status: 'success', message: 'No articles to re-link.' }); return; }
    setMassLinking(true);
    try {
      const res  = await fetch('/api/admin/articles/relink/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, smart: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Mass interlink failed');
      setToast({ status: 'success', message: json.message });
      load();
    } catch (err) {
      setToast({ status: 'error', message: err.message });
    } finally {
      setMassLinking(false);
    }
  }

  /* ── Loading / error states ── */
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: C.muted }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⟳</div>
        Loading SEO data…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#fff0f0', border: '1px solid #f5c6c6', color: C.red, borderRadius: '0.75rem', padding: '1.25rem' }}>
        <strong>Failed to load SEO stats:</strong> {error}
        <button onClick={load} style={{ ...S.btn('default'), marginLeft: '1rem' }}>Retry</button>
      </div>
    );
  }

  const { overall, byCategory, pillars, pillarTopics, missing, recentArticles, lowLinks } = data || {};

  return (
    <div>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* ── Header row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: C.navy }}>SEO Progress Dashboard</h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: C.muted }}>Full content coverage and link health overview</p>
        </div>
        <button onClick={load} style={S.btn('default')}>↻ Refresh</button>
      </div>

      {/* ════════════════════════════════════════════
          1. OVERALL PROGRESS
      ════════════════════════════════════════════ */}
      <section style={S.section}>
        <div style={S.card}>
          <p style={S.h2}>📈 Overall Topic Coverage</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
            {[
              { label: 'Total Topics',   value: overall?.total,     color: C.navy   },
              { label: 'Articles Done',  value: overall?.completed, color: C.green  },
              { label: 'Remaining',      value: overall?.remaining, color: '#b45309' },
              { label: 'Completion',     value: `${overall?.pct ?? 0}%`, color: C.blue },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p style={S.label}>{label}</p>
                <p style={S.big(color)}>{value ?? 0}</p>
              </div>
            ))}
          </div>
          <ProgressBar pct={overall?.pct ?? 0} />
          <p style={{ ...S.sub, marginTop: '0.4rem' }}>
            {overall?.completed ?? 0} of {overall?.total ?? 0} topics have an article
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          2. CATEGORY BREAKDOWN
      ════════════════════════════════════════════ */}
      <section style={S.section}>
        <p style={S.h2}>🗂 Category Breakdown</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '1rem' }}>
          {(byCategory || []).map(cat => {
            const pct   = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
            const theme = CAT_COLORS[cat.category] || { bg: '#f9fafb', border: '#e5e7eb', text: '#374151' };
            return (
              <div key={cat.category} style={{
                ...S.scard,
                background: theme.bg,
                borderColor: theme.border,
              }}>
                <p style={{ ...S.label, color: theme.text, marginBottom: '0.6rem', textTransform: 'capitalize' }}>{cat.category}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <span style={{ fontSize: '1.6rem', fontWeight: '800', color: theme.text, lineHeight: 1 }}>{pct}%</span>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: theme.text, opacity: 0.8 }}>
                      {cat.completed}/{cat.total} done
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: theme.text, opacity: 0.7 }}>
                    <div>{cat.remaining} left</div>
                  </div>
                </div>
                <ProgressBar pct={pct} color={theme.text} />
              </div>
            );
          })}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          3. PILLAR STATUS + QUICK ACTIONS (side by side)
      ════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>

        {/* Pillar Status */}
        <div style={S.card}>
          <p style={S.h2}>⭐ Pillar Status</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            {[
              { label: 'Total Pillars',   value: pillars?.total,                              color: '#b45309' },
              { label: 'Completed',       value: pillars?.completed,                          color: C.green  },
              { label: 'Pending',         value: (pillars?.total ?? 0) - (pillars?.completed ?? 0), color: C.red },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p style={S.label}>{label}</p>
                <p style={{ ...S.big(color), fontSize: '1.8rem' }}>{value ?? 0}</p>
              </div>
            ))}
          </div>
          {(pillars?.total ?? 0) > 0 && (
            <ProgressBar
              pct={pillars.total > 0 ? Math.round((pillars.completed / pillars.total) * 100) : 0}
              color="#b45309"
            />
          )}
          <button
            onClick={() => setShowPillars(v => !v)}
            style={{ ...S.btn('amber'), marginTop: '1rem' }}
          >
            {showPillars ? '▲ Hide Pillar Topics' : '⭐ View Pillar Topics'}
          </button>
        </div>

        {/* Quick Actions */}
        <div style={S.card}>
          <p style={S.h2}>⚡ Quick Actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <button
              onClick={() => onNavigate?.('bulk')}
              style={{ ...S.btn('primary'), justifyContent: 'center', padding: '0.6rem 1rem', fontSize: '0.85rem' }}
            >
              ⚡ Generate Missing Articles
            </button>
            <button
              onClick={massInterlink}
              disabled={massLinking}
              style={{ ...S.btn('purple'), justifyContent: 'center', padding: '0.6rem 1rem', fontSize: '0.85rem', opacity: massLinking ? 0.6 : 1 }}
            >
              {massLinking ? '⟳ Interlinking…' : '🔗 Mass Interlink Weak Articles'}
            </button>
            <button
              onClick={() => setShowPillars(true)}
              style={{ ...S.btn('amber'), justifyContent: 'center', padding: '0.6rem 1rem', fontSize: '0.85rem' }}
            >
              ⭐ View Pillar Topics
            </button>
            <button
              onClick={() => onNavigate?.('articles')}
              style={{ ...S.btn('blue'), justifyContent: 'center', padding: '0.6rem 1rem', fontSize: '0.85rem' }}
            >
              📄 Manage All Articles
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          8. PILLAR VIEW PANEL (collapsible)
      ════════════════════════════════════════════ */}
      {showPillars && (
        <section style={S.section}>
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <p style={S.h2}>⭐ Pillar Topics</p>
              <button onClick={() => setShowPillars(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '1.1rem' }}>×</button>
            </div>

            {!pillarTopics?.length ? (
              <p style={{ color: C.muted, fontSize: '0.9rem' }}>No pillar topics found. Mark topics as pillars from the Topics tab.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '0.75rem' }}>
                {pillarTopics.map(t => (
                  <div key={t.id} style={{
                    border: `1px solid ${t.article_created ? '#bbf7d0' : C.border}`,
                    borderRadius: '0.625rem',
                    padding: '0.85rem 1rem',
                    background: t.article_created ? '#f0fdf4' : '#fff',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: C.navy, lineHeight: 1.3 }}>
                          {t.article_created ? '✔' : '⬜'} {t.name}
                        </span>
                      </div>
                      <CatPill cat={t.category} />
                    </div>
                    <button
                      onClick={() => onNavigate?.('generate')}
                      style={{ ...S.btn(t.article_created ? 'default' : 'green'), flexShrink: 0, fontSize: '0.72rem' }}
                      title={t.article_created ? 'Regenerate article' : 'Generate article'}
                    >
                      {t.article_created ? 'Regen' : '+ Generate'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════
          4. MISSING ARTICLES
      ════════════════════════════════════════════ */}
      <section style={S.section}>
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <p style={S.h2}>⚠ Missing Articles <span style={{ fontSize: '0.8rem', color: C.muted, fontWeight: '400' }}>— top 20</span></p>
            <button
              onClick={() => onNavigate?.('generate')}
              style={S.btn('green')}
            >
              ✦ Go to Generator
            </button>
          </div>

          {!missing?.length ? (
            <p style={{ color: C.green, fontWeight: '600', fontSize: '0.9rem' }}>🎉 All topics have articles!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {missing.map((t, i) => (
                <div key={t.id} style={{
                  ...S.row,
                  borderBottom: i === missing.length - 1 ? 'none' : `1px solid #f5f0e8`,
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#ccc', width: '1.5rem', flexShrink: 0, textAlign: 'right' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '0.875rem', color: C.navy, fontWeight: '500' }}>{t.name}</span>
                  <CatPill cat={t.category} />
                  <button
                    onClick={() => onNavigate?.('generate')}
                    style={{ ...S.btn('green'), flexShrink: 0, fontSize: '0.72rem' }}
                  >
                    + Generate
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          5 + 6. RECENTLY CREATED + INTERLINKING (side by side)
      ════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>

        {/* Recently Created */}
        <div style={S.card}>
          <p style={S.h2}>🕒 Recently Created</p>
          {!recentArticles?.length ? (
            <p style={{ color: C.muted, fontSize: '0.875rem' }}>No articles yet.</p>
          ) : (
            <div>
              {recentArticles.map((a, i) => (
                <div key={a.id} style={{ ...S.row, borderBottom: i === recentArticles.length - 1 ? 'none' : `1px solid #f5f0e8`, gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.83rem', fontWeight: '600', color: C.navy, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={a.title}>{a.title}</div>
                    <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: '0.1rem' }}>
                      {a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
                    <span style={S.badge(a.status)}>{a.status}</span>
                    <CatPill cat={a.category} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interlinking Status */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <p style={{ ...S.h2, margin: 0 }}>🔗 Interlinking Status</p>
            <button
              onClick={massInterlink}
              disabled={massLinking}
              style={{ ...S.btn('purple'), opacity: massLinking ? 0.6 : 1, fontSize: '0.72rem' }}
            >
              {massLinking ? '⟳ Linking…' : '🔗 Mass Interlink All'}
            </button>
          </div>

          {!lowLinks?.length ? (
            <p style={{ color: C.muted, fontSize: '0.875rem' }}>No articles to optimise.</p>
          ) : (
            <div>
              {lowLinks.map((a, i) => {
                const isLinking = interlinking.has(a.id);
                const optimised = a.link_count >= 5;
                return (
                  <div key={a.id} style={{ ...S.row, borderBottom: i === lowLinks.length - 1 ? 'none' : `1px solid #f5f0e8`, opacity: isLinking ? 0.6 : 1 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.83rem', fontWeight: '600', color: C.navy, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={a.title}>{a.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                        <span style={S.pill(
                          optimised ? '#dcf5e7' : a.link_count === 0 ? '#fde8e8' : '#fff3cd',
                          optimised ? C.green   : a.link_count === 0 ? C.red    : C.amber
                        )}>
                          {a.link_count} link{a.link_count !== 1 ? 's' : ''}
                        </span>
                        {!optimised && (
                          <span style={{ fontSize: '0.68rem', color: C.amber, fontWeight: '600' }}>Needs Optimisation</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => interlinkOne(a)}
                      disabled={isLinking || optimised}
                      title={optimised ? 'Already optimised' : 'Add internal links'}
                      style={{
                        ...S.btn(optimised ? 'default' : 'purple'),
                        flexShrink: 0, fontSize: '0.72rem',
                        opacity: (isLinking || optimised) ? 0.5 : 1,
                      }}
                    >
                      {isLinking ? '⟳' : '🔗 Interlink'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// step0-rebuild-marker

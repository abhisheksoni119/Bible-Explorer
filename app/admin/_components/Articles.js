'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

const BADGE = {
  published: { background: '#dcf5e7', color: '#1b5e20' },
  draft:     { background: '#fff3cd', color: '#856404' },
  rejected:  { background: '#fde8e8', color: '#7b2020' },
};

const OLD_DAYS  = 30;
const THIN_CHARS = 500;

const CATEGORIES = ['bible-verses', 'bible-characters', 'questions', 'guides', 'topics'];

const S = {
  card:      { background: '#fff', border: '1px solid #e8dfc8', borderRadius: '0.875rem', padding: '1.5rem' },
  th:        { padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: '600', color: '#6b6b6b', textAlign: 'left', borderBottom: '1px solid #e8dfc8', whiteSpace: 'nowrap' },
  td:        { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#2a2a2a', borderBottom: '1px solid #f5f0e8', verticalAlign: 'top' },
  badge:     (s) => ({ display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', ...(BADGE[s] || BADGE.draft) }),
  oldBadge:  { display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: '600', background: '#fef3c7', color: '#92400e', marginLeft: '0.4rem', verticalAlign: 'middle' },
  thinBadge: { display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: '600', background: '#ede9fe', color: '#4c1d95', marginLeft: '0.4rem', verticalAlign: 'middle' },
  select:    { padding: '0.4rem 0.75rem', border: '1px solid #d4c5a9', borderRadius: '0.5rem', fontSize: '0.85rem', fontFamily: 'inherit', background: '#fff' },
  btn:       (variant = 'default') => ({
    padding: '0.3rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.78rem', fontWeight: '600',
    cursor: 'pointer', fontFamily: 'inherit', border: 'none',
    ...(variant === 'default'  ? { background: '#f0ece4', color: '#1e2d4a' } :
        variant === 'publish'  ? { background: '#dcf5e7', color: '#1b5e20' } :
        variant === 'draft'    ? { background: '#fff3cd', color: '#856404' } :
        variant === 'reject'   ? { background: '#fde8e8', color: '#7b2020' } :
        variant === 'delete'   ? { background: '#fde8e8', color: '#7b2020' } :
        variant === 'improve'  ? { background: '#ede9fe', color: '#4c1d95' } :
        variant === 'upgrade'  ? { background: '#dbeafe', color: '#1e40af' } :
        variant === 'import'   ? { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } :
        variant === 'primary'  ? { background: '#1e2d4a', color: '#fff', padding: '0.55rem 1.25rem', fontSize: '0.9rem' } :
        variant === 'ghost'    ? { background: 'transparent', color: '#6b6b6b', border: '1px solid #d4c5a9', padding: '0.55rem 1.25rem', fontSize: '0.9rem' } : {}),
  }),
  input:     { width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #d4c5a9', borderRadius: '0.5rem', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#000' },
  label:     { display: 'block', fontWeight: '600', color: '#1e2d4a', marginBottom: '0.35rem', fontSize: '0.85rem' },
  fieldWrap: { marginBottom: '1rem' },
  checkbox:  { width: '1rem', height: '1rem', cursor: 'pointer', accentColor: '#1e2d4a' },
};

function isOldArticle(createdAt) {
  if (!createdAt) return true;
  return (Date.now() - new Date(createdAt).getTime()) / 86400000 > OLD_DAYS;
}
function isThinArticle(content) {
  return !content || content.trim().length < THIN_CHARS;
}

/* ─── Toast ─── */
function Toast({ toast, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  const isError = toast.status === 'error';
  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 2000,
      background: isError ? '#fff0f0' : '#f0fdf4',
      border: `1px solid ${isError ? '#f5c6c6' : '#bbf7d0'}`,
      color: isError ? '#7b2020' : '#166534',
      borderRadius: '0.75rem', padding: '0.85rem 1.25rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxWidth: '420px', fontSize: '0.875rem', lineHeight: 1.45,
    }}>
      <div style={{ fontWeight: '700', marginBottom: '0.2rem' }}>{isError ? '✗ Failed' : '✓ Done'}</div>
      <div style={{ color: isError ? '#a33' : '#15803d' }}>{toast.message}</div>
      <button onClick={onClose} style={{ position: 'absolute', top: '0.5rem', right: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#aaa', lineHeight: 1 }}>×</button>
    </div>
  );
}

/* ─── ConfirmModal ─── */
function ConfirmModal({ title, message, confirmLabel = 'Confirm', confirmVariant = 'delete', onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: '1rem', padding: '2rem', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <p style={{ margin: '0 0 0.5rem', fontWeight: '700', fontSize: '1.05rem', color: '#1e2d4a' }}>{title}</p>
        <p style={{ margin: '0 0 1.75rem', color: '#6b6b6b', fontSize: '0.9rem' }}>{message}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={S.btn('ghost')}>Cancel</button>
          <button onClick={onConfirm} style={{ ...S.btn(confirmVariant), padding: '0.55rem 1.25rem', fontSize: '0.9rem' }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── EditModal ─── */
function EditModal({ article, onSave, onClose }) {
  const [form, setForm] = useState({
    title:            article.title            || '',
    slug:             article.slug             || '',
    status:           article.status           || 'draft',
    meta_title:       article.meta_title       || '',
    meta_description: article.meta_description || '',
    content:          article.content          || '',
  });
  const [saving,    setSaving]    = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgraded,  setUpgraded]  = useState(false);
  const [error,     setError]     = useState('');
  const [revisions, setRevisions] = useState(null); // null = not loaded; {available, revisions}

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  // Rollback support: snapshots the live content before AI/proposal saves.
  // Graceful — silently skips when the revisions table is not created yet.
  async function snapshotRevision(source) {
    try {
      const previous = article.originalContent ?? article.content;
      if (!previous?.trim()) return;
      await fetch(`/api/admin/articles/${article.id}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: article.id,
          content: previous,
          meta_title: article.meta_title,
          meta_description: article.meta_description,
          source,
        }),
      });
    } catch { /* rollback support is best-effort */ }
  }

  async function loadRevisions() {
    setRevisions({ available: true, revisions: [], loading: true });
    try {
      const res = await fetch(`/api/admin/articles/${article.id}/revisions`);
      const data = await res.json();
      setRevisions(data.available
        ? { available: true, revisions: data.revisions || [], loading: false }
        : { available: false, reason: data.reason || 'not enabled', loading: false });
    } catch (e) {
      setRevisions({ available: false, reason: e.message, loading: false });
    }
  }

  function restoreRevision(rev) {
    setForm(f => ({
      ...f,
      content: rev.content,
      meta_title: rev.meta_title || f.meta_title,
      meta_description: rev.meta_description || f.meta_description,
    }));
    setError('');
  }

  async function handleSave(overrideStatus) {
    if (!form.title.trim() || !form.slug.trim()) { setError('Title and slug are required.'); return; }
    setSaving(true); setError('');
    // Keep a rollback point when content actually changes (AI proposals etc.)
    if (article._aiProposal || (article.originalContent && article.originalContent !== form.content)) {
      snapshotRevision(article._aiProposal ? 'ai_improve' : 'manual_edit');
    }
    const payload = { ...form };
    delete payload._aiProposal;
    delete payload._summary;
    delete payload.originalContent;
    if (overrideStatus) payload.status = overrideStatus;
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Save failed'); setSaving(false); return; }
      onSave(data);
    } catch (err) { setError(err.message); setSaving(false); }
  }

  async function handleUpgrade() {
    if (!article.content?.trim()) { setError('Article has no content to upgrade.'); return; }
    setUpgrading(true); setError(''); setUpgraded(false);
    try {
      const res  = await fetch(`/api/admin/articles/${article.id}/upgrade`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upgrade failed'); return; }
      setForm(f => ({ ...f, content: data.content }));
      setUpgraded(true);
    } catch (err) { setError(err.message); }
    finally { setUpgrading(false); }
  }

  const busy = saving || upgrading;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: '1rem', padding: '2rem', maxWidth: '720px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '1.1rem', color: '#1e2d4a' }}>Edit Article</p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#aaa', fontFamily: 'monospace' }}>{article.slug}</p>
          </div>
          <button onClick={onClose} disabled={busy} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>×</button>
        </div>

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #f5c6c6', color: '#7b2020', borderRadius: '0.5rem', padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        {upgraded && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: '0.5rem', padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            ✓ Content upgraded by AI — review the changes below, then save when ready.
          </div>
        )}
        {article._aiProposal && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: '0.5rem', padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            ✦ AI improvement proposal — <strong>nothing is saved yet.</strong> Review the proposed content below (edit freely), then choose Save Draft or Publish. Current live version stays untouched until you save.
            {article._summary && (
              <span style={{ display: 'block', marginTop: '0.3rem', color: '#64748b' }}>
                Length: {article._summary.wordsBefore} → {article._summary.wordsAfter} words
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={S.fieldWrap}>
            <label style={S.label}>Title</label>
            <input value={form.title} onChange={set('title')} style={S.input} disabled={busy} />
          </div>
          <div style={S.fieldWrap}>
            <label style={S.label}>Slug <span style={{ fontWeight: '400', color: '#aaa', fontSize: '0.78rem' }}>(read-only)</span></label>
            <input value={form.slug} readOnly style={{ ...S.input, background: '#f9f9f9', color: '#888', cursor: 'not-allowed' }} />
          </div>
          <div style={S.fieldWrap}>
            <label style={S.label}>Topic / Category <span style={{ fontWeight: '400', color: '#aaa', fontSize: '0.78rem' }}>(from Topics table)</span></label>
            <input
              value={article.topics ? `${article.topics.name || '—'} (${article.topics.category || '—'})` : '—'}
              readOnly
              style={{ ...S.input, background: '#f9f9f9', color: '#888', cursor: 'not-allowed' }}
            />
          </div>
          <div style={S.fieldWrap}>
            <label style={S.label}>Status</label>
            <select value={form.status} onChange={set('status')} style={{ ...S.input }} disabled={busy}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div style={S.fieldWrap}>
            <label style={S.label}>Meta Title</label>
            <input value={form.meta_title} onChange={set('meta_title')} style={S.input} disabled={busy} />
          </div>
          <div style={S.fieldWrap}>
            <label style={S.label}>Meta Description</label>
            <input value={form.meta_description} onChange={set('meta_description')} style={S.input} disabled={busy} />
          </div>
        </div>

        <div style={S.fieldWrap}>
          <label style={S.label}>
            Content (HTML)
            {upgraded && <span style={{ marginLeft: '0.5rem', fontSize: '0.73rem', color: '#2563eb', fontWeight: '400' }}>— AI upgraded</span>}
          </label>
          <textarea
            value={form.content} onChange={set('content')} rows={14} disabled={busy}
            style={{ ...S.input, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: 1.5 }}
          />
          <div style={{ marginTop: '0.5rem' }}>
            {revisions === null ? (
              <button onClick={loadRevisions} style={{ ...S.btn('ghost'), fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>
                🕘 Previous versions
              </button>
            ) : !revisions.available ? (
              <span style={{ fontSize: '0.73rem', color: '#aaa' }}>Rollback not enabled (revisions table missing — see docs/migrations).</span>
            ) : revisions.loading ? (
              <span style={{ fontSize: '0.73rem', color: '#aaa' }}>Loading previous versions…</span>
            ) : revisions.revisions.length === 0 ? (
              <span style={{ fontSize: '0.73rem', color: '#aaa' }}>No previous versions yet — one is captured automatically before AI-proposal saves.</span>
            ) : (
              <details>
                <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: '#8b7355' }}>
                  🕘 Previous versions ({revisions.revisions.length}) — click to restore
                </summary>
                <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {revisions.revisions.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#6b6b6b' }}>
                      <span>{new Date(r.created_at).toLocaleString()} · {r.source} · {r.words} words</span>
                      <button
                        onClick={() => restoreRevision(r)}
                        title="Load this version into the editor (still requires Save to apply)"
                        style={{ ...S.btn('ghost'), fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onClose} style={S.btn('ghost')} disabled={busy}>Cancel</button>
            <button
              onClick={handleUpgrade} disabled={busy}
              title="Ask AI to improve structure, writing and SEO — content loads into editor for review before saving"
              style={{ ...S.btn('upgrade'), padding: '0.55rem 1.1rem', fontSize: '0.88rem', opacity: busy ? 0.7 : 1 }}
            >
              {upgrading ? '⟳ Upgrading…' : '✦ Upgrade with AI'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => handleSave('draft')} disabled={busy} style={{ ...S.btn('draft'), padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}>
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button onClick={() => handleSave('published')} disabled={busy} style={{ ...S.btn('publish'), padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}>
              {saving ? 'Saving…' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ─── Main component ─── */
export default function Articles({ initialArticleId = null }) {
  const [articles,      setArticles]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  // Default to "all statuses" when deep-linked, since the target article
  // may be a draft and the default "published" filter would hide it.
  const [filter,        setFilter]        = useState({
    status: initialArticleId ? '' : 'published',
    category: '',
  });
  const [filterSpecial, setFilterSpecial] = useState('');
  const [search, setSearch]           = useState('');
  const [editing,       setEditing]       = useState(null);
  // Track which deep-link IDs we've already auto-opened to avoid loops
  // when the same component remounts with the same prop.
  const [autoOpenedId,  setAutoOpenedId]  = useState(null);
  const [deleting,      setDeleting]      = useState(null);
  const [actioning,     setActioning]     = useState(null);
  const [improving,     setImproving]     = useState(new Set());
  const [relinking,     setRelinking]     = useState(false);
  const [importing,     setImporting]     = useState(false);
  const [fixingDrafts,  setFixingDrafts]  = useState(false);
  const [pinging,       setPinging]       = useState(false);
  const [toast,         setToast]         = useState(null);

  const [interlinking,  setInterlinking]  = useState(new Set());
  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [bulkActioning, setBulkActioning] = useState(false);
  const [bulkConfirm,   setBulkConfirm]   = useState(null);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status)   params.set('status',   filter.status);
      if (filter.category) params.set('category', filter.category);
      params.set('limit', '2000');
      const res  = await fetch(`/api/admin/articles?${params}`);
      const data = await res.json();
      setArticles(Array.isArray(data) ? data : []);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('[Articles] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  // When a deep-link arrives (initial mount or later via hashchange while
  // already mounted), widen the status filter to "all" so the target — which
  // may be a draft — isn't filtered out before we can auto-open it.
  useEffect(() => {
    if (!initialArticleId || autoOpenedId === initialArticleId) return;
    setFilter(prev => (prev.status === '' ? prev : { ...prev, status: '' }));
  }, [initialArticleId, autoOpenedId]);

  // When deep-linked via /admin/#articles?article_id=xxx, auto-open the
  // EditModal once the article list has finished loading and the row exists.
  // If the row isn't in the current list (e.g. wrong category filter), fetch
  // it directly so the modal still opens regardless of list/filter timing.
  useEffect(() => {
    if (!initialArticleId || autoOpenedId === initialArticleId) return;
    if (loading) return;
    const target = articles.find(a => a.id === initialArticleId);
    if (target) {
      setEditing(target);
      setAutoOpenedId(initialArticleId);
      // Clear the article_id from the hash so re-mounts (e.g. tab switching)
      // don't re-trigger auto-open after the user has dismissed the modal.
      if (typeof window !== 'undefined') {
        history.replaceState(null, '', '#articles');
      }
      return;
    }
    // Fallback: fetch the single article directly so deep-link works even when
    // category filter or pagination hides it from the list.
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/articles/${initialArticleId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.id) return;
        setEditing(data);
        setAutoOpenedId(initialArticleId);
        if (typeof window !== 'undefined') {
          history.replaceState(null, '', '#articles');
        }
      } catch (err) {
        console.error('[Articles] deep-link fetch error:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [initialArticleId, loading, articles, autoOpenedId]);

  const displayArticles = useMemo(() => {
    if (filterSpecial === 'thin')    return articles.filter(a => isThinArticle(a.content));
    if (filterSpecial === 'no-meta') return articles.filter(a => !a.meta_description?.trim());
    return articles;
  }, [articles, filterSpecial, search]);

  const allSelected = displayArticles.length > 0 && displayArticles.every(a => selectedIds.has(a.id));
  const nSelected   = selectedIds.size;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayArticles.map(a => a.id)));
    }
  }

  function toggleSelectOne(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function executeBulkAction(action, extra = {}) {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkActioning(true);
    setBulkConfirm(null);
    try {
      // Interlink routes through the relink endpoint with explicit IDs
      const url    = action === 'interlink' ? '/api/admin/articles/relink' : '/api/admin/articles/bulk';
      const body   = action === 'interlink'
        ? JSON.stringify({ ids, smart: true })
        : JSON.stringify({ ids, action, ...extra });

      const res  = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      const data = await res.json();
      if (!res.ok) {
        setToast({ status: 'error', message: data.error || 'Bulk action failed' });
      } else {
        setToast({ status: 'success', message: data.message });
        setSelectedIds(new Set());
        loadArticles();
      }
    } catch (err) {
      setToast({ status: 'error', message: err.message });
    } finally {
      setBulkActioning(false);
    }
  }

  async function setStatus(article, newStatus) {
    setActioning(article.id + newStatus);
    await fetch(`/api/admin/articles/${article.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setActioning(null);
    loadArticles();
  }

  async function confirmDelete() {
    if (!deleting) return;
    const res = await fetch(`/api/admin/articles/${deleting.id}`, { method: 'DELETE' });
    setDeleting(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setToast({ status: 'error', message: body.error || 'Delete failed.' });
    } else {
      loadArticles();
    }
  }

  function handleEditSaved(updated) {
    setEditing(null);
    setArticles(prev => prev.map(a => a.id === updated.id ? updated : a));
    setToast({ status: 'success', message: `"${updated.title}" saved successfully.` });
  }

  async function interlinkOne(article) {
    setInterlinking(prev => new Set([...prev, article.id])); setToast(null);
    try {
      const res  = await fetch(`/api/admin/articles/${article.id}/interlink`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setToast({ status: 'error', message: data.error || 'Interlinking failed' });
      } else if (data.skipped) {
        setToast({ status: 'success', message: data.message });
      } else {
        setArticles(prev => prev.map(a => a.id === data.id ? { ...a, ...data } : a));
        setToast({ status: 'success', message: `"${article.title}" — ${data.message}` });
      }
    } catch (err) { setToast({ status: 'error', message: err.message }); }
    finally { setInterlinking(prev => { const s = new Set(prev); s.delete(article.id); return s; }); }
  }


  async function relinkAll() {
    setRelinking(true); setToast(null);
    try {
      const res  = await fetch('/api/admin/articles/relink', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) {
        setToast({ status: 'error', message: data.error || 'Re-link failed' });
      } else {
        setToast({ status: 'success', message: data.message || `Re-linked ${data.updated} articles.` });
        loadArticles();
      }
    } catch (err) { setToast({ status: 'error', message: err.message }); }
    finally { setRelinking(false); }
  }

  async function improveArticle(article) {
    setImproving(prev => new Set([...prev, article.id])); setToast(null);
    try {
      const res  = await fetch(`/api/admin/articles/${article.id}/improve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setToast({ status: 'error', message: data.error || 'Something went wrong' });
      } else {
        // Review-first: load the AI proposal into the editor — nothing is
        // saved until the user explicitly saves in the editor. The current
        // live version is kept for the rollback snapshot on save.
        setEditing({
          ...article,
          originalContent: article.content,
          content:         data.content,
          _aiProposal:     true,
          _summary:        data.summary,
        });
        setToast({ status: 'success', message: `"${article.title}" — AI proposal loaded into the editor. Review, then Save.` });
      }
    } catch (err) { setToast({ status: 'error', message: err.message }); }
    finally { setImproving(prev => { const s = new Set(prev); s.delete(article.id); return s; }); }
  }

  async function handleImportLegacy() {
    setImporting(true); setToast(null);
    try {
      const res  = await fetch('/api/admin/import-legacy', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setToast({ status: 'error', message: data.error || 'Import failed' });
      } else {
        setToast({ status: 'success', message: data.message });
        if (data.imported > 0) loadArticles();
      }
    } catch (err) { setToast({ status: 'error', message: err.message }); }
    finally { setImporting(false); }
  }

  async function fixDraftTitles(dryRun = false) {
    setFixingDrafts(true); setToast(null);
    try {
      const res  = await fetch('/api/admin/articles/fix-drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dryRun }) });
      const data = await res.json();
      if (!res.ok) {
        setToast({ status: 'error', message: data.error || 'Fix failed' });
      } else if (dryRun) {
        const n = data.wouldFix || 0;
        setToast({ status: 'success', message: n === 0 ? 'All draft titles are already correct.' : `Dry run: ${n} draft(s) would be fixed.` });
      } else {
        const n = data.fixed || 0;
        setToast({ status: 'success', message: n === 0 ? 'All draft titles were already correct — nothing changed.' : `Fixed ${n} draft title(s) and slug(s).` });
        if (n > 0) loadArticles();
      }
    } catch (err) { setToast({ status: 'error', message: err.message }); }
    finally { setFixingDrafts(false); }
  }

  async function handlePing() {
    setPinging(true); setToast(null);
    try {
      const res  = await fetch('/api/admin/ping', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) setToast({ status: 'error', message: data.error || 'Ping failed' });
      else setToast({ status: 'success', message: '✓ Sitemap ping sent to Google (sitemap.xml + sitemap-recent.xml)' });
    } catch (err) { setToast({ status: 'error', message: err.message }); }
    finally { setPinging(false); }
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div>
      {toast       && <Toast toast={toast} onClose={() => setToast(null)} />}
      {editing     && <EditModal article={editing} onSave={handleEditSaved} onClose={() => setEditing(null)} />}
      {deleting    && (
        <ConfirmModal
          title="Delete article?"
          message={`"${deleting.title}" will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
      {bulkConfirm && (
        <ConfirmModal
          title={bulkConfirm.title}
          message={bulkConfirm.message}
          confirmLabel={bulkConfirm.confirmLabel}
          confirmVariant={bulkConfirm.confirmVariant || 'delete'}
          onConfirm={() => executeBulkAction(bulkConfirm.action, bulkConfirm.extra || {})}
          onCancel={() => setBulkConfirm(null)}
        />
      )}

      {/* ── Filters & toolbar ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.9rem', color: '#6b6b6b', fontWeight: '600' }}>
          {loading ? 'Loading…' : `${displayArticles.length} / ${articles.length}`}
        </span>

        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} style={S.select}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
        </select>

        <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))} style={S.select}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>

        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title or slug…"
          style={{ ...S.select, minWidth: '190px' }}
        />

        <select value={filterSpecial} onChange={e => { setFilterSpecial(e.target.value); setSelectedIds(new Set()); }} style={S.select}>
          <option value="thin">Thin content (under {THIN_CHARS} chars)</option>
          <option value="orphan">Orphan (thin content &lt;{THIN_CHARS} chars)</option>
          <option value="no-meta">Missing meta description</option>
        </select>

        <button onClick={loadArticles} style={{ ...S.btn('default'), padding: '0.4rem 0.85rem' }}>↻ Refresh</button>

        <button
          onClick={relinkAll} disabled={relinking}
          title="Strip old enrichment and re-run internal linking on all published articles"
          style={{ ...S.btn('improve'), padding: '0.4rem 0.85rem', opacity: relinking ? 0.6 : 1 }}
        >
          {relinking ? '⟳ Re-linking…' : '🔗 Re-link All'}
        </button>

        <button
          onClick={() => fixDraftTitles(false)} disabled={fixingDrafts}
          title="Fix titles and slugs of all draft articles to match the correct format for their category (e.g. 'Bible Verses About X')"
          style={{ ...S.btn('upgrade'), padding: '0.4rem 0.85rem', opacity: fixingDrafts ? 0.6 : 1 }}
        >
          {fixingDrafts ? '⟳ Fixing…' : '✎ Fix Draft Titles'}
        </button>
      </div>

      {/* ── Bulk action bar ── */}
      {nSelected > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap',
          padding: '0.75rem 1rem', marginBottom: '0.75rem',
          background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.625rem',
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0369a1' }}>
            {nSelected} selected
          </span>

          <button
            onClick={() => setBulkConfirm({
              title:         'Publish selected?',
              message:       `Mark ${nSelected} article${nSelected !== 1 ? 's' : ''} as published?`,
              confirmLabel:  'Publish',
              confirmVariant: 'publish',
              action:        'set-status',
              extra:         { status: 'published' },
            })}
            disabled={bulkActioning}
            style={{ ...S.btn('publish'), padding: '0.35rem 0.85rem' }}
          >
            Publish
          </button>

          <button
            onClick={() => setBulkConfirm({
              title:         'Set selected to draft?',
              message:       `Move ${nSelected} article${nSelected !== 1 ? 's' : ''} to draft?`,
              confirmLabel:  'Set Draft',
              confirmVariant: 'draft',
              action:        'set-status',
              extra:         { status: 'draft' },
            })}
            disabled={bulkActioning}
            style={{ ...S.btn('draft'), padding: '0.35rem 0.85rem' }}
          >
            Draft
          </button>

          <button
            onClick={() => setBulkConfirm({
              title:         'Delete selected?',
              message:       `Permanently delete ${nSelected} article${nSelected !== 1 ? 's' : ''}? This cannot be undone.`,
              confirmLabel:  'Delete All',
              confirmVariant: 'delete',
              action:        'delete',
            })}
            disabled={bulkActioning}
            style={{ ...S.btn('delete'), padding: '0.35rem 0.85rem' }}
          >
            Delete
          </button>

          <button
            onClick={() => setBulkConfirm({
              title:         'Mass Interlink selected?',
              message:       `Add smart internal links to ${nSelected} article${nSelected !== 1 ? 's' : ''}? Articles already at 7+ links will be skipped.`,
              confirmLabel:  'Interlink',
              confirmVariant: 'improve',
              action:        'interlink',
            })}
            disabled={bulkActioning}
            style={{ ...S.btn('improve'), padding: '0.35rem 0.85rem' }}
          >
            🔗 Interlink
          </button>

          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ ...S.btn('ghost'), padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#8b7355' }}>Loading articles…</div>
        ) : displayArticles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#8b7355' }}>
            {articles.length === 0
              ? 'No articles found. Generate some using the Bulk Generate tab.'
              : 'No articles match the current filter.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9f5ee' }}>
                <tr>
                  <th style={{ ...S.th, width: '2.5rem', paddingRight: '0.5rem' }}>
                    <input
                      type="checkbox" style={S.checkbox}
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      title={allSelected ? 'Deselect all' : 'Select all visible'}
                    />
                  </th>
                  <th style={S.th}>Title</th>
                  <th style={S.th}>Category</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Created</th>
                  <th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayArticles.map(a => {
                  const busy            = actioning && actioning.startsWith(a.id);
                  const isImproving     = improving.has(a.id);
                  const isInterlinking  = interlinking.has(a.id);
                  const old             = isOldArticle(a.created_at);
                  const thin            = isThinArticle(a.content);
                  const checked         = selectedIds.has(a.id);
                  const rowDisabled     = busy || isImproving || isInterlinking;
                  return (
                    <tr key={a.id} style={{
                      opacity: rowDisabled ? 0.6 : 1,
                      transition: 'opacity 0.2s',
                      background: checked ? '#f0f9ff' : undefined,
                    }}>
                      <td style={{ ...S.td, paddingRight: '0.5rem', width: '2.5rem' }}>
                        <input
                          type="checkbox" style={S.checkbox}
                          checked={checked}
                          onChange={() => toggleSelectOne(a.id)}
                        />
                      </td>
                      <td style={{ ...S.td, maxWidth: '320px' }}>
                        <span style={{ color: '#1e2d4a', fontWeight: '600', lineHeight: 1.35 }}>{a.title}</span>
                        {old  && <span style={S.oldBadge}  title={`Created more than ${OLD_DAYS} days ago`}>Old</span>}
                        {thin && <span style={S.thinBadge} title={`Content shorter than ${THIN_CHARS} characters`}>Thin</span>}
                        <br />
                        <span style={{ fontSize: '0.73rem', color: '#aaa', fontFamily: 'monospace' }}>{a.slug}</span>
                      </td>
                      <td style={{ ...S.td, textTransform: 'capitalize' }}>{a.topics?.category || '—'}</td>
                      <td style={S.td}>
                        <span style={S.badge(a.status)}>{a.status || 'draft'}</span>
                      </td>
                      <td style={S.td} suppressHydrationWarning>{fmt(a.created_at)}</td>
                      <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button onClick={() => setEditing(a)} style={S.btn('default')} disabled={rowDisabled}>Edit</button>
                          <button
                            onClick={() => improveArticle(a)}
                            style={{ ...S.btn('improve'), minWidth: '4.5rem' }}
                            disabled={rowDisabled}
                            title="Rewrite with AI — loads a proposal into the editor for review (nothing saves automatically)"
                          >
                            {isImproving ? '…' : '✦ Improve'}
                          </button>
                          <button
                            onClick={() => interlinkOne(a)}
                            style={{ ...S.btn('upgrade'), minWidth: '5rem' }}
                            disabled={rowDisabled}
                            title="Strip old links and re-run smart internal linking — adds as many genuinely relevant article links as the content can support (no cap)."
                          >
                            {isInterlinking ? '⟳ Linking…' : `🔗 Interlink${(a.link_count || 0) > 0 ? ` (${a.link_count})` : ''}`}
                          </button>
                          {a.status !== 'published' && (
                            <button onClick={() => setStatus(a, 'published')} style={S.btn('publish')} disabled={rowDisabled}>Publish</button>
                          )}
                          {a.status !== 'draft' && (
                            <button onClick={() => setStatus(a, 'draft')} style={S.btn('draft')} disabled={rowDisabled}>Draft</button>
                          )}
                          {a.status !== 'rejected' && (
                            <button onClick={() => setStatus(a, 'rejected')} style={S.btn('reject')} disabled={rowDisabled}>Reject</button>
                          )}
                          <button onClick={() => setDeleting(a)} style={S.btn('delete')} disabled={rowDisabled}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
// step0-rebuild-marker

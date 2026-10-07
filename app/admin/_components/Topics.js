'use client';

import { useState, useEffect, useMemo } from 'react';
import { CATEGORIES } from '../../../lib/categories.js';

const S = {
  card:    { background: '#fff', border: '1px solid #e8dfc8', borderRadius: '1rem', padding: '1.75rem' },
  label:   { display: 'block', fontWeight: 'bold', color: '#1e2d4a', marginBottom: '0.4rem', fontSize: '0.9rem' },
  input:   { width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #d4c5a9', borderRadius: '0.5rem', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#000' },
  btn:     { backgroundColor: '#1e2d4a', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.65rem 1.5rem', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' },
  tab:     (active) => ({
    padding: '0.35rem 0.85rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
    border: 'none', fontFamily: 'inherit',
    background: active ? '#1e2d4a' : '#f5f0e8',
    color:      active ? 'white'   : '#5a4a35',
  }),
  pillarBadge:  { display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#fff3cd', color: '#856404', fontSize: '0.7rem', fontWeight: '700', padding: '0.1rem 0.5rem', borderRadius: '1rem', border: '1px solid #ffc107' },
  createdBadge: { color: '#1b5e20', fontSize: '0.78rem', fontWeight: '600', flexShrink: 0 },
  pendingBadge: { color: '#aaa',    fontSize: '0.78rem', flexShrink: 0 },
};

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#fff3cd', padding: 0, borderRadius: '2px' }}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function TopicRow({ t, indent = false, pillarLoading, onTogglePillar, query }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
      padding: '0.55rem 0.875rem',
      paddingLeft: indent ? '2rem' : '0.875rem',
      background: indent ? '#fdfaf4' : '#f9f5ee',
      borderRadius: '0.5rem',
      border: `1px solid ${indent ? '#ede8dc' : '#e8dfc8'}`,
      opacity: t.is_created ? 0.78 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
        {indent && <span style={{ color: '#b8a07a', fontSize: '0.8rem', flexShrink: 0 }}>└─</span>}
        {t.is_pillar && <span style={S.pillarBadge}>★ Pillar</span>}
        <span style={{
          fontWeight: indent ? '400' : '700',
          color: '#1e2d4a',
          fontSize: indent ? '0.875rem' : '0.925rem',
          wordBreak: 'break-word',
        }}>
          {highlight(t.name, query)}
        </span>
        {t._orphan && <span style={{ fontSize: '0.7rem', color: '#c00', background: '#fff0f0', padding: '0.1rem 0.4rem', borderRadius: '1rem', border: '1px solid #f5c6c6' }}>orphan</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
        <span style={t.is_created ? S.createdBadge : S.pendingBadge}>
          {t.is_created
            ? `✔ ${t.article_count > 1 ? `${t.article_count} articles` : 'Created'}`
            : '⬜'}
        </span>
        <button
          onClick={() => onTogglePillar(t)}
          disabled={pillarLoading === t.id}
          title={t.is_pillar ? 'Remove pillar' : 'Mark as pillar'}
          style={{
            padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.72rem', fontWeight: '600',
            cursor: 'pointer', fontFamily: 'inherit', border: 'none',
            background: t.is_pillar ? '#fff3cd' : '#f0ece4',
            color:      t.is_pillar ? '#856404' : '#aaa',
            opacity: pillarLoading === t.id ? 0.6 : 1,
          }}
        >
          {pillarLoading === t.id ? '…' : t.is_pillar ? '★ Pillar' : '☆ Pillar'}
        </button>
      </div>
    </div>
  );
}

export default function Topics() {
  const [hierarchy,     setHierarchy]     = useState([]);
  const [activeTab,     setActiveTab]     = useState(CATEGORIES[0].value);
  const [showCreated,   setShowCreated]   = useState(true);
  const [expanded,      setExpanded]      = useState({});
  const [search,        setSearch]        = useState('');
  const [filterParent,  setFilterParent]  = useState('');
  const [pillarLoading, setPillarLoading] = useState(null);

  const [name,     setName]     = useState('');
  const [cat,      setCat]      = useState(CATEGORIES[0].value);
  const [parentId, setParentId] = useState('');
  const [isPillar, setIsPillar] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  async function load() {
    try {
      const res = await fetch('/api/topics-tree');
      const d   = await res.json();
      if (Array.isArray(d)) setHierarchy(d);
    } catch (err) {
      console.error('[Topics] load error:', err);
    }
  }

  useEffect(() => { load(); }, []);

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function togglePillar(topic) {
    setPillarLoading(topic.id);
    try {
      await fetch(`/api/admin/topics/${topic.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pillar: !topic.is_pillar }),
      });
      load();
    } catch (err) {
      console.error('togglePillar error:', err);
    }
    setPillarLoading(null);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Topic name is required.'); return; }
    setError(''); setSaving(true);
    try {
      const body = { name: name.trim(), category: cat, is_pillar: isPillar };
      if (parentId) body.parent_id = parentId;
      const res = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to add topic.'); setSaving(false); return; }
      setName(''); setIsPillar(false); setParentId('');
      setSuccess(`Topic "${data.name}" added!`);
      setTimeout(() => setSuccess(''), 3000);
      load();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  const tabNodes = useMemo(
    () => hierarchy.filter(n => n.category === activeTab),
    [hierarchy, activeTab]
  );

  const parentOptions = useMemo(
    () => hierarchy.filter(n => n.category === cat),
    [hierarchy, cat]
  );

  const q = search.trim().toLowerCase();

  const visibleNodes = useMemo(() => {
    let nodes = tabNodes;

    if (filterParent) {
      nodes = nodes.filter(n => n.id === filterParent);
    }

    if (!showCreated) {
      nodes = nodes
        .map(n => ({
          ...n,
          children: n.children.filter(c => !c.is_created),
        }))
        .filter(n => !n.is_created || n.children.length > 0);
    }

    if (q) {
      nodes = nodes
        .map(n => {
          const parentMatch = n.name.toLowerCase().includes(q);
          const matchedChildren = n.children.filter(c => c.name.toLowerCase().includes(q));
          if (!parentMatch && matchedChildren.length === 0) return null;
          return { ...n, children: parentMatch ? n.children : matchedChildren, _forceOpen: true };
        })
        .filter(Boolean);
    }

    return nodes;
  }, [tabNodes, filterParent, showCreated, q]);

  const totalInTab  = tabNodes.length + tabNodes.reduce((s, n) => s + n.children.length, 0);
  const createdInTab = tabNodes.filter(n => n.is_created).length
    + tabNodes.flatMap(n => n.children).filter(c => c.is_created).length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start' }}>

      {/* ── Add form ── */}
      <div style={S.card}>
        <h3 style={{ fontFamily: 'Georgia,serif', margin: '0 0 1.25rem', color: '#1e2d4a', fontSize: '1.05rem' }}>Add New Topic</h3>
        <form onSubmit={handleAdd}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={S.label}>Topic Name</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Love in Marriage"
              style={S.input}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={S.label}>Category</label>
            <select value={cat} onChange={e => { setCat(e.target.value); setParentId(''); }} style={S.input}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={S.label}>Parent Topic <span style={{ fontWeight: 400, color: '#8b7355' }}>(optional)</span></label>
            <select value={parentId} onChange={e => setParentId(e.target.value)} style={S.input}>
              <option value="">— None (top-level topic) —</option>
              {parentOptions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              id="is-pillar-cb" type="checkbox" checked={isPillar}
              onChange={e => setIsPillar(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#b8860b' }}
            />
            <label htmlFor="is-pillar-cb" style={{ ...S.label, display: 'inline', margin: 0, cursor: 'pointer' }}>
              Is Pillar Topic
            </label>
          </div>

          {error   && <div style={{ background:'#fff0f0', border:'1px solid #f5c6c6', color:'#7b2020', borderRadius:'0.5rem', padding:'0.6rem 0.9rem', marginBottom:'0.75rem', fontSize:'0.85rem' }}>{error}</div>}
          {success && <div style={{ background:'#f0fff4', border:'1px solid #b2dfdb', color:'#1b5e20', borderRadius:'0.5rem', padding:'0.6rem 0.9rem', marginBottom:'0.75rem', fontSize:'0.85rem' }}>{success}</div>}

          <button type="submit" disabled={saving} style={{ ...S.btn, opacity: saving ? 0.7 : 1, width: '100%' }}>
            {saving ? 'Adding…' : '+ Add Topic'}
          </button>
        </form>
      </div>

      {/* ── Topics tree ── */}
      <div>
        {/* Category tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {CATEGORIES.map(c => {
            const count = hierarchy.filter(n => n.category === c.value).length;
            return (
              <button
                key={c.value}
                onClick={() => { setActiveTab(c.value); setFilterParent(''); setSearch(''); }}
                style={S.tab(activeTab === c.value)}
              >
                {c.label} {count > 0 && <span style={{ opacity: 0.7, fontSize: '0.72rem' }}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Search + filter bar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search topics…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...S.input, flex: '1 1 180px', padding: '0.5rem 0.85rem', fontSize: '0.875rem' }}
          />
          <select
            value={filterParent}
            onChange={e => setFilterParent(e.target.value)}
            style={{ ...S.input, flex: '1 1 180px', padding: '0.5rem 0.85rem', fontSize: '0.875rem' }}
          >
            <option value="">All parent topics</option>
            {tabNodes.map(n => (
              <option key={n.id} value={n.id}>{n.name} ({n.children.length})</option>
            ))}
          </select>
        </div>

        {/* Stats + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.82rem', color: '#8b7355' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={showCreated} onChange={e => setShowCreated(e.target.checked)} style={{ accentColor: '#1e2d4a' }} />
            Show Created
          </label>
          <span>{createdInTab} of {totalInTab} created</span>
          {visibleNodes.length !== tabNodes.length && (
            <span style={{ color: '#b8860b' }}>Showing {visibleNodes.length} parent{visibleNodes.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Tree */}
        <div style={S.card}>
          {visibleNodes.length === 0 ? (
            <p style={{ margin: 0, color: '#aaa', fontSize: '0.875rem' }}>
              {tabNodes.length === 0
                ? `No topics in this category yet — add one!`
                : q
                  ? `No topics match "${search}".`
                  : 'All topics created. Toggle "Show Created" to see them.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {visibleNodes.map(node => {
                const isOpen = expanded[node.id] || node._forceOpen || !!filterParent || !!q;
                const hasChildren = node.children.length > 0;
                return (
                  <div key={node.id}>
                    {/* Parent row */}
                    <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.375rem', marginBottom: hasChildren && isOpen ? '0.25rem' : 0 }}>
                      {hasChildren && (
                        <button
                          onClick={() => toggleExpand(node.id)}
                          title={isOpen ? 'Collapse' : 'Expand'}
                          style={{
                            background: '#f0ece4', border: '1px solid #e8dfc8', borderRadius: '0.375rem',
                            cursor: 'pointer', padding: '0 0.6rem', fontSize: '0.8rem', color: '#5a4a35',
                            flexShrink: 0, lineHeight: 1,
                          }}
                        >
                          {isOpen ? '▾' : '▸'}
                        </button>
                      )}
                      {!hasChildren && <div style={{ width: '2rem', flexShrink: 0 }} />}
                      <div style={{ flex: 1 }}>
                        <TopicRow
                          t={node}
                          indent={false}
                          pillarLoading={pillarLoading}
                          onTogglePillar={togglePillar}
                          query={q}
                        />
                      </div>
                    </div>

                    {/* Children */}
                    {isOpen && hasChildren && (
                      <div style={{ marginLeft: '2.375rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.25rem' }}>
                        {node.children.map(child => (
                          <TopicRow
                            key={child.id}
                            t={child}
                            indent
                            pillarLoading={pillarLoading}
                            onTogglePillar={togglePillar}
                            query={q}
                          />
                        ))}
                      </div>
                    )}
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

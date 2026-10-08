'use client';

import { useState, useEffect } from 'react';

const CATEGORIES = [
  { value: 'questions',        label: 'Questions' },
  { value: 'guides',           label: 'Guides' },
  { value: 'topics',           label: 'Topics' },
  { value: 'bible-verses',     label: 'Bible Verses' },
  { value: 'bible-characters', label: 'Bible Characters' },
];

const S = {
  card:       { background: '#fff', border: '1px solid #e8dfc8', borderRadius: '0.875rem', padding: '1.5rem', marginBottom: '1rem' },
  label:      { display: 'block', fontWeight: '600', color: '#1e2d4a', marginBottom: '0.35rem', fontSize: '0.85rem' },
  input:      { width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #d4c5a9', borderRadius: '0.5rem', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#000' },
  btnPrimary: { background: '#1e2d4a', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.65rem 1.5rem', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost:   { background: 'transparent', color: '#6b6b6b', border: '1px solid #d4c5a9', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' },
  btnGold:    { background: '#dcf5e7', color: '#1b5e20', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.1rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' },
  btnIdeas:   { background: '#ede9fe', color: '#4c1d95', border: 'none', borderRadius: '0.5rem', padding: '0.35rem 0.85rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' },
  errBox:     { background: '#fff0f0', border: '1px solid #f5c6c6', color: '#7b2020', borderRadius: '0.5rem', padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.875rem' },
  successBanner: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  metaBox:    { background: '#f9f5ee', borderRadius: '0.5rem', padding: '0.75rem 1rem' },
  metaLabel:  { margin: '0 0 0.25rem', fontSize: '0.72rem', fontWeight: '700', color: '#8b7355', textTransform: 'uppercase' },
  metaVal:    { margin: 0, fontSize: '0.875rem', color: '#1e2d4a' },
};

export default function Generator({ onSaved }) {
  const [topics,        setTopics]        = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError,   setTopicsError]   = useState('');

  const [selCategory,   setSelCategory]   = useState('questions');
  const [filter,        setFilter]        = useState('not-created'); // all | not-created | created | pillars
  const [selectedTopic, setSelectedTopic] = useState(null); // topic object

  const [idea,            setIdea]            = useState('');
  const [usedIdeaId,      setUsedIdeaId]      = useState(null);
  const [ideas,           setIdeas]           = useState([]);
  const [ideasLoading,    setIdeasLoading]    = useState(false);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [ideasError,      setIdeasError]      = useState('');

  const [generating, setGenerating] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [preview,    setPreview]    = useState(null);
  const [error,      setError]      = useState('');
  const [duplicate,  setDuplicate]  = useState(null); // { kind, existingArticle }
  const [saved,      setSaved]      = useState(false);

  useEffect(() => {
    setTopicsLoading(true);
    fetch('/api/admin/topics')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => setTopics(Array.isArray(data) ? data : []))
      .catch(err => setTopicsError('Failed to load topics: ' + err.message))
      .finally(() => setTopicsLoading(false));
  }, []);

  // Count topics per category
  function countCat(cat) {
    return topics.filter(t => t.category === cat).length;
  }

  // Topics visible in current category + filter
  const catTopics = topics.filter(t => t.category === selCategory);
  const visibleTopics = catTopics.filter(t => {
    if (filter === 'not-created') return !t.article_created;
    if (filter === 'created')     return  t.article_created;
    if (filter === 'pillars')     return  t.is_pillar;
    return true; // all
  });

  function selectTopic(topic) {
    setSelectedTopic(topic);
    setIdea(''); setUsedIdeaId(null); setError(''); setDuplicate(null);
    setIdeas([]); setPreview(null); setSaved(false);
    fetchIdeasById(topic.id);
  }

  async function fetchIdeasById(topicId) {
    setIdeasLoading(true); setIdeasError('');
    try {
      const res  = await fetch(`/api/admin/ideas?topic_id=${topicId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load ideas');
      setIdeas(Array.isArray(data) ? data : []);
    } catch (err) {
      setIdeasError(err.message); setIdeas([]);
    } finally {
      setIdeasLoading(false);
    }
  }

  async function handleGenerateIdeas() {
    if (!selectedTopic) return;
    setGeneratingIdeas(true); setIdeasError('');
    try {
      const res  = await fetch('/api/admin/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: selectedTopic.id, topic_name: selectedTopic.name, category: selectedTopic.category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate ideas');
      await fetchIdeasById(selectedTopic.id);
    } catch (err) {
      setIdeasError(err.message);
    } finally {
      setGeneratingIdeas(false);
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!selectedTopic) { setError('Please select a topic.'); return; }
    setError(''); setDuplicate(null); setPreview(null); setSaved(false); setGenerating(true);
    try {
      const res  = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: selectedTopic.id, topicName: selectedTopic.name, idea: idea.trim() }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setDuplicate({ kind: data.code || 'DUPLICATE', existingArticle: data.existingArticle || null });
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setPreview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(publish) {
    if (!preview) return;
    setSaving(true); setError(''); setDuplicate(null); setSaved(false);
    try {
      const res  = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...preview, status: publish ? 'published' : 'draft' }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setDuplicate({ kind: data.code || 'DUPLICATE', existingArticle: data.existingArticle || null });
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Save failed');
      if (usedIdeaId) {
        fetch(`/api/admin/ideas/${usedIdeaId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ used: true }),
        }).catch(() => {});
      }
      setTopics(prev => prev.map(t => t.id === selectedTopic.id ? { ...t, article_created: true } : t));
      setSaved(true); setPreview(null);
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setSelectedTopic(null); setIdea(''); setPreview(null);
    setError(''); setDuplicate(null); setSaved(false); setGenerating(false);
    setUsedIdeaId(null); setIdeas([]);
  }

  // Build the public URL for an existing article so the user can jump to it.
  // Mirrors the articleUrl helper in lib/articlePage.js.
  function existingArticlePublicUrl(a) {
    if (!a?.slug) return null;
    const c = a.category;
    if (c === 'questions')        return `/questions/${a.slug}/`;
    if (c === 'topics')           return `/topics/${a.slug}/`;
    if (c === 'bible-characters') return `/bible-characters/${a.slug}/`;
    if (c === 'bible-verses')     return `/bible-verses/${a.slug}/`;
    return `/guides/${a.slug}/`;
  }

  // Friendly display labels — the duplicate banner shouldn't show raw codes
  function categoryLabel(c) {
    const map = {
      questions: 'Questions', guides: 'Guides', topics: 'Topics',
      'bible-verses': 'Bible Verses', 'bible-characters': 'Bible Characters',
    };
    return map[c] || c || 'Article';
  }
  function languageLabel(l) {
    const map = { en: 'English', de: 'German', es: 'Spanish', fr: 'French', pt: 'Portuguese', it: 'Italian' };
    if (!l) return '';
    return map[l.toLowerCase()] || l.toUpperCase();
  }

  return (
    <div>

      {saved && (
        <div style={S.successBanner}>
          <span>✓ Article saved!</span>
          <button onClick={reset} style={{ ...S.btnGhost, fontSize: '0.85rem' }}>Generate another</button>
        </div>
      )}

      {/* ── Topic picker card ── */}
      <div style={S.card}>
        <h3 style={{ margin: '0 0 1.25rem', fontFamily: 'Georgia,serif', color: '#1e2d4a', fontSize: '1.1rem', fontWeight: 'bold' }}>
          Select a Topic
        </h3>

        {topicsError && <p style={{ color: '#7b2020', fontSize: '0.875rem', margin: '0 0 1rem' }}>{topicsError}</p>}

        {/* Category tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
          {CATEGORIES.map(cat => {
            const active = selCategory === cat.value;
            const n      = countCat(cat.value);
            return (
              <button
                key={cat.value}
                onClick={() => { setSelCategory(cat.value); setSelectedTopic(null); setFilter('not-created'); reset(); }}
                style={{
                  padding: '0.4rem 0.9rem', borderRadius: '2rem', border: '1px solid #d4c5a9',
                  background: active ? '#1e2d4a' : '#f9f5ee',
                  color:      active ? '#fff'    : '#5a4a35',
                  fontWeight: active ? '700'     : '500',
                  fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                }}
              >
                {cat.label}
                {!topicsLoading && (
                  <span style={{
                    background: active ? 'rgba(255,255,255,0.25)' : '#e8dfc8',
                    color:      active ? '#fff' : '#8b7355',
                    borderRadius: '1rem', fontSize: '0.72rem', fontWeight: '700',
                    padding: '0.05rem 0.45rem',
                  }}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter pills */}
        {!topicsLoading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.1rem' }}>
            {[
              { key: 'all',         label: 'All',         count: catTopics.length },
              { key: 'not-created', label: 'Not Created',  count: catTopics.filter(t => !t.article_created).length },
              { key: 'created',     label: '✔ Created',    count: catTopics.filter(t =>  t.article_created).length },
              { key: 'pillars',     label: '★ Pillars',    count: catTopics.filter(t =>  t.is_pillar).length },
            ].map(f => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    padding: '0.3rem 0.8rem', borderRadius: '2rem',
                    border: active ? '2px solid #1e2d4a' : '1px solid #d4c5a9',
                    background: active ? '#1e2d4a' : '#fff',
                    color:      active ? '#fff'    : '#5a4a35',
                    fontWeight: active ? '700'     : '500',
                    fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}
                >
                  {f.label}
                  <span style={{
                    background: active ? 'rgba(255,255,255,0.25)' : '#f0ece4',
                    color:      active ? '#fff' : '#8b7355',
                    borderRadius: '1rem', fontSize: '0.7rem', fontWeight: '700',
                    padding: '0.05rem 0.4rem',
                  }}>
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Topic pills */}
        {topicsLoading && <p style={{ color: '#aaa', fontSize: '0.875rem', margin: 0 }}>Loading topics…</p>}

        {!topicsLoading && visibleTopics.length === 0 && (
          <p style={{ color: '#8b7355', fontSize: '0.875rem', margin: 0 }}>
            No topics match this filter.
          </p>
        )}

        {!topicsLoading && visibleTopics.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {visibleTopics.map(t => {
              const active = selectedTopic?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTopic(t)}
                  style={{
                    padding: '0.45rem 1rem', borderRadius: '2rem',
                    border: active ? '2px solid #1e2d4a' : '1px solid #d4c5a9',
                    background: active ? '#1e2d4a' : t.article_created ? '#f0fdf4' : '#fff',
                    color:      active ? '#fff'    : t.article_created ? '#166534' : '#1e2d4a',
                    fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? '700' : '400',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.article_created && !active && <span style={{ marginRight: '0.3rem', fontSize: '0.78rem' }}>✔</span>}
                  {t.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Generate form (only when topic selected) ── */}
      {selectedTopic && !saved && (
        <div style={S.card}>
          <div style={{ marginBottom: '1rem', padding: '0.65rem 1rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#0369a1' }}>
            <strong>Generating for:</strong> {selectedTopic.name}
            <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', color: '#6b6b6b' }}>({selectedTopic.category})</span>
            {selectedTopic.article_created && (
              <span style={{ marginLeft: '0.75rem', color: '#15803d', fontWeight: '600', fontSize: '0.82rem' }}>✔ Article already created</span>
            )}
          </div>

          <form onSubmit={handleGenerate}>
            {/* Article Ideas panel */}
            <div style={{ background: '#faf7ee', border: '1px solid #e8dfc8', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontWeight: '700', color: '#1e2d4a', fontSize: '0.88rem' }}>
                  💡 Article Ideas
                  {ideas.length > 0 && (
                    <span style={{ marginLeft: '0.5rem', background: '#ede9fe', color: '#4c1d95', fontSize: '0.72rem', padding: '0.1rem 0.45rem', borderRadius: '1rem', fontWeight: '700' }}>
                      {ideas.length}
                    </span>
                  )}
                </span>
                <button
                  type="button" onClick={handleGenerateIdeas}
                  disabled={generatingIdeas || ideasLoading}
                  style={{ ...S.btnIdeas, opacity: (generatingIdeas || ideasLoading) ? 0.6 : 1 }}
                >
                  {generatingIdeas ? '⟳ Generating…' : '✦ Generate Ideas'}
                </button>
              </div>
              {ideasLoading && <p style={{ margin: 0, color: '#aaa', fontSize: '0.8rem' }}>Loading ideas…</p>}
              {ideasError   && <p style={{ margin: 0, color: '#7b2020', fontSize: '0.8rem' }}>{ideasError}</p>}
              {!ideasLoading && !ideasError && ideas.length === 0 && (
                <p style={{ margin: 0, color: '#8b7355', fontSize: '0.8rem' }}>
                  No ideas yet for <strong>{selectedTopic.name}</strong> — click "Generate Ideas" to create some.
                </p>
              )}
              {!ideasLoading && ideas.length > 0 && (
                <ul style={{ margin: '0.5rem 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {ideas.map(item => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => { setIdea(item.title); setUsedIdeaId(item.id); }}
                        style={{
                          width: '100%', textAlign: 'left', padding: '0.45rem 0.75rem',
                          border: `1px solid ${usedIdeaId === item.id ? '#90caf9' : '#e8dfc8'}`,
                          borderRadius: '0.4rem',
                          background: usedIdeaId === item.id ? '#e8f4fd' : '#fff',
                          cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
                          color: '#1e2d4a', fontWeight: usedIdeaId === item.id ? '600' : '400',
                        }}
                      >
                        {usedIdeaId === item.id && <span style={{ color: '#1565c0', marginRight: '0.4rem' }}>✓</span>}
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Content idea input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={S.label} htmlFor="idea-input">
                Content Idea{' '}
                <span style={{ fontWeight: 400, color: '#8b7355' }}>(optional — pick one above or type your own)</span>
              </label>
              <input
                id="idea-input" type="text" value={idea}
                onChange={e => { setIdea(e.target.value); setUsedIdeaId(null); }}
                placeholder="e.g. how to forgive someone, overcoming doubt"
                style={S.input}
              />
            </div>

            {duplicate && (
              <div style={{
                background: '#fffbeb', border: '1px solid #fde68a', color: '#854d0e',
                borderRadius: '0.5rem', padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.9rem',
              }}>
                <p style={{ margin: '0 0 0.4rem', fontWeight: '700' }}>
                  {duplicate.kind === 'PUBLISHED_SLUG_EXISTS'
                    ? 'That slug is used by a PUBLISHED article'
                    : 'A PUBLISHED article already covers this topic'}
                </p>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
                  Live content is never overwritten. Open the Articles tab to edit the existing one, or unpublish it first to regenerate.
                </p>
                {duplicate.existingArticle ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
                    <strong style={{ color: '#1e2d4a' }}>{duplicate.existingArticle.title}</strong>
                    {duplicate.existingArticle.category && (
                      <span style={{
                        padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.72rem', fontWeight: '700',
                        background: '#f0ece4', color: '#5a4a35',
                      }}>
                        {categoryLabel(duplicate.existingArticle.category)}
                      </span>
                    )}
                    <span style={{
                      padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.72rem', fontWeight: '700',
                      background: duplicate.existingArticle.status === 'published' ? '#dcf5e7' : '#fff3cd',
                      color:      duplicate.existingArticle.status === 'published' ? '#1b5e20' : '#856404',
                    }}>
                      {duplicate.existingArticle.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                    {duplicate.existingArticle.language && (
                      <span style={{
                        padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.72rem', fontWeight: '700',
                        background: '#e8f4fd', color: '#1565c0',
                      }}>
                        {languageLabel(duplicate.existingArticle.language)}
                      </span>
                    )}
                    {duplicate.existingArticle.id && (
                      <a
                        href={`/admin/#articles?article_id=${encodeURIComponent(duplicate.existingArticle.id)}`}
                        style={{ color: '#1e2d4a', textDecoration: 'underline', fontWeight: '600' }}
                      >
                        Edit in admin →
                      </a>
                    )}
                    {existingArticlePublicUrl(duplicate.existingArticle) && duplicate.existingArticle.status === 'published' && (
                      <a
                        href={existingArticlePublicUrl(duplicate.existingArticle)}
                        target="_blank" rel="noreferrer"
                        style={{ color: '#5a4a35', textDecoration: 'underline', fontWeight: '500', fontSize: '0.82rem' }}
                      >
                        View live ↗
                      </a>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#92400e' }}>
                    Find it in the Articles tab to edit or delete it.
                  </p>
                )}
              </div>
            )}

            {error && <div style={S.errBox}>{error}</div>}

            <button type="submit" disabled={generating} style={{ ...S.btnPrimary, opacity: generating ? 0.6 : 1 }}>
              {generating ? '⟳ Generating…' : '✦ Generate Article'}
            </button>
          </form>
        </div>
      )}

      {/* Generating indicator */}
      {generating && (
        <div style={{ ...S.card, textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>✦</p>
          <p style={{ color: '#8b7355', margin: 0 }}>Writing article — usually 15–25 seconds…</p>
        </div>
      )}

      {/* Preview */}
      {preview && !generating && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#b8860b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Preview — not saved yet
              </span>
              <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '1.25rem', color: '#1e2d4a', margin: '0.4rem 0 0', lineHeight: 1.3 }}>
                {preview.title}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleSave(false)}
                disabled={saving || !!duplicate}
                title={duplicate ? 'Resolve the duplicate above before saving' : ''}
                style={{ ...S.btnGhost, opacity: (saving || duplicate) ? 0.5 : 1, cursor: (saving || duplicate) ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Saving…' : '📄 Save Draft'}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving || !!duplicate}
                title={duplicate ? 'Resolve the duplicate above before publishing' : ''}
                style={{ ...S.btnGold, opacity: (saving || duplicate) ? 0.5 : 1, cursor: (saving || duplicate) ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Saving…' : '✓ Publish'}
              </button>
              <button onClick={reset} style={S.btnGhost}>Discard</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={S.metaBox}>
              <p style={S.metaLabel}>Meta Title ({preview.meta_title?.length || 0} chars)</p>
              <p style={S.metaVal}>{preview.meta_title}</p>
            </div>
            <div style={S.metaBox}>
              <p style={S.metaLabel}>Meta Description ({preview.meta_description?.length || 0} chars)</p>
              <p style={S.metaVal}>{preview.meta_description}</p>
            </div>
          </div>

          {preview.keywords?.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={S.metaLabel}>Keywords</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                {preview.keywords.map((k, i) => (
                  <span key={i} style={{ background: '#e8f4fd', color: '#1565c0', fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', border: '1px solid #bfdbfe' }}>
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {preview._validation && (
            <div style={{
              marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.85rem',
              background: preview._validation.unverified?.length ? '#fffbeb' : '#f0fdf4',
              border: preview._validation.unverified?.length ? '1px solid #fde68a' : '1px solid #bbf7d0',
              color: preview._validation.unverified?.length ? '#854d0e' : '#166534',
            }}>
              {preview._validation.checked === 0
                ? '📖 No Bible references detected in this draft — verify manually before publishing.'
                : preview._validation.unverified?.length === 0
                  ? `✓ Bible grounding: all ${preview._validation.verified} reference(s) verified against the KJV source.`
                  : `⚠ Bible grounding: ${preview._validation.verified}/${preview._validation.checked} reference(s) verified. Could not verify: ${preview._validation.unverified.join(', ')} — check these manually before publishing.`}
            </div>
          )}

          <details>
            <summary style={{ cursor: 'pointer', color: '#8b7355', fontSize: '0.85rem', userSelect: 'none', padding: '0.5rem 0' }}>
              Content Preview
            </summary>
            <div
              style={{ marginTop: '0.75rem', padding: '1.25rem', background: '#faf7f2', borderRadius: '0.5rem', border: '1px solid #e8dfc8', maxHeight: '400px', overflowY: 'auto', fontSize: '0.875rem', lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: preview.content || '' }}
            />
          </details>
        </div>
      )}

    </div>
  );
}
// step0-rebuild-marker

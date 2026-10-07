'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const MIGRATION_SQL = `ALTER TABLE articles ADD COLUMN IF NOT EXISTS exported BOOLEAN NOT NULL DEFAULT false;`;

const NAV_STYLE = {
  background: '#1e2d4a',
  color: 'white',
  padding: '1rem 1.5rem',
  display: 'flex',
  alignItems: 'center',
  gap: '1.5rem',
  flexWrap: 'wrap',
};

const BTN = {
  base: {
    padding: '0.55rem 1.1rem',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontFamily: 'Georgia, serif',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  primary: { background: '#1e2d4a', color: 'white' },
  green:   { background: '#15803d', color: 'white' },
  danger:  { background: '#b91c1c', color: 'white' },
  outline: { background: 'white', color: '#1e2d4a', border: '1px solid #d1d5db' },
};

function btn(variant) { return { ...BTN.base, ...BTN[variant] }; }

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NewUrlsPage() {
  const [rows, setRows]               = useState([]);
  const [count, setCount]             = useState(0);
  const [filter, setFilter]           = useState('all');
  // 'new' (default): exported = false only — original behaviour.
  // 'all'          : full history including already-exported URLs.
  const [state, setState]             = useState('new');
  const [loading, setLoading]         = useState(true);
  const [missingColumn, setMissing]   = useState(false);
  const [error, setError]             = useState('');
  const [copying, setCopying]         = useState(false);
  const [copyDone, setCopyDone]       = useState(false);
  const [marking, setMarking]         = useState(false);
  const [markDone, setMarkDone]       = useState(false);
  const [sqlCopied, setSqlCopied]     = useState(false);

  const load = useCallback(async (f = filter, s = state) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/new-urls?filter=${f}&state=${s}`);
      const json = await res.json();
      if (json.missingColumn) { setMissing(true); setRows([]); setCount(0); }
      else if (json.error)    { setError(json.error); }
      else                    { setMissing(false); setRows(json.data || []); setCount(json.count || 0); }
    } catch { setError('Failed to load. Please refresh.'); }
    finally  { setLoading(false); }
  }, [filter, state]);

  useEffect(() => { load(filter, state); }, [filter, state]);

  function handleFilter(f) { setFilter(f); load(f, state); }
  function handleState(s)  { setState(s);  load(filter, s); }

  async function copyAllUrls() {
    if (!rows.length) return;
    const text = rows.map(r => r.url).join('\n');
    setCopying(true);
    try {
      await navigator.clipboard.writeText(text);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2500);
    } catch { alert('Could not copy. Please select and copy manually.'); }
    finally { setCopying(false); }
  }

  function exportCsv() {
    const header = 'Title,URL,Created Date';
    const lines  = rows.map(r =>
      [
        `"${(r.title || '').replace(/"/g, '""')}"`,
        `"${r.url}"`,
        `"${formatDate(r.created_at)}"`,
      ].join(',')
    );
    const csv  = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `new-urls-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function markExported() {
    if (!rows.length) return;
    // The mark-exported endpoint always flips ALL currently-unexported
    // published rows globally — it does not respect the date filter or
    // the current 'all' view. The confirm text reflects that so the
    // admin doesn't expect "only what's visible" to be marked.
    const unexportedVisible = rows.filter(r => !r.exported).length;
    const msg = state === 'all'
      ? `Mark all unexported URLs as exported globally? ` +
        `(${unexportedVisible} visible here, but every published URL with exported=false will be flipped.) This cannot be undone.`
      : `Mark all ${count} URL${count !== 1 ? 's' : ''} as exported? This cannot be undone.`;
    if (!confirm(msg)) return;
    setMarking(true);
    try {
      const res  = await fetch('/api/admin/mark-exported', { method: 'POST' });
      const json = await res.json();
      if (json.missingColumn) { setMissing(true); }
      else if (json.error)    { alert('Error: ' + json.error); }
      else {
        setMarkDone(true);
        setTimeout(() => setMarkDone(false), 3000);
        load(filter);
      }
    } catch { alert('Request failed. Please try again.'); }
    finally { setMarking(false); }
  }

  async function copySql() {
    try {
      await navigator.clipboard.writeText(MIGRATION_SQL);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2500);
    } catch { alert('Could not copy. Select the SQL text manually.'); }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf7f2', fontFamily: 'Georgia, serif' }}>

      {/* Header nav */}
      <div style={NAV_STYLE}>
        <Link href="/admin/" style={{ color: '#d4a017', textDecoration: 'none', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          ← Admin
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold' }}>
            {state === 'all' ? 'All URLs' : 'New URLs'}
          </h1>
          <p style={{ margin: '0.1rem 0 0', color: '#a8b8cc', fontSize: '0.8rem' }}>
            {state === 'all'
              ? 'All published pages, exported and not'
              : 'Published pages not yet exported'}
          </p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" style={{ ...btn('outline'), fontSize: '0.8rem', background: 'transparent', border: '1px solid #4a6080', color: '#a8b8cc' }}>
            Sign out
          </button>
        </form>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Missing column banner */}
        {missingColumn && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.5rem', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontWeight: '700', color: '#9a3412', fontSize: '0.95rem' }}>
              Database setup required
            </p>
            <p style={{ margin: '0 0 0.75rem', color: '#7c2d12', fontSize: '0.875rem' }}>
              The <code style={{ background: '#fee2e2', padding: '0.1rem 0.3rem', borderRadius: '0.25rem' }}>exported</code> column
              is missing from the articles table. Run this SQL in your{' '}
              <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noreferrer"
                style={{ color: '#9a3412', fontWeight: '600' }}>Supabase SQL Editor</a>:
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <code style={{ background: '#1e2d4a', color: '#d4f0ff', padding: '0.6rem 0.9rem', borderRadius: '0.375rem', fontSize: '0.85rem', flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
                {MIGRATION_SQL}
              </code>
              <button onClick={copySql} style={btn('primary')}>
                {sqlCopied ? '✓ Copied' : 'Copy SQL'}
              </button>
            </div>
            <button onClick={() => load(filter)} style={{ ...btn('outline'), marginTop: '0.75rem', fontSize: '0.8rem' }}>
              Retry after running
            </button>
          </div>
        )}

        {/* Toolbar */}
        {!missingColumn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>

            {/* Count badge */}
            <span style={{ background: '#1e2d4a', color: 'white', borderRadius: '2rem', padding: '0.35rem 0.9rem', fontSize: '0.85rem', fontWeight: '700', whiteSpace: 'nowrap' }}>
              {loading
                ? '…'
                : state === 'all'
                  ? `${count} URL${count !== 1 ? 's' : ''} total`
                  : `${count} new URL${count !== 1 ? 's' : ''}`}
            </span>

            {/* State toggle: New (exported=false) vs All */}
            <div role="group" aria-label="Export state filter" style={{ display: 'flex', gap: '0.4rem' }}>
              {[['new', 'New only'], ['all', 'Show all']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => handleState(val)}
                  aria-pressed={state === val}
                  style={{
                    ...btn('outline'),
                    background:  state === val ? '#15803d' : 'white',
                    color:       state === val ? 'white'   : '#374151',
                    borderColor: state === val ? '#15803d' : '#d1d5db',
                    fontWeight:  state === val ? '700'     : '400',
                    fontSize:    '0.8rem',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Date filter buttons */}
            <div role="group" aria-label="Date range filter" style={{ display: 'flex', gap: '0.4rem' }}>
              {[['all', 'All time'], ['today', 'Today'], ['3days', 'Last 3 days']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => handleFilter(val)}
                  aria-pressed={filter === val}
                  style={{
                    ...btn('outline'),
                    background:  filter === val ? '#1e2d4a' : 'white',
                    color:       filter === val ? 'white'   : '#374151',
                    borderColor: filter === val ? '#1e2d4a' : '#d1d5db',
                    fontWeight:  filter === val ? '700'     : '400',
                    fontSize:    '0.8rem',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
              <button onClick={copyAllUrls} disabled={!rows.length || copying} style={{ ...btn('primary'), opacity: !rows.length ? 0.4 : 1 }}>
                {copyDone ? '✓ Copied!' : copying ? 'Copying…' : 'Copy All URLs'}
              </button>
              <button onClick={exportCsv} disabled={!rows.length} style={{ ...btn('outline'), opacity: !rows.length ? 0.4 : 1 }}>
                Export CSV
              </button>
              <button onClick={markExported} disabled={!rows.length || marking} style={{ ...btn('danger'), opacity: !rows.length ? 0.4 : 1 }}>
                {markDone ? '✓ Marked!' : marking ? 'Marking…' : 'Mark as Exported'}
              </button>
            </div>
          </div>
        )}

        {/* Mark done banner */}
        {markDone && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#15803d', fontSize: '0.875rem', fontWeight: '600' }}>
            ✓ All URLs marked as exported successfully.
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#dc2626', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* Table */}
        {!missingColumn && (
          <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
                Loading…
              </div>
            ) : rows.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{state === 'all' ? '📭' : '🎉'}</div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '1rem', fontWeight: '600' }}>
                  {state === 'all' ? 'No published URLs yet' : 'No new URLs available'}
                </p>
                <p style={{ margin: '0.4rem 0 0', color: '#9ca3af', fontSize: '0.85rem' }}>
                  {state === 'all'
                    ? 'Published articles will appear here once you generate them.'
                    : 'All published pages have been exported.'}
                </p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                    {(state === 'all'
                      ? ['Title', 'URL', 'Created Date', 'Status']
                      : ['Title', 'URL', 'Created Date']
                    ).map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '700', color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.slug} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '0.75rem 1rem', color: '#111827', maxWidth: '20rem' }}>
                        {row.title}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <a href={row.url} target="_blank" rel="noreferrer"
                          style={{ color: '#1d4ed8', textDecoration: 'none', fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                          {row.url}
                        </a>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {formatDate(row.created_at)}
                      </td>
                      {state === 'all' && (
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '1rem',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            background: row.exported ? '#dcf5e7' : '#fff3cd',
                            color:      row.exported ? '#1b5e20' : '#856404',
                          }}>
                            {row.exported ? '✓ Exported' : '● New'}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
// step0-rebuild-marker

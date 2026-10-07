'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Dashboard     from './_components/Dashboard.js';
import SeoDashboard  from './_components/SeoDashboard.js';
import Generator     from './_components/Generator.js';
import BulkGenerator from './_components/BulkGenerator.js';
import Topics        from './_components/Topics.js';
import Articles      from './_components/Articles.js';
import AiAssistant   from './_components/AiAssistant.js';

const TABS = [
  { id: 'dashboard',    label: '📊 Dashboard' },
  { id: 'seo',          label: '📈 SEO' },
  { id: 'articles',     label: '📄 Articles' },
  { id: 'generate',     label: '✦ Generate' },
  { id: 'bulk',         label: '⚡ Bulk Generate' },
  { id: 'topics',       label: '🗂 Topics' },
  { id: 'ai-assistant', label: '🤖 AI Assistant' },
  { id: 'new-urls',     label: '🔗 New URLs', href: '/admin/new-urls/' },
];

const VALID_TABS = new Set(TABS.filter(t => !t.href).map(t => t.id));

// Parse the URL hash like "#articles?article_id=abc" into { tab, params }.
function parseHash(hash) {
  if (!hash) return { tab: null, params: {} };
  const raw = hash.replace(/^#/, '');
  const [tab, qs] = raw.split('?');
  const params = {};
  if (qs) {
    for (const [k, v] of new URLSearchParams(qs)) params[k] = v;
  }
  return { tab: tab || null, params };
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hashParams, setHashParams] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Sync URL hash → state on mount and on hash changes (allows external deep-links
  // such as "/admin/#articles?article_id=xyz" from the Generator duplicate banner).
  useEffect(() => {
    function readHash() {
      const { tab, params } = parseHash(window.location.hash);
      if (tab && VALID_TABS.has(tab)) setActiveTab(tab);
      setHashParams(params);
    }
    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, []);

  function selectTab(id) {
    setActiveTab(id);
    // Replace the hash without reload so the tab is shareable / bookmarkable.
    if (typeof window !== 'undefined') {
      const next = `#${id}`;
      if (window.location.hash !== next) {
        history.replaceState(null, '', next);
        setHashParams({});
      }
    }
  }

  function handleSaved() { setRefreshKey(k => k + 1); }

  return (
    <div style={{ minHeight:'100vh', background:'#faf7f2', fontFamily:'Georgia, serif' }}>
      {/* Header */}
      <div style={{ background:'#1e2d4a', color:'white', padding:'0 1.5rem' }}>
        <div style={{ maxWidth:'72rem', margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'1.25rem', paddingBottom:'0' }}>
          <div>
            <Link href="/" style={{ color:'#d4a017', textDecoration:'none', fontSize:'0.8rem' }}>← Back to site</Link>
            <h1 style={{ margin:'0.25rem 0 0', fontSize:'1.5rem', fontWeight:'bold' }}>Bible Explorer Admin</h1>
            <p style={{ margin:'0.2rem 0 0', color:'#a8b8cc', fontSize:'0.85rem' }}>Content Management & SEO Generator</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              style={{
                background: 'transparent',
                border: '1px solid #4a6080',
                color: '#a8b8cc',
                borderRadius: '0.375rem',
                padding: '0.4rem 0.9rem',
                fontSize: '0.8rem',
                fontFamily: 'Georgia, serif',
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </form>
        </div>

        {/* Tab bar */}
        <div style={{ maxWidth:'72rem', margin:'0 auto', display:'flex', gap:'0', marginTop:'1.25rem', flexWrap:'wrap' }}>
          {TABS.map(tab => {
            const tabStyle = {
              background:   activeTab === tab.id ? '#faf7f2' : 'transparent',
              color:        activeTab === tab.id ? '#1e2d4a' : '#a8b8cc',
              border:       'none',
              borderRadius: '0.5rem 0.5rem 0 0',
              padding:      '0.65rem 1.25rem',
              fontSize:     '0.875rem',
              fontWeight:   activeTab === tab.id ? '700' : '400',
              cursor:       'pointer',
              fontFamily:   'inherit',
              transition:   'all 0.15s',
              textDecoration: 'none',
              display:      'inline-block',
            };
            if (tab.href) {
              return (
                <Link key={tab.id} href={tab.href} style={{ ...tabStyle, color: '#a8b8cc' }}>
                  {tab.label}
                </Link>
              );
            }
            return (
              <button key={tab.id} onClick={() => selectTab(tab.id)} style={tabStyle}>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:'72rem', margin:'0 auto', padding:'2rem 1.5rem' }}>
        {activeTab === 'dashboard' && <Dashboard key={refreshKey} />}
        {activeTab === 'seo'       && <SeoDashboard key={refreshKey} onNavigate={setActiveTab} />}
        {activeTab === 'articles'  && <Articles key={refreshKey} initialArticleId={hashParams.article_id || null} />}
        {activeTab === 'generate'  && <Generator  onSaved={handleSaved} />}
        {activeTab === 'bulk'      && <BulkGenerator onSaved={handleSaved} />}
        {activeTab === 'topics'    && <Topics />}
        {activeTab === 'ai-assistant' && <AiAssistant />}
      </div>
    </div>
  );
}

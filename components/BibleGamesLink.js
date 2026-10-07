'use client';

// External link to the Bible Games site.
// Behavior: open in a NEW tab on desktop (≥ 768px), SAME tab on mobile.
// Renders a plain <a> for SSR/no-JS so SEO and crawlers get a real link;
// JS upgrades the click to open a new window when on desktop.

import { useCallback } from 'react';

const URL = 'https://biblegamesonline.net/';

export default function BibleGamesLink({ children, style, className }) {
  const onClick = useCallback((e) => {
    if (typeof window === 'undefined') return;
    // Only override on non-modifier clicks (let cmd/ctrl-click do its thing).
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const isDesktop =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop) {
      e.preventDefault();
      window.open(URL, '_blank', 'noopener');
    }
    // On mobile, default same-tab navigation.
  }, []);

  return (
    <a
      href={URL}
      onClick={onClick}
      rel="noopener"
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
// step0-rebuild-marker

/**
 * Injects exactly 2 read-more HTML blocks into an HTML string
 * at ~30% and ~65% of the paragraph count.
 *
 * Blocks are plain HTML (no React components) so they work
 * safely inside dangerouslySetInnerHTML.
 */
export function injectMidContentBlocks(html, block1, block2) {
  if (!html || !block1 || !block2) return html || '';

  // Split on </p> to locate paragraph boundaries
  const segments = html.split('</p>');
  const pCount = segments.length - 1; // number of actual </p> closing tags

  // Need at least 4 paragraphs to have meaningful mid-content placement
  if (pCount < 4) return html;

  const idx1 = Math.max(1, Math.floor(pCount * 0.30));
  const idx2 = Math.max(idx1 + 2, Math.floor(pCount * 0.65));

  let result = '';
  for (let i = 0; i < segments.length; i++) {
    if (i < segments.length - 1) {
      result += segments[i] + '</p>';
      if (i === idx1 - 1) result += block1;
      else if (i === idx2 - 1) result += block2;
    } else {
      result += segments[i];
    }
  }
  return result;
}

/**
 * Builds a single read-more block as a raw HTML string.
 * ctaLabel — the CTA phrase without colon (e.g. "Learn more")
 * title    — the descriptive link text
 * href     — the destination URL
 */
export function readMoreBlock(href, ctaLabel, title) {
  return `<div class="read-more"><a href="${href}"><span class="cta-label">${ctaLabel}:</span> ${title}</a></div>`;
}

/**
 * Per-guide mid-content block definitions.
 * Each entry has two blocks: block1 (~30%) and block2 (~65%).
 */
export const GUIDE_MID_BLOCKS = {
  'getting-started-bible-study': [
    readMoreBlock('/topics/faith/', 'Know more', 'What the Bible says about faith — and why it matters for study'),
    readMoreBlock('/questions/what-is-prayer/', 'Understand', 'How prayer and Scripture work together in daily devotion'),
  ],
  'how-to-read-the-psalms': [
    readMoreBlock('/topics/hope/', 'Explore more', 'How the Bible defines hope — and what the Psalms reveal about it'),
    readMoreBlock('/bible-verses-about-prayer/', 'Discover', 'Key verses on prayer found throughout the Psalms'),
  ],
  'praying-through-scripture': [
    readMoreBlock('/topics/prayer/', 'Learn more', 'What the Bible teaches about prayer from Old Testament to New'),
    readMoreBlock('/questions/how-do-i-hear-from-god/', 'Find out', 'How to hear from God through Scripture and prayer'),
  ],
  'sermon-on-the-mount-study-guide': [
    readMoreBlock('/topics/grace/', 'Explore deeper', 'How grace runs through the Sermon on the Mount'),
    readMoreBlock('/bible-verses-about-love/', 'Discover', 'The love passages Jesus references in Matthew 5–7'),
  ],
  'understanding-gospel-of-john': [
    readMoreBlock('/topics/salvation/', 'Know more', 'What the Gospel of John teaches about salvation and eternal life'),
    readMoreBlock('/questions/what-does-it-mean-to-be-born-again/', 'Dive deeper', 'What Jesus meant when He said "you must be born again"'),
  ],
};
// step0-rebuild-marker

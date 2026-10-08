const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_KEY = () => process.env.OPENROUTER_API_KEY || process.env.Open_Router_API;
export const MODEL = 'openai/gpt-4.1-mini';

// ─────────────────────────────────────────────
// TOPIC CLASSIFICATION
// ─────────────────────────────────────────────

const QUESTION_STARTS = [
  'how ', 'why ', 'what ', 'when ', 'who ', 'where ',
  'can ', 'does ', 'should ', 'is ', 'are ', 'will ', 'do ',
];


/**
 * Classify a topic name as 'question' | 'concept'.
 * Person detection is intentionally NOT done from text — it relies solely
 * on the DB category 'bible-characters' to avoid false positives like
 * "Prayer" or "Faith" being treated as people.
 *
 * - question : starts with a question/auxiliary word (how, why, what, …)
 * - concept  : everything else
 */
export function classifyTopic(name = '') {
  const lower = name.toLowerCase().trim();
  if (QUESTION_STARTS.some(s => lower.startsWith(s))) return 'question';
  return 'concept';
}

/**
 * Build the IMPORTANT title/slug hint appended to the AI prompt.
 *
 * Rules (in priority order):
 *  1. bible-characters  → "Who Was X in the Bible?"
 *  2. bible-verses      → "Bible Verses About X"
 *  3. question text     → capitalise and use directly (optionally + "According to the Bible")
 *  4. topics (concept)  → "What Does the Bible Say About X?" or "Bible Verses About X"
 *  5. everything else   → let the AI decide freely
 */
export function buildTitleHint(category, topicName) {
  const name     = topicName.trim();
  const textType = classifyTopic(name);

  if (category === 'bible-characters') {
    return `\nIMPORTANT: title must be exactly "Who Was ${name} in the Bible?" and slug must be "who-was-${sanitiseSlug(name)}-in-the-bible"`;
  }

  if (category === 'bible-verses') {
    return `\nIMPORTANT: title must be exactly "Bible Verses About ${name}" and slug must be "bible-verses-about-${sanitiseSlug(name)}"`;
  }

  if (textType === 'question') {
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    return `\nIMPORTANT: title must be "${capitalized}" or "${capitalized} According to the Bible" — choose whichever reads better for SEO; slug must reflect the chosen title`;
  }

  if (category === 'topics') {
    return `\nIMPORTANT: title must be either "What Does the Bible Say About ${name}?" or "Bible Verses About ${name}" — choose whichever works better for SEO`;
  }

  // guides, teachings, questions category with non-question text, etc. — AI decides
  return '';
}

export function sanitiseSlug(raw = '') {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * For categories with a fixed title/slug format, always enforce them
 * server-side regardless of what the AI returned.
 *
 * Returns { title, slug } that should override the AI-generated values,
 * or null when the category has no strict format (AI value is kept as-is).
 */
export function enforceArticleMeta(category, topicName) {
  const name = (topicName || '').trim();
  if (!name) return null;

  if (category === 'bible-verses') {
    return {
      title: `Bible Verses About ${name}`,
      slug:  `bible-verses-about-${sanitiseSlug(name)}`,
    };
  }

  if (category === 'bible-characters') {
    // Strip common trailing noise that leads to duplicated words in the slug,
    // e.g. "Titus Bible" → "Titus", "Mary in the Bible" → "Mary"
    const cleanName = name
      .replace(/\s+in\s+the\s+bible$/i, '')
      .replace(/\s+bible$/i, '')
      .trim();
    return {
      title: `Who Was ${cleanName} in the Bible?`,
      slug:  `who-was-${sanitiseSlug(cleanName)}-in-the-bible`,
    };
  }

  // For questions / topics / guides / teachings the AI title is acceptable,
  // but we still strip any leading "Who was" / "What is" patterns that
  // shouldn't appear in non-character / non-question copy.
  if (category === 'topics') {
    const lower = name.toLowerCase();
    // Only override if the AI somehow returned a Who/What pattern for a plain concept
    // (this is a safety net — the AI usually handles this correctly)
    return null;
  }

  return null;
}

// Slug-suffixing is forbidden under the strict "1 topic = 1 article" rule.
// This helper is intentionally neutered — it never appends "-2", "-3", etc.
// Callers must check slug collisions themselves and reject (409) on conflict
// rather than silently creating a variant slug.
export function uniqueSlug(base, _existingSet) {
  return base;
}

/**
 * For categories with predictable title/slug formats, returns every slug the
 * AI is allowed to produce so the generate route can pre-check for collisions
 * BEFORE wasting an OpenRouter call.
 *
 * Decision order MUST mirror buildTitleHint() exactly:
 *   1. bible-characters → enforced "who-was-<cleanName>-in-the-bible"
 *   2. bible-verses     → enforced "bible-verses-about-<name>"
 *   3. question text    → "<base>" or "<base>-according-to-the-bible" (regardless of category)
 *   4. topics + concept → "what-does-the-bible-say-about-<base>" or "bible-verses-about-<base>"
 *   5. everything else  → AI is freeform → return [] (cannot pre-check)
 */
export function candidateSlugs(category, topicName) {
  const name = (topicName || '').trim();
  if (!name) return [];

  // 1. bible-characters — enforced server-side, so the FINAL slug always uses
  //    cleanName regardless of what the prompt hint says.
  if (category === 'bible-characters') {
    const cleanName = name
      .replace(/\s+in\s+the\s+bible$/i, '')
      .replace(/\s+bible$/i, '')
      .trim();
    const cleaned = `who-was-${sanitiseSlug(cleanName)}-in-the-bible`;
    const raw     = `who-was-${sanitiseSlug(name)}-in-the-bible`;
    // Include both so we also catch legacy articles saved before the cleanName
    // enforcement was introduced.
    return cleaned === raw ? [cleaned] : [cleaned, raw];
  }

  // 2. bible-verses — enforced server-side, single deterministic slug.
  if (category === 'bible-verses') {
    return [`bible-verses-about-${sanitiseSlug(name)}`];
  }

  // 3. question-style topic text — the question rule fires for ANY category
  //    other than bible-characters/bible-verses, per buildTitleHint().
  const textType = classifyTopic(name);
  if (textType === 'question') {
    const base = sanitiseSlug(name);
    if (!base) return [];
    return [base, `${base}-according-to-the-bible`];
  }

  // 4. topics category with concept text — two predictable formats.
  if (category === 'topics') {
    const base = sanitiseSlug(name);
    if (!base) return [];
    return [`what-does-the-bible-say-about-${base}`, `bible-verses-about-${base}`];
  }

  // 5. guides, teachings, questions-with-non-question-text, etc. → AI freeform.
  return [];
}

const BANNED_PHRASES = `BANNED PHRASES — never use any of these:
- "In today's world" / "In today's fast-paced world" / "In a world where"
- "It's important to note" / "It is worth noting" / "It goes without saying"
- "As we can see" / "As mentioned above" / "As previously discussed"
- "Delve into" / "Dive into" / "Embark on" / "Journey into"
- "Let's explore" / "Let's dive" / "Let's look at"
- "Transformative" / "Game-changer" / "Holistic" / "Robust"
- "At the end of the day" / "The bottom line is"
- "Furthermore, it is" / "Moreover, it is" / "Additionally, it should be noted"
- Passive openers like "Faith is important." or "Prayer matters."
- Filler closers like "May God bless you on your journey."
- Any sentence that just restates the topic without adding meaning`;

const KEYWORD_VARIATION_RULES = `KEYWORD VARIATION — follow strictly:
- faith / trust in God / belief / confidence in God / reliance on Him — rotate, never repeat the same word in adjacent paragraphs
- fear / anxiety / worry / doubt / dread — vary naturally through the piece
- prayer / praying / talking with God / seeking God / turning to Him — mix organically
- love / compassion / care / kindness / grace — alternate throughout
- forgiveness / mercy / releasing bitterness / letting go — use varied phrasing
- The primary topic keyword appears at most 2–3 times total. Spread synonyms through the rest. Never keyword-stuff.`;

const HUMAN_WRITING_RULES = `HUMAN WRITING RULES — mandatory:
1. Open with something concrete: a scenario, a honest question, a short story beat, or a struggle — never a definition or generic statement
2. Use contractions naturally (it's, you're, we've, isn't, didn't, won't) — a human wrote this
3. Vary sentence length deliberately — short punchy sentences. Then a longer one that builds an idea with more texture and nuance. Then short again.
4. Speak directly to the reader: "you", "your", "we", "us" — not "one" or "Christians"
5. Each paragraph must introduce one distinct idea — no padding, no summarising the previous paragraph
6. Bible verses: when directly quoting a verse, format it as a blockquote: <blockquote>"Verse text here." (Book Chapter:Verse)</blockquote> — then unpack what it means in context in the following paragraph
7. Include at least one honest acknowledgement of difficulty — faith is hard sometimes; acknowledge it
8. Avoid ending sections with a tidy bow — real life is messier; close with something to sit with
9. Never start two consecutive paragraphs with the same word
10. The conclusion must not begin with "In conclusion" or "To sum up"`;

const PRACTICAL_VALUE_RULES = `PRACTICAL VALUE — every article must include:
- A section (or paragraph) titled or themed "What This Means for You" — specific, not generic
- A section (or paragraph) themed "How to Apply This" — concrete steps, not vague encouragement
- At least one real-life example or scenario that a reader can recognise themselves in`;

const HTML_RULES = `HTML OUTPUT RULES — mandatory:
- Use only these tags: p, h2, h3, ul, ol, li, strong, blockquote
- Do NOT use h1 (the page title serves as h1)
- Do NOT use markdown — no asterisks, no #, no **bold**
- All double-quotes inside the JSON content field must be escaped as \\"
- No broken HTML — every opened tag must be closed
- No inline styles or class attributes
- Quoted Bible verses must use: <blockquote>"Verse text." (Book Chapter:Verse)</blockquote>
- Unquoted verse references inline: e.g. Romans 8:28`;

export function getPrompt(category, topic, idea) {
  const input = (idea && idea.trim()) ? idea.trim() : topic;

  // ─────────────────────────────────────────────
  // QUESTIONS
  // ─────────────────────────────────────────────
  if (category === 'questions') {
    return `Write a Christian article answering this question: "${input}"

LENGTH: 1000–1100 words of body content (HTML paragraphs, not counting headings)

OPENING (choose ONE style — do not use the same style every time):
Option A — Start with a relatable scenario: paint a brief, specific moment a reader might recognise
Option B — Start with an honest, searching question that the article will answer genuinely
Option C — Start with a short, striking observation that reframes how the reader sees the topic

STRUCTURE (use <h2> and <h3> for headings, <p> for paragraphs, <ul>/<li> for lists, <strong> for key phrases):
1. Hook opening — 1–2 paragraphs, no heading, draws the reader in
2. <h2>The Direct Answer</h2> — concrete, not hedged; cite at least one specific Bible verse and explain what it actually means
3. <h2>What the Bible Really Says</h2> — 2–3 paragraphs unpacking relevant Scripture in context
4. <h2>What This Means for You</h2> — specific application to real life
5. <h2>How to Apply This</h2> — 3–4 practical steps, grounded in Scripture; include a brief real-life example for at least one step
6. Closing paragraph — no heading; end with something honest and open, not a tidy platitude

${KEYWORD_VARIATION_RULES}

${HUMAN_WRITING_RULES}

${PRACTICAL_VALUE_RULES}

${HTML_RULES}

${BANNED_PHRASES}`;
  }

  // ─────────────────────────────────────────────
  // GUIDES
  // ─────────────────────────────────────────────
  if (category === 'guides') {
    return `Write a detailed Christian guide: "${input}"

LENGTH: 1300–1500 words of body content

OPENING (choose ONE style — rotate across articles):
Option A — Open with a problem the reader is trying to solve: be specific about the frustration or gap
Option B — Open with a short narrative scene that makes the topic feel urgent and real
Option C — Open with a counterintuitive statement that challenges a common assumption about the topic

STRUCTURE (use <h2>/<h3>, <p>, <ol>/<li>, <ul>/<li>, <strong>):
1. Hook introduction — 2 paragraphs, no heading; establish what problem this guide solves and why it matters
2. <h2>Why This Matters</h2> — brief theological grounding; connect the topic to something the reader already cares about; 1 Bible verse with real explanation
3. <h2>Step-by-Step Guide</h2> — 5–7 numbered steps (<ol>); each step has a clear action title in <strong>, 2–3 sentences explaining it, a Bible reference, and for at least 2 steps: a concrete real-life example
4. <h2>What This Looks Like in Practice</h2> — a short narrative showing someone walking through the guide; make it feel real, not hypothetical
5. <h2>Common Pitfalls to Avoid</h2> — 2–3 honest mistakes people make; frame with empathy, not judgment
6. Closing paragraph — no heading; end with encouragement that feels earned, not formulaic

${KEYWORD_VARIATION_RULES}

${HUMAN_WRITING_RULES}

${PRACTICAL_VALUE_RULES}

${HTML_RULES}

${BANNED_PHRASES}`;
  }

  // ─────────────────────────────────────────────
  // TOPICS
  // ─────────────────────────────────────────────
  if (category === 'topics') {
    return `Write an in-depth Christian article about the topic: "${input}"

LENGTH: 1200–1400 words of body content

OPENING (choose ONE style — vary across articles):
Option A — Open with a brief real scenario where this topic becomes personally relevant
Option B — Open with a theological tension or common misconception about this topic
Option C — Open with an honest question that people struggle with about this topic

STRUCTURE (use <h2>/<h3>, <p>, <ul>/<li>, <strong>):
1. Hook opening — 1–2 paragraphs, no heading; draw the reader in with a relatable angle
2. <h2>What Is ${input}?</h2> — clear, jargon-free definition; what the word or concept actually means in a biblical and everyday sense
3. <h2>${input} in the Bible</h2> — explore the concept across both Testaments; cite 2–4 key passages; explain each verse in its context (not just as a quote); note any progression from Old to New Testament
4. <h2>Key Teachings on ${input}</h2> — what Christian theology has understood about this topic; 2–3 clear takeaways grounded in Scripture; include at least one <h3> subsection if the topic has multiple dimensions
5. <h2>What This Means for You</h2> — specific, personal: how does understanding this topic change how you live, pray, relate to God, or treat others today?
6. <h2>How to Apply This</h2> — 3–4 concrete practices or mindset shifts, each with a Scripture backing; include at least one real-life example someone can picture themselves in
7. Closing paragraph — no heading; end with a reflection or honest acknowledgement, not a summary

${KEYWORD_VARIATION_RULES}

${HUMAN_WRITING_RULES}

${PRACTICAL_VALUE_RULES}

${HTML_RULES}

${BANNED_PHRASES}`;
  }

  // ─────────────────────────────────────────────
  // BIBLE VERSES
  // ─────────────────────────────────────────────
  if (category === 'bible-verses') {
    return `Write a comprehensive Bible verse reference article.

TITLE REQUIREMENT: The title MUST follow this format exactly: "Bible Verses About ${topic}"
SLUG REQUIREMENT: The slug MUST follow this format: "bible-verses-about-${sanitiseSlug(topic)}"

LENGTH: 1500–2000 words of body content

CONTENT RULES — STRICT:
- This is a VERSE-BASED article ONLY — do NOT write a how-to guide, devotional, or step-by-step content
- Include 20–40 Bible verses, all in KJV (King James Version)
- Every verse must be formatted as: <blockquote>"Verse text here." (Book Chapter:Verse)</blockquote>
- After each verse (or small group of thematically related verses), write 2–4 sentences of explanation covering:
  * What the verse means in its original context
  * How it applies to the reader's life today
  * Any key word or phrase worth unpacking

STRUCTURE (use <h2>/<h3>, <p>, <blockquote>):
1. Opening paragraph — 1–2 sentences introducing what this collection of verses covers; why these verses matter; no heading
2. Group verses into 3–6 themed <h2> sections (e.g. <h2>Verses About God's Promise</h2>, <h2>Verses About Strength</h2>)
3. Within each section, present each verse as a blockquote followed by explanation paragraph(s)
4. <h2>How to Use These Verses</h2> — brief practical section: how to meditate on, memorise, or pray through these verses; 1 short paragraph per suggestion
5. Closing paragraph — no heading; 2–3 sentences drawing the collection together; honest and grounding, not triumphant

${HTML_RULES}

${BANNED_PHRASES}`;
  }

  // ─────────────────────────────────────────────
  // BIBLE CHARACTERS
  // ─────────────────────────────────────────────
  if (category === 'bible-characters') {
    return `Write a complete Bible character profile article.

TITLE REQUIREMENT: The title MUST follow this format exactly: "Who Was ${topic} in the Bible?"
SLUG REQUIREMENT: The slug MUST follow this format: "who-was-${sanitiseSlug(topic)}-in-the-bible"

LENGTH: 1300–1600 words of body content

STRUCTURE (use <h2>/<h3>, <p>, <ul>/<li>, <strong>):
1. Opening paragraph — no heading; 2–3 sentences introducing ${topic} and why their story matters; grab the reader's attention with something specific about this person
2. <h2>Who Was ${topic}?</h2> — brief biographical overview: who they were, when they lived, their role in Scripture, their social or family context
3. <h2>The Life of ${topic}: Key Events</h2> — chronological or thematic walkthrough of the major events in their life; cite specific Bible passages for each event (Book Chapter:Verse); for key events, include a blockquote of a key verse then explain its significance; use <h3> for individual events if there are 3 or more
4. <h2>What We Learn from ${topic}</h2> — 3–4 concrete spiritual lessons drawn from their life; each lesson grounded in a specific event or Scripture; avoid generic "we should have faith" — be specific to this person's story
5. <h2>The Spiritual Significance of ${topic}</h2> — theological reflection: how does this character's life point to larger biblical themes, or prefigure Christ (if applicable)?; what does their story reveal about God's character?
6. <h2>What This Means for You</h2> — personal application: which aspect of ${topic}'s story most speaks to someone struggling today?; be direct and specific
7. Closing paragraph — no heading; end with an honest, grounded reflection; not a summary

${HUMAN_WRITING_RULES}

${HTML_RULES}

${BANNED_PHRASES}`;
  }

  // ─────────────────────────────────────────────
  // TEACHINGS (legacy) + fallback
  // ─────────────────────────────────────────────
  if (category === 'teachings') {
    return `Write a deep Christian teaching article: "${input}"

LENGTH: 1300–1500 words of body content

OPENING (choose ONE style — vary across articles):
Option A — Open with a historical or biblical moment that crystallises the teaching
Option B — Open with a theological tension or paradox that the article will resolve
Option C — Open with a question the church has wrestled with that makes the teaching feel alive today

STRUCTURE (use <h2>/<h3>, <p>, <ul>/<li>, <strong>):
1. Hook opening — 2 paragraphs, no heading; frame why this teaching is worth understanding now
2. <h2>The Biblical Foundation</h2> — 2–3 paragraphs; cite 2–3 key verses in their original context
3. <h2>Historical and Theological Context</h2> — how the church has understood this teaching; 1–2 paragraphs
4. <h2>What It Actually Means</h2> — plain-language explanation of what this teaching says about God, humans, and their relationship
5. <h2>What This Means for You</h2> — specific, personal application
6. <h2>How to Live This Out</h2> — 3–4 practical applications, each grounded in the teaching itself
7. Closing paragraph — no heading; end with a reflection or question to sit with

${KEYWORD_VARIATION_RULES}

${HUMAN_WRITING_RULES}

${PRACTICAL_VALUE_RULES}

${HTML_RULES}

${BANNED_PHRASES}`;
  }

  return `Write a helpful, in-depth Christian article about "${input}".

LENGTH: 1000–1200 words

Open with a hook that earns the reader's attention. Structure clearly with an introduction, biblical explanation, practical application ("What This Means for You"), and a genuine closing thought.

${KEYWORD_VARIATION_RULES}

${HUMAN_WRITING_RULES}

${PRACTICAL_VALUE_RULES}

${HTML_RULES}

${BANNED_PHRASES}`;
}

export async function callOpenRouter(messages, { json = true, maxTokens = 6000, timeoutMs = 120000, retries = 1 } = {}) {
  const apiKey = OPENROUTER_KEY();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  const body = {
    model:      MODEL,
    messages,
    max_tokens: maxTokens,
  };
  if (json) body.response_format = { type: 'json_object' };

  // Reliability: per-request timeout + one automatic retry on transient
  // failures (429 rate-limit, 5xx, network/timeout). Non-transient errors
  // (4xx) surface immediately.
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization:  `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://bibleverseinsights.com',
          'X-Title':      'Bible Verse Insights',
        },
        body: JSON.stringify(body),
      });

      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        lastError = new Error(`OpenRouter ${res.status} — retrying`);
        continue;
      }
      if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);

      const data    = await res.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      const finish  = data.choices?.[0]?.finish_reason ?? '';

      if (!content) throw new Error('OpenRouter returned empty content');

      // Detect truncation: finish_reason === 'length' means the model hit max_tokens mid-output.
      // With JSON mode this always produces an unterminated string / invalid JSON.
      if (finish === 'length') {
        throw new Error(
          `Response truncated (finish_reason=length). ` +
          `The model ran out of tokens before completing the JSON. ` +
          `Consider shortening the prompt or increasing max_tokens.`
        );
      }

      return content;
    } catch (e) {
      if (e.name === 'AbortError') lastError = new Error('Generation timed out — please retry.');
      else lastError = e;
      if (attempt >= retries) throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error('Generation failed — please retry.');
}
// step0-rebuild-marker

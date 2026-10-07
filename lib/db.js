import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { topicContent, questionContent, guideAdditions } from './content.js';

const require = createRequire(import.meta.url);

function resolveDbPath() {
  const preferred = path.join(process.cwd(), 'data', 'content.db');
  try {
    fs.mkdirSync(path.dirname(preferred), { recursive: true });
    const probe = path.join(path.dirname(preferred), '.write-probe');
    fs.writeFileSync(probe, '');
    fs.unlinkSync(probe);
    return preferred;
  } catch {
    return '/tmp/bible-explorer.db';
  }
}

function getDb() {
  if (globalThis.__sqlite_db) return globalThis.__sqlite_db;

  const DB_PATH = resolveDbPath();
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      content TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      content TEXT,
      topic_id INTEGER REFERENCES topics(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS guides (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      content TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bible_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      overview TEXT,
      context TEXT,
      application TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(book, chapter)
    );

    CREATE TABLE IF NOT EXISTS verses (
      id INTEGER PRIMARY KEY,
      reference TEXT NOT NULL,
      text TEXT NOT NULL,
      explanation TEXT,
      topic_id INTEGER REFERENCES topics(id)
    );
  `);

  // Add content column to topics if it doesn't exist (migration for existing DBs)
  try { db.exec('ALTER TABLE topics ADD COLUMN content TEXT'); } catch {}

  seedIfEmpty(db);
  seedVersesIfEmpty(db);
  seedSampleTopicsIfMissing(db);
  seedSampleQuestionsIfMissing(db);
  upgradeExpandedContent(db);

  globalThis.__sqlite_db = db;
  return db;
}

function seedIfEmpty(db) {
  const count = db.prepare('SELECT COUNT(*) as c FROM topics').get().c;
  if (count > 0) return;

  const contentPath = path.join(process.cwd(), 'data', 'content.json');
  const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));

  const insertTopic = db.prepare('INSERT OR IGNORE INTO topics (id, title, slug, description) VALUES (?, ?, ?, ?)');
  const insertQuestion = db.prepare('INSERT OR IGNORE INTO questions (id, title, slug, content, topic_id) VALUES (?, ?, ?, ?, ?)');
  const insertGuide = db.prepare('INSERT OR IGNORE INTO guides (id, title, slug, content) VALUES (?, ?, ?, ?)');
  const insertNote = db.prepare(`
    INSERT OR IGNORE INTO bible_notes (book, chapter, overview, context, application)
    VALUES (?, ?, ?, ?, ?)
  `);

  const seedAll = db.transaction(() => {
    for (const t of content.topics) {
      insertTopic.run(t.id, t.title, t.slug, t.description);
    }
    for (const q of content.questions) {
      insertQuestion.run(q.id, q.title, q.slug, q.content, q.topicId || null);
    }
    for (const g of content.guides) {
      insertGuide.run(g.id, g.title, g.slug, g.content);
    }
    for (const b of content.bibleExplanations) {
      insertNote.run(b.book, b.chapter, b.overview, b.context, b.application);
    }
  });

  seedAll();
}

function seedVersesIfEmpty(db) {
  const count = db.prepare('SELECT COUNT(*) as c FROM verses').get().c;
  if (count > 0) return;

  const firstTopic = db.prepare('SELECT id FROM topics ORDER BY id LIMIT 1').get();
  if (!firstTopic) return;

  const insert = db.prepare(
    'INSERT OR IGNORE INTO verses (reference, text, explanation, topic_id) VALUES (?, ?, ?, ?)'
  );

  const seed = db.transaction(() => {
    insert.run(
      'John 3:16',
      'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
      'The most quoted verse in the Bible, summarising the gospel message of salvation through faith in Christ.',
      firstTopic.id
    );
    insert.run(
      'Romans 8:28',
      'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
      'A promise of God\'s sovereignty, assuring believers that every circumstance — even suffering — serves His redemptive plan.',
      firstTopic.id
    );
  });

  seed();
}

function seedSampleTopicsIfMissing(db) {
  const sampleTopics = [
    {
      title: 'Patience',
      slug: 'patience',
      description: 'Learn what the Bible teaches about patience, waiting on God, and enduring trials with faith.',
    },
    {
      title: 'Faith',
      slug: 'faith',
      description: 'Discover the meaning of faith in the Bible and how to trust God in every situation.',
    },
    {
      title: 'Love',
      slug: 'love',
      description: 'Explore biblical teachings about love, including God\'s love and how we should love others.',
    },
  ];

  const insert = db.prepare(
    'INSERT OR IGNORE INTO topics (title, slug, description) VALUES (?, ?, ?)'
  );

  const seedAll = db.transaction(() => {
    for (const t of sampleTopics) {
      insert.run(t.title, t.slug, t.description);
    }
  });

  seedAll();
}

function seedSampleQuestionsIfMissing(db) {
  const sampleQuestions = [
    {
      slug: 'why-is-patience-important',
      title: 'Why is patience important in the Bible?',
      content: 'Patience is a key virtue in the Bible. It teaches us to trust God\'s timing and remain faithful during trials.',
      topicSlug: 'patience',
    },
    {
      slug: 'what-does-bible-say-about-faith',
      title: 'What does the Bible say about faith?',
      content: 'Faith is central to Christian life. Hebrews 11:1 defines faith as confidence in what we hope for.',
      topicSlug: 'faith',
    },
    {
      slug: 'what-is-biblical-love',
      title: 'What is biblical love?',
      content: 'Biblical love is sacrificial and unconditional, as shown in 1 Corinthians 13.',
      topicSlug: 'love',
    },
  ];

  const findTopic = db.prepare('SELECT id FROM topics WHERE slug = ?');
  const insert = db.prepare(
    'INSERT OR IGNORE INTO questions (title, slug, content, topic_id) VALUES (?, ?, ?, ?)'
  );

  const seedAll = db.transaction(() => {
    for (const q of sampleQuestions) {
      const topic = findTopic.get(q.topicSlug);
      insert.run(q.title, q.slug, q.content, topic ? topic.id : null);
    }
  });

  seedAll();
}

function upgradeExpandedContent(db) {
  const updateTopicContent = db.prepare('UPDATE topics SET content = ? WHERE slug = ?');
  const updateQuestionContent = db.prepare('UPDATE questions SET content = ? WHERE slug = ?');
  const updateGuideContent = db.prepare(
    'UPDATE guides SET content = content || ? WHERE slug = ? AND LENGTH(content) < 4000'
  );

  const run = db.transaction(() => {
    // Expand topic pages with full structured content
    for (const [slug, content] of Object.entries(topicContent)) {
      updateTopicContent.run(content, slug);
    }

    // Expand thin question content (only replaces if still very short)
    for (const [slug, content] of Object.entries(questionContent)) {
      db.prepare(
        'UPDATE questions SET content = ? WHERE slug = ? AND LENGTH(content) < 200'
      ).run(content, slug);
    }

    // Append additional sections to guides that haven't been expanded yet
    for (const [slug, addition] of Object.entries(guideAdditions)) {
      updateGuideContent.run(addition, slug);
    }
  });

  run();
}

export const topics = {
  list: () => getDb().prepare('SELECT * FROM topics ORDER BY title').all(),
  findBySlug: (slug) => getDb().prepare('SELECT * FROM topics WHERE slug = ?').get(slug),
  create: (data) => getDb().prepare('INSERT INTO topics (title, slug, description) VALUES (?, ?, ?)').run(data.title, data.slug, data.description),
};

export const questions = {
  list: () => getDb().prepare(`
    SELECT q.*, t.title as topic_title, t.slug as topic_slug
    FROM questions q
    LEFT JOIN topics t ON q.topic_id = t.id
    ORDER BY q.title
  `).all(),
  findBySlug: (slug) => getDb().prepare(`
    SELECT q.*, t.title as topic_title, t.slug as topic_slug
    FROM questions q
    LEFT JOIN topics t ON q.topic_id = t.id
    WHERE q.slug = ?
  `).get(slug),
  listByTopic: (topicId) => getDb().prepare('SELECT * FROM questions WHERE topic_id = ? ORDER BY title').all(topicId),
  create: (data) => getDb().prepare('INSERT INTO questions (title, slug, content, topic_id) VALUES (?, ?, ?, ?)').run(data.title, data.slug, data.content, data.topicId || null),
};

export const guides = {
  list: () => getDb().prepare('SELECT * FROM guides ORDER BY title').all(),
  findBySlug: (slug) => getDb().prepare('SELECT * FROM guides WHERE slug = ?').get(slug),
  create: (data) => getDb().prepare('INSERT INTO guides (title, slug, content) VALUES (?, ?, ?)').run(data.title, data.slug, data.content),
};

export const bibleNotes = {
  findByReference: (book, chapter) => getDb().prepare('SELECT * FROM bible_notes WHERE book = ? AND chapter = ?').get(book, chapter),
  upsert: (data) => getDb().prepare(`
    INSERT INTO bible_notes (book, chapter, overview, context, application)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(book, chapter) DO UPDATE SET
      overview = excluded.overview,
      context = excluded.context,
      application = excluded.application
  `).run(data.book, data.chapter, data.overview, data.context, data.application),
};

export const verses = {
  listByTopic(topicId) {
    const db = getDb();
    return db.prepare('SELECT * FROM verses WHERE topic_id = ?').all(topicId);
  },
};
// step0-rebuild-marker

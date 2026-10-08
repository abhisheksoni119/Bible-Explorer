// Production verification for BibleVerseInsights.com
// Usage: node scripts/verify-production.mjs [baseUrl]
// Checks the public site + admin topic-tree source. Read-only, no secrets.

const BASE = process.argv[2] || 'https://bibleverseinsights.com';
const results = [];
let failures = 0;

function check(name, cond, detail) {
  results.push({ name, pass: Boolean(cond), detail: String(detail) });
  if (!cond) failures++;
}

(async () => {
  // Public pages
  const home = await fetch(BASE + '/');
  check('homepage', home.status === 200, 'HTTP ' + home.status);

  const guides = await fetch(BASE + '/guides/');
  const guidesHtml = await guides.text();
  const guideLinks = (guidesHtml.match(/\/guides\/[a-z0-9-]+\//g) || []).filter((v, i, a) => a.indexOf(v) === i);
  check('/guides/ lists articles', guides.status === 200 && guideLinks.length > 0, `HTTP ${guides.status}, ${guideLinks.length} links`);

  const questions = await fetch(BASE + '/questions/');
  check('/questions/', questions.status === 200, 'HTTP ' + questions.status);

  // Sitemap
  const sm = await fetch(BASE + '/sitemap.xml');
  const smText = await sm.text();
  const smUrls = (smText.match(/<loc>/g) || []).length;
  check('/sitemap.xml has published URLs', sm.status === 200 && smUrls >= 290, `HTTP ${sm.status}, ${smUrls} URLs`);

  // Sample article (first guide link)
  if (guideLinks[0]) {
    const a = await fetch(BASE + guideLinks[0]);
    check('sample article ' + guideLinks[0], a.status === 200, 'HTTP ' + a.status);
  }

  // Admin security gates
  const gq = await fetch(BASE + '/api/generate-question/', { method: 'POST', redirect: 'manual' });
  check('generate-question gated', gq.status === 401 || gq.status === 307, 'HTTP ' + gq.status);
  const sq = await fetch(BASE + '/api/save-question/', { method: 'POST', redirect: 'manual' });
  check('save-question gated', sq.status === 401 || sq.status === 307, 'HTTP ' + sq.status);
  const adm = await fetch(BASE + '/api/admin/stats/', { redirect: 'manual' });
  check('admin API gated', adm.status === 401 || adm.status === 307, 'HTTP ' + adm.status);

  // Admin topic-tree source (reads the production topics table)
  const tree = await fetch(BASE + '/api/topics-tree/');
  const treeJson = await tree.json().catch(() => null);
  if (Array.isArray(treeJson)) {
    let total = 0, withArticles = 0;
    const walk = n => { total++; withArticles += n.is_created ? 1 : 0; (n.children || []).forEach(walk); };
    treeJson.forEach(walk);
    check('topics tree reachable', true, `${treeJson.length} parents, ${total} total topics, ${withArticles} with published articles`);
    if (total < 1000) {
      console.log('NOTE: topics tree shows ' + total + ' topics — if the dashboard shows ~1,226,');
      console.log('      the admin Supabase credential is still resolving the restricted view.');
    }
  } else {
    check('topics tree reachable', false, 'non-array response');
  }

  for (const r of results) {
    console.log((r.pass ? 'PASS' : 'FAIL') + ' | ' + r.name + ' | ' + r.detail);
  }
  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('VERIFY ERROR:', e.message); process.exit(1); });

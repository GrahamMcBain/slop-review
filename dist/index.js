'use strict';
// Slop Review GitHub Action (no external deps)
// Posts a humorous PR review. Uses OpenAI if key provided; else canned slop.

const API = 'https://api.github.com';

function input(name, def) {
  const key = 'INPUT_' + name.toUpperCase().replace(/\s+/g, '_');
  const v = process.env[key];
  return v === undefined || v === '' ? def : v;
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || input('github_token');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || input('openai_api_key');
const MODEL = input('model', 'gpt-4o-mini');
const TEMPERATURE = parseFloat(input('temperature', '0.95'));
const MAX_FILES = parseInt(input('max_files', '10'), 10);

const REPO = process.env.GITHUB_REPOSITORY; // owner/name
const PR_NUMBER = process.env.PR_NUMBER || (process.env.GITHUB_EVENT_PATH ? (() => {
  try {
    const ev = require('node:fs').readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8');
    const obj = JSON.parse(ev);
    return obj?.pull_request?.number || '';
  } catch { return ''; }
})() : '');

if (!GITHUB_TOKEN) {
  console.error('Missing GITHUB_TOKEN (or input github_token).');
  process.exit(1);
}
if (!REPO) {
  console.error('Missing GITHUB_REPOSITORY.');
  process.exit(1);
}
if (!PR_NUMBER) {
  console.error('Not a pull_request event or PR_NUMBER missing.');
  process.exit(0); // noop on non-PR events
}

async function gh(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'slop-review-action/0.1',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  return res.json();
}

async function getChangedFiles() {
  const files = [];
  let page = 1;
  while (true) {
    const data = await gh(`/repos/${REPO}/pulls/${PR_NUMBER}/files?per_page=100&page=${page}`);
    files.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return files.map(f => ({ filename: f.filename, status: f.status, additions: f.additions, deletions: f.deletions }));
}

function extOf(file) { const i = file.lastIndexOf('.'); return i === -1 ? '' : file.slice(i + 1).toLowerCase(); }

function fauxSlop(files) {
  const totalAdds = files.reduce((a, f) => a + (f.additions || 0), 0);
  const totalDels = files.reduce((a, f) => a + (f.deletions || 0), 0);
  const exts = Array.from(new Set(files.map(f => extOf(f.filename)).filter(Boolean))).slice(0, 6);
  const bullets = [
    'Consider refactoring to a micro‑macro‑service so the monolith feels seen.',
    'Adopt the Nonexistent Spec™ for improved semantic vibes.',
    'Please optimize for asymptotic aesthetics; O(mystique) is preferred.',
    'Introduce Slop‑First Design: code should compile feelings before functions.',
    'Replace comments with a mission statement to reduce cognitive latency.',
  ];
  return `### 🫠 Slop Review Bot\nI have reviewed this PR with maximum confidence and minimum evidence.\n\n• Files changed: ${files.length}  • +${totalAdds} / −${totalDels}\n• Detected ecosystem: ${exts.length ? exts.join(', ') : 'mysterious'}\n\nTop‑tier guidance:\n${bullets.map(b => `- ${b}`).join('\n')}\n\nSelected files:\n${files.slice(0, Math.max(1, Math.min(MAX_FILES, 20))).map(f => `- ${f.filename} (+${f.additions}/-${f.deletions})`).join('\n')}\n\n> as per my previous hallucination, this LGTM (Looks Good To Monetize).`;
}

async function openaiSlop(files) {
  if (!OPENAI_API_KEY) return null;
  const system = 'You are Slop Review Bot. Write a humorous, overconfident PR review that sounds authoritative yet obviously nonsense. Keep it 6-10 bullets plus a snarky summary. Avoid being insulting to individuals.';
  const user = `Summarize this PR and provide playful, obviously AI-slop review bullets. Changed files:\n${files.slice(0, Math.max(1, Math.min(MAX_FILES, 50))).map(f => `${f.filename} (+${f.additions}/-${f.deletions})`).join('\n')}`;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: [ { role: 'system', content: system }, { role: 'user', content: user } ], temperature: TEMPERATURE }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('No content');
    return `### 🫠 Slop Review Bot\n${content}`;
  } catch (e) {
    console.warn('OpenAI failed, falling back to faux slop:', e.message);
    return null;
  }
}

async function findExistingComment() {
  const comments = await gh(`/repos/${REPO}/issues/${PR_NUMBER}/comments?per_page=100`);
  return comments.find(c => /Slop Review Bot/.test(c.body || ''));
}

async function postOrUpdate(body) {
  const existing = await findExistingComment();
  if (existing) {
    await gh(`/repos/${REPO}/issues/comments/${existing.id}`, { method: 'PATCH', body: JSON.stringify({ body }), headers: { 'Content-Type': 'application/json' } });
  } else {
    await gh(`/repos/${REPO}/issues/${PR_NUMBER}/comments`, { method: 'POST', body: JSON.stringify({ body }), headers: { 'Content-Type': 'application/json' } });
  }
}

(async () => {
  try {
    const files = await getChangedFiles();
    let body = await openaiSlop(files);
    if (!body) body = fauxSlop(files);
    await postOrUpdate(body);
    console.log('Slop Review comment posted.');
  } catch (err) {
    console.error('Action failed:', err.stack || err.message || String(err));
    process.exit(1);
  }
})();

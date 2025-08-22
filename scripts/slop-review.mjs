// Minimal Slop Review bot: posts a humorous review on PRs.
// - Uses OpenAI if OPENAI_API_KEY is set; otherwise falls back to built-in slop.

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const REPO = process.env.REPO; // e.g. owner/name
const PR_NUMBER = process.env.PR_NUMBER;

if (!GITHUB_TOKEN || !REPO || !PR_NUMBER) {
  console.error('Missing required env: GITHUB_TOKEN, REPO, PR_NUMBER');
  process.exit(1);
}

const API = 'https://api.github.com';

async function gh(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'slop-review-bot/1.0',
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
  const data = await gh(`/repos/${REPO}/pulls/${PR_NUMBER}/files?per_page=100`);
  return data.map(f => ({ filename: f.filename, status: f.status, additions: f.additions, deletions: f.deletions }));
}

function extOf(file) {
  const i = file.lastIndexOf('.');
  return i === -1 ? '' : file.slice(i + 1).toLowerCase();
}

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

  return `### 🫠 Slop Review Bot
I have reviewed this PR with maximum confidence and minimum evidence.

• Files changed: ${files.length}  • +${totalAdds} / −${totalDels}
• Detected ecosystem: ${exts.length ? exts.join(', ') : 'mysterious'}

Top‑tier guidance:
${bullets.map(b => `- ${b}`).join('\n')}

Selected files:
${files.slice(0, 10).map(f => `- ${f.filename} (+${f.additions}/-${f.deletions})`).join('\n')}

> as per my previous hallucination, this LGTM (Looks Good To Monetize).`;
}

async function openaiSlop(files) {
  if (!OPENAI_API_KEY) return null;
  const system = 'You are Slop Review Bot. Write a humorous, overconfident PR review that sounds authoritative yet obviously nonsense. Keep it 6-10 bullets plus a snarky summary. Avoid being insulting to individuals.';
  const user = `Summarize this PR and provide playful, obviously AI-slop review bullets. Changed files: \n${files.map(f => `${f.filename} (+${f.additions}/-${f.deletions})`).join('\n')}`;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.95,
      }),
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
  return comments.find(c => c.user?.type === 'Bot' && /Slop Review Bot/.test(c.body || ''));
}

async function postOrUpdate(body) {
  const existing = await findExistingComment();
  if (existing) {
    await gh(`/repos/${REPO}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
      headers: { 'Content-Type': 'application/json' },
    });
  } else {
    await gh(`/repos/${REPO}/issues/${PR_NUMBER}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

(async () => {
  const files = await getChangedFiles();
  let body = await openaiSlop(files);
  if (!body) body = fauxSlop(files);
  await postOrUpdate(body);
  console.log('Slop Review comment posted.');
})();

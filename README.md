# Slop Review

[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Action-blue?logo=github)](https://github.com/GrahamMcBain/slop-review)

Fight Slop with Slop. A reusable GitHub Action that posts humorous, overconfident PR reviews. Optional OpenAI integration. Also ships with a landing page you can host anywhere.

## Local development

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Open http://127.0.0.1:8080

## Deploy to Vercel

- Connect this GitHub repo to Vercel
- No build step needed (static). Output directory is repo root.
- Optional config in `vercel.json` enables clean URLs and basic headers.

## GitHub Action: Slop Review (reusable)

Use it in any repo to comment on PRs with confident slop. Optional OpenAI integration.

Examples you can copy:
- [examples/basic.yml](examples/basic.yml)
- [examples/with-openai.yml](examples/with-openai.yml)
- [examples/tuned.yml](examples/tuned.yml)

Example workflow:

```yaml
name: Slop Review
on:
  pull_request:
    types: [opened, reopened, synchronize]
permissions:
  contents: read
  pull-requests: write
jobs:
  slop:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Slop Review
        uses: GrahamMcBain/slop-review@v1
        with:
          model: gpt-4o-mini
          temperature: '0.95'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }} # optional
```

Inputs:
- `github_token` (optional) — defaults to `GITHUB_TOKEN`
- `openai_api_key` (optional) — prefer passing via env `OPENAI_API_KEY`
- `model` (default `gpt-4o-mini`)
- `temperature` (default `0.95`)
- `max_files` (default `10`)

## Files

- `index.html` — the page (no external CSS/JS bundling)
- `vercel.json` — optional Vercel config

## License

MIT (or vibes).

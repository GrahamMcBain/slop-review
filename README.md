# Slop Review

Fight Slop with Slop. A single-file, static landing page hosted anywhere.

## Local development

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Open http://127.0.0.1:8080

## Deploy to Vercel

- Connect this GitHub repo to Vercel
- No build step needed (static). Output directory is repo root.
- Optional config in `vercel.json` enables clean URLs and basic headers.

## Files

- `index.html` — the page (no external CSS/JS bundling)
- `vercel.json` — optional Vercel config

## License

MIT (or vibes).

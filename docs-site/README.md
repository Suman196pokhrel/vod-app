# docs-site

The documentation website for VOD, published at
[docs.vod.spokhrel.dev](https://docs.vod.spokhrel.dev). Built with
[Fumadocs](https://fumadocs.dev) on Next.js.

This is an independent project inside the `vod-app` repo, like `app/` and
`backend/`: it has its own dependencies and shares no code with them.

## Develop

Run every command from this folder (there is no `package.json` at the repo root):

```bash
cd docs-site
pnpm install
pnpm dev        # http://localhost:3001 (the frontend keeps :3000)
```

Or from the repo root: `make docs`.

## Write

Pages are MDX files in `content/docs/`. The file path is the URL:
`content/docs/pipeline/queue.mdx` → `/docs/pipeline/queue`.

## Deploy

Deployed by its own Vercel project, connected to the same GitHub repo with
**Root Directory** set to `docs-site/`.

## Layout

| Path                      | What it is                                    |
| ------------------------- | --------------------------------------------- |
| `content/docs/`           | The documentation pages (MDX)                 |
| `app/(home)`              | Landing page                                  |
| `app/docs`                | Docs layout and page renderer                 |
| `app/api/search/route.ts` | Built-in search                               |
| `lib/shared.ts`           | Site name, URL and GitHub repo settings       |
| `lib/source.ts`           | Content source (reads `content/docs/`)        |

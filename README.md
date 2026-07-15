# Society of the Third Sophistic site

Astro static site for the Society of the Third Sophistic, the student organization for Clemson University's RCID doctoral program.

## Files

- `src/pages/index.astro` renders the homepage.
- `src/data/site/*.json` contains editable site-wide copy, split into manageable CMS screens.
- `src/data/*.json` contains editable lists for quick links, events, resources, and officers.
- `src/styles/global.css` contains the visual design.
- `public/admin/config.yml` configures the Decap CMS admin interface.
- `public/admin/permissions.html` explains the GitHub-backed access model.
- `public/admin/radar-maintainer.html` provides the read-only Radar handoff surface.
- `public/assets/images/third-sophistic.png` is the current site logo.
- `legacy-static-prototype/` keeps the first plain HTML prototype for reference only.

## Updating

Primary content edits should happen through the Decap admin at `/admin/` once GitHub OAuth is configured in Cloudflare Pages. Manual edits can also be made by changing the JSON files in `src/data/`.

See `docs/admin-and-editing.md` for the permissions model, admin login setup, and manual editing map.

Opportunity Radar machinery is intentionally excluded from routine CMS editing. See `docs/opportunity-radar-maintainer.md` for its architecture, maintenance workflow, recovery procedure, and handoff checklist.

## Hosting

This site is now intended for Cloudflare Pages. It builds to static files and does not require server-side runtime.

Cloudflare Pages setup:

1. Connect the GitHub repository `RCIDS3S/website` to Cloudflare Pages.
2. Framework preset: Astro.
3. Build command: `npm run build`.
4. Build output directory: `dist`.
5. Root directory: leave blank.

Decap CMS uses GitHub OAuth through Cloudflare Pages Functions. Cloudflare Pages must have these environment variables set:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

The matching GitHub OAuth app callback URL should be `https://website-bgu.pages.dev/api/callback`.

## Local commands

```sh
npm install
npm run dev
npm run build
```

This environment currently has Node but not `npm` on the shell path, so dependencies may need to be installed on a machine with npm or through the Cloudflare Pages build.

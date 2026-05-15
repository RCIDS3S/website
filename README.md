# Society of the Third Sophistic site

Astro static site for the Society of the Third Sophistic, the student organization for Clemson University's RCID doctoral program.

## Files

- `src/pages/index.astro` renders the homepage.
- `src/data/site/*.json` contains editable site-wide copy, split into manageable CMS screens.
- `src/data/*.json` contains editable lists for quick links, events, resources, and officers.
- `src/styles/global.css` contains the visual design.
- `public/admin/config.yml` preserves the previous Decap CMS configuration for future CMS work.
- `public/assets/images/third-sophistic.png` is the current site logo.
- `legacy-static-prototype/` keeps the first plain HTML prototype for reference only.

## Updating

During development, edit the JSON files in `src/data/`. The previous Netlify-backed Decap CMS admin is temporarily disabled because Netlify's credit model paused the site during active setup.

## Hosting

This site is now intended for Cloudflare Pages. It builds to static files and does not require server-side runtime.

Cloudflare Pages setup:

1. Connect the GitHub repository `RCIDS3S/website` to Cloudflare Pages.
2. Framework preset: Astro.
3. Build command: `npm run build`.
4. Build output directory: `dist`.
5. Root directory: leave blank.

The CMS/editor workflow needs a replacement for Netlify Identity/Git Gateway. Until then, content edits happen through GitHub or local commits.

## Local commands

```sh
npm install
npm run dev
npm run build
```

This environment currently has Node but not `npm` on the shell path, so dependencies may need to be installed on a machine with npm or through the Cloudflare Pages build.

# Society of the Third Sophistic site

Astro + Decap CMS site for the Society of the Third Sophistic, the student organization for Clemson University's RCID doctoral program.

## Files

- `src/pages/index.astro` renders the homepage.
- `src/data/site/*.json` contains editable site-wide copy, split into manageable CMS screens.
- `src/data/*.json` contains editable lists for quick links, events, resources, and officers.
- `src/styles/global.css` contains the visual design.
- `public/admin/config.yml` defines the browser-based editor.
- `public/assets/images/third-sophistic.png` is the current site logo.
- `legacy-static-prototype/` keeps the first plain HTML prototype for reference only.

## Updating

During development, edit the JSON files in `src/data/`. After Netlify + Decap are configured, future editors can use `/admin/` to change events, officers, links, contact details, and resource descriptions. The contact section currently points to the RCID program office and should be changed if S3S has a dedicated address or form.

## Hosting

This is set up for Netlify. The site builds to static files, and Decap CMS commits content changes back to the Git repository through Netlify Identity and Git Gateway.

Netlify setup checklist:

1. Connect the Git repository to Netlify.
2. Use `npm run build` as the build command and `dist` as the publish directory.
3. Enable Netlify Identity.
4. Enable Git Gateway under Identity services.
5. Invite future officers as Identity users.
6. Visit `/admin/` to edit site content after deployment.

Recommended GitHub repository name: `third-sophistic-site`.

## Local commands

```sh
npm install
npm run dev
npm run build
```

This environment currently has Node but not `npm` on the shell path, so dependencies may need to be installed on a machine with npm or through the Netlify build.

# Admin and Editing Guide

This site is a static Astro site hosted on Cloudflare Pages. Content can be edited through Decap CMS or manually in GitHub/local files.

## Live URLs

- Public site: `https://website-bgu.pages.dev`
- Admin interface: `https://website-bgu.pages.dev/admin/`
- GitHub repository: `https://github.com/RCIDS3S/website`

## Why Admin Login Can Fail

The Decap admin uses GitHub OAuth. If `/api/auth` returns `500`, Cloudflare Pages is missing one or both OAuth environment variables:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Create a GitHub OAuth app, then add those values in Cloudflare Pages.

GitHub OAuth app settings:

- Application name: `RCID S3S CMS`
- Homepage URL: `https://website-bgu.pages.dev`
- Authorization callback URL: `https://website-bgu.pages.dev/api/callback`

After adding or changing Cloudflare environment variables, redeploy the Cloudflare Pages project.

If GitHub reports that `RCIDS3S` restricts OAuth applications, authorize `RCID S3S CMS` for the user's personal GitHub account, request access to the organization, and have an organization owner grant that request under the organization's OAuth app policy.

## User Permissions

Permissions are controlled through GitHub, not Decap itself. Anyone who edits through `/admin/` must have a GitHub account with write access to `RCIDS3S/website`.

The admin includes a read-only People and Permissions screen at `/admin/permissions.html`. It explains the access model and links authorized owners to GitHub's access controls. It does not hold organization-management credentials or grant permissions itself.

Recommended roles:

- Site owners: GitHub repository `Admin` or organization owner. Can manage settings, secrets, Pages, and collaborators.
- Site maintainers: GitHub repository `Maintain` or `Write`. Can edit content and publish changes.
- Content editors: GitHub repository `Write`. Can use Decap and commit content changes.
- Radar maintainers: GitHub repository `Write`, membership in `radar-maintainers`, and code ownership for protected Radar files.
- View-only users: GitHub repository `Read`. Can see the code but cannot publish edits.

For cleaner handoff, create GitHub teams in the `RCIDS3S` organization:

- `site-admins`
- `site-editors`
- `radar-maintainers`
- `site-viewers`

Grant repository access to the teams instead of managing individual people one by one.

## Manual Editing Map

Most site text lives in JSON files. These can be edited in GitHub's web editor, locally in a code editor, or with Codex.

- Homepage hero: `src/data/site/hero.json`
- Site title, subtitle, SEO: `src/data/site/identity.json`
- Navigation labels: `src/data/site/navigation.json`
- Student desk label and term: `src/data/site/student-desk.json`
- Student desk quick links: `src/data/quick-links.json`
- Events section and event cards: `src/data/events.json`
- Resources section and resource cards: `src/data/resources.json`
- Officers section and officer cards: `src/data/officers.json`
- About section: `src/data/about.json`
- Contact section: `src/data/site/contact.json`
- Footer text: `src/data/site/footer.json`
- Legacy archive data: `src/data/archive/posts.json`
- Opportunity Radar introduction: `src/data/opportunities-page.json`
- Opportunity Radar source suggestions: `src/data/opportunity-source-suggestions.json`

Images live in `public/assets/images/`.

## Editing in GitHub Without Code

1. Go to `https://github.com/RCIDS3S/website`.
2. Open the file you want to edit.
3. Click the pencil icon.
4. Change the JSON carefully, keeping quotation marks, commas, brackets, and braces intact.
5. Create a branch and pull request.
6. Confirm the validation workflow passes before merging.
7. Cloudflare Pages should rebuild automatically after the merge.

For risky changes, create a branch and pull request instead of committing directly to `main`.

## Editing Locally

```sh
git pull
npm install
npm run dev
```

Then edit the relevant JSON file in `src/data/`.

Before publishing:

```sh
npm run build
git status
git add .
git commit -m "Update site content"
git push
```

## Content Safety Notes

- Do not put private student information on the public site.
- Keep official policy language linked to Clemson or RCID pages rather than copying it unless someone has confirmed it should be duplicated.
- Use the legacy archive as preserved history, not as the main navigation experience.
- When officers change, confirm whether role names should be visible. The officers editor supports hiding roles.

## Opportunity Radar Maintenance

Routine CMS editors can change only the Radar introduction and add URLs to the safe source suggestion queue. Suggested URLs do not affect the live feed until a Radar maintainer reviews and promotes them. The public feed, generated candidate set, source configuration, UI behavior, parser code, and scheduled workflow are protected maintainer files.

The read-only admin guide at `/admin/radar-maintainer.html` provides a deliberate takeover path. The complete repository runbook is `docs/opportunity-radar-maintainer.md`.

Radar changes should be made on a branch, validated with `npm run build`, and reviewed by `@RCIDS3S/radar-maintainers`. Do not manually edit `src/data/opportunities.json` or `src/data/opportunities.generated.json`; automation owns both files.

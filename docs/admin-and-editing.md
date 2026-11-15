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
- Events section, manual event cards, and future calendar settings: `src/data/events.json`
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

### Event calendar downloads

Confirmed events can offer an Add to calendar download. Set a unique, permanent Calendar Download ID and a Machine Date containing the start time and explicit UTC offset (for example, `2026-11-21T17:30:00-05:00`). Keep the ID unchanged when rescheduling. The build creates a matching `.ics` file; date-only reminders use YYYY-MM-DD. Items without an ID do not get a button.

Location and End Date and Time are optional. Only enter an end time when it is confirmed; otherwise the download says that the duration is unspecified. Individual downloads are snapshots. The whole-calendar subscription described below receives published updates. Keep personal names and private meeting credentials out of all public event fields, including the exported title, description, status, and location.

The `/calendar/` page uses the same confirmed events and permanent Calendar Download IDs as the homepage. It displays months and event times in America/New_York, with a monthly event list and a full event-list fallback when JavaScript is unavailable. Edit events once in the Events CMS screen; both views and downloads update on the next build. Do not enable calendar downloads for TBA placeholders or general links.

The homepage’s See what’s next section automatically selects up to three future events, ordered by their start time, from the same calendar data. It refreshes on page load, when returning to the tab, and every 30 seconds, so an event drops off after it starts without another deployment. With fewer than three upcoming events it shows only those available; with none it shows an empty message. General calendar links are separate from the event cards. Without JavaScript, the selection reflects the most recent site build.


### Calendar subscriptions, ranges, and banners

`https://website-bgu.pages.dev/calendar.ics` is the permanent public subscription feed. It includes every scheduled event with a valid Calendar Download ID, including past events, and shares stable event UIDs with individual downloads. Preserve this URL and all event IDs when changing domains or rescheduling events. Publishing an Events CMS change updates the feed; subscribers receive it when their calendar provider refreshes (sometimes more than 24 hours). This is not an automatic import from Clemson calendars or email.

Use `datetime: YYYY-MM-DD` for dates with no known time. Optional `endDate` is the final INCLUDED day of a date-only range; the export converts it to iCalendar's exclusive DTEND. Do not supply `endDatetime` on date-only events. Date reminders do not block availability. The month view includes every day of a range, including across month boundaries. Upcoming cards keep single-day reminders through the Eastern calendar day and show future periods from their start date.

Optional `host` records the public hosting organization. Use `url` for the host's public details/registration page; both are included in calendar exports. Keep private meeting access out of the feed.

Optional `banner` is a short website-wide announcement above the header. It requires a date-only start and inclusive `endDate`. It is visible only during that range in America/New_York, refreshing on load, return to the page, and every 30 seconds. With JavaScript disabled, visibility reflects the latest build. Not every multi-day event needs a banner.

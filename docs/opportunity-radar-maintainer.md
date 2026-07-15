# Opportunity Radar Maintainer Guide

The Opportunity Radar is an automated public feed for RCID students. Routine site editors can change only its public introduction through Decap CMS. The feed machinery is maintained through reviewed code changes.

## System Flow

1. `src/data/opportunity-sources.json` defines monitored sources and parser modes.
2. `.github/workflows/update-opportunities.yml` runs the refresh every day and on manual request.
3. `scripts/update-opportunities.mjs` fetches, parses, scores, filters, deduplicates, and publishes opportunities.
4. `src/data/opportunities.generated.json` records the larger candidate and automation audit set.
5. `src/data/opportunities.json` contains the public feed and is owned by the automation.
6. `src/pages/opportunities.astro` combines the feed with protected interface configuration from `src/data/opportunities-ui.json`.
7. `src/data/opportunities-page.json` contains the only Radar copy exposed to routine CMS editors.
8. `src/data/opportunity-source-suggestions.json` is a safe queue for URLs suggested by routine editors. It does not affect the public feed until a maintainer manually reviews and promotes a source.

## Ownership Boundary

Routine editors may change:

- `src/data/opportunities-page.json`
- `src/data/opportunity-source-suggestions.json`

Radar maintainers may propose changes to:

- `src/data/opportunity-sources.json`
- `src/data/opportunities-ui.json`
- `scripts/update-opportunities.mjs`
- `.github/workflows/update-opportunities.yml`
- `src/pages/opportunities.astro`

Do not manually edit `src/data/opportunities.json` or `src/data/opportunities.generated.json`. A scheduled refresh will replace them.

## Local Validation

From the repository root:

```sh
npm install
npm run build
```

To exercise a live feed refresh locally:

```sh
npm run update:opportunities
npm run build
```

The refresh performs network requests and rewrites both generated data files. Review their diff before committing.

## Add or Change a Source

1. Review any queued suggestions in `src/data/opportunity-source-suggestions.json`.
2. Edit `src/data/opportunity-sources.json` on a branch.
3. Reuse an existing parser only when the source has the same structure and semantics.
4. Give every source a stable unique `id`.
5. Use `publish: "candidate"` or `publish: "watch"` while evaluating a source. Use `publish: "auto"` only after its output has been reviewed.
6. Keep `pageLimit` small until relevance and duplication are understood.
7. Run the refresh and inspect both generated files.
8. Run the site build.
9. Open a pull request and request review from `@RCIDS3S/radar-maintainers`.

If a new parser is required, add a narrowly scoped parser function in `scripts/update-opportunities.mjs` and route only the intended source to it.

## Manual Refresh

Open the repository's **Actions** tab, choose **Update opportunities**, and select **Run workflow**. The workflow validates the site before committing refreshed feed files.

## Recovery

If the public feed breaks:

1. Revert the most recent feed or parser change through GitHub.
2. Run **Update opportunities** manually.
3. Confirm that **Validate site** passes.
4. Check the Cloudflare Pages deployment for the resulting commit.

If a source begins returning malformed or irrelevant material, change its publish mode to `watch` or remove it from the active source list in a reviewed pull request.

## Maintainer Handoff

Before transferring responsibility:

- Add the new maintainer to the `radar-maintainers` GitHub team.
- Confirm that the team has Write access to `RCIDS3S/website`.
- Confirm that the repository ruleset requires code-owner review for Radar files.
- Walk through one manual refresh and one source change together.
- Confirm access to GitHub Actions and Cloudflare Pages deployment logs.
- Review this guide and update anything that has drifted.

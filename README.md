# shipmap

A single static page showing every user-facing feature: what it does, where it stands
(released, merged, experiment, branch, open PR), which platforms have it, its shortcuts
and config keys, and a **Needs a look** list of anything stale or inconsistent.

Extracted from Scrawl's hidden map (`scrawl.kitlangton.com/map-tyyxsf5b/`, upstream commit
`46901b5`, MIT, © Kit Langton). Scrawl's version is wired into its Vite site; this one is a
standalone script with no Scrawl-specific code.

Try it: `npm i && npm run example`, then open `out/example.html`.

## How it works

1. **One JSON file is the source.** `features.json` lists `meta` (name, repo, platforms),
   `groups`, an optional `flow` strip, and `features`. Each feature's `status` is one string:

   | status | meaning | board column |
   |---|---|---|
   | `stable@1.2.3` | in a release; the version that first had it | Stable, grouped by version |
   | `main` | merged, not released yet | On main |
   | `experiment:<flag>` | on main, off until the flag is set | Experiment |
   | `branch:<name>` | not on main | Branch only (links the branch) |
   | `review:#<pr>` | an open pull request (also set `"pr"`) | In review (links the PR) |

   Every status except `stable` needs `"added": "YYYY-MM-DD"` so the page can show its age.

2. **The build audits it.** Shape errors (bad id, unknown group, bad status) fail the build
   (exit 1). Softer problems end up under *Needs a look*:
   - a `docs` link to a file or `#heading` that isn't in the repo
   - `stable@X` newer than the newest git tag (`vX.Y.Z` or `X.Y.Z`)
   - `main` entries that landed before the newest release (forgot to mark them stable?)
   - experiments older than 6 weeks, PRs open longer than 14 days (`audit.ts` constants)
   - stable features missing a platform with no `note` saying why

3. **It renders to one HTML file.** React's `renderToStaticMarkup`, CSS inlined, no client JS,
   `noindex,nofollow`. Host it anywhere.

## Add it to a project

```bash
npx -y degit claptimes5/shipmap <project>/tools/shipmap
cp <project>/tools/shipmap/features.example.json <project>/features.json
```

Edit `features.json`, then build (Bun runs TSX directly; with Node use `npx tsx`):

```bash
bun tools/shipmap/build.tsx features.json dist/map-<random>/index.html .
```

The third argument is the repo root, used for doc links and git tags. You need `react` and
`react-dom` (v18 or 19) installed; nothing else.

Hook it into the existing build, e.g. in `package.json`:

```json
"build": "vite build && bun tools/shipmap/build.tsx features.json dist/map-k3x9q2/index.html ."
```

### Keeping it hidden (optional)

Scrawl serves it at an unguessable, unlinked path (`/map-<random>/`), leaves it out of the
sitemap, and also sends `X-Robots-Tag: noindex, nofollow` for `/map-*` from its Cloudflare
Worker. This hides the page; it doesn't protect it. If it shouldn't be public, put it behind
your host's auth (Cloudflare Access, Vercel protection, basic auth) instead.

## Keeping it true (the important part)

The page is only as good as the JSON. Scrawl keeps it current with three rules; copy them into
the project's `AGENTS.md` / `CLAUDE.md` so agents follow them too:

> **Feature map:** `features.json` lists every user-facing feature with its status
> (`stable@<version>`, `main`, `experiment:<flag>`, `branch:<name>`, `review:#<pr>`),
> platforms, shortcuts, config keys and docs. A PR that adds, removes, renames or changes the
> status of a user-facing feature updates it in the same PR. A release changes every
> `"status": "main"` to `"stable@<version>"` in the release PR.

And add the second rule as a step in the release checklist.

**Drift check (per project, optional but worth it).** Scrawl's `src/feature_map.rs` is a
`cargo test` that scans the source for every config key and experiment flag the code reads,
and fails if one has no entry in `features.json` or an entry names one that's gone. It's
specific to Scrawl's code, so it isn't in this kit. Write the same check for each project:
grep the code for how it reads settings/flags (`config.get("x")`, `isEnabled("x")`), compare
that set to the `config[].key` and `experiment:` flags in the JSON, and run it in CI.

## Files

| file | what |
|---|---|
| `features.ts` | types, `parseStatus`, `shapeErrors` |
| `audit.ts` | newest git tag, doc-link and staleness checks |
| `FeatureMap.tsx` | the page: header nav, flow strip, status board, groups, shortcut and config tables |
| `map.css` | Scrawl's dark theme (status colours are CSS variables at the top) |
| `build.tsx` | CLI: JSON → audited static HTML |
| `features.example.json` | one feature of each status |

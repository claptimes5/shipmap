# Tasklet (sample project)

A made-up to-do app that shows how a project uses shipmap. There is no app code here,
only what shipmap reads: [`features.json`](features.json) and the docs it links to.

Build the page from the shipmap root:

```bash
npx tsx build.tsx example/features.json out/example/index.html .
```

The live build is published to GitHub Pages by `.github/workflows/pages.yml`. A couple of
entries are deliberately off (an old experiment, a platform gap with no note) so the
*Needs a look* list has something in it.

## Quick add

Type anywhere and press Enter to add a task. `#tag` and `tomorrow` are parsed out.

## Reminders

Set a time on any task; you get a notification then.

## Sync

Tasks sync across devices when signed in.

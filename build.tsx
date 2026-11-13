/** @jsxRuntime automatic @jsxImportSource react */
// Writes the feature map as one static HTML file (no client JS, noindex).
//   bun feature-map-kit/build.tsx <features.json> <out.html> [repo-root]
// Exits 1 on shape errors, so it can gate a build or CI.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { audit } from "./audit.ts"
import { FeatureMap } from "./FeatureMap.tsx"
import type { Data } from "./features.ts"

const [src, out, repo = "."] = process.argv.slice(2)
if (!src || !out) {
  console.error("usage: bun build.tsx <features.json> <out.html> [repo-root]")
  process.exit(2)
}

const data: Data = JSON.parse(readFileSync(src, "utf8"))
const report = audit(data, resolve(repo))
if (report.errors.length) {
  console.error(`feature map:\n${report.errors.join("\n")}`)
  process.exit(1)
}

const css = readFileSync(new URL("./map.css", import.meta.url), "utf8")
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="robots" content="noindex,nofollow" />
    <meta name="color-scheme" content="light dark" />
    <meta name="theme-color" content="#0a0a0b" media="(prefers-color-scheme: dark)" />
    <meta name="theme-color" content="#fbfbfc" media="(prefers-color-scheme: light)" />
    <title>${esc(data.meta.name)} feature map</title>
    <style>${css.replaceAll("</style", "<\\/style")}</style>
  </head>
  <body>${renderToStaticMarkup(<FeatureMap audit={report} data={data} />)}</body>
</html>
`
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, html)
console.log(`feature map: ${out} (${data.features.length} features, ${report.issues.length} to look at)`)
